/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { ProviderConfigPanel } from './ProviderConfigPanel';
import { Provider, ConnectionParams } from '../../types';

export default {
  title: 'Components/Providers/ProviderConfigPanel',
  component: ProviderConfigPanel,
  parameters: {
    componentSubtitle: 'A panel for configuring provider connections',
    layout: 'padded',
  },
  argTypes: {
    getConnectionFields: { action: 'getConnectionFields' },
    testConnection: { action: 'testConnection' },
    saveConnection: { action: 'saveConnection' },
  },
} as Meta<typeof ProviderConfigPanel>;

// Mock providers
const mockProviders: Provider[] = [
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

// Mock connection fields for each provider
const mockConnectionFields = {
  jira: [
    { 
      name: 'url', 
      label: 'API URL', 
      type: 'text' as const, 
      required: true,
      placeholder: 'https://your-instance.atlassian.net',
      helpText: 'The URL of your Jira instance'
    },
    { 
      name: 'apiKey', 
      label: 'API Key', 
      type: 'password' as const, 
      required: true,
      placeholder: 'Enter your API key',
      helpText: 'The API key for authentication'
    },
    { 
      name: 'projectKey', 
      label: 'Project Key', 
      type: 'text' as const, 
      required: false,
      placeholder: 'e.g. TEST',
      helpText: 'The key of the project to use (optional)'
    }
  ],
  qtest: [
    { 
      name: 'url', 
      label: 'Instance URL', 
      type: 'text' as const, 
      required: true,
      placeholder: 'https://your-instance.qtestnet.com',
      helpText: 'The URL of your qTest instance'
    },
    { 
      name: 'apiKey', 
      label: 'API Key', 
      type: 'password' as const, 
      required: true,
      placeholder: 'Enter your API key',
      helpText: 'Generate an API key from your qTest account'
    },
    { 
      name: 'projectId', 
      label: 'Project ID', 
      type: 'number' as const, 
      required: true,
      placeholder: 'e.g. 12345',
      helpText: 'The ID of the qTest project'
    }
  ],
  ado: [
    { 
      name: 'url', 
      label: 'Organization URL', 
      type: 'text' as const, 
      required: true,
      placeholder: 'https://dev.azure.com/your-org',
      helpText: 'The URL of your Azure DevOps organization'
    },
    { 
      name: 'token', 
      label: 'Personal Access Token', 
      type: 'password' as const, 
      required: true,
      placeholder: 'Enter your PAT',
      helpText: 'Generate a PAT with the appropriate permissions'
    },
    { 
      name: 'project', 
      label: 'Project Name', 
      type: 'text' as const, 
      required: true,
      placeholder: 'e.g. MyProject',
      helpText: 'The name of your Azure DevOps project'
    }
  ]
};

// Mock API functions
const getConnectionFields = (providerId: string) => {
  return new Promise((resolve) => {
    // Simulate API delay
    setTimeout(() => {
      resolve(mockConnectionFields[providerId] || []);
    }, 500);
  });
};

const testConnection = (providerId: string, params: ConnectionParams) => {
  return new Promise((resolve) => {
    // Simulate API delay
    setTimeout(() => {
      // Simulate connection test result
      if (params.apiKey === 'invalid' || params.token === 'invalid') {
        resolve({
          success: false,
          message: 'Connection failed: Invalid credentials'
        });
      } else {
        resolve({
          success: true,
          message: 'Connection successful'
        });
      }
    }, 1000);
  });
};

const Template: StoryFn<typeof ProviderConfigPanel> = (args) => (
  <ProviderConfigPanel {...args} />
);

export const SourceProvider = Template.bind({});
SourceProvider.args = {
  title: 'Source Provider Configuration',
  providers: mockProviders,
  getConnectionFields: getConnectionFields as any,
  testConnection: testConnection as any,
  saveConnection: (providerId, params) => console.log('Save connection:', providerId, params),
};

export const TargetProvider = Template.bind({});
TargetProvider.args = {
  title: 'Target Provider Configuration',
  providers: mockProviders,
  getConnectionFields: getConnectionFields as any,
  testConnection: testConnection as any,
  saveConnection: (providerId, params) => console.log('Save connection:', providerId, params),
};

export const WithExistingConfig = Template.bind({});
WithExistingConfig.args = {
  title: 'Edit Provider Configuration',
  providers: mockProviders,
  getConnectionFields: getConnectionFields as any,
  testConnection: testConnection as any,
  saveConnection: (providerId, params) => console.log('Save connection:', providerId, params),
  existingConfig: {
    providerId: 'jira',
    params: {
      url: 'https://example.atlassian.net',
      apiKey: 'existing-api-key',
      projectKey: 'EXAMPLE'
    }
  }
};

export const DisabledPanel = Template.bind({});
DisabledPanel.args = {
  title: 'Provider Configuration (Disabled)',
  providers: mockProviders,
  getConnectionFields: getConnectionFields as any,
  testConnection: testConnection as any,
  saveConnection: (providerId, params) => console.log('Save connection:', providerId, params),
  disabled: true,
};