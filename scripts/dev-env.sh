#!/bin/bash
set -e

# Development environment management script for TestBridge
# This script starts, stops and manages the containerized development environment

SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
PROJECT_ROOT=$(readlink -f "${SCRIPT_DIR}/..")

# Default values
PODMAN_COMPOSE_FILE="${PROJECT_ROOT}/infrastructure/development/podman-compose.yml"
REGISTRY_PORT=5000

# Check if podman is installed
if ! command -v podman &> /dev/null; then
    echo "Error: Podman is required but not installed."
    echo "Please install Podman and try again."
    exit 1
fi

# Function to show usage information
show_usage() {
    echo "TestBridge Development Environment"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  up              Start development environment"
    echo "  down            Stop development environment"
    echo "  restart         Restart development environment"
    echo "  status          Show status of containers"
    echo "  logs [service]  Show logs (optional: for specific service)"
    echo "  build           Build development containers"
    echo "  registry        Start local registry for container caching"
    echo "  clean           Remove all containers and volumes"
    echo "  help            Show this help message"
    echo ""
}

# Start local container registry
start_registry() {
    if ! podman ps | grep -q "registry:2"; then
        echo "Starting local container registry on port ${REGISTRY_PORT}..."
        podman run -d --name registry -p ${REGISTRY_PORT}:5000 registry:2
        echo "Registry started. Use localhost:${REGISTRY_PORT} as your registry."
    else
        echo "Registry is already running."
    fi
}

# Build development containers
build_containers() {
    echo "Building development containers..."
    
    # Build TypeScript development container
    podman build -t testbridge/typescript-dev:latest \
        -f "${PROJECT_ROOT}/infrastructure/development/typescript.Dockerfile" \
        "${PROJECT_ROOT}"
    
    # Build Python development container
    podman build -t testbridge/python-dev:latest \
        -f "${PROJECT_ROOT}/infrastructure/development/python.Dockerfile" \
        "${PROJECT_ROOT}"
    
    # Build Go development container
    podman build -t testbridge/go-dev:latest \
        -f "${PROJECT_ROOT}/infrastructure/development/go.Dockerfile" \
        "${PROJECT_ROOT}"
    
    echo "Development containers built successfully."
}

# Start development environment
start_env() {
    echo "Starting TestBridge development environment..."
    podman-compose -f "${PODMAN_COMPOSE_FILE}" up -d
    echo "Development environment started."
    
    # Show status
    podman-compose -f "${PODMAN_COMPOSE_FILE}" ps
}

# Stop development environment
stop_env() {
    echo "Stopping TestBridge development environment..."
    podman-compose -f "${PODMAN_COMPOSE_FILE}" down
    echo "Development environment stopped."
}

# Restart development environment
restart_env() {
    echo "Restarting TestBridge development environment..."
    podman-compose -f "${PODMAN_COMPOSE_FILE}" restart
    echo "Development environment restarted."
    
    # Show status
    podman-compose -f "${PODMAN_COMPOSE_FILE}" ps
}

# Show status of containers
show_status() {
    echo "TestBridge Development Environment Status:"
    podman-compose -f "${PODMAN_COMPOSE_FILE}" ps
}

# Show logs
show_logs() {
    if [ -z "$1" ]; then
        podman-compose -f "${PODMAN_COMPOSE_FILE}" logs
    else
        podman-compose -f "${PODMAN_COMPOSE_FILE}" logs "$1"
    fi
}

# Clean up everything
clean_env() {
    echo "WARNING: This will remove all containers, images, and volumes."
    read -p "Are you sure you want to continue? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Stopping and removing all containers..."
        podman-compose -f "${PODMAN_COMPOSE_FILE}" down -v
        
        echo "Removing development images..."
        podman rmi testbridge/typescript-dev:latest || true
        podman rmi testbridge/python-dev:latest || true
        podman rmi testbridge/go-dev:latest || true
        
        echo "Cleanup completed."
    else
        echo "Cleanup aborted."
    fi
}

# Process commands
case "$1" in
    up)
        start_env
        ;;
    down)
        stop_env
        ;;
    restart)
        restart_env
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs "$2"
        ;;
    build)
        build_containers
        ;;
    registry)
        start_registry
        ;;
    clean)
        clean_env
        ;;
    help|--help|-h)
        show_usage
        ;;
    *)
        show_usage
        exit 1
        ;;
esac

exit 0