/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Transformer implementation for the translation layer.
 * 
 * This module provides the core transformation logic for converting test assets
 * between different test management systems using the canonical model as an
 * intermediary representation.
 */

import { LoggerService } from '../services/LoggerService';
import {
  CanonicalTestCase,
  CanonicalTestExecution,
  CanonicalTestSuite,
  CanonicalTestCycle,
  CanonicalTranslation,
  TransformationContext,
  MigrationJob
} from './CanonicalModels';
import { BaseMapper, mapperRegistry } from './BaseMapper';

/**
 * Error thrown when transformation fails.
 */
export class TransformationError extends Error {
  /**
   * Additional error details
   */
  details: Record<string, any>;
  
  /**
   * Create a new transformation error.
   * 
   * @param message Error message
   * @param details Optional error details
   */
  constructor(message: string, details?: Record<string, any>) {
    super(message);
    this.name = 'TransformationError';
    this.details = details || {};
  }
}

/**
 * Type guard for canonical models
 */
type CanonicalModel = CanonicalTestCase | CanonicalTestExecution | CanonicalTestSuite | CanonicalTestCycle;

/**
 * Transformer service that handles transformations between different systems via the canonical model.
 */
export class Transformer {
  /**
   * Map of translations by ID.
   */
  private translations: Map<string, CanonicalTranslation> = new Map();
  
  /**
   * Create a new transformer.
   * 
   * @param logger Logger service
   */
  constructor(private logger: LoggerService) {}
  
  /**
   * Transform data from source system to target system.
   * 
   * @param sourceSystem The source system name
   * @param targetSystem The target system name
   * @param entityType The entity type (e.g., "test-case")
   * @param sourceData The source data to transform
   * @param context Optional transformation context
   * @returns The transformed data in target system format
   * @throws TransformationError if transformation fails
   */
  transform(
    sourceSystem: string,
    targetSystem: string,
    entityType: string,
    sourceData: Record<string, any>,
    context?: TransformationContext
  ): Record<string, any> {
    // Create transformation context if not provided
    if (!context) {
      context = {
        sourceSystem,
        targetSystem
      };
    }
    
    try {
      // Get mappers for source and target systems
      const sourceMapper = this.getMapper(sourceSystem, entityType);
      const targetMapper = this.getMapper(targetSystem, entityType);
      
      if (!sourceMapper) {
        throw new TransformationError(`No mapper found for ${sourceSystem}/${entityType}`);
      }
      
      if (!targetMapper) {
        throw new TransformationError(`No mapper found for ${targetSystem}/${entityType}`);
      }
      
      // Transform from source to canonical
      const canonicalData = sourceMapper.toCanonical(sourceData, context);
      
      // Transform from canonical to target
      const targetData = targetMapper.fromCanonical(canonicalData, context);
      
      // Validate the transformation
      const validationMessages = this.validateTransformation(
        sourceMapper,
        targetMapper,
        sourceData,
        canonicalData,
        targetData
      );
      
      if (validationMessages.length > 0) {
        this.logger.warn(`Validation issues during transformation: ${validationMessages.join(', ')}`);
      }
      
      // Record the translation
      const translationId = `${sourceSystem}:${targetSystem}:${entityType}:${sourceData.id || 'unknown'}`;
      
      const translation: CanonicalTranslation = {
        sourceSystem,
        targetSystem,
        entityType,
        sourceId: sourceData.id || 'unknown',
        targetId: targetData.id || 'unknown',
        status: validationMessages.length > 0 ? 'partial' : 'success',
        timestamp: new Date(),
        sourceData,
        targetData,
        messages: validationMessages,
        migrationId: context.migrationId
      };
      
      this.translations.set(translationId, translation);
      
      return targetData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Transformation error: ${errorMessage}`);
      
      // Record failed translation
      const translationId = `${sourceSystem}:${targetSystem}:${entityType}:${sourceData.id || 'unknown'}`;
      
      const translation: CanonicalTranslation = {
        sourceSystem,
        targetSystem,
        entityType,
        sourceId: sourceData.id || 'unknown',
        targetId: 'failed',
        status: 'error',
        timestamp: new Date(),
        sourceData,
        messages: [errorMessage],
        migrationId: context?.migrationId
      };
      
      this.translations.set(translationId, translation);
      
      throw new TransformationError(
        `Failed to transform ${entityType} from ${sourceSystem} to ${targetSystem}`,
        {
          error: errorMessage,
          sourceId: sourceData.id || 'unknown'
        }
      );
    }
  }
  
  /**
   * Get the canonical form of data from a specific system.
   * 
   * @param systemName The system name
   * @param entityType The entity type
   * @param data The data to convert
   * @param context Optional transformation context
   * @returns The canonical form of the data
   * @throws TransformationError if conversion fails
   */
  getCanonicalForm<T extends CanonicalModel>(
    systemName: string,
    entityType: string,
    data: Record<string, any>,
    context?: TransformationContext
  ): T {
    const mapper = this.getMapper(systemName, entityType);
    
    if (!mapper) {
      throw new TransformationError(`No mapper found for ${systemName}/${entityType}`);
    }
    
    if (!context) {
      context = {
        sourceSystem: systemName,
        targetSystem: 'canonical'
      };
    }
    
    try {
      return mapper.toCanonical(data, context) as T;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error converting to canonical form: ${errorMessage}`);
      
      throw new TransformationError(
        `Failed to convert ${entityType} from ${systemName} to canonical form`,
        {
          error: errorMessage,
          sourceId: data.id || 'unknown'
        }
      );
    }
  }
  
  /**
   * Convert canonical data to a specific system format.
   * 
   * @param systemName The target system name
   * @param entityType The entity type
   * @param canonicalData The canonical data to convert
   * @param context Optional transformation context
   * @returns The system-specific representation of the data
   * @throws TransformationError if conversion fails
   */
  fromCanonicalForm<T extends CanonicalModel>(
    systemName: string,
    entityType: string,
    canonicalData: T,
    context?: TransformationContext
  ): Record<string, any> {
    const mapper = this.getMapper(systemName, entityType);
    
    if (!mapper) {
      throw new TransformationError(`No mapper found for ${systemName}/${entityType}`);
    }
    
    if (!context) {
      context = {
        sourceSystem: 'canonical',
        targetSystem: systemName
      };
    }
    
    try {
      return mapper.fromCanonical(canonicalData, context);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error converting from canonical form: ${errorMessage}`);
      
      throw new TransformationError(
        `Failed to convert ${entityType} from canonical form to ${systemName}`,
        {
          error: errorMessage,
          canonicalId: canonicalData.id || 'unknown'
        }
      );
    }
  }
  
  /**
   * Get all recorded translations.
   * 
   * @returns Map of translations by ID
   */
  getTranslations(): Map<string, CanonicalTranslation> {
    return this.translations;
  }
  
  /**
   * Clear all recorded translations.
   */
  clearTranslations(): void {
    this.translations.clear();
  }
  
  /**
   * Get a mapper for a specific system and entity type.
   * 
   * @param systemName The system name
   * @param entityType The entity type
   * @returns The mapper or undefined if not found
   */
  private getMapper(systemName: string, entityType: string): BaseMapper<any, any> | undefined {
    return mapperRegistry.getMapper(systemName, entityType);
  }
  
  /**
   * Validate a transformation chain.
   * 
   * @param sourceMapper The source mapper
   * @param targetMapper The target mapper
   * @param sourceData The original source data
   * @param canonicalData The intermediate canonical data
   * @param targetData The transformed target data
   * @returns List of validation messages (empty if valid)
   */
  private validateTransformation(
    sourceMapper: BaseMapper<any, any>,
    targetMapper: BaseMapper<any, any>,
    sourceData: Record<string, any>,
    canonicalData: any,
    targetData: Record<string, any>
  ): string[] {
    // Validate source to canonical
    const sourceValidation = sourceMapper.validateMapping(sourceData, canonicalData);
    
    // We can't easily validate canonical to target in the same way
    // because validateMapping expects the same type for both parameters
    
    // Return combined validation messages
    return sourceValidation;
  }
}

/**
 * Service for coordinating transformations between systems.
 */
export class TransformationService {
  /**
   * The transformer instance.
   */
  private transformer: Transformer;
  
  /**
   * Map of migration jobs by ID.
   */
  private migrationJobs: Map<string, MigrationJob> = new Map();
  
  /**
   * Create a new transformation service.
   * 
   * @param logger Logger service
   */
  constructor(private logger: LoggerService) {
    this.transformer = new Transformer(logger);
  }
  
  /**
   * Transform data from one system to another.
   * 
   * @param sourceSystem The source system name
   * @param targetSystem The target system name
   * @param data The data to transform
   * @param entityType The entity type (default: "test-case")
   * @param migrationId Optional migration ID
   * @param fieldMappings Optional field mappings
   * @param valueMappings Optional value mappings
   * @returns The transformed data
   */
  transform(
    sourceSystem: string,
    targetSystem: string,
    data: Record<string, any>,
    entityType: string = 'test-case',
    migrationId?: string,
    fieldMappings?: Record<string, string>,
    valueMappings?: Record<string, Record<string, any>>
  ): Record<string, any> {
    const context: TransformationContext = {
      sourceSystem,
      targetSystem,
      migrationId,
      fieldMappings: fieldMappings || {},
      valueMappings: valueMappings || {}
    };
    
    return this.transformer.transform(
      sourceSystem,
      targetSystem,
      entityType,
      data,
      context
    );
  }
  
  /**
   * Create a new migration job.
   * 
   * @param name Job name
   * @param sourceSystem Source system name
   * @param sourceConfig Source system configuration
   * @param targetSystem Target system name
   * @param targetConfig Target system configuration
   * @param entityTypes Entity types to migrate
   * @param description Optional job description
   * @param filters Optional filters to apply
   * @param fieldMappings Optional field mappings
   * @param valueMappings Optional value mappings
   * @param userId Optional user ID
   * @returns The migration job ID
   */
  createMigrationJob(
    name: string,
    sourceSystem: string,
    sourceConfig: Record<string, any>,
    targetSystem: string,
    targetConfig: Record<string, any>,
    entityTypes: string[],
    description?: string,
    filters?: Record<string, any>,
    fieldMappings?: Record<string, Record<string, string>>,
    valueMappings?: Record<string, Record<string, Record<string, any>>>,
    userId?: string
  ): string {
    const jobId = this.generateUuid();
    
    const job: MigrationJob = {
      id: jobId,
      name,
      description,
      sourceSystem,
      sourceConfig,
      targetSystem,
      targetConfig,
      entityTypes,
      filters: filters || {},
      fieldMappings: fieldMappings || {},
      valueMappings: valueMappings || {},
      status: 'CREATED',
      totalItems: 0,
      processedItems: 0,
      successCount: 0,
      errorCount: 0,
      warningCount: 0,
      createdBy: userId,
      createdAt: new Date()
    };
    
    this.migrationJobs.set(jobId, job);
    
    return jobId;
  }
  
  /**
   * Get a migration job by ID.
   * 
   * @param jobId The migration job ID
   * @returns The migration job or undefined if not found
   */
  getMigrationJob(jobId: string): MigrationJob | undefined {
    return this.migrationJobs.get(jobId);
  }
  
  /**
   * Get all recorded translations.
   * 
   * @returns Map of translations by ID
   */
  getTranslations(): Map<string, CanonicalTranslation> {
    return this.transformer.getTranslations();
  }
  
  /**
   * Clear all recorded translations.
   */
  clearTranslations(): void {
    this.transformer.clearTranslations();
  }
  
  /**
   * Generate a UUID (v4).
   * 
   * @returns A UUID string
   */
  private generateUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}