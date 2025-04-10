export enum CircuitState {
  CLOSED,
  OPEN,
  HALF_OPEN
}

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenSuccessThreshold: number;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number | null;
  totalFailures: number;
  totalSuccesses: number;
  consecutiveSuccesses: number;
  consecutiveFailures: number;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;
  private totalFailures = 0;
  private totalSuccesses = 0;
  private consecutiveSuccesses = 0;
  private consecutiveFailures = 0;

  constructor(
    private readonly options: CircuitBreakerOptions = {
      failureThreshold: 5,
      resetTimeoutMs: 30000,
      halfOpenSuccessThreshold: 2
    }
  ) {}

  public async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldRetryAfterTimeout()) {
        this.transitionToHalfOpen();
      } else {
        throw new Error('Circuit is open');
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
    this.successCount++;
    this.totalSuccesses++;
    this.consecutiveSuccesses++;
    this.consecutiveFailures = 0;

    if (
      this.state === CircuitState.HALF_OPEN &&
      this.consecutiveSuccesses >= this.options.halfOpenSuccessThreshold
    ) {
      this.transitionToClosed();
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.totalFailures++;
    this.lastFailureTime = Date.now();
    this.consecutiveFailures++;
    this.consecutiveSuccesses = 0;

    if (
      this.state === CircuitState.CLOSED &&
      this.failureCount >= this.options.failureThreshold
    ) {
      this.transitionToOpen();
    } else if (this.state === CircuitState.HALF_OPEN) {
      this.transitionToOpen();
    }
  }

  private transitionToClosed(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
  }

  private transitionToOpen(): void {
    this.state = CircuitState.OPEN;
  }

  private transitionToHalfOpen(): void {
    this.state = CircuitState.HALF_OPEN;
    this.failureCount = 0;
    this.successCount = 0;
  }

  private shouldRetryAfterTimeout(): boolean {
    if (this.lastFailureTime === null) {
      return false;
    }
    const now = Date.now();
    return now - this.lastFailureTime > this.options.resetTimeoutMs;
  }

  public reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.totalFailures = 0;
    this.totalSuccesses = 0;
    this.consecutiveSuccesses = 0;
    this.consecutiveFailures = 0;
  }

  public getState(): CircuitState {
    return this.state;
  }

  public getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      consecutiveSuccesses: this.consecutiveSuccesses,
      consecutiveFailures: this.consecutiveFailures
    };
  }
}