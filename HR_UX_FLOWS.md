# HR Module UX Flows - Complete Implementation

## Overview
Complete frontend implementation of HR module following the specified UX flows with intuitive user experience.

## UX Flow: Employee → Attendance → Payroll

### Flow 1: HR Adds Employee
**Page:** `/hr/employees` (Employee Directory)

**Steps:**
1. HR navigates to Employee Directory from sidebar
2. Clicks "Add Employee" button
3. Modal opens with comprehensive form:
   - Basic Information (name, code, email, phone, designation, department)
   - Salary Information (type: Monthly/Hourly/Daily, amount)
   - Bank Details (account, IFSC, bank name)
   - Document Expiry (visa, passport dates)
   - Address
4. Form validates required fields (name is mandatory)
5. On submit, employee is created and appears in the list
6. Employee can be edited or viewed from the table

**Features:**
- Real-time validation
- Employee code uniqueness check
- Active/Inactive status toggle
- Search and filter by department, designation, status

---

### Flow 2: Attendance Added Daily OR Bulk Uploaded
**Page:** `/hr/attendance` (Attendance Dashboard)

#### Option A: Daily Entry
1. HR/Production staff navigates to Attendance Dashboard
2. Selects date using date picker
3. Clicks "Add Attendance" button
4. Modal opens with form:
   - Select employee (dropdown)
   - Date (pre-filled with selected date)
   - Status (Present/Absent/Leave/Half Day)
   - Check In/Check Out times (for Present status)
   - Project link (optional - for cost allocation)
   - Remarks
5. Hours automatically calculated from check-in/check-out
6. On save, attendance record created
7. Summary cards show totals (days, hours, present, absent)

#### Option B: Bulk Upload
1. Click "Bulk Upload" button
2. Select CSV file
3. System validates and processes:
   - Matches employees by code or email
   - Validates dates and times
   - Checks for duplicates
   - Calculates hours automatically
4. Shows results:
   - Success count
   - Error list with row numbers
5. Errors can be fixed and re-uploaded

**CSV Format:**
```
employeeCode,date,status,checkIn,checkOut,remarks
EMP-001,2025-12-01,PRESENT,2025-12-01T08:30:00Z,2025-12-01T17:30:00Z,Normal shift
```

**Features:**
- Date-based filtering
- Real-time summary statistics
- Project linking for cost allocation
- Automatic hours calculation
- Bulk upload with error reporting

---

### Flow 3: Employee Applies Leave (HR Approves)
**Page:** `/hr/leaves` (Leave Management)

#### Employee Flow:
1. Employee navigates to Leave Management
2. Clicks "Apply for Leave" button
3. Modal opens with form:
   - Select employee
   - From Date and To Date
   - Leave Type (Sick/Casual/Earned/Unpaid)
   - Reason (optional)
4. System calculates number of days
5. On submit, leave request created with status "PENDING"

#### HR Approval Flow:
1. HR navigates to Leave Management
2. Views all leave requests in table
3. Filters by status (Pending/Approved/Rejected) or leave type
4. For pending requests, sees:
   - Employee name
   - Date range and days
   - Leave type and reason
   - Action buttons (Approve/Reject)
5. Clicks "Approve" or "Reject"
6. System confirms action
7. If approved:
   - Leave status changes to "APPROVED"
   - Attendance records automatically created for leave period with status "LEAVE"
8. Table updates to show new status

**Features:**
- Role-based UI (employees see apply button, HR sees approve/reject)
- Automatic attendance record creation on approval
- Days calculation
- Status filtering
- Color-coded status badges

---

### Flow 4: HR Selects Month → Generates Payroll
**Page:** `/hr/payroll` (Payroll Generation)

**Steps:**
1. HR/Finance navigates to Payroll page
2. Views existing payroll records (filtered by month/year)
3. Clicks "Generate Payroll" button
4. Modal opens with form:
   - Select Month (dropdown)
   - Select Year (number input)
   - Select Employees (multi-select, optional - leave empty for all)
5. System processes:
   - Fetches all active employees (or selected ones)
   - For each employee:
     - Gets attendance records for the month
     - Calculates days present and hours
     - Calculates basic salary (based on salary type):
       - **MONTHLY**: Prorated by days present / working days
       - **HOURLY**: hours worked × hourly rate
       - **DAILY**: days present × daily rate
     - Calculates overtime (hours > standard × multiplier)
     - Applies allowances and deductions
     - Calculates gross pay and net pay
   - Creates PayrollRecord for each employee
   - Posts journal entries (Debit Payroll Expense, Credit Payroll Payable)
   - Allocates labour costs to projects based on attendance jobLink
6. Shows results:
   - Number of records generated
   - List of employees with net pay
   - Any errors (if employee-specific issues)
7. Payroll records appear in table

**Features:**
- Month/Year filtering
- Payment status filtering (Paid/Unpaid)
- Preview before generation
- Automatic calculation based on salary type
- Error handling per employee
- Labour cost allocation to projects

---

### Flow 5: Payslips Created Automatically
**Page:** `/hr/payslip/:id` (Payslip Viewer)

**Steps:**
1. After payroll generation, payslips are automatically available
2. From Payroll table, click "View Payslip" on any record
3. Payslip page displays:
   - Employee information
   - Pay period (month/year)
   - Earnings breakdown:
     - Basic Salary
     - Overtime Pay (if any)
     - Allowances (if any)
     - Gross Pay
   - Deductions breakdown:
     - Total Deductions
   - Net Pay (highlighted)
   - Payment status and reference (if paid)
4. Actions available:
   - Print payslip
   - Download PDF (coming soon)

**Features:**
- Print-friendly layout
- Professional formatting
- Complete breakdown
- Payment status display
- PDF download (to be implemented)

---

### Flow 6: Finance Approves Payment
**Page:** `/hr/payroll` (Payroll Generation)

**Steps:**
1. Finance navigates to Payroll page
2. Filters to show "Unpaid" payroll records
3. Reviews payroll records:
   - Employee name
   - Month/Year
   - Net Pay amount
   - Days present
   - Breakdown (basic, overtime, gross, net)
4. Clicks "Mark Paid" on a payroll record
5. Modal opens:
   - Shows employee name and amount
   - Payment Date (defaults to today)
   - Payment Reference (bank transaction ID, cheque number, etc.)
6. On submit:
   - Payroll record marked as paid
   - Paid date and reference saved
   - Journal entry posted (Debit Payroll Payable, Credit Bank/Cash)
   - Status changes to "Paid" (green badge)
7. Table updates to show paid status

**Features:**
- Payment status filtering
- Payment reference tracking
- Journal entry integration
- Audit trail

---

## Additional Features

### Expiring Documents Alerts
**Page:** `/hr/alerts` (Expiring Documents)

**Flow:**
1. HR navigates to Expiring Documents
2. Selects alert days (7/15/30/60/90)
3. System shows employees with:
   - Visa expiring within selected days
   - Passport expiring within selected days
4. Table displays:
   - Employee name and code
   - Document type
   - Expiry date
   - Days until expiry (color-coded)
   - Status (Expired/Expiring Soon)
5. HR can send email notifications (to be implemented)

**Features:**
- Configurable alert days
- Color-coded urgency (red for expired/urgent, yellow for soon)
- Email notification (to be implemented)

---

## Page Components Summary

### 1. Employee Directory (`/hr/employees`)
- **Components:** EmployeeForm (modal)
- **Features:** CRUD operations, search, filters, status management
- **Access:** DIRECTOR, HR, FINANCE

### 2. Attendance Dashboard (`/hr/attendance`)
- **Components:** Daily entry form, Bulk upload modal
- **Features:** Date selection, summary cards, project linking, CSV upload
- **Access:** DIRECTOR, HR, PRODUCTION

### 3. Leave Management (`/hr/leaves`)
- **Components:** Apply leave form, Approval actions
- **Features:** Leave application, approval workflow, automatic attendance creation
- **Access:** DIRECTOR, HR (approval), All (application)

### 4. Payroll Generation (`/hr/payroll`)
- **Components:** Generate modal, Pay modal, Payroll table
- **Features:** Month selection, automatic calculation, payment tracking
- **Access:** DIRECTOR, HR, FINANCE

### 5. Payslip Viewer (`/hr/payslip/:id`)
- **Components:** Payslip template
- **Features:** Print-friendly, PDF download (coming soon)
- **Access:** DIRECTOR, HR, FINANCE

### 6. Expiring Documents (`/hr/alerts`)
- **Components:** Alert table, Email action
- **Features:** Configurable alerts, urgency indicators
- **Access:** DIRECTOR, HR

---

## UX Best Practices Implemented

1. **Progressive Disclosure:** Forms show relevant fields based on selections (e.g., check-in/out only for Present status)

2. **Immediate Feedback:** 
   - Success/error messages
   - Loading states
   - Real-time calculations

3. **Error Handling:**
   - Validation messages
   - Bulk upload error reporting
   - Graceful error displays

4. **Data Visualization:**
   - Summary cards for quick insights
   - Color-coded status badges
   - Urgency indicators for expiring documents

5. **Workflow Optimization:**
   - Pre-filled dates
   - Automatic calculations
   - One-click actions where possible

6. **Role-Based UI:**
   - Different actions based on user role
   - Appropriate access controls

---

## Integration Points

1. **Employee → Attendance:** Employee selection dropdown in attendance form
2. **Attendance → Payroll:** Attendance data used for payroll calculation
3. **Leave → Attendance:** Approved leaves automatically create attendance records
4. **Payroll → Finance:** Journal entries posted for accounting
5. **Attendance → Projects:** JobLink maps labour costs to projects

---

## Future Enhancements

1. **PDF Generation:** Implement payslip PDF download using react-pdf or jsPDF
2. **Email Notifications:** Send expiry alerts and payslip emails
3. **Biometric Integration:** API endpoint for timeclock device imports
4. **Advanced Reports:** Attendance analytics, payroll summaries
5. **Mobile App:** React Native app for attendance marking

---

## Testing Checklist

- [x] Employee CRUD operations
- [x] Attendance daily entry with hours calculation
- [x] Bulk attendance upload with error handling
- [x] Leave application and approval workflow
- [x] Payroll generation for all salary types
- [x] Payslip display and print
- [x] Payment marking and journal entries
- [x] Expiring documents alerts
- [x] Role-based access control
- [x] Form validations
- [x] Error handling

---

## File Structure

```
frontend/src/
├── components/hr/
│   └── EmployeeForm.jsx
├── pages/hr/
│   ├── EmployeeDirectory.jsx
│   ├── AttendanceDashboard.jsx
│   ├── LeaveManagement.jsx
│   ├── PayrollGeneration.jsx
│   ├── PayslipViewer.jsx
│   └── ExpiringDocuments.jsx
└── store/slices/
    ├── employeesSlice.js
    ├── attendanceSlice.js
    ├── leaveSlice.js
    └── payrollSlice.js
```

All pages are fully functional and ready for use!

