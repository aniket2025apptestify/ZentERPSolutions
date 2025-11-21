const prisma = require('../config/prisma');
const { createAuditLog } = require('../services/auditLogService');

/**
 * Get all drivers
 * GET /api/drivers
 */
const getDrivers = async (req, res) => {
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

    const drivers = await prisma.driver.findMany({
      where,
      include: {
        vehicles: {
          select: {
            id: true,
            numberPlate: true,
            type: true,
            status: true,
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

    res.json(drivers);
  } catch (error) {
    console.error('Get drivers error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get driver by ID
 * GET /api/drivers/:id
 */
const getDriverById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const driver = await prisma.driver.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        vehicles: {
          select: {
            id: true,
            numberPlate: true,
            type: true,
            status: true,
            capacity: true,
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

    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    res.json(driver);
  } catch (error) {
    console.error('Get driver by ID error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Create driver
 * POST /api/drivers
 */
const createDriver = async (req, res) => {
  try {
    const { name, phone, licenseNo } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    if (!name || !phone) {
      return res.status(400).json({ message: 'name and phone are required' });
    }

    const driver = await prisma.driver.create({
      data: {
        tenantId,
        name,
        phone,
        licenseNo: licenseNo || null,
        status: 'ACTIVE',
      },
    });

    // Create audit log
    await createAuditLog({
      tenantId,
      userId: req.user?.userId || null,
      action: 'DRIVER_CREATE',
      entityType: 'Driver',
      entityId: driver.id,
      newData: {
        name: driver.name,
        phone: driver.phone,
        status: driver.status,
      },
    });

    res.status(201).json(driver);
  } catch (error) {
    console.error('Create driver error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Update driver
 * PUT /api/drivers/:id
 */
const updateDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, licenseNo, status } = req.body;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    // Validate driver exists
    const driver = await prisma.driver.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    // Validate status transition
    if (status && status !== driver.status) {
      if (status === 'INACTIVE') {
        // Check if driver has active deliveries
        const activeDeliveries = await prisma.deliveryNote.count({
          where: {
            driverId: id,
            status: {
              in: ['DISPATCHED', 'LOADING'],
            },
          },
        });

        if (activeDeliveries > 0) {
          return res.status(400).json({
            message: 'Cannot set driver to INACTIVE while they have active deliveries',
          });
        }
      }
    }

    const oldData = {
      name: driver.name,
      phone: driver.phone,
      licenseNo: driver.licenseNo,
      status: driver.status,
    };

    const updatedDriver = await prisma.driver.update({
      where: { id },
      data: {
        name: name || driver.name,
        phone: phone || driver.phone,
        licenseNo: licenseNo !== undefined ? licenseNo : driver.licenseNo,
        status: status || driver.status,
      },
    });

    // Create audit log
    await createAuditLog({
      tenantId,
      userId: req.user?.userId || null,
      action: 'DRIVER_UPDATE',
      entityType: 'Driver',
      entityId: id,
      oldData,
      newData: {
        name: updatedDriver.name,
        phone: updatedDriver.phone,
        licenseNo: updatedDriver.licenseNo,
        status: updatedDriver.status,
      },
    });

    res.json(updatedDriver);
  } catch (error) {
    console.error('Update driver error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Delete driver
 * DELETE /api/drivers/:id
 */
const deleteDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    // Validate driver exists
    const driver = await prisma.driver.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    // Check if driver has active deliveries
    const activeDeliveries = await prisma.deliveryNote.count({
      where: {
        driverId: id,
        status: {
          in: ['DISPATCHED', 'LOADING'],
        },
      },
    });

    if (activeDeliveries > 0) {
      return res.status(400).json({
        message: 'Cannot delete driver with active deliveries',
      });
    }

    await prisma.driver.delete({
      where: { id },
    });

    // Create audit log
    await createAuditLog({
      tenantId,
      userId: req.user?.userId || null,
      action: 'DRIVER_DELETE',
      entityType: 'Driver',
      entityId: id,
      oldData: {
        name: driver.name,
        phone: driver.phone,
      },
    });

    res.json({ message: 'Driver deleted successfully' });
  } catch (error) {
    console.error('Delete driver error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getDrivers,
  getDriverById,
  createDriver,
  updateDriver,
  deleteDriver,
};

