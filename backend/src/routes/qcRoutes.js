const express = require('express');
const router = express.Router();
const qcController = require('../controllers/qcController');
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

// QC routes
router.post('/production/:productionJobId', qcController.createProductionQC);
router.post('/delivery-note/:dnId', qcController.createDNQC);
router.get('/:id', qcController.getQCById);
router.get('/', qcController.getQCList);

module.exports = router;

