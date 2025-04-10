/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React from 'react';
import { StoryObj, Meta } from '@storybook/react';
import { TestCaseStructureVisualization } from './TestCaseStructureVisualization';
import { testCaseService } from '../../services';

// Mock the service for Storybook
jest.mock('../../services', () => ({
  testCaseService: {
    getTestCase: () => Promise.resolve({
      id: 'TC-123',
      title: 'Login Functionality Test',
      description: 'Verify that users can successfully log in to the application using valid credentials.',
      platform: 'generic',
      status: 'Active',
      priority: 'High',
      automationStatus: 'manual',
      tags: ['login', 'authentication', 'security'],
      steps: [
        {
          id: 'step-1',
          order: 1,
          description: 'Navigate to the login page',
          expectedResult: 'The login page is displayed with username and password fields'
        },
        {
          id: 'step-2',
          order: 2,
          description: 'Enter a valid username and password',
          expectedResult: 'The credentials are accepted without validation errors'
        },
        {
          id: 'step-3',
          order: 3,
          description: 'Click the "Login" button',
          expectedResult: 'The user is successfully authenticated and redirected to the dashboard'
        }
      ],
      customFields: {
        testType: 'Functional',
        component: 'Authentication',
        estimatedTime: '15m'
      }
    }),
    getProviderFormat: (providerId) => {
      if (providerId === 'zephyr') {
        return Promise.resolve({
          id: 'zephyr',
          name: 'Zephyr Scale',
          structure: {
            key: 'string (ID of the test in Zephyr/Jira)',
            summary: 'string (Title of the test case)',
            description: 'string (Detailed description in Jira markup)'
          }
        });
      } else if (providerId === 'qtest') {
        return Promise.resolve({
          id: 'qtest',
          name: 'qTest',
          structure: {
            id: 'number (Internal qTest ID)',
            name: 'string (Test case name/title)',
            description: 'string (Detailed description in HTML)'
          }
        });
      }
      return Promise.resolve(null);
    },
    compareTestCaseFormats: () => Promise.resolve({
      source: {
        id: 'ZEPHYR-123',
        title: 'Login Functionality Test',
        platform: 'zephyr',
        status: 'Draft',
        priority: 'Medium',
        steps: [
          {
            id: 'step-1',
            order: 1,
            description: 'Navigate to the login page',
            expectedResult: 'The login page is displayed'
          },
          {
            id: 'step-2',
            order: 2,
            description: 'Enter username and password',
            expectedResult: 'Credentials are accepted'
          }
        ],
        customFields: {
          labels: ['login', 'authentication'],
          epicLink: 'AUTH-123'
        }
      },
      target: {
        id: 'QTEST-123',
        title: 'Login Functionality Test',
        platform: 'qtest',
        status: 'Ready to Test',
        priority: 'High',
        steps: [
          {
            id: 'step-1',
            order: 1,
            description: 'Navigate to login page',
            expectedResult: 'Login form is displayed'
          },
          {
            id: 'step-2',
            order: 2,
            description: 'Enter valid credentials',
            expectedResult: 'Form accepts credentials'
          }
        ],
        customFields: {
          module: 'Authentication',
          release: 'R2023Q2'
        }
      }
    })
  }
}));

const meta: Meta<typeof TestCaseStructureVisualization> = {
  title: 'Components/TestCase/TestCaseStructureVisualization',
  component: TestCaseStructureVisualization,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    testCaseId: {
      control: 'text',
      description: 'ID of the test case to visualize',
    },
    sourceProviderId: {
      control: 'select',
      options: ['', 'generic', 'zephyr', 'qtest', 'rally', 'alm', 'azuredevops'],
      description: 'Provider ID for source format visualization',
    },
    targetProviderId: {
      control: 'select',
      options: ['', 'generic', 'zephyr', 'qtest', 'rally', 'alm', 'azuredevops'],
      description: 'Provider ID for target format visualization',
    },
  },
};

export default meta;
type Story = StoryObj<typeof TestCaseStructureVisualization>;

export const Basic: Story = {
  args: {
    testCaseId: 'TC-123',
  },
};

export const WithSourceFormat: Story = {
  args: {
    testCaseId: 'TC-123',
    sourceProviderId: 'zephyr',
  },
};

export const WithBothFormats: Story = {
  args: {
    testCaseId: 'TC-123',
    sourceProviderId: 'zephyr',
    targetProviderId: 'qtest',
  },
};

export const ErrorState: Story = {
  render: (args) => {
    // Override the getTestCase implementation to simulate an error
    const originalGetTestCase = testCaseService.getTestCase;
    testCaseService.getTestCase = () => Promise.reject(new Error('Failed to load test case'));
    
    // Reset after component unmounts
    React.useEffect(() => {
      return () => {
        testCaseService.getTestCase = originalGetTestCase;
      };
    }, []);
    
    return <TestCaseStructureVisualization {...args} />;
  },
  args: {
    testCaseId: 'TC-ERROR',
  },
};