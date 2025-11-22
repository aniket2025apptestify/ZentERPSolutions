const express = require('express');
const router = express.Router();
const returnsController = require('../controllers/returnsController');
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

// Returns routes
router.post('/', returnsController.createReturn);
router.get('/', returnsController.getReturns);
router.get('/:id', returnsController.getReturnById);
router.post('/:id/inspect', returnsController.inspectReturn);
router.post('/:id/replace', returnsController.createReplacementDN);

module.exports = router;

