const express = require('express');
const router = express.Router();
const subcontractController = require('../controllers/subcontractController');
const subcontractInvoiceController = require('../controllers/subcontractInvoiceController');
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

// ==================== SWO ROUTES ====================
router.post('/swo', subcontractController.createSWO);
router.get('/swo', subcontractController.getSWOs);
router.get('/swo/:id', subcontractController.getSWOById);
router.put('/swo/:id/issue-material', subcontractController.issueMaterialToSWO);
router.put('/swo/:id/start', subcontractController.startSWO);
router.post('/swo/:id/receive', subcontractController.receiveSWO);
router.put('/swo/:id/close', subcontractController.closeSWO);

// ==================== VENDOR SWO ROUTES ====================
router.get('/vendors/:vendorId/swo', subcontractController.getSWOsByVendor);

// ==================== SUBCONTRACT INVOICE ROUTES ====================
router.post('/swo/:id/invoice', subcontractInvoiceController.createSubcontractInvoice);
router.get('/invoices', subcontractInvoiceController.getSubcontractInvoices);
router.put('/invoices/:id/approve', subcontractInvoiceController.approveSubcontractInvoice);
router.put('/invoices/:id/pay', subcontractInvoiceController.recordPaymentForSubcontractInvoice);

module.exports = router;
