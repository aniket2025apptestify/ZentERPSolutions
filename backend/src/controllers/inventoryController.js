const prisma = require('../config/prisma');
const { createAuditLog } = require('../services/auditLogService');

// ==================== INVENTORY ITEM CRUD ====================

/**
 * Create Inventory Item
 * POST /api/inventory/items
 */
const createItem = async (req, res) => {
  try {
    const {
      itemName,
      itemCode,
      category,
      unit,
      openingQty = 0,
      reorderLevel,
      systemItem = true,
      lastPurchaseRate,
    } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    if (!itemName) {
      return res.status(400).json({ message: 'itemName is required' });
    }

    if (!unit) {
      return res.status(400).json({ message: 'unit is required' });
    }

    if (openingQty < 0) {
      return res.status(400).json({ message: 'openingQty must be >= 0' });
    }

    if (reorderLevel !== undefined && reorderLevel < 0) {
      return res.status(400).json({ message: 'reorderLevel must be >= 0' });
    }

    // Check if itemCode already exists (if provided)
    if (itemCode) {
      const existing = await prisma.inventoryItem.findFirst({
        where: {
          itemCode: itemCode,
          tenantId: tenantId,
        },
      });
      if (existing) {
        return res.status(400).json({ message: 'Item code already exists' });
      }
    }

    const item = await prisma.inventoryItem.create({
      data: {
        tenantId,
        itemName,
        itemCode: itemCode || null,
        category: category || null,
        unit,
        openingQty,
        availableQty: openingQty,
        reservedQty: 0,
        reorderLevel: reorderLevel || null,
        systemItem,
        uom: unit,
        lastPurchaseRate: lastPurchaseRate || null,
      },
    });

    // Create audit log
    await createAuditLog({
      tenantId,
      userId: req.user?.userId || null,
      action: 'INVENTORY_ITEM_CREATE',
      entityType: 'InventoryItem',
      entityId: item.id,
      newData: {
        itemName: item.itemName,
        itemCode: item.itemCode,
        category: item.category,
        unit: item.unit,
        openingQty: item.openingQty,
      },
    });

    res.status(201).json(item);
  } catch (error) {
    console.error('Create inventory item error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Item code already exists' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get all inventory items with filters
 * GET /api/inventory/items
 */
const getItems = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const {
      search,
      category,
      lowStock,
      systemItem,
      page = 1,
      limit = 50,
    } = req.query;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const where = {
      tenantId,
    };

    if (search) {
      where.OR = [
        { itemName: { contains: search, mode: 'insensitive' } },
        { itemCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (systemItem !== undefined && systemItem !== '') {
      where.systemItem = systemItem === 'true';
    }

    if (lowStock === 'true') {
      where.reorderLevel = { not: null };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.inventoryItem.count({ where }),
    ]);

    res.json({
      items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get inventory items error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get inventory item by ID with recent transactions
 * GET /api/inventory/items/:id
 */
const getItemById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const item = await prisma.inventoryItem.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    // Get recent transactions (last 20)
    const transactions = await prisma.stockTransaction.findMany({
      where: {
        itemId: id,
        tenantId,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json({
      ...item,
      recentTransactions: transactions,
    });
  } catch (error) {
    console.error('Get inventory item by ID error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Update inventory item
 * PUT /api/inventory/items/:id
 */
const updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;
    const {
      itemName,
      itemCode,
      category,
      unit,
      reorderLevel,
      systemItem,
      lastPurchaseRate,
    } = req.body;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const existingItem = await prisma.inventoryItem.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!existingItem) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    // Check itemCode uniqueness if changed
    if (itemCode && itemCode !== existingItem.itemCode) {
      const duplicate = await prisma.inventoryItem.findFirst({
        where: {
          itemCode,
          tenantId,
          id: { not: id },
        },
      });
      if (duplicate) {
        return res.status(400).json({ message: 'Item code already exists' });
      }
    }

    if (reorderLevel !== undefined && reorderLevel < 0) {
      return res.status(400).json({ message: 'reorderLevel must be >= 0' });
    }

    const oldData = {
      itemName: existingItem.itemName,
      itemCode: existingItem.itemCode,
      category: existingItem.category,
      unit: existingItem.unit,
      reorderLevel: existingItem.reorderLevel,
      systemItem: existingItem.systemItem,
      lastPurchaseRate: existingItem.lastPurchaseRate,
    };

    const updatedItem = await prisma.inventoryItem.update({
      where: { id },
      data: {
        itemName: itemName !== undefined ? itemName : existingItem.itemName,
        itemCode: itemCode !== undefined ? itemCode : existingItem.itemCode,
        category: category !== undefined ? category : existingItem.category,
        unit: unit !== undefined ? unit : existingItem.unit,
        reorderLevel:
          reorderLevel !== undefined ? reorderLevel : existingItem.reorderLevel,
        systemItem:
          systemItem !== undefined ? systemItem : existingItem.systemItem,
        lastPurchaseRate:
          lastPurchaseRate !== undefined
            ? lastPurchaseRate
            : existingItem.lastPurchaseRate,
        uom: unit !== undefined ? unit : existingItem.uom,
      },
    });

    // Create audit log
    await createAuditLog({
      tenantId,
      userId: req.user?.userId || null,
      action: 'INVENTORY_ITEM_UPDATE',
      entityType: 'InventoryItem',
      entityId: id,
      oldData,
      newData: {
        itemName: updatedItem.itemName,
        itemCode: updatedItem.itemCode,
        category: updatedItem.category,
        unit: updatedItem.unit,
        reorderLevel: updatedItem.reorderLevel,
        systemItem: updatedItem.systemItem,
        lastPurchaseRate: updatedItem.lastPurchaseRate,
      },
    });

    res.json(updatedItem);
  } catch (error) {
    console.error('Update inventory item error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Item code already exists' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Delete inventory item (soft delete - set systemItem to false or mark as deleted)
 * DELETE /api/inventory/items/:id
 */
const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const item = await prisma.inventoryItem.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    // Soft delete by setting systemItem to false
    await prisma.inventoryItem.update({
      where: { id },
      data: { systemItem: false },
    });

    // Create audit log
    await createAuditLog({
      tenantId,
      userId: req.user?.userId || null,
      action: 'INVENTORY_ITEM_DELETE',
      entityType: 'InventoryItem',
      entityId: id,
      oldData: {
        itemName: item.itemName,
        itemCode: item.itemCode,
        systemItem: item.systemItem,
      },
    });

    res.json({ message: 'Inventory item deleted successfully' });
  } catch (error) {
    console.error('Delete inventory item error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ==================== STOCK TRANSACTION ====================

/**
 * Create manual stock transaction / adjustment
 * POST /api/inventory/stock-transaction
 */
const createStockTransaction = async (req, res) => {
  try {
    const {
      itemId,
      type,
      referenceType,
      referenceId,
      qty,
      rate,
      batchNo,
      remarks,
      createdBy,
    } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    if (!itemId || !type || qty === undefined) {
      return res
        .status(400)
        .json({ message: 'itemId, type, and qty are required' });
    }

    if (qty === 0) {
      return res.status(400).json({ message: 'qty must not be 0' });
    }

    // Validate item exists and belongs to tenant
    const item = await prisma.inventoryItem.findFirst({
      where: {
        id: itemId,
        tenantId,
      },
    });

    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    // For OUT transactions, check available stock
    if (type === 'OUT' && qty > 0) {
      const available = item.availableQty - item.reservedQty;
      if (available < qty) {
        return res.status(400).json({
          message: `Insufficient stock. Available: ${available}, Requested: ${qty}`,
        });
      }
    }

    // Calculate new balance
    let newBalance = item.availableQty;
    if (type === 'IN' || type === 'ADJUSTMENT') {
      newBalance += qty;
    } else if (type === 'OUT') {
      newBalance -= Math.abs(qty);
    }

    // Prevent negative stock (unless it's an adjustment that explicitly allows it)
    if (newBalance < 0 && type !== 'ADJUSTMENT') {
      return res.status(400).json({
        message: 'Stock cannot go negative',
      });
    }

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Update inventory item
      const updatedItem = await tx.inventoryItem.update({
        where: { id: itemId },
        data: { availableQty: newBalance },
      });

      // Create stock transaction
      const transaction = await tx.stockTransaction.create({
        data: {
          tenantId,
          itemId,
          type,
          referenceType: referenceType || 'ADJ',
          referenceId: referenceId || null,
          qty,
          rate: rate || null,
          balanceAfter: newBalance,
          batchNo: batchNo || null,
          remarks: remarks || null,
          createdBy: createdBy || req.user?.userId || null,
        },
      });

      return { updatedItem, transaction };
    });

    // Check for low stock alert
    if (
      result.updatedItem.reorderLevel !== null &&
      result.updatedItem.availableQty <= result.updatedItem.reorderLevel
    ) {
      // Trigger low stock alert (can be async)
      checkLowStockAlert(tenantId, itemId, result.updatedItem).catch(
        (err) => console.error('Low stock alert error:', err)
      );
    }

    // Create audit log
    await createAuditLog({
      tenantId,
      userId: req.user?.userId || null,
      action: 'STOCK_ADJUSTMENT',
      entityType: 'StockTransaction',
      entityId: result.transaction.id,
      oldData: {
        availableQty: item.availableQty,
      },
      newData: {
        availableQty: result.updatedItem.availableQty,
        type,
        qty,
      },
    });

    res.status(201).json(result.transaction);
  } catch (error) {
    console.error('Create stock transaction error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ==================== MATERIAL ISSUE ====================

/**
 * Issue material to production job
 * POST /api/inventory/issue
 */
const issueMaterial = async (req, res) => {
  try {
    const {
      jobId,
      projectId,
      subGroupId,
      issuedBy,
      issuedAt,
      items,
    } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    if (!jobId || !issuedBy || !items || items.length === 0) {
      return res
        .status(400)
        .json({ message: 'jobId, issuedBy, and items are required' });
    }

    // Validate production job exists
    const job = await prisma.productionJob.findFirst({
      where: {
        id: jobId,
        project: {
          tenantId,
        },
      },
      include: {
        project: true,
        subGroup: true,
      },
    });

    if (!job) {
      return res.status(404).json({ message: 'Production job not found' });
    }

    // Validate all items and check stock availability
    const itemValidations = [];
    for (const item of items) {
      if (!item.itemId || !item.qty || item.qty <= 0) {
        return res.status(400).json({
          message: 'Each item must have itemId and qty > 0',
        });
      }

      const inventoryItem = await prisma.inventoryItem.findFirst({
        where: {
          id: item.itemId,
          tenantId,
        },
      });

      if (!inventoryItem) {
        return res
          .status(404)
          .json({ message: `Inventory item ${item.itemId} not found` });
      }

      const wastage = item.wastage || 0;
      const totalQty = item.qty + wastage;
      const available = inventoryItem.availableQty - inventoryItem.reservedQty;

      if (available < totalQty) {
        return res.status(400).json({
          message: `Insufficient stock for item ${inventoryItem.itemName}. Available: ${available}, Required: ${totalQty}`,
        });
      }

      itemValidations.push({
        item,
        inventoryItem,
        totalQty,
        wastage,
      });
    }

    // Use transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Update inventory items and create stock transactions
      const stockTransactions = [];
      const wastageRecords = [];

      for (const validation of itemValidations) {
        const { item, inventoryItem, totalQty, wastage } = validation;

        // Update inventory item
        const newBalance = inventoryItem.availableQty - totalQty;
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
            referenceType: 'ISSUE',
            referenceId: null, // Will be set after MaterialIssue is created
            qty: totalQty,
            rate: inventoryItem.lastPurchaseRate || null,
            balanceAfter: newBalance,
            batchNo: item.batchNo || null,
            remarks: item.remarks || null,
            createdBy: issuedBy,
          },
        });

        stockTransactions.push(transaction);

        // Create wastage record if wastage > 0
        if (wastage > 0) {
          const wastageRecord = await tx.wastageRecord.create({
            data: {
              tenantId,
              itemId: item.itemId,
              jobId: jobId,
              qty: wastage,
              reason: item.wastageReason || null,
              recordedBy: issuedBy,
              recordedAt: issuedAt ? new Date(issuedAt) : new Date(),
            },
          });
          wastageRecords.push(wastageRecord);
        }

        // Check for low stock alert
        const updatedItem = await tx.inventoryItem.findUnique({
          where: { id: item.itemId },
        });
        if (
          updatedItem.reorderLevel !== null &&
          updatedItem.availableQty <= updatedItem.reorderLevel
        ) {
          checkLowStockAlert(tenantId, item.itemId, updatedItem).catch(
            (err) => console.error('Low stock alert error:', err)
          );
        }
      }

      // Create material issue record
      const materialIssue = await tx.materialIssue.create({
        data: {
          tenantId,
          jobId,
          projectId: projectId || job.projectId || null,
          subGroupId: subGroupId || job.subGroupId || null,
          issuedBy,
          issuedAt: issuedAt ? new Date(issuedAt) : new Date(),
          items: items,
        },
      });

      // Update stock transactions with materialIssue referenceId
      for (const transaction of stockTransactions) {
        await tx.stockTransaction.update({
          where: { id: transaction.id },
          data: { referenceId: materialIssue.id },
        });
      }

      // Update ProductionJob materialConsumption
      const currentConsumption = job.materialConsumption || [];
      const newConsumption = [
        ...currentConsumption,
        ...items.map((item) => ({
          itemId: item.itemId,
          qty: item.qty,
          wastage: item.wastage || 0,
          issuedAt: issuedAt ? new Date(issuedAt) : new Date(),
        })),
      ];

      await tx.productionJob.update({
        where: { id: jobId },
        data: { materialConsumption: newConsumption },
      });

      // Update project actualCost if project exists
      if (job.projectId) {
        const project = await tx.project.findUnique({
          where: { id: job.projectId },
        });

        if (project) {
          let costIncrease = 0;
          for (const validation of itemValidations) {
            const { inventoryItem, totalQty } = validation;
            const rate =
              inventoryItem.lastPurchaseRate || 0;
            costIncrease += totalQty * rate;
          }

          await tx.project.update({
            where: { id: job.projectId },
            data: {
              actualCost: (project.actualCost || 0) + costIncrease,
            },
          });
        }
      }

      return { materialIssue, stockTransactions, wastageRecords };
    });

    // Create audit log
    await createAuditLog({
      tenantId,
      userId: req.user?.userId || null,
      action: 'MATERIAL_ISSUE_CREATE',
      entityType: 'MaterialIssue',
      entityId: result.materialIssue.id,
      newData: {
        jobId,
        itemsCount: items.length,
        totalItems: items.reduce((sum, item) => sum + item.qty, 0),
      },
    });

    res.status(201).json({
      materialIssueId: result.materialIssue.id,
      status: 'ISSUED',
      items: items.map((item) => ({
        itemId: item.itemId,
        issuedQty: item.qty,
        wastage: item.wastage || 0,
      })),
    });
  } catch (error) {
    console.error('Issue material error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ==================== STOCK RESERVATION ====================

/**
 * Reserve stock for job / PO
 * POST /api/inventory/reserve
 */
const reserveStock = async (req, res) => {
  try {
    const { itemId, qty, referenceType, referenceId, reservedBy } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    if (!itemId || !qty || qty <= 0) {
      return res
        .status(400)
        .json({ message: 'itemId and qty > 0 are required' });
    }

    // Validate item exists
    const item = await prisma.inventoryItem.findFirst({
      where: {
        id: itemId,
        tenantId,
      },
    });

    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    // Check available stock
    const available = item.availableQty - item.reservedQty;
    if (available < qty) {
      return res.status(400).json({
        message: `Insufficient stock. Available: ${available}, Requested: ${qty}`,
      });
    }

    // Update reserved quantity
    const updatedItem = await prisma.inventoryItem.update({
      where: { id: itemId },
      data: {
        reservedQty: item.reservedQty + qty,
      },
    });

    // Create stock transaction for reservation tracking
    const transaction = await prisma.stockTransaction.create({
      data: {
        tenantId,
        itemId,
        type: 'OUT',
        referenceType: referenceType || 'RESERVE',
        referenceId: referenceId || null,
        qty: qty,
        rate: null,
        balanceAfter: item.availableQty, // Available qty doesn't change, only reserved
        batchNo: null,
        remarks: `Reserved ${qty} units`,
        createdBy: reservedBy || req.user?.userId || null,
      },
    });

    // Create audit log
    await createAuditLog({
      tenantId,
      userId: req.user?.userId || null,
      action: 'STOCK_RESERVE_CREATE',
      entityType: 'InventoryItem',
      entityId: itemId,
      oldData: {
        reservedQty: item.reservedQty,
      },
      newData: {
        reservedQty: updatedItem.reservedQty,
        referenceType,
        referenceId,
      },
    });

    res.json({ success: true, reservedQty: updatedItem.reservedQty });
  } catch (error) {
    console.error('Reserve stock error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Unreserve stock
 * POST /api/inventory/unreserve
 */
const unreserveStock = async (req, res) => {
  try {
    const { itemId, qty, referenceId, unreservedBy } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    if (!itemId || !qty || qty <= 0) {
      return res
        .status(400)
        .json({ message: 'itemId and qty > 0 are required' });
    }

    // Validate item exists
    const item = await prisma.inventoryItem.findFirst({
      where: {
        id: itemId,
        tenantId,
      },
    });

    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    // Check if enough reserved quantity
    if (item.reservedQty < qty) {
      return res.status(400).json({
        message: `Insufficient reserved stock. Reserved: ${item.reservedQty}, Requested: ${qty}`,
      });
    }

    // Update reserved quantity
    const updatedItem = await prisma.inventoryItem.update({
      where: { id: itemId },
      data: {
        reservedQty: item.reservedQty - qty,
      },
    });

    // Create audit log
    await createAuditLog({
      tenantId,
      userId: req.user?.userId || null,
      action: 'STOCK_RESERVE_RELEASE',
      entityType: 'InventoryItem',
      entityId: itemId,
      oldData: {
        reservedQty: item.reservedQty,
      },
      newData: {
        reservedQty: updatedItem.reservedQty,
        referenceId,
      },
    });

    res.json({ success: true, reservedQty: updatedItem.reservedQty });
  } catch (error) {
    console.error('Unreserve stock error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ==================== REPORTS ====================

/**
 * Get stock transactions (ledger)
 * GET /api/inventory/stock-transactions
 */
const getStockTransactions = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { itemId, from, to, type, page = 1, limit = 50 } = req.query;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const where = {
      tenantId,
    };

    if (itemId) {
      where.itemId = itemId;
    }

    if (type) {
      where.type = type;
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

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [transactions, total] = await Promise.all([
      prisma.stockTransaction.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          item: {
            select: {
              id: true,
              itemName: true,
              itemCode: true,
              unit: true,
            },
          },
        },
      }),
      prisma.stockTransaction.count({ where }),
    ]);

    res.json({
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get stock transactions error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get wastage report
 * GET /api/inventory/wastage-report
 */
const getWastageReport = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { from, to, itemId, jobId } = req.query;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const where = {
      tenantId,
    };

    if (itemId) {
      where.itemId = itemId;
    }

    if (jobId) {
      where.jobId = jobId;
    }

    if (from || to) {
      where.recordedAt = {};
      if (from) {
        where.recordedAt.gte = new Date(from);
      }
      if (to) {
        where.recordedAt.lte = new Date(to);
      }
    }

    const wastageRecords = await prisma.wastageRecord.findMany({
      where,
      include: {
        item: {
          select: {
            id: true,
            itemName: true,
            itemCode: true,
            unit: true,
          },
        },
      },
      orderBy: { recordedAt: 'desc' },
    });

    // Aggregate by item
    const aggregatedByItem = {};
    for (const record of wastageRecords) {
      const key = record.itemId;
      if (!aggregatedByItem[key]) {
        aggregatedByItem[key] = {
          itemId: record.itemId,
          itemName: record.item.itemName,
          itemCode: record.item.itemCode,
          unit: record.item.unit,
          totalQty: 0,
          records: [],
        };
      }
      aggregatedByItem[key].totalQty += record.qty;
      aggregatedByItem[key].records.push(record);
    }

    res.json({
      records: wastageRecords,
      aggregatedByItem: Object.values(aggregatedByItem),
    });
  } catch (error) {
    console.error('Get wastage report error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Check low stock and generate alerts
 * GET /api/inventory/check-low-stock
 */
const checkLowStock = async (req, res) => {
  try {
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    // Get all items with reorderLevel set
    const itemsWithReorderLevel = await prisma.inventoryItem.findMany({
      where: {
        tenantId,
        reorderLevel: { not: null },
      },
    });

    // Filter items where availableQty <= reorderLevel
    const lowStockItems = itemsWithReorderLevel.filter(
      (item) => item.availableQty <= item.reorderLevel
    );

    // Sort by availableQty ascending
    lowStockItems.sort((a, b) => a.availableQty - b.availableQty);

    // Generate alerts for each low stock item
    const alerts = [];
    for (const item of lowStockItems) {
      const alert = await checkLowStockAlert(tenantId, item.id, item);
      if (alert) {
        alerts.push(alert);
      }
    }

    res.json({
      lowStockItems,
      alertsGenerated: alerts.length,
    });
  } catch (error) {
    console.error('Check low stock error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Helper function to check and create low stock alert
async function checkLowStockAlert(tenantId, itemId, item) {
  try {
    // Check if alert already exists for this item (within last 24 hours)
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    const existingAlert = await prisma.auditLog.findFirst({
      where: {
        tenantId,
        entityType: 'InventoryItem',
        entityId: itemId,
        action: 'LOW_STOCK_ALERT',
        timestamp: {
          gte: yesterday,
        },
      },
    });

    if (existingAlert) {
      return null; // Alert already sent recently
    }

    // Create alert via audit log
    await createAuditLog({
      tenantId,
      userId: null,
      action: 'LOW_STOCK_ALERT',
      entityType: 'InventoryItem',
      entityId: itemId,
      newData: {
        itemName: item.itemName,
        itemCode: item.itemCode,
        availableQty: item.availableQty,
        reorderLevel: item.reorderLevel,
      },
    });

    // TODO: Send email notification to procurement users
    // This can be implemented using the email service

    return {
      itemId,
      itemName: item.itemName,
      availableQty: item.availableQty,
      reorderLevel: item.reorderLevel,
    };
  } catch (error) {
    console.error('Error creating low stock alert:', error);
    return null;
  }
}

module.exports = {
  createItem,
  getItems,
  getItemById,
  updateItem,
  deleteItem,
  createStockTransaction,
  issueMaterial,
  reserveStock,
  unreserveStock,
  getStockTransactions,
  getWastageReport,
  checkLowStock,
};

