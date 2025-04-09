# ADR 0009: LLM Stability and Resilience Framework

## Status

Accepted

## Date

2025-04-09

## Context

The local LLM component in the Skíðblaðnir system serves critical functions including API troubleshooting, mapping assistance, and self-healing migration capabilities. For a production-grade migration tool, the LLM's stability, reliability, and resilience are paramount. We must address several challenges:

1. LLMs can produce inconsistent outputs or hallucinations, especially with ambiguous inputs.
2. Resource constraints or hardware failures can disrupt model operation.
3. Extended operation periods may lead to degraded performance or unexpected behaviors.
4. Model outputs need validation before being used in critical migration operations.
5. The system must remain operational even if the LLM component fails or produces unreliable results.

We need a comprehensive framework to ensure the LLM component functions reliably under various conditions and degrades gracefully when necessary.

## Decision

We will implement a multi-layered LLM stability and resilience framework with these key components:

### 1. Output Validation and Quality Assurance

- Implement schema validation for all LLM outputs to ensure format correctness.
- Apply rule-based validation to catch common hallucination patterns.
- Use confidence scoring to filter low-confidence outputs.
- Develop content validators specific to each LLM task (API parsing, mapping suggestions, etc.).
- Implement runtime assertion checking for structural validation.

### 2. Fault Tolerance and Graceful Degradation

- Create a cascading fallback mechanism with progressively simpler models.
- Implement circuit breakers to prevent cascading failures.
- Develop a tiered approach to function availability based on model health.
- Use retry mechanisms with exponential backoff for transient failures.
- Create simplified deterministic fallbacks for critical functions.

### 3. Stateful Recovery and Persistence

- Implement checkpointing for long-running inference processes.
- Maintain operation logs for all LLM interactions and outcomes.
- Create a state recovery mechanism for interrupted operations.
- Develop an inference replay capability for debugging and recovery.
- Implement state synchronization across distributed components.

### 4. Operational Monitoring and Self-Healing

- Develop continuous model health monitoring with key metrics.
- Implement anomaly detection for output quality and performance.
- Create automated recovery procedures for common failure patterns.
- Develop canary testing with known-good inputs.
- Implement progressive deployment of model updates with automated rollback.

### 5. Isolation and Containment

- Run the LLM in a separate container with strict resource limits.
- Implement timeout mechanisms for all LLM operations.
- Create bulkheads to isolate LLM failures from affecting other components.
- Use the actor model for robust message passing between components.
- Implement sandbox execution for all model-generated code or queries.

## Implementation Details

### Resilient LLM Service

```typescript
class ResilientLLMService implements LLMAdvisor {
  private primaryModel: LLMModel;
  private fallbackModel: LLMModel;
  private validator: OutputValidator;
  private circuitBreaker: CircuitBreaker;
  private stateManager: StateManager;
  private metrics: MetricsCollector;
  
  constructor(config: ResilientLLMConfig) {
    this.primaryModel = this.initializePrimaryModel(config);
    this.fallbackModel = this.initializeFallbackModel(config);
    this.validator = new OutputValidator(config.validationRules);
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: config.failureThreshold,
      resetTimeout: config.resetTimeoutMs
    });
    this.stateManager = new StateManager(config.persistencePath);
    this.metrics = new MetricsCollector(config.metricsEndpoint);
  }
  
  async analyzeApiSpecification(
    apiSpec: ApiSpecification, 
    options?: AnalysisOptions
  ): Promise<ApiAnalysisResult> {
    const operationId = uuid();
    
    try {
      // Start tracking operation
      this.metrics.startOperation(operationId, 'apiAnalysis');
      this.stateManager.beginOperation(operationId, { 
        type: 'apiAnalysis', 
        input: apiSpec,
        options 
      });
      
      // Check if circuit breaker is open
      if (this.circuitBreaker.isOpen()) {
        this.metrics.recordEvent(operationId, 'circuitBreakerOpen');
        return this.executeFallbackAnalysis(apiSpec, options);
      }
      
      // Prepare prompt with strong constraints
      const prompt = this.prepareApiAnalysisPrompt(apiSpec, options);
      
      // Execute with retry logic
      const result = await this.executeWithRetry(
        async () => this.primaryModel.generate(prompt),
        3 // Maximum retries
      );
      
      // Validate output
      const validationResult = this.validator.validateApiAnalysis(result);
      
      if (!validationResult.valid) {
        this.metrics.recordEvent(operationId, 'validationFailed', {
          errors: validationResult.errors
        });
        this.circuitBreaker.recordFailure();
        
        // Try fallback if validation fails
        return this.executeFallbackAnalysis(apiSpec, options);
      }
      
      // Record success
      this.circuitBreaker.recordSuccess();
      this.metrics.recordSuccess(operationId);
      this.stateManager.completeOperation(operationId, { 
        result: validationResult.data,
        status: 'success'
      });
      
      return validationResult.data;
      
    } catch (error) {
      // Handle errors
      this.metrics.recordError(operationId, error);
      this.circuitBreaker.recordFailure();
      this.stateManager.failOperation(operationId, error);
      
      // Use fallback in case of error
      return this.executeFallbackAnalysis(apiSpec, options);
    }
  }
  
  private async executeFallbackAnalysis(
    apiSpec: ApiSpecification, 
    options?: AnalysisOptions
  ): Promise<ApiAnalysisResult> {
    try {
      // Use simpler model or rule-based approach
      const prompt = this.prepareFallbackPrompt(apiSpec, options);
      const result = await this.fallbackModel.generate(prompt);
      
      // Apply stricter validation to fallback
      const validationResult = this.validator.validateWithStrictRules(result);
      
      if (!validationResult.valid) {
        // If even fallback fails, return safe defaults
        return this.createSafeDefaultAnalysis(apiSpec);
      }
      
      return validationResult.data;
    } catch (error) {
      // Last resort - return safe defaults that won't break the system
      return this.createSafeDefaultAnalysis(apiSpec);
    }
  }
  
  private async executeWithRetry<T>(
    operation: () => Promise<T>, 
    maxRetries: number
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Apply exponential backoff
        if (attempt > 0) {
          const delayMs = Math.pow(2, attempt) * 100;
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        
        return await operation();
      } catch (error) {
        lastError = error;
        this.metrics.recordRetry(attempt, error);
      }
    }
    
    throw lastError;
  }
  
  // Additional methods for other LLM functions...
}
```

### Validation System

```typescript
class OutputValidator {
  private rules: ValidationRule[];
  private schemas: Record<string, JSONSchema>;
  
  constructor(config: ValidationConfig) {
    this.rules = config.rules;
    this.schemas = config.schemas;
  }
  
  validateApiAnalysis(result: any): ValidationResult<ApiAnalysisResult> {
    // Schema validation
    const schemaErrors = this.validateSchema('apiAnalysis', result);
    if (schemaErrors.length > 0) {
      return {
        valid: false,
        errors: schemaErrors
      };
    }
    
    // Content validation using rules
    const contentErrors = this.applyRules('apiAnalysis', result);
    if (contentErrors.length > 0) {
      return {
        valid: false,
        errors: contentErrors
      };
    }
    
    // Heuristic validation for hallucinations
    const heuristicErrors = this.checkForHallucinations(result);
    if (heuristicErrors.length > 0) {
      return {
        valid: false,
        errors: heuristicErrors
      };
    }
    
    // Specific domain validation
    if (!this.validateEndpoints(result.endpoints)) {
      return {
        valid: false,
        errors: ['Invalid endpoint definitions detected']
      };
    }
    
    // All validations passed
    return {
      valid: true,
      data: result as ApiAnalysisResult
    };
  }
  
  // Additional validation methods...
}
```

### State Management for Recovery

```typescript
class StateManager {
  private storageProvider: StateStorageProvider;
  private activeOperations: Map<string, OperationState>;
  
  constructor(persistencePath: string) {
    this.storageProvider = new FileSystemStateProvider(persistencePath);
    this.activeOperations = new Map();
    this.recoverActiveOperations();
  }
  
  async beginOperation(id: string, context: any): Promise<void> {
    const state: OperationState = {
      id,
      startTime: new Date().toISOString(),
      status: 'in_progress',
      context,
      checkpoints: []
    };
    
    this.activeOperations.set(id, state);
    await this.persistState(id, state);
  }
  
  async addCheckpoint(id: string, data: any): Promise<void> {
    const operation = this.activeOperations.get(id);
    if (!operation) return;
    
    operation.checkpoints.push({
      timestamp: new Date().toISOString(),
      data
    });
    
    await this.persistState(id, operation);
  }
  
  async completeOperation(id: string, result: any): Promise<void> {
    const operation = this.activeOperations.get(id);
    if (!operation) return;
    
    operation.status = 'completed';
    operation.endTime = new Date().toISOString();
    operation.result = result;
    
    await this.persistState(id, operation);
    this.activeOperations.delete(id);
  }
  
  async failOperation(id: string, error: any): Promise<void> {
    const operation = this.activeOperations.get(id);
    if (!operation) return;
    
    operation.status = 'failed';
    operation.endTime = new Date().toISOString();
    operation.error = this.serializeError(error);
    
    await this.persistState(id, operation);
    this.activeOperations.delete(id);
  }
  
  async getOperationState(id: string): Promise<OperationState | null> {
    // Check in-memory state first
    if (this.activeOperations.has(id)) {
      return this.activeOperations.get(id);
    }
    
    // Check persistent storage
    return this.storageProvider.loadState(id);
  }
  
  private async persistState(id: string, state: OperationState): Promise<void> {
    await this.storageProvider.saveState(id, state);
  }
  
  private async recoverActiveOperations(): Promise<void> {
    const incompleteOps = await this.storageProvider.findIncompleteOperations();
    
    for (const op of incompleteOps) {
      this.activeOperations.set(op.id, op);
    }
  }
  
  // Additional methods for state management...
}
```

### Circuit Breaker for Fault Tolerance

```typescript
class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private failureThreshold: number;
  private resetTimeout: number;
  
  constructor(config: CircuitBreakerConfig) {
    this.failureThreshold = config.failureThreshold;
    this.resetTimeout = config.resetTimeout;
  }
  
  isOpen(): boolean {
    this.checkStateTransition();
    return this.state !== 'closed';
  }
  
  recordSuccess(): void {
    if (this.state === 'half-open') {
      this.state = 'closed';
      this.failureCount = 0;
    } else if (this.state === 'closed') {
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }
  
  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';
    }
  }
  
  private checkStateTransition(): void {
    if (this.state === 'open') {
      const currentTime = Date.now();
      if (currentTime - this.lastFailureTime > this.resetTimeout) {
        this.state = 'half-open';
      }
    }
  }
}
```

### Canary Testing and Health Checking

```typescript
class ModelHealthChecker {
  private canaryTests: CanaryTest[];
  private healthStatus: ModelHealthStatus = 'healthy';
  private lastCheckTime: number = 0;
  private checkIntervalMs: number;
  private llmService: LLMService;
  
  constructor(llmService: LLMService, config: HealthCheckerConfig) {
    this.llmService = llmService;
    this.canaryTests = config.canaryTests;
    this.checkIntervalMs = config.checkIntervalMs;
    
    // Start periodic health checks
    this.startPeriodicChecks();
  }
  
  async checkHealth(): Promise<ModelHealthStatus> {
    const results = await Promise.allSettled(
      this.canaryTests.map(test => this.runCanaryTest(test))
    );
    
    const successCount = results.filter(
      r => r.status === 'fulfilled' && r.value.passed
    ).length;
    
    const passRate = successCount / this.canaryTests.length;
    
    if (passRate >= 0.9) {
      this.healthStatus = 'healthy';
    } else if (passRate >= 0.6) {
      this.healthStatus = 'degraded';
    } else {
      this.healthStatus = 'unhealthy';
    }
    
    this.lastCheckTime = Date.now();
    return this.healthStatus;
  }
  
  private async runCanaryTest(test: CanaryTest): Promise<CanaryTestResult> {
    try {
      const startTime = Date.now();
      const response = await this.llmService.generate(test.prompt);
      const duration = Date.now() - startTime;
      
      const passed = test.validateResponse(response);
      
      return {
        testId: test.id,
        passed,
        duration,
        response
      };
    } catch (error) {
      return {
        testId: test.id,
        passed: false,
        error: String(error)
      };
    }
  }
  
  private startPeriodicChecks(): void {
    setInterval(async () => {
      try {
        await this.checkHealth();
      } catch (error) {
        // Log error but don't crash the health checker
        console.error('Error during health check:', error);
      }
    }, this.checkIntervalMs);
  }
}
```

## Consequences

### Positive

1. **Enhanced Reliability**: The system operates reliably even with imperfect LLM outputs.
2. **Graceful Degradation**: Services continue functioning with reduced capabilities when needed.
3. **Self-Healing**: Automated recovery from common failure patterns.
4. **Observability**: Comprehensive monitoring provides visibility into LLM behavior.
5. **Reproducibility**: State tracking enables debugging and audit trails.
6. **Fault Isolation**: Failures in the LLM don't cascade to other components.

### Negative

1. **Increased Complexity**: Resilience mechanisms add complexity to the system.
2. **Performance Overhead**: Validation, retries, and state management introduce overhead.
3. **Development Effort**: Requires significant upfront investment in resilience infrastructure.
4. **Configuration Burden**: Multiple resilience parameters require careful tuning.
5. **Testing Challenges**: Resilience mechanisms themselves need comprehensive testing.

### Neutral

1. **Design Trade-offs**: Balance between thoroughness and performance.
2. **Operational Awareness**: Requires users to understand degraded operational modes.
3. **Evolving Approach**: Resilience strategies will need refinement as the system matures.

## Implementation Notes

### Testing Strategy

1. **Chaos Testing**: Deliberately introduce failures to validate resilience.
2. **Fault Injection**: Test system behavior under various fault conditions:
   - Slow responses
   - Memory limitations
   - Invalid outputs
   - Complete failures
3. **Long-Running Stability Tests**: Ensure stability over extended operation periods.
4. **Recovery Testing**: Validate recovery from checkpoints after disruptions.

### Observability Implementation

1. **Detailed Metrics Collection**:
   - Response latencies
   - Validation success/failure rates
   - Fallback invocation frequency
   - Circuit breaker state transitions
2. **Structured Logging**:
   - Operation context
   - Decision points
   - Recovery actions
3. **State Visualization**:
   - Dashboard for LLM health
   - Operation success/failure rates
   - Resilience mechanism activations

### Deployment Considerations

1. **Container Structure**:
   - Separate containers for LLM and application logic
   - Resource limits and monitoring
   - Health check endpoints
2. **Update Strategy**:
   - Canary deployments for model updates
   - Automated rollback triggers
   - Versioned state storage
3. **Resource Allocation**:
   - Reserved capacity for recovery operations
   - Memory headroom for peak operations

## References

- [Building Resilient AI Systems: A Primer](https://arxiv.org/abs/2302.02353)
- [Resilience in Large Language Model Applications](https://arxiv.org/abs/2310.06552)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Chaos Engineering for LLM Applications](https://medium.com/wix-engineering/chaos-engineering-for-llm-applications)
- [Bulkhead Pattern](https://docs.microsoft.com/en-us/azure/architecture/patterns/bulkhead)