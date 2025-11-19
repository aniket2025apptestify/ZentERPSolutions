# Fix Database Lock Issue
# This script helps resolve P1002 database lock timeout errors

Write-Host "🔧 Fix Database Lock Issue" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the backend directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Please run this script from the backend directory" -ForegroundColor Red
    Write-Host "   cd backend" -ForegroundColor Yellow
    exit 1
}

Write-Host "Step 1: Checking for database locks..." -ForegroundColor Yellow
Write-Host ""
npm run check:locks

Write-Host ""
Write-Host "Step 2: Choose an option:" -ForegroundColor Yellow
Write-Host "  1. Stop backend server manually (recommended)" -ForegroundColor White
Write-Host "  2. Release locks automatically (may disconnect active sessions)" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter choice (1 or 2)"

if ($choice -eq "2") {
    Write-Host ""
    Write-Host "⚠️  WARNING: This will terminate all active database connections!" -ForegroundColor Red
    $confirm = Read-Host "Are you sure? (yes/no)"
    
    if ($confirm -eq "yes") {
        Write-Host ""
        Write-Host "Releasing locks..." -ForegroundColor Yellow
        npm run release:locks
        
        Write-Host ""
        Write-Host "Step 3: Creating migration..." -ForegroundColor Yellow
        npx prisma migrate dev --name init
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✅ Migration created successfully!" -ForegroundColor Green
            npx prisma generate
        }
    } else {
        Write-Host "Cancelled." -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "Please:" -ForegroundColor Yellow
    Write-Host "  1. Stop your backend server (Ctrl+C)" -ForegroundColor White
    Write-Host "  2. Then run: npx prisma migrate dev --name init" -ForegroundColor White
    Write-Host ""
}

