const prisma = require('../config/prisma');
const { createAuditLog } = require('../services/auditLogService');
const { generateDNNumber } = require('../services/sequenceService');

/**
 * Create a new Delivery Note
 * POST /api/dn
 */
const createDeliveryNote = async (req, res) => {
  try {
    const {
      projectId,
      clientId,
      address,
      remarks,
      items = [],
      createdBy,
    } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    if (!projectId || !clientId || !address) {
      return res
        .status(400)
        .json({ message: 'projectId, clientId, and address are required' });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'At least one item is required' });
    }

    // Validate project exists and belongs to tenant
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        tenantId,
      },
      include: {
        client: true,
      },
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Validate client matches project client
    if (project.clientId !== clientId) {
      return res
        .status(400)
        .json({ message: 'Client does not match project client' });
    }

    // Generate DN number
    const dnNumber = await generateDNNumber(tenantId);

    // Create DN with items
    const deliveryNote = await prisma.deliveryNote.create({
      data: {
        tenantId,
        dnNumber,
        projectId,
        clientId,
        address,
        status: 'DRAFT',
        remarks: remarks || null,
        createdBy: createdBy || req.user?.userId || null,
        items: {
          create: items.map((item) => ({
            tenantId,
            productionJobId: item.productionJobId || null,
            itemId: item.itemId || null,
            description: item.description || item.itemName || '',
            qty: item.qty,
            uom: item.uom || null,
            remarks: item.remarks || null,
          })),
        },
      },
      include: {
        project: {
          select: { id: true, name: true, projectCode: true },
        },
        client: {
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true,
            phone: true,
            address: true,
          },
        },
        items: true,
      },
    });

    // Create audit log
    await createAuditLog({
      tenantId,
      userId: createdBy || req.user?.userId || null,
      action: 'DN_CREATE',
      entityType: 'DeliveryNote',
      entityId: deliveryNote.id,
      newData: {
        dnNumber: deliveryNote.dnNumber,
        projectId,
        clientId,
        status: 'DRAFT',
      },
    });

    res.status(201).json({
      dnId: deliveryNote.id,
      dnNumber: deliveryNote.dnNumber,
      deliveryNote,
    });
  } catch (error) {
    console.error('Create delivery note error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get all Delivery Notes with filters
 * GET /api/dn
 */
const getDeliveryNotes = async (req, res) => {
  try {
    const { status, projectId, clientId } = req.query;
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

    if (projectId) {
      where.projectId = projectId;
    }

    if (clientId) {
      where.clientId = clientId;
    }

    const deliveryNotes = await prisma.deliveryNote.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true, projectCode: true },
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
        vehicle: {
          select: { id: true, numberPlate: true, type: true },
        },
        driver: {
          select: { id: true, name: true, phone: true },
        },
        items: true,
        _count: {
          select: {
            tracking: true,
            qcRecords: true,
            returns: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(deliveryNotes);
  } catch (error) {
    console.error('Get delivery notes error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get Delivery Note by ID
 * GET /api/dn/:id
 */
const getDeliveryNoteById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const deliveryNote = await prisma.deliveryNote.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        project: {
          select: { id: true, name: true, projectCode: true },
        },
        client: {
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true,
            phone: true,
            address: true,
          },
        },
        subGroup: {
          select: { id: true, name: true },
        },
        vehicle: {
          select: {
            id: true,
            numberPlate: true,
            type: true,
            capacity: true,
            status: true,
          },
        },
        driver: {
          select: {
            id: true,
            name: true,
            phone: true,
            licenseNo: true,
          },
        },
        items: {
          include: {
            inventoryItem: {
              select: {
                id: true,
                itemName: true,
                itemCode: true,
                unit: true,
              },
            },
          },
        },
        tracking: {
          orderBy: {
            timestamp: 'desc',
          },
        },
        acknowledgement: true,
        qcRecords: {
          include: {
            productionJob: {
              select: { id: true, jobCardNumber: true },
            },
          },
          orderBy: {
            inspectedAt: 'desc',
          },
        },
        returns: {
          include: {
            client: {
              select: { id: true, name: true },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!deliveryNote) {
      return res.status(404).json({ message: 'Delivery note not found' });
    }

    res.json(deliveryNote);
  } catch (error) {
    console.error('Get delivery note by ID error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Record loaded quantities
 * PUT /api/dn/:id/load
 */
const updateLoading = async (req, res) => {
  try {
    const { id } = req.params;
    const { items, photos } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Items are required' });
    }

    // Validate DN exists
    const dn = await prisma.deliveryNote.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        items: true,
      },
    });

    if (!dn) {
      return res.status(404).json({ message: 'Delivery note not found' });
    }

    if (dn.status !== 'DRAFT' && dn.status !== 'LOADING') {
      return res
        .status(400)
        .json({ message: `Cannot load DN in status: ${dn.status}` });
    }

    // Validate loaded quantities
    for (const itemUpdate of items) {
      const dnItem = dn.items.find((i) => i.id === itemUpdate.dnItemId);
      if (!dnItem) {
        return res
          .status(400)
          .json({ message: `DN item ${itemUpdate.dnItemId} not found` });
      }

      if (itemUpdate.loadedQty > dnItem.qty) {
        return res.status(400).json({
          message: `LoadedQty (${itemUpdate.loadedQty}) cannot exceed DN qty (${dnItem.qty}) for item ${dnItem.id}`,
        });
      }
    }

    // Update DN items and status
    const result = await prisma.$transaction(async (tx) => {
      // Update items
      for (const itemUpdate of items) {
        await tx.deliveryNoteItem.update({
          where: { id: itemUpdate.dnItemId },
          data: { loadedQty: itemUpdate.loadedQty },
        });
      }

      // Update DN status and documents
      const updatedDN = await tx.deliveryNote.update({
        where: { id },
        data: {
          status: 'LOADING',
          documents: photos
            ? {
                loadingPhotos: photos,
              }
            : undefined,
        },
        include: {
          items: true,
        },
      });

      return updatedDN;
    });

    // Create audit log
    await createAuditLog({
      tenantId,
      userId: req.user?.userId || null,
      action: 'DN_LOAD',
      entityType: 'DeliveryNote',
      entityId: id,
      newData: {
        status: 'LOADING',
        loadedItems: items,
      },
    });

    res.json(result);
  } catch (error) {
    console.error('Update loading error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Assign vehicle and driver
 * PUT /api/dn/:id/assign-vehicle
 */
const assignVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const { vehicleId, driverId } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    if (!vehicleId) {
      return res.status(400).json({ message: 'vehicleId is required' });
    }

    // Validate DN exists
    const dn = await prisma.deliveryNote.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!dn) {
      return res.status(404).json({ message: 'Delivery note not found' });
    }

    if (dn.status !== 'LOADING') {
      return res
        .status(400)
        .json({ message: `Cannot assign vehicle in status: ${dn.status}` });
    }

    // Validate vehicle exists and is available
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        tenantId,
      },
    });

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    if (vehicle.status !== 'AVAILABLE') {
      return res
        .status(400)
        .json({ message: `Vehicle is not available. Status: ${vehicle.status}` });
    }

    // Validate driver if provided
    if (driverId) {
      const driver = await prisma.driver.findFirst({
        where: {
          id: driverId,
          tenantId,
        },
      });

      if (!driver) {
        return res.status(404).json({ message: 'Driver not found' });
      }

      if (driver.status !== 'ACTIVE') {
        return res
          .status(400)
          .json({ message: `Driver is not active. Status: ${driver.status}` });
      }
    }

    // Update DN and vehicle status
    const result = await prisma.$transaction(async (tx) => {
      // Update vehicle status
      await tx.vehicle.update({
        where: { id: vehicleId },
        data: {
          status: 'IN_USE',
          driverId: driverId || null,
        },
      });

      // Update DN
      const updatedDN = await tx.deliveryNote.update({
        where: { id },
        data: {
          vehicleId,
          driverId: driverId || null,
        },
        include: {
          vehicle: true,
          driver: true,
        },
      });

      return updatedDN;
    });

    // Create audit log
    await createAuditLog({
      tenantId,
      userId: req.user?.userId || null,
      action: 'DN_ASSIGN_VEHICLE',
      entityType: 'DeliveryNote',
      entityId: id,
      newData: {
        vehicleId,
        driverId: driverId || null,
      },
    });

    res.json(result);
  } catch (error) {
    console.error('Assign vehicle error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Dispatch Delivery Note
 * PUT /api/dn/:id/dispatch
 */
const dispatchDeliveryNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { dispatchedAt, remarks } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    // Validate DN exists
    const dn = await prisma.deliveryNote.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        items: {
          include: {
            inventoryItem: true,
          },
        },
        vehicle: true,
        qcRecords: {
          where: {
            qcStatus: 'FAIL',
          },
        },
      },
    });

    if (!dn) {
      return res.status(404).json({ message: 'Delivery note not found' });
    }

    if (dn.status !== 'LOADING') {
      return res
        .status(400)
        .json({ message: `Cannot dispatch DN in status: ${dn.status}` });
    }

    // Check if vehicle is assigned
    if (!dn.vehicleId) {
      return res
        .status(400)
        .json({ message: 'Vehicle must be assigned before dispatch' });
    }

    // Check if all items are loaded
    const unloadedItems = dn.items.filter(
      (item) => !item.loadedQty || item.loadedQty === 0
    );
    if (unloadedItems.length > 0) {
      return res.status(400).json({
        message: 'All items must be loaded before dispatch',
        unloadedItems: unloadedItems.map((i) => i.id),
      });
    }

    // Check if QC failed (optional check - can be configured)
    if (dn.qcRecords && dn.qcRecords.length > 0) {
      return res.status(400).json({
        message: 'DN has failed QC records. Cannot dispatch.',
      });
    }

    // Use transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Update DN status
      const updatedDN = await tx.deliveryNote.update({
        where: { id },
        data: {
          status: 'DISPATCHED',
          dispatchedAt: dispatchedAt ? new Date(dispatchedAt) : new Date(),
          remarks: remarks || dn.remarks || null,
        },
        include: {
          items: {
            include: {
              inventoryItem: true,
            },
          },
        },
      });

      // Create stock transactions for each item
      const stockTransactions = [];
      for (const item of updatedDN.items) {
        if (item.itemId && item.loadedQty > 0) {
          const inventoryItem = item.inventoryItem;
          if (!inventoryItem) {
            continue; // Skip if item not found
          }

          // Calculate new balance
          const newBalance = inventoryItem.availableQty - item.loadedQty;

          // Update inventory item
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
              referenceType: 'DN',
              referenceId: id,
              qty: item.loadedQty,
              rate: inventoryItem.lastPurchaseRate || null,
              balanceAfter: newBalance,
              remarks: `Dispatch: ${updatedDN.dnNumber}`,
              createdBy: req.user?.userId || null,
            },
          });

          stockTransactions.push(transaction);
        }
      }

      return { updatedDN, stockTransactions };
    });

    // Create audit log
    await createAuditLog({
      tenantId,
      userId: req.user?.userId || null,
      action: 'DN_DISPATCH',
      entityType: 'DeliveryNote',
      entityId: id,
      newData: {
        status: 'DISPATCHED',
        dispatchedAt: result.updatedDN.dispatchedAt,
        stockTransactionsCount: result.stockTransactions.length,
      },
    });

    res.json(result.updatedDN);
  } catch (error) {
    console.error('Dispatch delivery note error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Add tracking entry
 * POST /api/dn/:id/tracking
 */
const addTracking = async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, location, remarks } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    // Validate DN exists
    const dn = await prisma.deliveryNote.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!dn) {
      return res.status(404).json({ message: 'Delivery note not found' });
    }

    if (dn.status !== 'DISPATCHED') {
      return res
        .status(400)
        .json({ message: `Can only track DISPATCHED DNs. Current status: ${dn.status}` });
    }

    // Create tracking entry
    const tracking = await prisma.deliveryTracking.create({
      data: {
        tenantId,
        dnId: id,
        latitude: latitude || null,
        longitude: longitude || null,
        location: location || null,
        remarks: remarks || null,
      },
    });

    // Create audit log
    await createAuditLog({
      tenantId,
      userId: req.user?.userId || null,
      action: 'TRACKING_UPDATE',
      entityType: 'DeliveryTracking',
      entityId: tracking.id,
      newData: {
        dnId: id,
        location,
        latitude,
        longitude,
      },
    });

    res.status(201).json(tracking);
  } catch (error) {
    console.error('Add tracking error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Mark DN as delivered
 * PUT /api/dn/:id/deliver
 */
const deliverDeliveryNote = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      deliveredAt,
      deliveredQty,
      receivedBy,
      sitePhotos,
      signatureDocId,
      remarks,
    } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    // Validate DN exists
    const dn = await prisma.deliveryNote.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        items: true,
      },
    });

    if (!dn) {
      return res.status(404).json({ message: 'Delivery note not found' });
    }

    if (dn.status !== 'DISPATCHED') {
      return res
        .status(400)
        .json({ message: `Cannot deliver DN in status: ${dn.status}` });
    }

    // Validate delivered quantities
    if (deliveredQty && deliveredQty.length > 0) {
      for (const qtyUpdate of deliveredQty) {
        const dnItem = dn.items.find((i) => i.id === qtyUpdate.dnItemId);
        if (!dnItem) {
          return res
            .status(400)
            .json({ message: `DN item ${qtyUpdate.dnItemId} not found` });
        }

        if (qtyUpdate.qty > (dnItem.loadedQty || dnItem.qty)) {
          return res.status(400).json({
            message: `DeliveredQty (${qtyUpdate.qty}) cannot exceed LoadedQty (${dnItem.loadedQty || dnItem.qty}) for item ${dnItem.id}`,
          });
        }
      }
    }

    // Use transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update delivered quantities
      if (deliveredQty && deliveredQty.length > 0) {
        for (const qtyUpdate of deliveredQty) {
          await tx.deliveryNoteItem.update({
            where: { id: qtyUpdate.dnItemId },
            data: { deliveredQty: qtyUpdate.qty },
          });
        }
      }

      // Update DN status
      const updatedDN = await tx.deliveryNote.update({
        where: { id },
        data: {
          status: 'DELIVERED',
          deliveredAt: deliveredAt ? new Date(deliveredAt) : new Date(),
          remarks: remarks || dn.remarks || null,
        },
      });

      // Create or update acknowledgement
      const acknowledgement = await tx.deliveryAcknowledgement.upsert({
        where: { dnId: id },
        update: {
          receivedBy: receivedBy || null,
          signatureDocId: signatureDocId || null,
          sitePhotos: sitePhotos || null,
          remarks: remarks || null,
          acknowledgedAt: new Date(),
        },
        create: {
          tenantId,
          dnId: id,
          receivedBy: receivedBy || null,
          signatureDocId: signatureDocId || null,
          sitePhotos: sitePhotos || null,
          remarks: remarks || null,
        },
      });

      // Release vehicle
      if (dn.vehicleId) {
        await tx.vehicle.update({
          where: { id: dn.vehicleId },
          data: { status: 'AVAILABLE' },
        });
      }

      return { updatedDN, acknowledgement };
    });

    // Create audit log
    await createAuditLog({
      tenantId,
      userId: req.user?.userId || null,
      action: 'DN_DELIVER',
      entityType: 'DeliveryNote',
      entityId: id,
      newData: {
        status: 'DELIVERED',
        deliveredAt: result.updatedDN.deliveredAt,
        receivedBy,
      },
    });

    res.json(result.updatedDN);
  } catch (error) {
    console.error('Deliver delivery note error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createDeliveryNote,
  getDeliveryNotes,
  getDeliveryNoteById,
  updateLoading,
  assignVehicle,
  dispatchDeliveryNote,
  addTracking,
  deliverDeliveryNote,
};

