/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

// Mock TransformationService

const TransformationService = function() {
  return {
    transformTestCase: jest.fn().mockResolvedValue({
      id: 'transformed-test-case-123',
      name: 'Transformed Test Case',
      description: 'This is a transformed test case',
      fields: {
        summary: 'Transformed Test Case',
        description: 'This is a transformed test case',
        priority: 'High',
        status: 'Active'
      }
    }),
    
    getFieldMappings: jest.fn().mockReturnValue({
      sourceFields: ['summary', 'description', 'priority', 'status'],
      targetFields: ['title', 'description', 'priority', 'state'],
      mappings: [
        { source: 'summary', target: 'title' },
        { source: 'description', target: 'description' },
        { source: 'priority', target: 'priority' },
        { source: 'status', target: 'state' }
      ]
    }),
    
    getTransformationPreview: jest.fn().mockResolvedValue({
      sourceTestCase: {
        id: 'source-test-case-123',
        name: 'Source Test Case',
        description: 'This is a source test case',
        fields: {
          summary: 'Source Test Case',
          description: 'This is a source test case',
          priority: 'Medium',
          status: 'New'
        }
      },
      transformedTestCase: {
        id: 'transformed-test-case-123',
        name: 'Transformed Test Case',
        description: 'This is a transformed test case',
        fields: {
          title: 'Transformed Test Case',
          description: 'This is a transformed test case',
          priority: 'High',
          state: 'Active'
        }
      },
      fieldMappings: [
        { source: 'summary', target: 'title', transformed: true },
        { source: 'description', target: 'description', transformed: true },
        { source: 'priority', target: 'priority', transformed: true },
        { source: 'status', target: 'state', transformed: true }
      ]
    })
  };
};

// Create a mock instance
const transformationService = TransformationService();

module.exports = {
  TransformationService,
  transformationService
};