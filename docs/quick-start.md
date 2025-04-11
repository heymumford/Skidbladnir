# Skidbladnir Quick Start Guide

This guide helps you get started with Skidbladnir in the fastest way possible - just clone the repo, run a single command, and access the web interface to start migrating test assets.

## Prerequisites

- A web browser (Chrome, Firefox, Safari, or Edge)
- At least 4GB of available RAM

That's all you need to get started! Our universal installer will handle everything else.

## Quick Start: One Command Setup

```bash
# Clone the repository
git clone https://github.com/heymumford/skidbladnir.git
cd skidbladnir

# Run the universal installer - it will detect your platform and install everything needed
./install.sh
```

That's it! The installer will:

1. Detect your platform (Windows, WSL, macOS, or Linux)
2. Install Docker or Podman if needed
3. Configure the optimal settings for your environment
4. Launch the Skidbladnir user interface

A browser window will automatically open to the Skidbladnir web interface.

## Platform-Specific Installation

If you prefer to use our platform-specific installers directly:

### Windows

```bash
# In Git Bash or Windows Terminal with Bash
./scripts/install-windows.sh
```

### WSL (Windows Subsystem for Linux)

```bash
# In your WSL terminal
./scripts/install-wsl.sh
```

### Linux (Ubuntu, Fedora, etc.)

```bash
# In your terminal
./scripts/install-linux.sh
```

### macOS

```bash
# In your terminal
./scripts/install-macos.sh
```

## Manual Setup (Advanced)

If you already have Docker or Podman installed and just want to run Skidbladnir directly:

```bash
# Make the script executable
chmod +x scripts/quick-start.sh

# Run the quick-start script (this will build and start everything)
./scripts/quick-start.sh
```

## What Happens Behind the Scenes

The quick-start script:

1. Builds the necessary Docker containers
2. Creates a database and storage system
3. Starts all the required services
4. Opens your browser to the UI

All of this is achieved with laptop-friendly resource usage settings.

## Using the Web Interface

Once you access the web interface, you'll see a streamlined setup process:

1. **Configure Source System**:
   - Select your source test tool (Zephyr, qTest, etc.)
   - Enter authentication details
   - Test the connection

2. **Configure Target System**:
   - Select your destination test tool
   - Enter authentication details
   - Test the connection

3. **Select Test Assets**:
   - Browse available test data
   - Select what you want to migrate
   - Configure any mapping options

4. **Start Migration**:
   - Click "Start Migration"
   - Watch real-time progress with status indicators
   - See streaming updates of what's happening

5. **Review Results**:
   - See summary of completed migration
   - Review any errors or warnings
   - Get suggestions for resolving issues

## Resource Usage

The quick-start configuration is optimized for typical laptops and desktops. It uses:

- About 2GB of RAM total
- Minimal CPU resources
- Approximately 1GB of disk space

## Common Operations

```bash
# View container logs
docker-compose -f infra/compose/docker-compose.quickstart.yml logs -f

# Stop all services
docker-compose -f infra/compose/docker-compose.quickstart.yml down

# Restart all services
docker-compose -f infra/compose/docker-compose.quickstart.yml restart

# Change the web UI port (default: 8080)
./scripts/quick-start.sh --port 3000
```

## Advanced Configuration

For more advanced setups or troubleshooting, check out:

- [Complete Installation Guide](./installation.md)
- [Configuration Options](./configuration.md)
- [API Reference](./api/README.md)
- [Command-Line Interface](./cli.md)

## Platform-Specific Instructions

### Native Ubuntu

On Ubuntu or other Linux distributions, you can use either Docker or Podman:

```bash
# Using Docker
sudo apt update
sudo apt install -y docker.io docker-compose
sudo systemctl start docker
sudo usermod -aG docker $USER  # Log out and back in after this
./scripts/quick-start.sh

# Using Podman
sudo apt update
sudo apt install -y podman podman-compose
./scripts/quick-start.sh -r podman
```

### Windows Subsystem for Linux (WSL)

For the best experience in WSL:

1. Install Docker Desktop for Windows with WSL integration enabled
2. In your WSL distribution, run:

```bash
./scripts/quick-start.sh
```

The script will automatically detect WSL and use the appropriate configuration.

### Native Windows 10/11

On Windows, you'll need:

1. Docker Desktop for Windows installed and running
2. Git Bash or Windows Terminal with Bash

```bash
# In Git Bash or Windows Terminal
./scripts/quick-start.sh
```

The script automatically detects Windows and configures the environment appropriately.

## Common Issues

### "Cannot connect to Docker daemon"

Make sure Docker is running:

- **Linux**: `sudo systemctl start docker`
- **Windows**: Start Docker Desktop
- **WSL**: Make sure Docker Desktop is running with WSL integration enabled

### Web UI doesn't open automatically

If your browser doesn't open automatically, manually navigate to:
```
http://localhost:8080
```

### Services fail to start

Check the logs:
```bash
# If using Docker
docker-compose -f infra/compose/docker-compose.quickstart.yml logs

# If using Podman
podman-compose -f infra/compose/docker-compose.quickstart.yml logs
```

### Windows path issues

If you see errors related to volume mounts or paths on Windows:

1. Make sure you're running the script from the repository root
2. Try running from WSL instead of native Windows
3. Ensure Docker Desktop has permissions to access your files

## Next Steps

Once you're familiar with the basic workflow, you might want to explore:

- Setting up provider-specific configurations
- Using the command-line interface for automation
- Configuring advanced field mapping rules
- Setting up persistent configurations