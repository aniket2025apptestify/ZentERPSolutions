const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { permit } = require('../middleware/permissions');
const { Role } = require('@prisma/client');

// All routes require authentication
router.use(authenticate);

// Resolve tenant after authentication (so req.user is available)
// This MUST run after authenticate to access req.user.tenantId
router.use((req, res, next) => {
  // Ensure req.user exists (should be set by authenticate middleware)
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  // Set tenantId from authenticated user
  req.tenantId = req.user.tenantId || null;
  next();
});

// All routes require DIRECTOR or IT_ADMIN role
router.use(permit(Role.DIRECTOR, Role.IT_ADMIN));

// Routes
router.get('/', userController.getUsers);
router.get('/:id', userController.getUserById);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);
router.post('/:id/reset-password', userController.resetPassword);

module.exports = router;

