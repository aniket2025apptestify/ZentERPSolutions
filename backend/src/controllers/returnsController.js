const prisma = require('../config/prisma');
const { createAuditLog } = require('../services/auditLogService');
const { generateReturnNumber } = require('../services/sequenceService');
const {
  processAcceptReturn,
  processReworkReturn,
  processScrapReturn,
  createReplacementDN: createReplacementDNService,
} = require('../services/returnsService');
const {
  notifyReturnCreated,
  notifyReworkCreated,
  notifyReturnInspection,
} = require('../services/notificationService');

/**
 * Create Return Record
 * POST /api/returns
 */
const createReturn = async (req, res) => {
  try {
    const { dnId, invoiceId, clientId, createdBy, reason, items, notes } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    if (!clientId || !createdBy || !items) {
      return res.status(400).json({
        message: 'clientId, createdBy, and items are required',
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'items must be a non-empty array with at least one item with qty > 0' });
    }

    // Validate at least one item has qty > 0
    const hasValidQty = items.some((item) => item.qty && item.qty > 0);
    if (!hasValidQty) {
      return res.status(400).json({ message: 'At least one item must have qty > 0' });
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

    // Validate DN if provided
    if (dnId) {
      const dn = await prisma.deliveryNote.findFirst({
        where: {
          id: dnId,
          tenantId,
        },
        include: {
          items: true,
        },
      });

      if (!dn) {
        return res.status(404).json({ message: 'Delivery note not found' });
      }

      // Validate return quantities don't exceed dispatched quantities
      for (const returnItem of items) {
        if (returnItem.dnLineId) {
          const dnLine = dn.items.find((line) => line.id === returnItem.dnLineId);
          if (!dnLine) {
            return res.status(400).json({
              message: `DN line ${returnItem.dnLineId} not found`,
            });
          }
          if (returnItem.qty > (dnLine.deliveredQty || dnLine.qty)) {
            return res.status(400).json({
              message: `Return quantity (${returnItem.qty}) exceeds delivered quantity for line ${returnItem.dnLineId}`,
            });
          }
        }
      }
    }

    // Validate invoice if provided
    if (invoiceId) {
      const invoice = await prisma.invoice.findFirst({
        where: {
          id: invoiceId,
          tenantId,
          clientId,
        },
      });

      if (!invoice) {
        return res.status(404).json({ message: 'Invoice not found or does not belong to client' });
      }
    }

    // Generate return number
    const returnNumber = await generateReturnNumber(tenantId);

    // Use transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create return record
      const returnRecord = await tx.returnRecord.create({
        data: {
          tenantId,
          returnNumber,
          dnId: dnId || null,
          invoiceId: invoiceId || null,
          clientId,
          createdBy,
          reason: reason || null,
          items,
          notes: notes || null,
          status: 'PENDING',
        },
      });

      // Create audit log
      await createAuditLog({
        tenantId,
        userId: createdBy,
        action: 'RETURN_CREATE',
        entityType: 'ReturnRecord',
        entityId: returnRecord.id,
        newData: {
          returnNumber,
          dnId: dnId || null,
          invoiceId: invoiceId || null,
          clientId,
          reason,
          items,
        },
      });

      // Notify dispatch and finance
      notifyReturnCreated(tenantId, returnRecord.id, dnId).catch((err) =>
        console.error('Notification error:', err)
      );

      return returnRecord;
    });

    res.status(201).json({
      returnId: result.id,
      returnNumber: result.returnNumber,
      status: result.status,
    });
  } catch (error) {
    console.error('Create return error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * List returns with filters
 * GET /api/returns?status=&clientId=&from=&to=
 */
const getReturns = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { status, clientId, from, to } = req.query;

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

    if (from || to) {
      where.createdAt = {};
      if (from) {
        where.createdAt.gte = new Date(from);
      }
      if (to) {
        where.createdAt.lte = new Date(to);
      }
    }

    const returnRecords = await prisma.returnRecord.findMany({
      where,
      include: {
        deliveryNote: {
          select: {
            id: true,
            dnNumber: true,
            project: {
              select: {
                projectCode: true,
                name: true,
              },
            },
          },
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            total: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
            companyName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(returnRecords);
  } catch (error) {
    console.error('Get returns error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get Return detail (with DN/Invoice context & photos)
 * GET /api/returns/:id
 */
const getReturnById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const returnRecord = await prisma.returnRecord.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        deliveryNote: {
          include: {
            items: true,
            project: {
              select: {
                projectCode: true,
                name: true,
              },
            },
            client: {
              select: {
                id: true,
                name: true,
                companyName: true,
              },
            },
          },
        },
        invoice: {
          include: {
            invoiceLines: true,
          },
        },
        client: {
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true,
            phone: true,
          },
        },
        creditNotes: {
          select: {
            id: true,
            creditNoteNumber: true,
            amount: true,
            status: true,
            applied: true,
          },
        },
      },
    });

    if (!returnRecord) {
      return res.status(404).json({ message: 'Return record not found' });
    }

    res.json(returnRecord);
  } catch (error) {
    console.error('Get return by ID error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Inspect return & set outcome
 * POST /api/returns/:id/inspect
 */
const inspectReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      inspectedBy,
      inspectedAt,
      outcome,
      remarks,
      createRework,
      reworkAssignedTo,
    } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    if (!inspectedBy || !outcome) {
      return res.status(400).json({
        message: 'inspectedBy and outcome are required',
      });
    }

    const validOutcomes = ['ACCEPT_RETURN', 'REWORK', 'SCRAP', 'REPLACE'];
    if (!validOutcomes.includes(outcome)) {
      return res.status(400).json({
        message: `outcome must be one of: ${validOutcomes.join(', ')}`,
      });
    }

    // Get return record
    const returnRecord = await prisma.returnRecord.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        deliveryNote: {
          include: {
            items: true,
          },
        },
        invoice: true,
      },
    });

    if (!returnRecord) {
      return res.status(404).json({ message: 'Return record not found' });
    }

    if (returnRecord.status !== 'PENDING') {
      return res.status(400).json({
        message: 'Return record has already been inspected',
      });
    }

    // Use transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Update return record
      const updatedReturn = await tx.returnRecord.update({
        where: { id },
        data: {
          status: 'INSPECTED',
          inspectedBy,
          inspectedAt: inspectedAt ? new Date(inspectedAt) : new Date(),
          outcome,
          notes: remarks || returnRecord.notes || null,
        },
      });

      let creditNoteId = null;
      let reworkJobId = null;
      let replacementDNId = null;

      // Process based on outcome
      if (outcome === 'ACCEPT_RETURN') {
        const acceptResult = await processAcceptReturn(
          updatedReturn,
          tenantId,
          inspectedBy,
          remarks,
          tx
        );
        creditNoteId = acceptResult.creditNoteId;

        // Update status to ACCEPTED
        await tx.returnRecord.update({
          where: { id },
          data: { status: 'ACCEPTED' },
        });

        // Create audit log
        await createAuditLog({
          tenantId,
          userId: inspectedBy,
          action: 'RETURN_ACCEPTED',
          entityType: 'ReturnRecord',
          entityId: id,
          oldData: {
            status: returnRecord.status,
          },
          newData: {
            status: 'ACCEPTED',
            outcome: 'ACCEPT_RETURN',
            creditNoteId,
          },
        });

        // Notify finance
        notifyReturnInspection(tenantId, id, 'ACCEPT_RETURN', creditNoteId).catch((err) =>
          console.error('Notification error:', err)
        );
      } else if (outcome === 'REWORK') {
        const reworkJob = await processReworkReturn(
          updatedReturn,
          tenantId,
          inspectedBy,
          remarks,
          reworkAssignedTo,
          tx
        );
        reworkJobId = reworkJob.id;

        // Update status to REWORK
        await tx.returnRecord.update({
          where: { id },
          data: { status: 'REWORK' },
        });

        // Create audit log
        await createAuditLog({
          tenantId,
          userId: inspectedBy,
          action: 'RETURN_REWORK_CREATED',
          entityType: 'ReturnRecord',
          entityId: id,
          newData: {
            status: 'REWORK',
            outcome: 'REWORK',
            reworkJobId,
          },
        });

        // Notify production/PM
        if (reworkAssignedTo) {
          notifyReworkCreated(tenantId, reworkJob.id, reworkAssignedTo).catch((err) =>
            console.error('Notification error:', err)
          );
        }
      } else if (outcome === 'SCRAP') {
        const scrapResult = await processScrapReturn(
          updatedReturn,
          tenantId,
          inspectedBy,
          remarks,
          tx
        );
        creditNoteId = scrapResult.creditNoteId;

        // Update status to SCRAPPED
        await tx.returnRecord.update({
          where: { id },
          data: { status: 'SCRAPPED' },
        });

        // Create audit log
        await createAuditLog({
          tenantId,
          userId: inspectedBy,
          action: 'RETURN_SCRAPPED',
          entityType: 'ReturnRecord',
          entityId: id,
          newData: {
            status: 'SCRAPPED',
            outcome: 'SCRAP',
            creditNoteId,
          },
        });

        // Notify finance
        notifyReturnInspection(tenantId, id, 'SCRAP', creditNoteId).catch((err) =>
          console.error('Notification error:', err)
        );
      } else if (outcome === 'REPLACE') {
        // Update status - replacement DN will be created separately
        await tx.returnRecord.update({
          where: { id },
          data: { status: 'INSPECTED' }, // Keep as INSPECTED until replacement DN is created
        });

        // Create audit log
        await createAuditLog({
          tenantId,
          userId: inspectedBy,
          action: 'RETURN_REPLACEMENT_INITIATED',
          entityType: 'ReturnRecord',
          entityId: id,
          newData: {
            status: 'INSPECTED',
            outcome: 'REPLACE',
          },
        });

        // Notify dispatch
        notifyReturnInspection(tenantId, id, 'REPLACE', null).catch((err) =>
          console.error('Notification error:', err)
        );
      }

      // Create audit log for inspection
      await createAuditLog({
        tenantId,
        userId: inspectedBy,
        action: 'RETURN_INSPECT',
        entityType: 'ReturnRecord',
        entityId: id,
        oldData: {
          status: returnRecord.status,
          outcome: returnRecord.outcome,
        },
        newData: {
          status: updatedReturn.status,
          outcome,
          inspectedBy,
          inspectedAt: updatedReturn.inspectedAt,
        },
      });

      return {
        updatedReturn,
        creditNoteId,
        reworkJobId,
        replacementDNId,
      };
    });

    res.json({
      success: true,
      returnId: id,
      outcome,
      creditNoteId: result.creditNoteId || null,
      reworkJobId: result.reworkJobId || null,
    });
  } catch (error) {
    console.error('Inspect return error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Create replacement DN (if REPLACE outcome)
 * POST /api/returns/:id/replace
 */
const createReplacementDN = async (req, res) => {
  try {
    const { id } = req.params;
    const { createdBy, vehicle, items, remarks } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    if (!createdBy || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: 'createdBy and items (non-empty array) are required',
      });
    }

    // Get return record
    const returnRecord = await prisma.returnRecord.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!returnRecord) {
      return res.status(404).json({ message: 'Return record not found' });
    }

    if (returnRecord.outcome !== 'REPLACE') {
      return res.status(400).json({
        message: 'Return record outcome must be REPLACE to create replacement DN',
      });
    }

    // Validate replacement quantities don't exceed returned quantities
    const returnItems = Array.isArray(returnRecord.items)
      ? returnRecord.items
      : typeof returnRecord.items === 'string'
      ? JSON.parse(returnRecord.items)
      : [];

    for (const replacementItem of items) {
      if (replacementItem.dnLineId) {
        const returnItem = returnItems.find((ri) => ri.dnLineId === replacementItem.dnLineId);
        if (returnItem && replacementItem.qty > returnItem.qty) {
          return res.status(400).json({
            message: `Replacement quantity (${replacementItem.qty}) cannot exceed returned quantity (${returnItem.qty}) for line ${replacementItem.dnLineId}`,
          });
        }
      }
    }

    // Use transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create replacement DN
      const replacementDN = await createReplacementDNService(
        returnRecord,
        tenantId,
        createdBy,
        vehicle,
        items,
        remarks,
        tx
      );

      // Create audit log
      await createAuditLog({
        tenantId,
        userId: createdBy,
        action: 'RETURN_REPLACEMENT_CREATED',
        entityType: 'ReturnRecord',
        entityId: id,
        newData: {
          replacementDNId: replacementDN.id,
          replacementDNNumber: replacementDN.dnNumber,
        },
      });

      return replacementDN;
    });

    res.status(201).json({
      dnId: result.id,
      dnNumber: result.dnNumber,
    });
  } catch (error) {
    console.error('Create replacement DN error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createReturn,
  getReturns,
  getReturnById,
  inspectReturn,
  createReplacementDN,
};
