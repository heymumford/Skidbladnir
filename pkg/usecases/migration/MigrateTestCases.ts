import { TestCase } from '../../domain/entities/TestCase';
import { EntityNotFoundError, MigrationError as DomainMigrationError } from '../../domain/errors/DomainErrors';
import { LoggerService } from '../../domain/services/LoggerService';
import { Identifier } from '../../domain/value-objects/Identifier';

/**
 * Input data for migrating test cases from one system to another
 */
export interface MigrateTestCasesInput {
  sourceSystem: string;
  targetSystem: string;
  projectKey: string;
  options: {
    includeAttachments: boolean;
    includeHistory: boolean;
    preserveIds: boolean;
    dryRun: boolean;
    fieldMappings?: Record<string, string>;
    fieldTransformations?: FieldTransformation[];
    filters?: TestCaseFilter;
    batchSize?: number;
    continueOnError?: boolean;
    maxRetries?: number;
    retryDelayMs?: number;
    timeout?: number;
    transactionMode?: 'atomic' | 'independent';
    validationLevel?: 'strict' | 'lenient' | 'none';
  };
}

/**
 * Transformation to apply to a field value
 */
export interface FieldTransformation {
  sourceField: string;
  targetField: string;
  transformations: Transformation[];
}

/**
 * Types of transformations that can be applied to field values
 */
export type Transformation = 
  | { type: 'concatenate'; value: string; position: 'prefix' | 'suffix' }
  | { type: 'replace'; search: string; replace: string; replaceAll?: boolean }
  | { type: 'slice'; start: number; end?: number }
  | { type: 'map'; values: Record<string, string>; defaultValue?: string }
  | { type: 'truncate'; maxLength: number; addEllipsis?: boolean }
  | { type: 'uppercase' | 'lowercase' | 'capitalize' };

/**
 * Filters to apply when fetching test cases
 */
export interface TestCaseFilter {
  ids?: string[];
  statuses?: string[];
  priorities?: string[];
  folders?: string[];
  tags?: string[];
  modifiedSince?: Date;
  createdBy?: string;
}

/**
 * Result of the migration operation
 */
export interface MigrateTestCasesResult {
  migrationId: string;
  sourceSystem: string;
  targetSystem: string;
  projectKey: string;
  migratedCount: number;
  skippedCount: number;
  failedCount: number;
  totalCount: number;
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
  details: {
    migrated: TestCaseMigrationDetail[];
    skipped: TestCaseMigrationDetail[];
    failed: TestCaseMigrationDetail[];
  };
  dryRun: boolean;
  warnings: string[];
  status: MigrationStatus;
  progress: number; // 0-100%
  errors: MigrationError[];
  summary: {
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    transformationStats: {
      applied: number;
      skipped: number;
      failed: number;
    };
    attachmentStats: {
      total: number;
      migrated: number;
      failed: number;
    };
    historyStats: {
      total: number;
      migrated: number;
      failed: number;
    };
  };
  validationUrl?: string;
}

/**
 * Details about a migrated test case
 */
export interface TestCaseMigrationDetail {
  sourceId: string;
  targetId?: string;
  name: string;
  status: 'MIGRATED' | 'SKIPPED' | 'FAILED' | 'IN_PROGRESS' | 'PENDING' | 'RETRYING';
  error?: string;
  warnings?: string[];
  metadata?: Record<string, any>;
  startTime: Date;
  endTime?: Date;
  durationMs?: number;
  retryCount?: number;
  transformationsApplied?: string[];
  validationResult?: {
    valid: boolean;
    errors: string[];
  };
  attachments?: {
    total: number;
    migrated: number;
    failed: number;
  };
  history?: {
    total: number;
    migrated: number;
    failed: number;
  };
  url?: string;
}

/**
 * Status of a migration operation
 */
export enum MigrationStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
  PARTIALLY_COMPLETED = 'PARTIALLY_COMPLETED',
  VALIDATING = 'VALIDATING',
  ROLLBACK_IN_PROGRESS = 'ROLLBACK_IN_PROGRESS',
  ROLLBACK_COMPLETED = 'ROLLBACK_COMPLETED',
  ROLLBACK_FAILED = 'ROLLBACK_FAILED'
}

/**
 * Use case for migrating test cases between different test management systems
 */
export class MigrateTestCasesUseCase {
  private logger: LoggerService;

  private migrationListeners: MigrationEventListener[] = [];
  private abortController = new AbortController();
  private isPaused = false;

  constructor(
    private readonly sourceProviderFactory: ProviderFactory,
    private readonly targetProviderFactory: ProviderFactory,
    loggerService?: LoggerService,
    private readonly testCaseRepositoryFactory?: TestCaseRepositoryFactory
  ) {
    this.logger = loggerService || {
      debug: console.debug,
      info: console.info,
      warn: console.warn,
      error: console.error,
      child: () => ({ 
        debug: console.debug, 
        info: console.info, 
        warn: console.warn, 
        error: console.error,
        child: () => this.logger
      })
    };
  }
  
  /**
   * Register an event listener for migration events
   */
  public addEventListener(listener: MigrationEventListener): void {
    this.migrationListeners.push(listener);
  }
  
  /**
   * Remove an event listener
   */
  public removeEventListener(listener: MigrationEventListener): void {
    const index = this.migrationListeners.indexOf(listener);
    if (index !== -1) {
      this.migrationListeners.splice(index, 1);
    }
  }
  
  /**
   * Pause the migration process
   */
  public pauseMigration(): void {
    this.isPaused = true;
    this.notifyListeners('paused', null);
  }
  
  /**
   * Resume the migration process
   */
  public resumeMigration(): void {
    this.isPaused = false;
    this.notifyListeners('resumed', null);
  }
  
  /**
   * Cancel the migration process
   */
  public cancelMigration(): void {
    this.abortController.abort();
    this.notifyListeners('cancelled', null);
  }

  /**
   * Execute the migration use case
   */
  async execute(input: MigrateTestCasesInput): Promise<MigrateTestCasesResult> {
    this.logger.info(`Starting migration from ${input.sourceSystem} to ${input.targetSystem}`);
    const startTime = Date.now();
    const startedAt = new Date();
    
    // Reset abort controller for this migration
    this.abortController = new AbortController();
    this.isPaused = false;
    
    // Generate a unique migration ID
    const migrationId = this.generateMigrationId();
    
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
      dryRun: input.options.dryRun,
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
      // Validate input
      this.validateInput(input);
      
      // Create provider instances for source and target systems
      const sourceProvider = this.sourceProviderFactory.createProvider(input.sourceSystem);
      const targetProvider = this.targetProviderFactory.createProvider(input.targetSystem);
      
      if (!sourceProvider) {
        throw new EntityNotFoundError('Provider', input.sourceSystem);
      }
      
      if (!targetProvider) {
        throw new EntityNotFoundError('Provider', input.targetSystem);
      }

      // Validate connection to providers
      await this.validateProviderConnections(sourceProvider, targetProvider);

      // Validate provider capabilities
      await this.validateProviderCapabilities(sourceProvider, targetProvider, input);

      // Update status to running
      result.status = MigrationStatus.RUNNING;
      this.notifyListeners('statusChanged', { status: MigrationStatus.RUNNING });

      // Fetch test cases from source system
      this.logger.info(`Fetching test cases from ${input.sourceSystem}`);
      const sourceTestCases = await this.fetchTestCases(sourceProvider, input);
      
      // Update total count
      result.totalCount = sourceTestCases.length;
      this.notifyListeners('testCasesLoaded', { count: sourceTestCases.length });

      // If this is a dry run, just return counts and simulated data
      if (input.options.dryRun) {
        return await this.processDryRun(sourceTestCases, input, result, startTime);
      }

      // Start transaction if supported and requested
      let transactionId: string | null = null;
      if (input.options.transactionMode === 'atomic' && targetProvider.beginTransaction) {
        try {
          transactionId = await targetProvider.beginTransaction();
          this.logger.info(`Started transaction ${transactionId}`);
        } catch (error) {
          this.logger.warn(`Failed to start transaction: ${error instanceof Error ? error.message : String(error)}`);
          result.warnings.push('Transaction mode requested but not supported by the target provider');
        }
      }

      try {
        // Process test cases in batches if specified
        const batchSize = input.options.batchSize || sourceTestCases.length;
        const batches = this.createBatches(sourceTestCases, batchSize);
        
        // Process each batch
        for (let i = 0; i < batches.length; i++) {
          if (this.abortController.signal.aborted) {
            throw new DomainMigrationError('Migration was cancelled');
          }
          
          // Handle pausing
          if (this.isPaused) {
            this.logger.info('Migration paused, waiting to resume...');
            result.status = MigrationStatus.PAUSED;
            this.notifyListeners('statusChanged', { status: MigrationStatus.PAUSED });
            
            // Wait for resume
            await this.waitForResume();
            
            result.status = MigrationStatus.RUNNING;
            this.notifyListeners('statusChanged', { status: MigrationStatus.RUNNING });
            this.logger.info('Migration resumed');
          }
          
          this.logger.info(`Processing batch ${i + 1} of ${batches.length}`);
          const batch = batches[i];
          
          // Process each test case in the batch
          for (const testCase of batch) {
            if (this.abortController.signal.aborted) {
              throw new DomainMigrationError('Migration was cancelled');
            }
            
            // Process the test case
            await this.processTestCase(
              testCase,
              input,
              sourceProvider,
              targetProvider,
              result
            );
            
            // Update progress
            result.progress = Math.round(((result.migratedCount + result.skippedCount + result.failedCount) / result.totalCount) * 100);
            this.notifyListeners('progressUpdated', { progress: result.progress });
          }
        }

        // Commit transaction if used
        if (transactionId && targetProvider.commitTransaction) {
          await targetProvider.commitTransaction(transactionId);
          this.logger.info(`Committed transaction ${transactionId}`);
        }

        // Update status to completed
        result.status = result.failedCount > 0 ? MigrationStatus.PARTIALLY_COMPLETED : MigrationStatus.COMPLETED;
        
        // Generate validation URL if possible
        if (targetProvider.getProviderInfo) {
          const info = await targetProvider.getProviderInfo();
          result.validationUrl = `${info.baseUrl}/projects/${input.projectKey}`;
        }
      } catch (error) {
        // Rollback transaction if used
        if (transactionId && targetProvider.rollbackTransaction) {
          try {
            result.status = MigrationStatus.ROLLBACK_IN_PROGRESS;
            this.notifyListeners('statusChanged', { status: MigrationStatus.ROLLBACK_IN_PROGRESS });
            
            await targetProvider.rollbackTransaction(transactionId);
            this.logger.info(`Rolled back transaction ${transactionId}`);
            
            result.status = MigrationStatus.ROLLBACK_COMPLETED;
            this.notifyListeners('statusChanged', { status: MigrationStatus.ROLLBACK_COMPLETED });
          } catch (rollbackError) {
            this.logger.error(`Failed to rollback transaction: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`);
            result.status = MigrationStatus.ROLLBACK_FAILED;
            this.notifyListeners('statusChanged', { status: MigrationStatus.ROLLBACK_FAILED });
          }
        }
        
        // Re-throw the original error
        throw error;
      }

      // Complete the migration
      result.durationMs = Date.now() - startTime;
      result.completedAt = new Date();
      
      this.logger.info(`Migration completed: ${result.migratedCount} migrated, ${result.failedCount} failed, ${result.skippedCount} skipped`);
      this.notifyListeners('completed', { result });
      
      return result;
    } catch (error) {
      this.logger.error(`Migration failed: ${error instanceof Error ? error.message : String(error)}`);
      
      // Update result with failure information
      result.status = MigrationStatus.FAILED;
      result.durationMs = Date.now() - startTime;
      result.completedAt = new Date();
      result.errors.push({
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date()
      });
      
      this.notifyListeners('failed', { 
        error: error instanceof Error ? error : new Error(String(error)),
        result
      });
      
      throw new DomainMigrationError(`Migration failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate input parameters
   */
  private validateInput(input: MigrateTestCasesInput): void {
    if (!input.sourceSystem) {
      throw new Error('Source system is required');
    }
    
    if (!input.targetSystem) {
      throw new Error('Target system is required');
    }
    
    if (!input.projectKey) {
      throw new Error('Project key is required');
    }
    
    if (input.sourceSystem === input.targetSystem) {
      throw new Error('Source and target systems cannot be the same');
    }
    
    if (input.options.batchSize && input.options.batchSize <= 0) {
      throw new Error('Batch size must be greater than 0');
    }
  }

  /**
   * Validate provider capabilities for the migration
   */
  /**
   * Validate provider connections
   */
  private async validateProviderConnections(
    sourceProvider: TestManagementProvider,
    targetProvider: TestManagementProvider
  ): Promise<void> {
    // Check if providers support connection validation
    if (sourceProvider.validateConnection) {
      const isSourceValid = await sourceProvider.validateConnection();
      if (!isSourceValid) {
        throw new Error(`Cannot connect to source provider`);
      }
      this.logger.info('Source provider connection validated');
    }
    
    if (targetProvider.validateConnection) {
      const isTargetValid = await targetProvider.validateConnection();
      if (!isTargetValid) {
        throw new Error(`Cannot connect to target provider`);
      }
      this.logger.info('Target provider connection validated');
    }
  }

  /**
   * Validate provider capabilities against migration requirements
   */
  private async validateProviderCapabilities(
    sourceProvider: TestManagementProvider,
    targetProvider: TestManagementProvider,
    input: MigrateTestCasesInput
  ): Promise<void> {
    // Check if capabilities API is available
    if (sourceProvider.getCapabilities && targetProvider.getCapabilities) {
      const sourceCapabilities = await sourceProvider.getCapabilities();
      const targetCapabilities = await targetProvider.getCapabilities();
      
      // Check attachment capabilities
      if (input.options.includeAttachments) {
        if (!sourceCapabilities.features.attachments) {
          throw new Error(`Source provider ${input.sourceSystem} does not support attachments`);
        }
        
        if (!targetCapabilities.features.attachments) {
          throw new Error(`Target provider ${input.targetSystem} does not support attachments`);
        }
        
        // Check attachment formats compatibility
        const supportedFormats = targetCapabilities.formats.supportedAttachmentTypes;
        if (supportedFormats.length > 0) {
          this.logger.info(`Target provider supports these attachment formats: ${supportedFormats.join(', ')}`);
        }
      }
      
      // Check history capabilities
      if (input.options.includeHistory) {
        if (!sourceCapabilities.features.history) {
          throw new Error(`Source provider ${input.sourceSystem} does not support history`);
        }
        
        if (!targetCapabilities.features.history) {
          throw new Error(`Target provider ${input.targetSystem} does not support history`);
        }
      }
      
      // Check ID preservation capability
      if (input.options.preserveIds && !targetCapabilities.features.idPreservation) {
        throw new Error(`Target provider ${input.targetSystem} does not support ID preservation`);
      }
      
      // Check transaction support
      if (input.options.transactionMode === 'atomic' && !targetCapabilities.features.transactions) {
        this.logger.warn(`Target provider ${input.targetSystem} does not support transactions, continuing without transaction support`);
        input.options.transactionMode = 'independent';
      }
      
      return;
    }
    
    // Fallback to manual capability checking if the API isn't available
    
    // Check if attachments are supported when required
    if (input.options.includeAttachments) {
      const sourceSupportsAttachments = 'getTestCaseAttachments' in sourceProvider;
      const targetSupportsAttachments = 'addTestCaseAttachment' in targetProvider;
      
      if (!sourceSupportsAttachments) {
        throw new Error(`Source provider ${input.sourceSystem} does not support attachments`);
      }
      
      if (!targetSupportsAttachments) {
        throw new Error(`Target provider ${input.targetSystem} does not support attachments`);
      }
    }
    
    // Check if history is supported when required
    if (input.options.includeHistory) {
      const sourceSupportsHistory = 'getTestCaseHistory' in sourceProvider;
      const targetSupportsHistory = 'addTestCaseHistory' in targetProvider;
      
      if (!sourceSupportsHistory) {
        throw new Error(`Source provider ${input.sourceSystem} does not support history`);
      }
      
      if (!targetSupportsHistory) {
        throw new Error(`Target provider ${input.targetSystem} does not support history`);
      }
    }
    
    // Check ID preservation
    if (input.options.preserveIds && !('createTestCaseWithId' in targetProvider)) {
      this.logger.warn(`Target provider ${input.targetSystem} does not have explicit ID preservation support, IDs may not be preserved`);
    }
  }

  /**
   * Generate a unique migration ID
   */
  protected generateMigrationId(): string {
    return `migration-${Date.now()}-${Identifier.createRandom().toString().substring(0, 8)}`;
  }
  
  /**
   * Notify all listeners of an event
   */
  protected notifyListeners(event: MigrationEventType, data: MigrationEventData): void {
    for (const listener of this.migrationListeners) {
      try {
        listener(event, data);
      } catch (error) {
        this.logger.error(`Error in migration event listener: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  
  /**
   * Wait for migration to be resumed
   */
  private async waitForResume(): Promise<void> {
    return new Promise<void>(resolve => {
      const checkInterval = setInterval(() => {
        if (!this.isPaused) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 500);
    });
  }
  
  /**
   * Process a dry run migration
   */
  private async processDryRun(
    sourceTestCases: TestCase[],
    input: MigrateTestCasesInput,
    result: MigrateTestCasesResult,
    startTime: number
  ): Promise<MigrateTestCasesResult> {
    this.logger.info(`Performing dry run migration for ${sourceTestCases.length} test cases`);
    
    // Count test cases by status and priority for summary
    sourceTestCases.forEach(tc => {
      // Count by status
      if (!result.summary.byStatus[tc.status]) {
        result.summary.byStatus[tc.status] = 0;
      }
      result.summary.byStatus[tc.status]++;
      
      // Count by priority
      if (!result.summary.byPriority[tc.priority]) {
        result.summary.byPriority[tc.priority] = 0;
      }
      result.summary.byPriority[tc.priority]++;
    });
    
    // Simulate successful migration
    result.migratedCount = sourceTestCases.length;
    const now = new Date();
    
    result.details.migrated = sourceTestCases.map(tc => ({
      sourceId: tc.id,
      targetId: input.options.preserveIds ? tc.id : `new-${tc.id}`,
      name: tc.title,
      status: 'MIGRATED',
      startTime: now,
      endTime: now,
      durationMs: 0,
      metadata: {
        priority: tc.priority,
        status: tc.status
      }
    }));
    
    // Add dry run warning
    result.warnings.push('This was a dry run. No actual data was migrated.');
    
    // Set duration and status
    result.durationMs = Date.now() - startTime;
    result.completedAt = new Date();
    result.status = MigrationStatus.COMPLETED;
    
    this.notifyListeners('completed', { result });
    
    return result;
  }
  
  /**
   * Apply field transformations to a test case field
   */
  private applyFieldTransformations(
    testCase: TestCase,
    transformations: FieldTransformation[]
  ): TestCase {
    const result = { ...testCase } as any; // We need 'any' for dynamic access
    
    for (const transform of transformations) {
      try {
        // Get the source field value
        const sourceValue = this.getNestedProperty(testCase, transform.sourceField);
        if (sourceValue === undefined) {
          continue;
        }
        
        // Apply transformations in sequence
        let transformedValue = sourceValue;
        
        for (const t of transform.transformations) {
          transformedValue = this.applyTransformation(transformedValue, t);
        }
        
        // Set the target field value
        this.setNestedProperty(result, transform.targetField, transformedValue);
      } catch (error) {
        this.logger.warn(`Failed to apply transformation ${transform.sourceField} -> ${transform.targetField}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    return result;
  }
  
  /**
   * Apply a single transformation to a value
   */
  private applyTransformation(value: any, transformation: Transformation): any {
    if (value === null || value === undefined) {
      return value;
    }
    
    const stringValue = String(value);
    
    switch (transformation.type) {
      case 'concatenate':
        return transformation.position === 'prefix'
          ? `${transformation.value}${stringValue}`
          : `${stringValue}${transformation.value}`;
          
      case 'replace':
        if (transformation.replaceAll) {
          return stringValue.replace(new RegExp(transformation.search, 'g'), transformation.replace);
        } else {
          return stringValue.replace(transformation.search, transformation.replace);
        }
        
      case 'slice':
        return stringValue.slice(transformation.start, transformation.end);
        
      case 'map':
        return transformation.values[stringValue] !== undefined
          ? transformation.values[stringValue]
          : transformation.defaultValue !== undefined
            ? transformation.defaultValue
            : value;
            
      case 'truncate':
        if (stringValue.length <= transformation.maxLength) {
          return stringValue;
        }
        return transformation.addEllipsis
          ? `${stringValue.slice(0, transformation.maxLength - 3)}...`
          : stringValue.slice(0, transformation.maxLength);
          
      case 'uppercase':
        return stringValue.toUpperCase();
        
      case 'lowercase':
        return stringValue.toLowerCase();
        
      case 'capitalize':
        return stringValue.charAt(0).toUpperCase() + stringValue.slice(1);
        
      default:
        return value;
    }
  }
  
  /**
   * Get a nested property value from an object
   */
  private getNestedProperty(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }
    
    return current;
  }
  
  /**
   * Set a nested property value in an object
   */
  private setNestedProperty(obj: any, path: string, value: any): void {
    const parts = path.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (current[part] === undefined) {
        current[part] = {};
      }
      current = current[part];
    }
    
    current[parts[parts.length - 1]] = value;
  }

  /**
   * Fetch test cases from the source system with optional filtering
   */
  private async fetchTestCases(
    sourceProvider: TestManagementProvider,
    input: MigrateTestCasesInput
  ): Promise<TestCase[]> {
    // Apply filters if provided
    if (input.options.filters && typeof sourceProvider.getFilteredTestCases === 'function') {
      return await sourceProvider.getFilteredTestCases(
        input.projectKey,
        input.options.filters
      );
    }
    
    // Otherwise fetch all test cases
    return await sourceProvider.getTestCases(input.projectKey);
  }

  /**
   * Process a single test case during migration
   */
  private async processTestCase(
    testCase: TestCase,
    input: MigrateTestCasesInput,
    sourceProvider: TestManagementProvider,
    targetProvider: TestManagementProvider,
    result: MigrateTestCasesResult
  ): Promise<void> {
    const testCaseDetail: TestCaseMigrationDetail = {
      sourceId: testCase.id,
      name: testCase.title,
      status: 'PENDING',
      startTime: new Date(),
      metadata: {
        priority: testCase.priority,
        status: testCase.status
      }
    };
    
    let retryCount = 0;
    const maxRetries = input.options.maxRetries || 0;
    const retryDelay = input.options.retryDelayMs || 1000;
    
    try {
      this.logger.debug(`Processing test case ${testCase.id}: ${testCase.title}`);
      
      // Update test case status to in progress
      testCaseDetail.status = 'IN_PROGRESS';
      this.notifyListeners('testCaseProcessed', { testCase: testCaseDetail });
      
      // Apply field mappings if provided
      let processedTestCase = this.applyFieldMappings(testCase, input.options.fieldMappings);
      
      // Apply field transformations if provided
      if (input.options.fieldTransformations && input.options.fieldTransformations.length > 0) {
        processedTestCase = this.applyFieldTransformations(
          processedTestCase, 
          input.options.fieldTransformations
        );
        
        // Track transformations applied
        testCaseDetail.transformationsApplied = input.options.fieldTransformations.map(
          t => `${t.sourceField} -> ${t.targetField}`
        );
        
        // Update transformation stats
        result.summary.transformationStats.applied += input.options.fieldTransformations.length;
      }
      
      // Create the test case in the target system
      let createdTestCase: TestCase;
      
      // Logic for retrying on failure
      const executeWithRetry = async (operation: () => Promise<TestCase>): Promise<TestCase> => {
        while (true) {
          try {
            return await operation();
          } catch (error) {
            // Check if we should retry
            if (retryCount < maxRetries) {
              retryCount++;
              testCaseDetail.retryCount = retryCount;
              testCaseDetail.status = 'RETRYING';
              
              this.logger.warn(`Retry ${retryCount}/${maxRetries} for test case ${testCase.id}: ${error instanceof Error ? error.message : String(error)}`);
              this.notifyListeners('testCaseProcessed', { testCase: testCaseDetail });
              
              // Wait before retrying
              await new Promise(resolve => setTimeout(resolve, retryDelay));
              continue;
            }
            
            // No more retries, rethrow
            throw error;
          }
        }
      };
      
      // Create the test case in the target system
      if (input.options.preserveIds) {
        // If the provider has a special method for ID preservation, use it
        if ('createTestCaseWithId' in targetProvider) {
          // We've already verified that this function exists in validateProviderCapabilities
          const createWithId = targetProvider.createTestCaseWithId as (projectKey: string, testCase: TestCase) => Promise<TestCase>;
          createdTestCase = await executeWithRetry(() => 
            createWithId(input.projectKey, processedTestCase)
          );
        } else {
          // Otherwise try regular creation which may or may not preserve IDs
          createdTestCase = await executeWithRetry(() => 
            targetProvider.createTestCase(input.projectKey, processedTestCase)
          );
          
          // Check if ID was preserved
          if (createdTestCase.id !== testCase.id) {
            const warning = `ID not preserved for test case ${testCase.id}. Target system assigned ID ${createdTestCase.id}.`;
            result.warnings.push(warning);
            
            if (!testCaseDetail.warnings) {
              testCaseDetail.warnings = [];
            }
            testCaseDetail.warnings.push(warning);
          }
        }
      } else {
        // Normal creation without ID preservation
        createdTestCase = await executeWithRetry(() => 
          targetProvider.createTestCase(input.projectKey, processedTestCase)
        );
      }
      
      // Process attachments and history
      const attachmentStats = await this.processAttachmentsAndHistory(
        testCase,
        createdTestCase,
        input,
        sourceProvider,
        targetProvider
      );
      
      // Update attachment and history statistics
      if (attachmentStats) {
        testCaseDetail.attachments = attachmentStats.attachments;
        testCaseDetail.history = attachmentStats.history;
        
        // Update global stats
        result.summary.attachmentStats.total += attachmentStats.attachments.total;
        result.summary.attachmentStats.migrated += attachmentStats.attachments.migrated;
        result.summary.attachmentStats.failed += attachmentStats.attachments.failed;
        
        result.summary.historyStats.total += attachmentStats.history.total;
        result.summary.historyStats.migrated += attachmentStats.history.migrated;
        result.summary.historyStats.failed += attachmentStats.history.failed;
      }
      
      // Record successful migration
      testCaseDetail.status = 'MIGRATED';
      testCaseDetail.targetId = createdTestCase.id;
      testCaseDetail.endTime = new Date();
      testCaseDetail.durationMs = testCaseDetail.endTime.getTime() - testCaseDetail.startTime.getTime();
      
      // Generate URL if provider info is available
      if (targetProvider.getProviderInfo) {
        try {
          const info = await targetProvider.getProviderInfo();
          testCaseDetail.url = `${info.baseUrl}/projects/${input.projectKey}/test-cases/${createdTestCase.id}`;
        } catch (error) {
          this.logger.debug(`Could not generate URL for test case: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      // Update result counts and details
      result.migratedCount++;
      result.details.migrated.push(testCaseDetail);
      
      // Update counters for the test case status and priority
      if (!result.summary.byStatus[testCase.status]) {
        result.summary.byStatus[testCase.status] = 0;
      }
      result.summary.byStatus[testCase.status]++;
      
      if (!result.summary.byPriority[testCase.priority]) {
        result.summary.byPriority[testCase.priority] = 0;
      }
      result.summary.byPriority[testCase.priority]++;
      
      this.notifyListeners('testCaseProcessed', { testCase: testCaseDetail });
    } catch (error) {
      this.logger.error(
        `Failed to migrate test case ${testCase.id}: ${error instanceof Error ? error.message : String(error)}`
      );
      
      // Update test case detail with failure information
      testCaseDetail.status = 'FAILED';
      testCaseDetail.error = error instanceof Error ? error.message : String(error);
      testCaseDetail.endTime = new Date();
      testCaseDetail.durationMs = testCaseDetail.endTime.getTime() - testCaseDetail.startTime.getTime();
      
      // Record the failure
      result.failedCount++;
      result.details.failed.push(testCaseDetail);
      
      // Add to errors list
      result.errors.push({
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date(),
        source: 'processor'
      });
      
      this.notifyListeners('testCaseProcessed', { testCase: testCaseDetail });
      
      // If we should not continue on error, rethrow
      if (!input.options.continueOnError) {
        throw error;
      }
    }
  }

  /**
   * Process attachments and history for a test case
   */
  private async processAttachmentsAndHistory(
    sourceTestCase: TestCase,
    targetTestCase: TestCase,
    input: MigrateTestCasesInput,
    sourceProvider: TestManagementProvider,
    targetProvider: TestManagementProvider
  ): Promise<{
    attachments: { total: number; migrated: number; failed: number; };
    history: { total: number; migrated: number; failed: number; };
  }> {
    const stats = {
      attachments: {
        total: 0,
        migrated: 0,
        failed: 0
      },
      history: {
        total: 0,
        migrated: 0,
        failed: 0
      }
    };
    
    // Process attachments if needed
    if (input.options.includeAttachments) {
      try {
        this.logger.debug(`Processing attachments for test case ${sourceTestCase.id}`);
        const attachments = await sourceProvider.getTestCaseAttachments(sourceTestCase.id);
        stats.attachments.total = attachments.length;
        
        // Process each attachment
        for (const attachment of attachments) {
          try {
            await targetProvider.addTestCaseAttachment(targetTestCase.id, attachment);
            stats.attachments.migrated++;
          } catch (error) {
            stats.attachments.failed++;
            this.logger.warn(`Failed to add attachment ${attachment.name} (${attachment.id}): ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to process attachments for test case ${sourceTestCase.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    // Process history if needed
    if (input.options.includeHistory) {
      try {
        this.logger.debug(`Processing history for test case ${sourceTestCase.id}`);
        const history = await sourceProvider.getTestCaseHistory(sourceTestCase.id);
        stats.history.total = history.length;
        
        try {
          await targetProvider.addTestCaseHistory(targetTestCase.id, history);
          stats.history.migrated = history.length;
        } catch (error) {
          stats.history.failed = history.length;
          this.logger.warn(`Failed to add history for test case ${sourceTestCase.id}: ${error instanceof Error ? error.message : String(error)}`);
        }
      } catch (error) {
        this.logger.warn(`Failed to retrieve history for test case ${sourceTestCase.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    return stats;
  }


  /**
   * Apply field mappings to a test case
   */
  private applyFieldMappings(
    testCase: TestCase,
    fieldMappings?: Record<string, string>
  ): TestCase {
    if (!fieldMappings) {
      return testCase;
    }
    
    // Clone the test case to avoid modifying the original
    const mappedTestCase = { ...testCase } as TestCase & { customFields?: Record<string, any> };
    
    // Apply mappings to custom fields
    if (mappedTestCase.customFields) {
      const newCustomFields: Record<string, any> = {};
      
      for (const [key, value] of Object.entries(mappedTestCase.customFields)) {
        const mappedKey = fieldMappings[key] || key;
        newCustomFields[mappedKey] = value;
      }
      
      mappedTestCase.customFields = newCustomFields;
    }
    
    return mappedTestCase;
  }

  /**
   * Divide an array into batches of specified size
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    
    return batches;
  }
}

/**
 * Interface for provider factories
 */
export interface ProviderFactory {
  createProvider(providerType: string): TestManagementProvider | null;
}

/**
 * Factory for creating TestCaseRepository instances
 */
export interface TestCaseRepositoryFactory {
  createRepository(providerType: string): any | null; // Using any temporarily until proper interface is defined
}

/**
 * Migration event types
 */
export type MigrationEventType = 
  | 'started'
  | 'completed' 
  | 'failed' 
  | 'paused' 
  | 'resumed' 
  | 'cancelled'
  | 'statusChanged'
  | 'progressUpdated'
  | 'testCaseProcessed'
  | 'testCasesLoaded'
  | 'batchCompleted';

/**
 * Event data for migration events
 */
export type MigrationEventData = any;

/**
 * Migration event listener
 */
export interface MigrationEventListener {
  (event: MigrationEventType, data: MigrationEventData): void;
}

/**
 * Migration error details
 */
export interface MigrationError {
  message: string;
  stack?: string;
  timestamp: Date;
  code?: string;
  retryable?: boolean;
  source?: 'source' | 'target' | 'validator' | 'processor';
}

/**
 * Interface for test management system providers
 */
export interface TestManagementProvider {
  // Core operations
  getTestCases(projectKey: string): Promise<TestCase[]>;
  getFilteredTestCases?(projectKey: string, filter: TestCaseFilter): Promise<TestCase[]>;
  getTestCaseById?(projectKey: string, testCaseId: string): Promise<TestCase>;
  createTestCase(projectKey: string, testCase: TestCase): Promise<TestCase>;
  createTestCaseWithId?(projectKey: string, testCase: TestCase): Promise<TestCase>;
  updateTestCase?(projectKey: string, testCaseId: string, testCase: Partial<TestCase>): Promise<TestCase>;
  deleteTestCase?(projectKey: string, testCaseId: string): Promise<boolean>;
  
  // Attachment operations
  getTestCaseAttachments(testCaseId: string): Promise<Attachment[]>;
  addTestCaseAttachment(testCaseId: string, attachment: Attachment): Promise<void>;
  deleteTestCaseAttachment?(testCaseId: string, attachmentId: string): Promise<boolean>;
  
  // History operations
  getTestCaseHistory(testCaseId: string): Promise<History[]>;
  addTestCaseHistory(testCaseId: string, history: History[]): Promise<void>;
  
  // Test Suite operations
  getTestSuites?(projectKey: string): Promise<TestSuite[]>;
  getTestSuiteById?(projectKey: string, testSuiteId: string): Promise<TestSuite>;
  createTestSuite?(projectKey: string, testSuite: TestSuite): Promise<TestSuite>;
  updateTestSuite?(projectKey: string, testSuiteId: string, testSuite: Partial<TestSuite>): Promise<TestSuite>;
  deleteTestSuite?(projectKey: string, testSuiteId: string): Promise<boolean>;
  addTestCaseToSuite?(projectKey: string, testSuiteId: string, testCaseId: string): Promise<boolean>;
  removeTestCaseFromSuite?(projectKey: string, testSuiteId: string, testCaseId: string): Promise<boolean>;
  
  // Test Execution operations
  getTestExecutions?(testCaseId: string): Promise<TestExecution[]>;
  createTestExecution?(testCaseId: string, execution: TestExecution): Promise<TestExecution>;
  
  // Provider-specific operations
  validateConnection?(): Promise<boolean>;
  getCapabilities?(): Promise<ProviderCapabilities>;
  getFields?(projectKey: string): Promise<ProviderField[]>;
  getProviderInfo?(): Promise<ProviderInfo>;
  
  // Transaction support
  beginTransaction?(): Promise<string>;
  commitTransaction?(transactionId: string): Promise<boolean>;
  rollbackTransaction?(transactionId: string): Promise<boolean>;
}

/**
 * Attachment interface for test case attachments
 */
export interface Attachment {
  id: string;
  name: string;
  contentType: string;
  content: Buffer;
  size: number;
  description?: string;
  uploadedBy?: string;
  uploadedAt?: Date;
  url?: string;
  checksumMd5?: string;
}

/**
 * History interface for test case history
 */
export interface History {
  id: string;
  date: Date;
  author: string;
  field: string;
  oldValue: string;
  newValue: string;
  comment?: string;
  type?: 'create' | 'update' | 'delete' | 'status_change' | 'attachment' | 'custom';
}

/**
 * Provider capabilities interface
 */
export interface ProviderCapabilities {
  features: {
    attachments: boolean;
    history: boolean;
    testSuites: boolean;
    testExecutions: boolean;
    customFields: boolean;
    idPreservation: boolean;
    transactions: boolean;
    bulkOperations: boolean;
    fieldValidation: boolean;
  };
  limits: {
    maxAttachmentSize: number;
    maxTestCasesPerRequest: number;
    maxBatchSize: number;
    rateLimit: {
      requestsPerMinute: number;
      burstLimit: number;
    };
  };
  formats: {
    supportedAttachmentTypes: string[];
    supportedTestCaseFormats: string[];
  };
}

/**
 * Provider field metadata
 */
export interface ProviderField {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'array' | 'object';
  required: boolean;
  maxLength?: number;
  allowedValues?: string[];
  defaultValue?: any;
  description?: string;
}

/**
 * Provider information
 */
export interface ProviderInfo {
  id: string;
  name: string;
  version: string;
  apiVersion: string;
  description: string;
  baseUrl: string;
  documentationUrl?: string;
  supportedFeatures: string[];
}

/**
 * Test suite interface
 */
export interface TestSuite {
  id: string;
  name: string;
  description: string;
  testCases: string[]; // Array of TestCase IDs
  parentSuiteId?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Test execution interface
 */
export interface TestExecution {
  id: string;
  testCaseId: string;
  executionDate: Date;
  executedBy: string;
  status: ExecutionStatus;
  duration: number;
  environment: string;
  buildVersion: string;
  notes: string;
  stepResults: StepResult[];
}

/**
 * Step result interface
 */
export interface StepResult {
  stepOrder: number;
  status: ExecutionStatus;
  actualResult: string;
  notes: string;
}

/**
 * Execution status enum
 */
export enum ExecutionStatus {
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  BLOCKED = 'BLOCKED',
  NOT_EXECUTED = 'NOT_EXECUTED',
  IN_PROGRESS = 'IN_PROGRESS'
}
