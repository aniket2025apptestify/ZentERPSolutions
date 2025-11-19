const express = require('express');
const router = express.Router();
const inquiryController = require('../controllers/inquiryController');
const { authenticate } = require('../middleware/auth');

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

// Routes
router.get('/', inquiryController.getInquiries);
router.get('/:id', inquiryController.getInquiryById);
router.post('/', inquiryController.createInquiry);
router.put('/:id', inquiryController.updateInquiry);
router.delete('/:id', inquiryController.deleteInquiry);
router.post('/:id/followups', inquiryController.addFollowUp);

module.exports = router;

