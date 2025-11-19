const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');
const { authenticate, authorize } = require('../middleware/auth');
const { Role } = require('@prisma/client');

// All tenant routes require SuperAdmin role
router.use(authenticate);
router.use(authorize(Role.SUPERADMIN));

// Routes
router.post('/', tenantController.createTenant);
router.get('/', tenantController.getAllTenants);
router.get('/:id', tenantController.getTenantById);
router.put('/:id', tenantController.updateTenant);

module.exports = router;

