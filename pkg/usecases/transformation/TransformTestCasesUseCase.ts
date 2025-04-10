/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { LoggerService } from '../../interfaces/LoggerService';
import {
  CanonicalTestCase,
  Transformer,
  TransformationError
} from '../../domain/canonical';

/**
 * Port for transformation operations.
 */
export interface TransformationPort {
  /**
   * Transform a test case from source system to target system.
   * 
   * @param testCase Test case to transform
   * @param sourceSystem Source system identifier
   * @param targetSystem Target system identifier
   * @param configuration Transformation configuration
   * @returns Transformed test case
   */
  transformTestCase(
    testCase: Record<string, any>, 
    sourceSystem: string, 
    targetSystem: string, 
    configuration: TransformationConfiguration
  ): Promise<Record<string, any>>;
  
  /**
   * Convert a test case to canonical form.
   * 
   * @param testCase Test case to convert
   * @param sourceSystem Source system identifier
   * @param configuration Transformation configuration
   * @returns Canonical test case
   */
  getCanonicalTestCase(
    testCase: Record<string, any>, 
    sourceSystem: string, 
    configuration: TransformationConfiguration
  ): CanonicalTestCase;
  
  /**
   * Convert a canonical test case to target system format.
   * 
   * @param canonicalTestCase Canonical test case
   * @param targetSystem Target system identifier
   * @param configuration Transformation configuration
   * @returns Target system test case
   */
  fromCanonicalTestCase(
    canonicalTestCase: CanonicalTestCase, 
    targetSystem: string, 
    configuration: TransformationConfiguration
  ): Record<string, any>;
  
  /**
   * Validate a test case transformation.
   * 
   * @param testCase Source test case
   * @param transformedTestCase Transformed test case
   * @param sourceSystem Source system identifier
   * @param targetSystem Target system identifier
   * @returns Validation messages
   */
  validateTestCaseTransformation(
    testCase: Record<string, any>,
    transformedTestCase: Record<string, any>,
    sourceSystem: string,
    targetSystem: string
  ): string[];
  
  /**
   * Register mappers for all supported systems.
   */
  registerMappers(): void;
}

/**
 * Adapter for the Transformer domain service.
 */
export class TransformationPortAdapter implements TransformationPort {
  constructor(
    private readonly transformer: Transformer,
    private readonly logger: LoggerService
  ) {}
  
  async transformTestCase(
    testCase: Record<string, any>, 
    sourceSystem: string, 
    targetSystem: string, 
    configuration: TransformationConfiguration
  ): Promise<Record<string, any>> {
    this.logger.debug(`Transforming test case from ${sourceSystem} to ${targetSystem}`, {
      testCaseId: testCase.id,
      configId: configuration.id
    });
    
    const context = {
      sourceSystem,
      targetSystem,
      fieldMappings: configuration.fieldMappings,
      valueMappings: configuration.valueMappings,
      options: configuration.options
    };
    
    return this.transformer.transform(
      sourceSystem,
      targetSystem,
      'test-case',
      testCase,
      context
    );
  }
  
  getCanonicalTestCase(
    testCase: Record<string, any>, 
    sourceSystem: string, 
    configuration: TransformationConfiguration
  ): CanonicalTestCase {
    this.logger.debug(`Converting test case to canonical form from ${sourceSystem}`, {
      testCaseId: testCase.id,
      configId: configuration.id
    });
    
    const context = {
      sourceSystem,
      targetSystem: 'canonical',
      fieldMappings: configuration.fieldMappings,
      valueMappings: configuration.valueMappings,
      options: configuration.options
    };
    
    return this.transformer.getCanonicalForm<CanonicalTestCase>(
      sourceSystem,
      'test-case',
      testCase,
      context
    );
  }
  
  fromCanonicalTestCase(
    canonicalTestCase: CanonicalTestCase, 
    targetSystem: string, 
    configuration: TransformationConfiguration
  ): Record<string, any> {
    this.logger.debug(`Converting canonical test case to ${targetSystem} format`, {
      testCaseId: canonicalTestCase.id,
      configId: configuration.id
    });
    
    const context = {
      sourceSystem: 'canonical',
      targetSystem,
      fieldMappings: configuration.fieldMappings,
      valueMappings: configuration.valueMappings,
      options: configuration.options
    };
    
    return this.transformer.fromCanonicalForm<CanonicalTestCase>(
      targetSystem,
      'test-case',
      canonicalTestCase,
      context
    );
  }
  
  validateTestCaseTransformation(
    testCase: Record<string, any>,
    transformedTestCase: Record<string, any>,
    sourceSystem: string,
    targetSystem: string
  ): string[] {
    const translations = this.transformer.getTranslations();
    const translationKey = `${sourceSystem}:${targetSystem}:test-case:${testCase.id || 'unknown'}`;
    const translation = translations.get(translationKey);
    
    if (!translation) {
      return [];
    }
    
    return translation.messages || [];
  }
  
  registerMappers(): void {
    this.logger.info('Registering all mappers');
    
    // This is imported from canonical/index.ts which registers all mappers
    // with the mapperRegistry
    import('../../domain/canonical').then(({ registerAllMappers }) => {
      registerAllMappers();
    }).catch(error => {
      this.logger.error('Failed to register mappers', { error });
    });
  }
}

/**
 * Configuration for a transformation.
 */
export interface TransformationConfiguration {
  /**
   * Configuration ID.
   */
  id: string;
  
  /**
   * Configuration name.
   */
  name: string;
  
  /**
   * Source system identifier.
   */
  sourceSystem: string;
  
  /**
   * Target system identifier.
   */
  targetSystem: string;
  
  /**
   * Field mapping configuration.
   */
  fieldMappings: Record<string, string>;
  
  /**
   * Value mapping configuration.
   */
  valueMappings: Record<string, Record<string, any>>;
  
  /**
   * Additional options.
   */
  options?: Record<string, any>;
}

/**
 * Port for transformation configuration operations.
 */
export interface TransformationConfigurationPort {
  /**
   * Get a transformation configuration by ID.
   * 
   * @param configurationId Configuration ID
   * @returns Transformation configuration or null if not found
   */
  getTransformationConfiguration(configurationId: string): Promise<TransformationConfiguration | null>;
  
  /**
   * Save a transformation configuration.
   * 
   * @param configuration Transformation configuration
   * @returns Saved configuration
   */
  saveTransformationConfiguration(configuration: TransformationConfiguration): Promise<TransformationConfiguration>;
  
  /**
   * Delete a transformation configuration.
   * 
   * @param configurationId Configuration ID
   * @returns True if deleted, false otherwise
   */
  deleteTransformationConfiguration(configurationId: string): Promise<boolean>;
  
  /**
   * Get the default configuration for a source and target system.
   * 
   * @param sourceSystem Source system identifier
   * @param targetSystem Target system identifier
   * @returns Default configuration or null if none exists
   */
  getDefaultConfiguration(sourceSystem: string, targetSystem: string): Promise<TransformationConfiguration | null>;
}

/**
 * Input for transform test cases operations.
 */
export interface TransformTestCasesInput {
  /**
   * Test case to transform.
   */
  testCase?: Record<string, any>;
  
  /**
   * Test cases to transform (for batch operations).
   */
  testCases?: Record<string, any>[];
  
  /**
   * Source system identifier.
   */
  sourceSystem: string;
  
  /**
   * Target system identifier.
   */
  targetSystem: string;
  
  /**
   * Optional configuration ID.
   */
  configurationId?: string;
}

/**
 * Result of a transformation operation.
 */
export interface TransformTestCasesResult {
  /**
   * Whether the operation was successful.
   */
  success: boolean;
  
  /**
   * Error message if the operation failed.
   */
  error?: string;
  
  /**
   * Transformed test case.
   */
  transformedTestCase?: Record<string, any>;
  
  /**
   * Transformed test cases (for batch operations).
   */
  transformedTestCases?: Record<string, any>[];
  
  /**
   * Failed test cases with errors (for batch operations).
   */
  failedTestCases?: Array<{
    testCaseId: string;
    error: string;
  }>;
  
  /**
   * Canonical test case (for preview).
   */
  canonicalTestCase?: CanonicalTestCase;
  
  /**
   * Source test case (for preview).
   */
  sourceTestCase?: Record<string, any>;
  
  /**
   * Target test case (for preview).
   */
  targetTestCase?: Record<string, any>;
  
  /**
   * Validation messages.
   */
  validationMessages?: string[];
}

/**
 * Use case for transforming test cases between different systems.
 */
export class TransformTestCasesUseCase {
  constructor(
    private readonly transformationPort: TransformationPort,
    private readonly configurationPort: TransformationConfigurationPort,
    private readonly logger: LoggerService
  ) {
    // Register all mappers on initialization
    this.transformationPort.registerMappers();
  }
  
  /**
   * Transform a test case from source system to target system.
   * 
   * @param input Transformation input
   * @returns Transformation result
   */
  async transformTestCase(input: TransformTestCasesInput): Promise<TransformTestCasesResult> {
    if (!input.testCase) {
      return {
        success: false,
        error: 'No test case provided'
      };
    }
    
    try {
      // Get the configuration
      const configuration = await this.getConfiguration(
        input.configurationId,
        input.sourceSystem,
        input.targetSystem
      );
      
      if (!configuration) {
        this.logger.error('Configuration not found', {
          configId: input.configurationId,
          sourceSystem: input.sourceSystem,
          targetSystem: input.targetSystem
        });
        
        return {
          success: false,
          error: `Configuration not found for ${input.sourceSystem} to ${input.targetSystem}`
        };
      }
      
      // Use the configuration ID from the configuration itself if fallback was used
      if (input.configurationId !== configuration.id) {
        this.logger.info(`Using default configuration ${configuration.id}`, {
          requestedConfigId: input.configurationId
        });
      }
      
      // Transform the test case
      const transformedTestCase = await this.transformationPort.transformTestCase(
        input.testCase,
        input.sourceSystem,
        input.targetSystem,
        configuration
      );
      
      // Check for validation messages
      const validationMessages = this.transformationPort.validateTestCaseTransformation(
        input.testCase,
        transformedTestCase,
        input.sourceSystem,
        input.targetSystem
      );
      
      if (validationMessages.length > 0) {
        this.logger.warn('Transformation completed with validation messages', {
          testCaseId: input.testCase.id,
          validationMessages
        });
      } else {
        this.logger.info('Transformation completed successfully', {
          testCaseId: input.testCase.id,
          sourceSystem: input.sourceSystem,
          targetSystem: input.targetSystem
        });
      }
      
      return {
        success: true,
        transformedTestCase,
        validationMessages: validationMessages.length > 0 ? validationMessages : undefined
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.logger.error('Error transforming test case', {
        error,
        testCaseId: input.testCase.id,
        sourceSystem: input.sourceSystem,
        targetSystem: input.targetSystem
      });
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }
  
  /**
   * Transform multiple test cases in batch.
   * 
   * @param input Transformation input with multiple test cases
   * @returns Transformation result with transformed and failed test cases
   */
  async transformMultipleTestCases(input: TransformTestCasesInput): Promise<TransformTestCasesResult> {
    if (!input.testCases || input.testCases.length === 0) {
      return {
        success: false,
        error: 'No test cases provided',
        transformedTestCases: []
      };
    }
    
    try {
      // Get the configuration
      const configuration = await this.getConfiguration(
        input.configurationId,
        input.sourceSystem,
        input.targetSystem
      );
      
      if (!configuration) {
        this.logger.error('Configuration not found for batch operation', {
          configId: input.configurationId,
          sourceSystem: input.sourceSystem,
          targetSystem: input.targetSystem
        });
        
        return {
          success: false,
          error: `Configuration not found for ${input.sourceSystem} to ${input.targetSystem}`,
          transformedTestCases: []
        };
      }
      
      this.logger.info(`Starting batch transformation of ${input.testCases.length} test cases`, {
        sourceSystem: input.sourceSystem,
        targetSystem: input.targetSystem,
        configId: configuration.id
      });
      
      // Transform each test case and track results
      const transformedTestCases: Record<string, any>[] = [];
      const failedTestCases: Array<{ testCaseId: string; error: string }> = [];
      
      await Promise.all(input.testCases.map(async (testCase) => {
        try {
          const transformedTestCase = await this.transformationPort.transformTestCase(
            testCase,
            input.sourceSystem,
            input.targetSystem,
            configuration
          );
          
          transformedTestCases.push(transformedTestCase);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          failedTestCases.push({
            testCaseId: testCase.id || 'unknown',
            error: errorMessage
          });
          
          this.logger.warn(`Failed to transform test case ${testCase.id}`, {
            error,
            sourceSystem: input.sourceSystem,
            targetSystem: input.targetSystem
          });
        }
      }));
      
      // If all transformations failed, return an error result
      if (transformedTestCases.length === 0 && failedTestCases.length > 0) {
        this.logger.error(`All ${failedTestCases.length} test case transformations failed`, {
          sourceSystem: input.sourceSystem,
          targetSystem: input.targetSystem
        });
        
        return {
          success: false,
          error: `All transformations failed (${failedTestCases.length} test cases)`,
          transformedTestCases: [],
          failedTestCases
        };
      }
      
      // If some transformations failed, return a partial success result
      if (failedTestCases.length > 0) {
        this.logger.warn(`Batch transformation completed with ${failedTestCases.length} failures`, {
          totalCount: input.testCases.length,
          successCount: transformedTestCases.length,
          failureCount: failedTestCases.length
        });
        
        return {
          success: true,
          transformedTestCases,
          failedTestCases
        };
      }
      
      // All transformations succeeded
      this.logger.info(`Successfully transformed ${transformedTestCases.length} test cases`, {
        sourceSystem: input.sourceSystem,
        targetSystem: input.targetSystem
      });
      
      return {
        success: true,
        transformedTestCases
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.logger.error('Error in batch transformation', {
        error,
        sourceSystem: input.sourceSystem,
        targetSystem: input.targetSystem
      });
      
      return {
        success: false,
        error: errorMessage,
        transformedTestCases: []
      };
    }
  }
  
  /**
   * Preview a transformation by showing the source, canonical, and target forms.
   * 
   * @param input Transformation input
   * @returns Preview result with all three forms
   */
  async previewTransformation(input: TransformTestCasesInput): Promise<TransformTestCasesResult> {
    if (!input.testCase) {
      return {
        success: false,
        error: 'No test case provided'
      };
    }
    
    try {
      // Get the configuration
      const configuration = await this.getConfiguration(
        input.configurationId,
        input.sourceSystem,
        input.targetSystem
      );
      
      if (!configuration) {
        this.logger.error('Configuration not found for preview', {
          configId: input.configurationId,
          sourceSystem: input.sourceSystem,
          targetSystem: input.targetSystem
        });
        
        return {
          success: false,
          error: `Configuration not found for ${input.sourceSystem} to ${input.targetSystem}`
        };
      }
      
      // Convert to canonical form
      const canonicalTestCase = this.transformationPort.getCanonicalTestCase(
        input.testCase,
        input.sourceSystem,
        configuration
      );
      
      // Convert from canonical to target form
      const targetTestCase = this.transformationPort.fromCanonicalTestCase(
        canonicalTestCase,
        input.targetSystem,
        configuration
      );
      
      this.logger.info('Transformation preview generated', {
        testCaseId: input.testCase.id,
        sourceSystem: input.sourceSystem,
        targetSystem: input.targetSystem
      });
      
      return {
        success: true,
        sourceTestCase: input.testCase,
        canonicalTestCase,
        targetTestCase
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.logger.error('Error generating transformation preview', {
        error,
        testCaseId: input.testCase.id,
        sourceSystem: input.sourceSystem,
        targetSystem: input.targetSystem
      });
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }
  
  /**
   * Get the transformation configuration.
   * 
   * @param configurationId Configuration ID or undefined for default
   * @param sourceSystem Source system identifier
   * @param targetSystem Target system identifier
   * @returns Transformation configuration or null if not found
   */
  private async getConfiguration(
    configurationId: string | undefined,
    sourceSystem: string,
    targetSystem: string
  ): Promise<TransformationConfiguration | null> {
    // If configuration ID is provided, try to get that specific configuration
    if (configurationId) {
      const configuration = await this.configurationPort.getTransformationConfiguration(configurationId);
      if (configuration) {
        return configuration;
      }
    }
    
    // Fall back to default configuration
    return await this.configurationPort.getDefaultConfiguration(sourceSystem, targetSystem);
  }
}