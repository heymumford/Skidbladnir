/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { ZephyrProvider, ZephyrProviderConfig } from './index';
import { ZephyrClient } from './api-client';
import { EntityType } from '../../common/src/interfaces/provider';

// Mock ZephyrClient
jest.mock('./api-client', () => {
  return {
    ZephyrClient: jest.fn().mockImplementation(() => ({
      testConnection: jest.fn().mockResolvedValue({ status: 200, statusText: 'OK' }),
      getProjects: jest.fn().mockResolvedValue({ data: [
        { id: 'proj1', key: 'PROJ1', name: 'Project 1' },
        { id: 'proj2', key: 'PROJ2', name: 'Project 2' }
      ]}),
      getFolders: jest.fn().mockResolvedValue({ data: [
        { id: 'folder1', name: 'Folder 1', folderPath: '/Folder 1' },
        { id: 'folder2', name: 'Folder 2', folderPath: '/Folder 2' }
      ]}),
      getTests: jest.fn().mockResolvedValue({ data: [
        { id: 'tc1', key: 'TC-1', name: 'Test Case 1', status: 'READY' },
        { id: 'tc2', key: 'TC-2', name: 'Test Case 2', status: 'DRAFT' }
      ]}),
      getTest: jest.fn().mockResolvedValue({ data: {
        id: 'tc1', key: 'TC-1', name: 'Test Case 1', status: 'READY',
        steps: [{ index: 1, description: 'Step 1', expectedResult: 'Result 1' }]
      }}),
      getCycles: jest.fn().mockResolvedValue({ data: [
        { id: 'cycle1', name: 'Cycle 1', status: 'ACTIVE' },
        { id: 'cycle2', name: 'Cycle 2', status: 'CLOSED' }
      ]}),
      getExecutions: jest.fn().mockResolvedValue({ data: [
        { id: 'exec1', testId: 'tc1', cycleId: 'cycle1', status: 'PASSED' },
        { id: 'exec2', testId: 'tc2', cycleId: 'cycle1', status: 'FAILED' }
      ]}),
      getAttachment: jest.fn().mockResolvedValue({ data: {
        id: 'att1', filename: 'test.png', contentType: 'image/png', fileSize: 1024
      }}),
      getAttachmentContent: jest.fn().mockResolvedValue({ data: Buffer.from('test') }),
      getCustomFields: jest.fn().mockResolvedValue({ data: [
        { id: 'field1', name: 'Custom Field 1', type: 'TEXT', required: false }
      ]}),
      createFolder: jest.fn().mockResolvedValue({ data: { id: 'newfolder' } }),
      createTest: jest.fn().mockResolvedValue({ data: { id: 'newtc' } }),
      updateTest: jest.fn().mockResolvedValue({ data: { id: 'tc1' } }),
      createCycle: jest.fn().mockResolvedValue({ data: { id: 'newcycle' } }),
      addTestsToCycle: jest.fn().mockResolvedValue({ data: { success: true } }),
      bulkCreateExecutions: jest.fn().mockResolvedValue({ data: [{ id: 'newexec1' }, { id: 'newexec2' }] }),
      createTestAttachment: jest.fn().mockResolvedValue({ data: { id: 'newatt1' } }),
      createExecutionAttachment: jest.fn().mockResolvedValue({ data: { id: 'newatt2' } })
    }))
  };
});

describe('ZephyrProvider', () => {
  let provider: ZephyrProvider;
  const mockConfig: ZephyrProviderConfig = {
    baseUrl: 'https://api.zephyrscale.example.com',
    apiToken: 'mock-api-token',
    defaultProjectKey: 'PROJ1'
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    provider = new ZephyrProvider();
  });
  
  it('should initialize with config', async () => {
    await provider.initialize(mockConfig);
    expect(ZephyrClient).toHaveBeenCalledWith({
      baseUrl: mockConfig.baseUrl,
      apiToken: mockConfig.apiToken,
      maxRequestsPerMinute: undefined,
      jiraApiToken: undefined,
      jiraUrl: undefined,
      jiraUsername: undefined
    });
  });
  
  it('should test connection successfully', async () => {
    await provider.initialize(mockConfig);
    const result = await provider.testConnection();
    expect(result.connected).toBe(true);
  });
  
  it('should return provider metadata', () => {
    const metadata = provider.getMetadata();
    expect(metadata.systemName).toBe('Zephyr Scale');
    expect(metadata.providerVersion).toBe(provider.version);
    expect(metadata.capabilities).toEqual(provider.capabilities);
    expect(metadata.configSchema).toBeDefined();
  });
  
  it('should get projects', async () => {
    await provider.initialize(mockConfig);
    const projects = await provider.getProjects();
    expect(projects).toHaveLength(2);
    expect(projects[0].name).toBe('Project 1');
    expect(projects[0].sourceProjectId).toBe('proj1');
  });
  
  it('should get folders', async () => {
    await provider.initialize(mockConfig);
    const folders = await provider.getFolders('PROJ1');
    expect(folders).toHaveLength(2);
    expect(folders[0].name).toBe('Folder 1');
    expect(folders[0].path).toBe('/Folder 1');
  });
  
  it('should get test cases', async () => {
    await provider.initialize(mockConfig);
    const result = await provider.getTestCases('PROJ1');
    expect(result.items).toHaveLength(2);
    expect(result.items[0].name).toBe('Test Case 1');
    expect(result.items[0].sourceId).toBe('TC-1');
  });
  
  it('should get a single test case', async () => {
    await provider.initialize(mockConfig);
    const testCase = await provider.getTestCase('PROJ1', 'tc1');
    expect(testCase.name).toBe('Test Case 1');
    expect(testCase.steps).toHaveLength(1);
    expect(testCase.steps[0].action).toBe('Step 1');
  });
  
  it('should get test cycles', async () => {
    await provider.initialize(mockConfig);
    const result = await provider.getTestCycles('PROJ1');
    expect(result.items).toHaveLength(2);
    expect(result.items[0].name).toBe('Cycle 1');
    expect(result.items[0].status).toBe('ACTIVE');
  });
  
  it('should get test executions', async () => {
    await provider.initialize(mockConfig);
    const result = await provider.getTestExecutions('PROJ1', 'cycle1');
    expect(result.items).toHaveLength(2);
    expect(result.items[0].testCaseId).toBe('tc1');
    expect(result.items[0].status).toBe('PASSED');
  });
  
  it('should get attachment content', async () => {
    await provider.initialize(mockConfig);
    const attachment = await provider.getAttachmentContent('PROJ1', 'att1');
    expect(attachment.name).toBe('test.png');
    expect(attachment.contentType).toBe('image/png');
    expect(attachment.content).toBeInstanceOf(Buffer);
  });
  
  it('should get field definitions', async () => {
    await provider.initialize(mockConfig);
    const fields = await provider.getFieldDefinitions('PROJ1');
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe('Custom Field 1');
  });
  
  it('should create a folder', async () => {
    await provider.initialize(mockConfig);
    const folderId = await provider.createFolder('PROJ1', { 
      id: '', 
      name: 'New Folder', 
      description: 'Test folder'
    });
    expect(folderId).toBe('newfolder');
  });
  
  it('should create a test case', async () => {
    await provider.initialize(mockConfig);
    const testCaseId = await provider.createTestCase('PROJ1', {
      id: '',
      name: 'New Test Case',
      description: 'Test description',
      steps: [{ sequence: 1, action: 'Test step' }]
    });
    expect(testCaseId).toBe('newtc');
  });
  
  it('should create test steps', async () => {
    await provider.initialize(mockConfig);
    await expect(provider.createTestSteps('PROJ1', 'tc1', [
      { sequence: 1, action: 'Updated step 1' },
      { sequence: 2, action: 'New step 2' }
    ])).resolves.not.toThrow();
  });
  
  it('should create a test cycle', async () => {
    await provider.initialize(mockConfig);
    const cycleId = await provider.createTestCycle('PROJ1', {
      id: '',
      name: 'New Cycle',
      description: 'Test cycle',
      testCases: [{ id: 'item1', testCaseId: 'tc1' }]
    });
    expect(cycleId).toBe('newcycle');
  });
  
  it('should create test executions', async () => {
    await provider.initialize(mockConfig);
    await expect(provider.createTestExecutions('PROJ1', 'cycle1', [
      {
        id: '',
        name: 'Execution 1',
        testCaseId: 'tc1',
        testCycleId: 'cycle1',
        status: 'PASSED',
        results: [{ sequence: 1, status: 'PASSED' }]
      },
      {
        id: '',
        name: 'Execution 2',
        testCaseId: 'tc2',
        testCycleId: 'cycle1',
        status: 'FAILED',
        results: [{ sequence: 1, status: 'FAILED' }]
      }
    ])).resolves.not.toThrow();
  });
  
  it('should upload an attachment for a test case', async () => {
    await provider.initialize(mockConfig);
    const attachmentId = await provider.uploadAttachment('PROJ1', EntityType.TEST_CASE, 'tc1', {
      name: 'test.png',
      contentType: 'image/png',
      size: 1024,
      content: Buffer.from('test')
    });
    expect(attachmentId).toBe('newatt1');
  });
  
  it('should upload an attachment for an execution', async () => {
    await provider.initialize(mockConfig);
    const attachmentId = await provider.uploadAttachment('PROJ1', EntityType.TEST_EXECUTION, 'exec1', {
      name: 'test.png',
      contentType: 'image/png',
      size: 1024,
      content: Buffer.from('test')
    });
    expect(attachmentId).toBe('newatt2');
  });
  
  it('should throw an error for unsupported attachment entity type', async () => {
    await provider.initialize(mockConfig);
    await expect(provider.uploadAttachment('PROJ1', EntityType.FOLDER, 'folder1', {
      name: 'test.png',
      contentType: 'image/png',
      size: 1024,
      content: Buffer.from('test')
    })).rejects.toThrow('Unsupported entity type');
  });
  
  it('should throw an error for unsupported field definition creation', async () => {
    await provider.initialize(mockConfig);
    await expect(provider.createFieldDefinition('PROJ1', {
      id: '',
      name: 'New Field',
      type: 'STRING',
      required: false
    })).rejects.toThrow('Creating custom fields is not supported');
  });
});