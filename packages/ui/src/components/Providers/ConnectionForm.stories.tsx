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
import { ConnectionForm } from './ConnectionForm';
import { Provider } from '../../types';

export default {
  title: 'Components/Providers/ConnectionForm',
  component: ConnectionForm,
  parameters: {
    componentSubtitle: 'A form for configuring provider connections',
  },
} as Meta<typeof ConnectionForm>;

// Mock providers
const jiraProvider: Provider = {
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
};

const qtestProvider: Provider = {
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
};

// Mock connection fields
const jiraConnectionFields = [
  { 
    name: 'url', 
    label: 'Jira Instance URL', 
    type: 'text' as const, 
    required: true,
    placeholder: 'https://your-instance.atlassian.net',
    helpText: 'The URL of your Jira instance'
  },
  { 
    name: 'apiKey', 
    label: 'API Token', 
    type: 'password' as const, 
    required: true,
    placeholder: 'Enter your API token',
    helpText: 'Generate an API token from your Atlassian account'
  },
  { 
    name: 'projectKey', 
    label: 'Project Key', 
    type: 'text' as const, 
    required: false,
    placeholder: 'e.g. TEST',
    helpText: 'The key of the project to use (optional)'
  },
  { 
    name: 'zephyrEnabled', 
    label: 'Use Zephyr Scale', 
    type: 'text' as const, 
    required: true,
    placeholder: 'true or false',
    helpText: 'Whether to use Zephyr Scale for test management'
  }
];

const qtestConnectionFields = [
  { 
    name: 'url', 
    label: 'qTest Instance URL', 
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
  },
  { 
    name: 'moduleId', 
    label: 'Module ID', 
    type: 'number' as const, 
    required: false,
    placeholder: 'e.g. 12345',
    helpText: 'The ID of the module to use (optional)'
  }
];

// Mock test connection response
const mockTestConnection = async (params: any) => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simulate connection test
  if (params.apiKey === 'invalid') {
    return { success: false, message: 'Connection failed: Invalid API key' };
  }
  
  return { success: true, message: 'Connection successful' };
};

const Template: StoryFn<typeof ConnectionForm> = (args) => (
  <ConnectionForm {...args} />
);

export const JiraZephyrConnection = Template.bind({});
JiraZephyrConnection.args = {
  provider: jiraProvider,
  connectionFields: jiraConnectionFields,
  onSubmit: (params) => console.log('Form submitted:', params),
  onTest: mockTestConnection,
};

export const QTestConnection = Template.bind({});
QTestConnection.args = {
  provider: qtestProvider,
  connectionFields: qtestConnectionFields,
  onSubmit: (params) => console.log('Form submitted:', params),
  onTest: mockTestConnection,
};

export const WithExistingValues = Template.bind({});
WithExistingValues.args = {
  provider: jiraProvider,
  connectionFields: jiraConnectionFields,
  onSubmit: (params) => console.log('Form submitted:', params),
  onTest: mockTestConnection,
  existingParams: {
    url: 'https://existing.atlassian.net',
    apiKey: 'existing-key',
    projectKey: 'EXIST',
    zephyrEnabled: 'true'
  }
};

export const DisabledForm = Template.bind({});
DisabledForm.args = {
  provider: jiraProvider,
  connectionFields: jiraConnectionFields,
  onSubmit: (params) => console.log('Form submitted:', params),
  onTest: mockTestConnection,
  disabled: true,
};