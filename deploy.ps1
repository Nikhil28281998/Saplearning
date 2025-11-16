# SAP ULHN Deployment Script for Windows
# This script helps automate the deployment process

Write-Host "🚀 SAP ULHN Deployment Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if git is initialized
if (-Not (Test-Path ".git")) {
    Write-Host "📦 Initializing Git repository..." -ForegroundColor Yellow
    git init
    Write-Host "✅ Git initialized" -ForegroundColor Green
} else {
    Write-Host "✅ Git already initialized" -ForegroundColor Green
}

# Check for GitHub remote
$remotes = git remote
if ($remotes -notcontains "origin") {
    Write-Host ""
    Write-Host "🔗 GitHub Setup Required" -ForegroundColor Yellow
    $repoUrl = Read-Host "Please enter your GitHub repository URL (e.g., https://github.com/username/sap-ulhn.git)"
    
    if ([string]::IsNullOrWhiteSpace($repoUrl)) {
        Write-Host "❌ No URL provided. Exiting." -ForegroundColor Red
        exit 1
    }
    
    git remote add origin $repoUrl
    Write-Host "✅ Remote added: $repoUrl" -ForegroundColor Green
} else {
    Write-Host "✅ GitHub remote already configured" -ForegroundColor Green
}

# Check if there are any untracked or modified files
$status = git status --porcelain
if ($status) {
    Write-Host ""
    Write-Host "📝 Staging files..." -ForegroundColor Yellow
    git add .
    Write-Host "✅ Files staged" -ForegroundColor Green
} else {
    Write-Host "✅ No changes to stage" -ForegroundColor Green
}

# Check if there are changes to commit
$diffIndex = git diff-index --quiet HEAD 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "💾 Creating commit..." -ForegroundColor Yellow
    $commitMsg = Read-Host "Enter commit message (or press Enter for default)"
    
    if ([string]::IsNullOrWhiteSpace($commitMsg)) {
        $commitMsg = "Deploy: Update SAP ULHN application"
    }
    
    git commit -m $commitMsg
    Write-Host "✅ Commit created" -ForegroundColor Green
} else {
    Write-Host "✅ No changes to commit" -ForegroundColor Green
}

# Ensure we're on main branch
$currentBranch = git branch --show-current
if ($currentBranch -ne "main") {
    Write-Host ""
    Write-Host "🔄 Switching to main branch..." -ForegroundColor Yellow
    git branch -M main
    Write-Host "✅ On main branch" -ForegroundColor Green
} else {
    Write-Host "✅ Already on main branch" -ForegroundColor Green
}

# Push to GitHub
Write-Host ""
$pushConfirm = Read-Host "🚀 Push to GitHub? (y/n)"

if ($pushConfirm -eq "y") {
    Write-Host "📤 Pushing to GitHub..." -ForegroundColor Yellow
    git push -u origin main
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Successfully pushed to GitHub!" -ForegroundColor Green
    } else {
        Write-Host "❌ Push failed. Please check your credentials and try again." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "⏭️  Skipping push to GitHub" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "✅ Deployment preparation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Set up Railway backend at: https://railway.app/" -ForegroundColor White
Write-Host "2. Set up Cloudflare Pages at: https://dash.cloudflare.com/" -ForegroundColor White
Write-Host "3. See DEPLOYMENT.md for detailed instructions" -ForegroundColor White
Write-Host ""
Write-Host "🎉 Happy deploying!" -ForegroundColor Cyan
