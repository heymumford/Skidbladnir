# GitHub Migration

This directory contains tools to migrate the Skíðblaðnir project to a GitHub repository.

## Migration Script

The main migration script is `migrate-to-github.sh`. It performs the following actions:

1. Creates a temporary Git repository
2. Copies all project files
3. Configures Git user information
4. Creates appropriate `.gitignore` file
5. Makes initial commit
6. Pushes to the specified GitHub repository

## Usage

```bash
# Navigate to the project root
cd /path/to/SkidbladnirFinal

# Run the migration script
./scripts/github-migration/migrate-to-github.sh https://github.com/heymumford/Skidbladnir
```

## Requirements

- Git installed and configured
- GitHub CLI (optional but recommended)
- A pre-created empty GitHub repository

## Troubleshooting

If you encounter authentication issues, try one of the following approaches:

1. Install and log in to GitHub CLI (`gh`) for easier authentication:
   ```bash
   gh auth login
   ```

2. Set up a personal access token in GitHub and use that for authentication.

3. Use SSH-based authentication by changing the repository URL to:
   ```
   git@github.com:username/repository.git
   ```