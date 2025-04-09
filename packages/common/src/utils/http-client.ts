/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * HTTP client implementation for making API requests
 * 
 * This utility provides a consistent interface for making HTTP requests
 * with support for retries, timeouts, and rate limiting.
 */

import { RateLimiter } from './rate-limiter';
import { createLogger, LogLevel } from './logger';

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS'
}

export interface RetryOptions {
  /**
   * Maximum number of retry attempts
   */
  maxRetries: number;
  
  /**
   * Base delay between retries in milliseconds
   */
  delayMs: number;
  
  /**
   * HTTP status codes that should trigger a retry
   */
  retryableStatuses: number[];
}

export interface HttpClientOptions {
  /**
   * Base URL for all requests
   */
  baseUrl?: string;
  
  /**
   * Request timeout in milliseconds
   */
  timeout?: number;
  
  /**
   * Default headers to include with every request
   */
  defaultHeaders?: Record<string, string>;
  
  /**
   * Rate limiter for throttling requests
   */
  rateLimiter?: RateLimiter;
  
  /**
   * Retry configuration
   */
  retry?: RetryOptions;
  
  /**
   * Custom fetch implementation
   */
  fetchFn?: typeof fetch;
}

export class HttpError extends Error {
  public status: number;
  public code?: string;
  public data?: any;
  
  constructor(message: string, status: number, code?: string, data?: any) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

export class HttpClient {
  private options: HttpClientOptions;
  private logger = createLogger({ context: 'HttpClient', level: LogLevel.INFO });
  private authToken?: string;
  
  constructor(options: HttpClientOptions = {}) {
    this.options = {
      baseUrl: '',
      timeout: 30000, // 30 seconds
      defaultHeaders: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      retry: {
        maxRetries: 0,
        delayMs: 1000,
        retryableStatuses: [429, 500, 502, 503, 504]
      },
      fetchFn: fetch,
      ...options
    };
  }
  
  /**
   * Set authentication token
   */
  public setAuthToken(token: string): void {
    this.authToken = token;
  }
  
  /**
   * Perform a GET request
   */
  public async get<T = any>(path: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(path, {
      method: HttpMethod.GET,
      ...options
    });
  }
  
  /**
   * Perform a POST request
   */
  public async post<T = any>(path: string, body?: any, options: RequestInit = {}): Promise<T> {
    return this.request<T>(path, {
      method: HttpMethod.POST,
      body: body ? JSON.stringify(body) : undefined,
      ...options
    });
  }
  
  /**
   * Perform a PUT request
   */
  public async put<T = any>(path: string, body?: any, options: RequestInit = {}): Promise<T> {
    return this.request<T>(path, {
      method: HttpMethod.PUT,
      body: body ? JSON.stringify(body) : undefined,
      ...options
    });
  }
  
  /**
   * Perform a DELETE request
   */
  public async delete<T = any>(path: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(path, {
      method: HttpMethod.DELETE,
      ...options
    });
  }
  
  /**
   * Perform a PATCH request
   */
  public async patch<T = any>(path: string, body?: any, options: RequestInit = {}): Promise<T> {
    return this.request<T>(path, {
      method: HttpMethod.PATCH,
      body: body ? JSON.stringify(body) : undefined,
      ...options
    });
  }
  
  /**
   * General-purpose request method
   */
  public async request<T = any>(path: string, options: RequestInit = {}, retryCount = 0): Promise<T> {
    const url = this.buildUrl(path);
    const headers = this.buildHeaders(options.headers);
    
    const requestOptions: RequestInit = {
      ...options,
      headers
    };
    
    try {
      // Apply rate limiting if configured
      if (this.options.rateLimiter) {
        await this.options.rateLimiter.throttle();
      }
      
      // Create a fetch promise with timeout handling
      let timeoutId: NodeJS.Timeout;
      const fetchWithTimeout = new Promise<Response>(async (resolve, reject) => {
        // Set up timeout
        timeoutId = setTimeout(() => {
          reject(new Error('Request timeout'));
        }, this.options.timeout);
        
        try {
          // Execute the fetch
          const response = await this.options.fetchFn!(url, requestOptions);
          resolve(response);
        } catch (error) {
          reject(error);
        }
      }).finally(() => {
        // Clean up timeout to prevent memory leaks
        clearTimeout(timeoutId);
      });
      
      // Wait for fetch with timeout
      const response = await fetchWithTimeout;
      
      // Handle rate limit responses
      if (response.status === 429 && this.options.rateLimiter) {
        const retryAfter = response.headers.get('retry-after');
        if (retryAfter) {
          const retryMs = parseInt(retryAfter, 10) * 1000;
          this.options.rateLimiter.handleRateLimitResponse(retryMs);
        }
      }
      
      // If response is not ok, handle according to retry policy
      if (!response.ok) {
        // Check if we should retry
        const retry = this.options.retry!;
        if (
          retryCount < retry.maxRetries && 
          retry.retryableStatuses.includes(response.status)
        ) {
          const delay = retry.delayMs * Math.pow(2, retryCount);
          this.logger.debug(`Retrying request (${retryCount + 1}/${retry.maxRetries}) after ${delay}ms`);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          
          return this.request<T>(path, options, retryCount + 1);
        }
        
        // If we're not retrying or have exhausted retries, throw an error
        const errorData = await this.parseErrorResponse(response);
        throw new HttpError(
          errorData.message || `HTTP error ${response.status}`,
          response.status,
          errorData.code,
          errorData
        );
      }
      
      // Parse successful response
      if (response.status === 204) {
        // No content
        return null as unknown as T;
      }
      
      return await response.json();
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      
      this.logger.error('HTTP request failed', error);
      throw error;
    }
  }
  
  /**
   * Build full URL from path
   */
  private buildUrl(path: string): string {
    if (path.startsWith('http')) {
      return path;
    }
    
    const baseUrl = this.options.baseUrl!.endsWith('/') 
      ? this.options.baseUrl!.slice(0, -1) 
      : this.options.baseUrl;
      
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    
    return `${baseUrl}${normalizedPath}`;
  }
  
  /**
   * Build headers for request
   */
  private buildHeaders(customHeaders?: HeadersInit): Record<string, string> {
    const headers = { ...this.options.defaultHeaders };
    
    // Add auth token if set
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    
    // Add custom headers
    if (customHeaders) {
      if (customHeaders instanceof Headers) {
        customHeaders.forEach((value, key) => {
          headers[key] = value;
        });
      } else if (Array.isArray(customHeaders)) {
        for (const [key, value] of customHeaders) {
          headers[key] = value;
        }
      } else {
        Object.assign(headers, customHeaders);
      }
    }
    
    return headers;
  }
  
  /**
   * Parse error response
   */
  private async parseErrorResponse(response: Response): Promise<any> {
    try {
      return await response.json();
    } catch (error) {
      return {
        message: response.statusText,
        status: response.status
      };
    }
  }
}

/**
 * Create a new HTTP client instance
 */
export function createHttpClient(options: HttpClientOptions = {}): HttpClient {
  return new HttpClient(options);
}

// Create a default HTTP client for application-wide use
export const defaultHttpClient = createHttpClient();