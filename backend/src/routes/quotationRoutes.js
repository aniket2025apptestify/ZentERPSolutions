const express = require('express');
const router = express.Router();
const quotationController = require('../controllers/quotationController');
const { authenticate } = require('../middleware/auth');
const { permit } = require('../middleware/permissions');
const { Role } = require('@prisma/client');

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
router.get('/', quotationController.getQuotations);
router.get('/:id', quotationController.getQuotationById);
router.post('/', quotationController.createQuotation);
router.put('/:id', quotationController.updateQuotation);
router.post('/:id/send', quotationController.sendQuotation);
router.post(
  '/:id/approve',
  permit(Role.DIRECTOR, Role.PROJECT_MANAGER),
  quotationController.approveQuotation
);
router.post('/:id/reject', quotationController.rejectQuotation);
router.post('/:id/convert', quotationController.convertQuotation);

module.exports = router;

