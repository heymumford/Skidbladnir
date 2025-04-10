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
import { QualityMetricsVisualizer, QualityVisualizationOptions } from '../visualizers/quality-metrics-visualizer';
import { MetricsManager } from '../metrics-manager';
import { MetricsConfig, ArchitecturalLayer, AnalysisOptions } from '../models/types';

/**
 * Command-line interface for the quality metrics dashboard tool
 */
export class QualityDashboardCLI {
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
        analyzeOnly: true, // Always analyze existing data
        visualizeOnly: options.visualizeOnly,
        includeFileContents: options.includeFileContents,
        includeCoverageMaps: options.includeCoverageMaps
      };
      
      console.log('Running test quality metrics analysis...');
      const report = await manager.run(analysisOptions);
      
      // Generate visualizations with QualityMetricsVisualizer
      const visualizationOptions: QualityVisualizationOptions = {
        outputDir: path.join(config.outputPath, 'quality-dashboard'),
        includeTestComplexity: options.includeTestComplexity,
        includeTestToCodeRatio: true, // Always include this
        includeSetupToAssertionRatio: options.includeSetupToAssertionRatio,
        includeTestIsolation: options.includeTestIsolation,
        includeTestDistribution: options.includeTestDistribution,
        includeTestExecutionTime: options.includeTestExecutionTime,
        includeTrendAnalysis: options.includeTrendAnalysis,
        darkMode: options.darkMode,
        interactive: options.interactive
      };
      
      QualityMetricsVisualizer.generateVisualizations(report, manager.getCoverageData(), visualizationOptions);
      
      // Output summary to console
      console.log(report.getQualitySummary());
      
      console.log(`Quality metrics dashboard generated at: ${path.resolve(visualizationOptions.outputDir)}`);
      
      // Exit with appropriate code
      if (!report.qualityMetrics.meetsAllTargets() && options.failOnThreshold) {
        console.error('Quality metrics check failed!');
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
    visualizeOnly: boolean;
    includeFileContents: boolean;
    includeCoverageMaps: boolean;
    includeTestComplexity: boolean;
    includeSetupToAssertionRatio: boolean;
    includeTestIsolation: boolean;
    includeTestDistribution: boolean;
    includeTestExecutionTime: boolean;
    includeTrendAnalysis: boolean;
    darkMode: boolean;
    interactive: boolean;
    failOnThreshold: boolean;
    outputDir?: string;
  } {
    const result = {
      configPath: undefined as string | undefined,
      visualizeOnly: false,
      includeFileContents: false,
      includeCoverageMaps: false,
      includeTestComplexity: true,
      includeSetupToAssertionRatio: true,
      includeTestIsolation: true,
      includeTestDistribution: true,
      includeTestExecutionTime: true,
      includeTrendAnalysis: false,
      darkMode: false,
      interactive: true,
      failOnThreshold: false,
      outputDir: undefined as string | undefined
    };
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      if (arg === '--config' || arg === '-c') {
        result.configPath = args[++i];
      } else if (arg === '--visualize-only') {
        result.visualizeOnly = true;
      } else if (arg === '--include-file-contents') {
        result.includeFileContents = true;
      } else if (arg === '--include-coverage-maps') {
        result.includeCoverageMaps = true;
      } else if (arg === '--no-test-complexity') {
        result.includeTestComplexity = false;
      } else if (arg === '--no-setup-assertion-ratio') {
        result.includeSetupToAssertionRatio = false;
      } else if (arg === '--no-test-isolation') {
        result.includeTestIsolation = false;
      } else if (arg === '--no-test-distribution') {
        result.includeTestDistribution = false;
      } else if (arg === '--no-execution-time') {
        result.includeTestExecutionTime = false;
      } else if (arg === '--include-trends') {
        result.includeTrendAnalysis = true;
      } else if (arg === '--dark-mode') {
        result.darkMode = true;
      } else if (arg === '--no-interactive') {
        result.interactive = false;
      } else if (arg === '--fail-on-threshold') {
        result.failOnThreshold = true;
      } else if (arg === '--output-dir') {
        result.outputDir = args[++i];
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
        testToCodeRatio: 0.7,
        qualityThresholds: {
          setupToAssertionRatio: 2.0, // Target max 2:1 setup to assertion ratio
          testComplexity: 3.0,        // Target max cyclomatic complexity of 3
          testIsolation: 90,          // Target 90% isolated tests
          averageTestExecutionTime: 500 // Target 500ms average execution time
        }
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
          },
          qualityThresholds: {
            ...defaultConfig.thresholds?.qualityThresholds,
            ...fileConfig.thresholds?.qualityThresholds
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
Test Quality Metrics Dashboard - Visualize and analyze test quality metrics

Usage: quality-dashboard [options]

Options:
  -c, --config <path>          Path to configuration file
  --output-dir <path>          Custom output directory for quality dashboard
  --visualize-only             Only generate visualizations, don't collect or analyze
  --no-test-complexity         Don't include test complexity metrics
  --no-setup-assertion-ratio   Don't include setup-to-assertion ratio metrics
  --no-test-isolation          Don't include test isolation metrics
  --no-test-distribution       Don't include test distribution metrics
  --no-execution-time          Don't include execution time metrics
  --include-trends             Include trend analysis visualizations
  --dark-mode                  Use dark mode for visualizations
  --no-interactive             Don't generate interactive charts
  --fail-on-threshold          Exit with error if quality thresholds not met
  --include-file-contents      Include file contents in analysis
  --include-coverage-maps      Include coverage maps in analysis
  -h, --help                   Show this help message

Examples:
  quality-dashboard                    Run with default settings
  quality-dashboard -c ./tdd-config.json    Run with custom configuration
  quality-dashboard --dark-mode             Generate dashboard with dark mode
  quality-dashboard --fail-on-threshold     Fail if thresholds not met
    `);
  }
}