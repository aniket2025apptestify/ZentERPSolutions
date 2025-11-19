# Recreate Database After Reset

## ⚠️ Important: Stop Your Backend Server First!

The database is locked because your backend server is running. You **MUST** stop it first.

## Steps to Recreate Database

### Step 1: Stop Backend Server
```powershell
# In the terminal where your server is running, press:
Ctrl+C
```

### Step 2: Create and Apply Migration

```powershell
cd backend

# Create the initial migration (this will generate SQL for all tables)
npx prisma migrate dev --name init
```

This will:
- ✅ Create a migration file with all your tables
- ✅ Apply it to the database
- ✅ Generate Prisma Client
- ✅ Set up migration tracking

### Step 3: Verify

```powershell
# Check migration status
npx prisma migrate status

# Should show: "Database schema is up to date!"
```

### Step 4: Restart Server

```powershell
npm run dev
```

## What Happens

The migration will recreate ALL tables:
- ✅ Tenant, User
- ✅ Client, Inquiry
- ✅ Quotation, QuotationLine
- ✅ Project, SubGroup
- ✅ ProductionJob, ProductionStageLog
- ✅ InventoryItem, StockTransaction
- ✅ PurchaseOrder, POLine, GRN
- ✅ DeliveryNote, DNLine
- ✅ Invoice, InvoiceLine
- ✅ Employee, Attendance, PayrollRecord
- ✅ SubcontractWorkOrder
- ✅ Document, AuditLog

## If You Have Existing Data to Restore

If you had a backup, restore it after running the migration:

```powershell
# Restore from backup
psql -h localhost -U your_user -d zent_erp_local < backup_file.sql
```

## Summary

1. **Stop server** (Ctrl+C)
2. **Run**: `npx prisma migrate dev --name init`
3. **Verify**: `npx prisma migrate status`
4. **Start server**: `npm run dev`

That's it! Your database will be recreated with all tables.

