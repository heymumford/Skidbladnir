# Scripts

This directory contains scripts for development, building, and deployment of Skidbladnir.

## Directory Structure

- **dev/**: Development scripts
  - Scripts for setting up development environments
  - Scripts for running development servers
  
- **build/**: Build scripts
  - Scripts for building containers
  - Scripts for compiling code
  
- **deploy/**: Deployment scripts
  - Scripts for deploying to various environments
  - Scripts for managing deployments
  
- **util/**: Utility scripts
  - Scripts for maintenance tasks
  - Scripts for automation
  
- **security/**: Security-related scripts
  - Scripts for security scanning
  - Scripts for generating security reports

## Core Scripts

Most scripts can be run directly from the command line:

```bash
./scripts/dev/setup.sh       # Set up development environment
./scripts/build/containers.sh # Build containers
./scripts/deploy/prod.sh      # Deploy to production
```

## Provider API Testing Scripts

### Zephyr Scale API Connectivity Test

The `test-zephyr-connectivity.js` script verifies connectivity to the Zephyr Scale API and validates that your credentials can access test cases and execution data.

#### Prerequisites

```bash
npm install axios yargs
```

#### Usage

```bash
# Basic usage with npm script
npm run test:zephyr -- --token YOUR_API_TOKEN --project-key YOUR_PROJECT_KEY

# Direct usage
node scripts/test-zephyr-connectivity.js --token YOUR_API_TOKEN --project-key YOUR_PROJECT_KEY

# With custom base URL
node scripts/test-zephyr-connectivity.js --base-url https://api.zephyrscale.example.com/v2 --token YOUR_API_TOKEN --project-key YOUR_PROJECT_KEY

# Verbose mode (shows full API responses)
node scripts/test-zephyr-connectivity.js --token YOUR_API_TOKEN --project-key YOUR_PROJECT_KEY --verbose
```

#### What It Tests

- Connection to Zephyr Scale API
- Access to project metadata
- Ability to retrieve test cases
- Ability to fetch detailed test case information
- Access to test cycles
- Access to test executions

This script confirms that your API token has the necessary permissions to extract all required test data for the migration process.

Check the individual scripts for specific usage instructions.