const prisma = require('../config/prisma');
const { hashPassword } = require('../utils/password');
const { createAuditLog } = require('../services/auditLogService');
const { Role } = require('@prisma/client');

/**
 * Create a new tenant with admin user
 * POST /api/tenants
 */
const createTenant = async (req, res) => {
  try {
    const { name, code, address, vatNumber, productionStages, settings, admin } = req.body;

    // Validate required fields
    if (!name || !code || !admin || !admin.name || !admin.email || !admin.password) {
      return res.status(400).json({
        message: 'Name, code, and admin details (name, email, password) are required',
      });
    }

    // Check if tenant code already exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { code },
    });

    if (existingTenant) {
      return res.status(400).json({ message: 'Tenant with this code already exists' });
    }

    // Check if admin email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: admin.email },
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Hash admin password
    const hashedPassword = await hashPassword(admin.password);

    // Create tenant and admin user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name,
          code,
          address: address || null,
          vatNumber: vatNumber || null,
          productionStages: productionStages || null,
          settings: settings || null,
        },
      });

      // Create admin user (DIRECTOR role)
      const adminUser = await tx.user.create({
        data: {
          tenantId: tenant.id,
          name: admin.name,
          email: admin.email,
          password: hashedPassword,
          role: Role.DIRECTOR,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          tenantId: true,
          isActive: true,
          createdAt: true,
        },
      });

      return { tenant, adminUser };
    });

    // Create audit log
    await createAuditLog({
      tenantId: null, // SuperAdmin action, no tenant
      userId: req.user.userId,
      action: 'TENANT_CREATED',
      entityType: 'Tenant',
      entityId: result.tenant.id,
      newData: {
        tenantName: result.tenant.name,
        tenantCode: result.tenant.code,
        adminEmail: result.adminUser.email,
      },
    });

    res.status(201).json({
      tenant: result.tenant,
      adminUser: result.adminUser,
    });
  } catch (error) {
    console.error('Create tenant error:', error);
    
    // Handle Prisma unique constraint error
    if (error.code === 'P2002') {
      return res.status(400).json({
        message: 'Tenant code or admin email already exists',
      });
    }

    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get all tenants (SuperAdmin only)
 * GET /api/tenants
 */
const getAllTenants = async (req, res) => {
  try {
    const tenants = await prisma.tenant.findMany({
      include: {
        _count: {
          select: {
            users: true,
            clients: true,
            projects: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(tenants);
  } catch (error) {
    console.error('Get all tenants error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get single tenant by ID
 * GET /api/tenants/:id
 */
const getTenantById = async (req, res) => {
  try {
    const { id } = req.params;

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            clients: true,
            projects: true,
          },
        },
      },
    });

    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    res.json(tenant);
  } catch (error) {
    console.error('Get tenant by ID error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Update tenant
 * PUT /api/tenants/:id
 */
const updateTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, vatNumber, productionStages, settings, logoUrl } = req.body;

    // Check if tenant exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { id },
    });

    if (!existingTenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    // Prepare update data (only include provided fields)
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (vatNumber !== undefined) updateData.vatNumber = vatNumber;
    if (productionStages !== undefined) updateData.productionStages = productionStages;
    if (settings !== undefined) updateData.settings = settings;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;

    // Update tenant
    const updatedTenant = await prisma.tenant.update({
      where: { id },
      data: updateData,
    });

    // Create audit log
    await createAuditLog({
      tenantId: id,
      userId: req.user.userId,
      action: 'TENANT_UPDATED',
      entityType: 'Tenant',
      entityId: id,
      oldData: existingTenant,
      newData: updatedTenant,
    });

    res.json(updatedTenant);
  } catch (error) {
    console.error('Update tenant error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createTenant,
  getAllTenants,
  getTenantById,
  updateTenant,
};

