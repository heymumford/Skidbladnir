/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import {
  CanonicalTestCase,
  CanonicalTestExecution,
  CanonicalTestSuite,
  CanonicalTestCycle,
  CanonicalAttachment,
  CanonicalCustomField,
  TransformationContext
} from './CanonicalModels';

/**
 * Base mapper interface for bidirectional mapping between a specific system format
 * and the canonical model.
 */
export interface BaseMapper<T, C> {
  /**
   * Get the name of the system this mapper handles
   */
  readonly systemName: string;
  
  /**
   * Convert from system-specific format to canonical model.
   * 
   * @param source The source data in system-specific format
   * @param context Optional transformation context with mapping rules
   * @returns The canonical representation of the data
   */
  toCanonical(source: T, context?: TransformationContext): C;
  
  /**
   * Convert from canonical model to system-specific format.
   * 
   * @param canonical The canonical data to convert
   * @param context Optional transformation context with mapping rules
   * @returns The system-specific representation of the data
   */
  fromCanonical(canonical: C, context?: TransformationContext): T;
  
  /**
   * Validate that the mapping between source and target is correct.
   * 
   * @param source The source data
   * @param target The target data
   * @returns List of validation messages (empty if valid)
   */
  validateMapping(source: T, target: C): string[];
}

/**
 * Base mapper interface for test case entities.
 */
export interface TestCaseMapper<T> extends BaseMapper<T, CanonicalTestCase> {
  /**
   * Map custom fields from the source system.
   * 
   * @param source The source data
   * @param context Optional transformation context
   * @returns List of mapped custom fields
   */
  mapCustomFields(source: Record<string, any>, context?: TransformationContext): CanonicalCustomField[];
  
  /**
   * Map attachments from the source system.
   * 
   * @param source The source data
   * @param context Optional transformation context
   * @returns List of mapped attachments
   */
  mapAttachments(source: Record<string, any>, context?: TransformationContext): CanonicalAttachment[];
}

/**
 * Base mapper interface for test execution entities.
 */
export interface TestExecutionMapper<T> extends BaseMapper<T, CanonicalTestExecution> {
  /**
   * Map step results from the source system.
   * 
   * @param source The source data
   * @param context Optional transformation context
   * @returns List of mapped step results
   */
  mapStepResults(source: Record<string, any>, context?: TransformationContext): any[];
}

/**
 * Base mapper interface for test suite entities.
 */
export interface TestSuiteMapper<T> extends BaseMapper<T, CanonicalTestSuite> {
  /**
   * Map test case references from the source system.
   * 
   * @param source The source data
   * @param context Optional transformation context
   * @returns List of mapped test case IDs
   */
  mapTestCases(source: Record<string, any>, context?: TransformationContext): string[];
}

/**
 * Base mapper interface for test cycle entities.
 */
export interface TestCycleMapper<T> extends BaseMapper<T, CanonicalTestCycle> {
  /**
   * Map test execution references from the source system.
   * 
   * @param source The source data
   * @param context Optional transformation context
   * @returns List of mapped test execution IDs
   */
  mapTestExecutions(source: Record<string, any>, context?: TransformationContext): string[];
}

/**
 * Registry for mappers to handle different systems and entity types.
 */
export class MapperRegistry {
  private mappers: Map<string, Map<string, BaseMapper<any, any>>> = new Map();
  
  /**
   * Register a mapper for a specific system and entity type.
   * 
   * @param systemName The system name (e.g., "zephyr", "qtest")
   * @param entityType The entity type (e.g., "test-case", "test-execution")
   * @param mapper The mapper instance
   */
  register(systemName: string, entityType: string, mapper: BaseMapper<any, any>): void {
    if (!this.mappers.has(systemName)) {
      this.mappers.set(systemName, new Map());
    }
    
    this.mappers.get(systemName)!.set(entityType, mapper);
  }
  
  /**
   * Get a mapper for a specific system and entity type.
   * 
   * @param systemName The system name
   * @param entityType The entity type
   * @returns The mapper or undefined if not found
   */
  getMapper(systemName: string, entityType: string): BaseMapper<any, any> | undefined {
    if (!this.mappers.has(systemName)) {
      return undefined;
    }
    
    return this.mappers.get(systemName)!.get(entityType);
  }
  
  /**
   * Get all registered mappers.
   * 
   * @returns Map of all mappers by system and entity type
   */
  getAllMappers(): Map<string, Map<string, BaseMapper<any, any>>> {
    return this.mappers;
  }
}

/**
 * Global mapper registry instance
 */
export const mapperRegistry = new MapperRegistry();