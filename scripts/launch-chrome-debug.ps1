# Launch Chrome with Remote Debugging for Playwright
# This script restarts Chrome with --remote-debugging-port=9222
# Your existing Chrome profile (cookies, sessions) is preserved.

$ErrorActionPreference = "Stop"

$ChromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $ChromePath)) {
    $ChromePath = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
}
if (-not (Test-Path $ChromePath)) {
    Write-Error "Chrome not found. Please update the path in this script."
    exit 1
}

# Get default Chrome profile
$UserDataDir = "$env:LOCALAPPDATA\Google\Chrome\User Data"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " SAP Fiori Playwright Test Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Chrome is already running with debug port
try {
    $response = Invoke-WebRequest -Uri "http://localhost:9222/json/version" -UseBasicParsing -TimeoutSec 2
    Write-Host "[OK] Chrome is already running with debug port 9222" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now run tests:" -ForegroundColor Yellow
    Write-Host "  cd C:\Users\14754\SAP\Saplearning" -ForegroundColor White
    Write-Host "  npx playwright test" -ForegroundColor White
    exit 0
} catch {
    Write-Host "Chrome is not running with debug port. Starting..." -ForegroundColor Yellow
}

# Kill any existing Chrome
Write-Host "Closing existing Chrome instances..." -ForegroundColor Yellow
Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Launch Chrome with debug port
$Arguments = @(
    "--remote-debugging-port=9222",
    "--remote-allow-origins=*",
    "--user-data-dir=`"$UserDataDir`"",
    "https://vhbrbws1wd01.hec.bridgebio.com:44380/sap/bc/ui2/flp?saml2=disabled&sap-client=400&sap-language=EN#ZLEARNING-display"
)

Write-Host "Launching Chrome with remote debugging..." -ForegroundColor Yellow
Start-Process -FilePath $ChromePath -ArgumentList $Arguments

# Wait for debug port
Write-Host "Waiting for Chrome debug port..." -ForegroundColor Yellow
$maxRetries = 15
for ($i = 1; $i -le $maxRetries; $i++) {
    Start-Sleep -Seconds 1
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:9222/json/version" -UseBasicParsing -TimeoutSec 2
        Write-Host "[OK] Chrome debug port is ready!" -ForegroundColor Green
        break
    } catch {
        if ($i -eq $maxRetries) {
            Write-Error "Chrome debug port did not become available after $maxRetries seconds"
            exit 1
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " NEXT STEPS:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "1. Log in to SAP in the Chrome window" -ForegroundColor White
Write-Host "2. Wait for the app to fully load" -ForegroundColor White
Write-Host "3. Run the tests:" -ForegroundColor White
Write-Host "   cd C:\Users\14754\SAP\Saplearning" -ForegroundColor Yellow
Write-Host "   npx playwright test" -ForegroundColor Yellow
Write-Host ""
