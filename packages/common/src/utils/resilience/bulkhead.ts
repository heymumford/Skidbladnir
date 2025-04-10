export interface BulkheadOptions {
  maxConcurrentCalls: number;
  maxQueueSize: number;
  executionTimeoutMs?: number;
}

export interface BulkheadStats {
  activeCalls: number;
  queueSize: number;
  rejectedRequests: number;
  totalExecuted: number;
}

export class Bulkhead {
  private activeCalls = 0;
  private queue: Array<{
    resolve: (value: unknown) => void;
    reject: (reason?: any) => void;
    operation: () => Promise<unknown>;
  }> = [];
  private rejectedRequests = 0;
  private totalExecuted = 0;

  constructor(
    private readonly options: BulkheadOptions = {
      maxConcurrentCalls: 10,
      maxQueueSize: 100
    }
  ) {}

  public async execute<T>(operation: () => Promise<T>): Promise<T> {
    // If we can execute immediately, do so
    if (this.activeCalls < this.options.maxConcurrentCalls) {
      return this.executeOperation(operation) as Promise<T>;
    }

    // Otherwise, try to enqueue the request
    if (this.queue.length >= this.options.maxQueueSize) {
      this.rejectedRequests++;
      throw new Error('Bulkhead capacity exceeded. Request rejected.');
    }

    // Enqueue the request
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        resolve: resolve as (value: unknown) => void,
        reject,
        operation
      });
    });
  }

  private async executeOperation(operation: () => Promise<unknown>): Promise<unknown> {
    this.activeCalls++;
    this.totalExecuted++;
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      const executionPromise = operation();
      
      // Set timeout if specified
      if (this.options.executionTimeoutMs) {
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error(`Operation timed out after ${this.options.executionTimeoutMs}ms`));
          }, this.options.executionTimeoutMs);
        });
        
        return await Promise.race([executionPromise, timeoutPromise]);
      }
      
      return await executionPromise;
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      this.activeCalls--;
      this.processNextQueuedOperation();
    }
  }

  private processNextQueuedOperation(): void {
    if (this.queue.length === 0 || this.activeCalls >= this.options.maxConcurrentCalls) {
      return;
    }

    const nextOperation = this.queue.shift();
    if (!nextOperation) return;

    this.executeOperation(nextOperation.operation)
      .then(nextOperation.resolve)
      .catch(nextOperation.reject);
  }

  public getStats(): BulkheadStats {
    return {
      activeCalls: this.activeCalls,
      queueSize: this.queue.length,
      rejectedRequests: this.rejectedRequests,
      totalExecuted: this.totalExecuted
    };
  }

  public reset(): void {
    this.activeCalls = 0;
    this.queue = [];
    this.rejectedRequests = 0;
    this.totalExecuted = 0;
  }
}