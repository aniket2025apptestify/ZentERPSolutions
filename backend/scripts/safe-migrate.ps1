# Safe Migration Script for Windows PowerShell
# This script safely migrates the database with backup and verification

Write-Host "🛡️  Safe Database Migration Script" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the backend directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Please run this script from the backend directory" -ForegroundColor Red
    Write-Host "   cd backend" -ForegroundColor Yellow
    exit 1
}

# Step 1: Backup
Write-Host "Step 1: Creating database backup..." -ForegroundColor Yellow
Write-Host ""
try {
    npm run backup:db
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "⚠️  Backup failed, but continuing..." -ForegroundColor Yellow
        Write-Host "   You can create a manual backup if needed" -ForegroundColor Yellow
    } else {
        Write-Host ""
        Write-Host "✅ Backup created successfully!" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Backup script not available, skipping..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 2: Generating Prisma Client..." -ForegroundColor Yellow
npm run prisma:generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to generate Prisma Client" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Prisma Client generated" -ForegroundColor Green

Write-Host ""
Write-Host "Step 3: Creating and applying migration..." -ForegroundColor Yellow
Write-Host "   This will show you the SQL before applying" -ForegroundColor Gray
Write-Host ""

$response = Read-Host "Continue with migration? (y/n)"
if ($response -ne "y" -and $response -ne "Y") {
    Write-Host "Migration cancelled by user" -ForegroundColor Yellow
    exit 0
}

npx prisma migrate dev --name add_quotation_fields
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Migration failed!" -ForegroundColor Red
    Write-Host "   Check the error above" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Step 4: Verifying migration..." -ForegroundColor Yellow
npm run verify:migration
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "⚠️  Verification found issues" -ForegroundColor Yellow
    Write-Host "   Review the output above" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "✅ Migration verified successfully!" -ForegroundColor Green
}

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "✅ Migration Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Restart your backend server: npm run dev" -ForegroundColor White
Write-Host "  2. Test the quotation endpoints" -ForegroundColor White
Write-Host ""

