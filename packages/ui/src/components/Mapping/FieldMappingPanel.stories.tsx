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
import { FieldMappingPanel } from './FieldMappingPanel';
import { Field, FieldMapping } from '../../types';

export default {
  title: 'Components/Mapping/FieldMappingPanel',
  component: FieldMappingPanel,
  parameters: {
    componentSubtitle: 'Comprehensive panel for creating and managing field mappings',
    layout: 'padded',
  },
} as Meta<typeof FieldMappingPanel>;

// Mock source fields for Jira/Zephyr
const sourceFields: Field[] = [
  { id: 'summary', name: 'Summary', type: 'string', required: true },
  { id: 'description', name: 'Description', type: 'text', required: true },
  { id: 'priority', name: 'Priority', type: 'string', required: false },
  { id: 'status', name: 'Status', type: 'string', required: false },
  { id: 'steps', name: 'Test Steps', type: 'array', required: false },
  { id: 'created_date', name: 'Created Date', type: 'date', required: false },
  { id: 'updated_date', name: 'Updated Date', type: 'date', required: false },
  { id: 'estimated_time', name: 'Estimated Time', type: 'number', required: false },
  { id: 'is_active', name: 'Is Active', type: 'boolean', required: false },
];

// Mock target fields for qTest
const targetFields: Field[] = [
  { id: 'name', name: 'Name', type: 'string', required: true },
  { id: 'description', name: 'Description', type: 'text', required: true },
  { id: 'severity', name: 'Severity', type: 'string', required: true },
  { id: 'state', name: 'State', type: 'string', required: false },
  { id: 'preconditions', name: 'Preconditions', type: 'text', required: false },
  { id: 'test_steps', name: 'Test Steps', type: 'array', required: true },
  { id: 'expected_results', name: 'Expected Results', type: 'text', required: false },
  { id: 'creation_date', name: 'Creation Date', type: 'date', required: false },
  { id: 'modified_date', name: 'Modified Date', type: 'date', required: false },
  { id: 'estimated_duration', name: 'Estimated Duration', type: 'number', required: false },
  { id: 'active', name: 'Active', type: 'boolean', required: false },
];

// Example initial mappings
const initialMappings: FieldMapping[] = [
  { sourceId: 'summary', targetId: 'name', transformation: null },
  { sourceId: 'description', targetId: 'description', transformation: null },
];

const Template: StoryFn<typeof FieldMappingPanel> = (args) => {
  const [mappings, setMappings] = useState<FieldMapping[]>(args.initialMappings || []);
  
  return (
    <FieldMappingPanel 
      {...args} 
      initialMappings={mappings}
      onMappingsChange={setMappings}
    />
  );
};

export const EmptyMapping = Template.bind({});
EmptyMapping.args = {
  sourceFields,
  targetFields,
};

export const WithInitialMappings = Template.bind({});
WithInitialMappings.args = {
  sourceFields,
  targetFields,
  initialMappings,
};

export const WithFieldTypes = Template.bind({});
WithFieldTypes.args = {
  sourceFields,
  targetFields,
  showFieldTypes: true,
};

export const WithoutTransformations = Template.bind({});
WithoutTransformations.args = {
  sourceFields,
  targetFields,
  showTransformations: false,
};

export const WithoutValidation = Template.bind({});
WithoutValidation.args = {
  sourceFields,
  targetFields,
  validateMappings: false,
};

export const DisabledPanel = Template.bind({});
DisabledPanel.args = {
  sourceFields,
  targetFields,
  initialMappings,
  disabled: true,
};