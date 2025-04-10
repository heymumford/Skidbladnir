/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { CircularDependencyValidator } from './CircularDependencyValidator';
import * as path from 'path';

/**
 * This test suite checks for circular dependencies in the codebase.
 * Circular dependencies are considered an anti-pattern and should be avoided.
 */
describe('Circular Dependency Check', () => {
  // Get the project root directory
  const projectRoot = path.resolve(__dirname, '../../../');
  
  describe('Domain Layer', () => {
    it('should not have circular dependencies in the domain layer', () => {
      // Check for circular dependencies in the domain layer
      const validator = CircularDependencyValidator.forDirectory(
        path.join(projectRoot, 'pkg/domain'),
        projectRoot
      );
      
      const cycles = validator.detectCircularDependencies();
      
      if (cycles.length > 0) {
        const formattedCycles = CircularDependencyValidator.formatCircularDependencies(
          cycles,
          projectRoot
        );
        
        fail(`Circular dependencies found in domain layer:\n${formattedCycles}`);
      }
      
      expect(cycles.length).toBe(0);
    });
  });
  
  describe('Use Case Layer', () => {
    it('should not have circular dependencies in the use case layer', () => {
      // Check for circular dependencies in the use case layer
      const validator = CircularDependencyValidator.forDirectory(
        path.join(projectRoot, 'pkg/usecases'),
        projectRoot
      );
      
      const cycles = validator.detectCircularDependencies();
      
      if (cycles.length > 0) {
        const formattedCycles = CircularDependencyValidator.formatCircularDependencies(
          cycles,
          projectRoot
        );
        
        fail(`Circular dependencies found in use case layer:\n${formattedCycles}`);
      }
      
      expect(cycles.length).toBe(0);
    });
  });
  
  describe('Interface Layer', () => {
    it('should not have circular dependencies in the interface layer', () => {
      // Check for circular dependencies in the interface layer
      const validator = CircularDependencyValidator.forDirectory(
        path.join(projectRoot, 'pkg/interfaces'),
        projectRoot
      );
      
      const cycles = validator.detectCircularDependencies();
      
      if (cycles.length > 0) {
        const formattedCycles = CircularDependencyValidator.formatCircularDependencies(
          cycles,
          projectRoot
        );
        
        fail(`Circular dependencies found in interface layer:\n${formattedCycles}`);
      }
      
      expect(cycles.length).toBe(0);
    });
  });
  
  describe('TypeScript Infrastructure', () => {
    it('should not have circular dependencies in the TypeScript infrastructure', () => {
      // Check for circular dependencies in the TypeScript infrastructure
      const validator = CircularDependencyValidator.forDirectory(
        path.join(projectRoot, 'internal/typescript'),
        projectRoot
      );
      
      const cycles = validator.detectCircularDependencies();
      
      if (cycles.length > 0) {
        const formattedCycles = CircularDependencyValidator.formatCircularDependencies(
          cycles,
          projectRoot
        );
        
        fail(`Circular dependencies found in TypeScript infrastructure:\n${formattedCycles}`);
      }
      
      expect(cycles.length).toBe(0);
    });
  });
  
  describe('Cross-Layer Dependencies', () => {
    it('should not have circular dependencies between layers', () => {
      // Check for circular dependencies across all TypeScript code
      const validator = CircularDependencyValidator.forDirectories(
        [
          path.join(projectRoot, 'pkg/domain'),
          path.join(projectRoot, 'pkg/usecases'),
          path.join(projectRoot, 'pkg/interfaces'),
          path.join(projectRoot, 'internal/typescript')
        ],
        projectRoot
      );
      
      const cycles = validator.detectCircularDependencies();
      
      if (cycles.length > 0) {
        const formattedCycles = CircularDependencyValidator.formatCircularDependencies(
          cycles,
          projectRoot
        );
        
        fail(`Circular dependencies found between layers:\n${formattedCycles}`);
      }
      
      expect(cycles.length).toBe(0);
    });
  });
});