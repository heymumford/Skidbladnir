# ADR-0008: LLM Performance Optimization

## Status
Accepted

## Context
Skíðblaðnir requires an LLM advisor component to translate between different test management system APIs and provide self-healing capabilities. This component needs to be performant, accurate, and resource-efficient while running in containers.

## Decision

### Model Selection
We will use **Llama-3 8B** as our primary LLM for the following reasons:
- Good reasoning capabilities with acceptable latency (~2 seconds for typical API mapping queries)
- Available in multiple quantized formats (4-bit GGUF ~4GB)
- Strong open-source community support
- Recent release with improved reasoning and instruction following
- Supports fine-tuning for our specific API mapping tasks

### Performance Optimization Strategy
We will implement a multi-layered approach to optimize LLM performance:

1. **Model Quantization**
   - Use 4-bit GGUF quantization for production deployments
   - Maintain full precision models for training and fine-tuning

2. **Response Caching**
   - Implement LRU cache for common API mappings
   - Cache expiration based on API version changes
   - Persistent cache for frequent operations

3. **Batch Processing**
   - Group similar requests for batch inference
   - Pipeline parallel processing for multiple test cases

4. **Adaptive Resource Management**
   - Dynamic model loading based on request complexity
   - Smaller model for simple mappings, larger for complex ones
   - Memory monitoring with graceful degradation

5. **Hardware Acceleration**
   - GPU support where available (CUDA/ROCm)
   - CPU optimizations (AVX2/AVX512) for standard deployments
   - Model-specific optimizations using ONNX Runtime

### Sample Implementation

```typescript
export class OptimizedLLMService {
  private modelRegistry: Map<string, any> = new Map();
  private responseCache: LRUCache<string, any>;
  private memoryMonitor: MemoryMonitor;
  
  constructor(
    private configService: ConfigurationService,
    memoryMonitor: MemoryMonitor,
    private modelRegistry: ModelRegistry,
    private apiSpecService: ApiSpecService,
    private cacheService: CacheService
  ) {
    // Initialize cache with configured size
    this.responseCache = new LRUCache({
      max: this.configService.getCacheSize(),
      ttl: this.configService.getCacheTTL()
    });
    
    this.memoryMonitor = memoryMonitor;
    this.memoryMonitor.registerThresholdAlert(
      this.configService.getMemoryThreshold(),
      this.handleMemoryConstraint.bind(this)
    );
  }
  
  async mapZephyrToQTest(zephyrSpec: ZephyrTestCase): Promise<QTestTestCase> {
    // Check cache first
    const cacheKey = this.generateCacheKey(zephyrSpec);
    const cachedMapping = this.cacheService.getCachedMapping(cacheKey);
    if (cachedMapping) {
      return cachedMapping;
    }
    
    // Select appropriate model based on complexity
    const modelName = this.selectModelForComplexity(zephyrSpec);
    await this.ensureModelLoaded(modelName);
    
    // Perform inference
    const qTestMapping = await this.performInference(modelName, zephyrSpec);
    
    // Cache result
    this.cacheService.storeCachedMapping(cacheKey, qTestMapping);
    
    return qTestMapping;
  }
  
  private selectModelForComplexity(testCase: any): string {
    // Simple heuristic for model selection
    const complexity = this.calculateComplexity(testCase);
    
    if (complexity > this.configService.getComplexityThreshold()) {
      return 'llama3-8b';
    } else {
      return 'llama3-8b-quantized';
    }
  }
  
  private async handleMemoryConstraint(): Promise<void> {
    // Gracefully degrade to smaller model
    await this.unloadLargeModels();
    await this.loadSmallModel();
    this.cacheService.reduceCacheSize();
  }
}
```

## Master Build and Deployment Orchestration

We will implement a master build script that orchestrates all build and container operations for both QA and production environments, with the following features:

```bash
#!/bin/bash
# master-build.sh - Main orchestration script for Skíðblaðnir build pipeline

set -e

# Configuration
ENV=${1:-"qa"}  # Default to QA environment
CI_MODE=${2:-"false"}  # Running in CI or locally
BUILD_ID=$(date +%Y%m%d%H%M%S)
PROJECT_ROOT=$(pwd)
DOCKER_REGISTRY="skidbladnir"
COMPOSE_FILE="docker-compose.${ENV}.yml"

# Log configuration
echo "🚀 Starting Skíðblaðnir build for ${ENV} environment (Build: ${BUILD_ID})"

# Step 1: Setup environment-specific variables
source "${PROJECT_ROOT}/scripts/setup-env.sh" "${ENV}"

# Step 2: Run tests
echo "🧪 Running tests..."
./scripts/run-tests.sh

# Step 3: Build & optimize LLM models
echo "🧠 Building LLM models..."
./scripts/prepare-llm-models.sh "${ENV}"

# Step 4: Build containers with optimized layers
echo "📦 Building containers..."
docker compose -f "${COMPOSE_FILE}" build \
  --build-arg BUILD_ID="${BUILD_ID}" \
  --build-arg ENV="${ENV}"

# Step 5: Run integration tests with containers
echo "🔄 Running integration tests..."
./scripts/run-integration-tests.sh "${ENV}"

# Step 6: Git operations for tracking changes
if [ "${CI_MODE}" == "false" ]; then
  echo "📝 Committing build artifacts..."
  git add ./build-versions.json
  git commit -m "Build ${BUILD_ID} for ${ENV} environment" || true
fi

# Step 7: Run GitHub CI locally if requested
if [ "${CI_MODE}" == "true" ]; then
  echo "🔧 Running GitHub CI locally with act..."
  act -j build
fi

# Step 8: Deploy to environment
echo "🚀 Deploying to ${ENV}..."
./scripts/deploy.sh "${ENV}" "${BUILD_ID}"

echo "✅ Build and deployment complete for ${ENV} environment (Build: ${BUILD_ID})"
```

### GitHub CI Integration
- We will use GitHub Actions for CI/CD with local testing via `act`
- CI workflow will include:
  - Unit tests
  - Container builds
  - Security scanning
  - Model validation

## Consequences

### Positive
- Optimized performance for API translation tasks
- Efficient resource utilization in containerized environments
- Automated build and deployment process
- Local testing of CI workflows

### Negative
- Requires ongoing model updates and retraining
- Quantization introduces some quality tradeoffs
- Hardware acceleration may vary across environments

### Neutral
- Regular benchmarking needed to ensure performance targets
- Occasional model switching based on new releases

## References
- [Llama-3 Technical Report](https://ai.meta.com/research/publications/llama-3-a-more-capable-open-language-model/)
- [GGUF Quantization Framework](https://github.com/ggerganov/ggml)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [act - Run GitHub Actions Locally](https://github.com/nektos/act)