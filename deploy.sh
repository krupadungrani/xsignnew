#!/bin/bash

echo "🚀 XSignature - Deployment Script"
echo "=================================="

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git first."
    exit 1
fi

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Not in a git repository. Please initialize git first:"
    echo "   git init"
    echo "   git add ."
    echo "   git commit -m 'Initial commit'"
    exit 1
fi

# Check if we have a remote repository
if ! git remote get-url origin > /dev/null 2>&1; then
    echo "❌ No remote repository found. Please add your GitHub repository:"
    echo "   git remote add origin https://github.com/yourusername/your-repo.git"
    echo "   git push -u origin main"
    exit 1
fi

echo "✅ Git repository found"

# Push latest changes
echo "📤 Pushing latest changes to GitHub..."
git add .
git commit -m "Deploy to Render - $(date)"
git push origin main

echo ""
echo "🎉 Code pushed to GitHub!"
echo ""
echo "📋 Next Steps:"
echo "1. Go to https://render.com"
echo "2. Sign up/Login"
echo "3. Click 'New +' → 'Blueprint'"
echo "4. Connect your GitHub repository"
echo "5. Select your XSignature repository"
echo "6. Click 'Apply' to deploy"
echo ""
echo "🔧 After deployment:"
echo "1. Configure environment variables in Render dashboard"
echo "2. Set up email verification (optional)"
echo "3. Test your live application"
echo ""
echo "📖 See DEPLOYMENT.md for detailed instructions"
