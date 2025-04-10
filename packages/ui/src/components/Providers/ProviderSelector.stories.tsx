/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React, { useState } from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { ProviderSelector } from './ProviderSelector';
import { Provider } from '../../types';

export default {
  title: 'Components/Providers/ProviderSelector',
  component: ProviderSelector,
  parameters: {
    componentSubtitle: 'A dropdown component for selecting providers',
  },
  argTypes: {
    onSelect: { action: 'selected' },
  },
} as Meta<typeof ProviderSelector>;

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
  },
  {
    id: 'rally',
    name: 'Rally',
    version: '0.9.0',
    capabilities: {
      supportsTestCases: true,
      supportsTestCycles: false,
      supportsTestExecutions: false,
      supportsAttachments: false,
      supportsCustomFields: true
    }
  }
];

const Template: StoryFn<typeof ProviderSelector> = (args) => {
  const [selectedProvider, setSelectedProvider] = useState<Provider | undefined>(args.value);
  
  return (
    <ProviderSelector
      {...args}
      value={selectedProvider}
      onSelect={(provider) => {
        setSelectedProvider(provider);
        args.onSelect(provider);
      }}
    />
  );
};

export const Default = Template.bind({});
Default.args = {
  providers: mockProviders,
  label: 'Provider',
  placeholder: 'Select a provider',
};

export const WithVersion = Template.bind({});
WithVersion.args = {
  providers: mockProviders,
  label: 'Provider',
  placeholder: 'Select a provider',
  showVersion: true,
};

export const Preselected = Template.bind({});
Preselected.args = {
  providers: mockProviders,
  label: 'Provider',
  value: mockProviders[1],
};

export const Disabled = Template.bind({});
Disabled.args = {
  providers: mockProviders,
  label: 'Provider',
  disabled: true,
};

export const CustomLabel = Template.bind({});
CustomLabel.args = {
  providers: mockProviders,
  label: 'Source System',
  placeholder: 'Choose your source system',
};