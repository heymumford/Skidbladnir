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
import { MappingList } from './MappingList';
import { FieldMapping, Field } from '../../types';

export default {
  title: 'Components/Mapping/MappingList',
  component: MappingList,
  parameters: {
    componentSubtitle: 'Component for displaying existing field mappings',
  },
  argTypes: {
    onDeleteMapping: { action: 'mapping deleted' },
  },
} as Meta<typeof MappingList>;

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

// Mock mappings
const mockMappings: FieldMapping[] = [
  { sourceId: 'summary', targetId: 'name', transformation: null },
  { sourceId: 'description', targetId: 'description', transformation: null },
  { sourceId: 'priority', targetId: 'severity', transformation: 'uppercase' },
  { sourceId: 'status', targetId: 'state', transformation: null },
  { sourceId: 'steps', targetId: 'test_steps', transformation: null },
  { sourceId: 'created_date', targetId: 'creation_date', transformation: null },
  { sourceId: 'estimated_time', targetId: 'estimated_duration', transformation: null },
  { sourceId: 'is_active', targetId: 'active', transformation: null },
];

// Mappings with type mismatches
const mismatchedMappings: FieldMapping[] = [
  { sourceId: 'summary', targetId: 'expected_results', transformation: null }, // string -> text
  { sourceId: 'estimated_time', targetId: 'name', transformation: null }, // number -> string
  { sourceId: 'is_active', targetId: 'severity', transformation: null }, // boolean -> string
];

const Template: StoryFn<typeof MappingList> = (args) => (
  <MappingList {...args} />
);

export const BasicMappingList = Template.bind({});
BasicMappingList.args = {
  mappings: mockMappings,
  sourceFields,
  targetFields,
};

export const WithFieldTypes = Template.bind({});
WithFieldTypes.args = {
  mappings: mockMappings,
  sourceFields,
  targetFields,
  showFieldTypes: true,
};

export const WithRequiredFields = Template.bind({});
WithRequiredFields.args = {
  mappings: mockMappings,
  sourceFields,
  targetFields,
  showRequiredFields: true,
};

export const WithTransformations = Template.bind({});
WithTransformations.args = {
  mappings: [
    { sourceId: 'summary', targetId: 'name', transformation: 'uppercase' },
    { sourceId: 'description', targetId: 'description', transformation: 'lowercase' },
    { sourceId: 'priority', targetId: 'severity', transformation: 'trim' },
    { sourceId: 'steps', targetId: 'preconditions', transformation: 'substring' },
    { sourceId: 'status', targetId: 'state', transformation: 'replace' },
  ],
  sourceFields,
  targetFields,
  showFieldTypes: true,
};

export const WithTypeMismatches = Template.bind({});
WithTypeMismatches.args = {
  mappings: mismatchedMappings,
  sourceFields,
  targetFields,
  showFieldTypes: true,
};

export const EmptyState = Template.bind({});
EmptyState.args = {
  mappings: [],
  sourceFields,
  targetFields,
};

export const DisabledList = Template.bind({});
DisabledList.args = {
  mappings: mockMappings,
  sourceFields,
  targetFields,
  disabled: true,
};