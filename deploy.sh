#!/bin/bash

# SAP ULHN Deployment Script
# This script helps automate the deployment process

echo "🚀 SAP ULHN Deployment Script"
echo "================================"
echo ""

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📦 Initializing Git repository..."
    git init
    echo "✅ Git initialized"
else
    echo "✅ Git already initialized"
fi

# Check for GitHub remote
if ! git remote | grep -q "origin"; then
    echo ""
    echo "🔗 GitHub Setup Required"
    echo "Please enter your GitHub repository URL:"
    read -p "URL (e.g., https://github.com/username/sap-ulhn.git): " REPO_URL
    
    if [ -z "$REPO_URL" ]; then
        echo "❌ No URL provided. Exiting."
        exit 1
    fi
    
    git remote add origin "$REPO_URL"
    echo "✅ Remote added: $REPO_URL"
else
    echo "✅ GitHub remote already configured"
fi

# Check if files are staged
if [ -z "$(git diff --cached --name-only)" ]; then
    echo ""
    echo "📝 Staging files..."
    git add .
    echo "✅ Files staged"
else
    echo "✅ Files already staged"
fi

# Check if there are changes to commit
if ! git diff-index --quiet HEAD --; then
    echo ""
    echo "💾 Creating commit..."
    read -p "Enter commit message (or press Enter for default): " COMMIT_MSG
    
    if [ -z "$COMMIT_MSG" ]; then
        COMMIT_MSG="Deploy: Update SAP ULHN application"
    fi
    
    git commit -m "$COMMIT_MSG"
    echo "✅ Commit created"
else
    echo "✅ No changes to commit"
fi

# Ensure we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo ""
    echo "🔄 Switching to main branch..."
    git branch -M main
    echo "✅ On main branch"
else
    echo "✅ Already on main branch"
fi

# Push to GitHub
echo ""
read -p "🚀 Push to GitHub? (y/n): " PUSH_CONFIRM

if [ "$PUSH_CONFIRM" = "y" ]; then
    echo "📤 Pushing to GitHub..."
    git push -u origin main
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully pushed to GitHub!"
    else
        echo "❌ Push failed. Please check your credentials and try again."
        exit 1
    fi
else
    echo "⏭️  Skipping push to GitHub"
fi

echo ""
echo "================================"
echo "✅ Deployment preparation complete!"
echo ""
echo "Next steps:"
echo "1. Set up Railway backend at: https://railway.app/"
echo "2. Set up Cloudflare Pages at: https://dash.cloudflare.com/"
echo "3. See DEPLOYMENT.md for detailed instructions"
echo ""
echo "🎉 Happy deploying!"
