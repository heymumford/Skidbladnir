#!/bin/bash
set -e

# TestBridge build and deployment script
# This script builds and deploys the TestBridge containers for different environments

SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
PROJECT_ROOT=$(readlink -f "${SCRIPT_DIR}/..")

# Default values
ENVIRONMENT="dev"
REGISTRY_URL="localhost:5000"
VERSION=$(git describe --tags --always --dirty 2>/dev/null || echo "v0.1.0-dev")
BUILD_CACHE=true
PUSH_IMAGES=false
DEPLOY=false
VERBOSE=false

# Function to show usage information
show_usage() {
    echo "TestBridge Build and Deployment Script"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -e, --env ENV       Target environment (dev, qa, prod) [default: dev]"
    echo "  -r, --registry URL  Container registry URL [default: localhost:5000]"
    echo "  -v, --version VER   Version tag for the images [default: git-derived]"
    echo "  --no-cache          Disable build cache"
    echo "  -p, --push          Push images to registry"
    echo "  -d, --deploy        Deploy after building"
    echo "  --verbose           Show verbose output"
    echo "  -h, --help          Show this help message"
    echo ""
}

# Process arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -r|--registry)
            REGISTRY_URL="$2"
            shift 2
            ;;
        -v|--version)
            VERSION="$2"
            shift 2
            ;;
        --no-cache)
            BUILD_CACHE=false
            shift
            ;;
        -p|--push)
            PUSH_IMAGES=true
            shift
            ;;
        -d|--deploy)
            DEPLOY=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            echo "Error: Unknown option $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|qa|prod)$ ]]; then
    echo "Error: Environment must be one of: dev, qa, prod"
    exit 1
fi

# Set up logging
log() {
    if [ "$VERBOSE" = true ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    fi
}

# Print build configuration
echo "Building TestBridge containers:"
echo "  Environment: $ENVIRONMENT"
echo "  Registry: $REGISTRY_URL"
echo "  Version: $VERSION"
echo "  Build cache: $BUILD_CACHE"
echo "  Push images: $PUSH_IMAGES"
echo "  Deploy: $DEPLOY"
echo ""

# Determine Dockerfile paths based on environment
case $ENVIRONMENT in
    dev)
        ENV_DIR="development"
        ;;
    qa)
        ENV_DIR="testing"
        ;;
    prod)
        ENV_DIR="production"
        ;;
esac

DOCKERFILE_BASE="${PROJECT_ROOT}/infrastructure/${ENV_DIR}"

# Build common base image
build_base_image() {
    local image_name="$1"
    local dockerfile="$2"
    
    echo "Building base image: $image_name"
    
    local cache_args=""
    if [ "$BUILD_CACHE" = false ]; then
        cache_args="--no-cache"
    fi
    
    log "Running: podman build $cache_args -t $REGISTRY_URL/$image_name:$VERSION -f $dockerfile $PROJECT_ROOT"
    
    podman build $cache_args -t "$REGISTRY_URL/$image_name:$VERSION" -f "$dockerfile" "$PROJECT_ROOT"
    podman tag "$REGISTRY_URL/$image_name:$VERSION" "$REGISTRY_URL/$image_name:latest"
    
    echo "✓ Built $image_name"
}

# Build service images
build_service_images() {
    # Build API service image
    build_base_image "testbridge/api" "${DOCKERFILE_BASE}/api.Dockerfile"
    
    # Build orchestrator service image
    build_base_image "testbridge/orchestrator" "${DOCKERFILE_BASE}/orchestrator.Dockerfile"
    
    # Build binary processor image
    build_base_image "testbridge/binary-processor" "${DOCKERFILE_BASE}/binary-processor.Dockerfile"
}

# Push images to registry
push_images() {
    if [ "$PUSH_IMAGES" = true ]; then
        echo "Pushing images to registry: $REGISTRY_URL"
        
        for image in "testbridge/api" "testbridge/orchestrator" "testbridge/binary-processor"; do
            echo "Pushing $image:$VERSION"
            podman push "$REGISTRY_URL/$image:$VERSION"
            podman push "$REGISTRY_URL/$image:latest"
        done
        
        echo "✓ All images pushed to registry"
    fi
}

# Deploy the application
deploy_application() {
    if [ "$DEPLOY" = true ]; then
        echo "Deploying TestBridge to $ENVIRONMENT environment"
        
        # Create .env file with version
        echo "VERSION=$VERSION" > "${DOCKERFILE_BASE}/.env"
        
        # Deploy using podman-compose
        cd "$DOCKERFILE_BASE"
        podman-compose down
        podman-compose up -d
        
        echo "✓ Deployment completed"
    fi
}

# Run tests with Act (GitHub Actions locally)
run_act_tests() {
    if [ -x "$(command -v act)" ]; then
        echo "Running GitHub Actions workflows locally with Act"
        cd "$PROJECT_ROOT"
        
        # Create artifact directory
        mkdir -p "$PROJECT_ROOT/act-artifacts"
        
        # Run build workflow
        act -n || echo "Act dry run completed. To run the actions, remove -n flag."
        
        echo "✓ Local GitHub Actions test completed"
    else
        echo "Warning: 'act' is not installed. Skipping local GitHub Actions testing."
        echo "To install: https://github.com/nektos/act"
    fi
}

# Main build process
main() {
    echo "Starting build process"
    
    # Ensure we're in the project root
    cd "$PROJECT_ROOT"
    
    # Build all service images
    build_service_images
    
    # Push images if requested
    push_images
    
    # Run tests with Act
    run_act_tests
    
    # Deploy if requested
    deploy_application
    
    echo "Build process completed successfully"
}

# Run the main function
main