import { ResilienceFacadeOptions } from './resilience-facade';
import { AxiosError } from 'axios';

export interface ProviderResilienceConfig extends ResilienceFacadeOptions {
  providerName: string;
  rateLimitStatusCodes?: number[];
  retryAfterHeaderName?: string;
  extractResetTime?: (error: AxiosError) => number | undefined;
}

// Default configuration that will be applied to all providers
const DEFAULT_CONFIG: Omit<ProviderResilienceConfig, 'providerName'> = {
  retryOptions: {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffFactor: 2,
    retryableErrors: [
      'ECONNRESET',
      'ETIMEDOUT',
      'ECONNABORTED',
      'EHOSTUNREACH',
      'EPIPE',
      'ENOTFOUND', 
      'EAI_AGAIN',
      'socket hang up',
      'socket timeout',
      'Connection aborted',
      'network error',
      /5\d\d/
    ]
  },
  timeoutMs: 30000,
  circuitBreakerOptions: {
    failureThreshold: 5,
    resetTimeoutMs: 30000,
    halfOpenSuccessThreshold: 2
  },
  bulkheadOptions: {
    maxConcurrentCalls: 10,
    maxQueueSize: 100
  },
  cacheOptions: {
    ttlMs: 300000, // 5 minutes
    maxEntries: 1000,
    staleWhileRevalidate: true
  },
  fallbackEnabled: true,
  logErrors: true,
  rateLimitStatusCodes: [429]
};

// Provider-specific configurations, merging with the default config
export const PROVIDER_RESILIENCE_CONFIGS: ProviderResilienceConfig[] = [
  {
    providerName: 'azure-devops',
    retryOptions: {
      maxAttempts: 4,
      initialDelayMs: 500,
      maxDelayMs: 8000,
      backoffFactor: 1.5
    },
    timeoutMs: 45000,
    circuitBreakerOptions: {
      failureThreshold: 8,
      resetTimeoutMs: 60000
    },
    bulkheadOptions: {
      maxConcurrentCalls: 15,
      maxQueueSize: 150
    },
    cacheOptions: {
      ttlMs: 600000, // 10 minutes
    },
    rateLimitStatusCodes: [429, 503]
  },
  {
    providerName: 'rally',
    retryOptions: {
      maxAttempts: 5,
      initialDelayMs: 2000,
      maxDelayMs: 30000,
      backoffFactor: 2.5
    },
    timeoutMs: 60000,
    circuitBreakerOptions: {
      failureThreshold: 3,
      resetTimeoutMs: 90000
    },
    bulkheadOptions: {
      maxConcurrentCalls: 5,
      maxQueueSize: 50
    },
    rateLimitStatusCodes: [429, 503],
    retryAfterHeaderName: 'X-RateLimit-Reset'
  },
  {
    providerName: 'jira',
    retryOptions: {
      maxAttempts: 3,
      initialDelayMs: 1000,
      maxDelayMs: 15000,
      backoffFactor: 2
    },
    timeoutMs: 40000,
    circuitBreakerOptions: {
      failureThreshold: 5,
      resetTimeoutMs: 45000
    },
    bulkheadOptions: {
      maxConcurrentCalls: 8,
      maxQueueSize: 80
    },
    cacheOptions: {
      ttlMs: 900000, // 15 minutes for Jira
    },
    rateLimitStatusCodes: [429],
    extractResetTime: (error: AxiosError): number | undefined => {
      if (error.response?.headers?.['x-ratelimit-reset']) {
        // Jira uses Unix timestamp
        const resetTime = parseInt(error.response.headers['x-ratelimit-reset'] as string);
        return Math.max(0, resetTime * 1000 - Date.now());
      }
      return undefined;
    }
  },
  {
    providerName: 'zephyr',
    retryOptions: {
      maxAttempts: 3,
      initialDelayMs: 800,
      maxDelayMs: 12000,
      backoffFactor: 1.8
    },
    timeoutMs: 35000,
    circuitBreakerOptions: {
      failureThreshold: 6,
      resetTimeoutMs: 40000
    },
    bulkheadOptions: {
      maxConcurrentCalls: 12,
      maxQueueSize: 120
    },
    rateLimitStatusCodes: [429, 503]
  },
  {
    providerName: 'qtest',
    retryOptions: {
      maxAttempts: 4,
      initialDelayMs: 700,
      maxDelayMs: 10000,
      backoffFactor: 1.5
    },
    timeoutMs: 40000,
    circuitBreakerOptions: {
      failureThreshold: 7,
      resetTimeoutMs: 50000
    },
    bulkheadOptions: {
      maxConcurrentCalls: 15,
      maxQueueSize: 150
    },
    cacheOptions: {
      ttlMs: 600000, // 10 minutes
    },
    rateLimitStatusCodes: [429]
  },
  {
    providerName: 'hp-alm',
    retryOptions: {
      maxAttempts: 2,
      initialDelayMs: 1200,
      maxDelayMs: 15000,
      backoffFactor: 2
    },
    timeoutMs: 50000,
    circuitBreakerOptions: {
      failureThreshold: 4,
      resetTimeoutMs: 60000
    },
    bulkheadOptions: {
      maxConcurrentCalls: 8,
      maxQueueSize: 80
    },
    rateLimitStatusCodes: [429, 500]
  }
];

// Merge the default config with provider-specific configs
export const getProviderResilienceConfig = (
  providerName: string
): ProviderResilienceConfig => {
  const providerConfig = PROVIDER_RESILIENCE_CONFIGS.find(
    (config) => config.providerName === providerName
  );

  if (!providerConfig) {
    return {
      ...DEFAULT_CONFIG,
      providerName
    };
  }

  // Deep merge default config with provider config
  return {
    ...DEFAULT_CONFIG,
    ...providerConfig,
    retryOptions: {
      ...DEFAULT_CONFIG.retryOptions,
      ...providerConfig.retryOptions
    },
    circuitBreakerOptions: {
      ...DEFAULT_CONFIG.circuitBreakerOptions,
      ...providerConfig.circuitBreakerOptions
    },
    bulkheadOptions: {
      ...DEFAULT_CONFIG.bulkheadOptions,
      ...providerConfig.bulkheadOptions
    },
    cacheOptions: {
      ...DEFAULT_CONFIG.cacheOptions,
      ...providerConfig.cacheOptions
    }
  };
};