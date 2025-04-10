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
import * as ts from 'typescript';

/**
 * Provides utilities for validating clean architecture boundaries in the codebase.
 * This validator ensures that dependencies only flow inward, from outer layers to inner layers,
 * but never from inner to outer layers.
 */
export class ArchitectureValidator {
  /**
   * Layer definitions in order from innermost to outermost
   */
  private static readonly LAYERS = {
    DOMAIN: 'domain',
    USE_CASES: 'usecases',
    INTERFACES: 'interfaces',
    INFRASTRUCTURE: 'infrastructure' 
  };

  /**
   * Maps layer names to their base directories in the codebase
   */
  private static readonly LAYER_DIRECTORIES = {
    [ArchitectureValidator.LAYERS.DOMAIN]: ['/pkg/domain/'],
    [ArchitectureValidator.LAYERS.USE_CASES]: ['/pkg/usecases/'],
    [ArchitectureValidator.LAYERS.INTERFACES]: ['/pkg/interfaces/'],
    [ArchitectureValidator.LAYERS.INFRASTRUCTURE]: [
      '/internal/typescript/',
      '/internal/python/',
      '/internal/go/',
      '/cmd/',
    ]
  };

  /**
   * Maps file path patterns to their corresponding architectural layers
   */
  private static readonly PATH_TO_LAYER_MAP = new Map<RegExp, string>([
    // Domain layer
    [/\/pkg\/domain\//i, ArchitectureValidator.LAYERS.DOMAIN],
    
    // Use cases layer 
    [/\/pkg\/usecases\//i, ArchitectureValidator.LAYERS.USE_CASES],
    
    // Interface adapters layer
    [/\/pkg\/interfaces\//i, ArchitectureValidator.LAYERS.INTERFACES],
    
    // Infrastructure layer
    [/\/internal\/typescript\//i, ArchitectureValidator.LAYERS.INFRASTRUCTURE],
    [/\/internal\/python\//i, ArchitectureValidator.LAYERS.INFRASTRUCTURE],
    [/\/internal\/go\//i, ArchitectureValidator.LAYERS.INFRASTRUCTURE],
    [/\/cmd\//i, ArchitectureValidator.LAYERS.INFRASTRUCTURE]
  ]);

  /**
   * Gets the clean architecture layer for a given file path
   * 
   * @param filePath - The absolute path to the file
   * @returns The layer name or undefined if not in a recognized layer
   */
  public static getLayerForFile(filePath: string): string | undefined {
    for (const [pattern, layer] of ArchitectureValidator.PATH_TO_LAYER_MAP) {
      if (pattern.test(filePath)) {
        return layer;
      }
    }
    return undefined;
  }

  /**
   * Checks if a dependency from one layer to another is allowed by clean architecture
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

    const layerOrder = [
      ArchitectureValidator.LAYERS.DOMAIN,
      ArchitectureValidator.LAYERS.USE_CASES,
      ArchitectureValidator.LAYERS.INTERFACES,
      ArchitectureValidator.LAYERS.INFRASTRUCTURE
    ];

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
   * Extracts all import statements from a TypeScript file
   * 
   * @param filePath - The absolute path to the TypeScript file
   * @returns An array of imported module paths
   */
  public static getImportsFromTypeScriptFile(filePath: string): string[] {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(
      filePath,
      fileContent,
      ts.ScriptTarget.Latest,
      true
    );

    const imports: string[] = [];
    
    function visit(node: ts.Node) {
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier;
        if (ts.isStringLiteral(moduleSpecifier)) {
          imports.push(moduleSpecifier.text);
        }
      }
      
      ts.forEachChild(node, visit);
    }
    
    visit(sourceFile);
    return imports;
  }

  /**
   * Resolves a relative import path to an absolute path
   * 
   * @param importPath - The import path from the import statement
   * @param importingFilePath - The absolute path of the file containing the import
   * @param rootDir - The root directory of the project
   * @returns The absolute path of the imported module or undefined if it can't be resolved
   */
  public static resolveImportPath(
    importPath: string,
    importingFilePath: string,
    rootDir: string
  ): string | undefined {
    // Handle node_modules imports
    if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
      return undefined; // External module from node_modules
    }

    const importingDir = path.dirname(importingFilePath);
    
    if (importPath.startsWith('.')) {
      // Relative import
      return path.resolve(importingDir, importPath);
    } else if (importPath.startsWith('/')) {
      // Absolute import (from project root)
      return path.resolve(rootDir, importPath.slice(1));
    }
    
    return undefined;
  }

  /**
   * Validates that imports in a TypeScript file respect clean architecture boundaries
   * 
   * @param filePath - The absolute path to the TypeScript file
   * @param rootDir - The root directory of the project
   * @returns An array of validation errors, empty if no violations found
   */
  public static validateFileImports(filePath: string, rootDir: string): string[] {
    const errors: string[] = [];
    const fileLayer = this.getLayerForFile(filePath);
    
    if (!fileLayer) {
      return [`File ${filePath} is not in a recognized clean architecture layer`];
    }
    
    const imports = this.getImportsFromTypeScriptFile(filePath);
    
    for (const importPath of imports) {
      const resolvedPath = this.resolveImportPath(importPath, filePath, rootDir);
      
      if (!resolvedPath) {
        // Skip external modules
        continue;
      }
      
      // Add .ts extension if needed for resolving
      let resolvedPathWithExt = resolvedPath;
      if (!fs.existsSync(resolvedPathWithExt)) {
        resolvedPathWithExt = `${resolvedPath}.ts`;
      }
      
      // Try with /index.ts if still not found
      if (!fs.existsSync(resolvedPathWithExt)) {
        resolvedPathWithExt = path.join(resolvedPath, 'index.ts');
      }
      
      if (!fs.existsSync(resolvedPathWithExt)) {
        // Skip if we can't resolve the file
        continue;
      }
      
      const importedFileLayer = this.getLayerForFile(resolvedPathWithExt);
      
      if (!importedFileLayer) {
        // Skip if the imported file is not in a recognized layer
        continue;
      }
      
      if (!this.isDependencyAllowed(fileLayer, importedFileLayer)) {
        errors.push(
          `Clean Architecture violation: ${filePath} (${fileLayer}) ` +
          `imports ${resolvedPathWithExt} (${importedFileLayer}). ` +
          `The ${fileLayer} layer should not depend on the ${importedFileLayer} layer.`
        );
      }
    }
    
    return errors;
  }

  /**
   * Recursively finds all TypeScript files in a directory
   * 
   * @param directory - The directory to search
   * @param includePatterns - Optional regex patterns to include files
   * @param excludePatterns - Optional regex patterns to exclude files
   * @returns An array of file paths
   */
  public static findTypeScriptFiles(
    directory: string,
    includePatterns: RegExp[] = [/\.ts$/],
    excludePatterns: RegExp[] = [/\.d\.ts$/, /node_modules/, /dist/]
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
        const subFiles = this.findTypeScriptFiles(entryPath, includePatterns, excludePatterns);
        files = files.concat(subFiles);
      } else if (entry.isFile() && includePatterns.some(pattern => pattern.test(entryPath))) {
        files.push(entryPath);
      }
    }
    
    return files;
  }

  /**
   * Validates clean architecture boundaries for all TypeScript files in the specified directories
   * 
   * @param rootDir - The root directory of the project
   * @param directories - Optional array of directories to validate (relative to rootDir)
   * @returns An object containing validation status and errors
   */
  public static validateArchitecture(
    rootDir: string,
    directories: string[] = ['pkg', 'internal/typescript']
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    for (const directory of directories) {
      const dirPath = path.join(rootDir, directory);
      const files = this.findTypeScriptFiles(dirPath);
      
      for (const file of files) {
        const fileErrors = this.validateFileImports(file, rootDir);
        errors.push(...fileErrors);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}