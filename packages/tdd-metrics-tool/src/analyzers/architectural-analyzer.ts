/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { 
  ArchitecturalLayer, 
  CoverageData, 
  TestFile, 
  SourceFile,
  TestCase
} from '../models/types';
import { ArchitecturalMetrics } from '../models/metrics';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

/**
 * Interface for a dependency violation
 */
export interface DependencyViolation {
  sourceFile: string;
  targetFile: string;
  sourceLine: number;
  sourceLayer: ArchitecturalLayer;
  targetLayer: ArchitecturalLayer;
  violationType: 'DEPENDENCY_DIRECTION' | 'INTERFACE_DEPENDENCY' | 'LAYER_ISOLATION';
  message: string;
}

/**
 * Analyzes architectural boundaries and clean architecture compliance
 */
export class ArchitecturalAnalyzer {
  /**
   * Analyze architecture for clean architecture compliance
   */
  public static analyzeArchitecture(
    coverageData: CoverageData,
    thresholds?: {
      maxViolations?: number;
      layerCoverage?: {
        [key in ArchitecturalLayer]?: {
          lineCoverage?: number;
          functionCoverage?: number;
          branchCoverage?: number;
          statementCoverage?: number;
        };
      };
    }
  ): ArchitecturalMetrics {
    // Find dependency violations
    const violations = this.findDependencyViolations(coverageData.sourceFiles);
    
    // Count violations by type
    const dependencyDirectionViolations = violations.filter(
      v => v.violationType === 'DEPENDENCY_DIRECTION'
    ).length;
    
    const interfaceDependencyViolations = violations.filter(
      v => v.violationType === 'INTERFACE_DEPENDENCY'
    ).length;
    
    const layerIsolationViolations = violations.filter(
      v => v.violationType === 'LAYER_ISOLATION'
    ).length;
    
    // Count missing port implementations
    const missingPortImplementations = this.findMissingPortImplementations(
      coverageData.sourceFiles
    ).length;
    
    // Get coverage by layer from coverage data
    const layerCoverage: Record<string, any> = {};
    
    // Convert from layerCoverage in CoverageData to the format needed for ArchitecturalMetrics
    Object.entries(coverageData.layerCoverage).forEach(([layer, coverage]) => {
      layerCoverage[layer] = {
        lineCoverage: coverage.lines.percentage,
        functionCoverage: coverage.functions.percentage
      };
    });
    
    return new ArchitecturalMetrics(
      {
        dependencyDirection: dependencyDirectionViolations,
        interfaceDependency: interfaceDependencyViolations,
        layerIsolation: layerIsolationViolations,
        missingPortImplementations
      },
      layerCoverage,
      thresholds
    );
  }
  
  /**
   * Find dependency violations in source files
   */
  public static findDependencyViolations(
    sourceFiles: SourceFile[]
  ): DependencyViolation[] {
    const violations: DependencyViolation[] = [];
    
    // Analyze TypeScript files for imports that violate clean architecture
    const tsFiles = sourceFiles.filter(
      file => file.language === 'typescript' && file.filePath.endsWith('.ts')
    );
    
    for (const file of tsFiles) {
      try {
        const fileContent = fs.readFileSync(file.filePath, 'utf-8');
        const sourceFile = ts.createSourceFile(
          file.filename,
          fileContent,
          ts.ScriptTarget.Latest,
          true
        );
        
        // Check imports for violations
        this.checkTsImports(sourceFile, file, violations);
      } catch (error) {
        console.error(`Error analyzing file ${file.filePath}:`, error);
      }
    }
    
    return violations;
  }
  
  /**
   * Check TypeScript imports for architecture violations
   */
  private static checkTsImports(
    sourceFile: ts.SourceFile, 
    file: SourceFile, 
    violations: DependencyViolation[]
  ): void {
    // The order of layers from inner to outer
    const layerHierarchy = [
      ArchitecturalLayer.DOMAIN,
      ArchitecturalLayer.USE_CASE,
      ArchitecturalLayer.ADAPTER,
      ArchitecturalLayer.INFRASTRUCTURE
    ];
    
    // Helper to get layer index in hierarchy (higher = outer layer)
    const getLayerIndex = (layer: ArchitecturalLayer): number => {
      return layerHierarchy.indexOf(layer);
    };
    
    // Visit the AST to find imports
    function visit(node: ts.Node) {
      if (ts.isImportDeclaration(node)) {
        const importPath = (node.moduleSpecifier as ts.StringLiteral).text;
        const sourceLine = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
        
        // Skip node_modules imports
        if (importPath.startsWith('.') || importPath.startsWith('/')) {
          // Determine the target file and its layer
          let targetFilePath: string;
          
          if (importPath.startsWith('.')) {
            // Relative path
            targetFilePath = path.resolve(path.dirname(file.filePath), importPath);
          } else {
            // Absolute path
            targetFilePath = importPath;
          }
          
          // Add extension if needed
          if (!targetFilePath.endsWith('.ts') && !targetFilePath.endsWith('.js')) {
            targetFilePath += '.ts';
          }
          
          // Determine target layer (simplified)
          let targetLayer = ArchitecturalLayer.UNKNOWN;
          
          if (targetFilePath.includes('/domain/')) {
            targetLayer = ArchitecturalLayer.DOMAIN;
          } else if (targetFilePath.includes('/usecases/') || targetFilePath.includes('/use-cases/')) {
            targetLayer = ArchitecturalLayer.USE_CASE;
          } else if (
            targetFilePath.includes('/adapters/') || 
            targetFilePath.includes('/adapter/') ||
            targetFilePath.includes('/interfaces/')
          ) {
            targetLayer = ArchitecturalLayer.ADAPTER;
          } else if (
            targetFilePath.includes('/infrastructure/') || 
            targetFilePath.includes('/infra/') ||
            targetFilePath.includes('/frameworks/')
          ) {
            targetLayer = ArchitecturalLayer.INFRASTRUCTURE;
          }
          
          // Now check for violations
          const sourceLayer = file.layer;
          
          // 1. Dependency Direction Rule: Inner layers should not depend on outer layers
          if (
            sourceLayer !== ArchitecturalLayer.UNKNOWN &&
            targetLayer !== ArchitecturalLayer.UNKNOWN &&
            getLayerIndex(sourceLayer) < getLayerIndex(targetLayer)
          ) {
            violations.push({
              sourceFile: file.filePath,
              targetFile: targetFilePath,
              sourceLine,
              sourceLayer,
              targetLayer,
              violationType: 'DEPENDENCY_DIRECTION',
              message: `${sourceLayer} layer depends on ${targetLayer} layer, violating the dependency rule`
            });
          }
          
          // 2. Layer Isolation Rule: Layers should only talk to adjacent layers
          if (
            sourceLayer !== ArchitecturalLayer.UNKNOWN &&
            targetLayer !== ArchitecturalLayer.UNKNOWN &&
            Math.abs(getLayerIndex(sourceLayer) - getLayerIndex(targetLayer)) > 1 &&
            // Allow domain to be used anywhere (special case)
            targetLayer !== ArchitecturalLayer.DOMAIN
          ) {
            violations.push({
              sourceFile: file.filePath,
              targetFile: targetFilePath,
              sourceLine,
              sourceLayer,
              targetLayer,
              violationType: 'LAYER_ISOLATION',
              message: `${sourceLayer} layer depends on non-adjacent ${targetLayer} layer`
            });
          }
        }
      }
      
      ts.forEachChild(node, visit);
    }
    
    visit(sourceFile);
  }
  
  /**
   * Find interfaces that don't have implementations
   */
  public static findMissingPortImplementations(
    sourceFiles: SourceFile[]
  ): string[] {
    const interfaces: string[] = [];
    const implementations: string[] = [];
    
    // Extract interface names and potential implementations
    sourceFiles.forEach(file => {
      if (file.interfaces) {
        file.interfaces.forEach(interfaceName => {
          interfaces.push(interfaceName);
        });
      }
      
      if (file.classes) {
        file.classes.forEach(className => {
          // Classes ending with "Impl" are likely implementations
          if (className.endsWith('Impl')) {
            const interfaceName = className.substring(0, className.length - 4);
            implementations.push(interfaceName);
          }
        });
      }
    });
    
    // Find interfaces without implementations
    return interfaces.filter(
      interfaceName => !implementations.includes(interfaceName)
    );
  }
  
  /**
   * Check if tests cover all architectural layers
   */
  public static checkLayerTestCoverage(
    coverageData: CoverageData
  ): { [key in ArchitecturalLayer]?: boolean } {
    const result: { [key in ArchitecturalLayer]?: boolean } = {};
    
    // For each layer, check if there are test files targeting it
    Object.values(ArchitecturalLayer).forEach(layer => {
      // Count files in this layer
      const filesInLayer = coverageData.sourceFiles.filter(
        file => file.layer === layer
      ).length;
      
      // If no files in this layer, skip
      if (filesInLayer === 0) {
        return;
      }
      
      // Check if we have any tests for this layer
      const hasTests = coverageData.testFiles.some(
        file => file.testCases.some(testCase => {
          if (!testCase.coveredFiles) {
            return false;
          }
          
          // Check if this test covers a file in the layer
          return testCase.coveredFiles.some(coveredFile => {
            const matchingSourceFile = coverageData.sourceFiles.find(
              sf => sf.filePath === coveredFile
            );
            return matchingSourceFile && matchingSourceFile.layer === layer;
          });
        })
      );
      
      result[layer] = hasTests;
    });
    
    return result;
  }
}