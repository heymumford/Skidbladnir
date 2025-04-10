/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { TransformationPreview, MappingConfig } from '../types';

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
}