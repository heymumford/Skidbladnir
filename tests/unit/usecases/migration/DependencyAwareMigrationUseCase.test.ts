/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { 
  DependencyAwareMigrationUseCase,
  MigrateTestCasesInput
} from '../../../../pkg/usecases/migration/DependencyAwareMigrationUseCase';

import { 
  OperationDependencyResolver 
} from '../../../../pkg/interfaces/api/operations/OperationDependencyResolver';

import { 
  OperationExecutor 
} from '../../../../pkg/interfaces/api/operations/OperationExecutor';

import { 
  DependencyGraph 
} from '../../../../pkg/interfaces/api/operations/DependencyGraph';

import { 
  SourceProvider, 
  TargetProvider,
  ProviderApiContract 
} from '../../../../packages/common/src/interfaces/provider';

import { LoggerService } from '../../../../pkg/domain/services/LoggerService';

// Mock implementations
class MockOperationDependencyResolver {
  buildDependencyGraph = jest.fn().mockReturnValue(new DependencyGraph());
  resolveExecutionOrder = jest.fn().mockReturnValue(['authenticate', 'get_projects', 'get_test_cases', 'create_test_case']);
  validateDependencies = jest.fn().mockReturnValue({ valid: true, errors: [] });
  calculateMinimalOperationSet = jest.fn();
}

class MockOperationExecutor {
  executeOperations = jest.fn().mockResolvedValue([
    { 
      operationType: 'authenticate', 
      success: true, 
      data: true, 
      durationMs: 100, 
      timestamp: new Date() 
    },
    { 
      operationType: 'get_projects', 
      success: true, 
      data: [{ id: 'PRJ1', name: 'Project 1' }], 
      durationMs: 200, 
      timestamp: new Date() 
    },
    { 
      operationType: 'get_test_cases', 
      success: true, 
      data: [{ id: 'TC1', name: 'Test Case 1' }], 
      durationMs: 300, 
      timestamp: new Date() 
    },
    { 
      operationType: 'create_test_case', 
      success: true, 
      data: ['TGT-1'], 
      durationMs: 400, 
      timestamp: new Date() 
    }
  ]);
  executeWithResilience = jest.fn();
  executeOperation = jest.fn();
}

class MockSourceProvider implements SourceProvider {
  id = 'zephyr';
  name = 'Zephyr Scale';
  version = '1.0.0';
  capabilities = {
    canBeSource: true,
    canBeTarget: false,
    entityTypes: ['project', 'test_case'],
    supportsAttachments: true,
    supportsExecutionHistory: true,
    supportsTestSteps: true,
    supportsHierarchy: true,
    supportsCustomFields: true
  };
  
  initialize = jest.fn().mockResolvedValue(undefined);
  testConnection = jest.fn().mockResolvedValue({ connected: true });
  getMetadata = jest.fn().mockReturnValue({ systemName: 'Zephyr Scale', providerVersion: '1.0.0', capabilities: this.capabilities });
  getApiContract = jest.fn().mockResolvedValue({
    providerId: 'zephyr',
    operations: {
      'authenticate': {
        type: 'authenticate',
        dependencies: [],
        required: true,
        description: 'Authenticate with Zephyr API',
        requiredParams: ['apiKey', 'baseUrl']
      },
      'get_projects': {
        type: 'get_projects',
        dependencies: ['authenticate'],
        required: true,
        description: 'Get all projects from Zephyr',
        requiredParams: []
      },
      'get_project': {
        type: 'get_project',
        dependencies: ['authenticate', 'get_projects'],
        required: true,
        description: 'Get a specific project from Zephyr',
        requiredParams: ['projectId']
      },
      'get_test_cases': {
        type: 'get_test_cases',
        dependencies: ['authenticate', 'get_project'],
        required: true,
        description: 'Get test cases from a Zephyr project',
        requiredParams: ['projectId']
      },
      'get_test_case': {
        type: 'get_test_case',
        dependencies: ['authenticate'],
        required: true,
        description: 'Get a specific test case from Zephyr',
        requiredParams: ['testCaseId']
      }
    }
  });
  
  getProjects = jest.fn().mockResolvedValue([{ id: 'PRJ1', name: 'Project 1' }]);
  getFolders = jest.fn().mockResolvedValue([]);
  getTestCases = jest.fn().mockResolvedValue({ items: [{ id: 'TC1', name: 'Test Case 1' }], total: 1, page: 1, pageSize: 10 });
  getTestCase = jest.fn().mockResolvedValue({ id: 'TC1', name: 'Test Case 1' });
  getTestCycles = jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 10 });
  getTestExecutions = jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 10 });
  getAttachmentContent = jest.fn().mockResolvedValue({ id: 'ATT1', name: 'attachment.txt', content: Buffer.from('test') });
  getFieldDefinitions = jest.fn().mockResolvedValue([]);
}

class MockTargetProvider implements TargetProvider {
  id = 'qtest';
  name = 'QTest';
  version = '1.0.0';
  capabilities = {
    canBeSource: false,
    canBeTarget: true,
    entityTypes: ['project', 'test_case'],
    supportsAttachments: true,
    supportsExecutionHistory: true,
    supportsTestSteps: true,
    supportsHierarchy: true,
    supportsCustomFields: true
  };
  
  initialize = jest.fn().mockResolvedValue(undefined);
  testConnection = jest.fn().mockResolvedValue({ connected: true });
  getMetadata = jest.fn().mockReturnValue({ systemName: 'QTest', providerVersion: '1.0.0', capabilities: this.capabilities });
  getApiContract = jest.fn().mockResolvedValue({
    providerId: 'qtest',
    operations: {
      'authenticate': {
        type: 'authenticate',
        dependencies: [],
        required: true,
        description: 'Authenticate with QTest API',
        requiredParams: ['apiKey', 'baseUrl']
      },
      'get_projects': {
        type: 'get_projects',
        dependencies: ['authenticate'],
        required: true,
        description: 'Get all projects from QTest',
        requiredParams: []
      },
      'get_project': {
        type: 'get_project',
        dependencies: ['authenticate', 'get_projects'],
        required: true,
        description: 'Get a specific project from QTest',
        requiredParams: ['projectId']
      },
      'create_test_case': {
        type: 'create_test_case',
        dependencies: ['authenticate', 'get_project'],
        required: true,
        description: 'Create a test case in QTest',
        requiredParams: ['projectId', 'testCaseData']
      }
    }
  });
  
  getProjects = jest.fn().mockResolvedValue([{ id: 'TGT1', name: 'Target Project 1' }]);
  createFolder = jest.fn().mockResolvedValue('FOLDER1');
  createTestCase = jest.fn().mockResolvedValue('TGT-1');
  createTestSteps = jest.fn().mockResolvedValue(undefined);
  createTestCycle = jest.fn().mockResolvedValue('CYCLE1');
  createTestExecutions = jest.fn().mockResolvedValue(undefined);
  uploadAttachment = jest.fn().mockResolvedValue('ATT1');
  createFieldDefinition = jest.fn().mockResolvedValue('FIELD1');
}

class MockLoggerService implements LoggerService {
  debug = jest.fn();
  info = jest.fn();
  warn = jest.fn();
  error = jest.fn();
  trace = jest.fn();
  log = jest.fn();
  getLogger = jest.fn().mockReturnThis();
}

describe('DependencyAwareMigrationUseCase', () => {
  let useCase: DependencyAwareMigrationUseCase;
  let operationResolver: MockOperationDependencyResolver;
  let operationExecutor: MockOperationExecutor;
  let sourceProvider: MockSourceProvider;
  let targetProvider: MockTargetProvider;
  let loggerService: MockLoggerService;
  
  beforeEach(() => {
    operationResolver = new MockOperationDependencyResolver();
    operationExecutor = new MockOperationExecutor();
    sourceProvider = new MockSourceProvider();
    targetProvider = new MockTargetProvider();
    loggerService = new MockLoggerService();
    
    useCase = new DependencyAwareMigrationUseCase(
      operationResolver as unknown as OperationDependencyResolver,
      operationExecutor as unknown as OperationExecutor,
      sourceProvider as unknown as SourceProvider,
      targetProvider as unknown as TargetProvider,
      loggerService as unknown as LoggerService
    );
  });
  
  describe('execute', () => {
    it('should successfully migrate test cases using the dependency-aware approach', async () => {
      // Arrange
      const input: MigrateTestCasesInput = {
        sourceSystem: 'zephyr',
        targetSystem: 'qtest',
        sourceProjectId: 'PRJ1',
        targetProjectId: 'TGT1',
        includeAttachments: true
      };
      
      // Configure mock responses
      operationExecutor.executeOperations.mockImplementation((operations, context) => {
        // Set up the results that would normally be populated during execution
        context.results['create_test_case'] = ['TGT-1', 'TGT-2'];
        
        return Promise.resolve([
          { operationType: 'authenticate', success: true, data: true, durationMs: 100, timestamp: new Date() },
          { operationType: 'get_projects', success: true, data: [{ id: 'PRJ1' }], durationMs: 200, timestamp: new Date() },
          { operationType: 'get_test_cases', success: true, data: [{ id: 'TC1' }], durationMs: 300, timestamp: new Date() },
          { operationType: 'create_test_case', success: true, data: ['TGT-1', 'TGT-2'], durationMs: 400, timestamp: new Date() }
        ]);
      });
      
      // Act
      const result = await useCase.execute(input);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.migratedCount).toBe(2);
      expect(result.migratedIds).toEqual(['TGT-1', 'TGT-2']);
      expect(result.failedCount).toBe(0);
      
      // Verify function calls
      expect(sourceProvider.getApiContract).toHaveBeenCalled();
      expect(targetProvider.getApiContract).toHaveBeenCalled();
      expect(operationResolver.buildDependencyGraph).toHaveBeenCalled();
      expect(operationResolver.validateDependencies).toHaveBeenCalled();
      expect(operationResolver.resolveExecutionOrder).toHaveBeenCalled();
      expect(operationExecutor.executeOperations).toHaveBeenCalled();
    });
    
    it('should handle specific test case IDs', async () => {
      // Arrange
      const input: MigrateTestCasesInput = {
        sourceSystem: 'zephyr',
        targetSystem: 'qtest',
        sourceProjectId: 'PRJ1',
        targetProjectId: 'TGT1',
        testCaseIds: ['TC1', 'TC2'],
        includeAttachments: true
      };
      
      // Act
      const result = await useCase.execute(input);
      
      // Assert
      expect(result.success).toBe(true);
    });
    
    it('should handle dependency validation errors', async () => {
      // Arrange
      const input: MigrateTestCasesInput = {
        sourceSystem: 'zephyr',
        targetSystem: 'qtest',
        sourceProjectId: 'PRJ1',
        targetProjectId: 'TGT1'
      };
      
      // Mock validation failure
      operationResolver.validateDependencies.mockReturnValue({
        valid: false,
        errors: [{ type: 'circular_dependency', message: 'Circular dependency detected' }]
      });
      
      // Act
      const result = await useCase.execute(input);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.error).toContain('Invalid dependency graph');
    });
    
    it('should handle circular dependencies', async () => {
      // Arrange
      const input: MigrateTestCasesInput = {
        sourceSystem: 'zephyr',
        targetSystem: 'qtest',
        sourceProjectId: 'PRJ1',
        targetProjectId: 'TGT1'
      };
      
      // Mock circular dependencies
      operationResolver.resolveExecutionOrder.mockReturnValue([]);
      
      // Act
      const result = await useCase.execute(input);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.error).toContain('circular dependencies');
    });
    
    it('should handle operation failures', async () => {
      // Arrange
      const input: MigrateTestCasesInput = {
        sourceSystem: 'zephyr',
        targetSystem: 'qtest',
        sourceProjectId: 'PRJ1',
        targetProjectId: 'TGT1'
      };
      
      // Mock operation failure
      operationExecutor.executeOperations.mockResolvedValue([
        { operationType: 'authenticate', success: true, data: true, durationMs: 100, timestamp: new Date() },
        { operationType: 'get_projects', success: false, error: new Error('API error'), durationMs: 200, timestamp: new Date() }
      ]);
      
      // Act
      const result = await useCase.execute(input);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(500);
      expect(result.error).toContain('Operation failed: get_projects');
    });
    
    it('should handle unexpected errors', async () => {
      // Arrange
      const input: MigrateTestCasesInput = {
        sourceSystem: 'zephyr',
        targetSystem: 'qtest',
        sourceProjectId: 'PRJ1',
        targetProjectId: 'TGT1'
      };
      
      // Mock unexpected error
      sourceProvider.getApiContract.mockRejectedValue(new Error('Unexpected error'));
      
      // Act
      const result = await useCase.execute(input);
      
      // Assert
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(500);
      expect(result.error).toBe('Unexpected error');
    });
  });
});