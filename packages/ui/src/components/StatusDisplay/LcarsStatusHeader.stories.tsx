import React from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { LcarsStatusHeader } from './LcarsStatusHeader';

export default {
  title: 'StatusDisplay/LcarsStatusHeader',
  component: LcarsStatusHeader,
  parameters: {
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#121212' },
      ],
    },
  },
} as Meta<typeof LcarsStatusHeader>;

const Template: StoryFn<typeof LcarsStatusHeader> = (args) => <LcarsStatusHeader {...args} />;

export const Running = Template.bind({});
Running.args = {
  operationName: 'Jira to qTest Migration',
  operationState: 'running',
  percentComplete: 42,
  estimatedTimeRemaining: 600, // 10 minutes
  startTime: new Date(),
  lastTransactionName: 'Import Test Case TC-1234',
  lastTransactionStatus: 'completed',
};

export const Paused = Template.bind({});
Paused.args = {
  operationName: 'Jira to qTest Migration',
  operationState: 'paused',
  percentComplete: 42,
  estimatedTimeRemaining: 600,
  startTime: new Date(),
  lastTransactionName: 'Import Test Case TC-1234',
  lastTransactionStatus: 'completed',
};

export const Error = Template.bind({});
Error.args = {
  operationName: 'Jira to qTest Migration',
  operationState: 'error',
  percentComplete: 42,
  estimatedTimeRemaining: 0,
  startTime: new Date(),
  lastTransactionName: 'Import Test Case TC-1235',
  lastTransactionStatus: 'failed',
};

export const Completed = Template.bind({});
Completed.args = {
  operationName: 'Jira to qTest Migration',
  operationState: 'completed',
  percentComplete: 100,
  startTime: new Date(Date.now() - 3600000), // 1 hour ago
  endTime: new Date(),
  lastTransactionName: 'Finalize Migration',
  lastTransactionStatus: 'completed',
};

export const Idle = Template.bind({});
Idle.args = {
  operationName: 'Jira to qTest Migration',
  operationState: 'idle',
};