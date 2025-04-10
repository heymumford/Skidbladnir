/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { 
  CollectorConfig, 
  SourceFile, 
  TestFile, 
  CoverageData,
  ArchitecturalLayer, 
  LanguageType,
  TestType,
  ArchitecturalMapping
} from '../models/types';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Base class for all test data collectors
 */
export abstract class TestCollector {
  protected config: CollectorConfig;
  protected architecturalMapping: ArchitecturalMapping | ((filePath: string) => ArchitecturalLayer);
  
  constructor(
    config: CollectorConfig,
    architecturalMapping?: ArchitecturalMapping | ((filePath: string) => ArchitecturalLayer)
  ) {
    this.config = config;
    this.architecturalMapping = architecturalMapping || this.defaultArchitecturalMapping;
  }
  
  /**
   * Default architectural mapping based on file path
   */
  protected defaultArchitecturalMapping(filePath: string): ArchitecturalLayer {
    const normalizedPath = path.normalize(filePath).toLowerCase();
    
    if (normalizedPath.includes('/domain/')) {
      return ArchitecturalLayer.DOMAIN;
    } else if (normalizedPath.includes('/usecases/') || normalizedPath.includes('/use-cases/')) {
      return ArchitecturalLayer.USE_CASE;
    } else if (
      normalizedPath.includes('/adapters/') || 
      normalizedPath.includes('/adapter/') ||
      normalizedPath.includes('/interfaces/')
    ) {
      return ArchitecturalLayer.ADAPTER;
    } else if (
      normalizedPath.includes('/infrastructure/') || 
      normalizedPath.includes('/infra/') ||
      normalizedPath.includes('/frameworks/')
    ) {
      return ArchitecturalLayer.INFRASTRUCTURE;
    }
    
    return ArchitecturalLayer.UNKNOWN;
  }
  
  /**
   * Determine architectural layer for a file
   */
  protected getArchitecturalLayer(filePath: string): ArchitecturalLayer {
    if (typeof this.architecturalMapping === 'function') {
      return this.architecturalMapping(filePath);
    } else {
      const mapping = this.architecturalMapping as ArchitecturalMapping;
      return mapping[filePath] || this.defaultArchitecturalMapping(filePath);
    }
  }
  
  /**
   * Determine test type based on file path
   */
  protected getTestType(filePath: string): TestType {
    const normalizedPath = path.normalize(filePath).toLowerCase();
    
    if (normalizedPath.includes('/unit/') || normalizedPath.includes('.unit.')) {
      return TestType.UNIT;
    } else if (normalizedPath.includes('/integration/') || normalizedPath.includes('.integration.')) {
      return TestType.INTEGRATION;
    } else if (normalizedPath.includes('/e2e/') || normalizedPath.includes('.e2e.')) {
      return TestType.E2E;
    } else if (normalizedPath.includes('/acceptance/') || normalizedPath.includes('.acceptance.')) {
      return TestType.ACCEPTANCE;
    } else if (normalizedPath.includes('/performance/') || normalizedPath.includes('.performance.')) {
      return TestType.PERFORMANCE;
    } else if (normalizedPath.includes('/contract/') || normalizedPath.includes('.contract.')) {
      return TestType.CONTRACT;
    }
    
    // Default to unit tests if we can't determine
    return TestType.UNIT;
  }
  
  /**
   * Check if file should be excluded based on patterns
   */
  protected shouldExclude(filePath: string): boolean {
    if (!this.config.excludePatterns || this.config.excludePatterns.length === 0) {
      return false;
    }
    
    return this.config.excludePatterns.some(pattern => {
      if (pattern.startsWith('*')) {
        return filePath.endsWith(pattern.substring(1));
      } else if (pattern.endsWith('*')) {
        return filePath.startsWith(pattern.substring(0, pattern.length - 1));
      } else {
        return filePath.includes(pattern);
      }
    });
  }
  
  /**
   * Check if the file is within the project's paths
   */
  protected isInProjectPaths(filePath: string, paths: string[]): boolean {
    const normalizedPath = path.normalize(filePath);
    return paths.some(p => normalizedPath.startsWith(path.normalize(p)));
  }
  
  /**
   * Collect test data for all test files
   */
  public abstract collectData(): Promise<CoverageData>;
  
  /**
   * Collect data for a specific test file
   */
  protected abstract collectTestFileData(filePath: string): Promise<TestFile>;
  
  /**
   * Collect data for a specific source file
   */
  protected abstract collectSourceFileData(filePath: string): Promise<SourceFile>;
  
  /**
   * Discover test files based on configuration
   */
  protected abstract discoverTestFiles(): Promise<string[]>;
  
  /**
   * Discover source files based on configuration
   */
  protected abstract discoverSourceFiles(): Promise<string[]>;
  
  /**
   * Check if a file is a test file
   */
  protected abstract isTestFile(filePath: string): boolean;
  
  /**
   * Get language type for this collector
   */
  public abstract getLanguageType(): LanguageType;
}