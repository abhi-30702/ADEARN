# AdEarn — one-command setup script for Windows
# Run from the repo root: .\setup.ps1

$ErrorActionPreference = "Stop"

function Write-Step { param($msg) Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-OK   { param($msg) Write-Host "    [OK] $msg" -ForegroundColor Green }
function Write-Fail { param($msg) Write-Host "    [!!] $msg" -ForegroundColor Red; exit 1 }

Write-Host "`nAdEarn Setup" -ForegroundColor Magenta
Write-Host "============" -ForegroundColor Magenta

# 1. Check Node.js
Write-Step "Checking Node.js"
try {
    $nodeVersion = node --version 2>&1
    $major = [int]($nodeVersion -replace 'v(\d+)\..*','$1')
    if ($major -lt 18) { Write-Fail "Node.js 18+ required. Found $nodeVersion. Install from https://nodejs.org" }
    Write-OK "Node.js $nodeVersion"
} catch {
    Write-Fail "Node.js not found. Install from https://nodejs.org"
}

# 2. Check Docker
Write-Step "Checking Docker"
try {
    docker info > $null 2>&1
    if ($LASTEXITCODE -ne 0) { throw }
    Write-OK "Docker is running"
} catch {
    Write-Fail "Docker is not running. Start Docker Desktop and re-run this script."
}

# 3. Install dependencies
Write-Step "Installing npm dependencies"
npm install
if ($LASTEXITCODE -ne 0) { Write-Fail "npm install failed" }
Write-OK "Dependencies installed"

# 4. Copy .env files if they don't exist
Write-Step "Setting up environment files"

if (-not (Test-Path "server\.env")) {
    Copy-Item "server\.env.example" "server\.env"
    Write-OK "Created server/.env from .env.example"
} else {
    Write-OK "server/.env already exists — skipping"
}

if (-not (Test-Path "web\.env")) {
    Copy-Item "web\.env.example" "web\.env"
    Write-OK "Created web/.env from .env.example"
} else {
    Write-OK "web/.env already exists — skipping"
}

# 5. Start Docker containers
Write-Step "Starting Docker containers (PostgreSQL + Redis)"
docker-compose up -d
if ($LASTEXITCODE -ne 0) { Write-Fail "docker-compose up failed" }

# Wait for PostgreSQL to be ready
Write-Host "    Waiting for PostgreSQL..." -ForegroundColor Yellow
$retries = 0
do {
    Start-Sleep -Seconds 2
    $ready = docker exec (docker-compose ps -q postgres) pg_isready -U adearn 2>$null
    $retries++
} while ($LASTEXITCODE -ne 0 -and $retries -lt 15)

if ($retries -ge 15) { Write-Fail "PostgreSQL did not become ready in time" }
Write-OK "PostgreSQL ready"

# 6. Run migrations
Write-Step "Running database migrations"
Push-Location server
npm run migrate
if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Fail "Migrations failed" }
Pop-Location
Write-OK "Migrations applied"

# 7. Seed demo data
Write-Step "Seeding demo data"
Push-Location server
npm run seed:demo
if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Fail "Demo seed failed" }
Pop-Location
Write-OK "Demo data seeded"

# 8. Done
Write-Host "`n============================================" -ForegroundColor Magenta
Write-Host " Setup complete! Start the app:" -ForegroundColor Green
Write-Host ""
Write-Host "   Terminal 1 — Backend:" -ForegroundColor White
Write-Host "     cd server" -ForegroundColor Gray
Write-Host "     npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "   Terminal 2 — Frontend:" -ForegroundColor White
Write-Host "     cd web" -ForegroundColor Gray
Write-Host "     npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "   Open: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Demo accounts (OTP: 123456):" -ForegroundColor White
Write-Host "     Consumer:   9876543210" -ForegroundColor Gray
Write-Host "     Advertiser: 9123456789" -ForegroundColor Gray
Write-Host "     Admin:      9000000000" -ForegroundColor Gray
Write-Host "============================================`n" -ForegroundColor Magenta
