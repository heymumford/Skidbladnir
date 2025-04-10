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
    // In a real application, this would make an API call
    // For now, simulate a connection test
    
    // Simulate some validation
    if (!params.url) {
      return {
        success: false,
        message: 'URL is required'
      };
    }
    
    if (!params.apiKey && !params.token) {
      return {
        success: false,
        message: 'API Key or token is required'
      };
    }
    
    // Simulate an authentication error for specific values
    if (params.apiKey === 'invalid' || params.token === 'invalid') {
      return {
        success: false,
        message: 'Connection failed: Invalid credentials'
      };
    }
    
    // Otherwise, return success
    return {
      success: true,
      message: 'Connection successful',
      details: `Connected to ${providerId} at ${params.url}`
    };
  }
  
  /**
   * Save a connection configuration
   */
  async saveConnection(providerId: string, params: ConnectionParams): Promise<{ id: string }> {
    // In a real application, this would make an API call
    // For now, just return a mock ID
    return {
      id: `conn-${Date.now()}`
    };
  }
}

// Export a singleton instance
export const providerService = new ProviderService();