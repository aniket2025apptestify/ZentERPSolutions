# Migration Scripts

Safe database migration tools to prevent data loss.

## Scripts

### 1. `safe-migrate.ps1` (Windows PowerShell)
**Easiest way to migrate safely**

```powershell
cd backend
.\scripts\safe-migrate.ps1
```

This script:
- Creates a backup
- Generates Prisma Client
- Applies migration with confirmation
- Verifies data integrity

### 2. `backup-database.js`
**Create a database backup**

```bash
npm run backup:db
```

Creates a backup in `backend/backups/` folder.

**Requirements:**
- `pg_dump` must be installed
- PostgreSQL client tools

### 3. `verify-migration.js`
**Verify migration was successful**

```bash
npm run verify:migration
```

Checks:
- ✅ All existing data is intact
- ✅ New columns exist
- ✅ No data was lost

## Why These Migrations Are Safe

All new fields being added are **optional (nullable)**:
- Existing data is NOT modified
- No columns are deleted
- No data is lost
- Existing records continue to work

## Quick Start

**Windows:**
```powershell
cd backend
.\scripts\safe-migrate.ps1
```

**Linux/Mac:**
```bash
cd backend
npm run backup:db
npm run prisma:generate
npx prisma migrate dev --name add_quotation_fields
npm run verify:migration
```

## Troubleshooting

### Backup fails
- Install PostgreSQL client tools
- Or skip backup (migration is still safe)

### Migration fails
- Check database connection
- Ensure database is running
- Check Prisma schema is valid

### Verification fails
- Check error message
- Review migration status: `npx prisma migrate status`
- Restore from backup if needed

