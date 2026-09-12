param(
    [string]$SiteName = "POS-Frontend",
    [string]$AppPoolName = "POS-Frontend",
    [string]$PhysicalPath = "",
    [int]$Port = 81
)

$ErrorActionPreference = "Stop"

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw "Run this script as Administrator."
}

if ([string]::IsNullOrWhiteSpace($PhysicalPath)) {
    $PhysicalPath = $PSScriptRoot
}

Import-Module WebAdministration
New-Item -ItemType Directory -Path $PhysicalPath -Force | Out-Null

$portPattern = ":{0}:" -f $Port
$siteXPathPattern = "@name='{0}'" -f [Regex]::Escape($SiteName)
$conflictingBinding = Get-WebBinding -Protocol "http" |
    Where-Object {
        $_.bindingInformation -match $portPattern -and
        $_.ItemXPath -notmatch $siteXPathPattern
    } |
    Select-Object -First 1

if ($null -ne $conflictingBinding) {
    throw "Port $Port is already bound to another IIS site. Remove that binding or choose another frontend port."
}

if (-not (Test-Path "IIS:\AppPools\$AppPoolName")) {
    New-WebAppPool -Name $AppPoolName | Out-Null
    Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name managedRuntimeVersion -Value ""
}

if (-not (Test-Path "IIS:\Sites\$SiteName")) {
    New-Website -Name $SiteName -PhysicalPath $PhysicalPath -Port $Port -ApplicationPool $AppPoolName | Out-Null
}
else {
    Set-ItemProperty "IIS:\Sites\$SiteName" -Name physicalPath -Value $PhysicalPath
    Set-ItemProperty "IIS:\Sites\$SiteName" -Name applicationPool -Value $AppPoolName

    $hasPortBinding = Get-WebBinding -Name $SiteName -Protocol "http" |
        Where-Object { $_.bindingInformation -match $portPattern }

    if (-not $hasPortBinding) {
        New-WebBinding -Name $SiteName -Protocol "http" -IPAddress "*" -Port $Port | Out-Null
    }
}

try {
    Set-WebConfigurationProperty -PSPath "MACHINE/WEBROOT/APPHOST" -Filter "system.webServer/proxy" -Name "enabled" -Value "True"
}
catch {
    Write-Warning "ARR proxy setting was not updated. Install IIS Application Request Routing and enable proxy in IIS Manager."
}

Start-WebAppPool -Name $AppPoolName
Start-Website -Name $SiteName

Write-Host "Frontend IIS site ready: http://localhost:$Port" -ForegroundColor Green
