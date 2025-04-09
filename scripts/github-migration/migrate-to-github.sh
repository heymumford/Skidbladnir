#!/bin/bash
#
# Copyright (C) 2025 Eric C. Mumford (@heymumford)
#
# This file is part of Skidbladnir.
#
# Skidbladnir is free software: you can redistribute it and/or modify
# it under the terms of the MIT License as published in the LICENSE file.
#

#!/bin/bash
# migrate-to-github.sh - Migrate project to GitHub repository
# Usage: ./migrate-to-github.sh <github-repo-url>

set -e

GITHUB_REPO=$1
PROJECT_ROOT=$(pwd)

if [ -z "$GITHUB_REPO" ]; then
  echo "❌ Error: GitHub repository URL is required"
  echo "Usage: ./migrate-to-github.sh <github-repo-url>"
  exit 1
fi

echo "🚀 Migrating Skíðblaðnir to GitHub repository: $GITHUB_REPO"

# Validate GitHub repository URL
if [[ ! $GITHUB_REPO =~ ^https://github.com/.+/.+$ ]]; then
  echo "❌ Error: Invalid GitHub repository URL"
  echo "Expected format: https://github.com/username/repository"
  exit 1
fi

# Check if git is installed
if ! command -v git &> /dev/null; then
  echo "❌ Error: git is not installed"
  exit 1
fi

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
  echo "⚠️ Warning: GitHub CLI is not installed. Authentication will be manual."
  USE_GH_CLI=false
else
  USE_GH_CLI=true
  
  # Check if logged in to GitHub CLI
  if ! gh auth status &> /dev/null; then
    echo "🔑 Please log in to GitHub CLI:"
    gh auth login
  fi
fi

# Initialize temporary git repository
echo "📝 Initializing git repository..."
TMP_DIR=$(mktemp -d)
cp -r "$PROJECT_ROOT"/* "$TMP_DIR/"
cd "$TMP_DIR"

# Initialize git repository
git init

# Configure git
echo "⚙️ Configuring git..."
if [ "$USE_GH_CLI" = true ]; then
  # Get GitHub user information from gh CLI
  GH_USER=$(gh api user | jq -r '.login')
  GH_EMAIL=$(gh api user/emails | jq -r '.[0].email')
  
  git config user.name "$GH_USER"
  git config user.email "$GH_EMAIL"
else
  # Ask for user information
  echo "Enter your GitHub username:"
  read GH_USER
  echo "Enter your GitHub email:"
  read GH_EMAIL
  
  git config user.name "$GH_USER"
  git config user.email "$GH_EMAIL"
fi

# Create .gitignore
echo "📄 Creating .gitignore..."
cat > .gitignore << EOF
# Node.js
node_modules/
npm-debug.log
yarn-error.log
yarn-debug.log

# Environment
.env
.env.*
!.env.example

# Build output
dist/
build/
coverage/

# LLM models (large files)
models/**/*.bin
models/**/*.gguf
models/**/*.ggml

# IDE
.idea/
.vscode/
*.swp
*.swo

# Logs
logs/
*.log

# OS specific
.DS_Store
Thumbs.db

# Test output
test-results/
junit.xml
EOF

# Make scripts executable
echo "🔧 Making scripts executable..."
find ./scripts -type f -name "*.sh" -exec chmod +x {} \;

# Add all files to git
echo "➕ Adding files to git..."
git add .

# Make initial commit
echo "💾 Creating initial commit..."
git commit -m "Initial commit for Skíðblaðnir project

A universal test asset migration platform for test management systems.

🚢 Generated with [Claude Code](https://claude.ai/code)"

# Add GitHub remote
echo "🔗 Adding GitHub remote..."
git remote add origin "$GITHUB_REPO"

# Push to GitHub
echo "⬆️ Pushing to GitHub..."
if [ "$USE_GH_CLI" = true ]; then
  git push -u origin main
else
  echo "⚠️ Please authenticate with GitHub when prompted"
  git push -u origin main
fi

# Clean up
echo "🧹 Cleaning up..."
cd "$PROJECT_ROOT"
rm -rf "$TMP_DIR"

echo "✅ Migration complete! Your project is now available at $GITHUB_REPO"
echo "📋 Next steps:"
echo "1. Clone the repository: git clone $GITHUB_REPO"
echo "2. Install dependencies: npm install"
echo "3. Start development: npm run dev"