"""
Cache service for LLM response caching with configurable strategies.
"""

import os
import json
import time
import hashlib
import pickle
from typing import Dict, Any, Optional, List, Tuple, Callable
from collections import OrderedDict, Counter
import threading
import gzip

from ..models.cache_config import CacheConfig, CacheEntry, CacheStrategy, CacheStats


class CacheService:
    """Service for caching LLM responses with different eviction strategies."""
    
    def __init__(self, config: Optional[CacheConfig] = None):
        """
        Initialize the cache service.
        
        Args:
            config: Cache configuration
        """
        self.config = config or CacheConfig()
        self.cache: Dict[str, CacheEntry] = {}
        self.lru_order = OrderedDict()  # For LRU strategy
        self.access_counts = Counter()  # For LFU strategy
        self.stats = CacheStats()
        self.lock = threading.RLock()  # Reentrant lock for thread safety
        
        # Load cache from disk if persistent
        if self.config.persistent and self.config.cache_file:
            self._load_cache()
    
    def get(self, key: str) -> Optional[Any]:
        """
        Get a value from the cache.
        
        Args:
            key: Cache key
            
        Returns:
            Optional[Any]: Cached value or None if not found
        """
        with self.lock:
            if key not in self.cache:
                self.stats.misses += 1
                return None
            
            entry = self.cache[key]
            
            # Check for expiration
            if entry.is_expired():
                self._remove_entry(key)
                self.stats.expired += 1
                self.stats.misses += 1
                return None
            
            # Update access statistics
            entry.update_access()
            self.access_counts[key] += 1
            
            # Update LRU order
            if self.config.strategy == CacheStrategy.LRU:
                self.lru_order.move_to_end(key)
            
            self.stats.hits += 1
            return entry.value
    
    def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> None:
        """
        Set a value in the cache.
        
        Args:
            key: Cache key
            value: Value to cache
            ttl_seconds: Time-to-live in seconds, or None to use default
        """
        with self.lock:
            # Evict items if cache is full
            self._ensure_capacity()
            
            # Calculate expiration time
            expiration = None
            if ttl_seconds is not None or self.config.ttl_seconds:
                ttl = ttl_seconds if ttl_seconds is not None else self.config.ttl_seconds
                expiration = time.time() + ttl
            
            # Create new entry
            entry = CacheEntry(
                key=key,
                value=value,
                expires_at=expiration
            )
            
            # Store entry
            self.cache[key] = entry
            
            # Update LRU order
            if self.config.strategy == CacheStrategy.LRU:
                self.lru_order[key] = None
                self.lru_order.move_to_end(key)
            
            # Update access counts for LFU
            self.access_counts[key] = 0
            
            # Update stats
            self.stats.total_entries = len(self.cache)
            
            # Save to disk if persistent
            if self.config.persistent and self.config.cache_file:
                self._save_cache()
    
    def delete(self, key: str) -> bool:
        """
        Delete an item from the cache.
        
        Args:
            key: Cache key
            
        Returns:
            bool: True if item was deleted, False if not found
        """
        with self.lock:
            if key not in self.cache:
                return False
            
            self._remove_entry(key)
            return True
    
    def clear(self) -> int:
        """
        Clear all items from the cache.
        
        Returns:
            int: Number of items cleared
        """
        with self.lock:
            count = len(self.cache)
            self.cache = {}
            self.lru_order = OrderedDict()
            self.access_counts = Counter()
            
            # Update stats
            self.stats.evictions += count
            self.stats.total_entries = 0
            
            # Save empty cache if persistent
            if self.config.persistent and self.config.cache_file:
                self._save_cache()
            
            return count
    
    def get_stats(self) -> CacheStats:
        """
        Get cache statistics.
        
        Returns:
            CacheStats: Cache statistics
        """
        with self.lock:
            # Update dynamic stats
            self.stats.total_entries = len(self.cache)
            
            if self.cache:
                # Calculate entry ages
                current_time = time.time()
                entry_times = [entry.created_at for entry in self.cache.values()]
                newest_time = max(entry_times)
                oldest_time = min(entry_times)
                
                self.stats.newest_entry_age = current_time - newest_time
                self.stats.oldest_entry_age = current_time - oldest_time
                
                # Estimate memory usage
                sample_size = min(10, len(self.cache))
                sample_keys = list(self.cache.keys())[:sample_size]
                sample_entries = [self.cache[k] for k in sample_keys]
                avg_bytes = sum(len(pickle.dumps(entry)) for entry in sample_entries) / sample_size
                self.stats.bytes_used = int(avg_bytes * len(self.cache))
            
            return self.stats
    
    def get_keys(self) -> List[str]:
        """
        Get all keys in the cache.
        
        Returns:
            List[str]: List of cache keys
        """
        with self.lock:
            return list(self.cache.keys())
    
    def get_batch(self, keys: List[str]) -> Dict[str, Any]:
        """
        Get multiple values from the cache.
        
        Args:
            keys: List of cache keys
            
        Returns:
            Dict[str, Any]: Dictionary of key-value pairs for cache hits
        """
        result = {}
        with self.lock:
            for key in keys:
                value = self.get(key)
                if value is not None:
                    result[key] = value
        return result
    
    def set_batch(self, items: Dict[str, Any], ttl_seconds: Optional[int] = None) -> None:
        """
        Set multiple values in the cache.
        
        Args:
            items: Dictionary of key-value pairs to cache
            ttl_seconds: Time-to-live in seconds, or None to use default
        """
        with self.lock:
            for key, value in items.items():
                self.set(key, value, ttl_seconds)
    
    def contains(self, key: str) -> bool:
        """
        Check if a key exists in the cache and is not expired.
        
        Args:
            key: Cache key
            
        Returns:
            bool: True if key exists and is not expired, False otherwise
        """
        with self.lock:
            if key not in self.cache:
                return False
            
            entry = self.cache[key]
            if entry.is_expired():
                self._remove_entry(key)
                self.stats.expired += 1
                return False
            
            return True
    
    def get_or_set(self, key: str, value_func: Callable[[], Any], ttl_seconds: Optional[int] = None) -> Any:
        """
        Get a value from the cache, or set it if not found.
        
        Args:
            key: Cache key
            value_func: Function to call to generate the value if not in cache
            ttl_seconds: Time-to-live in seconds, or None to use default
            
        Returns:
            Any: Cached value
        """
        with self.lock:
            # Try to get from cache
            value = self.get(key)
            if value is not None:
                return value
            
            # Generate new value
            value = value_func()
            
            # Store in cache
            self.set(key, value, ttl_seconds)
            
            return value
    
    def _ensure_capacity(self) -> None:
        """Ensure cache has capacity for a new item."""
        if len(self.cache) >= self.config.max_size:
            self._evict_item()
    
    def _evict_item(self) -> None:
        """Evict an item based on the configured strategy."""
        if not self.cache:
            return
        
        key_to_evict = None
        
        if self.config.strategy == CacheStrategy.LRU:
            # Evict least recently used item
            key_to_evict, _ = self.lru_order.popitem(last=False)
        elif self.config.strategy == CacheStrategy.LFU:
            # Evict least frequently used item
            key_to_evict = self.access_counts.most_common()[:-1-1:-1][0][0]
        elif self.config.strategy == CacheStrategy.TIERED:
            # Implement tiered eviction strategy
            # This is a simplified version that combines LRU and LFU
            # by considering both access count and recency
            
            # Get the 5 least frequently used items
            lfu_candidates = [k for k, _ in self.access_counts.most_common()[:-6:-1]]
            
            # From those, pick the least recently used
            candidates_recency = {
                k: self.cache[k].last_accessed_at for k in lfu_candidates if k in self.cache
            }
            
            if candidates_recency:
                key_to_evict = min(candidates_recency.items(), key=lambda x: x[1])[0]
            else:
                # Fallback to LRU if something went wrong
                key_to_evict, _ = self.lru_order.popitem(last=False)
        
        if key_to_evict:
            self._remove_entry(key_to_evict)
            self.stats.evictions += 1
    
    def _remove_entry(self, key: str) -> None:
        """Remove an entry from all cache data structures."""
        if key in self.cache:
            del self.cache[key]
        
        if key in self.lru_order:
            del self.lru_order[key]
        
        if key in self.access_counts:
            del self.access_counts[key]
        
        # Update stats
        self.stats.total_entries = len(self.cache)
    
    def _generate_key(self, data: Any) -> str:
        """
        Generate a cache key from data.
        
        Args:
            data: Data to generate key from
            
        Returns:
            str: Cache key
        """
        if isinstance(data, str):
            serialized = data.encode('utf-8')
        else:
            try:
                serialized = json.dumps(data, sort_keys=True).encode('utf-8')
            except (TypeError, ValueError):
                # Fall back to pickle for non-JSON-serializable data
                serialized = pickle.dumps(data)
        
        return hashlib.md5(serialized).hexdigest()
    
    def _compress_value(self, value: Any) -> bytes:
        """
        Compress a value for storage.
        
        Args:
            value: Value to compress
            
        Returns:
            bytes: Compressed value
        """
        serialized = pickle.dumps(value)
        
        if self.config.enable_cache_compression and len(serialized) >= self.config.compression_threshold_bytes:
            return gzip.compress(serialized)
        
        return serialized
    
    def _decompress_value(self, data: bytes) -> Any:
        """
        Decompress a stored value.
        
        Args:
            data: Compressed data
            
        Returns:
            Any: Decompressed value
        """
        try:
            # Try to decompress as gzip
            decompressed = gzip.decompress(data)
            return pickle.loads(decompressed)
        except (OSError, pickle.PickleError):
            # Not compressed or decompression error
            try:
                return pickle.loads(data)
            except pickle.PickleError:
                # Unable to unpickle
                return None
    
    def _save_cache(self) -> bool:
        """
        Save cache to disk.
        
        Returns:
            bool: True if save was successful, False otherwise
        """
        if not self.config.persistent or not self.config.cache_file:
            return False
        
        try:
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(os.path.abspath(self.config.cache_file)), exist_ok=True)
            
            # Prepare data for serialization
            cache_data = {
                key: {
                    "key": entry.key,
                    "value": entry.value,
                    "created_at": entry.created_at,
                    "expires_at": entry.expires_at,
                    "access_count": entry.access_count,
                    "last_accessed_at": entry.last_accessed_at,
                    "metadata": entry.metadata
                }
                for key, entry in self.cache.items()
            }
            
            # Serialize and save
            with open(self.config.cache_file, 'wb') as f:
                pickle.dump({
                    "cache_data": cache_data,
                    "lru_order": list(self.lru_order.keys()),
                    "access_counts": dict(self.access_counts),
                    "stats": {
                        "hits": self.stats.hits,
                        "misses": self.stats.misses,
                        "evictions": self.stats.evictions,
                        "expired": self.stats.expired
                    }
                }, f)
                
            return True
        except (IOError, pickle.PickleError):
            # Log error but continue
            return False
    
    def _load_cache(self) -> bool:
        """
        Load cache from disk.
        
        Returns:
            bool: True if load was successful, False otherwise
        """
        if not self.config.persistent or not self.config.cache_file:
            return False
        
        if not os.path.exists(self.config.cache_file):
            return False
        
        try:
            with open(self.config.cache_file, 'rb') as f:
                data = pickle.load(f)
            
            # Restore cache entries
            self.cache = {}
            for key, entry_data in data.get("cache_data", {}).items():
                self.cache[key] = CacheEntry(
                    key=entry_data["key"],
                    value=entry_data["value"],
                    created_at=entry_data["created_at"],
                    expires_at=entry_data["expires_at"],
                    access_count=entry_data["access_count"],
                    last_accessed_at=entry_data["last_accessed_at"],
                    metadata=entry_data["metadata"]
                )
            
            # Restore LRU order
            self.lru_order = OrderedDict()
            for key in data.get("lru_order", []):
                if key in self.cache:
                    self.lru_order[key] = None
            
            # Restore access counts
            self.access_counts = Counter(data.get("access_counts", {}))
            
            # Restore stats
            stats_data = data.get("stats", {})
            self.stats.hits = stats_data.get("hits", 0)
            self.stats.misses = stats_data.get("misses", 0)
            self.stats.evictions = stats_data.get("evictions", 0)
            self.stats.expired = stats_data.get("expired", 0)
            self.stats.total_entries = len(self.cache)
            
            return True
        except (IOError, pickle.PickleError, KeyError):
            # Initialize with empty cache if load fails
            self.cache = {}
            self.lru_order = OrderedDict()
            self.access_counts = Counter()
            return False