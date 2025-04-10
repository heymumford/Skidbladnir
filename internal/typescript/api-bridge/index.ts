/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { AuthenticationHandler, AuthenticationMethod, AuthCredentials } from './auth/authentication-handler';
import { ResilientApiClient, ApiClientOptions } from './clients/resilient-api-client';
import { ApiRateLimiter, ProviderRateLimitConfig } from './rate-limiting/api-rate-limiter';
import { AxiosRequestConfig, AxiosResponse, CancelTokenSource } from 'axios';
import { 
  ServiceHealthMonitor, 
  getGlobalHealthMonitor, 
  createGlobalHealthMonitor, 
  registerHealthCheck,
  createEndpointHealthCheck
} from '../../../packages/common/src/utils/resilience/health-monitor-factory';
import { 
  getResilienceFacade, 
  getProviderResilienceConfig
} from '../../../packages/common/src/utils/resilience/resilience-factory';
import { Logger } from '../../../packages/common/src/utils/logger';

/**
 * Configuration options for the API Bridge
 */
export interface ApiBridgeConfig {
  baseURL: string;
  serviceName: string;
  providerName: string;
  authentication: {
    credentials?: AuthCredentials;
    configureHandler?: (handler: AuthenticationHandler) => void;
  };
  rateLimiting?: {
    maxRequestsPerMinute?: number;
    retryAfterHeaderName?: string;
    rateLimitStatusCodes?: number[];
  };
  resilience?: {
    retryOptions?: {
      maxAttempts?: number;
      initialDelayMs?: number;
      backoffFactor?: number;
    };
    circuitBreakerOptions?: {
      failureThreshold?: number;
      resetTimeoutMs?: number;
      halfOpenSuccessThreshold?: number;
    };
    timeoutMs?: number;
    logErrors?: boolean;
  };
  defaultHeaders?: Record<string, string>;
  requestDefaults?: Partial<AxiosRequestConfig>;
  healthCheckEndpoint?: string;
}

/**
 * API Bridge provides a unified interface for API operations with integrated
 * authentication, rate limiting, and resilience patterns
 */
export class ApiBridge {
  private authHandler: AuthenticationHandler;
  private apiClient: ResilientApiClient;
  private rateLimiter: ApiRateLimiter;
  private providerName: string;
  private logger: Logger;
  private healthMonitor: ServiceHealthMonitor;

  constructor(private readonly config: ApiBridgeConfig) {
    this.providerName = config.providerName;
    this.logger = new Logger(`ApiBridge:${this.providerName}`);
    
    // Initialize authentication handler
    this.authHandler = new AuthenticationHandler();
    
    // Apply authentication configuration
    if (config.authentication.configureHandler) {
      config.authentication.configureHandler(this.authHandler);
    }
    
    // Initialize rate limiter
    this.rateLimiter = new ApiRateLimiter({
      defaultConfig: {
        maxRequestsPerMinute: config.rateLimiting?.maxRequestsPerMinute || 60,
        initialDelayMs: 100,
        maxDelayMs: 60000,
        backoffFactor: 2,
        backoffThreshold: 0.8,
        retryAfterHeaderName: config.rateLimiting?.retryAfterHeaderName,
        rateLimitStatusCodes: config.rateLimiting?.rateLimitStatusCodes || [429]
      }
    });
    
    // Initialize API client
    const clientOptions: ApiClientOptions = {
      baseURL: config.baseURL,
      serviceName: config.serviceName,
      providerName: this.providerName,
      defaultHeaders: config.defaultHeaders,
      authHandler: this.authHandler,
      resilience: config.resilience,
      requestDefaults: config.requestDefaults
    };
    
    this.apiClient = new ResilientApiClient(clientOptions);
    
    // Register health check if endpoint provided
    if (config.healthCheckEndpoint) {
      // Create a health check function with authentication
      const healthCheckFn = createEndpointHealthCheck(
        `${config.baseURL}${config.healthCheckEndpoint}`,
        async () => {
          try {
            // Get authentication
            const authResult = await this.authHandler.authenticate(
              this.providerName, 
              config.authentication.credentials
            );
            return authResult.headers;
          } catch (error) {
            this.logger.error('Failed to get auth headers for health check', { error });
            return {};
          }
        }
      );
      
      registerHealthCheck(this.providerName, healthCheckFn);
    }
    
    // Get or create the global health monitor
    this.healthMonitor = getGlobalHealthMonitor() || createGlobalHealthMonitor();
    
    // Initialize resilience facade for this provider
    getResilienceFacade(this.providerName);
    
    this.logger.info(`API Bridge initialized for provider ${this.providerName}`);
  }

  /**
   * Authenticate with the provider
   * @param credentials Optional override credentials
   */
  async authenticate(credentials?: AuthCredentials): Promise<void> {
    try {
      await this.authHandler.authenticate(this.providerName, credentials || this.config.authentication.credentials);
      this.logger.debug(`Authentication successful for provider ${this.providerName}`);
    } catch (error) {
      this.logger.error(`Authentication failed for provider ${this.providerName}`, { error });
      throw error;
    }
  }

  /**
   * Logout and clear session
   */
  async logout(): Promise<void> {
    await this.authHandler.logout(this.providerName);
    this.logger.debug(`Logged out of provider ${this.providerName}`);
  }

  /**
   * Perform a GET request
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    await this.rateLimiter.throttle(this.providerName);
    try {
      return await this.apiClient.get<T>(url, config);
    } catch (error: any) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Perform a POST request
   */
  async post<T = any, D = any>(url: string, data?: D, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    await this.rateLimiter.throttle(this.providerName);
    try {
      return await this.apiClient.post<T, D>(url, data, config);
    } catch (error: any) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Perform a PUT request
   */
  async put<T = any, D = any>(url: string, data?: D, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    await this.rateLimiter.throttle(this.providerName);
    try {
      return await this.apiClient.put<T, D>(url, data, config);
    } catch (error: any) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Perform a PATCH request
   */
  async patch<T = any, D = any>(url: string, data?: D, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    await this.rateLimiter.throttle(this.providerName);
    try {
      return await this.apiClient.patch<T, D>(url, data, config);
    } catch (error: any) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Perform a DELETE request
   */
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    await this.rateLimiter.throttle(this.providerName);
    try {
      return await this.apiClient.delete<T>(url, config);
    } catch (error: any) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Create a cancel token source
   */
  createCancelTokenSource(): CancelTokenSource {
    return this.apiClient.createCancelTokenSource();
  }

  /**
   * Check if a request was canceled
   */
  isCancel(error: any): boolean {
    return this.apiClient.isCancel(error);
  }

  /**
   * Get the health status of the API client
   */
  getHealthStatus(): 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' {
    // Get health status from both internal components and the health monitor
    const rateLimitStatus = this.rateLimiter.isRateLimited(this.providerName) ? 'DEGRADED' : 'HEALTHY';
    const clientStatus = this.apiClient.getHealthStatus();
    
    // Get health status from the monitor if available
    const providerHealth = this.healthMonitor.getProviderHealth(this.providerName);
    let monitorStatus: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' = 'HEALTHY';
    if (providerHealth) {
      if (providerHealth.status === 'DOWN') {
        monitorStatus = 'UNHEALTHY';
      } else if (providerHealth.status === 'DEGRADED') {
        monitorStatus = 'DEGRADED';
      }
    }
    
    // Return the worst status
    if (rateLimitStatus === 'UNHEALTHY' || clientStatus === 'UNHEALTHY' || monitorStatus === 'UNHEALTHY') {
      return 'UNHEALTHY';
    }
    if (rateLimitStatus === 'DEGRADED' || clientStatus === 'DEGRADED' || monitorStatus === 'DEGRADED') {
      return 'DEGRADED';
    }
    return 'HEALTHY';
  }

  /**
   * Get combined metrics and statistics
   */
  getMetrics(): any {
    // Get health status from the monitor if available
    const providerHealth = this.healthMonitor.getProviderHealth(this.providerName);
    
    return {
      rateLimiting: this.rateLimiter.getMetrics(this.providerName),
      resilience: this.apiClient.getResilienceStats(),
      healthMonitor: providerHealth || null,
      healthStatus: this.getHealthStatus()
    };
  }

  /**
   * Reset all resilience state
   */
  reset(): void {
    this.rateLimiter.reset(this.providerName);
    this.apiClient.resetResilience();
    this.logger.info(`Reset resilience state for provider ${this.providerName}`);
  }

  /**
   * Trigger a health check for this provider
   */
  async checkHealth(): Promise<boolean> {
    await this.healthMonitor.checkAllProviders();
    const health = this.healthMonitor.getProviderHealth(this.providerName);
    return health?.status === 'UP';
  }

  /**
   * Handle API errors and update rate limiting as needed
   */
  private handleError(error: any): void {
    // Check if it's a rate limit error
    if (error.response && 
        (error.response.status === 429 || 
         this.config.rateLimiting?.rateLimitStatusCodes?.includes(error.response.status))) {
      this.rateLimiter.handleRateLimitResponse(this.providerName, error);
      this.logger.warn(`Rate limit triggered for provider ${this.providerName}`, { 
        status: error.response.status
      });
    }
  }
}

/**
 * Create a bridged client for a specific provider
 * @param config The provider configuration
 * @returns An API bridge instance
 */
export function createApiBridge(config: ApiBridgeConfig): ApiBridge {
  // Default resilience configuration if provider-specific config can't be retrieved
  const defaultResilienceConfig = {
    retryOptions: {
      maxAttempts: 3,
      initialDelayMs: 1000,
      maxDelayMs: 10000,
      backoffFactor: 2
    },
    circuitBreakerOptions: {
      failureThreshold: 5,
      resetTimeoutMs: 30000, 
      halfOpenSuccessThreshold: 2
    },
    timeoutMs: 30000,
    rateLimitStatusCodes: [429]
  };
  
  // Try to get provider-specific config, or use default
  let resilienceConfig;
  try {
    resilienceConfig = getProviderResilienceConfig(config.providerName);
  } catch (error) {
    console.warn(`Could not get provider config for ${config.providerName}, using defaults`);
    resilienceConfig = defaultResilienceConfig;
  }
  
  // Merge with the provided config
  const mergedConfig: ApiBridgeConfig = {
    ...config,
    resilience: {
      ...resilienceConfig,
      ...config.resilience
    },
    rateLimiting: {
      maxRequestsPerMinute: resilienceConfig.retryOptions?.maxAttempts || 60,
      rateLimitStatusCodes: resilienceConfig.rateLimitStatusCodes || [429],
      ...config.rateLimiting
    }
  };
  
  return new ApiBridge(mergedConfig);
}

/**
 * Get the health status of all provider connections
 */
export function getSystemHealth(): 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' {
  const healthMonitor = getGlobalHealthMonitor();
  if (!healthMonitor) {
    return 'HEALTHY'; // No health monitor, assume healthy
  }
  
  const systemHealth = healthMonitor.getSystemHealth();
  
  // Map from health monitor format to API Bridge format
  if (systemHealth === 'DOWN') {
    return 'UNHEALTHY';
  } else if (systemHealth === 'DEGRADED') {
    return 'DEGRADED';
  } else {
    return 'HEALTHY';
  }
}