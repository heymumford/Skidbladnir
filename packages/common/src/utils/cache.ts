/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * In-memory cache implementation
 * 
 * This utility provides a flexible caching mechanism with TTL support,
 * size limits, and LRU eviction strategies.
 */

import { createLogger, LogLevel } from './logger';

export interface CacheOptions {
  /**
   * Default time-to-live in milliseconds
   */
  defaultTtl: number;
  
  /**
   * Maximum number of items to store in the cache
   */
  maxSize?: number;
  
  /**
   * Whether to reset TTL when an item is accessed
   */
  resetTtlOnGet?: boolean;
  
  /**
   * Whether to prioritize recently used items when evicting
   */
  prioritizeRecentlyUsed?: boolean;
}

interface CacheEntry<T> {
  value: T;
  expiry: number;
  lastAccessed: number;
}

export class Cache<T = any> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private options: CacheOptions;
  private hits: number = 0;
  private misses: number = 0;
  private logger = createLogger({ context: 'Cache', level: LogLevel.NONE }); // Disable logging for tests
  
  constructor(options: Partial<CacheOptions> = {}) {
    this.options = {
      defaultTtl: 5 * 60 * 1000, // 5 minutes
      resetTtlOnGet: false,
      prioritizeRecentlyUsed: true,
      ...options
    };
  }
  
  /**
   * Set a value in the cache
   */
  public set(key: string, value: T, ttl?: number): void {
    this.cleanExpired();
    
    // Enforce size limit if configured
    if (this.options.maxSize && this.cache.size >= this.options.maxSize && !this.cache.has(key)) {
      this.evictOne();
    }
    
    const now = Date.now();
    const expiryMs = ttl !== undefined ? ttl : this.options.defaultTtl;
    
    this.cache.set(key, {
      value,
      expiry: now + expiryMs,
      lastAccessed: now
    });
  }
  
  /**
   * Get a value from the cache
   */
  public get(key: string): T | undefined {
    this.cleanExpired();
    
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.misses++;
      return undefined;
    }
    
    const now = Date.now();
    
    // Check if entry is expired
    if (entry.expiry < now) {
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }
    
    // Update access time and potentially extend TTL
    entry.lastAccessed = now;
    if (this.options.resetTtlOnGet) {
      entry.expiry = now + this.options.defaultTtl;
    }
    
    this.hits++;
    return entry.value;
  }
  
  /**
   * Check if a key exists in the cache
   */
  public has(key: string): boolean {
    this.cleanExpired();
    
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }
    
    // Check if entry is expired
    if (entry.expiry < Date.now()) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }
  
  /**
   * Delete a key from the cache
   */
  public delete(key: string): boolean {
    return this.cache.delete(key);
  }
  
  /**
   * Clear all items from the cache
   */
  public clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
  
  /**
   * Get a value from the cache or compute it if not present
   */
  public getOrCompute(key: string, computeFn: () => T): T {
    const cachedValue = this.get(key);
    
    if (cachedValue !== undefined) {
      return cachedValue;
    }
    
    const value = computeFn();
    this.set(key, value);
    return value;
  }
  
  /**
   * Get a value from the cache or compute it asynchronously if not present
   */
  public async getOrComputeAsync(key: string, computeFn: () => Promise<T>): Promise<T> {
    const cachedValue = this.get(key);
    
    if (cachedValue !== undefined) {
      return cachedValue;
    }
    
    const value = await computeFn();
    this.set(key, value);
    return value;
  }
  
  /**
   * Get cache statistics
   */
  public getStats(): {
    size: number;
    maxSize: number | undefined;
    hits: number;
    misses: number;
    hitRate: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.options.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits / (this.hits + this.misses || 1)
    };
  }
  
  /**
   * Remove expired entries from the cache
   */
  private cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry < now) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * Evict one item from the cache based on policy
   */
  private evictOne(): void {
    if (this.cache.size === 0) {
      return;
    }
    
    // For reliable testing, evict based on FIFO if not using LRU
    if (!this.options.prioritizeRecentlyUsed) {
      // Get the first item inserted (FIFO)
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
        return;
      }
    }
    
    // Find the entry to evict using LRU
    let keyToEvict: string | null = null;
    let oldestAccess = Date.now(); // Initialize to current time
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestAccess) {
        oldestAccess = entry.lastAccessed;
        keyToEvict = key;
      }
    }
    
    if (keyToEvict) {
      this.logger.debug(`Evicting cache key: ${keyToEvict}`);
      this.cache.delete(keyToEvict);
    }
  }
}

/**
 * Create a new cache instance
 */
export function createCache<T = any>(options: Partial<CacheOptions> = {}): Cache<T> {
  return new Cache<T>(options);
}

// Create a default cache for application-wide use
export const defaultCache = createCache();