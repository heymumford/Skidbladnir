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
import { ArchitectureValidator } from './ArchitectureValidator';

/**
 * Provides utilities for detecting circular dependencies in the codebase.
 * Circular dependencies are problematic and suggest design issues.
 */
export class CircularDependencyValidator {
  /**
   * Graph representation of dependencies
   * Key: file path, Value: array of imported file paths
   */
  private dependencyGraph: Map<string, string[]> = new Map();
  
  /**
   * Set of files to be processed/that have been processed
   */
  private files: Set<string> = new Set();
  
  /**
   * Root directory of the project
   */
  private rootDir: string;
  
  /**
   * Constructor
   * 
   * @param rootDir Root directory of the project
   */
  constructor(rootDir: string) {
    this.rootDir = rootDir;
  }
  
  /**
   * Adds a file to be processed
   * 
   * @param filePath Absolute path to the file
   */
  public addFile(filePath: string): void {
    this.files.add(filePath);
  }
  
  /**
   * Adds multiple files to be processed
   * 
   * @param filePaths Array of absolute file paths
   */
  public addFiles(filePaths: string[]): void {
    for (const filePath of filePaths) {
      this.files.add(filePath);
    }
  }
  
  /**
   * Builds the dependency graph
   */
  private buildDependencyGraph(): void {
    for (const file of this.files) {
      // Only process TypeScript files for now
      if (!file.endsWith('.ts')) {
        continue;
      }
      
      try {
        const imports = ArchitectureValidator.getImportsFromTypeScriptFile(file);
        const resolvedImports: string[] = [];
        
        for (const importPath of imports) {
          const resolvedPath = ArchitectureValidator.resolveImportPath(
            importPath, 
            file,
            this.rootDir
          );
          
          if (resolvedPath) {
            // Add .ts extension if needed
            let resolvedPathWithExt = resolvedPath;
            if (!fs.existsSync(resolvedPathWithExt)) {
              resolvedPathWithExt = `${resolvedPath}.ts`;
            }
            
            // Try with /index.ts if still not found
            if (!fs.existsSync(resolvedPathWithExt)) {
              resolvedPathWithExt = path.join(resolvedPath, 'index.ts');
            }
            
            if (fs.existsSync(resolvedPathWithExt) && this.files.has(resolvedPathWithExt)) {
              resolvedImports.push(resolvedPathWithExt);
            }
          }
        }
        
        this.dependencyGraph.set(file, resolvedImports);
      } catch (error) {
        console.error(`Error processing file ${file}: ${error}`);
      }
    }
  }
  
  /**
   * Detects circular dependencies using depth-first search
   * 
   * @returns Array of circular dependency chains
   */
  public detectCircularDependencies(): string[][] {
    // Build the dependency graph if not already built
    if (this.dependencyGraph.size === 0) {
      this.buildDependencyGraph();
    }
    
    const circularDependencies: string[][] = [];
    const visited: Map<string, boolean> = new Map();
    const recursionStack: Map<string, boolean> = new Map();
    const pathStack: string[] = [];
    
    // Depth-first search to detect cycles
    const dfs = (file: string): void => {
      // Mark the current node as visited and add to recursion stack
      visited.set(file, true);
      recursionStack.set(file, true);
      pathStack.push(file);
      
      // Get all dependencies of this file
      const dependencies = this.dependencyGraph.get(file) || [];
      
      for (const dependency of dependencies) {
        // If not visited, recursively check it
        if (!visited.get(dependency)) {
          dfs(dependency);
        } 
        // If already in recursion stack, then we found a cycle
        else if (recursionStack.get(dependency)) {
          // Find the start of the cycle
          const cycleStartIndex = pathStack.indexOf(dependency);
          
          // Extract the cycle
          const cycle = [...pathStack.slice(cycleStartIndex), dependency];
          
          // Add to results if not already there (avoids duplicates)
          const cycleStr = cycle.join('->');
          if (!circularDependencies.some(c => c.join('->') === cycleStr)) {
            circularDependencies.push(cycle);
          }
        }
      }
      
      // Remove from recursion stack and path stack when we're done with this node
      recursionStack.set(file, false);
      pathStack.pop();
    };
    
    // Run DFS on each unvisited node
    for (const file of this.files) {
      if (!visited.get(file)) {
        dfs(file);
      }
    }
    
    return circularDependencies;
  }
  
  /**
   * Creates a validator that checks a directory for circular dependencies
   * 
   * @param directory Directory to check
   * @param rootDir Root directory of the project
   * @returns CircularDependencyValidator instance
   */
  public static forDirectory(
    directory: string,
    rootDir: string
  ): CircularDependencyValidator {
    const validator = new CircularDependencyValidator(rootDir);
    const files = ArchitectureValidator.findTypeScriptFiles(directory);
    validator.addFiles(files);
    return validator;
  }
  
  /**
   * Creates a validator that checks a specific set of directories for circular dependencies
   * 
   * @param directories Array of directories to check
   * @param rootDir Root directory of the project
   * @returns CircularDependencyValidator instance
   */
  public static forDirectories(
    directories: string[],
    rootDir: string
  ): CircularDependencyValidator {
    const validator = new CircularDependencyValidator(rootDir);
    
    for (const directory of directories) {
      const files = ArchitectureValidator.findTypeScriptFiles(directory);
      validator.addFiles(files);
    }
    
    return validator;
  }
  
  /**
   * Creates a validator that checks the entire project for circular dependencies
   * 
   * @param rootDir Root directory of the project
   * @returns CircularDependencyValidator instance
   */
  public static forProject(rootDir: string): CircularDependencyValidator {
    return CircularDependencyValidator.forDirectories(
      [
        path.join(rootDir, 'pkg'),
        path.join(rootDir, 'internal/typescript')
      ],
      rootDir
    );
  }
  
  /**
   * Formats circular dependencies for human-readable output
   * 
   * @param cycles Array of circular dependency chains
   * @param rootDir Root directory of the project (for path normalization)
   * @returns Formatted string representation
   */
  public static formatCircularDependencies(
    cycles: string[][],
    rootDir: string
  ): string {
    if (cycles.length === 0) {
      return 'No circular dependencies found.';
    }
    
    let result = `Found ${cycles.length} circular dependencies:\n\n`;
    
    for (let i = 0; i < cycles.length; i++) {
      const cycle = cycles[i];
      result += `${i + 1}. Circular dependency chain:\n`;
      
      for (let j = 0; j < cycle.length; j++) {
        const file = cycle[j];
        const relativePath = path.relative(rootDir, file);
        
        if (j === cycle.length - 1 && j > 0 && cycle[0] === cycle[j]) {
          // Last item is the same as the first (to complete the cycle), use a different arrow
          result += `   \u21b5 ${relativePath} (back to start)\n`;
        } else {
          result += `   ${j === cycle.length - 1 ? '\u2514' : '\u251c'}\u2500 ${relativePath}${j < cycle.length - 1 ? ' \u2193' : ''}\n`;
        }
      }
      
      result += '\n';
    }
    
    return result;
  }
}