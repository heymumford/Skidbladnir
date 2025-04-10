export interface RetryOptions {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
  retryableErrors?: Array<string | RegExp>;
  retryCondition?: (error: Error) => boolean;
}

export interface RetryStats {
  attempts: number;
  succeeded: boolean;
  totalRetryMs: number;
  errors: Error[];
}

export class RetryService {
  private readonly defaultOptions: RetryOptions = {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffFactor: 2
  };

  constructor(private readonly options: Partial<RetryOptions> = {}) {}

  public async execute<T>(operation: () => Promise<T>): Promise<T> {
    const mergedOptions: RetryOptions = {
      ...this.defaultOptions,
      ...this.options
    };

    let attempt = 0;
    let delay = mergedOptions.initialDelayMs;
    const errors: Error[] = [];
    let totalRetryMs = 0;

    while (attempt < mergedOptions.maxAttempts) {
      try {
        attempt++;
        return await operation();
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        errors.push(error);

        if (attempt >= mergedOptions.maxAttempts) {
          throw this.createAggregateError(errors, attempt);
        }

        if (!this.shouldRetry(error, mergedOptions)) {
          throw error;
        }

        await this.delay(delay);
        totalRetryMs += delay;
        delay = Math.min(
          delay * mergedOptions.backoffFactor,
          mergedOptions.maxDelayMs
        );
      }
    }

    // This should never happen due to the throw in the catch block
    throw this.createAggregateError(errors, attempt);
  }

  private shouldRetry(error: Error, options: RetryOptions): boolean {
    if (options.retryCondition && options.retryCondition(error)) {
      return true;
    }

    if (!options.retryableErrors || options.retryableErrors.length === 0) {
      return true;
    }

    return options.retryableErrors.some(errorPattern => {
      if (typeof errorPattern === 'string') {
        return error.message.includes(errorPattern);
      }
      return errorPattern.test(error.message);
    });
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private createAggregateError(errors: Error[], attempts: number): Error {
    const lastError = errors[errors.length - 1];
    const errorMessage = `Failed after ${attempts} attempts. Last error: ${lastError.message}`;
    const aggregateError = new Error(errorMessage);
    
    // Add additional properties to the error
    Object.defineProperties(aggregateError, {
      attempts: { value: attempts },
      errors: { value: errors },
      lastError: { value: lastError }
    });
    
    return aggregateError;
  }
}