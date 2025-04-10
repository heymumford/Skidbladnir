/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { 
  MigrateTestCasesUseCase, 
  MigrateTestCasesInput, 
  MigrateTestCasesResult,
  MigrationStatus
} from './MigrateTestCases';

import { OperationDependencyResolver } from '../../interfaces/api/operations/OperationDependencyResolver';
import { OperationExecutor } from '../../interfaces/api/operations/OperationExecutor';

import { 
  SourceProvider, 
  TargetProvider
} from '../../../packages/common/src/interfaces/provider';

import { LoggerService } from '../../domain/services/LoggerService';
import { 
  Operation,
  OperationContext,
  MigrationOperationPlan,
  OperationType
} from '../../interfaces/api/operations/types';

/**
 * Enhanced migration use case with dependency-aware operation execution
 */
export class DependencyAwareMigrationUseCase extends MigrateTestCasesUseCase {
  constructor(
    private readonly operationResolver: OperationDependencyResolver,
    private readonly operationExecutor: OperationExecutor,
    private readonly sourceProvider: SourceProvider,
    private readonly targetProvider: TargetProvider,
    private readonly loggerService?: LoggerService
  ) {
    super();
  }
  
  /**
   * Execute a migration with dependency-aware operations
   */
  async execute(input: MigrateTestCasesInput): Promise<MigrateTestCasesResult> {
    // First, prepare the standard migration result structure
    const migrationId = this.generateMigrationId();
    const startTime = Date.now();
    const startedAt = new Date();
    
    // Initialize result
    const result: MigrateTestCasesResult = {
      migrationId,
      sourceSystem: input.sourceSystem,
      targetSystem: input.targetSystem,
      projectKey: input.projectKey,
      migratedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      totalCount: 0,
      startedAt,
      completedAt: new Date(),
      durationMs: 0,
      details: {
        migrated: [],
        skipped: [],
        failed: []
      },
      dryRun: input.options.dryRun || false,
      warnings: [],
      status: MigrationStatus.PENDING,
      progress: 0,
      errors: [],
      summary: {
        byStatus: {},
        byPriority: {},
        transformationStats: {
          applied: 0,
          skipped: 0,
          failed: 0
        },
        attachmentStats: {
          total: 0,
          migrated: 0,
          failed: 0
        },
        historyStats: {
          total: 0,
          migrated: 0,
          failed: 0
        }
      }
    };
    
    // Notify listeners that migration has started
    this.notifyListeners('started', { migrationId, input });
    
    try {
      // Get API contracts
      const sourceContract = await this.sourceProvider.getApiContract();
      const targetContract = await this.targetProvider.getApiContract();
      
      // Update status to running
      result.status = MigrationStatus.RUNNING;
      this.notifyListeners('statusChanged', { status: MigrationStatus.RUNNING });
      
      // Build operation plan
      const migrationPlan = this.buildMigrationPlan(
        sourceContract,
        targetContract,
        input
      );
      
      // Resolve dependencies
      const graph = this.operationResolver.buildDependencyGraph(migrationPlan.operations);
      
      // Validate the graph
      const validation = this.operationResolver.validateDependencies(graph);
      if (!validation.valid) {
        this.loggerService?.error('Invalid dependency graph', validation.errors);
        
        result.status = MigrationStatus.FAILED;
        result.completedAt = new Date();
        result.durationMs = Date.now() - startTime;
        result.errors.push({
          message: `Invalid dependency graph: ${JSON.stringify(validation.errors)}`,
          timestamp: new Date(),
          source: 'processor'
        });
        
        this.notifyListeners('failed', {
          error: new Error(`Invalid dependency graph: ${JSON.stringify(validation.errors)}`),
          result
        });
        
        return result;
      }
      
      // Determine execution order
      const executionOrder = this.operationResolver.resolveExecutionOrder(graph);
      if (executionOrder.length === 0) {
        this.loggerService?.error('Could not resolve execution order (circular dependencies)');
        
        result.status = MigrationStatus.FAILED;
        result.completedAt = new Date();
        result.durationMs = Date.now() - startTime;
        result.errors.push({
          message: 'Could not resolve execution order (circular dependencies detected)',
          timestamp: new Date(),
          source: 'processor'
        });
        
        this.notifyListeners('failed', {
          error: new Error('Could not resolve execution order (circular dependencies detected)'),
          result
        });
        
        return result;
      }
      
      // Create operation context
      const context = this.createOperationContext(input);
      
      // Execute operations in order
      const orderedOperations = executionOrder.map(type => 
        migrationPlan.operationsMap[String(type)]
      ).filter(op => op !== undefined); // Filter out undefined operations
      
      this.loggerService?.debug(`Executing operations in order: ${executionOrder.join(', ')}`);
      const opResults = await this.operationExecutor.executeOperations(
        orderedOperations,
        context
      );
      
      // Check for failures
      const failedResults = opResults.filter(r => !r.success);
      if (failedResults.length > 0) {
        const firstFailure = failedResults[0];
        this.loggerService?.error(`Operation failed: ${firstFailure.operationType}`, firstFailure.error);
        
        result.status = MigrationStatus.FAILED;
        result.completedAt = new Date();
        result.durationMs = Date.now() - startTime;
        result.errors.push({
          message: `Operation failed: ${firstFailure.operationType} - ${firstFailure.error?.message}`,
          stack: firstFailure.error?.stack,
          timestamp: new Date(),
          source: 'processor'
        });
        
        this.notifyListeners('failed', {
          error: firstFailure.error || new Error(`Operation failed: ${firstFailure.operationType}`),
          result
        });
        
        return result;
      }
      
      // Find the create test case operation results
      const createTestCaseResult = opResults.find(r => 
        String(r.operationType).includes('create_test_case')
      );
      
      // Update migration stats and results
      if (createTestCaseResult && createTestCaseResult.data) {
        // We expect either an array of created IDs or objects with ids
        let createdIds: string[] = [];
        
        if (Array.isArray(createTestCaseResult.data)) {
          if (typeof createTestCaseResult.data[0] === 'string') {
            createdIds = createTestCaseResult.data;
          } else {
            createdIds = createTestCaseResult.data.map((item: any) => item.id || item);
          }
        } else if (typeof createTestCaseResult.data === 'string') {
          createdIds = [createTestCaseResult.data];
        } else if (createTestCaseResult.data && createTestCaseResult.data.id) {
          createdIds = [createTestCaseResult.data.id];
        }
        
        result.migratedCount = createdIds.length;
        
        // Add details for each migrated test case
        for (const id of createdIds) {
          result.details.migrated.push({
            sourceId: 'unknown', // We don't have a direct mapping here
            targetId: id,
            name: id, // We don't have the actual name here
            status: 'MIGRATED',
            startTime: startedAt,
            endTime: new Date(),
            durationMs: Date.now() - startTime
          });
        }
      }
      
      // Update final status
      result.status = result.failedCount > 0 ? MigrationStatus.PARTIALLY_COMPLETED : MigrationStatus.COMPLETED;
      result.completedAt = new Date();
      result.durationMs = Date.now() - startTime;
      result.progress = 100;
      
      this.notifyListeners('completed', { result });
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.loggerService?.error(`Migration failed: ${errorMessage}`);
      
      // Update result with failure information
      result.status = MigrationStatus.FAILED;
      result.durationMs = Date.now() - startTime;
      result.completedAt = new Date();
      result.errors.push({
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date(),
        source: 'processor'
      });
      
      this.notifyListeners('failed', { 
        error: error instanceof Error ? error : new Error(errorMessage),
        result
      });
      
      return result;
    }
  }
  
  /**
   * Builds a migration plan from source and target API contracts
   */
  private buildMigrationPlan(
    sourceContract: any,
    targetContract: any,
    input: MigrateTestCasesInput
  ): MigrationOperationPlan {
    const operations: any[] = [];
    const operationsMap: Record<string, Operation> = {};
    
    // Source operations
    this.addOperationToMap(
      sourceContract.operations['authenticate'],
      this.authenticateSourceOperation.bind(this),
      operations,
      operationsMap
    );
    
    this.addOperationToMap(
      sourceContract.operations['get_projects'], 
      this.getSourceProjectsOperation.bind(this),
      operations,
      operationsMap
    );
    
    this.addOperationToMap(
      sourceContract.operations['get_project'],
      this.getSourceProjectOperation.bind(this, input.projectKey),
      operations,
      operationsMap
    );
    
    if (input.options.filters?.ids && input.options.filters.ids.length > 0) {
      // Add individual test case operations
      for (const testCaseId of input.options.filters.ids) {
        this.addOperationToMap(
          { 
            ...sourceContract.operations['get_test_case'],
            type: `get_test_case_${testCaseId}`,
            requiredParams: ['testCaseId']
          },
          this.getSourceTestCaseOperation.bind(this, testCaseId),
          operations,
          operationsMap
        );
        
        if (input.options.includeAttachments) {
          this.addOperationToMap(
            {
              ...sourceContract.operations['get_attachments'],
              type: `get_attachments_${testCaseId}`,
              dependencies: [`get_test_case_${testCaseId}`],
              requiredParams: ['testCaseId']
            },
            this.getSourceAttachmentsOperation.bind(this, testCaseId),
            operations,
            operationsMap
          );
        }
      }
    } else {
      // Get all test cases
      this.addOperationToMap(
        sourceContract.operations['get_test_cases'],
        this.getSourceTestCasesOperation.bind(this, input.projectKey),
        operations,
        operationsMap
      );
    }
    
    // Target operations
    this.addOperationToMap(
      targetContract.operations['authenticate'],
      this.authenticateTargetOperation.bind(this),
      operations,
      operationsMap
    );
    
    this.addOperationToMap(
      targetContract.operations['get_projects'],
      this.getTargetProjectsOperation.bind(this),
      operations,
      operationsMap
    );
    
    this.addOperationToMap(
      targetContract.operations['get_project'],
      this.getTargetProjectOperation.bind(this, input.projectKey),
      operations,
      operationsMap
    );
    
    // Add special operation for creating test cases
    if (input.options.filters?.ids && input.options.filters.ids.length > 0) {
      const dependencies = input.options.filters.ids.map(id => `get_test_case_${id}`);
      
      this.addOperationToMap(
        {
          ...targetContract.operations['create_test_case'],
          dependencies: [
            'authenticate',
            'get_project',
            ...dependencies
          ],
          type: 'create_test_case',
          requiredParams: ['projectKey']
        },
        this.createTargetTestCasesOperation.bind(this, input.projectKey),
        operations,
        operationsMap
      );
    } else {
      this.addOperationToMap(
        {
          ...targetContract.operations['create_test_case'],
          dependencies: [
            'authenticate',
            'get_project',
            'get_test_cases'
          ],
          type: 'create_test_case',
          requiredParams: ['projectKey']
        },
        this.createTargetTestCasesOperation.bind(this, input.projectKey),
        operations,
        operationsMap
      );
    }
    
    return { operations, operationsMap };
  }
  
  /**
   * Helper to add an operation to the plan
   */
  private addOperationToMap(
    definition: any,
    execute: (context: OperationContext) => Promise<any>,
    operations: any[],
    operationsMap: Record<string, Operation>
  ): void {
    if (!definition) {
      return; // Skip if definition is undefined
    }
    
    operations.push(definition);
    operationsMap[definition.type] = {
      definition,
      execute
    };
  }
  
  /**
   * Create the operation context
   */
  private createOperationContext(input: MigrateTestCasesInput): OperationContext {
    return {
      input: {
        sourceSystem: input.sourceSystem,
        targetSystem: input.targetSystem,
        projectKey: input.projectKey,
        testCaseIds: input.options.filters?.ids || [],
        includeAttachments: input.options.includeAttachments || false,
        includeHistory: input.options.includeHistory || false,
        ...input.options
      },
      results: {},
      sourceProvider: this.sourceProvider,
      targetProvider: this.targetProvider,
      metadata: {
        startTime: new Date(),
        migrationId: this.generateMigrationId()
      }
    };
  }
  
  // Operation implementations
  
  /**
   * Authenticate with source provider
   */
  private async authenticateSourceOperation(context: OperationContext): Promise<boolean> {
    this.loggerService?.debug('Authenticating with source provider');
    const status = await this.sourceProvider.testConnection();
    return status.connected;
  }
  
  /**
   * Authenticate with target provider
   */
  private async authenticateTargetOperation(context: OperationContext): Promise<boolean> {
    this.loggerService?.debug('Authenticating with target provider');
    const status = await this.targetProvider.testConnection();
    return status.connected;
  }
  
  /**
   * Get projects from source provider
   */
  private async getSourceProjectsOperation(context: OperationContext): Promise<any[]> {
    this.loggerService?.debug('Getting projects from source provider');
    return await this.sourceProvider.getProjects();
  }
  
  /**
   * Get projects from target provider
   */
  private async getTargetProjectsOperation(context: OperationContext): Promise<any[]> {
    this.loggerService?.debug('Getting projects from target provider');
    return await this.targetProvider.getProjects();
  }
  
  /**
   * Get specific project from source provider
   */
  private async getSourceProjectOperation(
    projectKey: string, 
    context: OperationContext
  ): Promise<any> {
    this.loggerService?.debug(`Getting project ${projectKey} from source provider`);
    const projects = context.results['get_projects'] || [];
    return projects.find((p: any) => p.id === projectKey || p.key === projectKey);
  }
  
  /**
   * Get specific project from target provider
   */
  private async getTargetProjectOperation(
    projectKey: string, 
    context: OperationContext
  ): Promise<any> {
    this.loggerService?.debug(`Getting project ${projectKey} from target provider`);
    const projects = context.results['get_projects'] || [];
    return projects.find((p: any) => p.id === projectKey || p.key === projectKey);
  }
  
  /**
   * Get all test cases from source provider
   */
  private async getSourceTestCasesOperation(
    projectKey: string, 
    context: OperationContext
  ): Promise<any[]> {
    this.loggerService?.debug(`Getting all test cases from project ${projectKey}`);
    const result = await this.sourceProvider.getTestCases(projectKey);
    return result.items || result;
  }
  
  /**
   * Get specific test case from source provider
   */
  private async getSourceTestCaseOperation(
    testCaseId: string, 
    context: OperationContext
  ): Promise<any> {
    this.loggerService?.debug(`Getting test case ${testCaseId}`);
    return await this.sourceProvider.getTestCase(
      context.input.projectKey,
      testCaseId
    );
  }
  
  /**
   * Get attachments for a test case
   */
  private async getSourceAttachmentsOperation(
    testCaseId: string, 
    context: OperationContext
  ): Promise<any[]> {
    this.loggerService?.debug(`Getting attachments for test case ${testCaseId}`);
    const testCase = context.results[`get_test_case_${testCaseId}`];
    if (!testCase || !testCase.attachments || testCase.attachments.length === 0) {
      return [];
    }
    
    const attachments = [];
    for (const attachment of testCase.attachments) {
      const content = await this.sourceProvider.getAttachmentContent(
        context.input.projectKey,
        attachment.id
      );
      attachments.push(content);
    }
    
    return attachments;
  }
  
  /**
   * Create test cases in target provider
   */
  private async createTargetTestCasesOperation(
    projectKey: string, 
    context: OperationContext
  ): Promise<string[]> {
    const createdIds: string[] = [];
    
    if (context.input.testCaseIds && context.input.testCaseIds.length > 0) {
      // Process specific test cases
      for (const testCaseId of context.input.testCaseIds) {
        const testCase = context.results[`get_test_case_${testCaseId}`];
        if (!testCase) {
          this.loggerService?.warn(`Test case ${testCaseId} not found in results`);
          continue;
        }
        
        this.loggerService?.debug(`Creating test case ${testCase.name} in target project ${projectKey}`);
        const result = await this.targetProvider.createTestCase(projectKey, testCase);
        const id = typeof result === 'string' ? result : result.id;
        createdIds.push(id);
        
        // Upload attachments if needed
        if (context.input.includeAttachments) {
          const attachments = context.results[`get_attachments_${testCaseId}`] || [];
          for (const attachment of attachments) {
            await this.targetProvider.uploadAttachment(
              projectKey,
              'test_case',
              id,
              attachment
            );
          }
        }
      }
    } else {
      // Process all test cases
      const testCases = context.results['get_test_cases'] || [];
      for (const testCase of testCases) {
        this.loggerService?.debug(`Creating test case ${testCase.name || testCase.title} in target project ${projectKey}`);
        const result = await this.targetProvider.createTestCase(projectKey, testCase);
        const id = typeof result === 'string' ? result : result.id;
        createdIds.push(id);
      }
    }
    
    return createdIds;
  }
}