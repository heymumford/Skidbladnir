/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import * as path from 'path';
import * as fs from 'fs';
import { ArchitectureValidator } from '../architecture/ArchitectureValidator';
import { MigrateTestCasesUseCase } from '../../../pkg/usecases/migration/MigrateTestCases';

/**
 * This test suite verifies that use cases properly respect architectural boundaries
 * when interacting with providers. It checks that:
 * 
 * 1. Use cases only interact with providers through interfaces defined in the use case layer
 * 2. Use cases don't depend on provider implementations
 * 3. Provider interfaces follow interface segregation principle
 * 4. Use cases handle provider errors appropriately
 */
describe('Provider Interface Use Cases Boundary Tests', () => {
  // Get the project root directory
  const projectRoot = path.resolve(__dirname, '../../../');
  
  // Helper function to get relative path for nicer error messages
  const getRelativePath = (filePath: string) => path.relative(projectRoot, filePath);

  // Helper to parse imports from a file
  function getImportsFromFile(filePath: string): string[] {
    const content = fs.readFileSync(filePath, 'utf8');
    const imports: string[] = [];
    
    // Match import statements
    const importRegex = /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    return imports;
  }

  /**
   * Check that use cases only depend on internal interfaces or domain entities
   */
  describe('Use Case Provider Dependencies', () => {
    it('should only use provider interfaces defined within the use case', () => {
      // Find all use case files that might interact with providers
      const useCaseDir = path.join(projectRoot, 'pkg/usecases');
      const files = ArchitectureValidator.findTypeScriptFiles(useCaseDir);
      
      // For each use case file
      for (const file of files) {
        const relativePath = getRelativePath(file);
        
        // Skip files that don't mention providers
        const content = fs.readFileSync(file, 'utf8');
        if (!content.includes('Provider')) continue;
        
        // Get all imports
        const imports = getImportsFromFile(file);
        
        // Check that no imports come from provider implementations
        const providerImplImports = imports.filter(imp => 
          imp.includes('/providers/') && 
          !imp.includes('interfaces/providers/')
        );
        
        // Fail if we find any direct dependencies on provider implementations
        if (providerImplImports.length > 0) {
          fail(`Use case ${relativePath} has direct dependencies on provider implementations: ${providerImplImports.join(', ')}`);
        }
      }
    });
    
    it('should define provider interfaces within the use case file when needed', () => {
      // Find all use case files that might interact with providers
      const useCaseDir = path.join(projectRoot, 'pkg/usecases');
      const files = ArchitectureValidator.findTypeScriptFiles(useCaseDir);
      
      for (const file of files) {
        const relativePath = getRelativePath(file);
        const content = fs.readFileSync(file, 'utf8');
        
        // Skip files that don't mention providers
        if (!content.includes('Provider')) continue;
        
        // Check if the file has provider interfaces defined
        const hasProviderInterfaces = content.includes('interface') && content.includes('Provider');
        
        // Get all imports
        const imports = getImportsFromFile(file);
        
        // Check if the file imports provider interfaces
        const importsProviderInterfaces = imports.some(imp => 
          imp.includes('provider') && 
          !imp.includes('/providers/')
        );
        
        // The file should either define provider interfaces or import them properly
        // (but not from implementation packages)
        if (!hasProviderInterfaces && !importsProviderInterfaces) {
          fail(`Use case ${relativePath} uses providers but doesn't define or import appropriate interfaces`);
        }
      }
    });
  });

  /**
   * Check the specific MigrateTestCasesUseCase as an example
   */
  describe('MigrateTestCasesUseCase Provider Boundaries', () => {
    const migrateTestCasesFilePath = path.join(projectRoot, 'pkg/usecases/migration/MigrateTestCases.ts');
    
    it('should define provider interfaces with minimal required methods', () => {
      // Read the file content
      const content = fs.readFileSync(migrateTestCasesFilePath, 'utf8');
      
      // Check that it defines a TestManagementProvider interface
      expect(content).toContain('interface TestManagementProvider');
      
      // Check that the interface only declares methods used by the use case
      const methodMatches = content.match(/getTestCases|createTestCase|getTestCaseAttachments|addTestCaseAttachment|getTestCaseHistory|addTestCaseHistory/g) || [];
      expect(methodMatches.length).toBeGreaterThan(0);
      
      // Check that it doesn't import any provider implementations
      const imports = getImportsFromFile(migrateTestCasesFilePath);
      const providerImports = imports.filter(imp => imp.includes('/providers/'));
      expect(providerImports.length).toBe(0);
    });
    
    it('should only import from domain layer', () => {
      // Get all imports
      const imports = getImportsFromFile(migrateTestCasesFilePath);
      
      // All imports should be from the domain layer
      imports.forEach(imp => {
        // Check that import paths only point to domain layer
        expect(imp.startsWith('.')).toBe(true);
        expect(imp).toContain('/domain/');
      });
    });
    
    it('should use dependency injection for provider factories', () => {
      // Read the file content
      const content = fs.readFileSync(migrateTestCasesFilePath, 'utf8');
      
      // Check that the use case constructor requires provider factories
      expect(content).toContain('constructor(');
      expect(content).toContain('private readonly sourceProviderFactory: ProviderFactory');
      expect(content).toContain('private readonly targetProviderFactory: ProviderFactory');
      
      // Check that it defines a ProviderFactory interface
      expect(content).toContain('interface ProviderFactory');
    });
  });
  
  /**
   * Test that the use case properly handles errors and capabilities
   */
  describe('Provider Capability and Error Handling', () => {
    // Create mocks for testing
    const mockSourceProvider = {
      getTestCases: jest.fn(),
      createTestCase: jest.fn(),
      getTestCaseAttachments: jest.fn(),
      addTestCaseAttachment: jest.fn(),
      getTestCaseHistory: jest.fn(),
      addTestCaseHistory: jest.fn()
    };
    
    const mockTargetProvider = {
      getTestCases: jest.fn(),
      createTestCase: jest.fn(),
      getTestCaseAttachments: jest.fn(),
      addTestCaseAttachment: jest.fn(),
      getTestCaseHistory: jest.fn(),
      addTestCaseHistory: jest.fn()
    };
    
    const mockSourceFactory = {
      createProvider: jest.fn(() => mockSourceProvider)
    };
    
    const mockTargetFactory = {
      createProvider: jest.fn(() => mockTargetProvider)
    };
    
    beforeEach(() => {
      jest.clearAllMocks();
    });
    
    it('should handle provider factory errors properly', async () => {
      // Setup
      mockSourceFactory.createProvider.mockReturnValueOnce(null);
      const useCase = new MigrateTestCasesUseCase(mockSourceFactory, mockTargetFactory);
      
      // Execute & Assert
      await expect(useCase.execute({
        sourceSystem: 'invalid',
        targetSystem: 'qtest',
        projectKey: 'TEST',
        options: {
          includeAttachments: true,
          includeHistory: true,
          preserveIds: false,
          dryRun: false
        }
      })).rejects.toThrow('Provider not found');
    });
    
    it('should properly adapt to provider capabilities', async () => {
      // Setup a successful migration scenario
      mockSourceProvider.getTestCases.mockResolvedValueOnce([
        { id: 'TC-1', title: 'Test 1' },
        { id: 'TC-2', title: 'Test 2' }
      ]);
      
      mockTargetProvider.createTestCase.mockImplementation((projectKey, testCase) => {
        return Promise.resolve({
          ...testCase,
          id: `NEW-${testCase.id}`
        });
      });
      
      mockSourceProvider.getTestCaseAttachments.mockResolvedValue([]);
      mockSourceProvider.getTestCaseHistory.mockResolvedValue([]);
      
      const useCase = new MigrateTestCasesUseCase(mockSourceFactory, mockTargetFactory);
      
      // Execute
      const result = await useCase.execute({
        sourceSystem: 'zephyr',
        targetSystem: 'qtest',
        projectKey: 'TEST',
        options: {
          includeAttachments: false,  // Testing capability adaptation
          includeHistory: false,      // Testing capability adaptation
          preserveIds: false,
          dryRun: false
        }
      });
      
      // Assert
      expect(mockSourceProvider.getTestCases).toHaveBeenCalledTimes(1);
      expect(mockTargetProvider.createTestCase).toHaveBeenCalledTimes(2);
      expect(mockSourceProvider.getTestCaseAttachments).not.toHaveBeenCalled();
      expect(mockTargetProvider.addTestCaseAttachment).not.toHaveBeenCalled();
      expect(mockSourceProvider.getTestCaseHistory).not.toHaveBeenCalled();
      expect(mockTargetProvider.addTestCaseHistory).not.toHaveBeenCalled();
      
      expect(result.migratedCount).toBe(2);
      expect(result.details.migrated.length).toBe(2);
    });
    
    it('should handle provider method errors without failing the whole migration', async () => {
      // Setup
      mockSourceProvider.getTestCases.mockResolvedValueOnce([
        { id: 'TC-1', title: 'Test 1' },
        { id: 'TC-2', title: 'Test 2' }
      ]);
      
      // Make the second test case creation fail
      mockTargetProvider.createTestCase.mockImplementation((projectKey, testCase) => {
        if (testCase.id === 'TC-1') {
          return Promise.resolve({
            ...testCase,
            id: `NEW-${testCase.id}`
          });
        } else {
          return Promise.reject(new Error('Provider error during test case creation'));
        }
      });
      
      mockSourceProvider.getTestCaseAttachments.mockResolvedValue([]);
      mockSourceProvider.getTestCaseHistory.mockResolvedValue([]);
      
      const useCase = new MigrateTestCasesUseCase(mockSourceFactory, mockTargetFactory);
      
      // Execute
      const result = await useCase.execute({
        sourceSystem: 'zephyr',
        targetSystem: 'qtest',
        projectKey: 'TEST',
        options: {
          includeAttachments: true,
          includeHistory: true,
          preserveIds: false,
          dryRun: false
        }
      });
      
      // Assert
      expect(result.migratedCount).toBe(1);
      expect(result.failedCount).toBe(1);
      expect(result.details.migrated.length).toBe(1);
      expect(result.details.failed.length).toBe(1);
      expect(result.details.failed[0].error).toContain('Provider error during test case creation');
    });
  });
});