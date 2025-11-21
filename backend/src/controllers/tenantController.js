const prisma = require('../config/prisma');
const { hashPassword } = require('../utils/password');
const { createAuditLog } = require('../services/auditLogService');
const {
  testCloudinaryConnection,
  initializeCloudinary,
  uploadToCloudinary,
  deleteFromCloudinary,
} = require('../services/cloudinaryService');
const { Role } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');
const { testSMTPConnection, sendTestEmail } = require('../services/emailService');

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

/**
 * Get current tenant settings (for logged-in tenant)
 * GET /api/tenant/settings
 */
const getCurrentTenantSettings = async (req, res) => {
  try {
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
        logoUrl: true,
        vatNumber: true,
        settings: true,
      },
    });

    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    // Parse settings JSON if it exists
    const settings = tenant.settings || {};
    
    res.json({
      ...tenant,
      settings: {
        city: settings.city || '',
        state: settings.state || '',
        countryCode: settings.countryCode || '',
        zipCode: settings.zipCode || '',
        phone: settings.phone || '',
        gstin: settings.gstin || '',
        customFields: settings.customFields || [],
        companyInfoFormat: settings.companyInfoFormat || '{company_name}\n{address}\n{city} {state}\n{country_code} {zip_code}',
        cloudinary: {
          cloudName: settings.cloudinary?.cloudName || '',
          apiKey: settings.cloudinary?.apiKey || '',
          apiSecret: settings.cloudinary?.apiSecret || '',
          enabled: settings.cloudinary?.enabled || false,
        },
        smtp: {
          enabled: settings.smtp?.enabled || false,
          host: settings.smtp?.host || '',
          port: settings.smtp?.port || '587',
          secure: settings.smtp?.secure || false,
          user: settings.smtp?.user || '',
          password: settings.smtp?.password ? '••••••••' : '', // Masked for security
          fromName: settings.smtp?.fromName || tenant.name || '',
          fromEmail: settings.smtp?.fromEmail || '',
          replyTo: settings.smtp?.replyTo || '',
        },
      },
    });
  } catch (error) {
    console.error('Get tenant settings error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Update current tenant settings
 * PUT /api/tenant/settings
 */
const updateCurrentTenantSettings = async (req, res) => {
  try {
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    const {
      name,
      address,
      logoUrl,
      vatNumber,
      city,
      state,
      countryCode,
      zipCode,
      phone,
      gstin,
      customFields,
      companyInfoFormat,
      cloudinary,
      smtp,
    } = req.body;

    // Check if tenant exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!existingTenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    // Prepare update data
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
    if (vatNumber !== undefined) updateData.vatNumber = vatNumber;

    // Update settings JSON
    const currentSettings = existingTenant.settings || {};
    
    // Handle SMTP password: only update if provided (not empty string)
    let smtpSettings = currentSettings.smtp || {};
    if (smtp !== undefined) {
      smtpSettings = {
        ...smtpSettings,
        ...smtp,
        // Only update password if it's provided and not empty
        ...(smtp.password !== undefined && smtp.password !== '' && { password: smtp.password }),
        // If password is empty string, don't update it (keep existing)
      };
    }
    
    const newSettings = {
      ...currentSettings,
      ...(city !== undefined && { city }),
      ...(state !== undefined && { state }),
      ...(countryCode !== undefined && { countryCode }),
      ...(zipCode !== undefined && { zipCode }),
      ...(phone !== undefined && { phone }),
      ...(gstin !== undefined && { gstin }),
      ...(customFields !== undefined && { customFields }),
      ...(companyInfoFormat !== undefined && { companyInfoFormat }),
      ...(cloudinary !== undefined && { cloudinary }),
      ...(smtp !== undefined && { smtp: smtpSettings }),
    };
    updateData.settings = newSettings;

    // Update tenant
    const updatedTenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: updateData,
    });

    // Create audit log
    await createAuditLog({
      tenantId,
      userId: req.user.userId,
      action: 'TENANT_SETTINGS_UPDATED',
      entityType: 'Tenant',
      entityId: tenantId,
      newData: {
        name: updatedTenant.name,
        settingsUpdated: true,
      },
    });

    res.json(updatedTenant);
  } catch (error) {
    console.error('Update tenant settings error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Upload tenant logo
 * POST /api/tenant/settings/logo
 */
const uploadTenantLogo = async (req, res) => {
  try {
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Logo file is required' });
    }

    // Check if tenant exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true, logoUrl: true },
    });

    if (!existingTenant) {
      // Delete uploaded file if tenant doesn't exist
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(404).json({ message: 'Tenant not found' });
    }

    const settings = existingTenant.settings || {};
    const cloudinaryConfig = settings.cloudinary || {};
    let fileUrl = `/uploads/logos/${req.file.filename}`;
    let cloudinaryPublicId = null;

    // Upload to Cloudinary if enabled and configured
    if (cloudinaryConfig.enabled && cloudinaryConfig.cloudName && cloudinaryConfig.apiKey && cloudinaryConfig.apiSecret) {
      try {
        initializeCloudinary(
          cloudinaryConfig.cloudName,
          cloudinaryConfig.apiKey,
          cloudinaryConfig.apiSecret
        );

        // Delete old logo from Cloudinary if it exists
        if (existingTenant.logoUrl && existingTenant.logoUrl.includes('cloudinary.com')) {
          // Extract public ID from Cloudinary URL if possible
          // This is a simple extraction - you might need to store public ID separately
          try {
            const urlParts = existingTenant.logoUrl.split('/');
            const publicIdWithExt = urlParts[urlParts.length - 1].split('.')[0];
            const folder = `zent-erp/${tenantId}/logos`;
            const publicId = `${folder}/${publicIdWithExt}`;
            await deleteFromCloudinary(publicId).catch(() => {});
          } catch (error) {
            console.error('Error deleting old Cloudinary logo:', error);
          }
        }

        const uploadResult = await uploadToCloudinary(req.file.path, {
          folder: `zent-erp/${tenantId}/logos`,
          resource_type: 'image',
        });

        fileUrl = uploadResult.url;
        cloudinaryPublicId = uploadResult.publicId;

        // Delete local file after successful Cloudinary upload
        await fs.unlink(req.file.path).catch(() => {});
      } catch (error) {
        console.error('Cloudinary upload failed, using local storage:', error);
        // Continue with local storage if Cloudinary fails
      }
    } else {
      // Delete old local logo if exists
      if (existingTenant.logoUrl && existingTenant.logoUrl.startsWith('/uploads/')) {
        const oldLogoPath = path.join(__dirname, '../../', existingTenant.logoUrl.replace(/^\//, ''));
        await fs.unlink(oldLogoPath).catch(() => {}); // Ignore errors if file doesn't exist
      }
    }

    // Update tenant with new logo URL
    const updatedTenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: { logoUrl: fileUrl },
    });

    // Create audit log
    await createAuditLog({
      tenantId,
      userId: req.user.userId,
      action: 'TENANT_LOGO_UPLOADED',
      entityType: 'Tenant',
      entityId: tenantId,
      newData: {
        logoUrl: fileUrl,
      },
    });

    res.json({ logoUrl: fileUrl });
  } catch (error) {
    console.error('Upload tenant logo error:', error);
    
    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Test Cloudinary connection
 * POST /api/tenant/settings/test-cloudinary
 */
const testCloudinary = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { cloudName, apiKey, apiSecret } = req.body;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    if (!cloudName || !apiKey || !apiSecret) {
      return res.status(400).json({
        message: 'Cloud name, API key, and API secret are required',
      });
    }

    const result = await testCloudinaryConnection(cloudName, apiKey, apiSecret);

    if (result.success) {
      res.json({ success: true, message: result.message });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('Test Cloudinary error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Test SMTP connection
 * POST /api/tenant/settings/test-smtp
 */
const testSMTP = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const smtpConfig = req.body;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    if (!smtpConfig.host || !smtpConfig.user || !smtpConfig.password) {
      return res.status(400).json({
        message: 'SMTP host, user, and password are required',
      });
    }

    const result = await testSMTPConnection(smtpConfig);

    if (result.success) {
      res.json({ success: true, message: result.message });
    } else {
      res.status(400).json({ success: false, message: result.message, error: result.error });
    }
  } catch (error) {
    console.error('Test SMTP error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * Send test email
 * POST /api/tenant/settings/test-email
 */
const sendTestEmailEndpoint = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { smtpConfig, toEmail } = req.body;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    if (!smtpConfig || !smtpConfig.host || !smtpConfig.user || !smtpConfig.password) {
      return res.status(400).json({
        message: 'SMTP configuration (host, user, password) is required',
      });
    }

    if (!toEmail) {
      return res.status(400).json({
        message: 'Recipient email address is required',
      });
    }

    const result = await sendTestEmail(smtpConfig, toEmail);

    if (result.success) {
      res.json({ success: true, message: result.message, messageId: result.messageId });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('Send test email error:', error);
    res.status(500).json({ message: 'Failed to send test email', error: error.message });
  }
};

module.exports = {
  createTenant,
  getAllTenants,
  getTenantById,
  updateTenant,
  getCurrentTenantSettings,
  updateCurrentTenantSettings,
  uploadTenantLogo,
  testCloudinary,
  testSMTP,
  sendTestEmailEndpoint,
};

