/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { PolyglotArchitectureValidator } from './PolyglotArchitectureValidator';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('PolyglotArchitectureValidator', () => {
  describe('getPythonImports', () => {
    let tempDir: string;
    let testFilePath: string;

    beforeEach(() => {
      // Create a temporary directory and test file
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'polyglot-validator-test-'));
      testFilePath = path.join(tempDir, 'test_file.py');
    });

    afterEach(() => {
      // Clean up
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('should extract Python imports correctly', () => {
      const content = `
import os
import sys
from pathlib import Path
from skidbladnir.pkg.domain.entities import TestCase
from skidbladnir.pkg.usecases.migration import migrate_test_cases
import skidbladnir.internal.python.orchestrator.api as api
from typing import List, Dict, Optional
`;
      
      fs.writeFileSync(testFilePath, content);
      
      const imports = PolyglotArchitectureValidator.getPythonImports(testFilePath);
      
      // Sort the imports as the order might vary based on implementation
      expect([...imports].sort()).toEqual([
        'os',
        'pathlib', 
        'skidbladnir.internal.python.orchestrator.api',
        'skidbladnir.pkg.domain.entities',
        'skidbladnir.pkg.usecases.migration',
        'sys',
        'typing'
      ].sort());
    });

    it('should handle Python files with no imports', () => {
      const content = `
# No imports here
def test_function():
    return "Hello World"
    
class TestClass:
    def __init__(self):
        self.value = 42
`;
      
      fs.writeFileSync(testFilePath, content);
      
      const imports = PolyglotArchitectureValidator.getPythonImports(testFilePath);
      
      expect(imports).toEqual([]);
    });
  });

  describe('getGoImports', () => {
    let tempDir: string;
    let testFilePath: string;

    beforeEach(() => {
      // Create a temporary directory and test file
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'polyglot-validator-test-'));
      testFilePath = path.join(tempDir, 'test_file.go');
    });

    afterEach(() => {
      // Clean up
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('should extract single-line Go imports correctly', () => {
      const content = `
package main

import "fmt"
import "os"
import "github.com/heymumford/skidbladnir/pkg/domain/entities"

func main() {
    fmt.Println("Hello, World!")
}
`;
      
      fs.writeFileSync(testFilePath, content);
      
      const imports = PolyglotArchitectureValidator.getGoImports(testFilePath);
      
      expect(imports).toEqual([
        'fmt',
        'os',
        'github.com/heymumford/skidbladnir/pkg/domain/entities'
      ]);
    });

    it('should extract grouped Go imports correctly', () => {
      const content = `
package main

import (
    "fmt"
    "os"
    "path/filepath"
    
    "github.com/heymumford/skidbladnir/pkg/domain/entities"
    "github.com/heymumford/skidbladnir/internal/go/binary-processor/storage"
)

func main() {
    fmt.Println("Hello, World!")
}
`;
      
      fs.writeFileSync(testFilePath, content);
      
      const imports = PolyglotArchitectureValidator.getGoImports(testFilePath);
      
      expect(imports).toEqual([
        'fmt',
        'os',
        'path/filepath',
        'github.com/heymumford/skidbladnir/pkg/domain/entities',
        'github.com/heymumford/skidbladnir/internal/go/binary-processor/storage'
      ]);
    });

    it('should handle Go files with no imports', () => {
      const content = `
package main

func main() {
    println("Hello, World!")
}
`;
      
      fs.writeFileSync(testFilePath, content);
      
      const imports = PolyglotArchitectureValidator.getGoImports(testFilePath);
      
      expect(imports).toEqual([]);
    });
  });

  describe('getLayerForPythonImport', () => {
    it('should correctly identify domain layer imports', () => {
      expect(PolyglotArchitectureValidator.getLayerForPythonImport('skidbladnir.pkg.domain.entities')).toBe('domain');
      expect(PolyglotArchitectureValidator.getLayerForPythonImport('skidbladnir.pkg.domain.services.test_case_service')).toBe('domain');
    });

    it('should correctly identify use case layer imports', () => {
      expect(PolyglotArchitectureValidator.getLayerForPythonImport('skidbladnir.pkg.usecases.migration')).toBe('usecases');
      expect(PolyglotArchitectureValidator.getLayerForPythonImport('skidbladnir.pkg.usecases.advisory.test_case_generator')).toBe('usecases');
    });

    it('should correctly identify interface layer imports', () => {
      expect(PolyglotArchitectureValidator.getLayerForPythonImport('skidbladnir.pkg.interfaces.api')).toBe('interfaces');
      expect(PolyglotArchitectureValidator.getLayerForPythonImport('skidbladnir.pkg.interfaces.persistence')).toBe('interfaces');
    });

    it('should correctly identify infrastructure layer imports', () => {
      expect(PolyglotArchitectureValidator.getLayerForPythonImport('skidbladnir.internal.python.orchestrator')).toBe('infrastructure');
      expect(PolyglotArchitectureValidator.getLayerForPythonImport('skidbladnir.cmd.api')).toBe('infrastructure');
    });

    it('should return undefined for external imports', () => {
      expect(PolyglotArchitectureValidator.getLayerForPythonImport('os')).toBeUndefined();
      expect(PolyglotArchitectureValidator.getLayerForPythonImport('django.http')).toBeUndefined();
    });
  });

  describe('getLayerForGoImport', () => {
    it('should correctly identify domain layer imports', () => {
      expect(PolyglotArchitectureValidator.getLayerForGoImport('github.com/heymumford/skidbladnir/pkg/domain/entities')).toBe('domain');
      expect(PolyglotArchitectureValidator.getLayerForGoImport('github.com/heymumford/skidbladnir/pkg/domain/services')).toBe('domain');
    });

    it('should correctly identify use case layer imports', () => {
      expect(PolyglotArchitectureValidator.getLayerForGoImport('github.com/heymumford/skidbladnir/pkg/usecases/migration')).toBe('usecases');
      expect(PolyglotArchitectureValidator.getLayerForGoImport('github.com/heymumford/skidbladnir/pkg/usecases/advisory')).toBe('usecases');
    });

    it('should correctly identify interface layer imports', () => {
      expect(PolyglotArchitectureValidator.getLayerForGoImport('github.com/heymumford/skidbladnir/pkg/interfaces/api')).toBe('interfaces');
      expect(PolyglotArchitectureValidator.getLayerForGoImport('github.com/heymumford/skidbladnir/pkg/interfaces/persistence')).toBe('interfaces');
    });

    it('should correctly identify infrastructure layer imports', () => {
      expect(PolyglotArchitectureValidator.getLayerForGoImport('github.com/heymumford/skidbladnir/internal/go/binary-processor')).toBe('infrastructure');
      expect(PolyglotArchitectureValidator.getLayerForGoImport('github.com/heymumford/skidbladnir/cmd/binary-processor')).toBe('infrastructure');
    });

    it('should return undefined for external imports', () => {
      expect(PolyglotArchitectureValidator.getLayerForGoImport('fmt')).toBeUndefined();
      expect(PolyglotArchitectureValidator.getLayerForGoImport('github.com/gin-gonic/gin')).toBeUndefined();
    });
  });

  describe('isDependencyAllowed', () => {
    it('should allow same layer dependencies', () => {
      expect(PolyglotArchitectureValidator.isDependencyAllowed('domain', 'domain')).toBe(true);
      expect(PolyglotArchitectureValidator.isDependencyAllowed('usecases', 'usecases')).toBe(true);
      expect(PolyglotArchitectureValidator.isDependencyAllowed('interfaces', 'interfaces')).toBe(true);
      expect(PolyglotArchitectureValidator.isDependencyAllowed('infrastructure', 'infrastructure')).toBe(true);
    });

    it('should allow dependencies that point inward', () => {
      expect(PolyglotArchitectureValidator.isDependencyAllowed('usecases', 'domain')).toBe(true);
      expect(PolyglotArchitectureValidator.isDependencyAllowed('interfaces', 'domain')).toBe(true);
      expect(PolyglotArchitectureValidator.isDependencyAllowed('interfaces', 'usecases')).toBe(true);
      expect(PolyglotArchitectureValidator.isDependencyAllowed('infrastructure', 'domain')).toBe(true);
      expect(PolyglotArchitectureValidator.isDependencyAllowed('infrastructure', 'usecases')).toBe(true);
      expect(PolyglotArchitectureValidator.isDependencyAllowed('infrastructure', 'interfaces')).toBe(true);
    });

    it('should not allow dependencies that point outward', () => {
      expect(PolyglotArchitectureValidator.isDependencyAllowed('domain', 'usecases')).toBe(false);
      expect(PolyglotArchitectureValidator.isDependencyAllowed('domain', 'interfaces')).toBe(false);
      expect(PolyglotArchitectureValidator.isDependencyAllowed('domain', 'infrastructure')).toBe(false);
      expect(PolyglotArchitectureValidator.isDependencyAllowed('usecases', 'interfaces')).toBe(false);
      expect(PolyglotArchitectureValidator.isDependencyAllowed('usecases', 'infrastructure')).toBe(false);
      expect(PolyglotArchitectureValidator.isDependencyAllowed('interfaces', 'infrastructure')).toBe(false);
    });
  });

  describe('findFiles', () => {
    let tempDir: string;

    beforeEach(() => {
      // Create a temporary directory with some test files
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'polyglot-validator-test-'));
      
      // Create some directories and files
      fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
      fs.mkdirSync(path.join(tempDir, 'src', 'python'), { recursive: true });
      fs.mkdirSync(path.join(tempDir, 'src', 'go'), { recursive: true });
      fs.mkdirSync(path.join(tempDir, 'node_modules'), { recursive: true });
      fs.mkdirSync(path.join(tempDir, 'src', 'python', '__pycache__'), { recursive: true });
      
      fs.writeFileSync(path.join(tempDir, 'src', 'python', 'file1.py'), '');
      fs.writeFileSync(path.join(tempDir, 'src', 'python', 'file2.txt'), '');
      fs.writeFileSync(path.join(tempDir, 'src', 'python', '__pycache__', 'file3.pyc'), '');
      fs.writeFileSync(path.join(tempDir, 'src', 'go', 'file4.go'), '');
      fs.writeFileSync(path.join(tempDir, 'node_modules', 'file5.py'), '');
    });

    afterEach(() => {
      // Clean up
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('should find Python files correctly excluding __pycache__ and node_modules', () => {
      const files = PolyglotArchitectureValidator.findFiles(tempDir, '.py');
      
      // Normalize paths for comparison
      const normalizedFiles = files.map(file => path.relative(tempDir, file));
      const expected = [
        path.join('src', 'python', 'file1.py')
      ];
      
      expect(normalizedFiles.sort()).toEqual(expected.sort());
    });

    it('should find Go files correctly', () => {
      const files = PolyglotArchitectureValidator.findFiles(tempDir, '.go');
      
      // Normalize paths for comparison
      const normalizedFiles = files.map(file => path.relative(tempDir, file));
      const expected = [
        path.join('src', 'go', 'file4.go')
      ];
      
      expect(normalizedFiles.sort()).toEqual(expected.sort());
    });
  });
});