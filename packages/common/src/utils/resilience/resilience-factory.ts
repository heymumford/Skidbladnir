import { ResilienceFacade } from './resilience-facade';
import { getProviderResilienceConfig } from './provider-configs';
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { RateLimiter } from '../rate-limiter';

// Singleton instance cache
const resilienceFacades = new Map<string, ResilienceFacade>();
const rateLimiters = new Map<string, RateLimiter>();

/**
 * Gets a resilience facade instance for a provider
 * @param providerName The name of the provider
 * @returns ResilienceFacade instance
 */
export const getResilienceFacade = <T>(providerName: string): ResilienceFacade<T> => {
  if (!resilienceFacades.has(providerName)) {
    const config = getProviderResilienceConfig(providerName);
    resilienceFacades.set(
      providerName,
      new ResilienceFacade<T>({
        ...config,
        serviceName: providerName
      })
    );
  }
  
  return resilienceFacades.get(providerName) as ResilienceFacade<T>;
};

/**
 * Gets a rate limiter for a provider
 * @param providerName The name of the provider
 * @returns RateLimiter instance
 */
export const getRateLimiter = (providerName: string): RateLimiter => {
  if (!rateLimiters.has(providerName)) {
    const config = getProviderResilienceConfig(providerName);
    
    rateLimiters.set(
      providerName,
      new RateLimiter({
        maxRequestsPerMinute: 120, // Default
        initialDelayMs: config.retryOptions?.initialDelayMs || 1000,
        maxDelayMs: config.retryOptions?.maxDelayMs || 10000,
        backoffFactor: config.retryOptions?.backoffFactor || 2,
        backoffThreshold: 0.7 // Default
      })
    );
  }
  
  return rateLimiters.get(providerName)!;
};

/**
 * Creates a resilient axios instance for a provider
 * @param providerName The name of the provider
 * @param baseURL The base URL for the axios instance
 * @param defaultConfig Additional axios config
 * @returns Axios instance
 */
export function createResilientAxiosClient(
  providerName: string,
  baseURL: string,
  defaultConfig: AxiosRequestConfig = {}
): AxiosInstance {
  const config = getProviderResilienceConfig(providerName);
  const resilience = getResilienceFacade(providerName);
  const rateLimiter = getRateLimiter(providerName);
  
  // Create axios instance
  const axiosInstance = axios.create({
    baseURL,
    timeout: config.timeoutMs,
    ...defaultConfig
  });
  
  // Add request interceptor
  axiosInstance.interceptors.request.use(
    async (config) => {
      // Apply rate limiting
      await rateLimiter.throttle();
      return config;
    },
    (error) => Promise.reject(error)
  );
  
  // Add response interceptor
  axiosInstance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      // Handle rate limiting
      const statusCodes = config.rateLimitStatusCodes || [429];
      
      if (error.response && statusCodes.includes(error.response.status)) {
        let resetTimeMs = 60000; // Default 1 minute
      
        // Try to extract reset time from custom extractor
        if (config.extractResetTime) {
          const extractedTime = config.extractResetTime(error);
          if (extractedTime) {
            resetTimeMs = extractedTime;
          }
        } 
        // Try to extract from Retry-After or custom header
        else if (error.response?.headers) {
          const headerName = config.retryAfterHeaderName || 'retry-after';
          const retryAfter = error.response.headers[headerName];
          
          if (retryAfter) {
            // Check if it's a timestamp or number of seconds
            if (isNaN(Number(retryAfter))) {
              // Timestamp format
              const retryDate = new Date(retryAfter);
              resetTimeMs = Math.max(0, retryDate.getTime() - Date.now());
            } else {
              // Seconds format
              resetTimeMs = Number(retryAfter) * 1000;
            }
          }
        }
      
        rateLimiter.handleRateLimitResponse(resetTimeMs);
      }
      
      return Promise.reject(error);
    }
  );
  
  // Create a wrapper function that applies resilience patterns to each request
  const originalRequest = axiosInstance.request;
  axiosInstance.request = async function<T = any, R = AxiosResponse<T>>(
    config: AxiosRequestConfig
  ): Promise<R> {
    const cacheKey = `${config.method || 'GET'}:${config.url}:${JSON.stringify(config.params)}`;
    
    return resilience.execute<R>(
      cacheKey,
      async () => originalRequest.call(axiosInstance, config),
      async (error) => {
        // If we have a fallback function, use it
        if (typeof config.fallback === 'function') {
          return config.fallback(error) as Promise<R>;
        }
        
        // Otherwise, reject with the original error
        throw error;
      }
    );
  };
  
  return axiosInstance;
}

/**
 * Resets all resilience facades and rate limiters
 */
export const resetAllResilience = (): void => {
  // Reset all resilience facades
  for (const [_, facade] of resilienceFacades.entries()) {
    facade.reset();
  }
  
  // Reset all rate limiters
  for (const [_, limiter] of rateLimiters.entries()) {
    limiter.reset();
  }
};

/**
 * Gets the health status of all resilience facades
 * @returns Map of provider names to health status
 */
export const getAllHealthStatus = (): Map<string, 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY'> => {
  const healthStatus = new Map<string, 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY'>();
  
  for (const [provider, facade] of resilienceFacades.entries()) {
    healthStatus.set(provider, facade.getHealthStatus());
  }
  
  return healthStatus;
};