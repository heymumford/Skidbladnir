# Laptop-Friendly Development Guide

This guide provides instructions for running Skidbladnir on laptop hardware with limited resources.

## Target Environment

These optimizations are specifically designed for:
- Windows 10/11 running Docker Desktop or Podman Desktop
- 16GB RAM
- 4-core 3GHz processor (e.g., Dell laptops)

## Quick Start

```bash
# Start minimal development environment
./scripts/laptop-dev.sh up minimal

# Start TypeScript development environment
./scripts/laptop-dev.sh up typescript

# Monitor resource usage
./scripts/monitor-resources.sh
```

## Resource-Optimized Configuration

Skidbladnir provides specialized configuration files for laptop development:

- `infra/dev/podman-compose-laptop.yml` - Development environment with memory limits
- `infra/compose/docker-compose-laptop.yml` - Production environment with memory limits
- `infra/dev/typescript-laptop.Dockerfile` - Memory-optimized TypeScript development

## Memory Budget

The laptop-friendly configuration uses the following memory allocation:

| Service | Standard Allocation | Maximum Allocation |
|---------|---------------------|-------------------|
| API | 256MB | 512MB |
| Orchestrator | 256MB | 512MB |
| Binary Processor | 128MB | 256MB |
| PostgreSQL | 256MB | 512MB |
| Redis | 128MB | 256MB |
| MinIO | 256MB | 512MB |
| LLM Advisor | 1GB | 2GB |
| Development Container | 512MB | 1GB |

**Total:** ~2.8GB nominal, ~5.6GB maximum

## Windows-Specific Configuration

### WSL2 Configuration

Create or edit `.wslconfig` in your Windows user directory (`C:\Users\<username>\.wslconfig`):

```
[wsl2]
memory=8GB
processors=3
swap=2GB
```

### Docker Desktop Settings

Configure Docker Desktop with the following settings:

1. Open Docker Desktop settings
2. Navigate to Resources → Advanced
3. Set memory limit to 6GB
4. Set CPU limit to 3
5. Set swap limit to 2GB
6. Apply and restart

## Optimization Tips

### Use Selective Service Startup

Start only the services you need:

```bash
# Start minimal services
./scripts/laptop-dev.sh up minimal

# Add TypeScript development
./scripts/laptop-dev.sh up typescript

# Add LLM services only when needed
./scripts/laptop-dev.sh up llm
```

### Monitor Resource Usage

Use the built-in monitoring script:

```bash
./scripts/monitor-resources.sh
```

### Windows Performance Tips

1. Close unnecessary applications and browser tabs
2. Use the "Best Performance" power plan in Windows
3. Ensure your antivirus excludes the project directory
4. Disable Windows Search indexing for the project directory
5. Use named volumes instead of bind mounts for better I/O performance

### Development Workflow

1. Start with minimal services first
2. Start development containers selectively
3. Stop the LLM service when not actively using it
4. Run resource-intensive tests in batches
5. Restart Docker/Podman periodically to reclaim memory

## Troubleshooting

### Container Startup Failures

If containers fail to start due to lack of memory:

```bash
# Stop all services
./scripts/laptop-dev.sh down

# Restart Docker Desktop or Podman Desktop
# Then start with minimal services
./scripts/laptop-dev.sh up minimal
```

### Slow Performance

If the system becomes unresponsive:

1. Check memory usage with `./scripts/monitor-resources.sh`
2. Stop services consuming excessive resources
3. Consider closing other applications

### LLM Service Issues

The LLM service has the highest memory requirements. If you encounter issues:

```bash
# Restart only the LLM service
./scripts/laptop-dev.sh restart llm-advisor

# Or use the minimal model
MINIMAL_MODEL=true ./scripts/laptop-dev.sh up llm
```

## Reference

For more details, see:
- [ADR-0011: Laptop-Friendly Containerization](./adrs/0011-laptop-friendly-containerization.md)
- [Containerization Strategy](./containerization.md)