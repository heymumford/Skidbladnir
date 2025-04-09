# Configuration Management

This document outlines the configuration management approach used in Skidbladnir.

## Configuration File Structure

All configuration files are stored in the `/config` directory at the root of the project. This helps keep the root directory clean and organizes all configuration in one central location.

### Configuration Files

The following configuration files are located in the `/config` directory:

| File | Description |
|------|-------------|
| `jest.config.js` | Configuration for Jest testing framework |
| `tsconfig.json` | Main TypeScript configuration file |
| `tsconfig.build.json` | TypeScript configuration for build processes |
| `pytest.ini` | Configuration for Python tests |
| `pyproject.toml` | Python project configuration |
| `go.mod` | Go module dependency declarations |
| `Taskfile.yml` | Task runner configuration |

## Symbolic Links

For compatibility with tools that expect configuration files in the root directory, symbolic links have been created from the root to the corresponding files in the `/config` directory:

- `go.mod` → `config/go.mod`
- `pyproject.toml` → `config/pyproject.toml`
- `Taskfile.yml` → `config/Taskfile.yml`

## Running Commands

When running commands that use these configuration files, specify the path to the configuration file in the `/config` directory. For example:

```bash
# Running Jest tests
jest --config=config/jest.config.js

# Running TypeScript compiler
tsc -p config/tsconfig.json

# Running Python tests
python -m pytest -c config/pytest.ini
```

These paths are already configured in the package.json scripts.

## Environment-Specific Configuration

Environment-specific configurations (dev, QA, prod) are handled through:

1. Environment variables
2. `.env.[environment]` files loaded at runtime
3. Command-line flags passed to scripts

See the `scripts/` directory for environment setup scripts.

## Updating Configuration

When updating configuration:

1. Edit the files in the `/config` directory
2. Update any paths in scripts if necessary
3. Test your changes in each environment
4. Document any significant changes