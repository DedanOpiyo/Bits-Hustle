# Production Deployment Script for Windows (PowerShell)
# Usage: .\deploy.ps1 -Environment production

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("staging", "production")]
    [string]$Environment,
    
    [switch]$SkipBuild,
    [switch]$SkipDocker
)

$ErrorActionPreference = "Stop"
$ProjectRoot = "D:\nzuki2025\bitshustle\pyapp"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "BitsHustle Hub Deployment Script" -ForegroundColor Cyan
Write-Host "Target Environment: $Environment" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan

# Step 1: Verify prerequisites
Write-Host "`n[1/5] Verifying prerequisites..." -ForegroundColor Green
$dockerAvailable = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerAvailable -and -not $SkipDocker) {
    Write-Error "Docker is not installed. Install Docker Desktop or use -SkipDocker for manual deployment."
    exit 1
}

# Step 2: Frontend validation
if (-not $SkipBuild) {
    Write-Host "`n[2/5] Validating frontend..." -ForegroundColor Green
    Push-Location "$ProjectRoot\frontend"
    try {
        npm run lint 2>&1 | Out-String
        if ($LASTEXITCODE -ne 0) { throw "Lint failed" }
        npm run typecheck 2>&1 | Out-String
        if ($LASTEXITCODE -ne 0) { throw "TypeCheck failed" }
        Write-Host "Frontend validation passed!" -ForegroundColor Green
    } catch {
        Write-Error "Frontend validation failed: $_"
        exit 1
    }
    Pop-Location
}

# Step 3: Backend validation
Write-Host "`n[3/5] Validating backend..." -ForegroundColor Green
Push-Location "$ProjectRoot\flask-api"
try {
    if (Test-Path ".venv") {
        .\.venv\Scripts\Activate.ps1
    }
    python -m py_compile app/*.py app/**/*.py 2>&1 | Out-String
    Write-Host "Backend validation passed!" -ForegroundColor Green
} catch {
    Write-Error "Backend validation failed: $_"
}
Pop-Location

# Step 4: Docker deployment
if (-not $SkipDocker) {
    Write-Host "`n[4/5] Deploying with Docker..." -ForegroundColor Green
    Push-Location $ProjectRoot
    try {
        # Check if .env production file exists
        if (-not (Test-Path "flask-api\.env")) {
            if (Test-Path "flask-api\.env.$Environment") {
                Copy-Item "flask-api\.env.$Environment" "flask-api\.env"
                Write-Host "Created .env from .env.$Environment template" -ForegroundColor Yellow
                Write-Host "IMPORTANT: Edit flask-api\.env with production secrets before running!" -ForegroundColor Red
            }
        }
        
        docker compose -f docker-compose.prod.yml pull 2>&1 | Out-String
        docker compose -f docker-compose.prod.yml up -d 2>&1 | Out-String
        Write-Host "Docker deployment complete!" -ForegroundColor Green
    } catch {
        Write-Error "Docker deployment failed: $_"
    }
    Pop-Location
}

# Step 5: Verify deployment
if (-not $SkipDocker) {
    Write-Host "`n[5/5] Verifying deployment..." -ForegroundColor Green
    Start-Sleep -Seconds 5
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:5000/health" -TimeoutSec 10
        if ($health.status -eq "ok") {
            Write-Host "Backend health check passed!" -ForegroundColor Green
        }
    } catch {
        Write-Warning "Backend health check failed - check logs: docker logs bitshustle-backend"
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Deployment Script Complete" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Verify https://api.bitshustlehubs.co.ke/health returns OK" -ForegroundColor White
Write-Host "2. Check frontend at https://app.bitshustlehubs.co.ke" -ForegroundColor White
Write-Host "3. Monitor logs: docker logs -f bitshustle-backend" -ForegroundColor White