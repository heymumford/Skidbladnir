# Skidbladnir Scripts

This directory contains scripts for building, deploying, and managing the Skidbladnir project.

## Main Scripts

- **build.sh** - Builds the project components
- **deploy.sh** - Deploys the built components to target environments
- **dev-container.sh** - Launches development containers for different languages
- **dev-env.sh** - Sets up the development environment
- **download-model.py** - Downloads LLM models for local use
- **master-build.sh** - Comprehensive build process for all components
- **prepare-llm-models.sh** - Prepares and optimizes LLM models
- **run-integration-tests.sh** - Runs integration tests
- **run-tests.sh** - Runs the test suite
- **setup-env.sh** - Sets up the environment variables
- **setup.sh** - Initial project setup
- **test.sh** - Runs tests with specific configurations

## Utility Scripts

Utility scripts are located in the `util/` subdirectory and include:
- **add_headers.sh** - Adds copyright headers to source code files
- **update_license_headers.sh** - Updates license headers across the codebase

## GitHub Migration Scripts

GitHub-specific scripts are in the `github-migration/` subdirectory:
- **migrate-to-github.sh** - Facilitates migration to GitHub
- **setup-act.sh** - Sets up Act for GitHub Actions local testing

## Usage Examples

```bash
# Build the project
./scripts/build.sh

# Set up development environment
./scripts/dev-env.sh up

# Run tests
./scripts/test.sh

# Deploy to production
./scripts/deploy.sh prod
```