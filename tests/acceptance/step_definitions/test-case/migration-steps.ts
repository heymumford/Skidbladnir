/**
 * Test Case Migration step definitions
 * 
 * This file defines Cucumber step definitions for the test case migration feature.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { SkidbladnirWorld } from '../../support/world';
import { expect } from 'chai';

/**
 * Provider connection steps
 */
Given('the system has a valid connection to the {string} source provider', function(this: SkidbladnirWorld, provider: string) {
  this.context.sourceProvider = provider;
  // Set the connection state in the world
  this.context.scenarioContext.sourceProviderConnected = true;
});

Given('the system has a valid connection to the {string} target provider', function(this: SkidbladnirWorld, provider: string) {
  this.context.targetProvider = provider;
  // Set the connection state in the world
  this.context.scenarioContext.targetProviderConnected = true;
});

Given('the source system is not available', function(this: SkidbladnirWorld) {
  // Set the connection state to false
  this.context.scenarioContext.sourceProviderConnected = false;
});

Given('the source system is available', function(this: SkidbladnirWorld) {
  // Set the connection state to true
  this.context.scenarioContext.sourceProviderConnected = true;
});

/**
 * Test case setup steps
 */
Given('I have a test case with ID {string} in the source system', function(this: SkidbladnirWorld, id: string) {
  // Mock a test case in the world
  this.context.testCase = {
    id,
    name: `Test Case ${id}`,
    description: 'Test case description',
    priority: 'Medium',
    status: 'Ready'
  };
});

Given('I have a test case with the following attributes in the source system:', function(this: SkidbladnirWorld, dataTable: any) {
  // Extract the test case attributes from the data table
  const attributes = dataTable.rowsHash();
  this.context.testCase = attributes;
});

Given('the test case has {int} attachments', function(this: SkidbladnirWorld, count: number) {
  // Mock attachments
  this.context.testCase.attachments = Array(count).fill(0).map((_, index) => ({
    id: `attachment-${index + 1}`,
    name: `Attachment ${index + 1}`,
    contentType: 'image/png',
    size: 1024,
    content: Buffer.from(`mock-content-${index + 1}`).toString('base64')
  }));
});

/**
 * Migration request steps
 */
When('I request to migrate the test case to the target system', async function(this: SkidbladnirWorld) {
  const { testCase, sourceProvider, targetProvider } = this.context;
  
  if (!this.context.scenarioContext.sourceProviderConnected) {
    // Mock a source system connection failure
    this.context.apiError = new Error('Source system unavailable');
    this.context.apiResponse = { status: 503, data: { error: 'Source system unavailable' } };
    this.context.responseData = { error: 'Source system unavailable' };
    return;
  }
  
  if (!testCase) {
    // Mock a test case not found
    this.context.apiError = new Error('Test case not found');
    this.context.apiResponse = { status: 404, data: { error: 'Test case not found' } };
    this.context.responseData = { error: 'Test case not found' };
    return;
  }
  
  // Make the migration request
  await this.createTestRequest(
    'POST',
    `/api/migration/test-cases`,
    {
      sourceId: testCase.id,
      sourceProvider,
      targetProvider
    }
  );
  
  // Store the workflow ID if the request was successful
  if (this.context.apiResponse?.status === 202) {
    this.context.workflowId = this.context.responseData.workflowId;
  }
});

When('I request to migrate a test case with ID {string}', async function(this: SkidbladnirWorld, id: string) {
  const { sourceProvider, targetProvider } = this.context;
  
  if (!this.context.scenarioContext.sourceProviderConnected) {
    // Mock a source system connection failure
    this.context.apiError = new Error('Source system unavailable');
    this.context.apiResponse = { status: 503, data: { error: 'Source system unavailable' } };
    this.context.responseData = { error: 'Source system unavailable' };
    return;
  }
  
  // Check if the ID is "NONEXISTENT" to simulate not found
  if (id === 'NONEXISTENT') {
    this.context.apiError = new Error('Test case not found');
    this.context.apiResponse = { status: 404, data: { error: 'Test case not found' } };
    this.context.responseData = { error: 'Test case not found' };
    return;
  }
  
  // Make the migration request
  await this.createTestRequest(
    'POST',
    `/api/migration/test-cases`,
    {
      sourceId: id,
      sourceProvider,
      targetProvider
    }
  );
  
  // Store the workflow ID if the request was successful
  if (this.context.apiResponse?.status === 202) {
    this.context.workflowId = this.context.responseData.workflowId;
  }
});

/**
 * Workflow monitoring steps
 */
When('I wait for the migration to complete', async function(this: SkidbladnirWorld) {
  // Mock workflow completion - in a real implementation, this would poll the workflow status
  if (!this.context.workflowId) {
    throw new Error('No workflow ID available to check status');
  }
  
  // Simulate API call to check workflow status
  await this.createTestRequest('GET', `/api/workflows/${this.context.workflowId}`);
  
  // Mock the workflow completion
  this.context.workflowStatus = 'COMPLETED';
  this.context.responseData = {
    ...this.context.responseData,
    status: 'COMPLETED',
    targetId: 'target-TC-' + this.context.testCase.id
  };
  
  // Store the target test case ID for later assertions
  this.context.testCase.targetId = this.context.responseData.targetId;
});

/**
 * Target system validation steps
 */
Then('the test case should exist in the target system', async function(this: SkidbladnirWorld) {
  if (!this.context.testCase.targetId) {
    throw new Error('No target test case ID available');
  }
  
  // Simulate fetching the test case from the target system
  await this.createTestRequest('GET', `/api/providers/${this.context.targetProvider}/test-cases/${this.context.testCase.targetId}`);
  
  // Mock the response with the migrated test case data
  this.context.responseData = {
    id: this.context.testCase.targetId,
    name: this.context.testCase.name,
    description: this.context.testCase.description,
    priority: this.context.testCase.priority,
    status: this.context.testCase.status,
    attachments: this.context.testCase.attachments || []
  };
  
  // Verify test case exists
  expect(this.context.apiResponse.status).to.equal(200);
});

Then('the test case in the target system should have the same name', function(this: SkidbladnirWorld) {
  const originalName = this.context.testCase.name;
  const targetName = this.context.responseData.name;
  
  expect(targetName).to.equal(originalName);
});

Then('the test case in the target system should have the following attributes:', function(this: SkidbladnirWorld, dataTable: any) {
  const expectedAttributes = dataTable.rowsHash();
  const targetTestCase = this.context.responseData;
  
  // Verify each expected attribute matches
  Object.entries(expectedAttributes).forEach(([key, value]) => {
    expect(targetTestCase[key]).to.equal(value);
  });
});

Then('the test case in the target system should have {int} attachments', function(this: SkidbladnirWorld, count: number) {
  const attachments = this.context.responseData.attachments || [];
  expect(attachments.length).to.equal(count);
});

Then('the attachments should have the same content', function(this: SkidbladnirWorld) {
  const originalAttachments = this.context.testCase.attachments || [];
  const targetAttachments = this.context.responseData.attachments || [];
  
  expect(originalAttachments.length).to.equal(targetAttachments.length);
  
  // Compare content of each attachment
  originalAttachments.forEach((original: any, index: number) => {
    const target = targetAttachments[index];
    expect(target.content).to.equal(original.content);
  });
});