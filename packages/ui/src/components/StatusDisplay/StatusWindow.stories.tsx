import React from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { StatusWindow } from './StatusWindow';

export default {
  title: 'StatusDisplay/StatusWindow',
  component: StatusWindow,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#121212' },
      ],
    },
  },
} as Meta<typeof StatusWindow>;

// Generate mock logs
const generateMockLogs = (count: number) => {
  const logs = [];
  
  // Add initial startup logs
  logs.push('Initializing migration engine');
  logs.push('Loading provider configurations');
  logs.push('Establishing connection to source system (Jira)');
  logs.push('Connection successful');
  logs.push('Establishing connection to target system (qTest)');
  logs.push('Connection successful');
  logs.push('Retrieving source system hierarchy');
  logs.push('Found 5 projects, 24 folders, 1243 test cases');
  logs.push('Analyzing target system');
  logs.push('Starting migration process');
  
  // Add test case processing logs
  for (let i = 1; i <= count; i++) {
    const testCaseId = `TC-${1000 + i}`;
    logs.push(`Processing test case ${testCaseId}`);
    
    // Randomly add details for some test cases
    if (i % 3 === 0) {
      logs.push(`  - Found 5 steps in ${testCaseId}`);
      logs.push(`  - Found 2 attachments in ${testCaseId}`);
      logs.push(`  - Creating test case in qTest`);
      logs.push(`  - Created as QT-${2000 + i}`);
    }
    
    // Randomly add errors for some test cases
    if (i % 17 === 0) {
      logs.push(`  - ERROR: Failed to process attachment in ${testCaseId}`);
      logs.push(`  - Retrying attachment upload (1/3)`);
      logs.push(`  - Attachment upload successful on retry`);
    }
    
    logs.push(`Completed test case ${testCaseId}`);
  }
  
  return logs;
};

const Template: StoryFn<typeof StatusWindow> = (args) => (
  <div style={{ width: '100%', height: '600px', padding: '16px' }}>
    <StatusWindow {...args} />
  </div>
);

export const RunningMigration = Template.bind({});
RunningMigration.args = {
  title: 'Jira to qTest Migration',
  logs: generateMockLogs(50),
  operationName: 'Jira to qTest Migration',
  operationState: 'running',
  percentComplete: 42,
  estimatedTimeRemaining: 600, // 10 minutes
  startTime: new Date(),
  lastTransactionName: 'Processing test case TC-1234',
  lastTransactionStatus: 'running',
  bytesIn: 1572864, // 1.5 MB
  bytesOut: 524288, // 512 KB
  hasIncomingData: true,
  hasOutgoingData: true,
};

export const CompletedMigration = Template.bind({});
CompletedMigration.args = {
  title: 'Jira to qTest Migration',
  logs: [
    ...generateMockLogs(50),
    'Migration process completed',
    'Successfully migrated 1243 test cases',
    'Failed to migrate 18 test cases',
    'See detailed report for more information',
  ],
  operationName: 'Jira to qTest Migration',
  operationState: 'completed',
  percentComplete: 100,
  startTime: new Date(Date.now() - 3600000), // 1 hour ago
  endTime: new Date(),
  lastTransactionName: 'Generate migration report',
  lastTransactionStatus: 'completed',
  bytesIn: 52428800, // 50 MB
  bytesOut: 10485760, // 10 MB
  hasIncomingData: false,
  hasOutgoingData: false,
};

export const ErrorState = Template.bind({});
ErrorState.args = {
  title: 'Jira to qTest Migration',
  logs: [
    ...generateMockLogs(30),
    'ERROR: Connection to qTest lost',
    'Attempting to reconnect (1/3)',
    'Reconnection failed',
    'Attempting to reconnect (2/3)',
    'Reconnection failed',
    'Attempting to reconnect (3/3)',
    'Reconnection failed',
    'Migration process halted due to connection errors',
    'Please check network connectivity and credentials',
  ],
  operationName: 'Jira to qTest Migration',
  operationState: 'error',
  percentComplete: 28,
  startTime: new Date(Date.now() - 1800000), // 30 minutes ago
  lastTransactionName: 'Reconnect to qTest',
  lastTransactionStatus: 'failed',
  bytesIn: 15728640, // 15 MB
  bytesOut: 5242880, // 5 MB
  hasIncomingData: false,
  hasOutgoingData: false,
};

export const PausedState = Template.bind({});
PausedState.args = {
  title: 'Jira to qTest Migration',
  logs: [
    ...generateMockLogs(42),
    'Migration process paused by user',
    'Current state saved',
    'Resume the migration to continue from current position',
  ],
  operationName: 'Jira to qTest Migration',
  operationState: 'paused',
  percentComplete: 35,
  startTime: new Date(Date.now() - 1200000), // 20 minutes ago
  lastTransactionName: 'Process pause requested',
  lastTransactionStatus: 'completed',
  bytesIn: 31457280, // 30 MB
  bytesOut: 8388608, // 8 MB
  hasIncomingData: false,
  hasOutgoingData: false,
};

export const LargeDataTransfer = Template.bind({});
LargeDataTransfer.args = {
  title: 'Jira to qTest Migration (Large Dataset)',
  logs: generateMockLogs(20),
  operationName: 'Jira to qTest Migration',
  operationState: 'running',
  percentComplete: 18,
  estimatedTimeRemaining: 1800, // 30 minutes
  startTime: new Date(),
  lastTransactionName: 'Processing attachment for TC-1234',
  lastTransactionStatus: 'running',
  bytesIn: 3221225472, // 3 GB
  bytesOut: 1073741824, // 1 GB
  hasIncomingData: true,
  hasOutgoingData: true,
};