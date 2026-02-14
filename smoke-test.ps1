<#
.SYNOPSIS
    Pre-deployment smoke test for SAP Learning Courses Platform.
    Runs CDS build, UI5 build, and verifies deployment artifacts.

.DESCRIPTION
    Validates that:
    1. CDS build succeeds (schema + service compile)
    2. UI5 build succeeds (Component-preload.js generated)
    3. Z_COURSES_UI.zip exists in build output
    4. No inline scripts in built index.html (CSP compliance)
    5. No dummy/mock auth in production config

.EXAMPLE
    .\smoke-test.ps1
#>

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot
if (-not $ProjectRoot) { $ProjectRoot = Get-Location }

# Resolve paths
$AppRoot = Join-Path $ProjectRoot "app" "z.sap.courses"
$DistDir = Join-Path $AppRoot "dist"

$passed = 0
$failed = 0
$warnings = 0

function Write-TestResult {
    param([string]$Name, [bool]$Success, [string]$Detail = "")
    if ($Success) {
        Write-Host "  [PASS] $Name" -ForegroundColor Green
        $script:passed++
    } else {
        Write-Host "  [FAIL] $Name - $Detail" -ForegroundColor Red
        $script:failed++
    }
}

function Write-TestWarning {
    param([string]$Name, [string]$Detail)
    Write-Host "  [WARN] $Name - $Detail" -ForegroundColor Yellow
    $script:warnings++
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " SAP Learning Platform - Smoke Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ─────────────────────────────────────────────────
# 1. CDS Build
# ─────────────────────────────────────────────────
Write-Host "[1/5] CDS Build..." -ForegroundColor White
Push-Location $ProjectRoot
try {
    $cdsOutput = & node "node_modules\@sap\cds-dk\bin\cds.js" build --production 2>&1 | Out-String
    if ($LASTEXITCODE -eq 0) {
        Write-TestResult "CDS build completed" $true
    } else {
        Write-TestResult "CDS build completed" $false "Exit code: $LASTEXITCODE"
        Write-Host $cdsOutput -ForegroundColor Gray
    }
} catch {
    Write-TestResult "CDS build completed" $false $_.Exception.Message
}
Pop-Location

# ─────────────────────────────────────────────────
# 2. UI5 Build
# ─────────────────────────────────────────────────
Write-Host "[2/5] UI5 Build..." -ForegroundColor White
Push-Location $AppRoot
try {
    # Check if ui5 CLI is available
    $ui5Bin = Join-Path $AppRoot "node_modules" ".bin" "ui5.cmd"
    if (-not (Test-Path $ui5Bin)) {
        $ui5Bin = "ui5"  # Try global
    }
    $ui5Output = & $ui5Bin build --config=ui5.yaml --clean-dest --dest dist 2>&1 | Out-String
    if ($LASTEXITCODE -eq 0) {
        Write-TestResult "UI5 build completed" $true
    } else {
        Write-TestResult "UI5 build completed" $false "Exit code: $LASTEXITCODE"
        Write-Host $ui5Output -ForegroundColor Gray
    }
} catch {
    Write-TestResult "UI5 build completed" $false $_.Exception.Message
}
Pop-Location

# ─────────────────────────────────────────────────
# 3. Verify Z_COURSES_UI.zip exists
# ─────────────────────────────────────────────────
Write-Host "[3/5] Verify deployment artifact..." -ForegroundColor White
$zipPath = Join-Path $DistDir "Z_COURSES_UI.zip"
$zipExists = Test-Path $zipPath
Write-TestResult "Z_COURSES_UI.zip exists" $zipExists $(if (-not $zipExists) { "Expected at: $zipPath" } else { "" })

if ($zipExists) {
    $zipSize = (Get-Item $zipPath).Length
    if ($zipSize -lt 1024) {
        Write-TestWarning "Z_COURSES_UI.zip size" "Only $zipSize bytes - suspiciously small"
    } else {
        $sizeMB = [math]::Round($zipSize / 1MB, 2)
        Write-TestResult "Z_COURSES_UI.zip non-trivial (${sizeMB} MB)" $true
    }
}

# Check Component-preload.js
$preloadPath = Join-Path $DistDir "Component-preload.js"
$preloadExists = Test-Path $preloadPath
Write-TestResult "Component-preload.js generated" $preloadExists $(if (-not $preloadExists) { "Expected at: $preloadPath" } else { "" })

# ─────────────────────────────────────────────────
# 4. No inline scripts in built index.html
# ─────────────────────────────────────────────────
Write-Host "[4/5] CSP compliance check..." -ForegroundColor White
$builtIndex = Join-Path $DistDir "index.html"
if (Test-Path $builtIndex) {
    $indexContent = Get-Content $builtIndex -Raw
    $hasInlineScript = $indexContent -match '<script[^>]*>(?!\s*</script>)[^<]+'
    $hasInlineStyle = $indexContent -match 'style\s*='
    $hasOnHandler = $indexContent -match '\bon\w+\s*='

    Write-TestResult "No inline scripts in index.html" (-not $hasInlineScript) $(if ($hasInlineScript) { "Found inline <script> block" } else { "" })

    if ($hasInlineStyle) {
        Write-TestWarning "Inline styles in index.html" "Consider moving to CSS file for stricter CSP"
    }
    if ($hasOnHandler) {
        Write-TestWarning "Inline event handlers" "Found on* attribute in index.html"
    }
} else {
    Write-TestResult "No inline scripts in index.html" $false "Built index.html not found at: $builtIndex"
}

# ─────────────────────────────────────────────────
# 5. No dummy auth in production config
# ─────────────────────────────────────────────────
Write-Host "[5/5] Security config check..." -ForegroundColor White
$packageJson = Join-Path $ProjectRoot "package.json"
if (Test-Path $packageJson) {
    $pkgContent = Get-Content $packageJson -Raw

    # Check that production auth is NOT "mocked"
    $hasMockedProd = $pkgContent -match '"production"[^}]*"kind"\s*:\s*"mocked"'
    Write-TestResult "No mocked auth in production" (-not $hasMockedProd) $(if ($hasMockedProd) { "Production config uses 'mocked' auth - CRITICAL security risk" } else { "" })

    # Check for hardcoded passwords in production block
    $hasProdPassword = $pkgContent -match '"production"[^}]*"password"'
    Write-TestResult "No passwords in production config" (-not $hasProdPassword) $(if ($hasProdPassword) { "Hardcoded password found in production config" } else { "" })

    # Check dev passwords are not trivial
    $hasTrivialPwd = $pkgContent -match '"password"\s*:\s*"(admin|password|123456|test)"'
    if ($hasTrivialPwd) {
        Write-TestWarning "Trivial dev passwords" "Consider using more complex passwords even for development"
    }
} else {
    Write-TestResult "No mocked auth in production" $false "package.json not found"
}

# Check manifest.json for leftover debug settings
$manifestPath = Join-Path $AppRoot "webapp" "manifest.json"
if (Test-Path $manifestPath) {
    $manifestContent = Get-Content $manifestPath -Raw
    $hasResources = $manifestContent -match '"resources"\s*:\s*"resources\.json"'
    if ($hasResources) {
        Write-TestWarning "resources.json reference" "manifest.json references non-existent resources.json"
    }
}

# ─────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Results: $passed passed, $failed failed, $warnings warnings" -ForegroundColor $(if ($failed -gt 0) { "Red" } elseif ($warnings -gt 0) { "Yellow" } else { "Green" })
Write-Host "========================================" -ForegroundColor Cyan

if ($failed -gt 0) {
    Write-Host ""
    Write-Host " DEPLOYMENT BLOCKED — fix failures above before deploying." -ForegroundColor Red
    exit 1
} else {
    Write-Host ""
    Write-Host " All checks passed — safe to deploy." -ForegroundColor Green
    exit 0
}
