/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

/**
 * Provides utilities for validating architecture in a polyglot codebase,
 * supporting TypeScript, Python, and Go code.
 */
export class PolyglotArchitectureValidator {
  /**
   * Extracts imports from a Python file
   * 
   * @param filePath - Path to the Python file
   * @returns Array of import strings
   */
  public static getPythonImports(filePath: string): string[] {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const imports: string[] = [];
    
    // Match different import patterns
    const importRegex = /^\s*import\s+(\S+)(?:\s+as\s+\S+)?/gm;
    const fromImportRegex = /^\s*from\s+(\S+)\s+import/gm;
    
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    while ((match = fromImportRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    return imports;
  }

  /**
   * Extracts imports from a Go file
   * 
   * @param filePath - Path to the Go file
   * @returns Array of import strings
   */
  public static getGoImports(filePath: string): string[] {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const imports: string[] = [];
    
    // Match both single and grouped imports
    const singleImportRegex = /^\s*import\s+"([^"]+)"/gm;
    const groupedImportStart = /^\s*import\s+\(/;
    const groupedImportEnd = /^\s*\)/;
    const groupedImportItem = /^\s*"([^"]+)"/;
    
    // Match single imports
    let match;
    while ((match = singleImportRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    // Match grouped imports
    const lines = content.split('\n');
    let inGroup = false;
    
    for (const line of lines) {
      if (!inGroup) {
        if (groupedImportStart.test(line)) {
          inGroup = true;
        }
      } else {
        if (groupedImportEnd.test(line)) {
          inGroup = false;
          continue;
        }
        
        const importMatch = line.match(groupedImportItem);
        if (importMatch) {
          imports.push(importMatch[1]);
        }
      }
    }
    
    return imports;
  }

  /**
   * Maps a Go import path to the corresponding layer
   * 
   * @param importPath - The Go import path
   * @returns The architectural layer or undefined
   */
  public static getLayerForGoImport(importPath: string): string | undefined {
    // Patterns to identify Go packages with their corresponding layers
    const patterns = [
      { pattern: /github\.com\/heymumford\/skidbladnir\/pkg\/domain/i, layer: 'domain' },
      { pattern: /github\.com\/heymumford\/skidbladnir\/pkg\/usecases/i, layer: 'usecases' },
      { pattern: /github\.com\/heymumford\/skidbladnir\/pkg\/interfaces/i, layer: 'interfaces' },
      { pattern: /github\.com\/heymumford\/skidbladnir\/internal\/go/i, layer: 'infrastructure' },
      { pattern: /github\.com\/heymumford\/skidbladnir\/cmd/i, layer: 'infrastructure' },
    ];
    
    for (const { pattern, layer } of patterns) {
      if (pattern.test(importPath)) {
        return layer;
      }
    }
    
    return undefined;
  }

  /**
   * Maps a Python import path to the corresponding layer
   * 
   * @param importPath - The Python import path
   * @returns The architectural layer or undefined
   */
  public static getLayerForPythonImport(importPath: string): string | undefined {
    // Patterns to identify Python packages with their corresponding layers
    const patterns = [
      { pattern: /^skidbladnir\.pkg\.domain/i, layer: 'domain' },
      { pattern: /^skidbladnir\.pkg\.usecases/i, layer: 'usecases' },
      { pattern: /^skidbladnir\.pkg\.interfaces/i, layer: 'interfaces' },
      { pattern: /^skidbladnir\.internal\.python/i, layer: 'infrastructure' },
      { pattern: /^skidbladnir\.cmd/i, layer: 'infrastructure' },
    ];
    
    for (const { pattern, layer } of patterns) {
      if (pattern.test(importPath)) {
        return layer;
      }
    }
    
    return undefined;
  }

  /**
   * Verifies import compliance for Python files
   * 
   * @param filePath - Path to the Python file
   * @param rootDir - Root directory of the project
   * @returns Array of validation errors
   */
  public static validatePythonFile(filePath: string, rootDir: string): string[] {
    const errors: string[] = [];
    let fileLayer: string | undefined;
    
    // Determine the layer of the file
    if (filePath.includes('/pkg/domain/')) {
      fileLayer = 'domain';
    } else if (filePath.includes('/pkg/usecases/')) {
      fileLayer = 'usecases';
    } else if (filePath.includes('/pkg/interfaces/')) {
      fileLayer = 'interfaces';
    } else if (filePath.includes('/internal/python/') || filePath.includes('/cmd/')) {
      fileLayer = 'infrastructure';
    }
    
    if (!fileLayer) {
      return [`Could not determine layer for file: ${filePath}`];
    }
    
    // Get imports
    const imports = this.getPythonImports(filePath);
    
    // Check each import
    for (const importPath of imports) {
      const importLayer = this.getLayerForPythonImport(importPath);
      
      // Skip external modules
      if (!importLayer) {
        continue;
      }
      
      // Check if the dependency is allowed
      const isAllowed = this.isDependencyAllowed(fileLayer, importLayer);
      
      if (!isAllowed) {
        errors.push(
          `Clean Architecture violation: ${filePath} (${fileLayer}) ` +
          `imports ${importPath} (${importLayer}). ` +
          `The ${fileLayer} layer should not depend on the ${importLayer} layer.`
        );
      }
    }
    
    return errors;
  }

  /**
   * Verifies import compliance for Go files
   * 
   * @param filePath - Path to the Go file
   * @param rootDir - Root directory of the project
   * @returns Array of validation errors
   */
  public static validateGoFile(filePath: string, rootDir: string): string[] {
    const errors: string[] = [];
    let fileLayer: string | undefined;
    
    // Determine the layer of the file
    if (filePath.includes('/pkg/domain/')) {
      fileLayer = 'domain';
    } else if (filePath.includes('/pkg/usecases/')) {
      fileLayer = 'usecases';
    } else if (filePath.includes('/pkg/interfaces/')) {
      fileLayer = 'interfaces';
    } else if (filePath.includes('/internal/go/') || filePath.includes('/cmd/')) {
      fileLayer = 'infrastructure';
    }
    
    if (!fileLayer) {
      return [`Could not determine layer for file: ${filePath}`];
    }
    
    // Get imports
    const imports = this.getGoImports(filePath);
    
    // Check each import
    for (const importPath of imports) {
      const importLayer = this.getLayerForGoImport(importPath);
      
      // Skip external modules
      if (!importLayer) {
        continue;
      }
      
      // Check if the dependency is allowed
      const isAllowed = this.isDependencyAllowed(fileLayer, importLayer);
      
      if (!isAllowed) {
        errors.push(
          `Clean Architecture violation: ${filePath} (${fileLayer}) ` +
          `imports ${importPath} (${importLayer}). ` +
          `The ${fileLayer} layer should not depend on the ${importLayer} layer.`
        );
      }
    }
    
    return errors;
  }

  /**
   * Checks if a dependency from one layer to another is allowed by clean architecture
   * Duplicate of ArchitectureValidator.isDependencyAllowed
   * 
   * @param fromLayer - The layer importing the dependency
   * @param toLayer - The layer being imported
   * @returns True if the dependency is allowed, false otherwise 
   */
  public static isDependencyAllowed(fromLayer: string, toLayer: string): boolean {
    if (fromLayer === toLayer) {
      // Same layer dependencies are allowed
      return true;
    }

    const layerOrder = ['domain', 'usecases', 'interfaces', 'infrastructure'];

    const fromIndex = layerOrder.indexOf(fromLayer);
    const toIndex = layerOrder.indexOf(toLayer);

    if (fromIndex === -1 || toIndex === -1) {
      // If either layer is not recognized, we can't validate
      return false;
    }

    // In clean architecture, dependencies can only point inward
    // So the 'from' layer index must be greater than the 'to' layer index
    return fromIndex > toIndex;
  }

  /**
   * Recursively finds all files of a specific type
   * 
   * @param directory - The directory to search
   * @param extension - The file extension to look for (e.g., '.py', '.go')
   * @param excludePatterns - Optional regex patterns to exclude files
   * @returns An array of file paths
   */
  public static findFiles(
    directory: string,
    extension: string,
    excludePatterns: RegExp[] = [/node_modules/, /dist/, /\.git/, /\/__pycache__\//]
  ): string[] {
    let files: string[] = [];
    
    if (!fs.existsSync(directory)) {
      return files;
    }
    
    const entries = fs.readdirSync(directory, { withFileTypes: true });
    
    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name);
      
      // Skip excluded paths
      if (excludePatterns.some(pattern => pattern.test(entryPath))) {
        continue;
      }
      
      if (entry.isDirectory()) {
        const subFiles = this.findFiles(entryPath, extension, excludePatterns);
        files = files.concat(subFiles);
      } else if (entry.isFile() && entryPath.endsWith(extension)) {
        files.push(entryPath);
      }
    }
    
    return files;
  }

  /**
   * Verifies architectural compliance for a polyglot codebase
   * 
   * @param rootDir - Root directory of the project
   * @returns Validation results for each language
   */
  public static validatePolyglotArchitecture(rootDir: string): {
    typescript: { valid: boolean; errors: string[] };
    python: { valid: boolean; errors: string[] };
    go: { valid: boolean; errors: string[] };
  } {
    const typescriptErrors: string[] = [];
    const pythonErrors: string[] = [];
    const goErrors: string[] = [];
    
    // Validate TypeScript files
    try {
      // Use ArchitectureValidator for TypeScript validation
      const tsResult = ArchitectureValidator.validateArchitecture(rootDir);
      typescriptErrors.push(...tsResult.errors);
    } catch (error) {
      typescriptErrors.push(`Error validating TypeScript files: ${error}`);
    }
    
    // Validate Python files
    try {
      const pythonFiles = this.findFiles(rootDir, '.py');
      
      for (const file of pythonFiles) {
        const errors = this.validatePythonFile(file, rootDir);
        pythonErrors.push(...errors);
      }
    } catch (error) {
      pythonErrors.push(`Error validating Python files: ${error}`);
    }
    
    // Validate Go files
    try {
      const goFiles = this.findFiles(rootDir, '.go');
      
      for (const file of goFiles) {
        const errors = this.validateGoFile(file, rootDir);
        goErrors.push(...errors);
      }
    } catch (error) {
      goErrors.push(`Error validating Go files: ${error}`);
    }
    
    return {
      typescript: { valid: typescriptErrors.length === 0, errors: typescriptErrors },
      python: { valid: pythonErrors.length === 0, errors: pythonErrors },
      go: { valid: goErrors.length === 0, errors: goErrors }
    };
  }
}