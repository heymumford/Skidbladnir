import { CircuitBreaker, CircuitBreakerOptions } from './circuit-breaker';
import { RetryService, RetryOptions } from './retry';
import { Bulkhead, BulkheadOptions } from './bulkhead';
import { ResponseCache, CacheOptions } from './cache';
import { Logger } from '../logger';

export interface ResilienceFacadeOptions {
  retryOptions?: Partial<RetryOptions>;
  timeoutMs?: number;
  circuitBreakerOptions?: Partial<CircuitBreakerOptions>;
  bulkheadOptions?: Partial<BulkheadOptions>;
  cacheOptions?: Partial<CacheOptions>;
  serviceName?: string;
  fallbackEnabled?: boolean;
  logErrors?: boolean;
}

export interface ResilienceStats {
  circuitBreaker?: any;
  bulkhead?: any;
  cache?: any;
  healthStatus: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
}

export class ResilienceFacade<T = any> {
  private circuitBreaker?: CircuitBreaker;
  private retryService: RetryService;
  private bulkhead?: Bulkhead;
  private cache?: ResponseCache<T>;
  private serviceName: string;
  private logger: Logger;

  constructor(private readonly options: ResilienceFacadeOptions = {}) {
    this.serviceName = options.serviceName || 'UnnamedService';
    this.logger = new Logger('ResilienceFacade:' + this.serviceName);
    
    // Initialize retry service
    this.retryService = new RetryService(options.retryOptions);
    
    // Initialize circuit breaker if options provided
    if (options.circuitBreakerOptions) {
      this.circuitBreaker = new CircuitBreaker({
        failureThreshold: 5,
        resetTimeoutMs: 30000,
        halfOpenSuccessThreshold: 2,
        ...options.circuitBreakerOptions
      });
    }
    
    // Initialize bulkhead if options provided
    if (options.bulkheadOptions) {
      this.bulkhead = new Bulkhead({
        maxConcurrentCalls: 10,
        maxQueueSize: 100,
        executionTimeoutMs: options.timeoutMs,
        ...options.bulkheadOptions
      });
    }
    
    // Initialize cache if options provided
    if (options.cacheOptions) {
      this.cache = new ResponseCache<T>({
        ttlMs: 5 * 60 * 1000, // 5 minutes
        maxEntries: 1000,
        staleWhileRevalidate: true,
        ...options.cacheOptions
      });
    }
  }

  public async execute(
    key: string,
    operation: () => Promise<T>,
    fallback?: (error: Error) => Promise<T>
  ): Promise<T> {
    // Start with the original operation
    let currentOperation = operation;
    
    // Wrap with timeout if specified but no bulkhead
    // (bulkhead already handles timeout)
    if (this.options.timeoutMs && !this.bulkhead) {
      currentOperation = () => this.withTimeout(currentOperation, this.options.timeoutMs!);
    }
    
    // Wrap with retry
    currentOperation = () => this.retryService.execute(currentOperation);
    
    // Create the complete execution chain
    const execute = async (): Promise<T> => {
      // Try to get from cache first
      if (this.cache) {
        return this.cache.execute(key, () => this.executeWithPatterns(currentOperation));
      }
      
      // No cache, execute directly with patterns
      return this.executeWithPatterns(currentOperation);
    };
    
    try {
      return await execute();
    } catch (error) {
      if (this.options.logErrors) {
        this.logger.error(`Operation failed: ${(error as Error).message}`, { 
          error, 
          serviceName: this.serviceName,
          key
        });
      }
      
      // If fallback is provided and enabled, use it
      if (fallback && this.options.fallbackEnabled !== false) {
        return fallback(error as Error);
      }
      
      throw error;
    }
  }

  private async executeWithPatterns(operation: () => Promise<T>): Promise<T> {
    // Apply circuit breaker if configured
    if (this.circuitBreaker) {
      return this.circuitBreaker.execute(
        // Apply bulkhead if configured
        this.bulkhead
          ? () => this.bulkhead!.execute(operation)
          : operation
      );
    }
    
    // No circuit breaker, but use bulkhead if configured
    if (this.bulkhead) {
      return this.bulkhead.execute(operation);
    }
    
    // No circuit breaker or bulkhead
    return operation();
  }

  private async withTimeout<R>(
    operation: () => Promise<R>,
    timeoutMs: number
  ): Promise<R> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });
    
    return Promise.race([operation(), timeoutPromise]);
  }

  public getHealthStatus(): 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' {
    if (!this.circuitBreaker) {
      return 'HEALTHY';
    }
    
    const state = this.circuitBreaker.getState();
    if (state === 0) { // CLOSED
      return 'HEALTHY';
    } else if (state === 2) { // HALF_OPEN
      return 'DEGRADED';
    } else { // OPEN
      return 'UNHEALTHY';
    }
  }

  public getStats(): ResilienceStats {
    return {
      circuitBreaker: this.circuitBreaker?.getStats(),
      bulkhead: this.bulkhead?.getStats(),
      cache: this.cache?.getStats(),
      healthStatus: this.getHealthStatus()
    };
  }

  public reset(): void {
    this.circuitBreaker?.reset();
    this.bulkhead?.reset();
    this.cache?.clear();
    this.cache?.resetStats();
  }
}