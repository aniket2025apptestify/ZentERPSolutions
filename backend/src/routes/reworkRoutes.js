const express = require('express');
const router = express.Router();
const reworkController = require('../controllers/reworkController');
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

// Rework routes
router.post('/', reworkController.createRework);
router.put('/:id', reworkController.updateRework);
router.get('/:id', reworkController.getReworkById);
router.get('/', reworkController.getReworkList);

module.exports = router;

