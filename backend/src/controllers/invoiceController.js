const prisma = require('../config/prisma');
const { createAuditLog } = require('../services/auditLogService');
const { generateInvoiceNumber } = require('../services/sequenceService');
const {
  postInvoiceJournal,
  reverseInvoiceJournal,
} = require('../services/financeService');
const { generateInvoicePDF } = require('../services/pdfService');

/**
 * Create a new invoice
 * POST /api/invoices
 */
const createInvoice = async (req, res) => {
  try {
    const {
      invoiceType,
      projectId,
      clientId,
      lines = [],
      discount = 0,
      vatPercent,
      dueDate,
      notes,
      createdBy,
      sendEmail = false,
    } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    if (!invoiceType || !clientId || !lines || lines.length === 0) {
      return res
        .status(400)
        .json({ message: 'invoiceType, clientId, and lines are required' });
    }

    // Validate invoice type
    if (
      !['INTERNAL', 'EXTERNAL', 'PROFORMA', 'CREDIT_NOTE'].includes(invoiceType)
    ) {
      return res.status(400).json({ message: 'Invalid invoice type' });
    }

    // Validate client exists
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        tenantId,
        isActive: true,
      },
    });

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Validate project if provided
    if (projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          tenantId,
        },
      });

      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
    }

    // Get tenant default VAT if not provided
    let finalVatPercent = vatPercent;
    if (finalVatPercent === undefined || finalVatPercent === null) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { settings: true },
      });
      finalVatPercent =
        tenant?.settings?.defaultVatPercent || 0;
    }

    // Calculate totals
    let subtotal = 0;
    const invoiceLines = lines.map((line) => {
      if (!line.qty || line.qty <= 0) {
        throw new Error(`Invalid qty for line: ${line.description}`);
      }
      if (!line.unitRate || line.unitRate < 0) {
        throw new Error(`Invalid unitRate for line: ${line.description}`);
      }

      const lineTotal = line.qty * line.unitRate;
      subtotal += lineTotal;

      return {
        description: line.description,
        qty: line.qty,
        unit: line.unit || null,
        unitRate: line.unitRate,
        total: lineTotal,
      };
    });

    const subtotalAfterDiscount = subtotal - (discount || 0);
    const vatAmount =
      finalVatPercent > 0
        ? (subtotalAfterDiscount * finalVatPercent) / 100
        : 0;
    const total = subtotalAfterDiscount + vatAmount;

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(tenantId);

    // Use transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Create invoice with lines
      const invoice = await tx.invoice.create({
        data: {
          tenantId,
          invoiceNumber,
          invoiceType,
          projectId: projectId || null,
          clientId,
          subtotal,
          discount: discount || 0,
          vatPercent: finalVatPercent,
          vatAmount,
          total,
          status: 'DRAFT',
          dueDate: dueDate ? new Date(dueDate) : null,
          notes: notes || null,
          createdBy: createdBy || req.user?.userId || null,
          invoiceLines: {
            create: invoiceLines,
          },
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              companyName: true,
              email: true,
              address: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
              projectCode: true,
            },
          },
          invoiceLines: true,
        },
      });

      // Post journal entries
      await postInvoiceJournal(
        invoice,
        tenantId,
        createdBy || req.user?.userId || null
      );

      return invoice;
    });

    // Create audit log
    await createAuditLog({
      tenantId,
      userId: createdBy || req.user?.userId || null,
      action: 'INVOICE_CREATE',
      entityType: 'Invoice',
      entityId: result.id,
      newData: {
        invoiceNumber: result.invoiceNumber,
        invoiceType,
        clientId,
        total: result.total,
        status: result.status,
      },
    });

    // TODO: Send email if sendEmail is true
    // if (sendEmail) {
    //   await sendInvoiceEmail(result);
    // }

    res.status(201).json({
      invoiceId: result.id,
      invoiceNumber: result.invoiceNumber,
      total: result.total,
      invoice: result,
    });
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Create invoice from Delivery Notes
 * POST /api/invoices/from-dns
 */
const createInvoiceFromDNs = async (req, res) => {
  try {
    const {
      dnIds = [],
      rateMap = [],
      vatPercent,
      createdBy,
    } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    if (!dnIds || dnIds.length === 0) {
      return res.status(400).json({ message: 'At least one DN ID is required' });
    }

    // Fetch delivery notes
    const deliveryNotes = await prisma.deliveryNote.findMany({
      where: {
        id: { in: dnIds },
        tenantId,
      },
      include: {
        items: true,
        client: true,
        project: true,
      },
    });

    if (deliveryNotes.length !== dnIds.length) {
      return res.status(404).json({ message: 'One or more delivery notes not found' });
    }

    // Validate all DNs belong to same client
    const clientIds = [...new Set(deliveryNotes.map((dn) => dn.clientId))];
    if (clientIds.length > 1) {
      return res
        .status(400)
        .json({ message: 'All delivery notes must belong to the same client' });
    }

    const clientId = clientIds[0];
    const client = deliveryNotes[0].client;
    const projectId = deliveryNotes[0].projectId;

    // Aggregate items from all DNs
    const aggregatedItems = {};
    deliveryNotes.forEach((dn) => {
      dn.items.forEach((item) => {
        const key = item.description.toLowerCase().trim();
        if (!aggregatedItems[key]) {
          aggregatedItems[key] = {
            description: item.description,
            qty: 0,
            unit: item.uom || null,
            unitRate: 0,
          };
        }
        aggregatedItems[key].qty += item.deliveredQty || item.loadedQty || item.qty;
      });
    });

    // Apply rate map
    const invoiceLines = Object.values(aggregatedItems).map((item) => {
      const rateEntry = rateMap.find(
        (r) => r.description.toLowerCase().trim() === item.description.toLowerCase().trim()
      );
      const rate = rateEntry?.rate || item.unitRate || 0;

      return {
        description: item.description,
        qty: item.qty,
        unit: item.unit,
        unitRate: rate,
        total: item.qty * rate,
      };
    });

    if (invoiceLines.length === 0) {
      return res.status(400).json({ message: 'No items found in delivery notes' });
    }

    // Calculate totals
    const subtotal = invoiceLines.reduce((sum, line) => sum + line.total, 0);
    const discount = 0;

    // Get tenant default VAT if not provided
    let finalVatPercent = vatPercent;
    if (finalVatPercent === undefined || finalVatPercent === null) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { settings: true },
      });
      finalVatPercent = tenant?.settings?.defaultVatPercent || 0;
    }

    const subtotalAfterDiscount = subtotal - discount;
    const vatAmount =
      finalVatPercent > 0
        ? (subtotalAfterDiscount * finalVatPercent) / 100
        : 0;
    const total = subtotalAfterDiscount + vatAmount;

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(tenantId);

    // Use transaction
    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          tenantId,
          invoiceNumber,
          invoiceType: 'INTERNAL',
          projectId: projectId || null,
          clientId,
          dnIds: dnIds,
          subtotal,
          discount,
          vatPercent: finalVatPercent,
          vatAmount,
          total,
          status: 'DRAFT',
          notes: `Invoice created from ${dnIds.length} delivery note(s)`,
          createdBy: createdBy || req.user?.userId || null,
          invoiceLines: {
            create: invoiceLines,
          },
        },
        include: {
          client: true,
          project: true,
          invoiceLines: true,
        },
      });

      // Post journal entries
      await postInvoiceJournal(
        invoice,
        tenantId,
        createdBy || req.user?.userId || null
      );

      return invoice;
    });

    // Create audit log
    await createAuditLog({
      tenantId,
      userId: createdBy || req.user?.userId || null,
      action: 'INVOICE_CREATED_FROM_DN',
      entityType: 'Invoice',
      entityId: result.id,
      newData: {
        invoiceNumber: result.invoiceNumber,
        dnIds,
        total: result.total,
      },
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Create invoice from DNs error:', error);
    res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get all invoices with filters
 * GET /api/invoices
 */
const getInvoices = async (req, res) => {
  try {
    const { status, clientId, projectId, from, to } = req.query;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const where = {
      tenantId,
    };

    if (status) {
      where.status = status;
    }

    if (clientId) {
      where.clientId = clientId;
    }

    if (projectId) {
      where.projectId = projectId;
    }

    if (from || to) {
      where.issuedDate = {};
      if (from) {
        where.issuedDate.gte = new Date(from);
      }
      if (to) {
        where.issuedDate.lte = new Date(to);
      }
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            projectCode: true,
          },
        },
        _count: {
          select: {
            payments: true,
            invoiceLines: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate outstanding amounts
    const invoicesWithOutstanding = await Promise.all(
      invoices.map(async (invoice) => {
        const payments = await prisma.payment.findMany({
          where: { invoiceId: invoice.id },
        });
        const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0);
        const outstanding = invoice.total - paidAmount;

        return {
          ...invoice,
          paidAmount,
          outstanding,
        };
      })
    );

    res.json(invoicesWithOutstanding);
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get invoice by ID
 * GET /api/invoices/:id
 */
const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true,
            phone: true,
            address: true,
            vatNumber: true,
            gstin: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            projectCode: true,
          },
        },
        invoiceLines: true,
        payments: {
          orderBy: {
            paymentDate: 'desc',
          },
        },
        creditNotes: {
          where: {
            applied: true,
          },
        },
      },
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Calculate outstanding
    const paidAmount = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    const outstanding = invoice.total - paidAmount;

    res.json({
      ...invoice,
      paidAmount,
      outstanding,
    });
  } catch (error) {
    console.error('Get invoice by ID error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Update invoice
 * PUT /api/invoices/:id
 */
const updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      lines,
      discount,
      vatPercent,
      dueDate,
      notes,
    } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    // Validate invoice exists
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        payments: true,
      },
    });

    if (!existingInvoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Check if invoice can be edited
    if (existingInvoice.status === 'PAID' || existingInvoice.status === 'CANCELLED') {
      return res.status(400).json({
        message: `Cannot update invoice in status: ${existingInvoice.status}`,
      });
    }

    // If payments exist, only allow limited updates
    if (existingInvoice.payments.length > 0) {
      return res.status(400).json({
        message: 'Cannot update invoice with existing payments. Create credit note instead.',
      });
    }

    // Recalculate if lines are provided
    let subtotal = existingInvoice.subtotal;
    let finalVatPercent = vatPercent !== undefined ? vatPercent : existingInvoice.vatPercent;
    let invoiceLines = [];

    if (lines && lines.length > 0) {
      subtotal = 0;
      invoiceLines = lines.map((line) => {
        const lineTotal = line.qty * line.unitRate;
        subtotal += lineTotal;
        return {
          description: line.description,
          qty: line.qty,
          unit: line.unit || null,
          unitRate: line.unitRate,
          total: lineTotal,
        };
      });
    }

    const finalDiscount = discount !== undefined ? discount : existingInvoice.discount;
    const subtotalAfterDiscount = subtotal - finalDiscount;
    const vatAmount =
      finalVatPercent > 0
        ? (subtotalAfterDiscount * finalVatPercent) / 100
        : 0;
    const total = subtotalAfterDiscount + vatAmount;

    // Use transaction
    const result = await prisma.$transaction(async (tx) => {
      // Delete existing lines if new lines provided
      if (invoiceLines.length > 0) {
        await tx.invoiceLine.deleteMany({
          where: { invoiceId: id },
        });
      }

      // Update invoice
      const updatedInvoice = await tx.invoice.update({
        where: { id },
        data: {
          subtotal,
          discount: finalDiscount,
          vatPercent: finalVatPercent,
          vatAmount,
          total,
          dueDate: dueDate ? new Date(dueDate) : existingInvoice.dueDate,
          notes: notes !== undefined ? notes : existingInvoice.notes,
          invoiceLines: invoiceLines.length > 0
            ? {
                create: invoiceLines,
              }
            : undefined,
        },
        include: {
          invoiceLines: true,
        },
      });

      // TODO: Reverse and repost journal entries if invoice was already posted
      // For now, we'll just log the update

      return updatedInvoice;
    });

    // Create audit log
    await createAuditLog({
      tenantId,
      userId: req.user?.userId || null,
      action: 'INVOICE_UPDATE',
      entityType: 'Invoice',
      entityId: id,
      oldData: {
        subtotal: existingInvoice.subtotal,
        total: existingInvoice.total,
      },
      newData: {
        subtotal: result.subtotal,
        total: result.total,
      },
    });

    res.json(result);
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Send invoice to client
 * POST /api/invoices/:id/send
 */
const sendInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { sendEmail = false, emailMessage, sentBy } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    // Validate invoice exists
    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        client: true,
      },
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (invoice.status === 'CANCELLED') {
      return res.status(400).json({ message: 'Cannot send cancelled invoice' });
    }

    // Update invoice status
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        status: invoice.status === 'DRAFT' ? 'SENT' : invoice.status,
        sentAt: new Date(),
        sentBy: sentBy || req.user?.userId || null,
      },
    });

    // Create audit log
    await createAuditLog({
      tenantId,
      userId: sentBy || req.user?.userId || null,
      action: 'INVOICE_SEND',
      entityType: 'Invoice',
      entityId: id,
      newData: {
        invoiceNumber: invoice.invoiceNumber,
        status: updatedInvoice.status,
        sentAt: updatedInvoice.sentAt,
      },
    });

    // TODO: Send email if sendEmail is true
    // if (sendEmail && invoice.client.email) {
    //   await sendInvoiceEmail(invoice, emailMessage);
    // }

    res.json(updatedInvoice);
  } catch (error) {
    console.error('Send invoice error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Cancel invoice
 * POST /api/invoices/:id/cancel
 */
const cancelInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { cancelledBy, reason } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    // Validate invoice exists
    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        payments: true,
      },
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (invoice.status === 'CANCELLED') {
      return res.status(400).json({ message: 'Invoice is already cancelled' });
    }

    // Check if payments exist
    const paidAmount = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    if (paidAmount > 0) {
      // Check user role for permission
      const userRole = req.user?.role;
      if (!['FINANCE', 'DIRECTOR'].includes(userRole)) {
        return res.status(403).json({
          message: 'Only FINANCE or DIRECTOR can cancel invoices with payments',
        });
      }
    }

    // Use transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update invoice status
      const updatedInvoice = await tx.invoice.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelledBy: cancelledBy || req.user?.userId || null,
          cancelReason: reason || null,
        },
      });

      // Post reversal journal entries
      await reverseInvoiceJournal(
        invoice,
        tenantId,
        cancelledBy || req.user?.userId || null
      );

      return updatedInvoice;
    });

    // Create audit log
    await createAuditLog({
      tenantId,
      userId: cancelledBy || req.user?.userId || null,
      action: 'INVOICE_CANCELLED',
      entityType: 'Invoice',
      entityId: id,
      oldData: {
        status: invoice.status,
      },
      newData: {
        status: 'CANCELLED',
        reason,
      },
    });

    res.json(result);
  } catch (error) {
    console.error('Cancel invoice error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get AR aging for invoice
 * GET /api/invoices/:id/aging
 */
const getInvoiceAging = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        payments: true,
      },
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const paidAmount = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    const outstanding = invoice.total - paidAmount;

    if (outstanding <= 0) {
      return res.json({
        invoiceId: id,
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total,
        paidAmount,
        outstanding: 0,
        aging: {
          current: 0,
          '0-30': 0,
          '31-60': 0,
          '61-90': 0,
          '90+': 0,
        },
      });
    }

    // Calculate days since due date or issued date
    const referenceDate = invoice.dueDate || invoice.issuedDate;
    const daysPastDue = Math.floor(
      (new Date() - new Date(referenceDate)) / (1000 * 60 * 60 * 24)
    );

    let agingBucket = 'current';
    if (daysPastDue > 90) {
      agingBucket = '90+';
    } else if (daysPastDue > 60) {
      agingBucket = '61-90';
    } else if (daysPastDue > 30) {
      agingBucket = '31-60';
    } else if (daysPastDue > 0) {
      agingBucket = '0-30';
    }

    const aging = {
      current: agingBucket === 'current' ? outstanding : 0,
      '0-30': agingBucket === '0-30' ? outstanding : 0,
      '31-60': agingBucket === '31-60' ? outstanding : 0,
      '61-90': agingBucket === '61-90' ? outstanding : 0,
      '90+': agingBucket === '90+' ? outstanding : 0,
    };

    res.json({
      invoiceId: id,
      invoiceNumber: invoice.invoiceNumber,
      total: invoice.total,
      paidAmount,
      outstanding,
      daysPastDue,
      agingBucket,
      aging,
    });
  } catch (error) {
    console.error('Get invoice aging error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Generate and download invoice PDF
 * GET /api/invoices/:id/pdf
 */
const generateInvoicePDFEndpoint = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    // Fetch invoice with all related data
    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true,
            address: true,
            phone: true,
            vatNumber: true,
            gstin: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            projectCode: true,
          },
        },
        invoiceLines: true,
      },
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Fetch tenant for company header
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(invoice, tenant || {});

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Invoice-${invoice.invoiceNumber}.pdf"`
    );
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Generate invoice PDF error:', error);
    res.status(500).json({ message: 'Failed to generate PDF' });
  }
};

module.exports = {
  createInvoice,
  createInvoiceFromDNs,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  sendInvoice,
  cancelInvoice,
  getInvoiceAging,
  generateInvoicePDFEndpoint,
};

