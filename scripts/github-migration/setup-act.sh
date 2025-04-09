#!/bin/bash
# setup-act.sh - Install and configure act for running GitHub Actions locally
# Usage: ./setup-act.sh

set -e

echo "🔧 Setting up act for local GitHub Actions testing"

# Check operating system
OS=$(uname -s)
ARCH=$(uname -m)

# Install act if not already installed
if ! command -v act &> /dev/null; then
  echo "📥 Installing act..."
  
  case "$OS" in
    Linux)
      # Install act on Linux
      curl -s https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
      ;;
    Darwin)
      # Install act on macOS
      if command -v brew &> /dev/null; then
        brew install act
      else
        echo "❌ Homebrew is required to install act on macOS"
        echo "Install Homebrew first: https://brew.sh/"
        exit 1
      fi
      ;;
    *)
      echo "❌ Unsupported operating system: $OS"
      echo "Please install act manually: https://github.com/nektos/act#installation"
      exit 1
      ;;
  esac
else
  echo "✅ act is already installed"
fi

# Create act configuration
echo "📝 Creating act configuration..."
cat > .actrc << EOF
# Act configuration for Skíðblaðnir CI
--container-architecture linux/amd64
--workflows ./.github/workflows/ci.yml
--secret-file ./.secrets
EOF

# Create secrets file template
if [ ! -f ".secrets" ]; then
  echo "🔒 Creating secrets template..."
  cat > .secrets << EOF
# GitHub Actions secrets
# Replace with your actual values
GITHUB_TOKEN=
NPM_TOKEN=
EOF
fi

echo "🔍 Checking Docker installation..."
if ! command -v docker &> /dev/null; then
  echo "❌ Docker is required for act to run"
  echo "Please install Docker: https://docs.docker.com/get-docker/"
  exit 1
fi

echo "📋 Creating act job list..."
act -l

echo "✅ act setup complete!"
echo ""
echo "To run a specific job:"
echo "  act -j lint"
echo ""
echo "To run all jobs:"
echo "  act"
echo ""
echo "To run with a specific event:"
echo "  act push"
echo ""
echo "For more information, see: https://github.com/nektos/act#example-commands"