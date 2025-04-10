export interface CacheOptions {
  ttlMs: number;
  maxEntries?: number;
  staleWhileRevalidate?: boolean;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  isRevalidating?: boolean;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  staleHits: number;
  evictions: number;
}

export class ResponseCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private stats = {
    hits: 0,
    misses: 0,
    staleHits: 0,
    evictions: 0
  };

  constructor(
    private readonly options: CacheOptions = {
      ttlMs: 5 * 60 * 1000, // 5 minutes default
      maxEntries: 1000,
      staleWhileRevalidate: true
    }
  ) {}

  public async execute(
    key: string,
    operation: () => Promise<T>
  ): Promise<T> {
    // Check if we have a fresh cache entry
    const entry = this.cache.get(key);
    const now = Date.now();

    if (entry && entry.expiresAt > now) {
      // Cache hit - entry is still fresh
      this.stats.hits++;
      return entry.value;
    }

    if (
      entry &&
      this.options.staleWhileRevalidate &&
      !entry.isRevalidating
    ) {
      // Stale entry but we can use it while revalidating
      this.stats.staleHits++;
      
      // Mark as revalidating to prevent multiple revalidations
      entry.isRevalidating = true;
      
      // Revalidate in the background
      this.refreshCacheEntry(key, operation).catch(() => {
        // If refresh fails, mark as not revalidating so future calls will try again
        const currentEntry = this.cache.get(key);
        if (currentEntry) {
          currentEntry.isRevalidating = false;
        }
      });
      
      // Return stale value
      return entry.value;
    }

    // Cache miss or stale entry without staleWhileRevalidate
    this.stats.misses++;
    return this.refreshCacheEntry(key, operation);
  }

  private async refreshCacheEntry(
    key: string,
    operation: () => Promise<T>
  ): Promise<T> {
    try {
      const value = await operation();
      
      // Cache the new value
      this.set(key, value);
      return value;
    } finally {
      // Ensure we reset the revalidating flag regardless of success/failure
      const entry = this.cache.get(key);
      if (entry) {
        entry.isRevalidating = false;
      }
    }
  }

  public set(key: string, value: T): void {
    const now = Date.now();
    
    // Ensure we have space for the new entry
    this.ensureCapacity();
    
    this.cache.set(key, {
      value,
      expiresAt: now + this.options.ttlMs
    });
  }

  private ensureCapacity(): void {
    if (!this.options.maxEntries || this.cache.size < this.options.maxEntries) {
      return;
    }

    // LRU strategy: remove oldest entries
    // For simplicity, we'll just remove the first entry added
    // A more sophisticated implementation would track access timestamps
    const oldestKey = this.cache.keys().next().value;
    if (oldestKey) {
      this.stats.evictions++;
      this.cache.delete(oldestKey);
    }
  }

  public get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    const now = Date.now();
    if (entry.expiresAt <= now) {
      // Entry is stale
      if (!this.options.staleWhileRevalidate) {
        this.cache.delete(key);
        return undefined;
      }
      this.stats.staleHits++;
    } else {
      this.stats.hits++;
    }

    return entry.value;
  }

  public delete(key: string): boolean {
    return this.cache.delete(key);
  }

  public clear(): void {
    this.cache.clear();
  }

  public getStats(): CacheStats {
    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      staleHits: this.stats.staleHits,
      evictions: this.stats.evictions
    };
  }

  public resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      staleHits: 0,
      evictions: 0
    };
  }
}