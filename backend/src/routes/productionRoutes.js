const express = require('express');
const router = express.Router();
const productionController = require('../controllers/productionController');
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

// Production job routes
router.post('/jobs', productionController.createJob);
router.get('/jobs', productionController.getJobs);
router.get('/jobs/:id', productionController.getJobById);
router.put('/jobs/:id/status', productionController.updateJobStatus);
router.post('/jobs/:id/log', productionController.logJobHours);
router.post('/jobs/:id/qc', productionController.createQCRecord);
router.post('/jobs/:id/assign', productionController.assignJob);
router.post('/jobs/:id/attach-photos', productionController.attachPhotos);

module.exports = router;

