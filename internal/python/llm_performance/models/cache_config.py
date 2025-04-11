"""
Cache configuration for LLM performance optimization.
"""

from dataclasses import dataclass, field
from typing import Dict, Any, Optional, List
from enum import Enum
import time


class CacheStrategy(str, Enum):
    """Strategy for cache storage and eviction."""
    LRU = "lru"  # Least Recently Used
    LFU = "lfu"  # Least Frequently Used
    TIERED = "tiered"  # Combination of memory and disk-based caching


@dataclass
class CacheConfig:
    """Configuration for the LLM response cache."""
    
    max_size: int = 1000  # Maximum number of cached items
    ttl_seconds: int = 3600  # Default TTL of 1 hour
    strategy: CacheStrategy = CacheStrategy.LRU
    persistent: bool = False  # Whether to persist cache to disk
    cache_file: Optional[str] = None  # Path to cache file if persistent
    
    # Advanced options
    use_distributed_cache: bool = False  # Use Redis or similar
    distributed_cache_url: Optional[str] = None
    enable_cache_compression: bool = False
    compression_threshold_bytes: int = 1024  # Only compress items larger than this
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert cache config to dictionary."""
        return {
            "max_size": self.max_size,
            "ttl_seconds": self.ttl_seconds,
            "strategy": str(self.strategy.value),
            "persistent": self.persistent,
            "cache_file": self.cache_file,
            "use_distributed_cache": self.use_distributed_cache,
            "distributed_cache_url": self.distributed_cache_url,
            "enable_cache_compression": self.enable_cache_compression,
            "compression_threshold_bytes": self.compression_threshold_bytes
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'CacheConfig':
        """Create cache config from dictionary."""
        return cls(
            max_size=data.get("max_size", 1000),
            ttl_seconds=data.get("ttl_seconds", 3600),
            strategy=CacheStrategy(data.get("strategy", "lru")),
            persistent=data.get("persistent", False),
            cache_file=data.get("cache_file"),
            use_distributed_cache=data.get("use_distributed_cache", False),
            distributed_cache_url=data.get("distributed_cache_url"),
            enable_cache_compression=data.get("enable_cache_compression", False),
            compression_threshold_bytes=data.get("compression_threshold_bytes", 1024)
        )


@dataclass
class CacheEntry:
    """A single entry in the cache."""
    
    key: str
    value: Any
    created_at: float = field(default_factory=time.time)
    expires_at: Optional[float] = None
    access_count: int = 0
    last_accessed_at: float = field(default_factory=time.time)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def is_expired(self) -> bool:
        """Check if this cache entry has expired."""
        if self.expires_at is None:
            return False
        return time.time() > self.expires_at
    
    def update_access(self) -> None:
        """Update access statistics for this entry."""
        self.access_count += 1
        self.last_accessed_at = time.time()


@dataclass
class CacheStats:
    """Statistics about cache performance."""
    
    total_entries: int = 0
    hits: int = 0
    misses: int = 0
    evictions: int = 0
    expired: int = 0
    bytes_used: int = 0
    oldest_entry_age: float = 0.0
    newest_entry_age: float = 0.0
    
    @property
    def hit_ratio(self) -> float:
        """Calculate the cache hit ratio."""
        total = self.hits + self.misses
        if total == 0:
            return 0.0
        return self.hits / total