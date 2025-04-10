/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { CollectorConfig, LanguageType, ArchitecturalLayer, ArchitecturalMapping } from '../models/types';
import { TestCollector } from './collector-base';
import { TypeScriptCollector } from './typescript-collector';
import { PythonCollector } from './python-collector';
import { GoCollector } from './go-collector';

/**
 * Factory for creating appropriate test collectors
 */
export class CollectorFactory {
  /**
   * Create a test collector based on language type
   */
  public static createCollector(
    language: LanguageType,
    config: CollectorConfig,
    architecturalMapping?: ArchitecturalMapping | ((filePath: string) => ArchitecturalLayer)
  ): TestCollector {
    switch (language) {
      case LanguageType.TYPESCRIPT:
        return new TypeScriptCollector(config, architecturalMapping);
      case LanguageType.PYTHON:
        return new PythonCollector(config, architecturalMapping);
      case LanguageType.GO:
        return new GoCollector(config, architecturalMapping);
      default:
        throw new Error(`Collector for language ${language} not implemented yet`);
    }
  }
  
  /**
   * Create all available collectors for a project
   */
  public static createAllCollectors(
    config: CollectorConfig,
    architecturalMapping?: ArchitecturalMapping | ((filePath: string) => ArchitecturalLayer),
    languages?: LanguageType[]
  ): TestCollector[] {
    // Use all languages if not specified
    const languagesToUse = languages || [
      LanguageType.TYPESCRIPT,
      LanguageType.PYTHON,
      LanguageType.GO
    ];
    
    const collectors: TestCollector[] = [];
    
    for (const language of languagesToUse) {
      try {
        const collector = this.createCollector(language, config, architecturalMapping);
        collectors.push(collector);
      } catch (error) {
        console.warn(`Could not create collector for language ${language}:`, error);
      }
    }
    
    return collectors;
  }
}