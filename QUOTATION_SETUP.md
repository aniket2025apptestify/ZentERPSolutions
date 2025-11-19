# Quotation & Estimation Module - Setup Instructions

## ✅ Implementation Complete

The quotation/estimation engine has been fully implemented with all requested functionality.

## 📋 Next Steps

### 1. Install Required Dependencies

```bash
cd backend
npm install nodemailer
```

### 2. Run Database Migrations (SAFE - No Data Loss)

**🛡️ IMPORTANT**: This migration is 100% safe! All new fields are optional (nullable), so:
- ✅ No existing data will be lost
- ✅ All existing quotations will continue to work
- ✅ New fields will be NULL for existing records (expected)

**Quick Safe Migration (Recommended):**

```bash
cd backend

# Option 1: Using PowerShell script (Windows)
.\scripts\safe-migrate.ps1

# Option 2: Manual steps
npm run backup:db              # Create backup (optional but recommended)
npm run prisma:generate        # Generate Prisma Client
npx prisma migrate dev --name add_quotation_fields  # Apply migration
npm run verify:migration       # Verify data integrity
```

**What gets added:**
- **Quotation model**: `subtotal`, `vatPercent`, `vatAmount`, `notes`, `attachments`, `sentAt`, `sentBy`, `rejectedBy`, `rejectedAt` (all nullable)
- **QuotationLine model**: `remarks` (nullable)
- **Status**: `CONVERTED` is now a valid status value (String field, no migration needed)

**📖 For detailed migration guide, see:** `backend/SAFE_MIGRATION_STEPS.md`

### 3. Configure Email Service (Optional)

Add SMTP configuration to `backend/.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_NAME=Zent ERP
```

**Note**: Email sending will work gracefully even if SMTP is not configured - it will just log a warning.

### 4. Restart Backend Server

After installing dependencies and running migrations:

```bash
cd backend
npm run dev
```

## 🎯 Implemented Features

### Backend API Endpoints

1. **POST /api/quotations** - Create quotation (DRAFT)
2. **GET /api/quotations** - List quotations with filters
3. **GET /api/quotations/:id** - Get full quotation details
4. **PUT /api/quotations/:id** - Update quotation (DRAFT/SENT only)
5. **POST /api/quotations/:id/send** - Send quotation (mark as SENT, optional email)
6. **POST /api/quotations/:id/approve** - Approve quotation (DIRECTOR/PROJECT_MANAGER only)
7. **POST /api/quotations/:id/reject** - Reject quotation
8. **POST /api/quotations/:id/convert** - Convert to Project + SubGroups

### Frontend Pages

1. **/quotations** - Quotation list with filters
2. **/quotations/create** - Create new quotation
3. **/quotations/:id** - Quotation detail with all actions

### Key Features

✅ Auto-calculation of area, line totals, subtotal, VAT, and total amount  
✅ Quotation numbering (tenant-scoped, format: Q-{TENANT_CODE}-{YYYYMMDD}-{NNNN})  
✅ Status workflow: DRAFT → SENT → APPROVED/REJECTED → CONVERTED  
✅ Email sending with HTML template (when SMTP configured)  
✅ Role-based approval (DIRECTOR, PROJECT_MANAGER)  
✅ Conversion to Project with SubGroups  
✅ Audit trail for all actions  
✅ Attachment support via Document table  
✅ Real-time calculations in frontend  
✅ Validation rules enforced  

## 📝 Usage Examples

### Create Quotation from Inquiry

1. Navigate to an inquiry detail page
2. Click "Create Quotation" (if implemented in inquiry detail)
3. Or go to `/quotations/create?inquiryId=xxx`
4. Fill in line items with width/height or area/running meter
5. System auto-calculates totals
6. Save as DRAFT

### Send Quotation

1. Open quotation detail page
2. Click "Send Quotation"
3. Optionally send email to client
4. Status changes to SENT

### Approve Quotation

1. Director/PM opens quotation
2. Reviews details
3. Clicks "Approve"
4. Status changes to APPROVED

### Convert to Project

1. Open APPROVED quotation
2. Click "Convert to Project"
3. Enter project name, type, start date
4. Define sub-groups (optional)
5. System creates Project and SubGroups atomically
6. Quotation status changes to CONVERTED

## 🔒 Security & Validation

- All endpoints enforce `tenantId = req.tenantId` server-side
- Client validation ensures client belongs to tenant
- Role-based access control for approval
- Status transition validation
- Input validation for all fields
- Atomic transactions for conversion

## 📊 Database Schema Changes

The following fields were added:

**Quotation:**
- `subtotal` (Float)
- `vatPercent` (Float)
- `vatAmount` (Float)
- `notes` (String)
- `attachments` (Json - array of Document IDs)
- `sentAt` (DateTime)
- `sentBy` (String - userId)
- `rejectedBy` (String - userId)
- `rejectedAt` (DateTime)
- Status now includes `CONVERTED`

**QuotationLine:**
- `remarks` (String)

## 🧪 Testing Checklist

- [ ] Create quotation with multiple lines
- [ ] Verify auto-calculation of area and totals
- [ ] Test quotation numbering uniqueness
- [ ] Send quotation (with and without email)
- [ ] Approve quotation (test role restrictions)
- [ ] Reject quotation
- [ ] Convert to project
- [ ] Verify audit logs created
- [ ] Test tenant isolation
- [ ] Test validation rules

## 🐛 Known Limitations

1. PDF generation for email attachments is not yet implemented (marked as TODO)
2. Email service requires SMTP configuration to work
3. Sub-group line mapping in conversion is basic (stores line IDs in JSON)

## 📚 Related Files

**Backend:**
- `backend/src/controllers/quotationController.js`
- `backend/src/routes/quotationRoutes.js`
- `backend/src/services/sequenceService.js`
- `backend/src/services/emailService.js`
- `backend/prisma/schema.prisma`

**Frontend:**
- `frontend/src/pages/QuotationList.jsx`
- `frontend/src/pages/NewQuotation.jsx`
- `frontend/src/pages/QuotationDetail.jsx`
- `frontend/src/store/slices/quotationsSlice.js`
- `frontend/src/App.jsx` (routes added)

