const prisma = require('../config/prisma');
const { createAuditLog } = require('../services/auditLogService');

/**
 * Get all vehicles
 * GET /api/vehicles
 */
const getVehicles = async (req, res) => {
  try {
    const { status } = req.query;
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

    const vehicles = await prisma.vehicle.findMany({
      where,
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            phone: true,
            licenseNo: true,
          },
        },
        _count: {
          select: {
            deliveryNotes: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(vehicles);
  } catch (error) {
    console.error('Get vehicles error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get vehicle by ID
 * GET /api/vehicles/:id
 */
const getVehicleById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            phone: true,
            licenseNo: true,
            status: true,
          },
        },
        deliveryNotes: {
          where: {
            status: {
              in: ['DISPATCHED', 'LOADING'],
            },
          },
          select: {
            id: true,
            dnNumber: true,
            status: true,
            dispatchedAt: true,
            project: {
              select: { name: true, projectCode: true },
            },
            client: {
              select: { name: true, companyName: true },
            },
          },
        },
      },
    });

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    res.json(vehicle);
  } catch (error) {
    console.error('Get vehicle by ID error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Create vehicle
 * POST /api/vehicles
 */
const createVehicle = async (req, res) => {
  try {
    const { numberPlate, type, capacity, driverId } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    if (!numberPlate || !type) {
      return res
        .status(400)
        .json({ message: 'numberPlate and type are required' });
    }

    // Check if number plate already exists for this tenant
    const existing = await prisma.vehicle.findFirst({
      where: {
        tenantId,
        numberPlate: numberPlate.toUpperCase(),
      },
    });

    if (existing) {
      return res
        .status(400)
        .json({ message: 'Vehicle with this number plate already exists' });
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
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        tenantId,
        numberPlate: numberPlate.toUpperCase(),
        type,
        capacity: capacity || null,
        status: 'AVAILABLE',
        driverId: driverId || null,
      },
      include: {
        driver: true,
      },
    });

    // Create audit log
    await createAuditLog({
      tenantId,
      userId: req.user?.userId || null,
      action: 'VEHICLE_CREATE',
      entityType: 'Vehicle',
      entityId: vehicle.id,
      newData: {
        numberPlate: vehicle.numberPlate,
        type: vehicle.type,
        status: vehicle.status,
      },
    });

    res.status(201).json(vehicle);
  } catch (error) {
    console.error('Create vehicle error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Update vehicle
 * PUT /api/vehicles/:id
 */
const updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const { numberPlate, type, capacity, status, driverId } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    // Validate vehicle exists
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    // Check if number plate is being changed and if it conflicts
    if (numberPlate && numberPlate.toUpperCase() !== vehicle.numberPlate) {
      const existing = await prisma.vehicle.findFirst({
        where: {
          tenantId,
          numberPlate: numberPlate.toUpperCase(),
          NOT: { id },
        },
      });

      if (existing) {
        return res
          .status(400)
          .json({ message: 'Vehicle with this number plate already exists' });
      }
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
    }

    // Validate status transition
    if (status && status !== vehicle.status) {
      if (vehicle.status === 'IN_USE' && status === 'AVAILABLE') {
        // Check if vehicle has active deliveries
        const activeDeliveries = await prisma.deliveryNote.count({
          where: {
            vehicleId: id,
            status: {
              in: ['DISPATCHED', 'LOADING'],
            },
          },
        });

        if (activeDeliveries > 0) {
          return res.status(400).json({
            message: 'Cannot set vehicle to AVAILABLE while it has active deliveries',
          });
        }
      }
    }

    const oldData = {
      numberPlate: vehicle.numberPlate,
      type: vehicle.type,
      capacity: vehicle.capacity,
      status: vehicle.status,
      driverId: vehicle.driverId,
    };

    const updatedVehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        numberPlate: numberPlate
          ? numberPlate.toUpperCase()
          : vehicle.numberPlate,
        type: type || vehicle.type,
        capacity: capacity !== undefined ? capacity : vehicle.capacity,
        status: status || vehicle.status,
        driverId: driverId !== undefined ? driverId : vehicle.driverId,
      },
      include: {
        driver: true,
      },
    });

    // Create audit log
    await createAuditLog({
      tenantId,
      userId: req.user?.userId || null,
      action: 'VEHICLE_UPDATE',
      entityType: 'Vehicle',
      entityId: id,
      oldData,
      newData: {
        numberPlate: updatedVehicle.numberPlate,
        type: updatedVehicle.type,
        capacity: updatedVehicle.capacity,
        status: updatedVehicle.status,
        driverId: updatedVehicle.driverId,
      },
    });

    res.json(updatedVehicle);
  } catch (error) {
    console.error('Update vehicle error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Delete vehicle
 * DELETE /api/vehicles/:id
 */
const deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    // Validate vehicle exists
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    // Check if vehicle has active deliveries
    const activeDeliveries = await prisma.deliveryNote.count({
      where: {
        vehicleId: id,
        status: {
          in: ['DISPATCHED', 'LOADING'],
        },
      },
    });

    if (activeDeliveries > 0) {
      return res.status(400).json({
        message: 'Cannot delete vehicle with active deliveries',
      });
    }

    await prisma.vehicle.delete({
      where: { id },
    });

    // Create audit log
    await createAuditLog({
      tenantId,
      userId: req.user?.userId || null,
      action: 'VEHICLE_DELETE',
      entityType: 'Vehicle',
      entityId: id,
      oldData: {
        numberPlate: vehicle.numberPlate,
        type: vehicle.type,
      },
    });

    res.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    console.error('Delete vehicle error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
};

