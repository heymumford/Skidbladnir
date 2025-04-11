/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { Cache, createCache, CacheOptions as _CacheOptions } from '../../src/utils/cache';

describe('Cache', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Basic functionality', () => {
    it('should create a cache with default options', () => {
      const cache = createCache();
      expect(cache).toBeInstanceOf(Cache);
    });

    it('should create a cache with custom options', () => {
      const cache = createCache({
        defaultTtl: 60000,
        maxSize: 100
      });
      expect(cache).toBeInstanceOf(Cache);
    });

    it('should set and get values', () => {
      const cache = createCache();
      
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
      
      cache.set('key2', { complex: 'object' });
      expect(cache.get('key2')).toEqual({ complex: 'object' });
    });

    it('should return undefined for non-existent keys', () => {
      const cache = createCache();
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should check if a key exists', () => {
      const cache = createCache();
      
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should delete keys', () => {
      const cache = createCache();
      
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      
      cache.delete('key1');
      expect(cache.has('key1')).toBe(false);
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should clear all keys', () => {
      const cache = createCache();
      
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      cache.clear();
      
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(false);
    });
  });

  describe('TTL functionality', () => {
    it('should expire items after default TTL', () => {
      const defaultTtl = 1000; // 1 second
      const cache = createCache({ defaultTtl });
      
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
      
      // Advance time past TTL
      jest.advanceTimersByTime(defaultTtl + 100);
      
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should expire items after custom TTL', () => {
      const cache = createCache({ defaultTtl: 10000 });
      
      cache.set('key1', 'value1', 1000); // Override with 1 second TTL
      expect(cache.get('key1')).toBe('value1');
      
      // Advance time past custom TTL
      jest.advanceTimersByTime(1100);
      
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should reset TTL when item is accessed with resetTtlOnGet option', () => {
      const cache = createCache({ 
        defaultTtl: 1000,
        resetTtlOnGet: true
      });
      
      cache.set('key1', 'value1');
      
      // Advance time to just before expiration
      jest.advanceTimersByTime(900);
      
      // Access the item, which should reset TTL
      expect(cache.get('key1')).toBe('value1');
      
      // Advance time past original TTL
      jest.advanceTimersByTime(900);
      
      // Item should still exist because TTL was reset
      expect(cache.get('key1')).toBe('value1');
    });

    it('should not reset TTL when resetTtlOnGet is false', () => {
      const cache = createCache({ 
        defaultTtl: 1000,
        resetTtlOnGet: false
      });
      
      cache.set('key1', 'value1');
      
      // Advance time to just before expiration
      jest.advanceTimersByTime(900);
      
      // Access the item, which should not reset TTL
      expect(cache.get('key1')).toBe('value1');
      
      // Advance time past original TTL
      jest.advanceTimersByTime(200);
      
      // Item should be expired
      expect(cache.get('key1')).toBeUndefined();
    });
  });

  describe('Size limits', () => {
    it('should enforce max size and evict oldest items', () => {
      const cache = createCache({ 
        maxSize: 2,
        prioritizeRecentlyUsed: false // Use FIFO instead of LRU
      });
      
      // Set access times explicitly to ensure deterministic eviction
      const now = Date.now();
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(now)       // First item timestamp
        .mockReturnValueOnce(now + 100) // Second item timestamp
        .mockReturnValueOnce(now + 200) // Third item timestamp
        .mockReturnValue(now + 300);    // For subsequent calls
      
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      // Both items should be in cache
      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBe('value2');
      
      // Add a third item, which should evict the oldest (key1)
      cache.set('key3', 'value3');
      
      expect(cache.has('key1')).toBe(false);
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');
    });

    it('should update access order when item is accessed with prioritizeRecentlyUsed', () => {
      const cache = createCache({ 
        maxSize: 2,
        prioritizeRecentlyUsed: true
      });
      
      // Set explicit timestamps for deterministic testing
      const now = Date.now();
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(now)       // key1 set
        .mockReturnValueOnce(now + 100) // key2 set
        .mockReturnValueOnce(now + 200) // key1 access (makes it most recent)
        .mockReturnValue(now + 300);    // For subsequent calls
      
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      // Access key1, making it the most recently used
      cache.get('key1');
      
      // Add a third item, which should evict the least recently used (key2)
      cache.set('key3', 'value3');
      
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
      expect(cache.has('key3')).toBe(true);
    });
  });

  describe('Advanced functionality', () => {
    it('should get and compute value if not present', () => {
      const cache = createCache();
      const computeFn = jest.fn().mockReturnValue('computed value');
      
      const value = cache.getOrCompute('key1', computeFn);
      
      expect(value).toBe('computed value');
      expect(computeFn).toHaveBeenCalledTimes(1);
      
      // Second call should return cached value without computing
      const secondValue = cache.getOrCompute('key1', computeFn);
      expect(secondValue).toBe('computed value');
      expect(computeFn).toHaveBeenCalledTimes(1);
    });

    it('should support async compute functions', async () => {
      const cache = createCache();
      const computeFn = jest.fn().mockResolvedValue('async value');
      
      const value = await cache.getOrComputeAsync('key1', computeFn);
      
      expect(value).toBe('async value');
      expect(computeFn).toHaveBeenCalledTimes(1);
      
      // Second call should return cached value without computing
      const secondValue = await cache.getOrComputeAsync('key1', computeFn);
      expect(secondValue).toBe('async value');
      expect(computeFn).toHaveBeenCalledTimes(1);
    });

    it('should handle compute function failures', () => {
      const cache = createCache();
      const computeFn = jest.fn().mockImplementation(() => {
        throw new Error('Compute failed');
      });
      
      expect(() => cache.getOrCompute('key1', computeFn)).toThrow('Compute failed');
      expect(cache.has('key1')).toBe(false);
    });

    it('should provide stats about the cache', () => {
      const cache = createCache({ maxSize: 10 });
      
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.get('key1');
      cache.get('nonexistent');
      
      const stats = cache.getStats();
      
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(10);
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });
  });
});