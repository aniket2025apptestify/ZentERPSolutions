# Recreate Database After Reset
# This script recreates all database tables after a reset

Write-Host "🔄 Recreate Database" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the backend directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Please run this script from the backend directory" -ForegroundColor Red
    Write-Host "   cd backend" -ForegroundColor Yellow
    exit 1
}

Write-Host "⚠️  CRITICAL: Make sure your backend server is STOPPED!" -ForegroundColor Red
Write-Host "   The database must not be locked by a running server" -ForegroundColor Yellow
Write-Host ""

$response = Read-Host "Is the backend server stopped? (y/n)"
if ($response -ne "y" -and $response -ne "Y") {
    Write-Host ""
    Write-Host "❌ Please stop the server first!" -ForegroundColor Red
    Write-Host "   Press Ctrl+C in the terminal where the server is running" -ForegroundColor Yellow
    Write-Host "   Then run this script again" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Step 1: Creating initial migration..." -ForegroundColor Yellow
Write-Host "   This will generate SQL to create all tables" -ForegroundColor Gray
Write-Host ""

try {
    npx prisma migrate dev --name init
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Database recreated successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Step 2: Verifying migration status..." -ForegroundColor Yellow
        npx prisma migrate status
        
        Write-Host ""
        Write-Host "Step 3: Generating Prisma Client..." -ForegroundColor Yellow
        npx prisma generate
        
        Write-Host ""
        Write-Host "=================================" -ForegroundColor Cyan
        Write-Host "✅ Database recreation complete!" -ForegroundColor Green
        Write-Host ""
        Write-Host "All tables have been recreated:" -ForegroundColor Yellow
        Write-Host "  ✅ Tenant, User" -ForegroundColor White
        Write-Host "  ✅ Client, Inquiry" -ForegroundColor White
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
        Write-Host "❌ Migration failed. Check the error above." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "❌ Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Make sure database server is running" -ForegroundColor White
    Write-Host "  2. Check DATABASE_URL in .env file" -ForegroundColor White
    Write-Host "  3. Verify database connection" -ForegroundColor White
    exit 1
}

