# SAP Fiori Playwright Test Runner
# Connects to Chrome via CDP and runs all 220 test cases
#
# USAGE:
#   .\scripts\run-tests.ps1              # Run all tests
#   .\scripts\run-tests.ps1 -File "01"   # Run only home page tests
#   .\scripts\run-tests.ps1 -Headed      # With headed mode (default since CDP)

param(
    [string]$File = "",
    [switch]$Headed,
    [switch]$Debug
)

$ErrorActionPreference = "Stop"
Set-Location "C:\Users\14754\SAP\Saplearning"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " SAP Fiori Learning App - Playwright Tests" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check if Chrome debug port is available
Write-Host "[1/3] Checking Chrome debug port..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:9222/json/version" -UseBasicParsing -TimeoutSec 3
    $version = ($response.Content | ConvertFrom-Json).'Browser'
    Write-Host "  [OK] Connected to: $version" -ForegroundColor Green
} catch {
    Write-Host "  [FAIL] Chrome debug port not available!" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Please run first:" -ForegroundColor Yellow
    Write-Host "    .\scripts\launch-chrome-debug.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "  Then log in to SAP and wait for the app to load." -ForegroundColor Yellow
    exit 1
}

# 2. Check that SAP app tab exists
Write-Host "[2/3] Looking for SAP app tab..." -ForegroundColor Yellow
try {
    $tabs = Invoke-WebRequest -Uri "http://localhost:9222/json" -UseBasicParsing -TimeoutSec 3
    $tabList = $tabs.Content | ConvertFrom-Json
    $sapTab = $tabList | Where-Object { $_.url -like "*ZLEARNING*" -or $_.url -like "*flp*" }
    
    if ($sapTab) {
        Write-Host "  [OK] Found SAP app tab: $($sapTab[0].title)" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] No SAP tab found. Tests will navigate to the app." -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [WARN] Could not check tabs" -ForegroundColor Yellow
}

# 3. Run tests
Write-Host "[3/3] Running Playwright tests..." -ForegroundColor Yellow
Write-Host ""

$testCmd = "npx playwright test"

if ($File) {
    $testCmd += " tests/$File*"
}

if ($Debug) {
    $testCmd += " --debug"
}

# Always use list reporter for visibility
$testCmd += " --reporter=list"

Write-Host "Command: $testCmd" -ForegroundColor DarkGray
Write-Host ""

Invoke-Expression $testCmd

$exitCode = $LASTEXITCODE

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
if ($exitCode -eq 0) {
    Write-Host " ALL TESTS PASSED" -ForegroundColor Green
} else {
    Write-Host " SOME TESTS FAILED (exit code: $exitCode)" -ForegroundColor Red
    Write-Host " Run with -Debug flag for interactive debugging" -ForegroundColor Yellow
}
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "View HTML report: npx playwright show-report" -ForegroundColor Gray
