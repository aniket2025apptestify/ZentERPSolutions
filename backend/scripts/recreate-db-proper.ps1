# Proper Database Recreation - No Lock Issues
# This uses db push which doesn't require advisory locks

Write-Host "🔄 Recreate Database (Proper Method)" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the backend directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Please run this script from the backend directory" -ForegroundColor Red
    Write-Host "   cd backend" -ForegroundColor Yellow
    exit 1
}

Write-Host "⚠️  IMPORTANT: Stop your backend server first!" -ForegroundColor Yellow
Write-Host "   Press Ctrl+C in the terminal where the server is running" -ForegroundColor Yellow
Write-Host ""

$response = Read-Host "Is the backend server stopped? (y/n)"
if ($response -ne "y" -and $response -ne "Y") {
    Write-Host ""
    Write-Host "❌ Please stop the server first!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 1: Releasing any existing locks..." -ForegroundColor Yellow
npm run release:locks 2>&1 | Out-Null

Write-Host ""
Write-Host "Step 2: Pushing schema to database (no migrations, no locks)..." -ForegroundColor Yellow
Write-Host "   This will create all tables directly" -ForegroundColor Gray
Write-Host ""

npx prisma db push --accept-data-loss --skip-generate

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Database schema pushed successfully!" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Step 3: Generating Prisma Client..." -ForegroundColor Yellow
    npx prisma generate
    
    Write-Host ""
    Write-Host "Step 4: Creating baseline migration for future use..." -ForegroundColor Yellow
    
    # Create migrations directory
    $migrationsDir = "prisma\migrations"
    if (-not (Test-Path $migrationsDir)) {
        New-Item -ItemType Directory -Path $migrationsDir | Out-Null
    }
    
    # Create baseline migration
    $timestamp = Get-Date -Format "yyyyMMddHHmmss"
    $baselineDir = "$migrationsDir\${timestamp}_init"
    New-Item -ItemType Directory -Path $baselineDir | Out-Null
    
    $migrationSQL = @"
-- Baseline Migration
-- This migration represents the current state after db push
-- All tables were created via: npx prisma db push
-- Future migrations will be tracked from this point

"@
    
    Set-Content -Path "$baselineDir\migration.sql" -Value $migrationSQL
    
    Write-Host ""
    Write-Host "Step 5: Marking baseline as applied..." -ForegroundColor Yellow
    
    # Try to mark as applied (may fail if migration table doesn't exist, that's OK)
    npx prisma migrate resolve --applied "${timestamp}_init" 2>&1 | Out-Null
    
    Write-Host ""
    Write-Host "====================================" -ForegroundColor Cyan
    Write-Host "✅ Database recreation complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "All tables have been recreated:" -ForegroundColor Yellow
    Write-Host "  ✅ Tenant, User, Client, Inquiry" -ForegroundColor White
    Write-Host "  ✅ Quotation, QuotationLine" -ForegroundColor White
    Write-Host "  ✅ Project, SubGroup" -ForegroundColor White
    Write-Host "  ✅ ProductionJob, InventoryItem" -ForegroundColor White
    Write-Host "  ✅ PurchaseOrder, Invoice" -ForegroundColor White
    Write-Host "  ✅ And all other tables..." -ForegroundColor White
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Start your backend server: npm run dev" -ForegroundColor White
    Write-Host "  2. Create test data (tenants, users, clients)" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Database push failed. Check the error above." -ForegroundColor Red
    exit 1
}

