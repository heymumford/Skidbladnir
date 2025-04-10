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
npm install axios chalk
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

### qTest Parameters API Connectivity Test

The `test-qtest-parameters-connectivity.js` script verifies connectivity to the qTest Parameters API and validates that your credentials can access parameters and datasets.

#### Prerequisites

```bash
npm install axios chalk
```

#### Usage

```bash
# Basic usage with npm script
npm run test:qtest:parameters -- --baseUrl https://instance.qtestnet.com/api/v3 --token YOUR_API_TOKEN

# Direct usage
node scripts/test-qtest-parameters-connectivity.js --baseUrl https://instance.qtestnet.com/api/v3 --token YOUR_API_TOKEN

# With specific project ID
node scripts/test-qtest-parameters-connectivity.js --baseUrl https://instance.qtestnet.com/api/v3 --token YOUR_API_TOKEN --projectId 12345

# Verbose mode (shows full API responses)
node scripts/test-qtest-parameters-connectivity.js --baseUrl https://instance.qtestnet.com/api/v3 --token YOUR_API_TOKEN --verbose

# Bypass SSL verification (for development environments)
node scripts/test-qtest-parameters-connectivity.js --baseUrl https://instance.qtestnet.com/api/v3 --token YOUR_API_TOKEN --bypassSSL
```

#### What It Tests

- Authentication with the qTest API
- Access to project metadata
- Ability to retrieve parameters
- Ability to fetch parameter values
- Access to datasets
- Access to dataset rows
- Creating test parameters and datasets (if none exist)

This script confirms that your API token has the necessary permissions to access and manipulate parameters and datasets in qTest Parameters.

### qTest Scenario API Connectivity Test

The `test-qtest-scenario-connectivity.js` script verifies connectivity to the qTest Scenario API and validates that your credentials can access BDD features and steps.

#### Prerequisites

```bash
npm install axios chalk
```

#### Usage

```bash
# Basic usage with npm script
npm run test:qtest:scenario -- --baseUrl https://instance.qtestnet.com/api/v3 --token YOUR_API_TOKEN

# Direct usage
node scripts/test-qtest-scenario-connectivity.js --baseUrl https://instance.qtestnet.com/api/v3 --token YOUR_API_TOKEN

# With specific project ID
node scripts/test-qtest-scenario-connectivity.js --baseUrl https://instance.qtestnet.com/api/v3 --token YOUR_API_TOKEN --projectId 12345

# Verbose mode (shows full API responses)
node scripts/test-qtest-scenario-connectivity.js --baseUrl https://instance.qtestnet.com/api/v3 --token YOUR_API_TOKEN --verbose

# Bypass SSL verification (for development environments)
node scripts/test-qtest-scenario-connectivity.js --baseUrl https://instance.qtestnet.com/api/v3 --token YOUR_API_TOKEN --bypassSSL
```

#### What It Tests

- Authentication with the qTest API
- Access to project metadata
- Ability to retrieve features
- Ability to fetch feature details
- Access to steps
- Creating test features and steps (if none exist)
- Updating steps

This script confirms that your API token has the necessary permissions to access and manipulate BDD features and steps in qTest Scenario.

### qTest Data Export API Connectivity Test

The `test-qtest-data-export-connectivity.js` script verifies connectivity to the qTest Data Export API and validates that your credentials can access and download exported files.

#### Prerequisites

```bash
npm install axios chalk
```

#### Usage

```bash
# Basic usage with npm script
npm run test:qtest:data-export -- --baseUrl https://instance.qtestnet.com/api/v3 --token YOUR_API_TOKEN

# Direct usage
node scripts/test-qtest-data-export-connectivity.js --baseUrl https://instance.qtestnet.com/api/v3 --token YOUR_API_TOKEN

# With specific project ID
node scripts/test-qtest-data-export-connectivity.js --baseUrl https://instance.qtestnet.com/api/v3 --token YOUR_API_TOKEN --projectId 12345

# Verbose mode (shows full API responses)
node scripts/test-qtest-data-export-connectivity.js --baseUrl https://instance.qtestnet.com/api/v3 --token YOUR_API_TOKEN --verbose

# Bypass SSL verification (for development environments)
node scripts/test-qtest-data-export-connectivity.js --baseUrl https://instance.qtestnet.com/api/v3 --token YOUR_API_TOKEN --bypassSSL
```

#### What It Tests

- Authentication with the qTest API
- Access to project metadata
- Ability to list files in the exports directory
- Ability to fetch file metadata
- Downloading files (if files exist and are small enough)
- Downloading files as binary
- Searching for files

This script confirms that your API token has the necessary permissions to access and download exported files from qTest Data Export.

Check the individual scripts for specific usage instructions.