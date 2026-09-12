# Restaurant POS Frontend - Azure App Service Deployment Guide

## Overview

Deploy the Next.js frontend to **Azure App Service** (Linux, Node 20-lts) using **Next.js standalone output mode**. This bundles everything into a self-contained package — no `npm install` or build step runs on Azure.

---

## Prerequisites

- **Node.js 20+** installed locally
- **Azure CLI** installed (`az --version`)
- **Azure App Service** already created (Linux, Node 20-lts)

---

## Step 1: Build Locally

```powershell
cd "d:\New folder\source\resturant-pos\aipartner\aipartner-main\RestaurantPos.Client"
npm run build
```

> `next.config.mjs` must contain `output: 'standalone'`. This produces `.next/standalone/server.js` with all dependencies bundled.

---

## Step 2: Create Deployment Package

```powershell
# Clean previous deploy folder
if (Test-Path deploy) { Remove-Item deploy -Recurse -Force }
if (Test-Path deploy.zip) { Remove-Item deploy.zip -Force }

# Copy standalone output (includes bundled node_modules + server.js)
Copy-Item -Path ".next/standalone/*" -Destination "deploy" -Recurse

# Copy static assets (not included in standalone by default)
Copy-Item -Path ".next/static" -Destination "deploy/.next/static" -Recurse

# Copy public folder (images, fonts, etc.)
if (Test-Path public) {
    Copy-Item -Path "public" -Destination "deploy/public" -Recurse
}

# Create ZIP
Compress-Archive -Path "deploy/*" -DestinationPath "deploy.zip" -Force
```

The resulting `deploy.zip` should be ~11 MB.

---

## Step 3: Authenticate with Azure

```powershell
# Log out any existing session
az logout

# Log in (opens browser)
az login --tenant "YOUR_TENANT_ID"

# Set the target subscription
az account set --subscription "YOUR_SUBSCRIPTION_ID"

# Verify
az account show --query "{name:name, id:id, tenantId:tenantId}" -o table
```

**Known deployments:**

| Tenant | User | Subscription | Subscription ID |
|--------|------|-------------|-----------------|
| daman.gov.qa | cc-crm.admin@daman.gov.qa | GRSIA_QC_DEV | `20dd9919-68d8-44cc-8a92-32f7535862fc` |

---

## Step 4: Configure App Service

### 4a. Set Environment Variables

```powershell
az webapp config appsettings set `
  --resource-group YOUR_RESOURCE_GROUP `
  --name YOUR_APP_SERVICE_NAME `
  --settings `
    PORT=8080 `
    NODE_ENV=production `
    "NEXT_PUBLIC_API_URL=/api/api-proxy" `
    "NEXT_PUBLIC_SIGNALR_URL=https://wa-pos-be-dev-fpf9hte4hveyhrf0.swedencentral-01.azurewebsites.net//" `
    "BACKEND_URL=https://wa-pos-be-dev-fpf9hte4hveyhrf0.swedencentral-01.azurewebsites.net//" `
    SCM_DO_BUILD_DURING_DEPLOYMENT=false
```

> **`SCM_DO_BUILD_DURING_DEPLOYMENT=false`** is critical — we do NOT want Azure Oryx to run `npm install` or build. Everything is pre-built.

### 4b. Set Startup Command

```powershell
az webapp config set `
  --resource-group YOUR_RESOURCE_GROUP `
  --name YOUR_APP_SERVICE_NAME `
  --startup-file "node server.js"
```

---

## Step 5: Deploy

```powershell
az webapp deploy `
  --resource-group YOUR_RESOURCE_GROUP `
  --name YOUR_APP_SERVICE_NAME `
  --src-path deploy.zip `
  --type zip `
  --clean true
```

> `--clean true` removes old files before extracting. This ensures no stale artifacts remain.

---

## Step 6: Verify

```powershell
# Check app is running
az webapp show `
  --resource-group YOUR_RESOURCE_GROUP `
  --name YOUR_APP_SERVICE_NAME `
  --query "{state:state, url:defaultHostName}" -o table

# Stream logs (Ctrl+C to stop)
az webapp log tail `
  --resource-group YOUR_RESOURCE_GROUP `
  --name YOUR_APP_SERVICE_NAME
```

Open `https://YOUR_APP_SERVICE_NAME.azurewebsites.net` in a browser.

---

## Quick Copy-Paste: Full Deployment (All Commands)

Replace the 3 placeholder values and run the entire block:

```powershell
$RG   = "YOUR_RESOURCE_GROUP"
$APP  = "YOUR_APP_SERVICE_NAME"
$ZIP  = "deploy.zip"

# --- Build ---
npm run build

# --- Package ---
if (Test-Path deploy) { Remove-Item deploy -Recurse -Force }
if (Test-Path deploy.zip) { Remove-Item deploy.zip -Force }
Copy-Item -Path ".next/standalone/*" -Destination "deploy" -Recurse
Copy-Item -Path ".next/static" -Destination "deploy/.next/static" -Recurse
if (Test-Path public) { Copy-Item -Path "public" -Destination "deploy/public" -Recurse }
Compress-Archive -Path "deploy/*" -DestinationPath $ZIP -Force

# --- Configure ---
az webapp config appsettings set -g $RG -n $APP --settings `
  PORT=8080 `
  NODE_ENV=production `
  "NEXT_PUBLIC_API_URL=/api/api-proxy" `
  "NEXT_PUBLIC_SIGNALR_URL=https://wa-pos-be-dev-fpf9hte4hveyhrf0.swedencentral-01.azurewebsites.net//" `
  "BACKEND_URL=https://wa-pos-be-dev-fpf9hte4hveyhrf0.swedencentral-01.azurewebsites.net//" `
  SCM_DO_BUILD_DURING_DEPLOYMENT=false

az webapp config set -g $RG -n $APP --startup-file "node server.js"

# --- Deploy ---
az webapp deploy -g $RG -n $APP --src-path $ZIP --type zip --clean true
```

---

## Existing Deployments

| App Service | Resource Group | URL | Status |
|-------------|---------------|-----|--------|
| WA-POS-FE-DEV1 | rg-crmcc-dev-qc-01 | https://wa-pos-fe-dev1-ananhya5hqaafffj.swedencentral-01.azurewebsites.net | Working |

---

## Environment Variables Reference

| Setting | Value | Purpose |
|---------|-------|---------|
| `PORT` | `8080` | Azure App Service default port |
| `NODE_ENV` | `production` | Production mode |
| `NEXT_PUBLIC_API_URL` | `/api/api-proxy` | Client-side API route prefix |
| `NEXT_PUBLIC_SIGNALR_URL` | `https://wa-pos-be-dev-fpf9hte4hveyhrf0.swedencentral-01.azurewebsites.net//` | SignalR hub base URL |
| `BACKEND_URL` | `https://wa-pos-be-dev-fpf9hte4hveyhrf0.swedencentral-01.azurewebsites.net//` | Server-side API proxy target |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `false` | Disable Oryx build on Azure |

---

## Troubleshooting

**"Application Error" / app won't start:**
- Verify startup command is `node server.js` (not `npm start`)
- Check `SCM_DO_BUILD_DURING_DEPLOYMENT` is `false`
- Stream logs: `az webapp log tail -g $RG -n $APP`

**"next: not found":**
- Standalone mode was not used. Ensure `output: 'standalone'` is in `next.config.mjs` and rebuild.

**"Cannot find module 'typescript'":**
- `next.config.mjs` must be plain JavaScript (`.mjs`), NOT TypeScript (`.ts`). The `.ts` file was renamed to `.mjs` to avoid this.

**Cannot connect to backend API:**
- Verify `BACKEND_URL` and `NEXT_PUBLIC_SIGNALR_URL` are set correctly in App Settings.

**Deployment returns Status 400:**
- Re-authenticate: `az logout` then `az login --tenant ...`
- Ensure the ZIP file is not corrupted — rebuild it.

---

## Architecture Notes

- **`next.config.mjs`** (NOT `.ts`): Azure Oryx runs `npm install --production`, skipping devDependencies including `typescript`. Using `.mjs` avoids this issue entirely.
- **Standalone mode**: `output: 'standalone'` in Next.js config bundles all required `node_modules` into `.next/standalone/`, producing a self-contained `server.js` entry point.
- **No build on Azure**: The entire app is pre-built locally and deployed as a ZIP. Azure just extracts and runs `node server.js`.
