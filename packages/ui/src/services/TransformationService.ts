/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { TransformationPreview, MappingConfig, FieldMapping } from '../types';
import { transformationEngine } from './TransformationEngine';
import { TransformationType } from '../components/Transformation/FieldTransformation';

/**
 * Service for handling test case transformations.
 */
export class TransformationService {
  private apiBaseUrl: string;

  constructor(apiBaseUrl: string = '/api') {
    this.apiBaseUrl = apiBaseUrl;
  }

  /**
   * Get a preview of a transformation for a test case.
   * 
   * @param testCaseId The ID of the test case to preview
   * @param mappingConfig The mapping configuration to use
   * @returns A promise that resolves to the transformation preview
   */
  async getTransformationPreview(
    testCaseId: string,
    mappingConfig: MappingConfig
  ): Promise<TransformationPreview> {
    try {
      // In a real implementation, this would call the API
      // For development/testing, use the mock implementation
      if (process.env.NODE_ENV === 'development') {
        return this.getMockTransformationPreview();
      }
      
      const response = await fetch(`${this.apiBaseUrl}/transformation/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testCaseId,
          sourceProviderId: mappingConfig.sourceProviderId,
          targetProviderId: mappingConfig.targetProviderId,
          fieldMappings: mappingConfig.fieldMappings,
          defaultValues: mappingConfig.defaultValues
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get transformation preview: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error getting transformation preview:', error);
      throw error;
    }
  }
  
  /**
   * Save a transformation mapping configuration.
   * 
   * @param config The mapping configuration to save
   * @returns A promise that resolves to the saved configuration
   */
  async saveTransformationConfig(config: MappingConfig): Promise<MappingConfig> {
    try {
      // In a real implementation, this would call the API
      // For development/testing, return the input
      if (process.env.NODE_ENV === 'development') {
        return config;
      }
      
      const response = await fetch(`${this.apiBaseUrl}/transformation/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error(`Failed to save transformation config: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error saving transformation config:', error);
      throw error;
    }
  }
  
  /**
   * Get all saved transformation configurations.
   * 
   * @returns A promise that resolves to a list of mapping configurations
   */
  async getTransformationConfigs(): Promise<MappingConfig[]> {
    try {
      // In a real implementation, this would call the API
      // For development/testing, use the mock implementation
      if (process.env.NODE_ENV === 'development') {
        return this.getMockTransformationConfigs();
      }
      
      const response = await fetch(`${this.apiBaseUrl}/transformation/configs`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get transformation configs: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error getting transformation configs:', error);
      throw error;
    }
  }
  
  /**
   * Apply a transformation to a set of test cases.
   * 
   * @param testCaseIds The IDs of the test cases to transform
   * @param mappingConfigId The ID of the mapping configuration to use
   * @returns A promise that resolves to a status object
   */
  async applyTransformation(
    testCaseIds: string[],
    mappingConfigId: string
  ): Promise<Record<string, any>> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/transformation/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testCaseIds,
          mappingConfigId
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to apply transformation: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error applying transformation:', error);
      throw error;
    }
  }
  
  /**
   * Analyze field compatibility between source and target providers.
   * 
   * @param sourceProviderId The source provider ID
   * @param targetProviderId The target provider ID
   * @returns A promise that resolves to a compatibility analysis
   */
  async analyzeFieldCompatibility(
    sourceProviderId: string,
    targetProviderId: string
  ): Promise<Record<string, any>> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/transformation/analyze-compatibility`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceProviderId,
          targetProviderId
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to analyze field compatibility: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error analyzing field compatibility:', error);
      throw error;
    }
  }
  
  /**
   * Apply transformations to a test case.
   * 
   * @param testCase The test case to transform
   * @param fieldMappings The field mappings to apply
   * @returns A transformed test case
   */
  applyFieldTransformations(
    testCase: Record<string, any>,
    fieldMappings: FieldMapping[]
  ): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const mapping of fieldMappings) {
      const sourceId = mapping.sourceId;
      const targetId = mapping.targetId;
      const sourceValue = testCase[sourceId];
      
      if (mapping.transformation) {
        try {
          const config = JSON.parse(mapping.transformation);
          const transformedValue = transformationEngine.applyTransformation(
            sourceValue,
            config.type as TransformationType,
            config.params || {},
            testCase
          );
          
          result[targetId] = transformedValue;
        } catch (error) {
          console.error(`Error applying transformation for ${sourceId} -> ${targetId}:`, error);
          result[targetId] = sourceValue;
        }
      } else {
        // No transformation, direct mapping
        result[targetId] = sourceValue;
      }
    }
    
    return result;
  }
  
  /**
   * Apply transformation to a test case field.
   * 
   * @param field The field ID
   * @param value The field value
   * @param transformationType The type of transformation to apply
   * @param transformationParams The transformation parameters
   * @param sourceObject The full source object for multi-field transformations
   * @returns The transformed value
   */
  applyFieldTransformation(
    field: string,
    value: any,
    transformationType: TransformationType,
    transformationParams: Record<string, any>,
    sourceObject?: Record<string, any>
  ): any {
    return transformationEngine.applyTransformation(
      value,
      transformationType,
      transformationParams,
      sourceObject
    );
  }
  
  /**
   * Generate a preview of a transformed test case.
   * 
   * @param testCase The test case to transform
   * @param fieldMappings The field mappings to apply
   * @returns A preview of the transformed test case
   */
  generateTransformationPreview(
    testCase: Record<string, any>,
    fieldMappings: FieldMapping[]
  ): Record<string, any> {
    return this.applyFieldTransformations(testCase, fieldMappings);
  }
  
  /**
   * For development/demo purposes - generate a mock transformation preview
   */
  getMockTransformationPreview(): TransformationPreview {
    return {
      sourceData: {
        id: 'TC-123',
        name: 'Login Test',
        description: 'Verify user can log in with valid credentials',
        status: 'ACTIVE',
        priority: 'HIGH',
        steps: [
          {
            id: 'step-1',
            description: 'Navigate to login page',
            expectedResult: 'Login page is displayed'
          },
          {
            id: 'step-2',
            description: 'Enter valid username and password',
            expectedResult: 'Credentials are accepted'
          },
          {
            id: 'step-3',
            description: 'Click login button',
            expectedResult: 'User is redirected to dashboard'
          }
        ],
        owner: 'john.doe@example.com',
        createdDate: '2023-05-15T10:00:00Z',
        labels: ['login', 'authentication', 'smoke']
      },
      canonicalData: {
        id: 'TC-123',
        name: 'Login Test',
        objective: 'Verify user can log in with valid credentials',
        status: 'READY',
        priority: 'HIGH',
        testSteps: [
          {
            id: 'step-1',
            order: 1,
            action: 'Navigate to login page',
            expectedResult: 'Login page is displayed'
          },
          {
            id: 'step-2',
            order: 2,
            action: 'Enter valid username and password',
            expectedResult: 'Credentials are accepted'
          },
          {
            id: 'step-3',
            order: 3,
            action: 'Click login button',
            expectedResult: 'User is redirected to dashboard'
          }
        ],
        owner: {
          id: 'user-123',
          email: 'john.doe@example.com'
        },
        createdAt: '2023-05-15T10:00:00Z',
        tags: [
          { name: 'login' },
          { name: 'authentication' },
          { name: 'smoke' }
        ]
      },
      targetData: {
        key: 'TC123',
        summary: 'Login Test',
        description: 'Verify user can log in with valid credentials',
        status: 'Active',
        priority: 'P1',
        testSteps: [
          {
            stepIndex: 1,
            action: 'Navigate to login page',
            expectedResult: 'Login page is displayed'
          },
          {
            stepIndex: 2,
            action: 'Enter valid username and password',
            expectedResult: 'Credentials are accepted'
          },
          {
            stepIndex: 3,
            action: 'Click login button',
            expectedResult: 'User is redirected to dashboard'
          }
        ],
        assignee: 'john.doe@example.com',
        created: '2023-05-15T10:00:00Z',
        labels: ['login', 'authentication', 'smoke']
      },
      validationMessages: [
        'Field "attachments" not mapped in target system',
        'Field "testType" required in target system but not provided'
      ]
    };
  }
  
  /**
   * For development/demo purposes - generate mock transformation configs
   */
  getMockTransformationConfigs(): MappingConfig[] {
    return [
      {
        name: 'Zephyr to qTest - Basic Mapping',
        sourceProviderId: 'zephyr',
        targetProviderId: 'qtest',
        fieldMappings: [
          { sourceId: 'name', targetId: 'name', transformation: null },
          { sourceId: 'description', targetId: 'description', transformation: null },
          { sourceId: 'steps', targetId: 'testSteps', transformation: null },
          { sourceId: 'priority', targetId: 'priority', transformation: null },
          { sourceId: 'status', targetId: 'status', transformation: null }
        ]
      },
      {
        name: 'Zephyr to qTest - Complete Mapping',
        sourceProviderId: 'zephyr',
        targetProviderId: 'qtest',
        fieldMappings: [
          { sourceId: 'name', targetId: 'name', transformation: null },
          { sourceId: 'description', targetId: 'description', transformation: null },
          { sourceId: 'steps', targetId: 'testSteps', transformation: null },
          { sourceId: 'priority', targetId: 'priority', transformation: null },
          { sourceId: 'status', targetId: 'status', transformation: null },
          { sourceId: 'labels', targetId: 'tags', transformation: null },
          { sourceId: 'precondition', targetId: 'preconditions', transformation: null },
          { sourceId: 'component', targetId: 'module', transformation: null },
          { sourceId: 'owner', targetId: 'assignedTo', transformation: null }
        ]
      }
    ];
  }
}

// Create and export a singleton instance
export const transformationService = new TransformationService();
