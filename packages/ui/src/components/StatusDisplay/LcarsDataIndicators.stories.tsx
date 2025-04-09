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
import { LcarsDataIndicators } from './LcarsDataIndicators';

export default {
  title: 'StatusDisplay/LcarsDataIndicators',
  component: LcarsDataIndicators,
  parameters: {
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#121212' },
      ],
    },
  },
} as Meta<typeof LcarsDataIndicators>;

const Template: StoryFn<typeof LcarsDataIndicators> = (args) => <LcarsDataIndicators {...args} />;

export const Default = Template.bind({});
Default.args = {
  bytesIn: 1024,
  bytesOut: 2048,
  hasIncomingData: false,
  hasOutgoingData: false,
};

export const ActiveTransfer = Template.bind({});
ActiveTransfer.args = {
  bytesIn: 1048576, // 1 MB
  bytesOut: 2097152, // 2 MB
  hasIncomingData: true,
  hasOutgoingData: true,
};

export const IncomingOnly = Template.bind({});
IncomingOnly.args = {
  bytesIn: 15728640, // 15 MB
  bytesOut: 2048, // 2 KB
  hasIncomingData: true,
  hasOutgoingData: false,
};

export const OutgoingOnly = Template.bind({});
OutgoingOnly.args = {
  bytesIn: 2048, // 2 KB
  bytesOut: 15728640, // 15 MB
  hasIncomingData: false,
  hasOutgoingData: true,
};

export const LargeDataTransfer = Template.bind({});
LargeDataTransfer.args = {
  bytesIn: 3221225472, // 3 GB
  bytesOut: 1073741824, // 1 GB
  hasIncomingData: true,
  hasOutgoingData: true,
};