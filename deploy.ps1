# ============================================
# Restaurant POS Frontend - Full Deployment Script
# ============================================
# Usage: Open PowerShell, cd to RestaurantPos.Client folder, run: .\deploy.ps1
# ============================================

# --- CONFIGURATION (CHANGE THESE) ---
$RG   = "SRX-Retail-Wafeer"
$APP  = "WA-EC-FE-DEV"
$BACKEND = "https://wa-ec-be-dev-hrfvd8bkdub4h9d9.swedencentral-01.azurewebsites.net"
$TENANT_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6"

$env:NODE_ENV = "production"
$env:NEXT_PUBLIC_API_URL = "/api/api-proxy"
$env:NEXT_PUBLIC_API_BASE_URL = $BACKEND
$env:NEXT_PUBLIC_SIGNALR_URL = $BACKEND
$env:BACKEND_URL = $BACKEND
$env:PROXY_BUFFER_RESPONSES = "false"
$env:NEXT_PUBLIC_TENANT_ID = $TENANT_ID
$env:TENANT_ID = $TENANT_ID

# --- Step 1: Build ---
Write-Host "========== STEP 1: Building Next.js ==========" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "BUILD FAILED" -ForegroundColor Red; exit 1 }

# --- Step 2: Create deployment package ---
Write-Host "========== STEP 2: Creating deploy package ==========" -ForegroundColor Cyan
$deployDir = "deploy_pkg"
if (Test-Path $deployDir) { Remove-Item $deployDir -Recurse -Force }
if (Test-Path deploy.zip) { Remove-Item deploy.zip -Force }

# Use robocopy for reliable recursive copy of standalone output (including node_modules)
New-Item -ItemType Directory -Path $deployDir -Force | Out-Null
robocopy ".next\standalone" $deployDir /E /NFL /NDL /NJH /NJS /NC /NS /NP
# Robocopy exit codes 0-7 are success
if ($LASTEXITCODE -gt 7) { Write-Host "COPY STANDALONE FAILED" -ForegroundColor Red; exit 1 }
# Copy static assets (not included in standalone by default)
robocopy ".next\static" "$deployDir\.next\static" /E /NFL /NDL /NJH /NJS /NC /NS /NP
if ($LASTEXITCODE -gt 7) { Write-Host "COPY STATIC FAILED" -ForegroundColor Red; exit 1 }

# Copy public folder
if (Test-Path public) {
    robocopy "public" "$deployDir\public" /E /NFL /NDL /NJH /NJS /NC /NS /NP
    if ($LASTEXITCODE -gt 7) { Write-Host "COPY PUBLIC FAILED" -ForegroundColor Red; exit 1 }
}

Compress-Archive -Path "$deployDir\*" -DestinationPath "deploy.zip" -Force
$size = [math]::Round((Get-Item deploy.zip).Length / 1MB, 2)
Write-Host "deploy.zip created: $size MB" -ForegroundColor Green

# --- Step 3: Login to Azure ---
Write-Host "========== STEP 3: Azure Login ==========" -ForegroundColor Cyan
az logout 2>$null
az login
az account show --query "{name:name, id:id, tenantId:tenantId}" -o table

# --- Step 4: Configure App Service ---
Write-Host "========== STEP 4: Configuring App Service ==========" -ForegroundColor Cyan
az webapp config appsettings set -g $RG -n $APP --settings `
  PORT=8080 `
  NODE_ENV=production `
  "NEXT_PUBLIC_API_URL=/api/api-proxy" `
  "NEXT_PUBLIC_API_BASE_URL=$BACKEND" `
  "NEXT_PUBLIC_SIGNALR_URL=$BACKEND" `
  "BACKEND_URL=$BACKEND" `
  PROXY_BUFFER_RESPONSES=false `
  "NEXT_PUBLIC_TENANT_ID=$TENANT_ID" `
  "TENANT_ID=$TENANT_ID" `
  SCM_DO_BUILD_DURING_DEPLOYMENT=false `
  -o table

az webapp config set -g $RG -n $APP --startup-file "node server.js" --query "appCommandLine" -o tsv

# --- Step 5: Deploy ---
Write-Host "========== STEP 5: Deploying ==========" -ForegroundColor Cyan
az webapp deploy -g $RG -n $APP --src-path deploy.zip --type zip --clean true

# --- Step 6: Verify ---
Write-Host "========== STEP 6: Verifying ==========" -ForegroundColor Cyan
$url = az webapp show -g $RG -n $APP --query "defaultHostName" -o tsv
Write-Host "App URL: https://$url" -ForegroundColor Green
Write-Host "Deployment complete! Open the URL above in your browser." -ForegroundColor Green
