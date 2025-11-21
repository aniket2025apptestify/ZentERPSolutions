const express = require('express');
const router = express.Router();
const dispatchController = require('../controllers/dispatchController');
const vehicleController = require('../controllers/vehicleController');
const driverController = require('../controllers/driverController');
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

// Delivery Note routes
router.get('/dn', dispatchController.getDeliveryNotes);
router.get('/dn/:id', dispatchController.getDeliveryNoteById);
router.post('/dn', dispatchController.createDeliveryNote);
router.put('/dn/:id/load', dispatchController.updateLoading);
router.put('/dn/:id/assign-vehicle', dispatchController.assignVehicle);
router.put('/dn/:id/dispatch', dispatchController.dispatchDeliveryNote);
router.post('/dn/:id/tracking', dispatchController.addTracking);
router.put('/dn/:id/deliver', dispatchController.deliverDeliveryNote);

// Vehicle routes
router.get('/vehicles', vehicleController.getVehicles);
router.get('/vehicles/:id', vehicleController.getVehicleById);
router.post('/vehicles', vehicleController.createVehicle);
router.put('/vehicles/:id', vehicleController.updateVehicle);
router.delete('/vehicles/:id', vehicleController.deleteVehicle);

// Driver routes
router.get('/drivers', driverController.getDrivers);
router.get('/drivers/:id', driverController.getDriverById);
router.post('/drivers', driverController.createDriver);
router.put('/drivers/:id', driverController.updateDriver);
router.delete('/drivers/:id', driverController.deleteDriver);

module.exports = router;

