const prisma = require('../config/prisma');
const { createAuditLog } = require('../services/auditLogService');
const { generateCreditNoteNumber } = require('../services/sequenceService');
const { postCreditNoteJournal } = require('../services/financeService');

/**
 * Create credit note
 * POST /api/credit-notes
 */
const createCreditNote = async (req, res) => {
  try {
    const {
      invoiceId,
      returnRecordId,
      clientId,
      amount,
      reason,
      createdBy,
      applyToInvoice = false,
    } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    // Parse amount to float
    const creditNoteAmount = parseFloat(amount);
    if (!clientId || !creditNoteAmount || creditNoteAmount <= 0 || isNaN(creditNoteAmount)) {
      return res
        .status(400)
        .json({ message: 'clientId and valid amount > 0 are required' });
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

    // Validate return record if provided
    let returnRecord = null;
    if (returnRecordId) {
      returnRecord = await prisma.returnRecord.findFirst({
        where: {
          id: returnRecordId,
          tenantId,
          clientId, // Ensure return belongs to same client
        },
      });

      if (!returnRecord) {
        return res.status(404).json({ message: 'Return record not found or does not belong to client' });
      }

      // If return has invoice, use it
      if (returnRecord.invoiceId && !invoiceId) {
        invoiceId = returnRecord.invoiceId;
      }
    }

    // Validate invoice if provided
    let invoice = null;
    if (invoiceId) {
      invoice = await prisma.invoice.findFirst({
        where: {
          id: invoiceId,
          tenantId,
          clientId, // Ensure invoice belongs to same client
        },
        include: {
          payments: true,
        },
      });

      if (!invoice) {
        return res.status(404).json({ message: 'Invoice not found or does not belong to client' });
      }

      // Calculate outstanding amount
      const paidAmount = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
      const outstanding = invoice.total - paidAmount;

      // Check if credit note amount exceeds outstanding (unless tenant policy allows excess)
      if (creditNoteAmount > outstanding) {
        return res.status(400).json({
          message: `Credit note amount (${creditNoteAmount}) cannot exceed invoice outstanding (${outstanding})`,
        });
      }
    }

    // Generate credit note number
    const creditNoteNumber = await generateCreditNoteNumber(tenantId);

    // Use transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create credit note
      const creditNote = await tx.creditNote.create({
        data: {
          tenantId,
          creditNoteNumber,
          returnRecordId: returnRecordId || null,
          invoiceId: invoiceId || null,
          clientId,
          amount: creditNoteAmount,
          reason: reason || null,
          createdBy: createdBy || req.user?.userId || null,
          applied: applyToInvoice,
          status: applyToInvoice ? 'APPLIED' : 'DRAFT',
          appliedTo: applyToInvoice && invoiceId
            ? [{ invoiceId, amount: creditNoteAmount }]
            : null,
        },
      });

      // Auto-apply to invoice if requested
      if (applyToInvoice && invoiceId && invoice) {
        // Update invoice total (reduce by credit note amount)
        const paidAmount = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
        const newTotal = invoice.total - creditNoteAmount;
        const newOutstanding = newTotal - paidAmount;

        let newStatus = invoice.status;
        if (newOutstanding <= 0 && paidAmount > 0) {
          newStatus = 'PAID';
        } else if (newOutstanding > 0 && paidAmount > 0) {
          newStatus = 'PARTIALLY_PAID';
        }

        await tx.invoice.update({
          where: { id: invoiceId },
          data: {
            total: newTotal,
            status: newStatus,
          },
        });
      }

      // Post journal entries
      await postCreditNoteJournal(
        creditNote,
        tenantId,
        createdBy || req.user?.userId || null
      );

      return creditNote;
    });

    // Create audit log
    await createAuditLog({
      tenantId,
      userId: createdBy || req.user?.userId || null,
      action: 'CREDIT_NOTE_CREATE',
      entityType: 'CreditNote',
      entityId: result.id,
      newData: {
        creditNoteNumber: result.creditNoteNumber,
        returnRecordId: returnRecordId || null,
        invoiceId: invoiceId || null,
        amount: creditNoteAmount,
        applied: applyToInvoice,
        status: result.status,
      },
    });

    res.status(201).json({
      creditNoteId: result.id,
      creditNoteNumber: result.creditNoteNumber,
      status: result.status,
    });
  } catch (error) {
    console.error('Create credit note error:', error);
    res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Apply credit note to invoice(s)
 * POST /api/credit-notes/:id/apply
 */
const applyCreditNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { invoiceId, amountApplied } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    // Parse amountApplied to float
    const appliedAmount = parseFloat(amountApplied);
    if (!invoiceId || !appliedAmount || appliedAmount <= 0 || isNaN(appliedAmount)) {
      return res
        .status(400)
        .json({ message: 'invoiceId and valid amountApplied > 0 are required' });
    }

    // Validate credit note exists
    const creditNote = await prisma.creditNote.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!creditNote) {
      return res.status(404).json({ message: 'Credit note not found' });
    }

    if (creditNote.applied) {
      return res.status(400).json({ message: 'Credit note is already applied' });
    }

    if (appliedAmount > creditNote.amount) {
      return res.status(400).json({
        message: `Amount applied (${appliedAmount}) cannot exceed credit note amount (${creditNote.amount})`,
      });
    }

    // Validate invoice exists
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        tenantId,
        clientId: creditNote.clientId, // Ensure same client
      },
      include: {
        payments: true,
      },
    });

    if (!invoice) {
      return res.status(404).json({
        message: 'Invoice not found or does not belong to same client',
      });
    }

    // Use transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update credit note
      const appliedTo = [{ invoiceId, amount: appliedAmount }];
      const updatedCreditNote = await tx.creditNote.update({
        where: { id },
        data: {
          applied: true,
          status: 'APPLIED',
          appliedTo,
        },
      });

      // Update invoice
      const paidAmount = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
      const newTotal = invoice.total - appliedAmount;
      const newOutstanding = newTotal - paidAmount;

      let newStatus = invoice.status;
      if (newOutstanding <= 0 && paidAmount > 0) {
        newStatus = 'PAID';
      } else if (newOutstanding > 0 && paidAmount > 0) {
        newStatus = 'PARTIALLY_PAID';
      }

      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          total: newTotal,
          status: newStatus,
        },
      });

      return { updatedCreditNote, invoiceStatus: newStatus };
    });

    // Create audit log
    await createAuditLog({
      tenantId,
      userId: req.user?.userId || null,
      action: 'CREDIT_NOTE_APPLIED',
      entityType: 'CreditNote',
      entityId: id,
      newData: {
        creditNoteNumber: creditNote.creditNoteNumber,
        invoiceId,
        amountApplied: appliedAmount,
      },
    });

    res.json(result.updatedCreditNote);
  } catch (error) {
    console.error('Apply credit note error:', error);
    res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get all credit notes
 * GET /api/credit-notes?clientId=&status=&from=&to=
 */
const getCreditNotes = async (req, res) => {
  try {
    const { clientId, invoiceId, status, applied, from, to } = req.query;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const where = {
      tenantId,
    };

    if (clientId) {
      where.clientId = clientId;
    }

    if (invoiceId) {
      where.invoiceId = invoiceId;
    }

    if (status) {
      where.status = status;
    }

    if (applied !== undefined) {
      where.applied = applied === 'true';
    }

    if (from || to) {
      where.createdAt = {};
      if (from) {
        where.createdAt.gte = new Date(from);
      }
      if (to) {
        where.createdAt.lte = new Date(to);
      }
    }

    const creditNotes = await prisma.creditNote.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            companyName: true,
          },
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
          },
        },
        returnRecord: {
          select: {
            id: true,
            returnNumber: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(creditNotes);
  } catch (error) {
    console.error('Get credit notes error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get credit note by ID
 * GET /api/credit-notes/:id
 */
const getCreditNoteById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const creditNote = await prisma.creditNote.findFirst({
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
          },
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            total: true,
          },
        },
      },
    });

    if (!creditNote) {
      return res.status(404).json({ message: 'Credit note not found' });
    }

    res.json(creditNote);
  } catch (error) {
    console.error('Get credit note by ID error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createCreditNote,
  applyCreditNote,
  getCreditNotes,
  getCreditNoteById,
};

