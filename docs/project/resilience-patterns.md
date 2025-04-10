# API Resilience Patterns Implementation Guide

This document outlines the comprehensive resilience patterns to implement across all API connections within the Skíðblaðnir platform. These patterns ensure robustness in the face of network instability, service degradation, and API failures.

## Overview of Resilience Strategy

The Skíðblaðnir platform follows a multi-layered resilience approach:

1. **Proactive Resilience**: Mechanisms to prevent failures or reduce their likelihood
2. **Reactive Resilience**: Mechanisms to recover from failures when they occur
3. **Degraded Operation**: Mechanisms to provide limited functionality when parts of the system are unavailable
4. **Observability**: Mechanisms to monitor, trace, and understand the system's resilience behavior

## Core Resilience Patterns

### 1. Circuit Breaker Pattern

The Circuit Breaker pattern prevents cascading failures by "tripping" when error rates exceed thresholds, preventing further calls to failing services.

#### Implementation:

```typescript
export class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  
  constructor(
    private readonly failureThreshold: number = 5,
    private readonly resetTimeout: number = 30000,
    private readonly halfOpenSuccessThreshold: number = 3
  ) {}
  
  public async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.halfOpenSuccessThreshold) {
        this.reset();
      }
    }
  }
  
  private onFailure(): void {
    this.lastFailureTime = Date.now();
    
    if (this.state === 'CLOSED') {
      this.failureCount++;
      if (this.failureCount >= this.failureThreshold) {
        this.state = 'OPEN';
      }
    } else if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
    }
  }
  
  private reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
  }
  
  public getState(): string {
    return this.state;
  }
}
```

### 2. Retry Pattern with Exponential Backoff

The Retry pattern attempts failed operations multiple times with progressively increasing delays.

#### Implementation:

```typescript
export interface RetryOptions {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
  retryableErrors: string[] | RegExp[];
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  let lastError: Error;
  let delay = options.initialDelayMs;
  
  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Check if error is retryable
      const isRetryable = options.retryableErrors.some(pattern => {
        if (pattern instanceof RegExp) {
          return pattern.test(lastError.message);
        }
        return lastError.message.includes(pattern);
      });
      
      if (!isRetryable || attempt === options.maxRetries) {
        throw lastError;
      }
      
      // Wait before the next retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * options.backoffFactor, options.maxDelayMs);
    }
  }
  
  throw lastError!;
}
```

### 3. Bulkhead Pattern

The Bulkhead pattern isolates critical components to prevent failures in one area from affecting others.

#### Implementation:

```typescript
export class Bulkhead {
  private concurrentExecutions: number = 0;
  private queue: Array<{
    resolve: (value: any) => void;
    reject: (reason: any) => void;
    operation: () => Promise<any>;
  }> = [];
  
  constructor(
    private readonly maxConcurrentCalls: number,
    private readonly maxQueueSize: number
  ) {}
  
  public async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.concurrentExecutions < this.maxConcurrentCalls) {
      return this.executeOperation(operation);
    }
    
    if (this.queue.length >= this.maxQueueSize) {
      throw new Error('Bulkhead capacity reached');
    }
    
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ resolve, reject, operation });
    });
  }
  
  private async executeOperation<T>(operation: () => Promise<T>): Promise<T> {
    this.concurrentExecutions++;
    
    try {
      return await operation();
    } finally {
      this.concurrentExecutions--;
      this.processQueue();
    }
  }
  
  private processQueue(): void {
    if (this.queue.length === 0 || this.concurrentExecutions >= this.maxConcurrentCalls) {
      return;
    }
    
    const { resolve, reject, operation } = this.queue.shift()!;
    
    this.executeOperation(operation)
      .then(resolve)
      .catch(reject);
  }
  
  public getStats(): { concurrentExecutions: number; queueSize: number } {
    return {
      concurrentExecutions: this.concurrentExecutions,
      queueSize: this.queue.length
    };
  }
}
```

### 4. Timeout Pattern

The Timeout pattern ensures operations complete within a specified time or are terminated.

#### Implementation:

```typescript
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(errorMessage));
      }, timeoutMs);
    })
  ]);
}
```

### 5. Cache Pattern

The Cache pattern stores API responses to reduce load and provide data during outages.

#### Implementation:

```typescript
export interface CacheOptions {
  ttlMs: number;
  staleWhileRevalidate: boolean;
}

export class ResponseCache<T> {
  private cache: Map<string, { data: T; timestamp: number }> = new Map();
  
  constructor(
    private readonly options: CacheOptions
  ) {}
  
  public async get(
    key: string,
    fetchFn: () => Promise<T>
  ): Promise<T> {
    const cachedValue = this.cache.get(key);
    const now = Date.now();
    
    // Cache hit and not expired
    if (cachedValue && now - cachedValue.timestamp < this.options.ttlMs) {
      return cachedValue.data;
    }
    
    // Cache hit but stale
    if (cachedValue && this.options.staleWhileRevalidate) {
      // Refresh in background
      this.refreshCacheInBackground(key, fetchFn);
      return cachedValue.data;
    }
    
    // Cache miss or expired without stale option
    return this.refreshCache(key, fetchFn);
  }
  
  private async refreshCache(key: string, fetchFn: () => Promise<T>): Promise<T> {
    const data = await fetchFn();
    this.cache.set(key, { data, timestamp: Date.now() });
    return data;
  }
  
  private refreshCacheInBackground(key: string, fetchFn: () => Promise<T>): void {
    fetchFn()
      .then(data => {
        this.cache.set(key, { data, timestamp: Date.now() });
      })
      .catch(() => {
        // Failed to refresh, but we already returned stale data
      });
  }
  
  public invalidate(key: string): void {
    this.cache.delete(key);
  }
  
  public clear(): void {
    this.cache.clear();
  }
}
```

### 6. Fallback Pattern

The Fallback pattern provides alternative functionality when an operation fails.

#### Implementation:

```typescript
export async function withFallback<T>(
  primaryOperation: () => Promise<T>,
  fallbackOperation: (error: Error) => Promise<T>
): Promise<T> {
  try {
    return await primaryOperation();
  } catch (error) {
    return await fallbackOperation(error as Error);
  }
}
```

## Integration of Resilience Patterns

### Resilience Facade

A unified resilience facade should be implemented to combine these patterns:

```typescript
export class ResilienceFacade<T> {
  private circuitBreaker: CircuitBreaker;
  private bulkhead: Bulkhead;
  private cache: ResponseCache<T>;
  
  constructor(
    private readonly retryOptions: RetryOptions,
    private readonly timeoutMs: number,
    circuitBreakerOptions?: {
      failureThreshold: number;
      resetTimeout: number;
      halfOpenSuccessThreshold: number;
    },
    bulkheadOptions?: {
      maxConcurrentCalls: number;
      maxQueueSize: number;
    },
    cacheOptions?: CacheOptions
  ) {
    this.circuitBreaker = new CircuitBreaker(
      circuitBreakerOptions?.failureThreshold,
      circuitBreakerOptions?.resetTimeout,
      circuitBreakerOptions?.halfOpenSuccessThreshold
    );
    
    this.bulkhead = new Bulkhead(
      bulkheadOptions?.maxConcurrentCalls || 10,
      bulkheadOptions?.maxQueueSize || 100
    );
    
    this.cache = new ResponseCache<T>(
      cacheOptions || { ttlMs: 60000, staleWhileRevalidate: true }
    );
  }
  
  public async execute(
    key: string,
    operation: () => Promise<T>,
    fallback?: (error: Error) => Promise<T>
  ): Promise<T> {
    try {
      // Try to get from cache first
      return await this.cache.get(key, async () => {
        // Apply circuit breaker, bulkhead, timeout, and retry patterns
        return await this.circuitBreaker.execute(async () => {
          return await this.bulkhead.execute(async () => {
            return await withTimeout(
              async () => await withRetry(operation, this.retryOptions),
              this.timeoutMs
            );
          });
        });
      });
    } catch (error) {
      // Apply fallback if available
      if (fallback) {
        return await fallback(error as Error);
      }
      throw error;
    }
  }
  
  public getStatus(): {
    circuitState: string;
    bulkheadStats: { concurrentExecutions: number; queueSize: number };
  } {
    return {
      circuitState: this.circuitBreaker.getState(),
      bulkheadStats: this.bulkhead.getStats()
    };
  }
  
  public invalidateCache(key: string): void {
    this.cache.invalidate(key);
  }
}
```

## Provider-Specific Resilience Configurations

Each provider should have tailored resilience settings based on their known behavior:

```typescript
export const ResilienceConfigurations = {
  'zephyr': {
    retry: {
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 10000,
      backoffFactor: 2,
      retryableErrors: [
        'ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 
        'ENOTFOUND', 'ENETUNREACH', 'socket hang up',
        '500 Internal Server Error', '503 Service Unavailable'
      ]
    },
    timeout: 30000,
    circuitBreaker: {
      failureThreshold: 5,
      resetTimeout: 60000,
      halfOpenSuccessThreshold: 2
    },
    bulkhead: {
      maxConcurrentCalls: 15,
      maxQueueSize: 50
    },
    cache: {
      ttlMs: 300000, // 5 minutes
      staleWhileRevalidate: true
    }
  },
  'qtest': {
    retry: {
      maxRetries: 4,
      initialDelayMs: 800,
      maxDelayMs: 15000,
      backoffFactor: 1.5,
      retryableErrors: [
        'ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED',
        '429 Too Many Requests', '503 Service Unavailable'
      ]
    },
    timeout: 45000,
    circuitBreaker: {
      failureThreshold: 8,
      resetTimeout: 45000,
      halfOpenSuccessThreshold: 3
    },
    bulkhead: {
      maxConcurrentCalls: 20,
      maxQueueSize: 100
    },
    cache: {
      ttlMs: 180000, // 3 minutes
      staleWhileRevalidate: true
    }
  },
  // Additional providers...
};
```

## Service Health Monitoring

A service health monitor should track the status of each provider's connections:

```typescript
export interface ProviderHealth {
  status: 'UP' | 'DEGRADED' | 'DOWN';
  lastChecked: Date;
  responseTime: number;
  circuitState: string;
  failureRate: number;
}

export class ServiceHealthMonitor {
  private providerHealth: Map<string, ProviderHealth> = new Map();
  private readonly checkInterval: number;
  private intervalId: NodeJS.Timeout | null = null;
  
  constructor(
    private readonly providers: string[],
    private readonly healthCheckFns: Map<string, () => Promise<boolean>>,
    checkIntervalMs: number = 60000
  ) {
    this.checkInterval = checkIntervalMs;
    
    // Initialize health statuses
    this.providers.forEach(provider => {
      this.providerHealth.set(provider, {
        status: 'UP',
        lastChecked: new Date(),
        responseTime: 0,
        circuitState: 'CLOSED',
        failureRate: 0
      });
    });
  }
  
  public start(): void {
    if (this.intervalId) {
      return;
    }
    
    this.intervalId = setInterval(async () => {
      await this.checkAllProviders();
    }, this.checkInterval);
  }
  
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
  
  public async checkAllProviders(): Promise<void> {
    for (const provider of this.providers) {
      await this.checkProvider(provider);
    }
  }
  
  private async checkProvider(provider: string): Promise<void> {
    const healthCheckFn = this.healthCheckFns.get(provider);
    if (!healthCheckFn) {
      return;
    }
    
    const startTime = Date.now();
    let isHealthy = false;
    
    try {
      isHealthy = await healthCheckFn();
    } catch (error) {
      isHealthy = false;
    }
    
    const responseTime = Date.now() - startTime;
    
    const previousHealth = this.providerHealth.get(provider);
    const newHealth: ProviderHealth = {
      status: isHealthy ? 'UP' : 'DOWN',
      lastChecked: new Date(),
      responseTime,
      circuitState: previousHealth?.circuitState || 'CLOSED',
      failureRate: isHealthy 
        ? (previousHealth?.failureRate || 0) * 0.8 // Exponential decay
        : Math.min((previousHealth?.failureRate || 0) * 1.2 + 0.1, 1) // Increase with cap
    };
    
    // Set status to DEGRADED if response time is very high or failureRate is significant
    if (newHealth.status === 'UP' && 
        (responseTime > 5000 || newHealth.failureRate > 0.3)) {
      newHealth.status = 'DEGRADED';
    }
    
    this.providerHealth.set(provider, newHealth);
  }
  
  public getProviderHealth(provider: string): ProviderHealth | undefined {
    return this.providerHealth.get(provider);
  }
  
  public getAllProvidersHealth(): Map<string, ProviderHealth> {
    return new Map(this.providerHealth);
  }
  
  public isHealthy(provider: string): boolean {
    const health = this.providerHealth.get(provider);
    return health?.status === 'UP';
  }
  
  public isDegraded(provider: string): boolean {
    const health = this.providerHealth.get(provider);
    return health?.status === 'DEGRADED';
  }
}
```

## Polyglot Implementation Considerations

The resilience patterns should be implemented in all three languages used in the system:

### TypeScript Implementation

- Use the code samples above as a foundation
- Integrate with the existing rate limiting code
- Implement Axios interceptors for HTTP-specific patterns

### Python Implementation

```python
# Circuit Breaker implementation
class CircuitBreaker:
    def __init__(self, failure_threshold=5, reset_timeout=30, half_open_success_threshold=3):
        self.state = 'CLOSED'
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time = 0
        self.failure_threshold = failure_threshold
        self.reset_timeout = reset_timeout
        self.half_open_success_threshold = half_open_success_threshold
        
    async def execute(self, operation):
        import time
        
        if self.state == 'OPEN':
            if time.time() - self.last_failure_time >= self.reset_timeout:
                self.state = 'HALF_OPEN'
            else:
                raise Exception('Circuit breaker is open')
        
        try:
            result = await operation()
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise e
    
    def _on_success(self):
        if self.state == 'HALF_OPEN':
            self.success_count += 1
            if self.success_count >= self.half_open_success_threshold:
                self._reset()
                
    def _on_failure(self):
        import time
        self.last_failure_time = time.time()
        
        if self.state == 'CLOSED':
            self.failure_count += 1
            if self.failure_count >= self.failure_threshold:
                self.state = 'OPEN'
        elif self.state == 'HALF_OPEN':
            self.state = 'OPEN'
            
    def _reset(self):
        self.state = 'CLOSED'
        self.failure_count = 0
        self.success_count = 0
        
    def get_state(self):
        return self.state
```

### Go Implementation

```go
// Circuit Breaker implementation
type State string

const (
    Closed   State = "CLOSED"
    Open     State = "OPEN"
    HalfOpen State = "HALF_OPEN"
)

type CircuitBreaker struct {
    state                   State
    failureCount            int
    successCount            int
    lastFailureTime         int64
    failureThreshold        int
    resetTimeout            int64
    halfOpenSuccessThreshold int
    mutex                   sync.Mutex
}

func NewCircuitBreaker(failureThreshold int, resetTimeoutMs int64, halfOpenSuccessThreshold int) *CircuitBreaker {
    return &CircuitBreaker{
        state:                   Closed,
        failureCount:            0,
        successCount:            0,
        lastFailureTime:         0,
        failureThreshold:        failureThreshold,
        resetTimeout:            resetTimeoutMs,
        halfOpenSuccessThreshold: halfOpenSuccessThreshold,
    }
}

func (cb *CircuitBreaker) Execute(operation func() (interface{}, error)) (interface{}, error) {
    cb.mutex.Lock()
    
    if cb.state == Open {
        now := time.Now().UnixMilli()
        if now-cb.lastFailureTime >= cb.resetTimeout {
            cb.state = HalfOpen
        } else {
            cb.mutex.Unlock()
            return nil, errors.New("circuit breaker is open")
        }
    }
    
    cb.mutex.Unlock()
    
    result, err := operation()
    
    cb.mutex.Lock()
    defer cb.mutex.Unlock()
    
    if err != nil {
        cb.onFailure()
        return nil, err
    }
    
    cb.onSuccess()
    return result, nil
}

func (cb *CircuitBreaker) onSuccess() {
    if cb.state == HalfOpen {
        cb.successCount++
        if cb.successCount >= cb.halfOpenSuccessThreshold {
            cb.reset()
        }
    }
}

func (cb *CircuitBreaker) onFailure() {
    cb.lastFailureTime = time.Now().UnixMilli()
    
    if cb.state == Closed {
        cb.failureCount++
        if cb.failureCount >= cb.failureThreshold {
            cb.state = Open
        }
    } else if cb.state == HalfOpen {
        cb.state = Open
    }
}

func (cb *CircuitBreaker) reset() {
    cb.state = Closed
    cb.failureCount = 0
    cb.successCount = 0
}

func (cb *CircuitBreaker) GetState() State {
    cb.mutex.Lock()
    defer cb.mutex.Unlock()
    return cb.state
}
```

## Implementation Plan

1. **Phase 1 - Core Patterns Implementation**
   - Implement Circuit Breaker, Retry, and Timeout patterns
   - Unit test each pattern independently
   - Apply to high-priority APIs (Zephyr, qTest)

2. **Phase 2 - Advanced Patterns**
   - Implement Bulkhead and Cache patterns
   - Create the Resilience Facade
   - Apply to all provider APIs

3. **Phase 3 - Health Monitoring and Observability**
   - Implement Service Health Monitor
   - Add telemetry and logging for resilience events
   - Create dashboard for monitoring service health

4. **Phase 4 - Polyglot Implementation**
   - Port TypeScript patterns to Python
   - Port TypeScript patterns to Go
   - Ensure consistent behavior across languages

## Testing Strategy

The resilience patterns must be thoroughly tested:

1. **Unit Tests**
   - Test each pattern in isolation
   - Verify pattern behavior under various conditions

2. **Integration Tests**
   - Test patterns working together
   - Verify proper interaction between patterns

3. **Chaos Tests**
   - Deliberately introduce failures to test resilience
   - Simulate network outages, high latency, etc.

4. **Load Tests**
   - Test behavior under high load conditions
   - Verify bulkhead effectiveness

5. **Recovery Tests**
   - Test system recovery after failures
   - Verify circuit breaker resets correctly

## Conclusion

By implementing these resilience patterns consistently across all API connections, Skíðblaðnir will gain a robust ability to handle service disruptions, network issues, and other failures. This will lead to improved reliability, better user experience, and reduced operational burden.