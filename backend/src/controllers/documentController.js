const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const prisma = require('../config/prisma');
const { createAuditLog } = require('../services/auditLogService');

// Configure multer storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

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
        // Delete uploaded file if entity doesn't exist
        await fs.unlink(req.file.path).catch(() => {});
        return res.status(404).json({ message: 'Inquiry not found' });
      }
    }

    // Construct file URL (in production, this would be a CDN or storage service URL)
    const fileUrl = `/uploads/${req.file.filename}`;

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

    res.status(201).json(document);
  } catch (error) {
    console.error('Upload document error:', error);
    
    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    res.status(500).json({ message: 'Internal server error' });
  }
};

// Export multer middleware for use in routes
const uploadMiddleware = upload.single('file');

module.exports = {
  uploadDocument,
  uploadMiddleware,
};

