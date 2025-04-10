# Skidbladnir Quick Start Guide

This guide helps you get started with Skidbladnir in the fastest way possible - just clone the repo, run a single command, and access the web interface to start migrating test assets.

## Prerequisites

- **Docker** or **Podman** installed on your system
- Git (to clone the repository)
- A web browser (Chrome, Firefox, Safari, or Edge)
- At least 4GB of available RAM

## Quick Start: One Command Setup

```bash
# Clone the repository
git clone https://github.com/heymumford/skidbladnir.git
cd skidbladnir

# Make the script executable
chmod +x scripts/quick-start.sh

# Run the quick-start script (this will build and start everything)
./scripts/quick-start.sh
```

That's it! A browser window will automatically open to the Skidbladnir web interface.

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

## Common Issues

### "Cannot connect to Docker daemon"

Make sure Docker is running. Try:
```bash
sudo systemctl start docker  # on Linux
```

### Web UI doesn't open automatically

If your browser doesn't open automatically, manually navigate to:
```
http://localhost:8080
```

### Services fail to start

Check the logs:
```bash
docker-compose -f infra/compose/docker-compose.quickstart.yml logs
```

## Next Steps

Once you're familiar with the basic workflow, you might want to explore:

- Setting up provider-specific configurations
- Using the command-line interface for automation
- Configuring advanced field mapping rules
- Setting up persistent configurations