const express = require('express');
const router = express.Router();
const multer = require('multer');
const tenantController = require('../controllers/tenantController');
const { authenticate } = require('../middleware/auth');
const { permit } = require('../middleware/permissions');
const { Role } = require('@prisma/client');

// Configure multer to use memory storage (for Cloudinary upload)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Only allow image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter,
});

// All routes require authentication
router.use(authenticate);

// Resolve tenant after authentication
router.use((req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  req.tenantId = req.user.tenantId || null;
  next();
});

// Only DIRECTOR and IT_ADMIN can manage tenant settings
router.use(permit(Role.DIRECTOR, Role.IT_ADMIN));

// Routes
router.get('/settings', tenantController.getCurrentTenantSettings);
router.put('/settings', tenantController.updateCurrentTenantSettings);
router.post('/settings/logo', upload.single('logo'), tenantController.uploadTenantLogo);
router.post('/settings/test-cloudinary', tenantController.testCloudinary);
router.post('/settings/test-smtp', tenantController.testSMTP);
router.post('/settings/test-email', tenantController.sendTestEmailEndpoint);

module.exports = router;

