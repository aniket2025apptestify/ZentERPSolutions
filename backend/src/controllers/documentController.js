const multer = require('multer');
const prisma = require('../config/prisma');
const { createAuditLog } = require('../services/auditLogService');
const {
  initializeCloudinary,
  uploadBufferToCloudinary,
  deleteFromCloudinary,
} = require('../services/cloudinaryService');

// Configure multer to use memory storage (for Cloudinary upload)
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  // Allow all file types for now, can be restricted later
  cb(null, true);
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: fileFilter,
});

/**
 * Upload document
 * POST /api/documents/upload
 * Multipart form: file, entityType, entityId
 */
const uploadDocument = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { entityType, entityId } = req.body;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'File is required' });
    }

    if (!entityType || !entityId) {
      return res.status(400).json({
        message: 'Entity type and entity ID are required',
      });
    }

    // Verify entity exists (optional validation)
    // For inquiries, verify it exists and belongs to tenant
    if (entityType === 'INQUIRY') {
      const inquiry = await prisma.inquiry.findFirst({
        where: {
          id: entityId,
          tenantId: tenantId,
        },
      });

      if (!inquiry) {
        return res.status(404).json({ message: 'Inquiry not found' });
      }
    }

    // Get tenant settings for Cloudinary configuration
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });

    const settings = tenant?.settings || {};
    const cloudinaryConfig = settings.cloudinary || {};
    
    if (!cloudinaryConfig.enabled || !cloudinaryConfig.cloudName || !cloudinaryConfig.apiKey || !cloudinaryConfig.apiSecret) {
      return res.status(400).json({ 
        message: 'Cloudinary is not configured. Please configure Cloudinary in tenant settings.' 
      });
    }

    // Initialize Cloudinary with tenant-specific credentials
    initializeCloudinary(
      cloudinaryConfig.cloudName,
      cloudinaryConfig.apiKey,
      cloudinaryConfig.apiSecret
    );

    // Upload to Cloudinary from buffer
    let fileUrl;
    let cloudinaryPublicId;
    try {
      const uploadResult = await uploadBufferToCloudinary(
        req.file.buffer,
        req.file.originalname,
        {
          folder: `zent-erp/${tenantId}/documents/${entityType.toLowerCase()}`,
          resource_type: 'auto',
        }
      );

      fileUrl = uploadResult.url;
      cloudinaryPublicId = uploadResult.publicId;
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      return res.status(500).json({ 
        message: 'Failed to upload file to Cloudinary',
        error: error.message 
      });
    }

    // Create document record
    const document = await prisma.document.create({
      data: {
        tenantId: tenantId,
        entityType: entityType,
        entityId: entityId,
        fileName: req.file.originalname,
        fileUrl: fileUrl,
        uploadedBy: req.user.userId,
      },
    });

    // If entity is Inquiry, update attachments array
    if (entityType === 'INQUIRY') {
      const inquiry = await prisma.inquiry.findFirst({
        where: {
          id: entityId,
          tenantId: tenantId,
        },
      });

      if (inquiry) {
        const attachments = inquiry.attachments || [];
        attachments.push(document.id);

        await prisma.inquiry.update({
          where: { id: entityId },
          data: { attachments: attachments },
        });
      }
    }

    // Create audit log
    await createAuditLog({
      tenantId: tenantId,
      userId: req.user.userId,
      action: 'UPLOAD_DOCUMENT',
      entityType: entityType,
      entityId: entityId,
      newData: {
        documentId: document.id,
        fileName: document.fileName,
      },
    });

    res.status(201).json({
      ...document,
      cloudinaryPublicId, // Include public ID for future deletion if needed
    });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
};

// Export multer middleware for use in routes
const uploadMiddleware = upload.single('file');

module.exports = {
  uploadDocument,
  uploadMiddleware,
};

