# HR Module Implementation Summary

## Overview
Complete HR module implementation including Employee master, Attendance capture, Leave management, Payroll generation, and Document expiry alerts.

## Backend Implementation

### Database Schema Updates
- **Employee Model**: Enhanced with all required fields (employeeCode, email, phone, department, dateOfJoining, salaryType, bankDetails, address, isActive)
- **Attendance Model**: Added tenantId, checkIn, checkOut, remarks, createdAt, updatedAt
- **PayrollRecord Model**: Enhanced with daysPresent, overtimeHours, overtimePay, grossPay, paid, paidAt, paymentRef, tenantId
- **LeaveRequest Model**: New model for leave management

### Controllers Created
1. **hr.employee.controller.js**: Employee CRUD operations
2. **hr.attendance.controller.js**: Single attendance entry, bulk CSV upload, attendance reports
3. **hr.leave.controller.js**: Leave application, approval/rejection
4. **hr.payroll.controller.js**: Payroll generation, payslip generation, payment processing
5. **hr.alerts.controller.js**: Document expiry alerts

### Services Created
1. **payroll.service.js**: 
   - Payroll calculation for MONTHLY, HOURLY, DAILY salary types
   - Overtime calculation with configurable multiplier
   - Labour cost allocation to projects based on attendance jobLink
   
2. **hr.alerts.js**: 
   - Expiring document detection (visa/passport)
   - Notification generation

3. **financeService.js** (updated):
   - `postPayrollJournal`: Debit Payroll Expense, Credit Payroll Payable
   - `postPayrollPaymentJournal`: Debit Payroll Payable, Credit Bank/Cash

### Routes
- `/api/hr/employees` - Employee CRUD
- `/api/hr/attendance` - Attendance management
- `/api/hr/attendance/bulk` - Bulk CSV upload
- `/api/hr/leave` - Leave management
- `/api/hr/payroll` - Payroll operations
- `/api/hr/alerts/expiring-docs` - Document expiry alerts

### Key Features Implemented

#### Attendance
- Single entry with automatic hours calculation
- Bulk CSV upload with error reporting
- JobLink mapping to production jobs for cost allocation
- Status tracking (PRESENT, ABSENT, LEAVE, HALF_DAY)

#### Payroll
- Supports MONTHLY, HOURLY, DAILY salary types
- Automatic calculation based on attendance
- Overtime calculation with tenant-configurable multiplier
- Prorated salary for partial month attendance
- Journal entry posting for finance integration
- Labour cost allocation to projects

#### Leave Management
- Leave application by employees
- Approval/rejection by HR/Director
- Automatic attendance record creation for approved leaves

#### Document Expiry Alerts
- Visa and passport expiry tracking
- Configurable alert days
- Notification generation

## Frontend Implementation

### Redux Slices
1. **employeesSlice.js**: Employee state management
2. **attendanceSlice.js**: Attendance state management with bulk upload support
3. **leaveSlice.js**: Leave request state management
4. **payrollSlice.js**: Payroll state management

### Pages to Create
1. `/hr/employees` - Employee Directory
2. `/hr/attendance` - Attendance Dashboard
3. `/hr/attendance/report` - Attendance Report/Timesheet
4. `/hr/leaves` - Leave Management
5. `/hr/payroll` - Payroll Generation
6. `/hr/payslip/:id` - Payslip Viewer
7. `/hr/alerts` - Expiring Documents

### Components to Create
1. **EmployeeForm**: Add/Edit employee form
2. **AttendanceRowEditor**: Single attendance entry form
3. **BulkUploadWidget**: CSV upload with preview
4. **PayrollPreviewTable**: Payroll generation preview
5. **PayslipTemplate**: Payslip PDF template

## Database Migration Required

Run the following to apply schema changes:
```bash
cd backend
npx prisma migrate dev --name add_hr_module_fields
```

Or if using `prisma db push`:
```bash
npx prisma db push
```

## Dependencies Added

### Backend
- `csv-parser`: For parsing CSV files in bulk attendance upload

Install with:
```bash
cd backend
npm install csv-parser
```

## Configuration

### Tenant Settings
Configure in `Tenant.settings` JSON:
```json
{
  "overtimeMultiplier": 1.5,
  "workingDaysPerMonth": 26,
  "payrollCutoffDay": 25,
  "notifyExpiryDays": 30
}
```

## API Endpoints Summary

### Employees
- `GET /api/hr/employees` - List employees
- `GET /api/hr/employees/:id` - Get employee details
- `POST /api/hr/employees` - Create employee
- `PUT /api/hr/employees/:id` - Update employee

### Attendance
- `GET /api/hr/attendance` - Get attendance report
- `POST /api/hr/attendance` - Create single attendance
- `POST /api/hr/attendance/bulk` - Bulk upload (CSV/JSON)

### Leave
- `GET /api/hr/leave` - List leave requests
- `GET /api/hr/leave/:id` - Get leave details
- `POST /api/hr/leave` - Apply for leave
- `PUT /api/hr/leave/:id/approve` - Approve leave
- `PUT /api/hr/leave/:id/reject` - Reject leave

### Payroll
- `GET /api/hr/payroll` - List payroll records
- `GET /api/hr/payroll/:id` - Get payslip
- `POST /api/hr/payroll/generate` - Generate payroll
- `POST /api/hr/payroll/:id/pay` - Mark as paid
- `GET /api/hr/payroll/:id/payslip` - Get payslip PDF

### Alerts
- `GET /api/hr/alerts/expiring-docs?days=30` - Get expiring documents

## Role-Based Access

- **HR**: Full access to all HR endpoints
- **FINANCE**: Payroll viewing and payment
- **DIRECTOR**: Full access
- **Others**: Read-only access to own data

## Testing Checklist

- [ ] Employee CRUD operations
- [ ] Attendance single entry with hours calculation
- [ ] Bulk attendance CSV upload
- [ ] Leave application and approval
- [ ] Payroll generation for MONTHLY employees
- [ ] Payroll generation for HOURLY employees
- [ ] Payroll payment and journal entries
- [ ] Document expiry alerts
- [ ] Labour cost allocation to projects
- [ ] Audit log creation for all actions

## Next Steps

1. Run database migration
2. Install csv-parser dependency
3. Create frontend pages (see examples in pages/hr/)
4. Add navigation links to HR module
5. Test all endpoints
6. Configure tenant settings for overtime rules

## Notes

- Payroll journal entries are logged via audit logs until full GL module is implemented
- Payslip PDF generation returns JSON data - frontend should generate PDF using a library like react-pdf or jsPDF
- Bulk upload supports both CSV file and JSON array formats
- Labour costs are automatically allocated to projects when payroll is generated

