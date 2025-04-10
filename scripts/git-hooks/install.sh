#!/bin/bash
#
# Script to install Git hooks
#
# Copyright (C) 2025 Eric C. Mumford (@heymumford)
# 
# This file is part of Skidbladnir.
# 
# Skidbladnir is free software: you can redistribute it and/or modify
# it under the terms of the MIT License as published in the LICENSE file.

set -e

# Get the project root directory
ROOT_DIR=$(git rev-parse --show-toplevel)
cd "$ROOT_DIR"

# Make sure the hooks directory exists
mkdir -p "$ROOT_DIR/.git/hooks"

# Make our hooks executable
chmod +x "$ROOT_DIR/scripts/git-hooks/pre-commit"
chmod +x "$ROOT_DIR/scripts/git-hooks/pre-push"

# Check if husky is installed
if [ -f "$ROOT_DIR/node_modules/.bin/husky" ]; then
    # If husky is installed, use it to install the hooks
    echo "📌 Husky detected, using it to install hooks..."
    
    # Create or update .husky directory
    mkdir -p "$ROOT_DIR/.husky"
    
    # Create or update the pre-commit hook
    cat > "$ROOT_DIR/.husky/pre-commit" << 'EOF'
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run our custom pre-commit hook
bash "$(git rev-parse --show-toplevel)/scripts/git-hooks/pre-commit"
EOF
    
    # Create or update the pre-push hook
    cat > "$ROOT_DIR/.husky/pre-push" << 'EOF'
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run our custom pre-push hook
bash "$(git rev-parse --show-toplevel)/scripts/git-hooks/pre-push"
EOF
    
    # Make them executable
    chmod +x "$ROOT_DIR/.husky/pre-commit"
    chmod +x "$ROOT_DIR/.husky/pre-push"
    
    # Install husky
    cd "$ROOT_DIR" && npx husky install
    
    echo "✅ Git hooks installed using husky!"
else
    # If husky is not installed, use symlinks
    echo "📌 Installing Git hooks using symlinks..."
    
    # Create the symlinks for each hook
    ln -sf "$ROOT_DIR/scripts/git-hooks/pre-commit" "$ROOT_DIR/.git/hooks/pre-commit"
    ln -sf "$ROOT_DIR/scripts/git-hooks/pre-push" "$ROOT_DIR/.git/hooks/pre-push"
    
    echo "✅ Git hooks installed using symlinks!"
    echo "ℹ️ If you want to use husky instead, install it with 'npm install --save-dev husky' and run this script again."
fi

echo ""
echo "🚀 Skidbladnir Git hooks are now active!"
echo "🔍 Your commits will be checked for architectural compliance."
echo "🔄 Your pushes will verify version consistency."
echo ""
echo "To skip hooks for a specific operation (not recommended), use:"
echo "   git commit --no-verify  # Skip pre-commit hooks"
echo "   git push --no-verify    # Skip pre-push hooks"
echo ""