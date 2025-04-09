#\!/bin/bash
# Cleanup script to remove unnecessary directories after migration

echo -e "\n\033[1;36m===> Cleaning up after migration\033[0m"

# Ensure we're in the right directory
if [[ \! $(pwd) =~ "Skidbladnir" ]]; then
  echo "Error: Please run this script from the Skidbladnir root directory"
  exit 1
fi

# Remove TestBridge directory
if [[ -d "TestBridge" ]]; then
  echo "Removing TestBridge directory..."
  rm -rf TestBridge
fi

# Remove backup directories
for backup in backup_*; do
  if [[ -d "$backup" ]]; then
    echo "Removing backup directory: $backup..."
    rm -rf "$backup"
  fi
done

# Remove merged_temp directory
if [[ -d "merged_temp" ]]; then
  echo "Removing merged_temp directory..."
  rm -rf merged_temp
fi

# Create a .gitignore file if it doesn't exist
if [[ \! -f ".gitignore" ]]; then
  echo "Creating .gitignore file..."
  cat > .gitignore << 'EOG'
# Node
node_modules/
dist/
build/
.env
.env.*
npm-debug.log
yarn-debug.log
yarn-error.log

# Python
__pycache__/
*.py[cod]
*$py.class
venv/
.venv/
env/
ENV/

# Editors
.idea/
.vscode/
*.swp
*.swo
*~

# OS specific
.DS_Store
Thumbs.db

# Build artifacts
*.log
logs/
coverage/

# Docker/Podman
.podman/
.docker/

# Testing
.nyc_output/
.coverage
htmlcov/
EOG
fi

echo -e "\n\033[1;32mCleanup complete\!\033[0m"
echo "You can now use the Skidbladnir project structure and safely discard this script."
echo "See MIGRATION_COMPLETE.md for next steps."
