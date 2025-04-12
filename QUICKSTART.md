# Skidbladnir Quick Start Guide

This guide provides the fastest way to install and run Skidbladnir locally for the Zephyr Scale to qTest migration.

## Prerequisites

- Docker or Podman installed
- Git
- Bash terminal

## Installation & Running

### Option 1: One Command Setup (Recommended)

```bash
# Clone repository
git clone https://github.com/heymumford/Skidbladnir.git
cd Skidbladnir

# Run the universal installer (detects platform & sets up everything)
./install.sh

# The installer will automatically launch the quick-start script
# If it doesn't, run it manually:
./scripts/quick-start.sh
```

A browser window will open to http://localhost:8080 with the Skidbladnir web interface.

### Option 2: Manual Setup

If the automatic installer doesn't work, follow these steps:

```bash
# Clone repository
git clone https://github.com/heymumford/Skidbladnir.git
cd Skidbladnir

# Make scripts executable
chmod +x scripts/*.sh

# Start Skidbladnir with Docker
./scripts/quick-start.sh --runtime docker

# OR start with Podman
./scripts/quick-start.sh --runtime podman

# Specify a different port if needed
./scripts/quick-start.sh --port 9000
```

## Configuration

1. In the web interface, navigate to the Provider Configuration section
2. Configure your Zephyr Scale source:
   - API URL (e.g., `https://api.zephyrscale.com/v1`)
   - API Token
   - Project Key
3. Configure your qTest target:
   - API URL (e.g., `https://yourcompany.qtestnet.com/api/v3`)
   - API Token
   - Project ID
4. Test the connections to verify credentials

## Starting a Migration

1. Navigate to the Migration Wizard
2. Follow the step-by-step workflow:
   - Select providers (Zephyr → qTest)
   - Configure field mappings
   - Preview test case transformations
   - Start the migration
3. Monitor progress in the Migration Dashboard

## Laptop-Friendly Installation
For resource-constrained environments (16GB RAM, 4-core CPU):
```bash
# Use the laptop-optimized configuration
./scripts/laptop-dev.sh up minimal

# For development with TypeScript
./scripts/laptop-dev.sh up typescript

# For LLM features (uses more resources)
./scripts/laptop-dev.sh up llm

# View status of running services
./scripts/laptop-dev.sh status
```

This mode uses memory-optimized containers with resource limits for better performance on laptops.

## Useful Commands

```bash
# View logs
docker-compose -f infra/compose/docker-compose.quickstart.yml logs -f
# OR
podman-compose -f infra/compose/docker-compose.quickstart.yml logs -f

# Stop services
docker-compose -f infra/compose/docker-compose.quickstart.yml down
# OR
podman-compose -f infra/compose/docker-compose.quickstart.yml down

# Change port (default is 8080)
./scripts/quick-start.sh --port 9000

# For laptop mode
./scripts/laptop-dev.sh logs     # View service logs
./scripts/laptop-dev.sh down     # Stop all services
./scripts/laptop-dev.sh restart  # Restart services
```

## Troubleshooting

- If services fail to start, check Docker/Podman installation
- Verify API tokens have correct permissions
- Check logs for detailed error messages
- Ensure your network can reach Zephyr and qTest APIs
- For memory issues, try the laptop-friendly configuration

## Documentation

- Complete documentation is available in the `docs/` directory
- Development guide: `docs/development/development-guide.md`
- Migration guide: `docs/user/migration-guide/`
- API documentation: `docs/api/`

## Web Interface Workflow

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

## Development Commands

```bash
# Build the application
npm run build

# Run unit tests
npm run test:unit

# Run linting
npm run lint

# Check types
npm run typecheck
```

For detailed documentation, see the docs/ directory in the repository.