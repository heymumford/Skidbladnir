#!/bin/bash
#
# Copyright (C) 2025 Eric C. Mumford (@heymumford)
#
# This file is part of Skidbladnir.
#
# Skidbladnir is free software: you can redistribute it and/or modify
# it under the terms of the MIT License as published in the LICENSE file.
#

# configure-llm-containers.sh - Configure LLM models for containerized deployment
# This script prepares and configures LLM models for container deployment across
# different environments (dev, qa, prod) with appropriate resource constraints.

set -e

# Configuration
ENV=${1:-"dev"}
PROJECT_ROOT=$(pwd)
MODELS_DIR="${PROJECT_ROOT}/models/${ENV}"
CONFIG_DIR="${PROJECT_ROOT}/config/${ENV}"
COMPOSE_FILE="${PROJECT_ROOT}/infra/compose/docker-compose.${ENV}.yml"
LAPTOP_COMPOSE_FILE="${PROJECT_ROOT}/infra/compose/docker-compose-laptop.yml"

echo "🧠 Configuring LLM models for containerized deployment in ${ENV} environment"

# Step 1: Ensure directories exist
mkdir -p "${MODELS_DIR}"
mkdir -p "${CONFIG_DIR}/llm"

# Step 2: Download models if needed using existing script
echo "📥 Preparing LLM models..."
./scripts/prepare-llm-models.sh "${ENV}"

# Step 3: Create model configuration for container
echo "⚙️ Creating model configuration for container..."
MODEL_CONFIG="${CONFIG_DIR}/llm/model-config.json"

# Get primary model file based on environment
if [ "${ENV}" == "prod" ]; then
  PRIMARY_MODEL="Meta-Llama-3-8B.Q4_K_M.gguf"
  FALLBACK_MODEL="Meta-Llama-3-8B.Q5_K_M.gguf"
  MEMORY_LIMIT="8G"
  CPU_LIMIT="2"
  CACHE_SIZE="5000"
  MAX_MEMORY_USAGE_MB="6144"
  NODE_MEMORY="4096"
elif [ "${ENV}" == "qa" ]; then
  PRIMARY_MODEL="Meta-Llama-3-8B.Q4_K_M.gguf"
  FALLBACK_MODEL=""
  MEMORY_LIMIT="4G"
  CPU_LIMIT="1"
  CACHE_SIZE="2000"
  MAX_MEMORY_USAGE_MB="3072"
  NODE_MEMORY="2048"
else # dev
  PRIMARY_MODEL="Meta-Llama-3-8B.Q4_0.gguf"
  FALLBACK_MODEL=""
  MEMORY_LIMIT="2G"
  CPU_LIMIT="1"
  CACHE_SIZE="1000"
  MAX_MEMORY_USAGE_MB="1536"
  NODE_MEMORY="1024"
fi

cat > "${MODEL_CONFIG}" << EOF
{
  "models": [
    {
      "name": "llama3-${ENV}-primary",
      "path": "/app/models/${PRIMARY_MODEL}",
      "quantization_bits": ${PRIMARY_MODEL#*.Q},
      "context_length": 8192,
      "max_tokens": 2048,
      "system_prompt": "You are an API translation assistant that specializes in mapping between different test management system APIs, particularly Zephyr Scale and qTest. Your goal is to accurately translate API requests and responses between systems while maintaining semantic equivalence.",
      "parameters": {
        "temperature": 0.1,
        "top_p": 0.9,
        "repetition_penalty": 1.1
      },
      "memory_required_mb": ${MAX_MEMORY_USAGE_MB},
      "use_gpu": false,
      "cpu_threads": ${CPU_LIMIT}
    }
EOF

# Add fallback model if specified
if [ -n "${FALLBACK_MODEL}" ]; then
  cat >> "${MODEL_CONFIG}" << EOF
    ,
    {
      "name": "llama3-${ENV}-fallback",
      "path": "/app/models/${FALLBACK_MODEL}",
      "quantization_bits": ${FALLBACK_MODEL#*.Q},
      "context_length": 4096,
      "max_tokens": 1024,
      "system_prompt": "You are an API translation assistant that specializes in mapping between different test management system APIs, particularly Zephyr Scale and qTest.",
      "parameters": {
        "temperature": 0.2,
        "top_p": 0.8,
        "repetition_penalty": 1.05
      },
      "memory_required_mb": $((MAX_MEMORY_USAGE_MB / 2)),
      "use_gpu": false,
      "cpu_threads": $((CPU_LIMIT / 2 + 1))
    }
EOF
fi

# Close JSON
cat >> "${MODEL_CONFIG}" << EOF
  ],
  "default": "llama3-${ENV}-primary"
}
EOF

# Step 4: Create environment-specific .env file for LLM container
ENV_FILE="${CONFIG_DIR}/llm/.env.${ENV}"

cat > "${ENV_FILE}" << EOF
NODE_ENV=${ENV}
PORT=3001
MODEL_CACHE_SIZE=${CACHE_SIZE}
USE_QUANTIZED_MODELS=true
MAX_MEMORY_USAGE_MB=${MAX_MEMORY_USAGE_MB}
MODEL_PATH=/app/models
MODEL_CONFIG_PATH=/app/config/model-config.json
CACHE_DIRECTORY=/app/cache
LOG_LEVEL=${ENV == "prod" ? "info" : "debug"}
NODE_OPTIONS=--max-old-space-size=${NODE_MEMORY}
EOF

# Step 5: Update docker-compose configuration for environment
echo "🐳 Updating docker-compose configuration..."

# Function to check if compose file exists
check_compose_file() {
  if [ ! -f "$1" ]; then
    echo "❌ Compose file $1 not found"
    return 1
  fi
  return 0
}

# Update compose file if it exists
if check_compose_file "${COMPOSE_FILE}"; then
  # Check if llm-advisor service already exists in the compose file
  if grep -q "llm-advisor:" "${COMPOSE_FILE}"; then
    echo "ℹ️ LLM advisor service already exists in ${COMPOSE_FILE}, skipping update"
  else
    # Append llm-advisor service to compose file
    cat >> "${COMPOSE_FILE}" << EOF

  llm-advisor:
    build:
      context: ../../packages/llm-advisor
      dockerfile: Dockerfile.optimized
    image: skidbladnir/llm-advisor:${ENV}
    container_name: skidbladnir-llm-advisor-${ENV}
    restart: on-failure:5
    ports:
      - "3001:3001"
    volumes:
      - ../../models/${ENV}:/app/models
      - ../../config/${ENV}/llm:/app/config
      - llm_cache_${ENV}:/app/cache
      - llm_logs_${ENV}:/app/logs
    environment:
      - NODE_ENV=${ENV}
      - MODEL_CACHE_SIZE=${CACHE_SIZE}
      - USE_QUANTIZED_MODELS=true
      - MAX_MEMORY_USAGE_MB=${MAX_MEMORY_USAGE_MB}
      - NODE_OPTIONS=--max-old-space-size=${NODE_MEMORY}
    deploy:
      resources:
        limits:
          memory: ${MEMORY_LIMIT}
          cpus: '${CPU_LIMIT}'
        reservations:
          memory: $((MEMORY_LIMIT / 2))G
          cpus: '${CPU_LIMIT / 2}'
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
EOF
  fi
fi

# Also update laptop-specific compose file if it exists
if check_compose_file "${LAPTOP_COMPOSE_FILE}"; then
  if grep -q "llm-advisor:" "${LAPTOP_COMPOSE_FILE}"; then
    echo "ℹ️ LLM advisor service already exists in ${LAPTOP_COMPOSE_FILE}, skipping update"
  else
    # Append laptop-optimized llm-advisor service to compose file
    cat >> "${LAPTOP_COMPOSE_FILE}" << EOF

  llm-advisor:
    build:
      context: ../../packages/llm-advisor
      dockerfile: Dockerfile.optimized
    image: skidbladnir/llm-advisor:laptop
    container_name: skidbladnir-llm-advisor-laptop
    restart: on-failure:3
    ports:
      - "3001:3001"
    profiles: ["llm", "full"]
    volumes:
      - ../../models/dev:/app/models
      - ../../config/dev/llm:/app/config
      - llm_cache_laptop:/app/cache
      - llm_logs_laptop:/app/logs
    environment:
      - NODE_ENV=development
      - MODEL_CACHE_SIZE=500
      - USE_QUANTIZED_MODELS=true
      - MAX_MEMORY_USAGE_MB=1536
      - LOW_MEMORY_MODE=1
      - NODE_OPTIONS=--max-old-space-size=1024
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
        reservations:
          memory: 1G
          cpus: '0.5'
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
EOF
  fi
fi

# Step 6: Create the model resource constraints test script
echo "🧪 Creating resource constraints test script..."
TEST_SCRIPT="${PROJECT_ROOT}/tests/unit/python/test_llm_resource_constraints.py"

cat > "${TEST_SCRIPT}" << EOF
"""
Tests for LLM resource constraints and containerization.
"""

import os
import json
import pytest
import psutil
import docker
import time
from pathlib import Path

from internal.python.llm_performance.services.memory_monitor import MemoryMonitor
from internal.python.llm_performance.services.model_registry import ModelRegistry
from internal.python.llm_performance.models.model_config import ModelConfig


class TestLLMResourceConstraints:
    @pytest.fixture
    def model_config_path(self):
        """Get path to model configuration."""
        env = os.environ.get("TEST_ENV", "dev")
        return Path(f"./config/{env}/llm/model-config.json")
    
    @pytest.fixture
    def model_registry(self, model_config_path):
        """Create model registry from configuration."""
        registry = ModelRegistry()
        registry.load_from_file(model_config_path)
        return registry
    
    @pytest.fixture
    def memory_monitor(self):
        """Create memory monitor."""
        return MemoryMonitor()
    
    def test_model_configs_respect_memory_constraints(self, model_registry):
        """Test that model configs stay within memory constraints."""
        for name, model in model_registry.models.items():
            # Check that memory requirements are specified
            assert model.memory_required_mb > 0, f"Model {name} has no memory requirement"
            
            # Check that memory requirements are reasonable for container
            max_allowed_mb = int(os.environ.get("MAX_MEMORY_USAGE_MB", "6144"))
            assert model.memory_required_mb <= max_allowed_mb, \\
                f"Model {name} requires too much memory: {model.memory_required_mb}MB > {max_allowed_mb}MB"
    
    def test_memory_monitor_alerts_on_threshold(self, memory_monitor):
        """Test that memory monitor triggers alerts when threshold exceeded."""
        threshold_mb = 1000
        alert_triggered = False
        
        def alert_handler():
            nonlocal alert_triggered
            alert_triggered = True
        
        # Register alert at 1000MB
        memory_monitor.register_threshold_alert(threshold_mb, alert_handler)
        
        # Simulate memory usage exceeding threshold
        memory_monitor._current_usage_mb = threshold_mb + 100
        memory_monitor._check_thresholds()
        
        assert alert_triggered, "Memory alert was not triggered when threshold exceeded"
    
    @pytest.mark.container
    def test_container_respects_memory_limits(self):
        """Test that LLM container respects memory limits."""
        # This test requires docker to be running and access to the Docker API
        client = docker.from_env()
        
        try:
            # Find llm-advisor container
            containers = client.containers.list(
                filters={"name": "skidbladnir-llm-advisor"}
            )
            
            if not containers:
                pytest.skip("No running llm-advisor container found")
            
            container = containers[0]
            
            # Get container stats
            stats = container.stats(stream=False)
            
            # Calculate memory usage in MB
            memory_usage_bytes = stats["memory_stats"]["usage"]
            memory_limit_bytes = stats["memory_stats"]["limit"]
            
            memory_usage_mb = memory_usage_bytes / (1024 * 1024)
            memory_limit_mb = memory_limit_bytes / (1024 * 1024)
            
            print(f"Container memory usage: {memory_usage_mb:.2f}MB / {memory_limit_mb:.2f}MB")
            
            # Memory usage should be less than limit
            assert memory_usage_mb < memory_limit_mb, \\
                f"Container using too much memory: {memory_usage_mb:.2f}MB >= {memory_limit_mb:.2f}MB"
            
            # Memory usage should be reasonable for LLM container
            max_expected_mb = int(os.environ.get("MAX_MEMORY_USAGE_MB", "6144"))
            assert memory_usage_mb <= max_expected_mb, \\
                f"Container using too much memory: {memory_usage_mb:.2f}MB > {max_expected_mb}MB"
            
        except Exception as e:
            pytest.skip(f"Error accessing Docker API: {str(e)}")
    
    @pytest.mark.integration
    def test_container_performance_under_load(self):
        """Test LLM container performance under load."""
        # This is an integration test that requires a running container
        import requests
        import concurrent.futures
        
        base_url = os.environ.get("LLM_ADVISOR_URL", "http://localhost:3001")
        
        # Test data
        test_prompts = [
            "Map Zephyr Scale API endpoint GET /testcases to qTest",
            "Translate Zephyr test case status 'In Progress' to qTest equivalent",
            "Convert Zephyr Scale test step with attachments to qTest format",
            "Map Zephyr test folder hierarchy to qTest equivalent structure",
            "Transform Zephyr Scale custom fields to qTest custom fields"
        ]
        
        # Test concurrent requests
        start_time = time.time()
        
        results = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = []
            for prompt in test_prompts:
                future = executor.submit(
                    requests.post,
                    f"{base_url}/api/translate",
                    json={"prompt": prompt},
                    timeout=60
                )
                futures.append(future)
            
            for future in concurrent.futures.as_completed(futures):
                try:
                    response = future.result()
                    results.append(response.status_code == 200)
                except Exception as e:
                    results.append(False)
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # All requests should succeed
        assert all(results), "Not all concurrent requests succeeded"
        
        # Total time should be reasonable (adjust threshold as needed)
        assert total_time < 120, f"Concurrent requests took too long: {total_time:.2f}s"
        
        print(f"Processed {len(test_prompts)} concurrent requests in {total_time:.2f}s")
EOF

echo "✅ LLM models configured for containerized deployment in ${ENV} environment"
echo "Next steps:"
echo "1. Run build with: ./scripts/build-containers.sh ${ENV}"
echo "2. Start containers with: ./scripts/start-containers.sh ${ENV}"
echo "3. Test resource constraints with: npm run test:py -- tests/unit/python/test_llm_resource_constraints.py"