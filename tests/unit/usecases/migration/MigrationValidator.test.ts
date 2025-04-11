/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { 
  MigrationValidator, 
  ValidationLevel
} from '../../../../pkg/usecases/migration/MigrationValidator';
import { TestCase } from '../../../../pkg/domain/entities/TestCase';
import { Identifier } from '../../../../pkg/domain/value-objects/Identifier';

// Create mocks
const mockSourceProvider = {
  getName: jest.fn().mockReturnValue('MockSource'),
  getProjects: jest.fn(),
  getTestCases: jest.fn(),
  getTestCase: jest.fn(),
  createTestCase: jest.fn(),
  getTestCaseAttachments: jest.fn(),
  getTestCaseHistory: jest.fn(),
  addTestCaseAttachment: jest.fn(),
  addTestCaseHistory: jest.fn(),
  testConnection: jest.fn(),
  getFields: jest.fn(),
  getCapabilities: jest.fn()
};

const mockTargetProvider = {
  getName: jest.fn().mockReturnValue('MockTarget'),
  getProjects: jest.fn(),
  getTestCases: jest.fn(),
  getTestCase: jest.fn(),
  createTestCase: jest.fn(),
  getTestCaseAttachments: jest.fn(),
  getTestCaseHistory: jest.fn(),
  addTestCaseAttachment: jest.fn(),
  addTestCaseHistory: jest.fn(),
  testConnection: jest.fn(),
  getFields: jest.fn(),
  getCapabilities: jest.fn()
};

// Create mock logger
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn().mockImplementation(() => mockLogger)
};

// Sample test cases
const sampleTestCases: TestCase[] = [
  {
    id: new Identifier('TC-1'),
    name: 'Test Case 1',
    description: 'A sample test case',
    steps: [
      { action: 'Step 1', expected: 'Result 1' },
      { action: 'Step 2', expected: 'Result 2' }
    ],
    status: 'ACTIVE',
    priority: 'HIGH'
  },
  {
    id: new Identifier('TC-2'),
    name: 'Test Case 2',
    description: 'Another test case',
    steps: [],
    status: 'DRAFT',
    priority: 'LOW',
    // Missing required fields for target
  }
];

// Sample field definitions
const sampleSourceFields = [
  { id: 'id', name: 'ID', type: 'string', required: true },
  { id: 'name', name: 'Name', type: 'string', required: true },
  { id: 'description', name: 'Description', type: 'text', required: false },
  { id: 'status', name: 'Status', type: 'string', required: true, allowedValues: ['ACTIVE', 'DRAFT', 'ARCHIVED'] },
  { id: 'priority', name: 'Priority', type: 'string', required: true, allowedValues: ['HIGH', 'MEDIUM', 'LOW'] },
  { id: 'steps', name: 'Steps', type: 'array', required: false }
];

const sampleTargetFields = [
  { id: 'id', name: 'ID', type: 'string', required: true },
  { id: 'name', name: 'Name', type: 'string', required: true, maxLength: 100 },
  { id: 'description', name: 'Description', type: 'text', required: false },
  { id: 'status', name: 'Status', type: 'string', required: true, allowedValues: ['ACTIVE', 'PENDING', 'COMPLETED'] },
  { id: 'priority', name: 'Priority', type: 'string', required: true, allowedValues: ['HIGH', 'MEDIUM', 'LOW'] },
  { id: 'steps', name: 'Steps', type: 'array', required: false },
  { id: 'requiredField', name: 'Required Field', type: 'string', required: true } // Missing in source
];

// Sample capabilities
const sampleSourceCapabilities = {
  features: {
    attachments: true,
    history: true,
    testSteps: true,
    testSuites: true,
    testExecutions: true,
    customFields: true,
    idPreservation: false,
    transactions: false,
    bulkOperations: true,
    fieldValidation: true
  },
  limits: {
    maxAttachmentSize: 10485760, // 10MB
    maxTestCasesPerRequest: 100,
    maxBatchSize: 50,
    rateLimit: {
      requestsPerMinute: 300,
      burstLimit: 10
    }
  },
  formats: {
    supportedAttachmentTypes: ['image/png', 'image/jpeg', 'application/pdf', 'text/plain'],
    supportedTestCaseFormats: ['json']
  }
};

const sampleTargetCapabilities = {
  features: {
    attachments: true,
    history: true,
    testSteps: true,
    testSuites: false,
    testExecutions: true,
    customFields: false,
    idPreservation: false,
    transactions: false,
    bulkOperations: true,
    fieldValidation: true
  },
  limits: {
    maxAttachmentSize: 5242880, // 5MB
    maxTestCasesPerRequest: 50,
    maxBatchSize: 25,
    rateLimit: {
      requestsPerMinute: 180,
      burstLimit: 5
    }
  },
  formats: {
    supportedAttachmentTypes: ['image/png', 'image/jpeg', 'text/plain'],
    supportedTestCaseFormats: ['json']
  }
};

describe('MigrationValidator', () => {
  let validator: MigrationValidator;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Set up default mock implementations
    mockSourceProvider.getFields.mockResolvedValue(sampleSourceFields);
    mockTargetProvider.getFields.mockResolvedValue(sampleTargetFields);
    mockSourceProvider.getCapabilities.mockResolvedValue(sampleSourceCapabilities);
    mockTargetProvider.getCapabilities.mockResolvedValue(sampleTargetCapabilities);
    
    // Create validator instance
    validator = new MigrationValidator(
      mockSourceProvider as any,
      mockTargetProvider as any,
      mockLogger
    );
  });
  
  describe('validateMigration', () => {
    it('should return valid result for compatible migration in lenient mode', async () => {
      const result = await validator.validateMigration({
        sourceSystem: 'MockSource',
        targetSystem: 'MockTarget',
        testCases: sampleTestCases,
        validationLevel: ValidationLevel.LENIENT
      });
      
      expect(result.valid).toBe(true);
      expect(result.sourceSystem).toBe('MockSource');
      expect(result.targetSystem).toBe('MockTarget');
      expect(result.validatedCount).toBe(2);
      expect(result.warnings.length).toBeGreaterThan(0); // Should have warnings about missing required field
      expect(mockLogger.info).toHaveBeenCalled();
    });
    
    it('should return invalid result for incompatible migration in strict mode', async () => {
      const result = await validator.validateMigration({
        sourceSystem: 'MockSource',
        targetSystem: 'MockTarget',
        testCases: sampleTestCases,
        validationLevel: ValidationLevel.STRICT
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.code === 'MISSING_REQUIRED_FIELD')).toBe(true);
    });
    
    it('should skip validation when validation level is NONE', async () => {
      const result = await validator.validateMigration({
        sourceSystem: 'MockSource',
        targetSystem: 'MockTarget',
        testCases: sampleTestCases,
        validationLevel: ValidationLevel.NONE
      });
      
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.code === 'VALIDATION_SKIPPED')).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('skipping validation'));
    });
    
    it('should validate attachment compatibility when requested', async () => {
      // Prepare a test case with attachments
      const testCaseWithAttachments = {
        ...sampleTestCases[0],
        attachments: [
          { 
            id: 'att-1', 
            name: 'large-file.pdf', 
            size: 20000000, // 20MB, larger than target's limit
            contentType: 'application/pdf' // Not supported by target
          }
        ]
      };
      
      const result = await validator.validateMigration({
        sourceSystem: 'MockSource',
        targetSystem: 'MockTarget',
        testCases: [testCaseWithAttachments],
        validateAttachments: true,
        validationLevel: ValidationLevel.LENIENT
      });
      
      expect(result.warnings.some(w => w.code === 'ATTACHMENT_TOO_LARGE')).toBe(true);
      expect(result.warnings.some(w => w.code === 'UNSUPPORTED_ATTACHMENT_TYPE')).toBe(true);
    });
    
    it('should handle errors during validation gracefully', async () => {
      // Make getFields throw an error
      mockTargetProvider.getFields.mockRejectedValue(new Error('API error'));
      
      const result = await validator.validateMigration({
        sourceSystem: 'MockSource',
        targetSystem: 'MockTarget',
        testCases: sampleTestCases,
        validationLevel: ValidationLevel.STRICT
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'VALIDATION_FAILED')).toBe(true);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
  
  describe('validateMigrationPossibility', () => {
    it('should report migration as possible when providers are compatible', async () => {
      const result = await validator.validateMigrationPossibility(
        'MockSource',
        'MockTarget',
        true,
        true
      );
      
      expect(result.possible).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0); // Should have warnings about capabilities
      expect(result.errors.length).toBe(0);
    });
    
    it('should report migration as impossible when required target fields are missing', async () => {
      // Make target fields require something not in source
      mockTargetProvider.getFields.mockResolvedValue([
        ...sampleTargetFields,
        { id: 'criticalField', name: 'Critical Field', type: 'string', required: true }
      ]);
      
      const result = await validator.validateMigrationPossibility(
        'MockSource',
        'MockTarget'
      );
      
      expect(result.possible).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_REQUIRED_FIELD_MAPPING')).toBe(true);
    });
    
    it('should report migration as impossible when target does not support attachments', async () => {
      // Make target not support attachments
      mockTargetProvider.getCapabilities.mockResolvedValue({
        ...sampleTargetCapabilities,
        features: {
          ...sampleTargetCapabilities.features,
          attachments: false
        }
      });
      
      const result = await validator.validateMigrationPossibility(
        'MockSource',
        'MockTarget',
        true, // Require attachments
        false
      );
      
      expect(result.possible).toBe(false);
      expect(result.errors.some(e => e.code === 'TARGET_NO_ATTACHMENTS')).toBe(true);
    });
  });
});