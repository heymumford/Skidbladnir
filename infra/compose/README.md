# Docker/Podman Compose Configurations

This directory contains container composition configurations for different environments:

- **docker-compose.prod.yml** - Production environment configuration
- **docker-compose.qa.yml** - QA/Testing environment configuration

## Usage

These files can be used with Docker Compose or Podman Compose:

```bash
# For QA environment
podman-compose -f docker-compose.qa.yml up -d

# For Production environment
podman-compose -f docker-compose.prod.yml up -d
```

The development environment compose file is located in `/infra/dev/podman-compose.yml`.