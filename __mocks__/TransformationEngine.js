/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

// Mock TransformationEngine

const TransformationEngine = function() {
  return {
    applyTransformation: jest.fn().mockImplementation((sourceData, mappings) => {
      const result = { ...sourceData };
      if (mappings && Array.isArray(mappings)) {
        mappings.forEach(mapping => {
          if (mapping.source && mapping.target && sourceData[mapping.source]) {
            result[mapping.target] = sourceData[mapping.source];
          }
        });
      }
      return result;
    }),
    
    getFieldCompatibility: jest.fn().mockReturnValue({
      compatible: true,
      warnings: [],
      suggestions: []
    }),
    
    createDefaultMappings: jest.fn().mockImplementation((sourceFields, targetFields) => {
      return sourceFields.map((sourceField, index) => {
        return {
          source: sourceField,
          target: index < targetFields.length ? targetFields[index] : null,
          transformed: false
        };
      });
    })
  };
};

// Create a mock instance
const transformationEngine = TransformationEngine();

module.exports = {
  TransformationEngine,
  transformationEngine
};