/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Provides configuration management for the LLM Advisor
 */
export interface LLMAdvisorConfig {
  /**
   * Model configuration
   */
  model: {
    /**
     * Model provider (e.g. 'local', 'openai', 'anthropic', etc.)
     */
    provider: string;

    /**
     * Model name/identifier
     */
    name: string;

    /**
     * Model endpoint URL
     */
    endpoint?: string;

    /**
     * API key for cloud models
     */
    apiKey?: string;

    /**
     * Temperature setting (0.0 - 1.0)
     */
    temperature?: number;

    /**
     * Timeout in milliseconds
     */
    timeout?: number;
  };

  /**
   * Performance configuration
   */
  performance: {
    /**
     * Maximum concurrent requests
     */
    maxConcurrentRequests: number;

    /**
     * Cache enabled flag
     */
    cacheEnabled: boolean;

    /**
     * Cache TTL in seconds
     */
    cacheTTL: number;

    /**
     * Minimum memory percentage required to use full model
     */
    minMemoryPercent: number;

    /**
     * Memory threshold for model quantization
     */
    quantizationThresholdMB: number;
  };

  /**
   * Resilience configuration
   */
  resilience: {
    /**
     * Number of retry attempts
     */
    retryAttempts: number;

    /**
     * Base delay for exponential backoff
     */
    retryBaseDelayMs: number;

    /**
     * Circuit breaker failure threshold
     */
    circuitBreakerThreshold: number;

    /**
     * Circuit breaker reset timeout
     */
    circuitBreakerResetTimeMs: number;

    /**
     * Fallback to smaller model when throttled
     */
    useFallbackModel: boolean;

    /**
     * Fallback model name
     */
    fallbackModelName?: string;
  };

  /**
   * Prompt and domain specific configuration
   */
  domain: {
    /**
     * Max input token limit
     */
    maxInputTokens: number;

    /**
     * Max output token limit
     */
    maxOutputTokens: number;

    /**
     * Test case generation template
     */
    testCaseTemplate?: string;

    /**
     * Test suite optimization template
     */
    testSuiteOptimizationTemplate?: string;

    /**
     * Test case validation template
     */
    testValidationTemplate?: string;
  };
}

/**
 * Default configuration for the LLM Advisor
 */
const defaultConfig: LLMAdvisorConfig = {
  model: {
    provider: 'local',
    name: 'llama2-7b-chat',
    temperature: 0.7,
    timeout: 30000
  },
  performance: {
    maxConcurrentRequests: 2,
    cacheEnabled: true,
    cacheTTL: 3600,
    minMemoryPercent: 20,
    quantizationThresholdMB: 4000
  },
  resilience: {
    retryAttempts: 3,
    retryBaseDelayMs: 1000,
    circuitBreakerThreshold: 5,
    circuitBreakerResetTimeMs: 30000,
    useFallbackModel: true,
    fallbackModelName: 'llama2-7b-chat-q4'
  },
  domain: {
    maxInputTokens: 4096,
    maxOutputTokens: 2048
  }
};

/**
 * Configuration service for LLM Advisor
 */
export class ConfigurationService {
  private static instance: ConfigurationService;
  private config: LLMAdvisorConfig;

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.config = { ...defaultConfig };
    this.loadEnvironmentOverrides();
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): ConfigurationService {
    if (!ConfigurationService.instance) {
      ConfigurationService.instance = new ConfigurationService();
    }
    return ConfigurationService.instance;
  }

  /**
   * Get the current configuration
   */
  public getConfig(): LLMAdvisorConfig {
    return { ...this.config };
  }

  /**
   * Set a new configuration
   */
  public setConfig(newConfig: Partial<LLMAdvisorConfig>): void {
    this.config = this.mergeConfigs(this.config, newConfig);
  }

  /**
   * Get model configuration
   */
  public getModelConfig(): LLMAdvisorConfig['model'] {
    return { ...this.config.model };
  }

  /**
   * Get performance configuration
   */
  public getPerformanceConfig(): LLMAdvisorConfig['performance'] {
    return { ...this.config.performance };
  }

  /**
   * Get resilience configuration
   */
  public getResilienceConfig(): LLMAdvisorConfig['resilience'] {
    return { ...this.config.resilience };
  }

  /**
   * Get domain configuration
   */
  public getDomainConfig(): LLMAdvisorConfig['domain'] {
    return { ...this.config.domain };
  }

  /**
   * Load configuration overrides from environment variables
   */
  private loadEnvironmentOverrides(): void {
    // Model config
    if (process.env.LLM_MODEL_PROVIDER) {
      this.config.model.provider = process.env.LLM_MODEL_PROVIDER;
    }
    if (process.env.LLM_MODEL_NAME) {
      this.config.model.name = process.env.LLM_MODEL_NAME;
    }
    if (process.env.LLM_MODEL_ENDPOINT) {
      this.config.model.endpoint = process.env.LLM_MODEL_ENDPOINT;
    }
    if (process.env.LLM_MODEL_API_KEY) {
      this.config.model.apiKey = process.env.LLM_MODEL_API_KEY;
    }
    if (process.env.LLM_MODEL_TEMPERATURE) {
      this.config.model.temperature = parseFloat(process.env.LLM_MODEL_TEMPERATURE);
    }
    if (process.env.LLM_MODEL_TIMEOUT) {
      this.config.model.timeout = parseInt(process.env.LLM_MODEL_TIMEOUT, 10);
    }

    // Performance config
    if (process.env.LLM_MAX_CONCURRENT_REQUESTS) {
      this.config.performance.maxConcurrentRequests = parseInt(
        process.env.LLM_MAX_CONCURRENT_REQUESTS,
        10
      );
    }
    if (process.env.LLM_CACHE_ENABLED) {
      this.config.performance.cacheEnabled = process.env.LLM_CACHE_ENABLED === 'true';
    }
    if (process.env.LLM_CACHE_TTL) {
      this.config.performance.cacheTTL = parseInt(process.env.LLM_CACHE_TTL, 10);
    }
    if (process.env.LLM_MIN_MEMORY_PERCENT) {
      this.config.performance.minMemoryPercent = parseInt(process.env.LLM_MIN_MEMORY_PERCENT, 10);
    }
    if (process.env.LLM_QUANTIZATION_THRESHOLD_MB) {
      this.config.performance.quantizationThresholdMB = parseInt(
        process.env.LLM_QUANTIZATION_THRESHOLD_MB,
        10
      );
    }

    // Resilience config
    if (process.env.LLM_RETRY_ATTEMPTS) {
      this.config.resilience.retryAttempts = parseInt(process.env.LLM_RETRY_ATTEMPTS, 10);
    }
    if (process.env.LLM_RETRY_BASE_DELAY_MS) {
      this.config.resilience.retryBaseDelayMs = parseInt(process.env.LLM_RETRY_BASE_DELAY_MS, 10);
    }
    if (process.env.LLM_CIRCUIT_BREAKER_THRESHOLD) {
      this.config.resilience.circuitBreakerThreshold = parseInt(
        process.env.LLM_CIRCUIT_BREAKER_THRESHOLD,
        10
      );
    }
    if (process.env.LLM_CIRCUIT_BREAKER_RESET_TIME_MS) {
      this.config.resilience.circuitBreakerResetTimeMs = parseInt(
        process.env.LLM_CIRCUIT_BREAKER_RESET_TIME_MS,
        10
      );
    }
    if (process.env.LLM_USE_FALLBACK_MODEL) {
      this.config.resilience.useFallbackModel = process.env.LLM_USE_FALLBACK_MODEL === 'true';
    }
    if (process.env.LLM_FALLBACK_MODEL_NAME) {
      this.config.resilience.fallbackModelName = process.env.LLM_FALLBACK_MODEL_NAME;
    }

    // Domain config
    if (process.env.LLM_MAX_INPUT_TOKENS) {
      this.config.domain.maxInputTokens = parseInt(process.env.LLM_MAX_INPUT_TOKENS, 10);
    }
    if (process.env.LLM_MAX_OUTPUT_TOKENS) {
      this.config.domain.maxOutputTokens = parseInt(process.env.LLM_MAX_OUTPUT_TOKENS, 10);
    }
  }

  /**
   * Deep merge configurations
   */
  private mergeConfigs(
    baseConfig: LLMAdvisorConfig,
    overrideConfig: Partial<LLMAdvisorConfig>
  ): LLMAdvisorConfig {
    const result = { ...baseConfig };

    if (overrideConfig.model) {
      result.model = { ...result.model, ...overrideConfig.model };
    }

    if (overrideConfig.performance) {
      result.performance = { ...result.performance, ...overrideConfig.performance };
    }

    if (overrideConfig.resilience) {
      result.resilience = { ...result.resilience, ...overrideConfig.resilience };
    }

    if (overrideConfig.domain) {
      result.domain = { ...result.domain, ...overrideConfig.domain };
    }

    return result;
  }
}