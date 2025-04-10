/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import axios, { AxiosError } from 'axios';
import { ConnectionParams, ConnectionStatus } from '../types';

/**
 * Service to test connections to different providers
 */
export class ProviderConnectionService {
  private readonly baseUrl: string;

  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
  }

  /**
   * Test connection to a provider
   * 
   * @param providerId The provider ID (zephyr, qtest, etc.)
   * @param params Connection parameters
   * @returns Connection status
   */
  public async testConnection(providerId: string, params: ConnectionParams): Promise<ConnectionStatus> {
    try {
      // In development, we'll simulate API calls
      if (process.env.NODE_ENV === 'development') {
        return this.mockTestConnection(providerId, params);
      }

      // In production, we'll make real API calls
      const response = await axios.post(`${this.baseUrl}/providers/${providerId}/test-connection`, params);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      return {
        success: false,
        message: 'Connection failed',
        details: {
          errorMessage: axiosError.message,
          statusCode: axiosError.response?.status,
        }
      };
    }
  }

  /**
   * Get connection fields for a provider
   * 
   * @param providerId The provider ID (zephyr, qtest, etc.)
   * @returns Array of connection field definitions
   */
  public async getConnectionFields(providerId: string): Promise<any[]> {
    try {
      // In development, we'll simulate API calls
      if (process.env.NODE_ENV === 'development') {
        return this.mockGetConnectionFields(providerId);
      }

      // In production, we'll make real API calls
      const response = await axios.get(`${this.baseUrl}/providers/${providerId}/connection-fields`);
      return response.data;
    } catch (error) {
      console.error('Error getting connection fields:', error);
      return [];
    }
  }

  /**
   * Mock connection test for development
   */
  private mockTestConnection(providerId: string, params: ConnectionParams): Promise<ConnectionStatus> {
    return new Promise((resolve) => {
      // Simulate API call latency
      setTimeout(() => {
        // Check if required parameters are provided
        const requiredParams = this.getRequiredParams(providerId);
        
        const missingParams = requiredParams.filter(param => !params[param] || params[param].trim() === '');
        
        if (missingParams.length > 0) {
          resolve({
            success: false,
            message: `Missing required parameters: ${missingParams.join(', ')}`,
            details: {
              missingParams
            }
          });
          return;
        }

        // Handle different providers
        switch (providerId) {
          case 'zephyr':
            if (params.apiKey?.includes('invalid')) {
              resolve({
                success: false,
                message: 'Invalid API key',
                details: {
                  errorCode: 'INVALID_CREDENTIALS'
                }
              });
            } else if (params.projectKey?.includes('invalid')) {
              resolve({
                success: false,
                message: 'Project not found',
                details: {
                  errorCode: 'PROJECT_NOT_FOUND'
                }
              });
            } else {
              resolve({
                success: true,
                message: 'Successfully connected to Zephyr Scale',
                details: {
                  version: '8.7.2',
                  authenticatedUser: 'api-user@example.com',
                  projectName: params.projectKey || 'TEST',
                  timestamp: new Date().toISOString()
                }
              });
            }
            break;
          
          case 'qtest':
            if (params.apiToken?.includes('invalid')) {
              resolve({
                success: false,
                message: 'Invalid API token',
                details: {
                  errorCode: 'INVALID_TOKEN'
                }
              });
            } else if (params.projectId?.includes('invalid')) {
              resolve({
                success: false,
                message: 'Project not found',
                details: {
                  errorCode: 'PROJECT_NOT_FOUND'
                }
              });
            } else {
              resolve({
                success: true,
                message: 'Successfully connected to qTest Manager',
                details: {
                  version: '10.5.3',
                  authenticatedUser: 'api-user@example.com',
                  projectName: `Project ${params.projectId || '123456'}`,
                  timestamp: new Date().toISOString()
                }
              });
            }
            break;
          
          default:
            resolve({
              success: false,
              message: `Unsupported provider: ${providerId}`,
              details: {
                errorCode: 'UNSUPPORTED_PROVIDER'
              }
            });
        }
      }, 1000); // Simulate 1 second API latency
    });
  }

  /**
   * Mock connection fields for development
   */
  private mockGetConnectionFields(providerId: string): Promise<any[]> {
    return new Promise((resolve) => {
      // Simulate API call latency
      setTimeout(() => {
        // Handle different providers
        switch (providerId) {
          case 'zephyr':
            resolve([
              { 
                name: 'baseUrl', 
                label: 'API Base URL', 
                type: 'text', 
                required: true, 
                placeholder: 'https://api.zephyrscale.smartbear.com/v2',
                defaultValue: 'https://api.zephyrscale.smartbear.com/v2',
                helpText: 'The base URL for the Zephyr Scale API'
              },
              { 
                name: 'apiKey', 
                label: 'API Key', 
                type: 'password', 
                required: true, 
                placeholder: 'Enter your Zephyr Scale API key',
                helpText: 'Your Zephyr Scale API key (from your user profile)'
              },
              { 
                name: 'projectKey', 
                label: 'Project Key', 
                type: 'text', 
                required: true, 
                placeholder: 'PROJ',
                helpText: 'The key of the Zephyr Scale project'
              }
            ]);
            break;
          
          case 'qtest':
            resolve([
              { 
                name: 'baseUrl', 
                label: 'qTest Instance URL', 
                type: 'text', 
                required: true, 
                placeholder: 'https://yourcompany.qtestnet.com',
                helpText: 'Your qTest instance URL (without /api)'
              },
              { 
                name: 'apiToken', 
                label: 'API Token', 
                type: 'password', 
                required: true, 
                placeholder: 'Enter your qTest API token',
                helpText: 'Your qTest API token (from your user profile)'
              },
              { 
                name: 'projectId', 
                label: 'Project ID', 
                type: 'text', 
                required: true, 
                placeholder: '12345',
                helpText: 'The numeric ID of the qTest project'
              }
            ]);
            break;
          
          default:
            resolve([
              { name: 'baseUrl', label: 'API Base URL', type: 'text', required: true },
              { name: 'apiKey', label: 'API Key', type: 'password', required: true }
            ]);
        }
      }, 500); // Simulate 0.5 second API latency
    });
  }

  /**
   * Get required parameters for a provider
   */
  private getRequiredParams(providerId: string): string[] {
    switch (providerId) {
      case 'zephyr':
        return ['baseUrl', 'apiKey', 'projectKey'];
      case 'qtest':
        return ['baseUrl', 'apiToken', 'projectId'];
      default:
        return ['baseUrl', 'apiKey'];
    }
  }
}

// Export a singleton instance
export const providerConnectionService = new ProviderConnectionService();