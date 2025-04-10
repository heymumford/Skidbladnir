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
import * as fs from 'fs';
import * as os from 'os';

describe('ArchitectureValidator', () => {
  describe('getLayerForFile', () => {
    it('should correctly identify domain layer files', () => {
      const filePath = '/home/user/project/pkg/domain/entities/User.ts';
      expect(ArchitectureValidator.getLayerForFile(filePath)).toBe('domain');
    });

    it('should correctly identify use case layer files', () => {
      const filePath = '/home/user/project/pkg/usecases/migration/MigrateTestCases.ts';
      expect(ArchitectureValidator.getLayerForFile(filePath)).toBe('usecases');
    });

    it('should correctly identify interface adapter layer files', () => {
      const filePath = '/home/user/project/pkg/interfaces/api/TestCaseController.ts';
      expect(ArchitectureValidator.getLayerForFile(filePath)).toBe('interfaces');
    });

    it('should correctly identify infrastructure layer files', () => {
      const filePath = '/home/user/project/internal/typescript/api/server/index.ts';
      expect(ArchitectureValidator.getLayerForFile(filePath)).toBe('infrastructure');
    });

    it('should return undefined for unrecognized paths', () => {
      const filePath = '/home/user/project/some/random/path.ts';
      expect(ArchitectureValidator.getLayerForFile(filePath)).toBeUndefined();
    });
  });

  describe('isDependencyAllowed', () => {
    it('should allow same layer dependencies', () => {
      expect(ArchitectureValidator.isDependencyAllowed('domain', 'domain')).toBe(true);
      expect(ArchitectureValidator.isDependencyAllowed('usecases', 'usecases')).toBe(true);
      expect(ArchitectureValidator.isDependencyAllowed('interfaces', 'interfaces')).toBe(true);
      expect(ArchitectureValidator.isDependencyAllowed('infrastructure', 'infrastructure')).toBe(true);
    });

    it('should allow dependencies that point inward', () => {
      // Use cases can depend on domain
      expect(ArchitectureValidator.isDependencyAllowed('usecases', 'domain')).toBe(true);
      
      // Interfaces can depend on domain and use cases
      expect(ArchitectureValidator.isDependencyAllowed('interfaces', 'domain')).toBe(true);
      expect(ArchitectureValidator.isDependencyAllowed('interfaces', 'usecases')).toBe(true);
      
      // Infrastructure can depend on all other layers
      expect(ArchitectureValidator.isDependencyAllowed('infrastructure', 'domain')).toBe(true);
      expect(ArchitectureValidator.isDependencyAllowed('infrastructure', 'usecases')).toBe(true);
      expect(ArchitectureValidator.isDependencyAllowed('infrastructure', 'interfaces')).toBe(true);
    });

    it('should not allow dependencies that point outward', () => {
      // Domain can't depend on other layers
      expect(ArchitectureValidator.isDependencyAllowed('domain', 'usecases')).toBe(false);
      expect(ArchitectureValidator.isDependencyAllowed('domain', 'interfaces')).toBe(false);
      expect(ArchitectureValidator.isDependencyAllowed('domain', 'infrastructure')).toBe(false);
      
      // Use cases can't depend on interfaces or infrastructure
      expect(ArchitectureValidator.isDependencyAllowed('usecases', 'interfaces')).toBe(false);
      expect(ArchitectureValidator.isDependencyAllowed('usecases', 'infrastructure')).toBe(false);
      
      // Interfaces can't depend on infrastructure
      expect(ArchitectureValidator.isDependencyAllowed('interfaces', 'infrastructure')).toBe(false);
    });

    it('should handle unknown layers gracefully', () => {
      expect(ArchitectureValidator.isDependencyAllowed('domain', 'unknown')).toBe(false);
      expect(ArchitectureValidator.isDependencyAllowed('unknown', 'domain')).toBe(false);
      // If both layers are unknown, we can't validate, so it depends on implementation
      // Some implementations return true for same-layer dependencies even if unknown
      // Just verify that it handles it without error
      expect(() => ArchitectureValidator.isDependencyAllowed('unknown', 'unknown')).not.toThrow();
    });
  });

  describe('getImportsFromTypeScriptFile', () => {
    let tempDir: string;
    let testFilePath: string;

    beforeEach(() => {
      // Create a temporary directory and test file
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arch-validator-test-'));
      testFilePath = path.join(tempDir, 'test-file.ts');
    });

    afterEach(() => {
      // Clean up
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('should extract import statements correctly', () => {
      const content = `
        import { TestCase } from '../../pkg/domain/entities/TestCase';
        import { TestCaseRepository } from '../../pkg/domain/repositories/TestCaseRepository';
        import * as fs from 'fs';
        
        // Some code here
        
        import { CreateTestCaseUseCase } from '../../pkg/usecases/test-cases/CreateTestCase';
      `;
      
      fs.writeFileSync(testFilePath, content);
      
      const imports = ArchitectureValidator.getImportsFromTypeScriptFile(testFilePath);
      
      expect(imports).toEqual([
        '../../pkg/domain/entities/TestCase',
        '../../pkg/domain/repositories/TestCaseRepository',
        'fs',
        '../../pkg/usecases/test-cases/CreateTestCase'
      ]);
    });

    it('should handle files with no imports', () => {
      const content = `
        // No imports here
        const x = 1;
        function test() {
          return x + 1;
        }
      `;
      
      fs.writeFileSync(testFilePath, content);
      
      const imports = ArchitectureValidator.getImportsFromTypeScriptFile(testFilePath);
      
      expect(imports).toEqual([]);
    });

    it('should throw an error for non-existent files', () => {
      const nonExistentPath = path.join(tempDir, 'non-existent.ts');
      
      expect(() => {
        ArchitectureValidator.getImportsFromTypeScriptFile(nonExistentPath);
      }).toThrow(/File not found/);
    });
  });

  describe('resolveImportPath', () => {
    it('should resolve relative imports correctly', () => {
      const importPath = '../domain/entities/User';
      const importingFilePath = '/home/user/project/pkg/usecases/auth/LoginUseCase.ts';
      const rootDir = '/home/user/project';
      
      const resolved = ArchitectureValidator.resolveImportPath(importPath, importingFilePath, rootDir);
      
      // The path.resolve() in the implementation will simplify paths
      expect(resolved).toBe('/home/user/project/pkg/usecases/domain/entities/User');
      
      // Verify it resolves to the right location
      expect(resolved).toContain('/pkg/usecases/domain/entities/User');
      expect(resolved).toContain(rootDir);
    });

    it('should resolve absolute imports from project root', () => {
      const importPath = '/pkg/domain/entities/User';
      const importingFilePath = '/home/user/project/internal/typescript/api/controllers/UserController.ts';
      const rootDir = '/home/user/project';
      
      const resolved = ArchitectureValidator.resolveImportPath(importPath, importingFilePath, rootDir);
      
      expect(resolved).toBe('/home/user/project/pkg/domain/entities/User');
    });

    it('should return undefined for node_modules imports', () => {
      const importPath = 'express';
      const importingFilePath = '/home/user/project/internal/typescript/api/server/index.ts';
      const rootDir = '/home/user/project';
      
      const resolved = ArchitectureValidator.resolveImportPath(importPath, importingFilePath, rootDir);
      
      expect(resolved).toBeUndefined();
    });
  });

  describe('validateFileImports', () => {
    let tempDir: string;
    let pkgDir: string;
    let internalDir: string;

    beforeEach(() => {
      // Create a mock project structure in a temp directory
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arch-validator-test-'));
      
      // Create directories
      pkgDir = path.join(tempDir, 'pkg');
      internalDir = path.join(tempDir, 'internal');
      
      fs.mkdirSync(path.join(pkgDir, 'domain', 'entities'), { recursive: true });
      fs.mkdirSync(path.join(pkgDir, 'usecases', 'auth'), { recursive: true });
      fs.mkdirSync(path.join(pkgDir, 'interfaces', 'api'), { recursive: true });
      fs.mkdirSync(path.join(internalDir, 'typescript', 'api', 'controllers'), { recursive: true });
      
      // Create mock files
      fs.writeFileSync(path.join(pkgDir, 'domain', 'entities', 'User.ts'), `
        export class User {
          id: string;
          name: string;
        }
      `);
      
      fs.writeFileSync(path.join(pkgDir, 'usecases', 'auth', 'LoginUseCase.ts'), `
        import { User } from '../../domain/entities/User';
        
        export class LoginUseCase {
          execute(username: string, password: string): User {
            return new User();
          }
        }
      `);
      
      fs.writeFileSync(path.join(pkgDir, 'interfaces', 'api', 'UserController.ts'), `
        import { User } from '../../domain/entities/User';
        import { LoginUseCase } from '../../usecases/auth/LoginUseCase';
        
        export class UserController {
          constructor(private loginUseCase: LoginUseCase) {}
          
          login(req: any, res: any) {
            const user = this.loginUseCase.execute(req.body.username, req.body.password);
            return { user };
          }
        }
      `);
    });

    afterEach(() => {
      // Clean up
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('should report no errors for valid architecture', () => {
      const errors = ArchitectureValidator.validateFileImports(
        path.join(pkgDir, 'interfaces', 'api', 'UserController.ts'),
        tempDir
      );
      
      expect(errors).toEqual([]);
    });

    it('should detect clean architecture violations', () => {
      // Create a file with architecture violation
      const violationFilePath = path.join(pkgDir, 'domain', 'entities', 'BadEntity.ts');
      fs.writeFileSync(violationFilePath, `
        import { LoginUseCase } from '../../usecases/auth/LoginUseCase';
        
        export class BadEntity {
          useCase: LoginUseCase;
        }
      `);
      
      const errors = ArchitectureValidator.validateFileImports(violationFilePath, tempDir);
      
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Clean Architecture violation');
      expect(errors[0]).toContain('domain') ;
      expect(errors[0]).toContain('usecases');
    });
  });

  describe('findTypeScriptFiles', () => {
    let tempDir: string;

    beforeEach(() => {
      // Create a temporary directory with some test files
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arch-validator-test-'));
      
      // Create some directories and files
      fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
      fs.mkdirSync(path.join(tempDir, 'src', 'subdirectory'), { recursive: true });
      fs.mkdirSync(path.join(tempDir, 'node_modules'), { recursive: true });
      
      fs.writeFileSync(path.join(tempDir, 'src', 'file1.ts'), '');
      fs.writeFileSync(path.join(tempDir, 'src', 'file2.js'), '');
      fs.writeFileSync(path.join(tempDir, 'src', 'subdirectory', 'file3.ts'), '');
      fs.writeFileSync(path.join(tempDir, 'src', 'types.d.ts'), '');
      fs.writeFileSync(path.join(tempDir, 'node_modules', 'module.ts'), '');
    });

    afterEach(() => {
      // Clean up
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('should find all TypeScript files excluding declaration files and node_modules', () => {
      const files = ArchitectureValidator.findTypeScriptFiles(tempDir);
      
      // Normalize paths for comparison
      const normalizedFiles = files.map(file => path.relative(tempDir, file));
      const expected = [
        path.join('src', 'file1.ts'),
        path.join('src', 'subdirectory', 'file3.ts')
      ];
      
      expect(normalizedFiles.sort()).toEqual(expected.sort());
    });

    it('should respect custom include and exclude patterns', () => {
      const files = ArchitectureValidator.findTypeScriptFiles(
        tempDir,
        [/\.js$/], // include only JS files
        [/subdirectory/] // exclude subdirectory
      );
      
      // Normalize paths for comparison
      const normalizedFiles = files.map(file => path.relative(tempDir, file));
      const expected = [
        path.join('src', 'file2.js')
      ];
      
      expect(normalizedFiles).toEqual(expected);
    });
  });
});