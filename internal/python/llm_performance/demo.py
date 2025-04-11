#!/usr/bin/env python
"""
Demonstration script for LLM performance optimization features.
"""

import os
import sys
import time
import argparse
import logging
from typing import Dict, Any

from models.model_config import ModelConfig
from models.cache_config import CacheConfig, CacheStrategy
from services.performance_service import LLMPerformanceService


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger("llm-performance-demo")


def setup_demo_service() -> LLMPerformanceService:
    """Set up a demo service with sample models."""
    # Create temporary directories for models and cache
    models_dir = os.path.join(os.getcwd(), "demo_models")
    cache_dir = os.path.join(os.getcwd(), "demo_cache")
    config_path = os.path.join(os.getcwd(), "demo_config.json")
    
    os.makedirs(models_dir, exist_ok=True)
    os.makedirs(cache_dir, exist_ok=True)
    
    # Create service
    service = LLMPerformanceService(
        config_path=config_path,
        models_dir=models_dir,
        cache_dir=cache_dir,
        logger=logger
    )
    
    # Register mock models
    model_configs = [
        ModelConfig(
            name="llama3-8b-q4",
            path=os.path.join(models_dir, "llama3-8b-q4.gguf"),
            quantization_bits=4,
            memory_required_mb=4000,
            use_gpu=False
        ),
        ModelConfig(
            name="llama3-8b-q8",
            path=os.path.join(models_dir, "llama3-8b-q8.gguf"),
            quantization_bits=8,
            memory_required_mb=8000,
            use_gpu=False
        ),
        ModelConfig(
            name="llama3-8b",
            path=os.path.join(models_dir, "llama3-8b.gguf"),
            quantization_bits=16,
            memory_required_mb=16000,
            use_gpu=True
        )
    ]
    
    for config in model_configs:
        # Create mock model file
        with open(config.path, 'w') as f:
            f.write(f"Mock model file for {config.name}")
        
        # Register model
        service.model_registry.register_model(config)
    
    # Save configuration
    service.save_config()
    
    return service


def demo_adaptive_model_selection(service: LLMPerformanceService) -> None:
    """Demonstrate adaptive model selection based on task complexity."""
    logger.info("====== DEMO: Adaptive Model Selection ======")
    
    # Test with different complexity levels
    complexity_levels = [0.2, 0.5, 0.8]
    
    for complexity in complexity_levels:
        logger.info(f"Selecting model for task complexity: {complexity}")
        model_name = service.select_model_for_task(complexity)
        logger.info(f"Selected model: {model_name}")
        
        # Get model info
        model_info = service.model_registry.get_model_info(model_name)
        logger.info(f"Model details: {model_info}")
        
        print()  # Empty line for readability


def demo_caching(service: LLMPerformanceService) -> None:
    """Demonstrate response caching for improved performance."""
    logger.info("====== DEMO: Response Caching ======")
    
    # Make several queries with some repeating prompts
    prompts = [
        "What is the capital of France?",
        "How do I optimize a large language model?",
        "What is the capital of France?",  # Duplicate to demonstrate caching
        "What are the benefits of model quantization?",
        "How do I optimize a large language model?",  # Duplicate to demonstrate caching
    ]
    
    # Process queries
    for i, prompt in enumerate(prompts):
        logger.info(f"Query {i+1}: {prompt}")
        start_time = time.time()
        response = service.query(prompt)
        elapsed = time.time() - start_time
        
        # Check if this was a cache hit
        is_cached = "Yes" if elapsed < 0.1 else "No"
        logger.info(f"Response: {response['completion']}")
        logger.info(f"Cached: {is_cached}, Time: {elapsed:.6f} seconds")
        print()  # Empty line for readability
    
    # Get cache stats
    cache_stats = service.get_cache_stats()
    logger.info(f"Cache stats: {cache_stats}")
    print()


def demo_batch_processing(service: LLMPerformanceService) -> None:
    """Demonstrate batch processing for improved throughput."""
    logger.info("====== DEMO: Batch Processing ======")
    
    # Create a batch of prompts
    batch_prompts = [
        "What is the capital of France?",
        "What is the capital of Germany?",
        "What is the capital of Italy?",
        "What is the capital of Spain?",
        "What is the capital of Portugal?"
    ]
    
    # Process individual queries first for comparison
    logger.info("Processing individual queries for comparison:")
    indiv_start_time = time.time()
    indiv_results = []
    
    for prompt in batch_prompts:
        result = service.query(prompt)
        indiv_results.append(result)
    
    indiv_elapsed = time.time() - indiv_start_time
    logger.info(f"Individual processing time: {indiv_elapsed:.6f} seconds")
    
    # Now process as a batch
    logger.info("\nProcessing as a batch:")
    batch_start_time = time.time()
    batch_results = service.batch_query(batch_prompts)
    batch_elapsed = time.time() - batch_start_time
    
    logger.info(f"Batch processing time: {batch_elapsed:.6f} seconds")
    logger.info(f"Speedup: {indiv_elapsed / batch_elapsed:.2f}x")
    
    # Display results summary
    logger.info("\nBatch results summary:")
    for i, result in enumerate(batch_results):
        logger.info(f"Result {i+1}: {result['completion']}")
    
    print()


def demo_memory_monitoring(service: LLMPerformanceService) -> None:
    """Demonstrate memory monitoring and adaptive resource management."""
    logger.info("====== DEMO: Memory Monitoring ======")
    
    # Get current memory stats
    memory_stats = service.memory_monitor.get_memory_stats()
    logger.info(f"Current memory stats: {memory_stats}")
    
    # Load models and observe memory usage
    logger.info("\nLoading models and observing memory usage:")
    
    models_to_load = ["llama3-8b-q4", "llama3-8b-q8", "llama3-8b"]
    
    for model_name in models_to_load:
        logger.info(f"Loading model: {model_name}")
        service.load_model(model_name)
        
        # Get updated memory stats
        memory_stats = service.memory_monitor.get_memory_stats()
        logger.info(f"Memory usage after loading {model_name}: {memory_stats.application_mb} MB")
    
    # Show loaded models
    loaded_models = service.get_loaded_models()
    logger.info(f"\nLoaded models: {list(loaded_models.keys())}")
    
    # Simulate memory constraint
    logger.info("\nSimulating memory constraint...")
    service.handle_memory_constraint()
    
    # Check which models remain loaded
    loaded_models_after = service.get_loaded_models()
    logger.info(f"Loaded models after constraint: {list(loaded_models_after.keys())}")
    
    print()


def demo_performance_metrics(service: LLMPerformanceService) -> None:
    """Demonstrate performance metrics and monitoring."""
    logger.info("====== DEMO: Performance Metrics ======")
    
    # Make a series of queries to generate metrics
    prompts = [
        "What is model quantization?",
        "How does caching improve LLM performance?",
        "What are the different quantization levels?",
        "What is batch processing for LLMs?",
        "How does memory management affect LLM performance?"
    ]
    
    # Make individual queries with different models
    logger.info("Making queries with different models to generate metrics...")
    
    models = ["llama3-8b-q4", "llama3-8b-q8"]
    for model in models:
        for prompt in prompts:
            service.query(prompt, model_name=model)
    
    # Make a batch query
    service.batch_query(prompts, model_name="llama3-8b-q4")
    
    # Get performance metrics
    metrics = service.get_performance_metrics()
    
    logger.info("\nPerformance metrics summary:")
    for model_name, model_metrics in metrics.items():
        if model_name not in ["system", "cache"]:
            logger.info(f"Model: {model_name}")
            logger.info(f"  - Average latency: {model_metrics.get('average_latency', 0):.6f} seconds")
            logger.info(f"  - P90 latency: {model_metrics.get('p90_latency', 0):.6f} seconds")
            logger.info(f"  - Tokens per second: {model_metrics.get('tokens_per_second', 0):.2f}")
            logger.info(f"  - Cache hit rate: {model_metrics.get('cache_hit_rate', 0):.2f}")
    
    # System metrics
    if "system" in metrics:
        logger.info("\nSystem metrics:")
        logger.info(f"  - Total memory: {metrics['system'].get('total_memory_mb', 0)} MB")
        logger.info(f"  - Available memory: {metrics['system'].get('available_memory_mb', 0)} MB")
        logger.info(f"  - Memory utilization: {metrics['system'].get('memory_utilization', 0):.2f}")
    
    # Cache metrics
    if "cache" in metrics:
        logger.info("\nCache metrics:")
        logger.info(f"  - Cache size: {metrics['cache'].get('size', 0)} entries")
        logger.info(f"  - Cache hits: {metrics['cache'].get('hits', 0)}")
        logger.info(f"  - Cache misses: {metrics['cache'].get('misses', 0)}")
        logger.info(f"  - Cache hit ratio: {metrics['cache'].get('hit_ratio', 0):.2f}")
    
    print()


def main():
    """Main entry point for the demo."""
    parser = argparse.ArgumentParser(description="LLM Performance Optimization Demo")
    parser.add_argument("--demo", type=str, choices=["all", "adaptive", "caching", "batch", "memory", "metrics"],
                      default="all", help="Which demo to run")
    
    args = parser.parse_args()
    
    # Set up the service
    logger.info("Setting up demo service...")
    service = setup_demo_service()
    
    try:
        # Run the selected demo
        if args.demo in ["all", "adaptive"]:
            demo_adaptive_model_selection(service)
        
        if args.demo in ["all", "caching"]:
            demo_caching(service)
        
        if args.demo in ["all", "batch"]:
            demo_batch_processing(service)
        
        if args.demo in ["all", "memory"]:
            demo_memory_monitoring(service)
        
        if args.demo in ["all", "metrics"]:
            demo_performance_metrics(service)
        
        logger.info("Demo completed successfully!")
    
    finally:
        # Clean up
        logger.info("Stopping service and cleaning up...")
        service.stop()


if __name__ == "__main__":
    main()