"""
LLM Performance optimization module.

This module provides optimizations for LLM inference, including:
- Model quantization
- Response caching
- Batch processing
- Memory optimizations
- Hardware acceleration
"""

from .services.performance_service import LLMPerformanceService
from .services.model_registry import ModelRegistry
from .services.cache_service import CacheService
from .services.memory_monitor import MemoryMonitor
from .models.model_config import ModelConfig
from .models.cache_config import CacheConfig, CacheStrategy, CacheEntry, CacheStats
from .models.performance_metrics import InferenceMetric, ModelPerformanceSnapshot, PerformanceTracker, QueryType
from .utils.quantization import QuantizationLevel, QuantizationTool, ModelFormat

__version__ = "0.1.0"

__all__ = [
    'LLMPerformanceService',
    'ModelRegistry',
    'CacheService',
    'MemoryMonitor',
    'ModelConfig',
    'CacheConfig',
    'CacheStrategy',
    'CacheEntry',
    'CacheStats',
    'InferenceMetric',
    'ModelPerformanceSnapshot',
    'PerformanceTracker',
    'QueryType',
    'QuantizationLevel',
    'QuantizationTool',
    'ModelFormat'
]