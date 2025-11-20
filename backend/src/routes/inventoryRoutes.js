const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
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

// ==================== INVENTORY ITEM ROUTES ====================
router.post('/items', inventoryController.createItem);
router.get('/items', inventoryController.getItems);
router.get('/items/:id', inventoryController.getItemById);
router.put('/items/:id', inventoryController.updateItem);
router.delete('/items/:id', inventoryController.deleteItem);

// ==================== STOCK TRANSACTION ROUTES ====================
router.post('/stock-transaction', inventoryController.createStockTransaction);
router.get('/stock-transactions', inventoryController.getStockTransactions);

// ==================== MATERIAL ISSUE ROUTES ====================
router.post('/issue', inventoryController.issueMaterial);

// ==================== STOCK RESERVATION ROUTES ====================
router.post('/reserve', inventoryController.reserveStock);
router.post('/unreserve', inventoryController.unreserveStock);

// ==================== REPORTS ROUTES ====================
router.get('/wastage-report', inventoryController.getWastageReport);
router.get('/check-low-stock', inventoryController.checkLowStock);

module.exports = router;

