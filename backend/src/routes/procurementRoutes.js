const express = require('express');
const router = express.Router();
const procurementController = require('../controllers/procurementController');
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

// ==================== MATERIAL REQUEST ROUTES ====================
router.post('/material-requests', procurementController.createMaterialRequest);
router.get('/material-requests', procurementController.getMaterialRequests);
router.get(
  '/material-requests/:id',
  procurementController.getMaterialRequestById
);
router.post(
  '/material-requests/:mrId/send-to-vendor',
  procurementController.sendMRToVendor
);
router.get(
  '/material-requests/:mrId/vendor-quotes',
  procurementController.getVendorQuotesForMR
);

// ==================== VENDOR ROUTES ====================
router.post('/vendors', procurementController.createVendor);
router.get('/vendors', procurementController.getVendors);
router.get('/vendors/:id', procurementController.getVendorById);

// ==================== VENDOR QUOTE ROUTES ====================
router.post('/vendor-quotes', procurementController.createVendorQuote);

// ==================== PURCHASE ORDER ROUTES ====================
router.post('/purchase-orders', procurementController.createPurchaseOrder);
router.get('/purchase-orders', procurementController.getPurchaseOrders);
router.get(
  '/purchase-orders/:id',
  procurementController.getPurchaseOrderById
);
router.put(
  '/purchase-orders/:id/approve',
  procurementController.approvePurchaseOrder
);
router.post(
  '/purchase-orders/:id/send',
  procurementController.sendPurchaseOrder
);

// ==================== GRN ROUTES ====================
router.post('/grn', procurementController.createGRN);
router.get('/grn', procurementController.getGRNs);
router.get('/grn/:id', procurementController.getGRNById);

module.exports = router;

