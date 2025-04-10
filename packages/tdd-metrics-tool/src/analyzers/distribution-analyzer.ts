/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { 
  CoverageData, 
  SourceFile, 
  TestFile, 
  TestType,
  ArchitecturalLayer
} from '../models/types';
import { TestDistributionMetrics } from '../models/metrics';

/**
 * Analyzes the distribution of tests across different categories
 */
export class DistributionAnalyzer {
  /**
   * Analyze test distribution by type and layer
   */
  public static analyzeTestDistribution(
    coverageData: CoverageData
  ): TestDistributionMetrics {
    const { testFiles } = coverageData;
    
    // Count tests by type
    const testCountByType: Record<string, number> = {};
    
    // Initialize counters for all test types
    Object.values(TestType).forEach(type => {
      testCountByType[type] = 0;
    });
    
    // Count tests
    testFiles.forEach(file => {
      // Increment count for the file's test type
      testCountByType[file.type] = (testCountByType[file.type] || 0) + file.testCases.length;
    });
    
    // Count tests by layer
    const testCountByLayer: Record<string, number> = {};
    
    // Initialize counters for all layers
    Object.values(ArchitecturalLayer).forEach(layer => {
      testCountByLayer[layer] = 0;
    });
    
    // First we need to map test files to the layers they test
    testFiles.forEach(file => {
      // The layer a test belongs to might not be the same as the layer it tests
      // For now, we'll use the test file's own layer as a simplification
      testCountByLayer[file.layer] = (testCountByLayer[file.layer] || 0) + file.testCases.length;
    });
    
    return new TestDistributionMetrics(
      testCountByType as any,
      testCountByLayer as any
    );
  }
  
  /**
   * Find layers with insufficient test coverage
   */
  public static findUndertestedLayers(
    distribution: TestDistributionMetrics,
    thresholdPercentage: number = 10
  ): ArchitecturalLayer[] {
    const percentageByLayer = distribution.getTestPercentageByLayer();
    const undertestedLayers: ArchitecturalLayer[] = [];
    
    // Check each layer against the threshold
    Object.entries(percentageByLayer).forEach(([layer, percentage]) => {
      if (percentage < thresholdPercentage) {
        undertestedLayers.push(layer as ArchitecturalLayer);
      }
    });
    
    return undertestedLayers;
  }
  
  /**
   * Find test types that are underrepresented
   */
  public static findUnderrepresentedTestTypes(
    distribution: TestDistributionMetrics,
    thresholds: { [key in TestType]?: number } = {}
  ): TestType[] {
    const percentageByType = distribution.getTestPercentageByType();
    const underrepresentedTypes: TestType[] = [];
    
    // Default thresholds if not provided
    const defaultThresholds: { [key in TestType]?: number } = {
      [TestType.UNIT]: 50,
      [TestType.INTEGRATION]: 30,
      [TestType.E2E]: 10,
      [TestType.ACCEPTANCE]: 5,
      [TestType.PERFORMANCE]: 3,
      [TestType.CONTRACT]: 2
    };
    
    // Merge with provided thresholds
    const mergedThresholds = { ...defaultThresholds, ...thresholds };
    
    // Check each test type against its threshold
    Object.entries(percentageByType).forEach(([type, percentage]) => {
      const typeEnum = type as TestType;
      const threshold = mergedThresholds[typeEnum];
      
      if (threshold !== undefined && percentage < threshold) {
        underrepresentedTypes.push(typeEnum);
      }
    });
    
    return underrepresentedTypes;
  }
  
  /**
   * Get test distribution balance score (0-100)
   * Higher score means better balance across layers and types
   */
  public static calculateDistributionBalanceScore(
    distribution: TestDistributionMetrics
  ): number {
    const typePercentages = distribution.getTestPercentageByType();
    const layerPercentages = distribution.getTestPercentageByLayer();
    
    // Ideal distributions (these could be configurable)
    const idealTypeDistribution: { [key in TestType]?: number } = {
      [TestType.UNIT]: 60,
      [TestType.INTEGRATION]: 25,
      [TestType.E2E]: 8,
      [TestType.ACCEPTANCE]: 3,
      [TestType.PERFORMANCE]: 2,
      [TestType.CONTRACT]: 2
    };
    
    const idealLayerDistribution: { [key in ArchitecturalLayer]?: number } = {
      [ArchitecturalLayer.DOMAIN]: 35,
      [ArchitecturalLayer.USE_CASE]: 30,
      [ArchitecturalLayer.ADAPTER]: 25,
      [ArchitecturalLayer.INFRASTRUCTURE]: 10
    };
    
    // Calculate deviation from ideal distribution
    let typeDeviation = 0;
    let typeCount = 0;
    
    Object.entries(typePercentages).forEach(([type, percentage]) => {
      const ideal = idealTypeDistribution[type as TestType];
      if (ideal !== undefined) {
        typeDeviation += Math.abs(percentage - ideal);
        typeCount++;
      }
    });
    
    let layerDeviation = 0;
    let layerCount = 0;
    
    Object.entries(layerPercentages).forEach(([layer, percentage]) => {
      const ideal = idealLayerDistribution[layer as ArchitecturalLayer];
      if (ideal !== undefined) {
        layerDeviation += Math.abs(percentage - ideal);
        layerCount++;
      }
    });
    
    // Calculate average deviations
    const avgTypeDeviation = typeCount > 0 ? typeDeviation / typeCount : 0;
    const avgLayerDeviation = layerCount > 0 ? layerDeviation / layerCount : 0;
    
    // Calculate overall score (0-100, higher is better)
    // 100 would mean perfect distribution matching the ideal
    const typeScore = Math.max(0, 100 - avgTypeDeviation);
    const layerScore = Math.max(0, 100 - avgLayerDeviation);
    
    // Overall score is the average of type and layer scores
    return (typeScore + layerScore) / 2;
  }
}