const prisma = require('../config/prisma');
const { createAuditLog } = require('../services/auditLogService');
const { postPaymentJournal } = require('../services/financeService');

/**
 * Record payment against invoice
 * POST /api/invoices/:id/pay
 */
const recordPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      paymentDate,
      amount,
      method,
      reference,
      receivedBy,
    } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    // Parse amount to float
    const paymentAmount = parseFloat(amount);
    if (!paymentAmount || paymentAmount <= 0 || isNaN(paymentAmount)) {
      return res.status(400).json({ message: 'Amount must be a valid number greater than 0' });
    }

    if (!method) {
      return res.status(400).json({ message: 'Payment method is required' });
    }

    // Validate payment method
    const validMethods = [
      'CASH',
      'BANK_TRANSFER',
      'CHEQUE',
      'CREDIT_CARD',
      'ADVANCE',
    ];
    if (!validMethods.includes(method)) {
      return res.status(400).json({ message: 'Invalid payment method' });
    }

    // Validate invoice exists
    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        payments: true,
        client: true,
      },
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (invoice.status === 'CANCELLED') {
      return res.status(400).json({ message: 'Cannot record payment for cancelled invoice' });
    }

    // Calculate outstanding
    const paidAmount = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    const outstanding = invoice.total - paidAmount;

    if (paymentAmount > outstanding) {
      return res.status(400).json({
        message: `Payment amount (${paymentAmount}) exceeds outstanding (${outstanding})`,
      });
    }

    // Use transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create payment
      const payment = await tx.payment.create({
        data: {
          tenantId,
          invoiceId: id,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          amount: paymentAmount, // Use parsed float value
          method,
          reference: reference || null,
          receivedBy: receivedBy || req.user?.userId || null,
        },
      });

      // Calculate new paid amount
      const newPaidAmount = paidAmount + paymentAmount;
      const newOutstanding = invoice.total - newPaidAmount;

      // Update invoice status
      let newStatus = invoice.status;
      if (newOutstanding <= 0) {
        newStatus = 'PAID';
      } else if (newPaidAmount > 0) {
        newStatus = 'PARTIALLY_PAID';
      }

      await tx.invoice.update({
        where: { id },
        data: {
          status: newStatus,
        },
      });

      // Post journal entries
      await postPaymentJournal(
        payment,
        invoice,
        tenantId,
        receivedBy || req.user?.userId || null
      );

      return { payment, newStatus, newOutstanding };
    });

    // Create audit log
    await createAuditLog({
      tenantId,
      userId: receivedBy || req.user?.userId || null,
      action: 'PAYMENT_RECEIVED',
      entityType: 'Payment',
      entityId: result.payment.id,
      newData: {
        invoiceId: id,
        invoiceNumber: invoice.invoiceNumber,
        amount,
        method,
        invoiceStatus: result.newStatus,
      },
    });

    res.status(201).json({
      paymentId: result.payment.id,
      invoiceStatus: result.newStatus,
      outstanding: result.newOutstanding,
      payment: result.payment,
    });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get payments for invoice
 * GET /api/invoices/:id/payments
 */
const getPayments = async (req, res) => {
  try {
    const { id } = req.params;
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
    });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const payments = await prisma.payment.findMany({
      where: {
        invoiceId: id,
        tenantId,
      },
      orderBy: {
        paymentDate: 'desc',
      },
    });

    res.json(payments);
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get all payments with filters
 * GET /api/payments
 */
const getAllPayments = async (req, res) => {
  try {
    const { from, to, method, invoiceId } = req.query;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const where = {
      tenantId,
    };

    if (invoiceId) {
      where.invoiceId = invoiceId;
    }

    if (method) {
      where.method = method;
    }

    if (from || to) {
      where.paymentDate = {};
      if (from) {
        where.paymentDate.gte = new Date(from);
      }
      if (to) {
        where.paymentDate.lte = new Date(to);
      }
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            client: {
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
        paymentDate: 'desc',
      },
    });

    res.json(payments);
  } catch (error) {
    console.error('Get all payments error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  recordPayment,
  getPayments,
  getAllPayments,
};

