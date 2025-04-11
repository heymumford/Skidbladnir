"""
Performance service for optimized LLM operations.
"""

import os
import time
import json
import logging
from typing import Dict, List, Any, Optional, Union, Callable, Tuple
from pathlib import Path
import threading
import queue
import uuid

from ..models.model_config import ModelConfig
from ..models.cache_config import CacheConfig, CacheStrategy
from ..models.performance_metrics import InferenceMetric, PerformanceTracker, QueryType
from ..utils.quantization import QuantizationLevel, QuantizationTool
from .model_registry import ModelRegistry
from .cache_service import CacheService
from .memory_monitor import MemoryMonitor


class LLMPerformanceService:
    """Service for optimized LLM operations with performance tracking."""
    
    def __init__(self, 
                config_path: str = None, 
                models_dir: str = None,
                cache_dir: str = None,
                logger: Optional[logging.Logger] = None):
        """
        Initialize the LLM performance service.
        
        Args:
            config_path: Path to configuration file
            models_dir: Directory for model storage
            cache_dir: Directory for cache storage
            logger: Logger instance
        """
        self.config_path = config_path or os.environ.get("LLM_CONFIG_PATH", "./llm_config.json")
        self.models_dir = models_dir or os.environ.get("LLM_MODELS_DIR", "./models")
        self.cache_dir = cache_dir or os.environ.get("LLM_CACHE_DIR", "./cache")
        self.logger = logger or logging.getLogger(__name__)
        
        # Initialize components
        self.model_registry = ModelRegistry(models_dir=self.models_dir)
        self.cache_service = CacheService(CacheConfig(
            persistent=True,
            cache_file=os.path.join(self.cache_dir, "llm_cache.pkl")
        ))
        self.memory_monitor = MemoryMonitor(poll_interval_seconds=30.0)
        self.performance_tracker = PerformanceTracker()
        self.quantization_tool = QuantizationTool(
            base_dir=self.models_dir,
            cache_dir=self.cache_dir
        )
        
        # Batch processing
        self.batch_size = 5
        self.batch_timeout_seconds = 0.5
        self.batch_queue = queue.Queue()
        self.batch_results = {}
        self.batch_thread = None
        self.batch_lock = threading.RLock()
        self.is_batch_processing = False
        
        # Create directories
        os.makedirs(self.models_dir, exist_ok=True)
        os.makedirs(self.cache_dir, exist_ok=True)
        
        # Load configuration if it exists
        self.load_config()
        
        # Register memory threshold alert
        self.memory_monitor.register_threshold_alert(
            threshold_mb=80,
            action=self.handle_memory_constraint,
            description="Memory usage above 80%",
            is_percentage=True
        )
        
        # Start memory monitoring
        self.memory_monitor.start()
    
    def load_config(self) -> bool:
        """
        Load configuration from file.
        
        Returns:
            bool: True if configuration was loaded successfully
        """
        if not os.path.exists(self.config_path):
            self.logger.info(f"Configuration file not found at {self.config_path}")
            return False
        
        try:
            with open(self.config_path, 'r') as f:
                config = json.load(f)
            
            # Load model configurations
            for model_config in config.get("models", []):
                self.model_registry.register_model(ModelConfig.from_dict(model_config))
            
            # Load cache configuration
            cache_config = config.get("cache", {})
            self.cache_service.config = CacheConfig.from_dict(cache_config)
            
            # Load batch configuration
            batch_config = config.get("batch", {})
            self.batch_size = batch_config.get("batch_size", 5)
            self.batch_timeout_seconds = batch_config.get("timeout_seconds", 0.5)
            
            return True
        except (json.JSONDecodeError, IOError) as e:
            self.logger.error(f"Error loading configuration: {e}")
            return False
    
    def save_config(self) -> bool:
        """
        Save configuration to file.
        
        Returns:
            bool: True if configuration was saved successfully
        """
        try:
            config = {
                "models": [
                    model.to_dict() for model in self.model_registry.models.values()
                ],
                "cache": self.cache_service.config.to_dict(),
                "batch": {
                    "batch_size": self.batch_size,
                    "timeout_seconds": self.batch_timeout_seconds
                }
            }
            
            with open(self.config_path, 'w') as f:
                json.dump(config, f, indent=2)
            
            return True
        except IOError as e:
            self.logger.error(f"Error saving configuration: {e}")
            return False
    
    def load_model(self, model_name: str) -> bool:
        """
        Load a model for inference.
        
        Args:
            model_name: Name of the model to load
            
        Returns:
            bool: True if model was loaded successfully
        """
        return self.model_registry.load_model(model_name) is not None
    
    def unload_model(self, model_name: str) -> bool:
        """
        Unload a model to free memory.
        
        Args:
            model_name: Name of the model to unload
            
        Returns:
            bool: True if model was unloaded successfully
        """
        return self.model_registry.unload_model(model_name)
    
    def get_loaded_models(self) -> Dict[str, Any]:
        """
        Get information about loaded models.
        
        Returns:
            Dict[str, Any]: Information about loaded models
        """
        return {
            name: self.model_registry.get_model_info(name)
            for name in self.model_registry.loaded_models.keys()
        }
    
    def select_model_for_task(self, task_complexity: float = 0.5) -> str:
        """
        Select the appropriate model based on task complexity.
        
        Args:
            task_complexity: Task complexity from 0.0 to 1.0
            
        Returns:
            str: Name of the selected model
        """
        # Get available memory
        available_memory_mb = self.memory_monitor.get_available_memory_mb()
        
        # Get optimal model based on complexity and available memory
        model_name = self.model_registry.get_optimal_model(
            complexity=task_complexity,
            memory_available_mb=available_memory_mb
        )
        
        # Ensure model is loaded
        if model_name and model_name not in self.model_registry.loaded_models:
            self.load_model(model_name)
        
        return model_name
    
    def query(self, 
             prompt: str, 
             model_name: Optional[str] = None, 
             task_complexity: float = 0.5,
             use_cache: bool = True) -> Dict[str, Any]:
        """
        Query the model with caching support.
        
        Args:
            prompt: The prompt to send to the model
            model_name: Name of the model to use, or None to auto-select
            task_complexity: Task complexity from 0.0 to 1.0
            use_cache: Whether to use the cache
            
        Returns:
            Dict[str, Any]: Model response
        """
        # Select model if not specified
        if not model_name:
            model_name = self.select_model_for_task(task_complexity)
        
        if not model_name:
            raise ValueError("No suitable model available")
        
        # Check if model is loaded
        if model_name not in self.model_registry.loaded_models:
            self.load_model(model_name)
        
        # Check cache if enabled
        cache_key = f"{model_name}:{prompt}"
        cached = False
        
        if use_cache:
            cached_response = self.cache_service.get(cache_key)
            if cached_response is not None:
                cached = True
                # Record performance metric for cached query
                self._record_inference_metric(
                    prompt=prompt,
                    completion=cached_response["completion"],
                    model_name=model_name,
                    latency_seconds=0.01,  # Nominal latency for cache hit
                    cached=True
                )
                return cached_response
        
        # Get the model
        model = self.model_registry.loaded_models.get(model_name)
        if not model:
            raise ValueError(f"Model {model_name} is not loaded")
        
        # Simulate model inference
        # In a real implementation, we would call the appropriate
        # inference method for the model type
        start_time = time.time()
        
        # Placeholder for model inference
        # This would be replaced with actual model inference code
        response = {
            "completion": f"Response to: {prompt[:20]}... (model: {model_name})",
            "model": model_name,
            "prompt": prompt,
            "timestamp": time.time()
        }
        
        # Calculate latency
        latency_seconds = time.time() - start_time
        
        # Record performance metric
        self._record_inference_metric(
            prompt=prompt,
            completion=response["completion"],
            model_name=model_name,
            latency_seconds=latency_seconds,
            cached=cached
        )
        
        # Cache the result if caching is enabled
        if use_cache:
            self.cache_service.set(cache_key, response)
        
        return response
    
    def batch_query(self, prompts: List[str], model_name: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Process multiple queries as a batch.
        
        Args:
            prompts: List of prompts to process
            model_name: Name of the model to use, or None to auto-select
            
        Returns:
            List[Dict[str, Any]]: List of model responses
        """
        if not prompts:
            return []
        
        # Select model if not specified
        if not model_name:
            # Use higher complexity for batch processing
            model_name = self.select_model_for_task(task_complexity=0.7)
        
        if not model_name:
            raise ValueError("No suitable model available")
        
        # Check if model is loaded
        if model_name not in self.model_registry.loaded_models:
            self.load_model(model_name)
        
        # Process batch
        start_time = time.time()
        
        # Check cache for each prompt
        results = []
        cache_hits = []
        cache_misses = []
        
        for prompt in prompts:
            cache_key = f"{model_name}:{prompt}"
            cached_response = self.cache_service.get(cache_key)
            
            if cached_response is not None:
                results.append(cached_response)
                cache_hits.append(prompt)
            else:
                cache_misses.append(prompt)
        
        # Process cache misses
        if cache_misses:
            # In a real implementation, we would batch process these
            # through the model's batch inference API
            for prompt in cache_misses:
                response = {
                    "completion": f"Batch response to: {prompt[:20]}... (model: {model_name})",
                    "model": model_name,
                    "prompt": prompt,
                    "timestamp": time.time()
                }
                
                results.append(response)
                
                # Cache the result
                cache_key = f"{model_name}:{prompt}"
                self.cache_service.set(cache_key, response)
        
        # Calculate batch metrics
        batch_time = time.time() - start_time
        
        # Record batch performance metric
        self._record_batch_metric(
            prompts=prompts,
            model_name=model_name,
            latency_seconds=batch_time,
            cache_hits=len(cache_hits),
            cache_misses=len(cache_misses)
        )
        
        return results
    
    def async_batch_query(self, prompt: str, callback: Callable[[Dict[str, Any]], None]) -> str:
        """
        Add a query to the batch processing queue.
        
        Args:
            prompt: Prompt to process
            callback: Function to call with the result
            
        Returns:
            str: Request ID
        """
        request_id = str(uuid.uuid4())
        
        # Add to queue
        with self.batch_lock:
            self.batch_queue.put((request_id, prompt, callback))
            
            # Start batch thread if not running
            if not self.is_batch_processing:
                self._start_batch_processing()
        
        return request_id
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """
        Get statistics about cache performance.
        
        Returns:
            Dict[str, Any]: Cache statistics
        """
        return self.cache_service.get_stats().__dict__
    
    def clear_cache(self) -> int:
        """
        Clear the response cache.
        
        Returns:
            int: Number of items cleared
        """
        return self.cache_service.clear()
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """
        Get performance metrics.
        
        Returns:
            Dict[str, Any]: Performance metrics
        """
        metrics = {}
        
        # Get latest snapshot for each model
        for model_name in self.model_registry.list_models():
            snapshot = self.performance_tracker.get_latest_snapshot(model_name)
            if snapshot:
                metrics[model_name] = {
                    "average_latency": snapshot.average_latency,
                    "p90_latency": snapshot.p90_latency,
                    "tokens_per_second": snapshot.tokens_per_second,
                    "cache_hit_rate": snapshot.cache_hit_rate,
                    "error_rate": snapshot.error_rate,
                    "average_memory_mb": snapshot.average_memory_mb,
                    "timestamp": snapshot.timestamp
                }
        
        # Add system memory metrics
        memory_stats = self.memory_monitor.get_memory_stats()
        metrics["system"] = {
            "total_memory_mb": memory_stats.total_mb,
            "available_memory_mb": memory_stats.available_mb,
            "memory_utilization": memory_stats.percent_used / 100.0,
            "application_memory_mb": memory_stats.application_mb
        }
        
        # Add cache metrics
        cache_stats = self.cache_service.get_stats()
        metrics["cache"] = {
            "size": cache_stats.total_entries,
            "hits": cache_stats.hits,
            "misses": cache_stats.misses,
            "hit_ratio": self.performance_tracker.get_cache_hit_rate(),
            "bytes_used": cache_stats.bytes_used
        }
        
        return metrics
    
    def handle_memory_constraint(self) -> None:
        """Handle high memory usage by freeing resources."""
        self.logger.warning("Memory constraint detected - reducing memory usage")
        
        # Get current memory pressure
        memory_pressure = self.memory_monitor.get_memory_pressure()
        
        # Take actions based on memory pressure
        if memory_pressure > 0.9:
            # Severe memory pressure - aggressive action needed
            
            # Clear cache
            self.clear_cache()
            
            # Unload all models except the smallest one
            loaded_models = list(self.model_registry.loaded_models.keys())
            if loaded_models:
                # Keep only the smallest model
                models_info = [(name, self.model_registry.models[name].memory_required_mb) 
                              for name in loaded_models 
                              if name in self.model_registry.models]
                models_info.sort(key=lambda x: x[1])  # Sort by memory requirement
                
                # Keep the smallest model, unload the rest
                for name, _ in models_info[1:]:
                    self.unload_model(name)
                
                # Make sure the smallest model is active
                if models_info:
                    self.model_registry.set_active_model(models_info[0][0])
            
        elif memory_pressure > 0.7:
            # High memory pressure - moderate action needed
            
            # Unload large models
            for name, model in list(self.model_registry.models.items()):
                if (model.memory_required_mb > 8000 and  # Large model threshold
                    name in self.model_registry.loaded_models):
                    self.unload_model(name)
            
            # Make sure we have at least one model loaded
            if not self.model_registry.loaded_models:
                # Find and load the smallest model
                available_models = [(name, model.memory_required_mb) 
                                  for name, model in self.model_registry.models.items()]
                if available_models:
                    available_models.sort(key=lambda x: x[1])  # Sort by memory requirement
                    self.load_model(available_models[0][0])
    
    def optimize_model_for_memory(self, model_name: str) -> Optional[str]:
        """
        Optimize a model for memory-constrained environments.
        
        Args:
            model_name: Name of the model to optimize
            
        Returns:
            Optional[str]: Name of the optimized model, or None if optimization failed
        """
        # Check if model exists
        model_config = self.model_registry.get_model_config(model_name)
        if not model_config:
            self.logger.error(f"Model {model_name} not found")
            return None
        
        # Check if model is already optimized enough
        if model_config.quantization_bits <= 4:
            self.logger.info(f"Model {model_name} is already optimized (quantization: {model_config.quantization_bits} bits)")
            return model_name
        
        # Determine target quantization level
        target_level = QuantizationLevel.Q4_0
        
        # Try to quantize the model
        try:
            optimized_path = self.quantization_tool.quantize_model(
                model_path=model_config.path,
                level=target_level
            )
            
            if not optimized_path:
                return None
            
            # Create and register optimized model config
            optimized_name = f"{model_name}-{target_level.value}"
            optimized_config = ModelConfig(
                name=optimized_name,
                path=optimized_path,
                quantization_bits=4,
                context_length=model_config.context_length,
                max_tokens=model_config.max_tokens,
                system_prompt=model_config.system_prompt,
                parameters=model_config.parameters.copy(),
                memory_required_mb=model_config.memory_required_mb // 2  # Rough estimate
            )
            
            self.model_registry.register_model(optimized_config)
            return optimized_name
            
        except Exception as e:
            self.logger.error(f"Error optimizing model: {e}")
            return None
    
    def _record_inference_metric(self, 
                              prompt: str, 
                              completion: str, 
                              model_name: str, 
                              latency_seconds: float, 
                              cached: bool) -> None:
        """Record an inference metric for performance tracking."""
        # Estimate token counts (in a real implementation, use tokenizer)
        prompt_tokens = len(prompt.split())
        completion_tokens = len(completion.split())
        
        # Get model quantization bits
        quantization_bits = 4  # Default assumption
        model_config = self.model_registry.get_model_config(model_name)
        if model_config:
            quantization_bits = model_config.quantization_bits
        
        # Create metric
        metric = InferenceMetric(
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            latency_seconds=latency_seconds,
            query_type=QueryType.COMPLETION,
            model_name=model_name,
            cached=cached,
            quantization_bits=quantization_bits,
            memory_used_mb=self.memory_monitor.current_stats.application_mb
        )
        
        # Record metric
        self.performance_tracker.record_metric(metric)
    
    def _record_batch_metric(self, 
                           prompts: List[str], 
                           model_name: str, 
                           latency_seconds: float,
                           cache_hits: int,
                           cache_misses: int) -> None:
        """Record a batch processing metric for performance tracking."""
        # Calculate total tokens (in a real implementation, use tokenizer)
        total_prompt_tokens = sum(len(prompt.split()) for prompt in prompts)
        
        # Estimate completion tokens
        avg_completion_tokens = 20  # Placeholder value
        total_completion_tokens = len(prompts) * avg_completion_tokens
        
        # Get model quantization bits
        quantization_bits = 4  # Default assumption
        model_config = self.model_registry.get_model_config(model_name)
        if model_config:
            quantization_bits = model_config.quantization_bits
        
        # Create metric
        metric = InferenceMetric(
            prompt_tokens=total_prompt_tokens,
            completion_tokens=total_completion_tokens,
            latency_seconds=latency_seconds,
            query_type=QueryType.BATCH,
            model_name=model_name,
            cached=(cache_hits > 0 and cache_misses == 0),  # Only true if all cached
            quantization_bits=quantization_bits,
            batch_size=len(prompts),
            memory_used_mb=self.memory_monitor.current_stats.application_mb,
            metadata={
                "cache_hits": cache_hits,
                "cache_misses": cache_misses
            }
        )
        
        # Record metric
        self.performance_tracker.record_metric(metric)
    
    def _start_batch_processing(self) -> None:
        """Start the batch processing thread."""
        if self.is_batch_processing:
            return
        
        self.is_batch_processing = True
        self.batch_thread = threading.Thread(
            target=self._batch_processing_loop,
            daemon=True
        )
        self.batch_thread.start()
    
    def _batch_processing_loop(self) -> None:
        """Main batch processing loop."""
        while self.is_batch_processing:
            try:
                # Collect batch items
                batch_items = []
                start_time = time.time()
                
                # Try to collect up to batch_size items within timeout
                while (len(batch_items) < self.batch_size and 
                       time.time() - start_time < self.batch_timeout_seconds):
                    try:
                        # Get an item from the queue with timeout
                        item = self.batch_queue.get(timeout=self.batch_timeout_seconds)
                        batch_items.append(item)
                        self.batch_queue.task_done()
                    except queue.Empty:
                        break
                
                # If no items collected, sleep and continue
                if not batch_items:
                    time.sleep(0.01)
                    continue
                
                # Process batch
                request_ids = [item[0] for item in batch_items]
                prompts = [item[1] for item in batch_items]
                callbacks = [item[2] for item in batch_items]
                
                # Select model for batch
                model_name = self.select_model_for_task(task_complexity=0.7)
                
                # Process the batch
                try:
                    results = self.batch_query(prompts, model_name)
                    
                    # Call callbacks with results
                    for i, result in enumerate(results):
                        try:
                            callbacks[i](result)
                        except Exception as e:
                            self.logger.error(f"Error in batch callback: {e}")
                except Exception as e:
                    self.logger.error(f"Error processing batch: {e}")
                    # Call callbacks with error
                    error_result = {"error": str(e)}
                    for callback in callbacks:
                        try:
                            callback(error_result)
                        except Exception as callback_error:
                            self.logger.error(f"Error in batch callback: {callback_error}")
            
            except Exception as e:
                self.logger.error(f"Error in batch processing loop: {e}")
                time.sleep(0.1)  # Sleep briefly to avoid busy-waiting on errors
        
        # Reset batch processing flag when exiting
        self.is_batch_processing = False
    
    def stop(self) -> None:
        """Stop the service and release resources."""
        # Stop batch processing
        self.is_batch_processing = False
        if self.batch_thread and self.batch_thread.is_alive():
            self.batch_thread.join(timeout=2.0)
        
        # Stop memory monitoring
        self.memory_monitor.stop()
        
        # Unload all models
        self.model_registry.unload_all_models()
        
        # Save configuration
        self.save_config()