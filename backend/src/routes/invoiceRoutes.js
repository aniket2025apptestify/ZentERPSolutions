const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Resolve tenant after authentication
router.use((req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  req.tenantId = req.user.tenantId;
  next();
});

// Invoice routes
router.post('/', invoiceController.createInvoice);
router.post('/from-dns', invoiceController.createInvoiceFromDNs);
router.get('/', invoiceController.getInvoices);
router.get('/:id', invoiceController.getInvoiceById);
router.put('/:id', invoiceController.updateInvoice);
router.post('/:id/send', invoiceController.sendInvoice);
router.post('/:id/cancel', invoiceController.cancelInvoice);
router.get('/:id/aging', invoiceController.getInvoiceAging);
router.get('/:id/pdf', invoiceController.generateInvoicePDFEndpoint);

// Payment routes (nested under invoices)
router.post('/:id/pay', paymentController.recordPayment);
router.get('/:id/payments', paymentController.getPayments);

module.exports = router;

