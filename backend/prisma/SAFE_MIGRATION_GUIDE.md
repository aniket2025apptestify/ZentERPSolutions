# Safe Migration Guide - No Data Loss

## ✅ Migration Safety Analysis

**Good News**: All new fields being added are **optional (nullable)**, which means:
- ✅ Existing data will NOT be affected
- ✅ No data will be lost
- ✅ Existing quotations will continue to work
- ✅ New fields will be NULL for existing records (which is expected)

## Fields Being Added

### Quotation Table (All Optional)
- `subtotal` (Float?) - NULL for existing records
- `vatPercent` (Float?) - NULL for existing records  
- `vatAmount` (Float?) - NULL for existing records
- `notes` (String?) - NULL for existing records
- `attachments` (Json?) - NULL for existing records
- `sentAt` (DateTime?) - NULL for existing records
- `sentBy` (String?) - NULL for existing records
- `rejectedBy` (String?) - NULL for existing records
- `rejectedAt` (DateTime?) - NULL for existing records

### QuotationLine Table (All Optional)
- `remarks` (String?) - NULL for existing records

## 🛡️ Safe Migration Steps

### Step 1: Backup Database (Recommended)

**Option A: Using pg_dump (PostgreSQL)**
```bash
# Create backup
pg_dump -h localhost -U your_user -d your_database > backup_before_migration.sql

# Or if using Docker
docker exec -t your_postgres_container pg_dump -U postgres your_database > backup_before_migration.sql
```

**Option B: Using Prisma Studio (Manual Export)**
```bash
cd backend
npm run prisma:studio
# Manually export data from Prisma Studio if needed
```

### Step 2: Review Migration (Dry Run)

```bash
cd backend

# Generate migration without applying it
npx prisma migrate dev --create-only --name add_quotation_fields

# Review the generated SQL in prisma/migrations/[timestamp]_add_quotation_fields/migration.sql
# Verify it only adds columns (no DROP, no ALTER that removes data)
```

### Step 3: Apply Migration

```bash
# Apply the migration
npx prisma migrate dev

# Or if you already created it in step 2:
npx prisma migrate deploy
```

### Step 4: Verify Data Integrity

```bash
# Open Prisma Studio to verify existing data is intact
npm run prisma:studio

# Check that:
# - All existing quotations are still there
# - All existing quotation lines are still there
# - New fields are NULL (which is expected)
```

## 🔄 Rollback Plan (If Needed)

If something goes wrong, you can rollback:

```bash
# Option 1: Restore from backup
psql -h localhost -U your_user -d your_database < backup_before_migration.sql

# Option 2: Create a rollback migration
# Create a new migration that removes the added columns
npx prisma migrate dev --create-only --name rollback_quotation_fields
# Then manually edit the migration to DROP the columns
# Then apply: npx prisma migrate dev
```

## 📋 Pre-Migration Checklist

- [ ] Database backup created
- [ ] Migration SQL reviewed (only ADD COLUMN statements)
- [ ] Application is stopped (to avoid conflicts)
- [ ] Tested on development/staging first (if available)

## 🧪 Post-Migration Verification

After migration, verify:

1. **Count existing records:**
   ```sql
   SELECT COUNT(*) FROM "Quotation";
   SELECT COUNT(*) FROM "QuotationLine";
   ```

2. **Check new columns exist:**
   ```sql
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'Quotation' 
   AND column_name IN ('subtotal', 'vatPercent', 'vatAmount', 'notes', 'attachments', 'sentAt', 'sentBy', 'rejectedBy', 'rejectedAt');
   ```

3. **Verify existing data:**
   ```sql
   SELECT id, "quotationNumber", status, "totalAmount" 
   FROM "Quotation" 
   LIMIT 10;
   ```

## ⚠️ Important Notes

1. **Status Field**: The status field is a String, not an enum, so adding "CONVERTED" as a possible value doesn't require a migration - it's just a new string value.

2. **Existing Quotations**: Existing quotations will have NULL values for new fields, which is correct. The application code handles NULL values properly.

3. **No Breaking Changes**: This migration is backward compatible. Old code will continue to work.

4. **Application Code**: After migration, restart your backend server to use the updated Prisma client.

## 🚀 Quick Migration (If Confident)

If you're confident and have a backup:

```bash
cd backend
npm run prisma:generate
npx prisma migrate dev --name add_quotation_fields
```

That's it! The migration is safe because all new fields are optional.

