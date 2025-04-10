# Skidbladnir Git Hooks

This directory contains Git hooks for the Skidbladnir project. These hooks help enforce code quality and architectural standards across the codebase.

## Available Hooks

Currently, the following hooks are available:

- **pre-commit**: Runs polyglot architecture validation and circular dependency checks before allowing commits

## Installation

The hooks can be installed in two ways:

### Automatic Installation

When you run `npm install` in the project root, the hooks will be automatically installed via the `postinstall` script.

### Manual Installation

If you need to install or reinstall the hooks manually, you can run:

```bash
# Using npm
npm run hooks:install

# Or directly
./scripts/git-hooks/install.sh
```

## How It Works

The installation script will:

1. Make the hook scripts executable
2. Check if [husky](https://typicode.github.io/husky/) is installed
   - If husky is installed, it will use husky to set up the hooks
   - If husky is not installed, it will create symlinks in the `.git/hooks` directory

## Architecture Validation

The pre-commit hook performs architecture validation across TypeScript, Python, and Go code:

1. **Clean Architecture Boundaries**: Ensures dependencies only flow from outer to inner layers
2. **Circular Dependencies**: Prevents circular dependencies between modules

## Bypassing Hooks

In some cases, you may need to bypass the hooks temporarily (e.g., for work in progress commits):

```bash
git commit --no-verify
```

However, this is generally discouraged as it can lead to architectural violations in the codebase.

## Troubleshooting

If you encounter issues with the hooks:

1. Make sure the hook scripts are executable: `chmod +x scripts/git-hooks/*`
2. Check if ts-node is installed: `npm install -g ts-node` or `npm install --save-dev ts-node`
3. Ensure the architecture validator exists: `tests/unit/architecture/cli/check-architecture.ts`

For more details, see the [architecture-pre-commit-hook.md](../../docs/project/architecture-pre-commit-hook.md) documentation.