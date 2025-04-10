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
import { FieldMappingSelector } from './FieldMappingSelector';
import { Field } from '../../types';

export default {
  title: 'Components/Mapping/FieldMappingSelector',
  component: FieldMappingSelector,
  parameters: {
    componentSubtitle: 'Component for selecting field mappings between source and target',
  },
  argTypes: {
    onCreateMapping: { action: 'mapping created' },
  },
} as Meta<typeof FieldMappingSelector>;

// Mock source fields
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

// Mock target fields
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

const Template: StoryFn<typeof FieldMappingSelector> = (args) => (
  <FieldMappingSelector {...args} />
);

export const BasicSelector = Template.bind({});
BasicSelector.args = {
  sourceFields,
  targetFields,
};

export const WithFieldDetails = Template.bind({});
WithFieldDetails.args = {
  sourceFields,
  targetFields,
  showFieldDetails: true,
};

export const WithCompatibilityCheck = Template.bind({});
WithCompatibilityCheck.args = {
  sourceFields,
  targetFields,
  showFieldDetails: true,
  showCompatibility: true,
};

export const WithTransformations = Template.bind({});
WithTransformations.args = {
  sourceFields,
  targetFields,
  showFieldDetails: true,
  showCompatibility: true,
  showTransformations: true,
};

export const DisabledSelector = Template.bind({});
DisabledSelector.args = {
  sourceFields,
  targetFields,
  disabled: true,
};