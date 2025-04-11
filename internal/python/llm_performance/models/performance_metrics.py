"""
Performance metrics models for LLM performance tracking and optimization.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
import time
import statistics
from enum import Enum


class QueryType(str, Enum):
    """Types of LLM queries."""
    
    COMPLETION = "completion"  # Standard completion query
    EMBEDDING = "embedding"    # Text embedding
    CLASSIFICATION = "classification"  # Classification task
    SUMMARIZATION = "summarization"  # Text summarization
    TRANSLATION = "translation"  # Language translation
    BATCH = "batch"  # Batch processing
    OTHER = "other"  # Other query types


@dataclass
class InferenceMetric:
    """Metrics for a single inference operation."""
    
    prompt_tokens: int
    completion_tokens: int
    latency_seconds: float
    query_type: QueryType
    model_name: str
    timestamp: float = field(default_factory=time.time)
    cached: bool = False
    quantization_bits: int = 0
    batch_size: int = 1
    error: Optional[str] = None
    memory_used_mb: int = 0
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ModelPerformanceSnapshot:
    """Performance snapshot for a model at a point in time."""
    
    model_name: str
    timestamp: float = field(default_factory=time.time)
    
    # Token statistics
    total_prompt_tokens: int = 0
    total_completion_tokens: int = 0
    tokens_per_second: float = 0.0
    
    # Latency statistics
    average_latency: float = 0.0
    p50_latency: float = 0.0
    p90_latency: float = 0.0
    p99_latency: float = 0.0
    
    # Memory statistics
    average_memory_mb: int = 0
    peak_memory_mb: int = 0
    
    # Cache statistics
    cache_hit_rate: float = 0.0
    cache_size: int = 0
    
    # Error statistics
    error_rate: float = 0.0
    
    # Batch statistics
    average_batch_size: float = 0.0
    total_batches: int = 0
    
    # Cost statistics (if applicable)
    estimated_cost: float = 0.0
    
    # Raw metrics used to calculate this snapshot
    metrics: List[InferenceMetric] = field(default_factory=list)


class PerformanceTracker:
    """Tracks and analyzes LLM performance metrics."""
    
    def __init__(self, history_limit: int = 1000):
        """
        Initialize the performance tracker.
        
        Args:
            history_limit: Maximum number of metrics to store
        """
        self.metrics: List[InferenceMetric] = []
        self.history_limit = max(10, history_limit)
        self.snapshots: List[ModelPerformanceSnapshot] = []
        self.snapshot_interval_seconds = 300  # 5 minutes
        self.last_snapshot_time = 0.0
    
    def record_metric(self, metric: InferenceMetric) -> None:
        """
        Record a new inference metric.
        
        Args:
            metric: Inference metric to record
        """
        self.metrics.append(metric)
        
        # Trim history if needed
        if len(self.metrics) > self.history_limit:
            self.metrics = self.metrics[-self.history_limit:]
        
        # Create snapshot if interval has passed
        current_time = time.time()
        if current_time - self.last_snapshot_time >= self.snapshot_interval_seconds:
            self._create_snapshot()
            self.last_snapshot_time = current_time
    
    def get_latest_metrics(self, count: int = 10) -> List[InferenceMetric]:
        """
        Get the most recent metrics.
        
        Args:
            count: Number of metrics to return
            
        Returns:
            List[InferenceMetric]: Most recent metrics
        """
        return self.metrics[-count:]
    
    def get_metrics_by_model(self, model_name: str) -> List[InferenceMetric]:
        """
        Get metrics for a specific model.
        
        Args:
            model_name: Name of the model
            
        Returns:
            List[InferenceMetric]: Metrics for the model
        """
        return [m for m in self.metrics if m.model_name == model_name]
    
    def get_latest_snapshot(self, model_name: Optional[str] = None) -> Optional[ModelPerformanceSnapshot]:
        """
        Get the latest performance snapshot.
        
        Args:
            model_name: Optional model name to filter by
            
        Returns:
            Optional[ModelPerformanceSnapshot]: Latest snapshot, or None if no snapshots
        """
        if not self.snapshots:
            return None
        
        if model_name:
            model_snapshots = [s for s in self.snapshots if s.model_name == model_name]
            return model_snapshots[-1] if model_snapshots else None
        
        return self.snapshots[-1]
    
    def get_average_latency(self, model_name: Optional[str] = None, window: int = 20) -> float:
        """
        Get average latency over the recent window.
        
        Args:
            model_name: Optional model name to filter by
            window: Number of recent metrics to consider
            
        Returns:
            float: Average latency in seconds
        """
        filtered_metrics = self.metrics
        if model_name:
            filtered_metrics = [m for m in filtered_metrics if m.model_name == model_name]
        
        recent_metrics = filtered_metrics[-window:]
        
        if not recent_metrics:
            return 0.0
        
        latencies = [m.latency_seconds for m in recent_metrics]
        return sum(latencies) / len(latencies)
    
    def get_token_throughput(self, model_name: Optional[str] = None, window: int = 20) -> float:
        """
        Get token throughput (tokens per second) over the recent window.
        
        Args:
            model_name: Optional model name to filter by
            window: Number of recent metrics to consider
            
        Returns:
            float: Tokens per second
        """
        filtered_metrics = self.metrics
        if model_name:
            filtered_metrics = [m for m in filtered_metrics if m.model_name == model_name]
        
        recent_metrics = filtered_metrics[-window:]
        
        if not recent_metrics:
            return 0.0
        
        total_tokens = sum(m.prompt_tokens + m.completion_tokens for m in recent_metrics)
        total_time = sum(m.latency_seconds for m in recent_metrics)
        
        if total_time == 0:
            return 0.0
        
        return total_tokens / total_time
    
    def get_cache_hit_rate(self, window: int = 100) -> float:
        """
        Get cache hit rate over the recent window.
        
        Args:
            window: Number of recent metrics to consider
            
        Returns:
            float: Cache hit rate (0.0 to 1.0)
        """
        recent_metrics = self.metrics[-window:]
        
        if not recent_metrics:
            return 0.0
        
        cached_count = sum(1 for m in recent_metrics if m.cached)
        return cached_count / len(recent_metrics)
    
    def get_error_rate(self, window: int = 100) -> float:
        """
        Get error rate over the recent window.
        
        Args:
            window: Number of recent metrics to consider
            
        Returns:
            float: Error rate (0.0 to 1.0)
        """
        recent_metrics = self.metrics[-window:]
        
        if not recent_metrics:
            return 0.0
        
        error_count = sum(1 for m in recent_metrics if m.error is not None)
        return error_count / len(recent_metrics)
    
    def clear_metrics(self) -> int:
        """
        Clear all recorded metrics.
        
        Returns:
            int: Number of metrics cleared
        """
        count = len(self.metrics)
        self.metrics = []
        return count
    
    def _create_snapshot(self) -> ModelPerformanceSnapshot:
        """
        Create a performance snapshot from current metrics.
        
        Returns:
            ModelPerformanceSnapshot: Performance snapshot
        """
        if not self.metrics:
            return None
        
        # Group metrics by model
        models = set(m.model_name for m in self.metrics)
        
        snapshots = []
        for model_name in models:
            model_metrics = [m for m in self.metrics if m.model_name == model_name]
            
            if not model_metrics:
                continue
            
            # Basic statistics
            total_prompt_tokens = sum(m.prompt_tokens for m in model_metrics)
            total_completion_tokens = sum(m.completion_tokens for m in model_metrics)
            total_tokens = total_prompt_tokens + total_completion_tokens
            
            # Latency statistics
            latencies = [m.latency_seconds for m in model_metrics]
            average_latency = sum(latencies) / len(latencies) if latencies else 0.0
            
            # Try to calculate percentiles
            try:
                sorted_latencies = sorted(latencies)
                p50_latency = sorted_latencies[int(len(sorted_latencies) * 0.5)] if latencies else 0.0
                p90_latency = sorted_latencies[int(len(sorted_latencies) * 0.9)] if latencies else 0.0
                p99_latency = sorted_latencies[int(len(sorted_latencies) * 0.99)] if latencies else 0.0
            except IndexError:
                # Fallback if not enough data points
                p50_latency = average_latency
                p90_latency = average_latency
                p99_latency = average_latency
            
            # Token throughput
            total_time = sum(latencies)
            tokens_per_second = total_tokens / total_time if total_time > 0 else 0.0
            
            # Memory statistics
            memory_values = [m.memory_used_mb for m in model_metrics if m.memory_used_mb > 0]
            average_memory_mb = sum(memory_values) / len(memory_values) if memory_values else 0
            peak_memory_mb = max(memory_values) if memory_values else 0
            
            # Cache statistics
            cached_count = sum(1 for m in model_metrics if m.cached)
            cache_hit_rate = cached_count / len(model_metrics) if model_metrics else 0.0
            
            # Error statistics
            error_count = sum(1 for m in model_metrics if m.error is not None)
            error_rate = error_count / len(model_metrics) if model_metrics else 0.0
            
            # Batch statistics
            batch_metrics = [m for m in model_metrics if m.query_type == QueryType.BATCH]
            batch_sizes = [m.batch_size for m in batch_metrics if m.batch_size > 1]
            average_batch_size = sum(batch_sizes) / len(batch_sizes) if batch_sizes else 0.0
            
            # Create snapshot
            snapshot = ModelPerformanceSnapshot(
                model_name=model_name,
                timestamp=time.time(),
                total_prompt_tokens=total_prompt_tokens,
                total_completion_tokens=total_completion_tokens,
                tokens_per_second=tokens_per_second,
                average_latency=average_latency,
                p50_latency=p50_latency,
                p90_latency=p90_latency,
                p99_latency=p99_latency,
                average_memory_mb=average_memory_mb,
                peak_memory_mb=peak_memory_mb,
                cache_hit_rate=cache_hit_rate,
                cache_size=len(set(m.prompt_tokens for m in model_metrics if m.cached)),
                error_rate=error_rate,
                average_batch_size=average_batch_size,
                total_batches=len(batch_metrics),
                metrics=model_metrics.copy()
            )
            
            snapshots.append(snapshot)
            self.snapshots.append(snapshot)
        
        # Trim snapshot history if needed
        if len(self.snapshots) > self.history_limit:
            self.snapshots = self.snapshots[-self.history_limit:]
        
        return snapshots