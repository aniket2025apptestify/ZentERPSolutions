const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');
const { Role } = require('@prisma/client');

// Public routes
router.post('/login', authController.login);
router.get('/me', authenticate, authController.getMe);
router.post('/logout', authenticate, authController.logout);

// Protected routes (SuperAdmin only)
router.post(
  '/register',
  authenticate,
  authorize(Role.SUPERADMIN),
  authController.register
);

module.exports = router;

