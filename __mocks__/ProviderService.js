/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

// Mock ProviderService

const ProviderService = function() {
  return {
    getProviders: jest.fn().mockReturnValue([
      {
        id: 'zephyr',
        name: 'Zephyr',
        type: 'source',
        icon: 'zephyr-icon.svg',
        description: 'Zephyr Scale for Jira',
        fields: [
          { id: 'url', name: 'API URL', type: 'text', required: true },
          { id: 'token', name: 'API Token', type: 'password', required: true },
          { id: 'project', name: 'Project Key', type: 'text', required: true }
        ]
      },
      {
        id: 'qtest',
        name: 'qTest',
        type: 'target',
        icon: 'qtest-icon.svg',
        description: 'Tricentis qTest',
        fields: [
          { id: 'url', name: 'API URL', type: 'text', required: true },
          { id: 'token', name: 'API Token', type: 'password', required: true },
          { id: 'projectId', name: 'Project ID', type: 'text', required: true }
        ]
      }
    ]),
    
    getProviderById: jest.fn().mockImplementation((id) => {
      const providers = {
        'zephyr': {
          id: 'zephyr',
          name: 'Zephyr',
          type: 'source',
          icon: 'zephyr-icon.svg',
          description: 'Zephyr Scale for Jira',
          fields: [
            { id: 'url', name: 'API URL', type: 'text', required: true },
            { id: 'token', name: 'API Token', type: 'password', required: true },
            { id: 'project', name: 'Project Key', type: 'text', required: true }
          ]
        },
        'qtest': {
          id: 'qtest',
          name: 'qTest',
          type: 'target',
          icon: 'qtest-icon.svg',
          description: 'Tricentis qTest',
          fields: [
            { id: 'url', name: 'API URL', type: 'text', required: true },
            { id: 'token', name: 'API Token', type: 'password', required: true },
            { id: 'projectId', name: 'Project ID', type: 'text', required: true }
          ]
        }
      };
      return providers[id] || null;
    }),
    
    getProviderConfig: jest.fn().mockReturnValue({
      zephyr: {
        url: 'https://api.zephyrscale.com/v1',
        token: 'mock-token',
        project: 'TEST'
      },
      qtest: {
        url: 'https://api.qtest.com/api/v3',
        token: 'mock-token',
        projectId: '12345'
      }
    }),
    
    setProviderConfig: jest.fn().mockResolvedValue(true),
    
    testConnection: jest.fn().mockImplementation((providerId, params) => {
      // Return a promise that resolves to the expected result for the tests
      if (providerId === 'zephyr') {
        return Promise.resolve({
          success: true,
          message: 'Successfully connected to Zephyr Scale',
          details: {
            version: '8.7.2',
            authenticatedUser: 'test-user@example.com',
            projectName: 'TEST',
            testCaseCount: 1234
          }
        });
      }
      return Promise.resolve({
        success: true,
        message: 'Connection successful'
      });
    }),
    
    getProviderFieldMappings: jest.fn().mockReturnValue({
      zephyr: {
        fields: [
          { id: 'summary', name: 'Summary', type: 'string' },
          { id: 'description', name: 'Description', type: 'text' },
          { id: 'priority', name: 'Priority', type: 'enum' },
          { id: 'status', name: 'Status', type: 'enum' }
        ]
      },
      qtest: {
        fields: [
          { id: 'name', name: 'Name', type: 'string' },
          { id: 'description', name: 'Description', type: 'text' },
          { id: 'priority', name: 'Priority', type: 'enum' },
          { id: 'status', name: 'Status', type: 'enum' }
        ]
      }
    })
  };
};

// Create a mock instance
const providerService = ProviderService();

module.exports = {
  ProviderService,
  providerService
};