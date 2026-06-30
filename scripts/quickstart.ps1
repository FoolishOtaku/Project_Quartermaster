<#
  Project Quartermaster — one-command quickstart (v0.2.2)

  Runs everything needed to get the bot running:
    1. Ensures a .env exists (creates it from .env.example on first run)
    2. Installs dependencies (only if node_modules is missing)
    3. Generates the Prisma client
    4. Applies database migrations (prisma migrate deploy)
    5. Seeds the admin user, categories, and locations
    6. Starts the bot (npm run start:dev)

  Usage (from anywhere):
    powershell -ExecutionPolicy Bypass -File scripts\quickstart.ps1
    powershell -ExecutionPolicy Bypass -File scripts\quickstart.ps1 -NoStart

  Or via npm:
    npm run quickstart:win
#>
param(
  [switch]$NoStart
)

$ErrorActionPreference = 'Stop'

function Invoke-Step {
  param([string]$Command)
  Write-Host "`n> $Command" -ForegroundColor Cyan
  & cmd /c $Command
  if ($LASTEXITCODE -ne 0) {
    throw "Step failed (exit $LASTEXITCODE): $Command"
  }
}

# Always run from the project root (parent of this script's folder).
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
Write-Host "Project Quartermaster quickstart" -ForegroundColor Green
Write-Host "Project root: $root" -ForegroundColor DarkGray

# 1. Ensure .env exists.
if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "`nCreated .env from .env.example." -ForegroundColor Yellow
  Write-Host "Open .env and fill in:" -ForegroundColor Yellow
  Write-Host "  - DATABASE_URL" -ForegroundColor Yellow
  Write-Host "  - TELEGRAM_BOT_TOKEN" -ForegroundColor Yellow
  Write-Host "  - ADMIN_TELEGRAM_ID" -ForegroundColor Yellow
  Write-Host "Then run this script again." -ForegroundColor Yellow
  exit 1
}

# 2. Install dependencies if needed.
if (-not (Test-Path "node_modules")) {
  Invoke-Step "npm install"
} else {
  Write-Host "`nDependencies already installed (skipping npm install)." -ForegroundColor DarkGray
}

# 3-5. Generate client, apply migrations, seed.
Invoke-Step "npm run prisma:generate"
Invoke-Step "npm run prisma:deploy"
Invoke-Step "npm run db:seed"

if ($NoStart) {
  Write-Host "`nSetup complete. Start the bot with: npm run start:dev" -ForegroundColor Green
  exit 0
}

# 6. Start the bot.
Write-Host "`nSetup complete. Starting the bot (press Ctrl+C to stop)..." -ForegroundColor Green
Invoke-Step "npm run start:dev"
