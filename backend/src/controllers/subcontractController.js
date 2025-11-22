const prisma = require('../config/prisma');
const { createAuditLog } = require('../services/auditLogService');
const { generateSWONumber } = require('../services/sequenceService');

// ==================== SUBCONTRACT WORK ORDER (SWO) ====================

/**
 * Create Subcontract Work Order (DRAFT)
 * POST /api/subcontract/swo
 */
const createSWO = async (req, res) => {
  try {
    const {
      vendorId,
      projectId,
      subGroupId,
      description,
      expectedStart,
      expectedEnd,
      materialIssued,
      totalAmount,
      currency,
      createdBy,
    } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    if (!vendorId || !createdBy) {
      return res.status(400).json({ message: 'vendorId and createdBy are required' });
    }

    // Validate vendor exists and belongs to tenant
    const vendor = await prisma.vendor.findFirst({
      where: {
        id: vendorId,
        tenantId,
      },
    });

    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
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

    // Validate subGroup if provided
    if (subGroupId) {
      const subGroup = await prisma.subGroup.findFirst({
        where: {
          id: subGroupId,
          projectId: projectId || undefined,
        },
      });

      if (!subGroup) {
        return res.status(404).json({ message: 'SubGroup not found' });
      }
    }

    // Generate SWO number
    const swoNumber = await generateSWONumber(tenantId);

    // Create SWO
    const swo = await prisma.subcontractWorkOrder.create({
      data: {
        tenantId,
        swoNumber,
        vendorId,
        projectId: projectId || null,
        subGroupId: subGroupId || null,
        description: description || null,
        status: 'DRAFT',
        totalAmount: totalAmount || null,
        currency: currency || null,
        materialIssued: materialIssued || null,
        expectedStart: expectedStart ? new Date(expectedStart) : null,
        expectedEnd: expectedEnd ? new Date(expectedEnd) : null,
        createdBy,
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            companyName: true,
          },
        },
        project: {
          select: {
            id: true,
            projectCode: true,
            name: true,
          },
        },
        subGroup: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Create audit log
    await createAuditLog({
      tenantId,
      userId: createdBy,
      action: 'SWO_CREATE',
      entityType: 'SubcontractWorkOrder',
      entityId: swo.id,
      newData: {
        swoNumber: swo.swoNumber,
        vendorId: swo.vendorId,
        projectId: swo.projectId,
        status: swo.status,
      },
    });

    res.status(201).json({
      swoId: swo.id,
      swoNumber: swo.swoNumber,
      status: swo.status,
    });
  } catch (error) {
    console.error('Create SWO error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get list of SWOs with filters
 * GET /api/subcontract/swo?status=&vendorId=&projectId=
 */
const getSWOs = async (req, res) => {
  try {
    const { status, vendorId, projectId } = req.query;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const where = {
      tenantId,
      ...(status && { status }),
      ...(vendorId && { vendorId }),
      ...(projectId && { projectId }),
    };

    const swos = await prisma.subcontractWorkOrder.findMany({
      where,
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            companyName: true,
          },
        },
        project: {
          select: {
            id: true,
            projectCode: true,
            name: true,
          },
        },
        subGroup: {
          select: {
            id: true,
            name: true,
          },
        },
        subcontractInvoices: {
          select: {
            id: true,
            invoiceNumber: true,
            amount: true,
            status: true,
          },
        },
        subcontractReceipts: {
          select: {
            id: true,
            receivedDate: true,
            receivedBy: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(swos);
  } catch (error) {
    console.error('Get SWOs error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get SWO by ID with full details
 * GET /api/subcontract/swo/:id
 */
const getSWOById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const swo = await prisma.subcontractWorkOrder.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        vendor: true,
        project: {
          include: {
            client: {
              select: {
                id: true,
                name: true,
                companyName: true,
              },
            },
          },
        },
        subGroup: true,
        subcontractInvoices: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        subcontractReceipts: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!swo) {
      return res.status(404).json({ message: 'SWO not found' });
    }

    // Get audit logs for this SWO
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        tenantId,
        entityType: 'SubcontractWorkOrder',
        entityId: id,
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: 50,
    });

    res.json({
      ...swo,
      auditLogs,
    });
  } catch (error) {
    console.error('Get SWO by ID error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Issue material to SWO
 * PUT /api/subcontract/swo/:id/issue-material
 */
const issueMaterialToSWO = async (req, res) => {
  try {
    const { id } = req.params;
    const { issuedBy, issuedDate, items } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'items array is required' });
    }

    // Get SWO
    const swo = await prisma.subcontractWorkOrder.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!swo) {
      return res.status(404).json({ message: 'SWO not found' });
    }

    if (swo.status === 'CLOSED' || swo.status === 'CANCELLED') {
      return res.status(400).json({ message: 'Cannot issue material to closed or cancelled SWO' });
    }

    // Validate inventory availability and prepare updates
    const itemValidations = [];
    for (const item of items) {
      if (!item.itemId || !item.qty || item.qty <= 0) {
        return res.status(400).json({ message: 'Each item must have itemId and qty > 0' });
      }

      const inventoryItem = await prisma.inventoryItem.findFirst({
        where: {
          id: item.itemId,
          tenantId,
        },
      });

      if (!inventoryItem) {
        return res.status(404).json({ message: `Inventory item ${item.itemId} not found` });
      }

      const available = inventoryItem.availableQty - inventoryItem.reservedQty;
      if (available < item.qty) {
        return res.status(400).json({
          message: `Insufficient stock for item ${inventoryItem.itemName}. Available: ${available}, Requested: ${item.qty}`,
        });
      }

      itemValidations.push({
        item,
        inventoryItem,
      });
    }

    // Use transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      const stockTransactions = [];
      const updatedMaterialIssued = Array.isArray(swo.materialIssued) ? [...swo.materialIssued] : [];

      // Process each item
      for (const { item, inventoryItem } of itemValidations) {
        // Update inventory item
        const newBalance = inventoryItem.availableQty - item.qty;
        await tx.inventoryItem.update({
          where: { id: item.itemId },
          data: { availableQty: newBalance },
        });

        // Create stock transaction
        const transaction = await tx.stockTransaction.create({
          data: {
            tenantId,
            itemId: item.itemId,
            type: 'OUT',
            referenceType: 'SWO_ISSUE',
            referenceId: id,
            qty: item.qty,
            rate: inventoryItem.lastPurchaseRate || null,
            balanceAfter: newBalance,
            batchNo: item.batchNo || null,
            remarks: `Material issued to SWO ${swo.swoNumber}`,
            createdBy: issuedBy,
          },
        });

        stockTransactions.push(transaction);

        // Add to materialIssued array
        updatedMaterialIssued.push({
          itemId: item.itemId,
          qty: item.qty,
          uom: item.uom || inventoryItem.unit,
          batchNo: item.batchNo || null,
        });
      }

      // Update SWO
      const newStatus = swo.status === 'DRAFT' ? 'ISSUED' : swo.status;
      const updatedSWO = await tx.subcontractWorkOrder.update({
        where: { id },
        data: {
          materialIssued: updatedMaterialIssued,
          status: newStatus,
        },
      });

      return { updatedSWO, stockTransactions };
    });

    // Create audit log
    await createAuditLog({
      tenantId,
      userId: issuedBy,
      action: 'SWO_MATERIAL_ISSUE',
      entityType: 'SubcontractWorkOrder',
      entityId: id,
      oldData: {
        materialIssued: swo.materialIssued,
        status: swo.status,
      },
      newData: {
        materialIssued: result.updatedSWO.materialIssued,
        status: result.updatedSWO.status,
      },
    });

    res.json({
      materialIssueId: `mi_swo_${id}`,
      status: result.updatedSWO.status,
      stockTransactions: result.stockTransactions,
    });
  } catch (error) {
    console.error('Issue material to SWO error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Start SWO (mark as IN_PROGRESS)
 * PUT /api/subcontract/swo/:id/start
 */
const startSWO = async (req, res) => {
  try {
    const { id } = req.params;
    const { startedBy, actualStart } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const swo = await prisma.subcontractWorkOrder.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!swo) {
      return res.status(404).json({ message: 'SWO not found' });
    }

    if (swo.status !== 'ISSUED' && swo.status !== 'DRAFT') {
      return res.status(400).json({ message: `Cannot start SWO with status ${swo.status}` });
    }

    const oldStatus = swo.status;
    const updatedSWO = await prisma.subcontractWorkOrder.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        expectedStart: actualStart ? new Date(actualStart) : swo.expectedStart,
      },
    });

    // Create audit log
    await createAuditLog({
      tenantId,
      userId: startedBy || req.user?.userId || null,
      action: 'SWO_START',
      entityType: 'SubcontractWorkOrder',
      entityId: id,
      oldData: {
        status: oldStatus,
      },
      newData: {
        status: updatedSWO.status,
      },
    });

    res.json(updatedSWO);
  } catch (error) {
    console.error('Start SWO error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Receive finished goods from vendor
 * POST /api/subcontract/swo/:id/receive
 */
const receiveSWO = async (req, res) => {
  try {
    const { id } = req.params;
    const { receivedBy, receivedDate, items, documents } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'items array is required' });
    }

    const swo = await prisma.subcontractWorkOrder.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        project: true,
        subGroup: true,
      },
    });

    if (!swo) {
      return res.status(404).json({ message: 'SWO not found' });
    }

    if (swo.status === 'CLOSED' || swo.status === 'CANCELLED') {
      return res.status(400).json({ message: 'Cannot receive goods for closed or cancelled SWO' });
    }

    // Use transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Create receipt
      const receipt = await tx.subcontractReceipt.create({
        data: {
          tenantId,
          swoId: id,
          receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
          receivedBy,
          items,
          documents: documents || null,
        },
      });

      const stockTransactions = [];
      let hasRejectedItems = false;

      // Process each received item
      for (const item of items) {
        const qualityStatus = item.qualityStatus || 'ACCEPTED';

        // If item is accepted and has itemId (inventory item), create stock transaction IN
        if (qualityStatus === 'ACCEPTED' && item.itemId) {
          const inventoryItem = await tx.inventoryItem.findFirst({
            where: {
              id: item.itemId,
              tenantId,
            },
          });

          if (inventoryItem) {
            const newBalance = inventoryItem.availableQty + item.qty;
            await tx.inventoryItem.update({
              where: { id: item.itemId },
              data: { availableQty: newBalance },
            });

            const transaction = await tx.stockTransaction.create({
              data: {
                tenantId,
                itemId: item.itemId,
                type: 'IN',
                referenceType: 'SWO_RECEIPT',
                referenceId: receipt.id,
                qty: item.qty,
                rate: inventoryItem.lastPurchaseRate || null,
                balanceAfter: newBalance,
                batchNo: item.batchNo || null,
                remarks: `Received from SWO ${swo.swoNumber}`,
                createdBy: receivedBy,
              },
            });

            stockTransactions.push(transaction);
          }
        } else if (qualityStatus !== 'ACCEPTED') {
          hasRejectedItems = true;
          // TODO: Create QCRecord or ReturnRecord for rejected items
        }

        // Update project/subgroup actuals if item is consumed for project
        if (qualityStatus === 'ACCEPTED' && !item.itemId && (swo.projectId || swo.subGroupId)) {
          // This is a finished good consumed directly for project
          // Update project/subgroup actualQty or actualCost
          // Implementation depends on your project structure
        }
      }

      // Update SWO status
      let newStatus = 'RECEIVED';
      if (hasRejectedItems) {
        newStatus = 'IN_PROGRESS'; // Keep in progress if there are rejects
      }

      const updatedSWO = await tx.subcontractWorkOrder.update({
        where: { id },
        data: {
          status: newStatus,
        },
      });

      return { receipt, updatedSWO, stockTransactions };
    });

    // Create audit log
    await createAuditLog({
      tenantId,
      userId: receivedBy,
      action: 'SWO_RECEIVE',
      entityType: 'SubcontractWorkOrder',
      entityId: id,
      oldData: {
        status: swo.status,
      },
      newData: {
        status: result.updatedSWO.status,
        receiptId: result.receipt.id,
      },
    });

    res.json({
      receiptId: result.receipt.id,
      status: result.updatedSWO.status,
      stockTransactions: result.stockTransactions,
    });
  } catch (error) {
    console.error('Receive SWO error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Close SWO
 * PUT /api/subcontract/swo/:id/close
 */
const closeSWO = async (req, res) => {
  try {
    const { id } = req.params;
    const { closedBy, closedAt } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const swo = await prisma.subcontractWorkOrder.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        subcontractInvoices: true,
        subcontractReceipts: true,
        project: true,
        subGroup: true,
      },
    });

    if (!swo) {
      return res.status(404).json({ message: 'SWO not found' });
    }

    if (swo.status === 'CLOSED') {
      return res.status(400).json({ message: 'SWO is already closed' });
    }

    if (swo.status === 'CANCELLED') {
      return res.status(400).json({ message: 'Cannot close cancelled SWO' });
    }

    // Validate: receipt accepted or agreed
    if (swo.subcontractReceipts.length === 0) {
      return res.status(400).json({ message: 'Cannot close SWO without receipt' });
    }

    // Check for unpaid invoices (optional validation - can be overridden by Director)
    const unpaidInvoices = swo.subcontractInvoices.filter((inv) => inv.status !== 'PAID');
    if (unpaidInvoices.length > 0) {
      // Allow closing but log warning
      console.warn(`SWO ${swo.swoNumber} has ${unpaidInvoices.length} unpaid invoices`);
    }

    // Use transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update SWO status
      const updatedSWO = await tx.subcontractWorkOrder.update({
        where: { id },
        data: {
          status: 'CLOSED',
        },
      });

      // Calculate total cost (material issued value + invoice amounts)
      let totalCost = 0;

      // Add invoice amounts
      const invoiceTotal = swo.subcontractInvoices.reduce((sum, inv) => sum + inv.amount, 0);
      totalCost += invoiceTotal;

      // Add material issued value (if materialIssued has cost data)
      // This would need to be calculated from materialIssued items and their rates

      // Update project actualCost
      if (swo.projectId) {
        const project = await tx.project.findUnique({
          where: { id: swo.projectId },
        });

        if (project) {
          await tx.project.update({
            where: { id: swo.projectId },
            data: {
              actualCost: (project.actualCost || 0) + totalCost,
            },
          });
        }
      }

      // Update subGroup actualCost if applicable
      if (swo.subGroupId) {
        const subGroup = await tx.subGroup.findUnique({
          where: { id: swo.subGroupId },
        });

        if (subGroup) {
          // Update subGroup actualMaterial or actualCost based on your structure
          // This is a placeholder - adjust based on your SubGroup model
        }
      }

      return { updatedSWO, totalCost };
    });

    // Create audit log
    await createAuditLog({
      tenantId,
      userId: closedBy || req.user?.userId || null,
      action: 'SWO_CLOSE',
      entityType: 'SubcontractWorkOrder',
      entityId: id,
      oldData: {
        status: swo.status,
      },
      newData: {
        status: result.updatedSWO.status,
        totalCost: result.totalCost,
      },
    });

    res.json({
      success: true,
      swo: result.updatedSWO,
    });
  } catch (error) {
    console.error('Close SWO error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get SWOs by vendor
 * GET /api/subcontract/vendors/:vendorId/swo
 */
const getSWOsByVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const swos = await prisma.subcontractWorkOrder.findMany({
      where: {
        tenantId,
        vendorId,
      },
      include: {
        project: {
          select: {
            id: true,
            projectCode: true,
            name: true,
          },
        },
        subcontractInvoices: {
          select: {
            id: true,
            invoiceNumber: true,
            amount: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(swos);
  } catch (error) {
    console.error('Get SWOs by vendor error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createSWO,
  getSWOs,
  getSWOById,
  issueMaterialToSWO,
  startSWO,
  receiveSWO,
  closeSWO,
  getSWOsByVendor,
};
