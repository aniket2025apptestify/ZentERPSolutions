const prisma = require('../config/prisma');
const { createAuditLog } = require('../services/auditLogService');

/**
 * Create Subcontract Invoice
 * POST /api/subcontract/swo/:id/invoice
 */
const createSubcontractInvoice = async (req, res) => {
  try {
    const { id: swoId } = req.params;
    const { invoiceNumber, invoiceDate, amount, documents, createdBy } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'amount > 0 is required' });
    }

    // Get SWO
    const swo = await prisma.subcontractWorkOrder.findFirst({
      where: {
        id: swoId,
        tenantId,
      },
    });

    if (!swo) {
      return res.status(404).json({ message: 'SWO not found' });
    }

    // Generate invoice number if not provided
    let finalInvoiceNumber = invoiceNumber;
    if (!finalInvoiceNumber) {
      // Generate based on tenant and date
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { code: true },
      });

      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      const prefix = `INV-${tenant.code.toUpperCase()}-${dateStr}-`;

      const lastInvoice = await prisma.subcontractInvoice.findFirst({
        where: {
          tenantId,
          invoiceNumber: {
            startsWith: prefix,
          },
        },
        orderBy: {
          invoiceNumber: 'desc',
        },
        select: {
          invoiceNumber: true,
        },
      });

      let counter = 1;
      if (lastInvoice) {
        const lastCounter = parseInt(lastInvoice.invoiceNumber.slice(prefix.length), 10);
        if (!isNaN(lastCounter)) {
          counter = lastCounter + 1;
        }
      }

      finalInvoiceNumber = `${prefix}${counter.toString().padStart(4, '0')}`;
    }

    // Check if invoice number already exists
    const existing = await prisma.subcontractInvoice.findFirst({
      where: {
        invoiceNumber: finalInvoiceNumber,
        tenantId,
      },
    });

    if (existing) {
      return res.status(400).json({ message: 'Invoice number already exists' });
    }

    // Validate amount against SWO totalAmount (if set)
    if (swo.totalAmount && amount > swo.totalAmount * 1.1) {
      // Allow 10% variance without approval
      console.warn(`Invoice amount ${amount} exceeds SWO totalAmount ${swo.totalAmount} by more than 10%`);
    }

    // Create invoice
    const invoice = await prisma.subcontractInvoice.create({
      data: {
        tenantId,
        swoId,
        invoiceNumber: finalInvoiceNumber,
        invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
        amount,
        status: 'DRAFT',
        documents: documents || null,
        createdBy: createdBy || req.user?.userId || null,
      },
      include: {
        swo: {
          select: {
            id: true,
            swoNumber: true,
            vendorId: true,
          },
        },
      },
    });

    // Create audit log
    await createAuditLog({
      tenantId,
      userId: createdBy || req.user?.userId || null,
      action: 'SUBCONTRACT_INVOICE_CREATE',
      entityType: 'SubcontractInvoice',
      entityId: invoice.id,
      newData: {
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount,
        status: invoice.status,
        swoId: invoice.swoId,
      },
    });

    res.status(201).json({
      subcontractInvoiceId: invoice.id,
      status: invoice.status,
      invoice,
    });
  } catch (error) {
    console.error('Create subcontract invoice error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Invoice number already exists' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get Subcontract Invoices
 * GET /api/subcontract/invoices?swoId=&status=
 */
const getSubcontractInvoices = async (req, res) => {
  try {
    const { swoId, status } = req.query;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const where = {
      tenantId,
      ...(swoId && { swoId }),
      ...(status && { status }),
    };

    const invoices = await prisma.subcontractInvoice.findMany({
      where,
      include: {
        swo: {
          select: {
            id: true,
            swoNumber: true,
            vendorId: true,
            projectId: true,
            vendor: {
              select: {
                id: true,
                name: true,
                companyName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(invoices);
  } catch (error) {
    console.error('Get subcontract invoices error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Approve Subcontract Invoice (for finance/GL posting)
 * PUT /api/subcontract/invoices/:id/approve
 */
const approveSubcontractInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy, notes } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const invoice = await prisma.subcontractInvoice.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        swo: true,
      },
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (invoice.status === 'PAID') {
      return res.status(400).json({ message: 'Invoice is already paid' });
    }

    // Update status to SENT (ready for payment)
    const updatedInvoice = await prisma.subcontractInvoice.update({
      where: { id },
      data: {
        status: 'SENT',
      },
    });

    // TODO: Create JournalEntry for GL posting
    // Debit: Subcontract Expense (or WIP/Subcontract)
    // Credit: Accounts Payable
    // This would integrate with your finance/GL module

    // Create audit log
    await createAuditLog({
      tenantId,
      userId: approvedBy || req.user?.userId || null,
      action: 'SUBCONTRACT_INVOICE_APPROVE',
      entityType: 'SubcontractInvoice',
      entityId: id,
      oldData: {
        status: invoice.status,
      },
      newData: {
        status: updatedInvoice.status,
      },
    });

    res.json(updatedInvoice);
  } catch (error) {
    console.error('Approve subcontract invoice error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Record payment for Subcontract Invoice
 * PUT /api/subcontract/invoices/:id/pay
 */
const recordPaymentForSubcontractInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentDate, amount, method, reference, paidBy } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'amount > 0 is required' });
    }

    const invoice = await prisma.subcontractInvoice.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (invoice.status === 'PAID') {
      return res.status(400).json({ message: 'Invoice is already paid' });
    }

    if (amount > invoice.amount) {
      return res.status(400).json({ message: 'Payment amount cannot exceed invoice amount' });
    }

    // Update invoice status
    const updatedInvoice = await prisma.subcontractInvoice.update({
      where: { id },
      data: {
        status: amount >= invoice.amount ? 'PAID' : 'SENT', // Partial payment support
      },
    });

    // TODO: Create Payment record and JournalEntry
    // Debit: Accounts Payable
    // Credit: Bank/Cash
    // This would integrate with your payment and finance modules

    // Create audit log
    await createAuditLog({
      tenantId,
      userId: paidBy || req.user?.userId || null,
      action: 'SUBCONTRACT_INVOICE_PAY',
      entityType: 'SubcontractInvoice',
      entityId: id,
      oldData: {
        status: invoice.status,
      },
      newData: {
        status: updatedInvoice.status,
        paymentAmount: amount,
      },
    });

    res.json({
      success: true,
      invoice: updatedInvoice,
    });
  } catch (error) {
    console.error('Record payment for subcontract invoice error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createSubcontractInvoice,
  getSubcontractInvoices,
  approveSubcontractInvoice,
  recordPaymentForSubcontractInvoice,
};
