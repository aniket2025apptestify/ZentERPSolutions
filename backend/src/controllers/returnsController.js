const prisma = require('../config/prisma');
const { createAuditLog } = require('../services/auditLogService');
const { notifyReturnCreated, notifyReworkCreated } = require('../services/notificationService');

/**
 * Create return record
 * POST /api/returns
 */
const createReturn = async (req, res) => {
  try {
    const { dnId, clientId, reason, items, createdBy } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    if (!dnId || !clientId || !reason || !items || !createdBy) {
      return res.status(400).json({
        message: 'dnId, clientId, reason, items, and createdBy are required',
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'items must be a non-empty array' });
    }

    // Validate delivery note exists and belongs to tenant
    const dn = await prisma.deliveryNote.findFirst({
      where: {
        id: dnId,
        project: {
          tenantId,
        },
      },
      include: {
        dnLines: true,
        project: true,
      },
    });

    if (!dn) {
      return res.status(404).json({ message: 'Delivery note not found' });
    }

    // Validate client
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        tenantId,
      },
    });

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Validate return quantities don't exceed dispatched quantities
    for (const returnItem of items) {
      const dnLine = dn.dnLines.find((line) => line.id === returnItem.dnLineId);
      if (!dnLine) {
        return res.status(400).json({
          message: `DN line ${returnItem.dnLineId} not found`,
        });
      }
      if (returnItem.qty > dnLine.qty) {
        return res.status(400).json({
          message: `Return quantity (${returnItem.qty}) exceeds dispatched quantity (${dnLine.qty}) for line ${returnItem.dnLineId}`,
        });
      }
    }

    // Use transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create return record
      const returnRecord = await tx.returnRecord.create({
        data: {
          tenantId,
          dnId,
          clientId,
          reason,
          items,
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
          dnId,
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

    res.json(result);
  } catch (error) {
    console.error('Create return error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Inspect return record
 * POST /api/returns/:id/inspect
 */
const inspectReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const { inspectedBy, result, remarks, reworkAssignedTo } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    if (!inspectedBy || !result) {
      return res.status(400).json({
        message: 'inspectedBy and result are required',
      });
    }

    if (!['REWORK', 'SCRAP', 'ACCEPT_RETURN'].includes(result)) {
      return res.status(400).json({
        message: 'result must be REWORK, SCRAP, or ACCEPT_RETURN',
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
            dnLines: true,
          },
        },
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
    const result_data = await prisma.$transaction(async (tx) => {
      // Update return record
      const updatedReturn = await tx.returnRecord.update({
        where: { id },
        data: {
          status: 'INSPECTED',
          inspectedBy,
          inspectedAt: new Date(),
          outcome: result,
        },
      });

      let reworkJobId = null;

      if (result === 'REWORK') {
        // Create rework job
        const reworkJob = await tx.reworkJob.create({
          data: {
            tenantId,
            sourceDNId: returnRecord.dnId,
            assignedTo: reworkAssignedTo || null,
            createdBy: inspectedBy,
            status: 'OPEN',
            notes: remarks || null,
          },
        });

        reworkJobId = reworkJob.id;

        // Notify assigned user
        if (reworkAssignedTo) {
          notifyReworkCreated(tenantId, reworkJob.id, reworkAssignedTo).catch(
            (err) => console.error('Notification error:', err)
          );
        }

        // Create audit log for rework
        await createAuditLog({
          tenantId,
          userId: inspectedBy,
          action: 'REWORK_CREATE',
          entityType: 'ReworkJob',
          entityId: reworkJob.id,
          newData: {
            sourceDNId: returnRecord.dnId,
            reason: 'RETURN_INSPECTION',
          },
        });
      } else if (result === 'SCRAP') {
        // Create wastage records and stock transactions
        const returnItems = Array.isArray(returnRecord.items)
          ? returnRecord.items
          : typeof returnRecord.items === 'string'
          ? JSON.parse(returnRecord.items)
          : [];

        for (const item of returnItems) {
          // Find inventory item
          const inventoryItem = await tx.inventoryItem.findFirst({
            where: {
              id: item.itemId,
              tenantId,
            },
          });

          if (inventoryItem) {
            // Create wastage record
            await tx.wastageRecord.create({
              data: {
                tenantId,
                itemId: item.itemId,
                qty: item.qty,
                reason: `Return scrap: ${remarks || 'N/A'}`,
                recordedBy: inspectedBy,
                recordedAt: new Date(),
              },
            });

            // Create stock transaction OUT
            const balanceAfter = inventoryItem.availableQty - item.qty;
            await tx.stockTransaction.create({
              data: {
                tenantId,
                itemId: item.itemId,
                type: 'OUT',
                referenceType: 'ADJUST',
                referenceId: id,
                qty: item.qty,
                balanceAfter: Math.max(0, balanceAfter),
                remarks: `Scrap from return ${returnRecord.id}`,
                createdBy: inspectedBy,
              },
            });

            // Update inventory item
            await tx.inventoryItem.update({
              where: { id: item.itemId },
              data: {
                availableQty: Math.max(0, balanceAfter),
              },
            });
          }
        }
      } else if (result === 'ACCEPT_RETURN') {
        // Put items back to inventory
        const returnItems = Array.isArray(returnRecord.items)
          ? returnRecord.items
          : typeof returnRecord.items === 'string'
          ? JSON.parse(returnRecord.items)
          : [];

        for (const item of returnItems) {
          // Find inventory item
          const inventoryItem = await tx.inventoryItem.findFirst({
            where: {
              id: item.itemId,
              tenantId,
            },
          });

          if (inventoryItem) {
            // Create stock transaction IN
            const balanceAfter = inventoryItem.availableQty + item.qty;
            await tx.stockTransaction.create({
              data: {
                tenantId,
                itemId: item.itemId,
                type: 'IN',
                referenceType: 'RETURN',
                referenceId: id,
                qty: item.qty,
                balanceAfter,
                remarks: `Return accepted: ${remarks || 'N/A'}`,
                createdBy: inspectedBy,
              },
            });

            // Update inventory item
            await tx.inventoryItem.update({
              where: { id: item.itemId },
              data: {
                availableQty: balanceAfter,
              },
            });
          }
        }
      }

      // Create audit log for inspection
      await createAuditLog({
        tenantId,
        userId: inspectedBy,
        action: 'RETURN_INSPECTION',
        entityType: 'ReturnRecord',
        entityId: id,
        oldData: {
          status: returnRecord.status,
          outcome: returnRecord.outcome,
        },
        newData: {
          status: 'INSPECTED',
          outcome: result,
          inspectedBy,
        },
      });

      return { updatedReturn, reworkJobId };
    });

    res.json({
      returnRecord: result_data.updatedReturn,
      reworkJobId: result_data.reworkJobId || null,
    });
  } catch (error) {
    console.error('Inspect return error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get return record by ID
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
            dnLines: true,
            project: {
              select: {
                projectCode: true,
                name: true,
              },
            },
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
 * Get return records with filters
 * GET /api/returns
 */
const getReturnList = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { dnId, clientId, status, outcome } = req.query;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const where = {
      tenantId,
    };

    if (dnId) {
      where.dnId = dnId;
    }

    if (clientId) {
      where.clientId = clientId;
    }

    if (status) {
      where.status = status;
    }

    if (outcome) {
      where.outcome = outcome;
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
    console.error('Get return list error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createReturn,
  inspectReturn,
  getReturnById,
  getReturnList,
};

