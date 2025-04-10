/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { MetricsManager } from '../metrics-manager';
import { MetricsConfig, ArchitecturalLayer, AnalysisOptions } from '../models/types';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Command-line interface for the metrics tool
 */
export class CLI {
  /**
   * Run the CLI with the given arguments
   */
  public static async run(args: string[]): Promise<void> {
    try {
      // Parse command-line arguments
      const options = this.parseArgs(args);
      
      // Get config from file or defaults
      const config = this.getConfig(options.configPath);
      
      // Create and run metrics manager
      const manager = new MetricsManager(config);
      const analysisOptions: AnalysisOptions = {
        collectOnly: options.collectOnly,
        analyzeOnly: options.analyzeOnly,
        visualizeOnly: options.visualizeOnly,
        compareWithPrevious: options.compareWithPrevious,
        failOnThresholdViolation: options.failOnThreshold,
        includeFileContents: options.includeFileContents,
        includeCoverageMaps: options.includeCoverageMaps
      };
      
      console.log('Running TDD metrics analysis...');
      const report = await manager.run(analysisOptions);
      
      // Output summary to console
      console.log(report.getSummary());
      
      console.log(`Report generated at: ${path.resolve(config.outputPath)}`);
      
      // Exit with appropriate code
      if (!report.meetsAllTargets() && options.failOnThreshold) {
        console.error('TDD metrics check failed!');
        process.exit(1);
      }
    } catch (error) {
      console.error('Error:', (error as Error).message);
      process.exit(1);
    }
  }
  
  /**
   * Parse command-line arguments
   */
  private static parseArgs(args: string[]): {
    configPath?: string;
    collectOnly: boolean;
    analyzeOnly: boolean;
    visualizeOnly: boolean;
    compareWithPrevious: boolean;
    failOnThreshold: boolean;
    includeFileContents: boolean;
    includeCoverageMaps: boolean;
  } {
    const result = {
      configPath: undefined as string | undefined,
      collectOnly: false,
      analyzeOnly: false,
      visualizeOnly: false,
      compareWithPrevious: false,
      failOnThreshold: false,
      includeFileContents: false,
      includeCoverageMaps: false
    };
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      if (arg === '--config' || arg === '-c') {
        result.configPath = args[++i];
      } else if (arg === '--collect-only') {
        result.collectOnly = true;
      } else if (arg === '--analyze-only') {
        result.analyzeOnly = true;
      } else if (arg === '--visualize-only') {
        result.visualizeOnly = true;
      } else if (arg === '--compare') {
        result.compareWithPrevious = true;
      } else if (arg === '--fail-on-threshold') {
        result.failOnThreshold = true;
      } else if (arg === '--include-file-contents') {
        result.includeFileContents = true;
      } else if (arg === '--include-coverage-maps') {
        result.includeCoverageMaps = true;
      } else if (arg === '--help' || arg === '-h') {
        this.showHelp();
        process.exit(0);
      }
    }
    
    return result;
  }
  
  /**
   * Get configuration from file or defaults
   */
  private static getConfig(configPath?: string): MetricsConfig {
    // Default configuration
    const defaultConfig: MetricsConfig = {
      projectRoot: process.cwd(),
      sourcePaths: [
        path.join(process.cwd(), 'src'),
        path.join(process.cwd(), 'lib')
      ],
      testPaths: [
        path.join(process.cwd(), 'test'),
        path.join(process.cwd(), 'tests'),
        path.join(process.cwd(), '__tests__')
      ],
      outputPath: path.join(process.cwd(), 'tdd-metrics-reports'),
      excludePatterns: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/coverage/**'
      ],
      thresholds: {
        lineCoverage: 80,
        functionCoverage: 80,
        layerCoverage: {
          [ArchitecturalLayer.DOMAIN]: {
            lineCoverage: 90,
            functionCoverage: 90
          },
          [ArchitecturalLayer.USE_CASE]: {
            lineCoverage: 85,
            functionCoverage: 85
          },
          [ArchitecturalLayer.ADAPTER]: {
            lineCoverage: 75,
            functionCoverage: 75
          },
          [ArchitecturalLayer.INFRASTRUCTURE]: {
            lineCoverage: 60,
            functionCoverage: 60
          }
        },
        testToCodeRatio: 0.7
      }
    };
    
    // If no config file specified, use defaults
    if (!configPath) {
      return defaultConfig;
    }
    
    // Read config file
    try {
      const configFile = path.resolve(configPath);
      if (!fs.existsSync(configFile)) {
        console.warn(`Config file not found: ${configFile}`);
        return defaultConfig;
      }
      
      const configContent = fs.readFileSync(configFile, 'utf-8');
      const fileConfig = JSON.parse(configContent);
      
      // Merge with defaults
      return {
        ...defaultConfig,
        ...fileConfig,
        thresholds: {
          ...defaultConfig.thresholds,
          ...fileConfig.thresholds,
          layerCoverage: {
            ...defaultConfig.thresholds?.layerCoverage,
            ...fileConfig.thresholds?.layerCoverage
          }
        }
      };
    } catch (error) {
      console.error(`Error reading config file:`, error);
      return defaultConfig;
    }
  }
  
  /**
   * Show help information
   */
  private static showHelp(): void {
    console.log(`
TDD Metrics Tool - Measure and analyze test completeness and quality

Usage: tdd-metrics [options]

Options:
  -c, --config <path>       Path to configuration file
  --collect-only            Only collect data, don't analyze or visualize
  --analyze-only            Only analyze data, don't collect or visualize
  --visualize-only          Only generate visualizations, don't collect or analyze
  --compare                 Compare with previous run
  --fail-on-threshold       Exit with error if thresholds not met
  --include-file-contents   Include file contents in report
  --include-coverage-maps   Include coverage maps in report
  -h, --help                Show this help message

Examples:
  tdd-metrics                   Run with default settings
  tdd-metrics -c ./tdd-config.json   Run with custom configuration
  tdd-metrics --fail-on-threshold    Fail if thresholds not met
    `);
  }
}