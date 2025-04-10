#!/usr/bin/env node
/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { ArchitectureValidator } from '../ArchitectureValidator';
import { CircularDependencyValidator } from '../CircularDependencyValidator';
import { PolyglotArchitectureValidator } from '../PolyglotArchitectureValidator';
import { CrossLanguageDependencyAnalyzer } from '../CrossLanguageDependencyAnalyzer';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Command-line utility to check architectural boundaries and detect circular dependencies.
 * Can be used in pre-commit hooks or CI/CD pipelines.
 */

// Parse command-line arguments
const args = process.argv.slice(2);
const options: {
  help: boolean;
  verbose: boolean;
  architecture: boolean;
  circular: boolean;
  polyglot: boolean;
  crossLanguage: boolean;
  diagram: boolean;
  path?: string;
  output?: string;
  diagramOutput?: string;
} = {
  help: args.includes('--help') || args.includes('-h'),
  verbose: args.includes('--verbose') || args.includes('-v'),
  architecture: args.includes('--architecture') || args.includes('-a'),
  circular: args.includes('--circular') || args.includes('-c'),
  polyglot: args.includes('--polyglot') || args.includes('-p'),
  crossLanguage: args.includes('--cross-language') || args.includes('-x'),
  diagram: args.includes('--diagram') || args.includes('-g'),
};

// Handle custom path
const pathIndex = Math.max(
  args.indexOf('--path'),
  args.indexOf('-d')
);
if (pathIndex !== -1 && pathIndex < args.length - 1) {
  options.path = args[pathIndex + 1];
}

// Handle output file
const outputIndex = Math.max(
  args.indexOf('--output'),
  args.indexOf('-o')
);
if (outputIndex !== -1 && outputIndex < args.length - 1) {
  options.output = args[outputIndex + 1];
}

// Handle diagram output file
const diagramIndex = Math.max(
  args.indexOf('--diagram-output'),
  args.indexOf('-go')
);
if (diagramIndex !== -1 && diagramIndex < args.length - 1) {
  options.diagramOutput = args[diagramIndex + 1];
}

// Default to checking everything if no specific checks are requested
if (!options.architecture && !options.circular && !options.polyglot && !options.crossLanguage) {
  options.architecture = true;
  options.circular = true;
}

// Print help and exit if requested
if (options.help) {
  console.log(`
Skidbladnir Architecture Validator

Usage: check-architecture [options]

Options:
  -h, --help                   Show this help message
  -v, --verbose                Show verbose output
  -a, --architecture           Check clean architecture boundaries
  -c, --circular               Check for circular dependencies
  -p, --polyglot               Check architecture across languages
  -x, --cross-language         Check cross-language service dependencies
  -g, --diagram                Generate dependency diagrams
  -d, --path <directory>       Specify directory to check (default: project root)
  -o, --output <file>          Write results to file (default: console output)
  -go, --diagram-output <file> Write diagram to file (default: mermaid-diagram.md)

Examples:
  check-architecture -a -c              Check architecture and circular dependencies
  check-architecture -p -v              Check polyglot architecture with verbose output
  check-architecture -x -g              Check cross-language dependencies and generate diagram
  check-architecture -a -d pkg/domain   Check only the domain layer
  check-architecture -c -o report.txt   Check circular dependencies and write to file
  check-architecture -x -go diagram.md  Generate cross-language dependency diagram
  `);
  process.exit(0);
}

// Determine the root directory
const rootDir = process.cwd();
console.log(`Using root directory: ${rootDir}`);

// Determine directory to check
let checkDir = rootDir;
if (options.path) {
  checkDir = path.isAbsolute(options.path)
    ? options.path
    : path.join(rootDir, options.path);
  
  if (!fs.existsSync(checkDir)) {
    console.error(`Error: Directory '${checkDir}' does not exist.`);
    process.exit(1);
  }
  
  console.log(`Checking directory: ${checkDir}`);
}

// Prepare output collection
const output: string[] = [
  `Skidbladnir Architecture Validation Report`,
  `Generated: ${new Date().toISOString()}`,
  `Directory: ${checkDir}`,
  `\n`
];

let hasErrors = false;

// Check clean architecture boundaries
if (options.architecture) {
  output.push(`\n================================`);
  output.push(`Clean Architecture Validation`);
  output.push(`================================\n`);
  
  try {
    const result = ArchitectureValidator.validateArchitecture(
      rootDir,
      [options.path || 'pkg', 'internal/typescript'].filter(Boolean) as string[]
    );
    
    if (result.valid) {
      output.push(`✅ Clean Architecture boundaries are respected.`);
    } else {
      output.push(`❌ Clean Architecture violations found:`);
      result.errors.forEach(error => {
        output.push(`  - ${error}`);
      });
      hasErrors = true;
    }
  } catch (error) {
    output.push(`❌ Error checking clean architecture: ${error}`);
    hasErrors = true;
  }
}

// Check for circular dependencies
if (options.circular) {
  output.push(`\n================================`);
  output.push(`Circular Dependency Check`);
  output.push(`================================\n`);
  
  try {
    const validator = options.path
      ? CircularDependencyValidator.forDirectory(checkDir, rootDir)
      : CircularDependencyValidator.forProject(rootDir);
    
    const cycles = validator.detectCircularDependencies();
    
    if (cycles.length === 0) {
      output.push(`✅ No circular dependencies found.`);
    } else {
      output.push(CircularDependencyValidator.formatCircularDependencies(cycles, rootDir));
      hasErrors = true;
    }
  } catch (error) {
    output.push(`❌ Error checking circular dependencies: ${error}`);
    hasErrors = true;
  }
}

// Check polyglot architecture
if (options.polyglot) {
  output.push(`\n================================`);
  output.push(`Polyglot Architecture Validation`);
  output.push(`================================\n`);
  
  try {
    const result = PolyglotArchitectureValidator.validatePolyglotArchitecture(rootDir);
    
    // TypeScript validation
    output.push(`TypeScript Architecture:`);
    if (result.typescript.valid) {
      output.push(`  ✅ Clean Architecture boundaries are respected.`);
    } else {
      output.push(`  ❌ Clean Architecture violations found:`);
      result.typescript.errors.forEach(error => {
        output.push(`    - ${error}`);
      });
      hasErrors = true;
    }
    
    // Python validation
    output.push(`\nPython Architecture:`);
    if (result.python.valid) {
      output.push(`  ✅ Clean Architecture boundaries are respected.`);
    } else {
      output.push(`  ❌ Clean Architecture violations found:`);
      result.python.errors.forEach(error => {
        output.push(`    - ${error}`);
      });
      hasErrors = true;
    }
    
    // Go validation
    output.push(`\nGo Architecture:`);
    if (result.go.valid) {
      output.push(`  ✅ Clean Architecture boundaries are respected.`);
    } else {
      output.push(`  ❌ Clean Architecture violations found:`);
      result.go.errors.forEach(error => {
        output.push(`    - ${error}`);
      });
      hasErrors = true;
    }
  } catch (error) {
    output.push(`❌ Error checking polyglot architecture: ${error}`);
    hasErrors = true;
  }
}

// Check cross-language dependencies
if (options.crossLanguage) {
  output.push(`\n================================`);
  output.push(`Cross-Language Dependency Analysis`);
  output.push(`================================\n`);
  
  try {
    const results = CrossLanguageDependencyAnalyzer.analyzeCrossLanguageDependencies(rootDir);
    output.push(CrossLanguageDependencyAnalyzer.formatAnalysisResults(results));
    
    if (!results.valid) {
      hasErrors = true;
    }
    
    // Generate and save diagram if requested
    if (options.diagram) {
      const diagram = CrossLanguageDependencyAnalyzer.generateDependencyDiagram(results);
      
      if (options.diagramOutput) {
        try {
          fs.writeFileSync(options.diagramOutput, diagram);
          output.push(`\nDependency diagram written to ${options.diagramOutput}`);
        } catch (error) {
          output.push(`\n❌ Error writing diagram to file: ${error}`);
          // If we can't write to file, include diagram in the report
          output.push(`\nDependency Diagram:`);
          output.push(diagram);
        }
      } else {
        // Include diagram in the report
        output.push(`\nDependency Diagram:`);
        output.push(diagram);
      }
    }
  } catch (error) {
    output.push(`❌ Error checking cross-language dependencies: ${error}`);
    hasErrors = true;
  }
}

// Create the final report
const report = output.join('\n');

// Output the report
if (options.output) {
  try {
    fs.writeFileSync(options.output, report);
    console.log(`Report written to ${options.output}`);
  } catch (error) {
    console.error(`Error writing to file: ${error}`);
    console.log(report);
  }
} else {
  console.log(report);
}

// Exit with appropriate code
process.exit(hasErrors ? 1 : 0);