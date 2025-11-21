const express = require('express');
const router = express.Router();
const creditNoteController = require('../controllers/creditNoteController');
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

router.post('/', creditNoteController.createCreditNote);
router.get('/', creditNoteController.getCreditNotes);
router.get('/:id', creditNoteController.getCreditNoteById);
router.post('/:id/apply', creditNoteController.applyCreditNote);

module.exports = router;

