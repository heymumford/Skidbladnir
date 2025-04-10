/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { ArchitectureValidator } from './ArchitectureValidator';
import * as path from 'path';

/**
 * This test suite validates that the codebase adheres to Clean Architecture boundaries.
 * It verifies that dependencies only flow inward, never outward.
 * 
 * For example:
 * - Domain layer should not depend on Use Case, Interface, or Infrastructure layers
 * - Use Case layer should not depend on Interface or Infrastructure layers
 * - Interface layer should not depend on Infrastructure layer
 */
describe('Clean Architecture Boundaries', () => {
  // Get the project root directory
  const projectRoot = path.resolve(__dirname, '../../../');
  
  // Helper function to get relative path for nicer error messages
  const getRelativePath = (filePath: string) => path.relative(projectRoot, filePath);

  describe('Domain Layer', () => {
    it('should not depend on other layers', () => {
      // Check all TypeScript files in the domain layer
      const domainDir = path.join(projectRoot, 'pkg/domain');
      const files = ArchitectureValidator.findTypeScriptFiles(domainDir);
      
      // Validate each file
      for (const file of files) {
        const errors = ArchitectureValidator.validateFileImports(file, projectRoot);
        
        if (errors.length > 0) {
          // Create a more readable error message
          const relativePath = getRelativePath(file);
          const errorDetails = errors.map(err => `  - ${err.split('Clean Architecture violation: ')[1] || err}`).join('\n');
          
          fail(`Clean Architecture violation in ${relativePath}:\n${errorDetails}`);
        }
      }
    });
  });

  describe('Use Case Layer', () => {
    it('should only depend on the domain layer', () => {
      // Check all TypeScript files in the use case layer
      const useCaseDir = path.join(projectRoot, 'pkg/usecases');
      const files = ArchitectureValidator.findTypeScriptFiles(useCaseDir);
      
      // Validate each file
      for (const file of files) {
        const errors = ArchitectureValidator.validateFileImports(file, projectRoot);
        
        if (errors.length > 0) {
          // Create a more readable error message
          const relativePath = getRelativePath(file);
          const errorDetails = errors.map(err => `  - ${err.split('Clean Architecture violation: ')[1] || err}`).join('\n');
          
          fail(`Clean Architecture violation in ${relativePath}:\n${errorDetails}`);
        }
      }
    });
  });

  describe('Interface Layer', () => {
    it('should only depend on the domain and use case layers', () => {
      // Check all TypeScript files in the interface layer
      const interfaceDir = path.join(projectRoot, 'pkg/interfaces');
      const files = ArchitectureValidator.findTypeScriptFiles(interfaceDir);
      
      // Validate each file
      for (const file of files) {
        const errors = ArchitectureValidator.validateFileImports(file, projectRoot);
        
        if (errors.length > 0) {
          // Create a more readable error message
          const relativePath = getRelativePath(file);
          const errorDetails = errors.map(err => `  - ${err.split('Clean Architecture violation: ')[1] || err}`).join('\n');
          
          fail(`Clean Architecture violation in ${relativePath}:\n${errorDetails}`);
        }
      }
    });
  });

  describe('Full Architecture Validation', () => {
    it('should have no architectural boundary violations', () => {
      // Run a full validation on all TypeScript files
      const result = ArchitectureValidator.validateArchitecture(projectRoot);
      
      if (!result.valid) {
        // Format errors for readability
        const errorMessages = result.errors.map(err => `  - ${err}`).join('\n');
        fail(`Clean Architecture violations found:\n${errorMessages}`);
      }
      
      // If we get here, all is well
      expect(result.valid).toBe(true);
    });
  });
});