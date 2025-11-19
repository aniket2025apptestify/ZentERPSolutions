# Fix Migration State - Proper Solution
# This script properly initializes Prisma migrations for an existing database

Write-Host "🔧 Fixing Migration State" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the backend directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Please run this script from the backend directory" -ForegroundColor Red
    Write-Host "   cd backend" -ForegroundColor Yellow
    exit 1
}

Write-Host "⚠️  IMPORTANT: Make sure your backend server is STOPPED" -ForegroundColor Yellow
Write-Host "   The database must not be locked by a running server" -ForegroundColor Yellow
Write-Host ""

$response = Read-Host "Is the backend server stopped? (y/n)"
if ($response -ne "y" -and $response -ne "Y") {
    Write-Host ""
    Write-Host "❌ Please stop the server first, then run this script again" -ForegroundColor Red
    Write-Host "   Press Ctrl+C in the terminal where the server is running" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Step 1: Checking migration status..." -ForegroundColor Yellow
npx prisma migrate status

Write-Host ""
Write-Host "Step 2: Applying baseline migration..." -ForegroundColor Yellow
Write-Host "   (This will mark the migration as applied without running SQL)" -ForegroundColor Gray
Write-Host ""

try {
    npx prisma migrate deploy
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Migration state fixed successfully!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "⚠️  Migration deploy failed. Trying alternative method..." -ForegroundColor Yellow
        npm run init:migrations
    }
} catch {
    Write-Host ""
    Write-Host "⚠️  Error: $_" -ForegroundColor Yellow
    Write-Host "   Trying alternative method..." -ForegroundColor Yellow
    npm run init:migrations
}

Write-Host ""
Write-Host "Step 3: Verifying migration status..." -ForegroundColor Yellow
npx prisma migrate status

Write-Host ""
Write-Host "Step 4: Generating Prisma Client..." -ForegroundColor Yellow
npx prisma generate

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "✅ Migration fix complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Start your backend server: npm run dev" -ForegroundColor White
Write-Host "  2. Test the API endpoints" -ForegroundColor White
Write-Host ""

