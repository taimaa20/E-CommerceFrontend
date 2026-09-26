# ============================================
# Restaurant POS - IIS Deployment Script
# ============================================
# Local full IIS deploy, run as Administrator:
#   .\deploy-iis.ps1
#
# Remote frontend-only IIS deploy:
#   .\deploy-iis.ps1 -FrontendOnly -ComputerName "IIS-SERVER" -Credential (Get-Credential) -BackendUrl "http://172.16.0.4:777"
#
# Build frontend IIS package only, then copy frontend-iis.zip to the server:
#   .\deploy-iis.ps1 -FrontendOnly -PackageOnly -BackendUrl "http://172.16.0.4:777"
# ============================================

param(
    [switch]$FrontendOnly,
    [switch]$PackageOnly,
    [string]$ComputerName,
    [PSCredential]$Credential,

    [string]$BackendSiteName = "POS-Backend",
    [string]$FrontendSiteName = "POS-Frontend",
    [string]$BackendAppPool = "POS-Backend",
    [string]$FrontendAppPool = "POS-Frontend",
    [int]$FrontendPort = 81,
    [int]$FrontendNodePort = 3100,

    [string]$BackendIisPath = "C:\inetpub\wwwroot\pos-backend",
    [string]$FrontendIisPath = "C:\inetpub\wwwroot\pos-frontend",

    [string]$BackendUrl = "http://4.235.120.206:777",
    [string]$TenantId = "3fa85f64-5717-4562-b3fc-2c963f66afa6"
)

$ErrorActionPreference = "Stop"

$Root = (Resolve-Path "$PSScriptRoot\..").Path
$FrontendProject = $PSScriptRoot
$BackendProject = Join-Path $Root "POS-Backend"
$BuildRoot = Join-Path $Root "build-temp\iis-deploy"
$BackendPackage = Join-Path $BuildRoot "backend"
$FrontendPackage = Join-Path $BuildRoot "frontend"
$BackendZip = Join-Path $BuildRoot "backend-iis.zip"
$FrontendZip = Join-Path $BuildRoot "frontend-iis.zip"
$IsRemoteDeployment = -not [string]::IsNullOrWhiteSpace($ComputerName)
$DeployBackend = -not $FrontendOnly

function Test-IsAdmin {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Assert-Admin {
    if (-not (Test-IsAdmin)) {
        throw "Run this script as Administrator so IIS app pools can be stopped and started."
    }
}

function Assert-LocalWebAdministrationModule {
    if ($IsRemoteDeployment) {
        return
    }

    if ($null -ne (Get-Module -ListAvailable -Name WebAdministration | Select-Object -First 1)) {
        return
    }

    throw @"
IIS PowerShell module 'WebAdministration' is not installed on this machine.

Install IIS Management Scripts and Tools, then rerun this script as Administrator.

Windows Server:
  Install-WindowsFeature Web-Scripting-Tools

Windows 10/11:
  Enable-WindowsOptionalFeature -Online -FeatureName IIS-ManagementScriptingTools
"@
}

function Assert-SafeChildPath {
    param(
        [string]$Path,
        [string]$RequiredParent
    )

    $fullParent = [IO.Path]::GetFullPath($RequiredParent).TrimEnd('\')
    $fullPath = [IO.Path]::GetFullPath($Path).TrimEnd('\')
    $isChild = $fullPath.StartsWith("$fullParent\", [StringComparison]::OrdinalIgnoreCase)

    if ($fullPath -eq $fullParent -or -not $isChild) {
        throw "Refusing recursive delete outside build folder: $fullPath"
    }
}

function Remove-DirectoryIfExists {
    param(
        [string]$Path,
        [string]$RequiredParent
    )

    Assert-SafeChildPath -Path $Path -RequiredParent $RequiredParent
    if (Test-Path $Path) {
        Remove-Item -LiteralPath $Path -Recurse -Force
    }
}

function Remove-FileIfExists {
    param([string]$Path)

    if (Test-Path $Path) {
        Remove-Item -LiteralPath $Path -Force
    }
}

function Invoke-RobocopyMirror {
    param(
        [string]$Source,
        [string]$Target,
        [string[]]$ExcludeDirectories = @()
    )

    New-Item -ItemType Directory -Path $Target -Force | Out-Null

    $args = @(
        $Source,
        $Target,
        "/MIR",
        "/NFL",
        "/NDL",
        "/NJH",
        "/NJS",
        "/NC",
        "/NS",
        "/NP"
    )

    if ($ExcludeDirectories.Count -gt 0) {
        $args += "/XD"
        $args += $ExcludeDirectories
    }

    & robocopy @args
    if ($LASTEXITCODE -gt 7) {
        throw "Robocopy failed from $Source to $Target with exit code $LASTEXITCODE."
    }
}

function Write-FrontendWebConfig {
    param(
        [string]$Path,
        [string]$TargetBackendUrl,
        [int]$NodePort
    )

    $TargetBackendUrl = $TargetBackendUrl.TrimEnd('/')
    $escapedBackendUrl = [Security.SecurityElement]::Escape($TargetBackendUrl)
    $escapedNodeUrl = [Security.SecurityElement]::Escape("http://127.0.0.1:$NodePort")
    $content = @"
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <webSocket enabled="true" />
    <handlers>
      <add name="iisnode-warmup" path="iis-startup.js" verb="*" modules="iisnode" resourceType="Unspecified" />
    </handlers>
    <iisnode watchedFiles="web.config;iis-startup.js" loggingEnabled="true" devErrorsEnabled="false" />
    <applicationInitialization doAppInitAfterRestart="true">
      <add initializationPage="/iis-startup.js" />
    </applicationInitialization>
    <urlCompression doStaticCompression="true" doDynamicCompression="true" />
    <rewrite>
      <rules>
        <rule name="NodeWarmupLocalOnly" stopProcessing="true">
          <match url="^iis-startup\.js$" />
          <conditions>
            <add input="{REMOTE_ADDR}" pattern="^(127\.0\.0\.1|::1)$" negate="true" />
          </conditions>
          <action type="CustomResponse" statusCode="404" statusReason="Not Found" statusDescription="Not Found" />
        </rule>
        <rule name="NodeWarmup" stopProcessing="true">
          <match url="^iis-startup\.js$" />
          <action type="Rewrite" url="iis-startup.js" />
        </rule>
        <rule name="SignalRHealth" stopProcessing="true">
          <match url="^signalr/?$" />
          <action type="Rewrite" url="signalr-health.json" />
        </rule>
        <rule name="ApiProxyToBackend" stopProcessing="true">
          <match url="^api/api-proxy(?:/(.*))?$" />
          <action type="Rewrite" url="$escapedBackendUrl/api/{R:1}" appendQueryString="true" />
        </rule>
        <rule name="SignalRToBackend" stopProcessing="true">
          <match url="^signalr/(.*)" />
          <action type="Rewrite" url="$escapedBackendUrl/{R:1}" appendQueryString="true" />
        </rule>
        <rule name="UploadsToBackend" stopProcessing="true">
          <match url="^uploads/(.*)" />
          <action type="Rewrite" url="$escapedBackendUrl/uploads/{R:1}" appendQueryString="true" />
        </rule>
        <rule name="NextJsReverseProxy" stopProcessing="true">
          <match url="(.*)" />
          <action type="Rewrite" url="$escapedNodeUrl/{R:1}" appendQueryString="true" />
        </rule>
      </rules>
    </rewrite>
    <security>
      <requestFiltering>
        <hiddenSegments>
          <add segment="node_modules" />
          <add segment="logs" />
        </hiddenSegments>
      </requestFiltering>
    </security>
  </system.webServer>
</configuration>
"@

    Set-Content -Path $Path -Value $content -Encoding UTF8
}

function Write-StaticAssetsWebConfig {
    param([string]$Path)

    $content = @"
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <staticContent>
      <clientCache cacheControlMode="UseMaxAge" cacheControlMaxAge="365.00:00:00" />
    </staticContent>
  </system.webServer>
</configuration>
"@

    Set-Content -Path $Path -Value $content -Encoding UTF8
}

function Write-SignalRHealthFile {
    param([string]$Path)

    Set-Content -Path $Path -Value '{ "status": "ok", "endpoint": "/signalr" }' -Encoding UTF8
}

function Write-FrontendStartScript {
    param(
        [string]$Path,
        [string]$TargetBackendUrl,
        [int]$NodePort,
        [string]$TargetTenantId
    )

    $TargetBackendUrl = $TargetBackendUrl.TrimEnd('/')
    $content = @"
@echo off
set PORT=$NodePort
set HOSTNAME=127.0.0.1
set NODE_ENV=production
set BACKEND_URL=$TargetBackendUrl
set NEXT_PUBLIC_API_URL=/api/api-proxy
set NEXT_PUBLIC_API_BASE_URL=
set NEXT_PUBLIC_SIGNALR_URL=/signalr
set PROXY_BUFFER_RESPONSES=true
set BFF_TRUST_UPSTREAM_FORWARDED_FOR=true
set TENANT_ID=$TargetTenantId
set NEXT_PUBLIC_TENANT_ID=
cd /d "%~dp0"
node server.js
"@

    Set-Content -Path $Path -Value $content -Encoding ASCII
}

function Write-FrontendNodeWarmupScript {
    param(
        [string]$Path,
        [string]$TargetBackendUrl,
        [int]$NodePort,
        [string]$TargetTenantId
    )

    $TargetBackendUrl = $TargetBackendUrl.TrimEnd('/')
    $backendLiteral = $TargetBackendUrl | ConvertTo-Json -Compress
    $tenantLiteral = $TargetTenantId | ConvertTo-Json -Compress
    $template = @'
"use strict";

const fs = require("fs");
const http = require("http");
const net = require("net");
const path = require("path");
const { spawn } = require("child_process");

const IISNODE_PORT = process.env.PORT;
const NODE_PORT = __NODE_PORT__;
const HOSTNAME = "127.0.0.1";
const BACKEND_URL = __BACKEND_URL__;
const TENANT_ID = __TENANT_ID__;
const ROOT = __dirname;
const SERVER_JS = path.join(ROOT, "server.js");
const LOG_DIR = path.join(ROOT, "logs");
const START_TIMEOUT_MS = 30000;
const WATCHDOG_INTERVAL_MS = 10000;

let startupPromise = null;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isNodePortOpen() {
    return new Promise((resolve) => {
        const socket = net.createConnection({ host: HOSTNAME, port: NODE_PORT });
        const finish = (result) => {
            socket.destroy();
            resolve(result);
        };

        socket.setTimeout(1000);
        socket.once("connect", () => finish(true));
        socket.once("timeout", () => finish(false));
        socket.once("error", () => finish(false));
    });
}

async function waitForNode() {
    const startedAt = Date.now();
    while (Date.now() - startedAt < START_TIMEOUT_MS) {
        if (await isNodePortOpen()) return true;
        await sleep(500);
    }

    return false;
}

function startNodeServer() {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    const stdout = fs.openSync(path.join(LOG_DIR, "node.out.log"), "a");
    const stderr = fs.openSync(path.join(LOG_DIR, "node.err.log"), "a");
    const env = {
        ...process.env,
        PORT: String(NODE_PORT),
        HOSTNAME,
        NODE_ENV: "production",
        BACKEND_URL,
        NEXT_PUBLIC_API_URL: "/api/api-proxy",
        NEXT_PUBLIC_SIGNALR_URL: "/signalr",
        PROXY_BUFFER_RESPONSES: "true",
        // Node listens on 127.0.0.1 behind ARR, which appends the client IP to X-Forwarded-For.
        BFF_TRUST_UPSTREAM_FORWARDED_FOR: "true",
        TENANT_ID,
    };

    delete env.NEXT_PUBLIC_API_BASE_URL;
    delete env.NEXT_PUBLIC_TENANT_ID;

    const child = spawn(process.execPath, [SERVER_JS], {
        cwd: ROOT,
        detached: true,
        env,
        stdio: ["ignore", stdout, stderr],
        windowsHide: true,
    });

    child.unref();
}

async function ensureNodeServer() {
    if (await isNodePortOpen()) {
        return { ready: true, alreadyRunning: true };
    }

    if (!startupPromise) {
        startupPromise = (async () => {
            startNodeServer();
            return await waitForNode();
        })().finally(() => {
            startupPromise = null;
        });
    }

    return { ready: await startupPromise, alreadyRunning: false };
}

const server = http.createServer(async (_req, res) => {
    try {
        const result = await ensureNodeServer();
        res.writeHead(result.ready ? 200 : 503, {
            "Content-Type": "application/json",
            "Cache-Control": "no-store, max-age=0, must-revalidate",
        });
        res.end(JSON.stringify({
            status: result.ready ? "ok" : "starting",
            port: NODE_PORT,
            alreadyRunning: result.alreadyRunning,
        }));
    } catch (error) {
        res.writeHead(500, {
            "Content-Type": "application/json",
            "Cache-Control": "no-store, max-age=0, must-revalidate",
        });
        res.end(JSON.stringify({ status: "error", message: error.message }));
    }
});

if (!IISNODE_PORT) {
    console.error("iisnode did not provide a PORT value.");
    process.exit(1);
}

setInterval(() => {
    ensureNodeServer().catch((error) => {
        console.error(`Node watchdog failed: ${error.message}`);
    });
}, WATCHDOG_INTERVAL_MS);

server.listen(IISNODE_PORT);
'@

    $content = $template.
        Replace("__NODE_PORT__", [string]$NodePort).
        Replace("__BACKEND_URL__", $backendLiteral).
        Replace("__TENANT_ID__", $tenantLiteral)
    Set-Content -Path $Path -Value $content -Encoding ASCII
}

function Invoke-TargetCommand {
    param(
        $Session,
        [scriptblock]$ScriptBlock,
        [object[]]$ArgumentList = @()
    )

    if ($null -ne $Session) {
        Invoke-Command -Session $Session -ScriptBlock $ScriptBlock -ArgumentList $ArgumentList
        return
    }

    & $ScriptBlock @ArgumentList
}

function New-TargetSession {
    if (-not $IsRemoteDeployment) {
        return $null
    }

    if ($null -ne $Credential) {
        return New-PSSession -ComputerName $ComputerName -Credential $Credential
    }

    return New-PSSession -ComputerName $ComputerName
}

function Initialize-TargetIis {
    param($Session)

    Invoke-TargetCommand -Session $Session -ScriptBlock {
        $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
        $principal = [Security.Principal.WindowsPrincipal]::new($identity)
        if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
            throw "The IIS target session must run as Administrator."
        }

        try {
            Import-Module WebAdministration -ErrorAction Stop
        }
        catch {
            throw "IIS PowerShell module 'WebAdministration' is missing on the deployment target. Install IIS Management Scripts and Tools (Windows Server: Install-WindowsFeature Web-Scripting-Tools), then rerun the script."
        }

        $failures = [System.Collections.Generic.List[string]]::new()

        function Require-GlobalModule {
            param(
                [string]$Name,
                [string]$InstallHint
            )

            $module = Get-WebGlobalModule |
                Where-Object { $_.Name -eq $Name } |
                Select-Object -First 1
            if ($null -eq $module) {
                $failures.Add("$Name is missing. $InstallHint") | Out-Null
            }
        }

        Require-GlobalModule -Name "RewriteModule" -InstallHint "Install IIS URL Rewrite Module 2.x."
        Require-GlobalModule -Name "ApplicationInitializationModule" -InstallHint "Install the IIS Application Initialization role service."
        Require-GlobalModule -Name "WebSocketModule" -InstallHint "Install the IIS WebSocket Protocol role service."
        Require-GlobalModule -Name "StaticCompressionModule" -InstallHint "Install the IIS Static Content Compression role service."
        Require-GlobalModule -Name "DynamicCompressionModule" -InstallHint "Install the IIS Dynamic Content Compression role service."
        Require-GlobalModule -Name "iisnode" -InstallHint "Install iisnode for the Node warmup bootstrapper."

        if ($null -eq (Get-Command node -ErrorAction SilentlyContinue)) {
            $failures.Add("node.exe is not available on PATH for the IIS target user. Install Node.js LTS and reopen the admin shell/session.") | Out-Null
        }

        try {
            Get-WebConfigurationProperty `
                -PSPath "MACHINE/WEBROOT/APPHOST" `
                -Filter "system.webServer/proxy" `
                -Name "enabled" `
                -ErrorAction Stop | Out-Null
        }
        catch {
            $failures.Add("ARR proxy configuration section is missing. Install Application Request Routing 3.x.") | Out-Null
        }

        if ($failures.Count -gt 0) {
            throw "IIS prerequisite validation failed:`n - $($failures -join "`n - ")"
        }

        Set-WebConfigurationProperty `
            -PSPath "MACHINE/WEBROOT/APPHOST" `
            -Filter "system.webServer/proxy" `
            -Name "enabled" `
            -Value "True"
        Set-WebConfigurationProperty `
            -PSPath "MACHINE/WEBROOT/APPHOST" `
            -Filter "system.webServer/proxy" `
            -Name "preserveHostHeader" `
            -Value "True"
        Set-WebConfigurationProperty `
            -PSPath "MACHINE/WEBROOT/APPHOST" `
            -Filter "system.webServer/proxy" `
            -Name "reverseRewriteHostInResponseHeaders" `
            -Value "False"
        Set-WebConfigurationProperty `
            -PSPath "MACHINE/WEBROOT/APPHOST" `
            -Filter "system.webServer/webSocket" `
            -Name "enabled" `
            -Value "True"
    }
}

function Set-TargetAppPoolAlwaysOn {
    param(
        $Session,
        [string]$Name
    )

    Invoke-TargetCommand -Session $Session -ScriptBlock {
        param([string]$Name)

        Import-Module WebAdministration
        if (-not (Test-Path "IIS:\AppPools\$Name")) {
            return
        }

        Set-ItemProperty "IIS:\AppPools\$Name" -Name managedRuntimeVersion -Value ""
        Set-ItemProperty "IIS:\AppPools\$Name" -Name startMode -Value "AlwaysRunning"
        Set-ItemProperty "IIS:\AppPools\$Name" -Name processModel.idleTimeout -Value ([TimeSpan]::Zero)
        Set-ItemProperty "IIS:\AppPools\$Name" -Name recycling.periodicRestart.time -Value ([TimeSpan]::Zero)
    } -ArgumentList @($Name)
}

function Enable-TargetSitePreload {
    param(
        $Session,
        [string]$Name
    )

    Invoke-TargetCommand -Session $Session -ScriptBlock {
        param([string]$Name)

        Import-Module WebAdministration
        if (-not (Test-Path "IIS:\Sites\$Name")) {
            return
        }

        Set-WebConfigurationProperty `
            -PSPath "MACHINE/WEBROOT/APPHOST" `
            -Filter "system.applicationHost/sites/site[@name='$Name']/application[@path='/']" `
            -Name "preloadEnabled" `
            -Value "True"
    } -ArgumentList @($Name)
}

function Stop-TargetAppPoolIfExists {
    param(
        $Session,
        [string]$Name
    )

    Invoke-TargetCommand -Session $Session -ScriptBlock {
        param([string]$Name)

        Import-Module WebAdministration
        if (Test-Path "IIS:\AppPools\$Name") {
            $state = (Get-WebAppPoolState -Name $Name).Value
            if ($state -ne "Stopped") {
                Stop-WebAppPool -Name $Name
            }
        }
    } -ArgumentList @($Name)
}

function Start-TargetAppPoolIfExists {
    param(
        $Session,
        [string]$Name
    )

    Invoke-TargetCommand -Session $Session -ScriptBlock {
        param([string]$Name)

        Import-Module WebAdministration
        if (Test-Path "IIS:\AppPools\$Name") {
            $state = (Get-WebAppPoolState -Name $Name).Value
            if ($state -ne "Started") {
                Start-WebAppPool -Name $Name
            }
        }
    } -ArgumentList @($Name)
}

function Ensure-TargetFrontendSite {
    param(
        $Session,
        [string]$SiteName,
        [string]$AppPoolName,
        [string]$PhysicalPath,
        [int]$Port
    )

    Invoke-TargetCommand -Session $Session -ScriptBlock {
        param(
            [string]$SiteName,
            [string]$AppPoolName,
            [string]$PhysicalPath,
            [int]$Port
        )

        Import-Module WebAdministration
        New-Item -ItemType Directory -Path $PhysicalPath -Force | Out-Null

        $portPattern = ":{0}:" -f $Port
        $conflictingBinding = Get-WebBinding -Protocol "http" |
            Where-Object {
                $_.bindingInformation -match $portPattern -and
                $_.ItemXPath -notmatch ("name='{0}'" -f [Regex]::Escape($SiteName))
            } |
            Select-Object -First 1

        if ($null -ne $conflictingBinding) {
            throw "Port $Port is already bound to another IIS site. Remove that binding or choose another frontend port."
        }

        if (-not (Test-Path "IIS:\AppPools\$AppPoolName")) {
            New-WebAppPool -Name $AppPoolName | Out-Null
        }

        Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name managedRuntimeVersion -Value ""
        Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name startMode -Value "AlwaysRunning"
        Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name processModel.idleTimeout -Value ([TimeSpan]::Zero)
        Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name recycling.periodicRestart.time -Value ([TimeSpan]::Zero)

        if (-not (Test-Path "IIS:\Sites\$SiteName")) {
            New-Website -Name $SiteName -PhysicalPath $PhysicalPath -Port $Port -ApplicationPool $AppPoolName | Out-Null
        }
        else {
            Set-ItemProperty "IIS:\Sites\$SiteName" -Name physicalPath -Value $PhysicalPath
            Set-ItemProperty "IIS:\Sites\$SiteName" -Name applicationPool -Value $AppPoolName
        }

        $hasPortBinding = Get-WebBinding -Name $SiteName -Protocol "http" |
            Where-Object { $_.bindingInformation -match $portPattern }

        if (-not $hasPortBinding) {
            New-WebBinding -Name $SiteName -Protocol "http" -IPAddress "*" -Port $Port | Out-Null
        }

        Set-WebConfigurationProperty `
            -PSPath "MACHINE/WEBROOT/APPHOST" `
            -Filter "system.applicationHost/sites/site[@name='$SiteName']/application[@path='/']" `
            -Name "preloadEnabled" `
            -Value "True"
    } -ArgumentList @($SiteName, $AppPoolName, $PhysicalPath, $Port)
}

function Get-TargetWebsitePath {
    param(
        $Session,
        [string]$Name
    )

    Invoke-TargetCommand -Session $Session -ScriptBlock {
        param([string]$Name)

        Import-Module WebAdministration
        if (Test-Path "IIS:\Sites\$Name") {
            return (Get-Website -Name $Name).PhysicalPath
        }

        return $null
    } -ArgumentList @($Name)
}

function Stop-TargetNodeOnPort {
    param(
        $Session,
        [int]$Port
    )

    Invoke-TargetCommand -Session $Session -ScriptBlock {
        param([int]$Port)

        $listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        foreach ($listener in $listeners) {
            $process = Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue
            if ($null -eq $process) {
                continue
            }

            if ($process.ProcessName -notin @("node", "nodejs")) {
                throw "Port $Port is already used by '$($process.ProcessName)' (PID $($process.Id)); refusing to stop a non-Node process."
            }

            Stop-Process -Id $process.Id -Force
        }
    } -ArgumentList @($Port)
}

function Invoke-TargetHttpCheck {
    param(
        $Session,
        [string]$Name,
        [string]$Uri,
        [string]$Method = "GET",
        [hashtable]$Headers = @{},
        [int[]]$ExpectedStatusCodes = @(200)
    )

    $result = Invoke-TargetCommand -Session $Session -ScriptBlock {
        param(
            [string]$Name,
            [string]$Uri,
            [string]$Method,
            [hashtable]$Headers,
            [int[]]$ExpectedStatusCodes
        )

        try {
            $response = Invoke-WebRequest `
                -UseBasicParsing `
                -Uri $Uri `
                -Method $Method `
                -Headers $Headers `
                -TimeoutSec 30 `
                -ErrorAction Stop
            $statusCode = [int]$response.StatusCode
        }
        catch {
            $response = $_.Exception.Response
            if ($null -eq $response) {
                throw "$Name failed: $($_.Exception.Message)"
            }

            $statusCode = [int]$response.StatusCode
        }

        if ($ExpectedStatusCodes -notcontains $statusCode) {
            throw "$Name failed: $Uri returned HTTP $statusCode; expected $($ExpectedStatusCodes -join ', ')."
        }

        return [pscustomobject]@{
            Name = $Name
            Uri = $Uri
            StatusCode = $statusCode
        }
    } -ArgumentList @($Name, $Uri, $Method, $Headers, $ExpectedStatusCodes)

    Write-Host "$($result.Name): HTTP $($result.StatusCode) $($result.Uri)" -ForegroundColor Green
}

function New-RemoteTempRoot {
    param($Session)

    Invoke-Command -Session $Session -ScriptBlock {
        $path = Join-Path $env:TEMP ("pos-iis-deploy-" + [Guid]::NewGuid().ToString("N"))
        New-Item -ItemType Directory -Path $path -Force | Out-Null
        return $path
    }
}

function Invoke-ZipDeployToRemote {
    param(
        $Session,
        [string]$ZipPath,
        [string]$RemoteTempRoot,
        [string]$TargetPath,
        [string[]]$ExcludeDirectories = @()
    )

    $remoteZipPath = Join-Path $RemoteTempRoot (Split-Path $ZipPath -Leaf)
    Copy-Item -LiteralPath $ZipPath -Destination $remoteZipPath -ToSession $Session -Force

    $argumentList = [System.Collections.Generic.List[object]]::new()
    $argumentList.Add($remoteZipPath) | Out-Null
    $argumentList.Add($TargetPath) | Out-Null
    $argumentList.Add([string[]]$ExcludeDirectories) | Out-Null

    Invoke-Command -Session $Session -ScriptBlock {
        param(
            [string]$ZipPath,
            [string]$TargetPath,
            [string[]]$ExcludeDirectories
        )

        function Assert-DeployTargetPath {
            param([string]$Path)

            if ([string]::IsNullOrWhiteSpace($Path) -or -not [IO.Path]::IsPathRooted($Path)) {
                throw "IIS deployment path must be an absolute path."
            }

            $fullPath = [IO.Path]::GetFullPath($Path).TrimEnd('\')
            $rootPath = [IO.Path]::GetPathRoot($fullPath).TrimEnd('\')
            if ($fullPath -eq $rootPath) {
                throw "Refusing to mirror deployment package into drive root: $fullPath"
            }

            $blockedPaths = @($env:windir, $env:SystemRoot, $env:ProgramFiles, ${env:ProgramFiles(x86)}) |
                Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
                ForEach-Object { [IO.Path]::GetFullPath($_).TrimEnd('\') }

            foreach ($blockedPath in $blockedPaths) {
                if ($fullPath.Equals($blockedPath, [StringComparison]::OrdinalIgnoreCase) -or
                    $fullPath.StartsWith("$blockedPath\", [StringComparison]::OrdinalIgnoreCase)) {
                    throw "Refusing to mirror deployment package into protected path: $fullPath"
                }
            }
        }

        function Invoke-RobocopyMirrorOnTarget {
            param(
                [string]$Source,
                [string]$Target,
                [string[]]$ExcludeDirectories = @()
            )

            New-Item -ItemType Directory -Path $Target -Force | Out-Null

            $args = @(
                $Source,
                $Target,
                "/MIR",
                "/NFL",
                "/NDL",
                "/NJH",
                "/NJS",
                "/NC",
                "/NS",
                "/NP"
            )

            if ($ExcludeDirectories.Count -gt 0) {
                $args += "/XD"
                $args += $ExcludeDirectories
            }

            & robocopy @args
            if ($LASTEXITCODE -gt 7) {
                throw "Robocopy failed from $Source to $Target with exit code $LASTEXITCODE."
            }
        }

        Assert-DeployTargetPath -Path $TargetPath

        $packageDir = Join-Path (Split-Path $ZipPath -Parent) ([IO.Path]::GetFileNameWithoutExtension($ZipPath))
        if (Test-Path $packageDir) {
            Remove-Item -LiteralPath $packageDir -Recurse -Force
        }

        New-Item -ItemType Directory -Path $packageDir -Force | Out-Null
        Expand-Archive -LiteralPath $ZipPath -DestinationPath $packageDir -Force
        Invoke-RobocopyMirrorOnTarget -Source $packageDir -Target $TargetPath -ExcludeDirectories $ExcludeDirectories
    } -ArgumentList $argumentList.ToArray()
}

function Invoke-PackageDeploy {
    param(
        $Session,
        [string]$PackagePath,
        [string]$ZipPath,
        [string]$TargetPath,
        [string[]]$ExcludeDirectories = @(),
        [string]$RemoteTempRoot
    )

    if ($null -ne $Session) {
        Invoke-ZipDeployToRemote -Session $Session -ZipPath $ZipPath -RemoteTempRoot $RemoteTempRoot -TargetPath $TargetPath -ExcludeDirectories $ExcludeDirectories
        return
    }

    Invoke-RobocopyMirror -Source $PackagePath -Target $TargetPath -ExcludeDirectories $ExcludeDirectories
}

function Restore-BuildEnvironment {
    param([hashtable]$PreviousValues)

    foreach ($name in $PreviousValues.Keys) {
        if ($null -eq $PreviousValues[$name]) {
            Remove-Item "Env:\$name" -ErrorAction SilentlyContinue
            continue
        }

        Set-Item "Env:\$name" $PreviousValues[$name]
    }
}

New-Item -ItemType Directory -Path $BuildRoot -Force | Out-Null

if (-not $PackageOnly -and -not $IsRemoteDeployment) {
    Assert-Admin
    Assert-LocalWebAdministrationModule
}

if ($DeployBackend) {
    Write-Host "========== STEP 1: Publishing Backend ==========" -ForegroundColor Cyan
    Remove-DirectoryIfExists -Path $BackendPackage -RequiredParent $BuildRoot
    dotnet publish (Join-Path $BackendProject "RestaurantPos.Api.csproj") -c Release -o $BackendPackage
    if ($LASTEXITCODE -ne 0) { throw "BACKEND PUBLISH FAILED" }
}
else {
    Write-Host "========== STEP 1: Skipping Backend ==========" -ForegroundColor Cyan
}

Write-Host "========== STEP 2: Building Next.js ==========" -ForegroundColor Cyan
Remove-DirectoryIfExists -Path (Join-Path $FrontendProject ".next") -RequiredParent $FrontendProject
$previousEnv = @{
    NODE_ENV = $env:NODE_ENV
    NEXT_PUBLIC_API_URL = $env:NEXT_PUBLIC_API_URL
    NEXT_PUBLIC_API_BASE_URL = $env:NEXT_PUBLIC_API_BASE_URL
    NEXT_PUBLIC_SIGNALR_URL = $env:NEXT_PUBLIC_SIGNALR_URL
    BACKEND_URL = $env:BACKEND_URL
    PROXY_BUFFER_RESPONSES = $env:PROXY_BUFFER_RESPONSES
    TENANT_ID = $env:TENANT_ID
    NEXT_PUBLIC_TENANT_ID = $env:NEXT_PUBLIC_TENANT_ID
}

Push-Location $FrontendProject
try {
    $env:NODE_ENV = "production"
    $env:NEXT_PUBLIC_API_URL = "/api/api-proxy"
    $env:NEXT_PUBLIC_API_BASE_URL = ""
    $env:NEXT_PUBLIC_SIGNALR_URL = "/signalr"
    $env:BACKEND_URL = $BackendUrl
    $env:PROXY_BUFFER_RESPONSES = "true"
    $env:TENANT_ID = $TenantId
    $env:NEXT_PUBLIC_TENANT_ID = ""
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "FRONTEND BUILD FAILED" }
}
finally {
    Pop-Location
    Restore-BuildEnvironment -PreviousValues $previousEnv
}

Write-Host "========== STEP 3: Creating deploy packages ==========" -ForegroundColor Cyan
Remove-DirectoryIfExists -Path $FrontendPackage -RequiredParent $BuildRoot
Remove-FileIfExists -Path $BackendZip
Remove-FileIfExists -Path $FrontendZip
New-Item -ItemType Directory -Path $FrontendPackage -Force | Out-Null

Invoke-RobocopyMirror -Source (Join-Path $FrontendProject ".next\standalone") -Target $FrontendPackage
Invoke-RobocopyMirror -Source (Join-Path $FrontendProject ".next\static") -Target (Join-Path $FrontendPackage ".next\static")
if (Test-Path (Join-Path $FrontendProject "public")) {
    Invoke-RobocopyMirror -Source (Join-Path $FrontendProject "public") -Target (Join-Path $FrontendPackage "public")
}
Write-FrontendWebConfig -Path (Join-Path $FrontendPackage "web.config") -TargetBackendUrl $BackendUrl -NodePort $FrontendNodePort
Write-FrontendStartScript -Path (Join-Path $FrontendPackage "start-pos-frontend.cmd") -TargetBackendUrl $BackendUrl -NodePort $FrontendNodePort -TargetTenantId $TenantId
Write-FrontendNodeWarmupScript -Path (Join-Path $FrontendPackage "iis-startup.js") -TargetBackendUrl $BackendUrl -NodePort $FrontendNodePort -TargetTenantId $TenantId
Write-SignalRHealthFile -Path (Join-Path $FrontendPackage "signalr-health.json")
Write-StaticAssetsWebConfig -Path (Join-Path $FrontendPackage ".next\static\web.config")

if ($DeployBackend) {
    Compress-Archive -Path "$BackendPackage\*" -DestinationPath $BackendZip -Force
    $backendSize = [math]::Round((Get-Item $BackendZip).Length / 1MB, 2)
    Write-Host "backend-iis.zip created: $backendSize MB" -ForegroundColor Green
}

Compress-Archive -Path "$FrontendPackage\*" -DestinationPath $FrontendZip -Force
$frontendSize = [math]::Round((Get-Item $FrontendZip).Length / 1MB, 2)
Write-Host "frontend-iis.zip created: $frontendSize MB" -ForegroundColor Green

if ($PackageOnly) {
    Write-Host "Package-only build complete. Copy this file to the IIS server:" -ForegroundColor Green
    Write-Host $FrontendZip -ForegroundColor Green
    return
}

$targetSession = $null
$remoteTempRoot = $null
try {
    $targetSession = New-TargetSession
    Initialize-TargetIis -Session $targetSession

    if ($IsRemoteDeployment) {
        $remoteTempRoot = New-RemoteTempRoot -Session $targetSession
        Write-Host "Remote temp path: $remoteTempRoot" -ForegroundColor DarkGray
    }

    Write-Host "========== STEP 4: Stopping IIS app pools ==========" -ForegroundColor Cyan
    Ensure-TargetFrontendSite -Session $targetSession -SiteName $FrontendSiteName -AppPoolName $FrontendAppPool -PhysicalPath $FrontendIisPath -Port $FrontendPort
    if ($DeployBackend) {
        Set-TargetAppPoolAlwaysOn -Session $targetSession -Name $BackendAppPool
        Enable-TargetSitePreload -Session $targetSession -Name $BackendSiteName
    }
    Stop-TargetAppPoolIfExists -Session $targetSession -Name $FrontendAppPool
    Stop-TargetNodeOnPort -Session $targetSession -Port $FrontendNodePort
    if ($DeployBackend) {
        Stop-TargetAppPoolIfExists -Session $targetSession -Name $BackendAppPool
    }

    Write-Host "========== STEP 5: Deploying to IIS ==========" -ForegroundColor Cyan
    if ($DeployBackend) {
        Invoke-PackageDeploy -Session $targetSession -PackagePath $BackendPackage -ZipPath $BackendZip -TargetPath $BackendIisPath -RemoteTempRoot $remoteTempRoot -ExcludeDirectories @(
            (Join-Path $BackendIisPath "wwwroot\uploads"),
            (Join-Path $BackendIisPath "logs")
        )
    }

    Invoke-PackageDeploy -Session $targetSession -PackagePath $FrontendPackage -ZipPath $FrontendZip -TargetPath $FrontendIisPath -RemoteTempRoot $remoteTempRoot -ExcludeDirectories @(
        (Join-Path $FrontendIisPath "iisnode"),
        (Join-Path $FrontendIisPath "logs")
    )

    Write-Host "========== STEP 6: Starting IIS app pools ==========" -ForegroundColor Cyan
    if ($DeployBackend) {
        Start-TargetAppPoolIfExists -Session $targetSession -Name $BackendAppPool
    }
    Start-TargetAppPoolIfExists -Session $targetSession -Name $FrontendAppPool

    Write-Host "========== STEP 7: Verifying ==========" -ForegroundColor Cyan
    $healthHeaders = @{ "X-Tenant-ID" = $TenantId }
    $localFrontendUrl = "http://127.0.0.1:$FrontendPort"
    $localNodeUrl = "http://127.0.0.1:$FrontendNodePort"
    $backendHealthUrl = "$($BackendUrl.TrimEnd('/'))/api/health"

    Invoke-TargetHttpCheck -Session $targetSession -Name "Backend direct health" -Uri $backendHealthUrl -Headers $healthHeaders
    Invoke-TargetHttpCheck -Session $targetSession -Name "Node warmup" -Uri "$localFrontendUrl/iis-startup.js" -Headers $healthHeaders
    Invoke-TargetHttpCheck -Session $targetSession -Name "Frontend via IIS" -Uri "$localFrontendUrl/" -Headers $healthHeaders -ExpectedStatusCodes @(200, 301, 302, 307, 308)
    Invoke-TargetHttpCheck -Session $targetSession -Name "Frontend Node direct" -Uri "$localNodeUrl/" -Headers $healthHeaders -ExpectedStatusCodes @(200, 301, 302, 307, 308)
    Invoke-TargetHttpCheck -Session $targetSession -Name "API reverse proxy" -Uri "$localFrontendUrl/api/api-proxy/health" -Headers $healthHeaders
    Invoke-TargetHttpCheck -Session $targetSession -Name "SignalR public health" -Uri "$localFrontendUrl/signalr" -Headers $healthHeaders
    Invoke-TargetHttpCheck -Session $targetSession -Name "SignalR negotiate through IIS" -Uri "$localFrontendUrl/signalr/kitchenHub/negotiate?negotiateVersion=1" -Method "POST" -Headers $healthHeaders

    if ($DeployBackend) {
        $backendPath = Get-TargetWebsitePath -Session $targetSession -Name $BackendSiteName
        if ($null -ne $backendPath) {
            Write-Host "Backend IIS path: $backendPath" -ForegroundColor Green
        }
        else {
            Write-Host "Backend site '$BackendSiteName' not found. Create/bind it in IIS Manager." -ForegroundColor Yellow
        }
    }

    $frontendPath = Get-TargetWebsitePath -Session $targetSession -Name $FrontendSiteName
    if ($null -ne $frontendPath) {
        Write-Host "Frontend IIS path: $frontendPath" -ForegroundColor Green
        Write-Host "Frontend URL: $localFrontendUrl" -ForegroundColor Green
        Write-Host "Frontend Node URL: $localNodeUrl" -ForegroundColor Green
    }
    else {
        Write-Host "Frontend site '$FrontendSiteName' not found. Create/bind it in IIS Manager." -ForegroundColor Yellow
    }

    Write-Host "Deployment complete." -ForegroundColor Green
}
finally {
    if ($null -ne $targetSession -and -not [string]::IsNullOrWhiteSpace($remoteTempRoot)) {
        Invoke-Command -Session $targetSession -ScriptBlock {
            param([string]$Path)
            if (Test-Path $Path) {
                Remove-Item -LiteralPath $Path -Recurse -Force
            }
        } -ArgumentList $remoteTempRoot
    }

    if ($null -ne $targetSession) {
        Remove-PSSession -Session $targetSession
    }
}
