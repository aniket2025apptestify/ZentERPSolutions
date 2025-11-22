const express = require('express');
const router = express.Router();
const multer = require('multer');
const employeeController = require('../controllers/hr.employee.controller');
const attendanceController = require('../controllers/hr.attendance.controller');
const leaveController = require('../controllers/hr.leave.controller');
const payrollController = require('../controllers/hr.payroll.controller');
const alertsController = require('../controllers/hr.alerts.controller');
const { authenticate } = require('../middleware/auth');
const { permit } = require('../middleware/permissions');
const { Role } = require('@prisma/client');

// Configure multer for file uploads (in-memory storage for CSV)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

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

// ==================== EMPLOYEE ROUTES ====================
router.get('/employees', employeeController.getEmployees);
router.get('/employees/:id', employeeController.getEmployeeById);
router.post('/employees', permit(Role.HR, Role.DIRECTOR, Role.FINANCE), employeeController.createEmployee);
router.put('/employees/:id', permit(Role.HR, Role.DIRECTOR, Role.FINANCE), employeeController.updateEmployee);

// ==================== ATTENDANCE ROUTES ====================
router.get('/attendance', attendanceController.getAttendance);
router.post('/attendance', attendanceController.createAttendance);
router.post('/attendance/bulk', upload.single('file'), attendanceController.bulkUploadAttendance);

// ==================== LEAVE ROUTES ====================
router.get('/leave', leaveController.getLeaves);
router.get('/leave/:id', leaveController.getLeaveById);
router.post('/leave', leaveController.applyLeave);
router.put('/leave/:id/approve', permit(Role.HR, Role.DIRECTOR), leaveController.decideLeave);
router.put('/leave/:id/reject', permit(Role.HR, Role.DIRECTOR), leaveController.decideLeave);

// ==================== PAYROLL ROUTES ====================
router.get('/payroll', permit(Role.HR, Role.FINANCE, Role.DIRECTOR), payrollController.getPayroll);
router.get('/payroll/:id', permit(Role.HR, Role.FINANCE, Role.DIRECTOR), payrollController.getPayrollById);
router.post('/payroll/generate', permit(Role.HR, Role.FINANCE, Role.DIRECTOR), payrollController.generatePayroll);
router.post('/payroll/:id/pay', permit(Role.FINANCE, Role.DIRECTOR), payrollController.payPayroll);
router.get('/payroll/:id/payslip', permit(Role.HR, Role.FINANCE, Role.DIRECTOR), payrollController.getPayslipPdf);

// ==================== ALERTS ROUTES ====================
router.get('/alerts/expiring-docs', alertsController.getExpiringDocs);

module.exports = router;

