/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { Provider, ConnectionParams, ConnectionStatus } from '../types';

// Connection field interface (should be in types.ts in a real application)
export interface ConnectionField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'number';
  required: boolean;
  placeholder?: string;
  helpText?: string;
}

// Provider Service for handling provider operations
export class ProviderService {
  private apiBaseUrl: string;
  
  constructor(apiBaseUrl: string = '/api') {
    this.apiBaseUrl = apiBaseUrl;
  }
  
  /**
   * Get all available providers
   */
  async getProviders(): Promise<Provider[]> {
    // In a real application, this would make an API call
    // For now, return mock data
    return [
      {
        id: 'jira',
        name: 'Jira/Zephyr',
        version: '1.0.0',
        capabilities: {
          supportsTestCases: true,
          supportsTestCycles: true,
          supportsTestExecutions: true,
          supportsAttachments: true,
          supportsCustomFields: true
        }
      },
      {
        id: 'qtest',
        name: 'qTest',
        version: '1.0.0',
        capabilities: {
          supportsTestCases: true,
          supportsTestCycles: true,
          supportsTestExecutions: true,
          supportsAttachments: true,
          supportsCustomFields: true
        }
      },
      {
        id: 'ado',
        name: 'Azure DevOps',
        version: '1.0.0',
        capabilities: {
          supportsTestCases: true,
          supportsTestCycles: false,
          supportsTestExecutions: true,
          supportsAttachments: true,
          supportsCustomFields: false
        }
      }
    ];
  }
  
  /**
   * Get connection fields for a provider
   */
  async getConnectionFields(providerId: string): Promise<ConnectionField[]> {
    // In a real application, this would make an API call
    // For now, return mock data based on provider ID
    const mockFields: Record<string, ConnectionField[]> = {
      jira: [
        { 
          name: 'url', 
          label: 'API URL', 
          type: 'text', 
          required: true,
          placeholder: 'https://your-instance.atlassian.net',
          helpText: 'The URL of your Jira instance'
        },
        { 
          name: 'apiKey', 
          label: 'API Key', 
          type: 'password', 
          required: true,
          placeholder: 'Enter your API key',
          helpText: 'The API key for authentication'
        },
        { 
          name: 'projectKey', 
          label: 'Project Key', 
          type: 'text', 
          required: false,
          placeholder: 'e.g. TEST',
          helpText: 'The key of the project to use (optional)'
        }
      ],
      qtest: [
        { 
          name: 'url', 
          label: 'Instance URL', 
          type: 'text', 
          required: true,
          placeholder: 'https://your-instance.qtestnet.com',
          helpText: 'The URL of your qTest instance'
        },
        { 
          name: 'apiKey', 
          label: 'API Key', 
          type: 'password', 
          required: true,
          placeholder: 'Enter your API key',
          helpText: 'Generate an API key from your qTest account'
        },
        { 
          name: 'projectId', 
          label: 'Project ID', 
          type: 'number', 
          required: true,
          placeholder: 'e.g. 12345',
          helpText: 'The ID of the qTest project'
        }
      ],
      ado: [
        { 
          name: 'url', 
          label: 'Organization URL', 
          type: 'text', 
          required: true,
          placeholder: 'https://dev.azure.com/your-org',
          helpText: 'The URL of your Azure DevOps organization'
        },
        { 
          name: 'token', 
          label: 'Personal Access Token', 
          type: 'password', 
          required: true,
          placeholder: 'Enter your PAT',
          helpText: 'Generate a PAT with the appropriate permissions'
        },
        { 
          name: 'project', 
          label: 'Project Name', 
          type: 'text', 
          required: true,
          placeholder: 'e.g. MyProject',
          helpText: 'The name of your Azure DevOps project'
        }
      ]
    };
    
    return mockFields[providerId] || [];
  }
  
  /**
   * Test connection to a provider
   */
  async testConnection(providerId: string, params: ConnectionParams): Promise<ConnectionStatus> {
    // In a real application, this would make an API call to test the connection
    // For now, simulate a connection test with more realistic provider-specific checks
    
    // Add a small delay to simulate network latency (for demo purposes)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Perform provider-specific validation
    if (providerId === 'zephyr') {
      // Zephyr connection validation
      if (!params.baseUrl) {
        return {
          success: false,
          message: 'Zephyr API Base URL is required'
        };
      }
      
      if (!params.apiKey) {
        return {
          success: false,
          message: 'Zephyr API Key is required'
        };
      }
      
      if (!params.projectKey) {
        return {
          success: false,
          message: 'Zephyr Project Key is required'
        };
      }
      
      // Simulate an authentication error for specific values
      if (params.apiKey === 'invalid') {
        return {
          success: false,
          message: 'Connection failed: Invalid API Key. Please check your credentials.'
        };
      }
      
      if (params.projectKey === 'INVALID') {
        return {
          success: false,
          message: 'Connection failed: Project not found. Please check your Project Key.'
        };
      }
      
      // Otherwise, return success with Zephyr-specific details
      return {
        success: true,
        message: 'Successfully connected to Zephyr Scale',
        details: {
          version: '2.0.3',
          authenticatedUser: 'api-user@example.com',
          projectName: params.projectKey,
          projectId: 'P' + Math.floor(Math.random() * 10000),
          timestamp: new Date().toISOString(),
          testCaseCount: 423
        }
      };
    } 
    else if (providerId === 'qtest') {
      // qTest connection validation
      if (!params.instanceUrl) {
        return {
          success: false,
          message: 'qTest Instance URL is required'
        };
      }
      
      if (params.instanceUrl.includes('{instance}')) {
        return {
          success: false,
          message: 'Please replace {instance} with your actual qTest instance name'
        };
      }
      
      if (!params.apiToken) {
        return {
          success: false,
          message: 'qTest API Token is required'
        };
      }
      
      if (!params.projectId) {
        return {
          success: false,
          message: 'qTest Project ID is required'
        };
      }
      
      // Simulate authentication errors
      if (params.apiToken === 'invalid') {
        return {
          success: false,
          message: 'Connection failed: Invalid API Token. Please check your credentials.'
        };
      }
      
      if (params.projectId === '99999') {
        return {
          success: false,
          message: 'Connection failed: Project not found. Please check your Project ID.'
        };
      }
      
      // Check for impersonation errors
      if (params.useImpersonation && !params.impersonationUser) {
        return {
          success: false,
          message: 'Impersonation user is required when impersonation is enabled'
        };
      }
      
      // Check for automation token errors
      if (params.useAutomationToken && !params.automationToken) {
        return {
          success: false,
          message: 'Automation token is required when automation is enabled'
        };
      }
      
      // Otherwise, return success with qTest-specific details
      return {
        success: true,
        message: 'Successfully connected to qTest Manager',
        details: {
          version: '10.1.3',
          authenticatedUser: 'api-user@example.com',
          projectName: 'Sample Project',
          projectId: parseInt(params.projectId as string),
          timestamp: new Date().toISOString(),
          modules: 5,
          testCaseCount: 187
        }
      };
    }
    
    // For other providers
    return {
      success: false,
      message: `Provider '${providerId}' is not currently supported`
    };
  }
  
  /**
   * Save a connection configuration
   */
  async saveConnection(providerId: string, params: ConnectionParams): Promise<{ id: string }> {
    // In a real application, this would make an API call
    // For now, save to localStorage for persistence in demo
    try {
      localStorage.setItem(`provider_config_${providerId}`, JSON.stringify(params));
      return {
        id: `conn-${Date.now()}`
      };
    } catch (error) {
      console.error('Error saving connection configuration:', error);
      // Return a mock ID in case localStorage is not available
      return {
        id: `conn-${Date.now()}`
      };
    }
  }
  
  /**
   * Get saved connection configuration
   */
  async getConnectionConfig(providerId: string): Promise<ConnectionParams | null> {
    // In a real application, this would make an API call
    // For now, retrieve from localStorage for the demo
    try {
      const configStr = localStorage.getItem(`provider_config_${providerId}`);
      
      if (configStr) {
        return JSON.parse(configStr);
      }
      
      return null;
    } catch (error) {
      console.error('Error retrieving connection configuration:', error);
      return null;
    }
  }
}

// Export a singleton instance
export const providerService = new ProviderService();