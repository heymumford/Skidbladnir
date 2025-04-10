/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Test Suite for Zephyr Extractor Data Type Handling
 * 
 * This test verifies that the Zephyr mapper correctly handles all data types
 * during transformation, ensuring proper data type preservation.
 */

// Import directly from the ZephyrMapper module to test its data type handling
import { ZephyrMapper } from '../../../packages/providers/zephyr/models/mappers';
import { FieldType } from '../../../packages/common/src/models/field-definition';
import { TestCase, TestStep, Attachment, TestExecution } from '../../../packages/common/src/models/entities';

describe('Zephyr Extractor Data Type Handling', () => {
  describe('Test Case Field Types', () => {
    it('should handle text fields with special characters', () => {
      const zephyrTest = {
        id: 'tc1',
        key: 'TC-1',
        name: 'Test with special chars: áéíóú',
        description: '<div>HTML content with & < > " \' characters</div>',
        objective: `Multi-line
        text content
        with line breaks`,
        precondition: 'Test precondition with emoji 🚀',
        status: 'READY'
      };

      const testCase = ZephyrMapper.toTestCase(zephyrTest);
      
      // Verify text field handling
      expect(testCase.name).toBe('Test with special chars: áéíóú');
      expect(testCase.description).toBe('<div>HTML content with & < > " \' characters</div>');
      expect(testCase.objective).toBe(`Multi-line
        text content
        with line breaks`);
      expect(testCase.precondition).toBe('Test precondition with emoji 🚀');
    });

    it('should handle date fields correctly', () => {
      // Setup with various date formats
      const testDate = new Date('2025-04-15T14:30:45.123Z');
      const dateIsoString = testDate.toISOString();
      
      const zephyrTest = {
        id: 'tc2',
        key: 'TC-2',
        name: 'Date Test Case',
        createdOn: dateIsoString,
        updatedOn: testDate.getTime(),
        customFields: {
          dateField1: dateIsoString,
          dateField2: testDate.getTime(),
          dateField3: '2025-04-15',
          dateField4: '04/15/2025'
        }
      };

      const testCase = ZephyrMapper.toTestCase(zephyrTest);
      
      // Verify date field handling
      expect(testCase.createdAt instanceof Date).toBe(true);
      expect(testCase.createdAt?.toISOString()).toBe(dateIsoString);
      
      expect(testCase.updatedAt instanceof Date).toBe(true);
      
      // Custom date fields should be preserved in their original format
      expect(testCase.customFields?.get('dateField1')).toBe(dateIsoString);
      expect(testCase.customFields?.get('dateField2')).toBe(testDate.getTime());
      expect(testCase.customFields?.get('dateField3')).toBe('2025-04-15');
      expect(testCase.customFields?.get('dateField4')).toBe('04/15/2025');
    });

    it('should handle numeric fields correctly', () => {
      const zephyrTest = {
        id: 'tc3',
        key: 'TC-3',
        name: 'Numeric Test Case',
        customFields: {
          intField: 42,
          floatField: 3.14159,
          stringNumber: '100',
          bigNumber: 9007199254740991, // MAX_SAFE_INTEGER
          zero: 0,
          negative: -42,
          booleanAsNumber: 1
        }
      };

      const testCase = ZephyrMapper.toTestCase(zephyrTest);
      
      // Verify numeric field handling
      expect(testCase.customFields?.get('intField')).toBe(42);
      expect(testCase.customFields?.get('floatField')).toBe(3.14159);
      expect(testCase.customFields?.get('stringNumber')).toBe('100');
      expect(testCase.customFields?.get('bigNumber')).toBe(9007199254740991);
      expect(testCase.customFields?.get('zero')).toBe(0);
      expect(testCase.customFields?.get('negative')).toBe(-42);
      expect(testCase.customFields?.get('booleanAsNumber')).toBe(1);
    });

    it('should handle boolean fields correctly', () => {
      const zephyrTest = {
        id: 'tc4',
        key: 'TC-4',
        name: 'Boolean Test Case',
        customFields: {
          boolTrue: true,
          boolFalse: false,
          stringTrue: 'true',
          stringFalse: 'false',
          numTrue: 1,
          numFalse: 0
        }
      };

      const testCase = ZephyrMapper.toTestCase(zephyrTest);
      
      // Verify boolean field handling
      expect(testCase.customFields?.get('boolTrue')).toBe(true);
      expect(testCase.customFields?.get('boolFalse')).toBe(false);
      expect(testCase.customFields?.get('stringTrue')).toBe('true');
      expect(testCase.customFields?.get('stringFalse')).toBe('false');
      expect(testCase.customFields?.get('numTrue')).toBe(1);
      expect(testCase.customFields?.get('numFalse')).toBe(0);
    });

    it('should handle array/collection fields correctly', () => {
      const zephyrTest = {
        id: 'tc5',
        key: 'TC-5',
        name: 'Array Test Case',
        labels: ['label1', 'label2', 'label with spaces'],
        customFields: {
          multiSelect: ['option1', 'option2'],
          emptyArray: [],
          multiUserField: ['user1', 'user2'],
          mixedArray: ['string', 42, true],
          nestedArray: [['nested1', 'nested2'], ['nested3']]
        }
      };

      const testCase = ZephyrMapper.toTestCase(zephyrTest);
      
      // Verify array field handling
      expect(Array.isArray(testCase.labels)).toBe(true);
      expect(testCase.labels).toEqual(['label1', 'label2', 'label with spaces']);
      
      expect(Array.isArray(testCase.customFields?.get('multiSelect'))).toBe(true);
      expect(testCase.customFields?.get('multiSelect')).toEqual(['option1', 'option2']);
      
      expect(testCase.customFields?.get('emptyArray')).toEqual([]);
      expect(testCase.customFields?.get('multiUserField')).toEqual(['user1', 'user2']);
      expect(testCase.customFields?.get('mixedArray')).toEqual(['string', 42, true]);
      expect(testCase.customFields?.get('nestedArray')).toEqual([['nested1', 'nested2'], ['nested3']]);
    });

    it('should handle deeply nested objects correctly', () => {
      const zephyrTest = {
        id: 'tc6',
        key: 'TC-6',
        name: 'Nested Object Test Case',
        customFields: {
          objectField: {
            prop1: 'value1',
            prop2: 42,
            nested: {
              nestedProp1: 'nested value',
              nestedArray: [1, 2, 3],
              deeplyNested: {
                deepProp: 'deep value',
                deepArray: [{ id: 1, name: 'item1' }, { id: 2, name: 'item2' }]
              }
            }
          },
          complexObject: {
            date: new Date('2025-01-01').toISOString(),
            numberMap: { one: 1, two: 2 },
            mixedValues: [null, undefined, '', 0, false]
          }
        }
      };

      const testCase = ZephyrMapper.toTestCase(zephyrTest);
      
      // Verify nested object handling
      const objectField = testCase.customFields?.get('objectField');
      expect(typeof objectField).toBe('object');
      expect(objectField.prop1).toBe('value1');
      expect(objectField.prop2).toBe(42);
      expect(objectField.nested.nestedProp1).toBe('nested value');
      expect(Array.isArray(objectField.nested.nestedArray)).toBe(true);
      expect(objectField.nested.deeplyNested.deepProp).toBe('deep value');
      expect(objectField.nested.deeplyNested.deepArray[0].name).toBe('item1');
      
      const complexObject = testCase.customFields?.get('complexObject');
      expect(typeof complexObject).toBe('object');
      expect(complexObject.date).toBe(new Date('2025-01-01').toISOString());
      expect(complexObject.numberMap.one).toBe(1);
      expect(Array.isArray(complexObject.mixedValues)).toBe(true);
      expect(complexObject.mixedValues).toContain(null);
      expect(complexObject.mixedValues).toContain(0);
      expect(complexObject.mixedValues).toContain(false);
    });

    it('should handle null, undefined and empty values correctly', () => {
      const zephyrTest = {
        id: 'tc7',
        key: 'TC-7',
        name: 'Null Test Case',
        description: null,
        objective: undefined,
        precondition: '',
        customFields: {
          nullField: null,
          undefinedField: undefined,
          emptyString: '',
          emptyObject: {},
          emptyArray: []
        }
      };

      const testCase = ZephyrMapper.toTestCase(zephyrTest);
      
      // Verify null/undefined handling
      expect(testCase.description).toBe('');  // Null should become empty string per mapper
      expect(testCase.objective).toBe('');    // Undefined should become empty string per mapper
      expect(testCase.precondition).toBe(''); // Empty string remains empty
      
      expect(testCase.customFields?.get('nullField')).toBe(null);
      expect(testCase.customFields?.get('undefinedField')).toBeUndefined();
      expect(testCase.customFields?.get('emptyString')).toBe('');
      expect(typeof testCase.customFields?.get('emptyObject')).toBe('object');
      expect(Object.keys(testCase.customFields?.get('emptyObject')).length).toBe(0);
      expect(Array.isArray(testCase.customFields?.get('emptyArray'))).toBe(true);
      expect(testCase.customFields?.get('emptyArray').length).toBe(0);
    });
  });

  describe('Test Steps Data Types', () => {
    it('should handle complex test steps correctly', () => {
      const zephyrSteps = [
        {
          id: 'step1',
          index: 1,
          description: 'Step with <b>HTML</b> content',
          expectedResult: '<ul><li>List item 1</li><li>List item 2</li></ul>',
          testData: '{"key": "value", "array": [1, 2, 3]}',
          attachments: [
            { id: 'att1', filename: 'step-image.png', contentType: 'image/png', fileSize: 1024 }
          ]
        },
        {
          id: 'step2',
          index: 2,
          description: 'Step with special chars: áéíóú',
          expectedResult: 'Expected result with emoji 🚀',
          testData: 'Multi-line\ntest data\nwith line breaks'
        },
        {
          id: null,  // Missing ID
          index: 3,
          description: 'Step without ID',
          expectedResult: ''  // Empty expected result
        }
      ];

      const testSteps = ZephyrMapper.toTestSteps(zephyrSteps);
      
      // Verify test step handling
      expect(testSteps.length).toBe(3);
      
      // Step 1 - HTML and attachments
      expect(testSteps[0].id).toBe('step1');
      expect(testSteps[0].sequence).toBe(1);
      expect(testSteps[0].action).toBe('Step with <b>HTML</b> content');
      expect(testSteps[0].expectedResult).toBe('<ul><li>List item 1</li><li>List item 2</li></ul>');
      expect(testSteps[0].testData).toBe('{"key": "value", "array": [1, 2, 3]}');
      expect(testSteps[0].attachments?.length).toBe(1);
      expect(testSteps[0].attachments?.[0].filename).toBe('step-image.png');
      
      // Step 2 - Special characters
      expect(testSteps[1].sequence).toBe(2);
      expect(testSteps[1].action).toBe('Step with special chars: áéíóú');
      expect(testSteps[1].expectedResult).toBe('Expected result with emoji 🚀');
      expect(testSteps[1].testData).toBe('Multi-line\ntest data\nwith line breaks');
      
      // Step 3 - Missing ID and empty expected result
      expect(testSteps[2].id).toBeUndefined();
      expect(testSteps[2].sequence).toBe(3);
      expect(testSteps[2].action).toBe('Step without ID');
      expect(testSteps[2].expectedResult).toBe('');
    });
  });

  describe('Attachments Data Types', () => {
    it('should handle various attachment types correctly', () => {
      const zephyrAttachments = [
        {
          id: 'att1',
          filename: 'test-file.pdf',
          contentType: 'application/pdf',
          fileSize: 1024 * 1024, // 1MB
          comment: 'Test PDF attachment',
          createdBy: 'user1',
          createdOn: '2025-01-01T10:30:00Z'
        },
        {
          id: 'att2',
          filename: 'file with spaces & special chars.tar.gz',
          contentType: 'application/x-gzip',
          fileSize: 1024,
          comment: null, // Missing comment
          createdBy: 'user2',
          createdOn: '2025-01-02T14:45:00Z'
        },
        {
          id: 'att3',
          filename: 'unknown-file.bin',
          // Intentionally missing contentType
          // Intentionally missing fileSize
          createdBy: 'user3'
        },
        {
          id: 'att4',
          filename: 'screenshot.png',
          contentType: 'image/png',
          fileSize: 256 * 1024,
          comment: 'Screenshot with special chars: áéíóú 🚀',
          createdBy: 'user1',
          createdOn: '2025-01-03T09:15:00Z'
        }
      ];

      const attachments = ZephyrMapper.toAttachments(zephyrAttachments);
      
      // Verify attachment handling
      expect(attachments.length).toBe(4);
      
      // Attachment 1 - Normal case
      expect(attachments[0].id).toBe('att1');
      expect(attachments[0].filename).toBe('test-file.pdf');
      expect(attachments[0].contentType).toBe('application/pdf');
      expect(attachments[0].size).toBe(1024 * 1024);
      expect(attachments[0].description).toBe('Test PDF attachment');
      expect(attachments[0].createdBy).toBe('user1');
      expect(attachments[0].createdAt instanceof Date).toBe(true);
      expect(attachments[0].createdAt?.toISOString()).toBe('2025-01-01T10:30:00.000Z');
      
      // Attachment 2 - Special characters and null comment
      expect(attachments[1].filename).toBe('file with spaces & special chars.tar.gz');
      expect(attachments[1].contentType).toBe('application/x-gzip');
      expect(attachments[1].description).toBe('');
      expect(attachments[1].createdBy).toBe('user2');
      expect(attachments[1].createdAt instanceof Date).toBe(true);
      
      // Attachment 3 - Missing fields
      expect(attachments[2].filename).toBe('unknown-file.bin');
      expect(attachments[2].contentType).toBe('application/octet-stream'); // Should use default
      expect(attachments[2].size).toBeUndefined();
      expect(attachments[2].createdBy).toBe('user3');
      expect(attachments[2].createdAt).toBeUndefined();
      
      // Attachment 4 - Image with special characters in comment
      expect(attachments[3].filename).toBe('screenshot.png');
      expect(attachments[3].contentType).toBe('image/png');
      expect(attachments[3].size).toBe(256 * 1024);
      expect(attachments[3].description).toBe('Screenshot with special chars: áéíóú 🚀');
      expect(attachments[3].createdBy).toBe('user1');
    });
  });

  describe('Field Definitions and Custom Field Types', () => {
    it('should map field types correctly', () => {
      const zephyrFields = [
        { id: 'field1', name: 'Text Field', type: 'TEXT', required: true },
        { id: 'field2', name: 'Rich Text Field', type: 'RICH_TEXT', required: false },
        { id: 'field3', name: 'String Field', type: 'STRING', required: false },
        { id: 'field4', name: 'Integer Field', type: 'INT', required: false },
        { id: 'field5', name: 'Float Field', type: 'FLOAT', required: false },
        { id: 'field6', name: 'Date Field', type: 'DATE', required: false },
        { id: 'field7', name: 'DateTime Field', type: 'DATETIME', required: false },
        { id: 'field8', name: 'Checkbox Field', type: 'CHECKBOX', required: false },
        { id: 'field9', name: 'Dropdown Field', type: 'DROPDOWN', required: false, 
          options: [
            { id: 'opt1', value: 'Option 1', default: true },
            { id: 'opt2', value: 'Option 2', default: false }
          ]
        },
        { id: 'field10', name: 'Multi-select Field', type: 'MULTISELECT', required: false },
        { id: 'field11', name: 'User Field', type: 'USER', required: false },
        { id: 'field12', name: 'Multi-User Field', type: 'MULTIUSER', required: false },
        { id: 'field13', name: 'URL Field', type: 'URL', required: false },
        { id: 'field14', name: 'Custom Field', type: 'CUSTOM_TYPE', required: false }
      ];

      const fields = ZephyrMapper.toFieldDefinitions(zephyrFields);
      
      // Verify field type mapping
      expect(fields.length).toBe(14);
      
      // Check each field type is mapped correctly
      const fieldMap = new Map(fields.map(f => [f.id, f]));
      
      expect(fieldMap.get('field1')?.type).toBe(FieldType.TEXT);
      expect(fieldMap.get('field2')?.type).toBe(FieldType.TEXT);
      expect(fieldMap.get('field3')?.type).toBe(FieldType.STRING);
      expect(fieldMap.get('field4')?.type).toBe(FieldType.NUMBER);
      expect(fieldMap.get('field5')?.type).toBe(FieldType.NUMBER);
      expect(fieldMap.get('field6')?.type).toBe(FieldType.DATE);
      expect(fieldMap.get('field7')?.type).toBe(FieldType.DATETIME);
      expect(fieldMap.get('field8')?.type).toBe(FieldType.BOOLEAN);
      expect(fieldMap.get('field9')?.type).toBe(FieldType.SELECT);
      expect(fieldMap.get('field10')?.type).toBe(FieldType.MULTISELECT);
      expect(fieldMap.get('field11')?.type).toBe(FieldType.USER);
      expect(fieldMap.get('field12')?.type).toBe(FieldType.MULTIUSER);
      expect(fieldMap.get('field13')?.type).toBe(FieldType.URL);
      expect(fieldMap.get('field14')?.type).toBe(FieldType.CUSTOM);
      
      // Check options are preserved
      const dropdownField = fieldMap.get('field9');
      expect(dropdownField?.options?.length).toBe(2);
      expect(dropdownField?.options?.[0].value).toBe('Option 1');
      expect(dropdownField?.options?.[0].default).toBe(true);
    });
  });
  
  describe('Bidirectional Mapping', () => {
    it('should round-trip test case data correctly', () => {
      const originalZephyrTest = {
        id: 'tc-roundtrip',
        key: 'TC-RT',
        name: 'Round Trip Test Case',
        description: 'This is a round trip test',
        objective: 'To test bidirectional mapping',
        precondition: 'System in test state',
        priority: 'HIGH',
        status: 'ACTIVE',
        folderId: 'folder-1',
        labels: ['label1', 'label2'],
        customFields: {
          stringField: 'string value',
          numberField: 42,
          boolField: true,
          dateField: '2025-01-01'
        },
        steps: [
          {
            id: 'step1',
            index: 1,
            description: 'Test step 1',
            expectedResult: 'Expected result 1'
          }
        ]
      };
      
      // Convert to internal model
      const testCase = ZephyrMapper.toTestCase(originalZephyrTest);
      
      // Convert back to Zephyr format
      const roundTrippedZephyrTest = ZephyrMapper.fromTestCase(testCase);
      
      // Verify critical fields are preserved
      expect(roundTrippedZephyrTest.name).toBe(originalZephyrTest.name);
      expect(roundTrippedZephyrTest.description).toBe(originalZephyrTest.description);
      expect(roundTrippedZephyrTest.objective).toBe(originalZephyrTest.objective);
      expect(roundTrippedZephyrTest.precondition).toBe(originalZephyrTest.precondition);
      expect(roundTrippedZephyrTest.priority).toBe(originalZephyrTest.priority);
      expect(roundTrippedZephyrTest.status).toBe(originalZephyrTest.status);
      expect(roundTrippedZephyrTest.folderId).toBe(originalZephyrTest.folderId);
      expect(roundTrippedZephyrTest.labels).toEqual(originalZephyrTest.labels);
      expect(roundTrippedZephyrTest.steps.length).toBe(originalZephyrTest.steps.length);
      expect(roundTrippedZephyrTest.steps[0].description).toBe(originalZephyrTest.steps[0].description);
      
      // Verify custom fields are preserved
      expect(roundTrippedZephyrTest.customFields.stringField).toBe(originalZephyrTest.customFields.stringField);
      expect(roundTrippedZephyrTest.customFields.numberField).toBe(originalZephyrTest.customFields.numberField);
      expect(roundTrippedZephyrTest.customFields.boolField).toBe(originalZephyrTest.customFields.boolField);
      expect(roundTrippedZephyrTest.customFields.dateField).toBe(originalZephyrTest.customFields.dateField);
    });
    
    it('should round-trip test execution data correctly', () => {
      const originalZephyrExecution = {
        id: 'exec1',
        testId: 'tc1',
        cycleId: 'cycle1',
        status: 'PASSED',
        comment: 'Execution comment',
        executedBy: 'tester1',
        executedOn: '2025-04-15T10:30:00Z',
        environment: 'QA',
        timeSpentInSeconds: 300,
        customFields: {
          browser: 'Chrome',
          version: '15.0.1'
        },
        stepResults: [
          {
            stepId: 'step1',
            index: 1,
            status: 'PASSED',
            actualResult: 'Actual result for step 1',
            comment: 'Step passed as expected'
          }
        ]
      };
      
      // Convert to internal model
      const execution = ZephyrMapper.toTestExecution(originalZephyrExecution);
      
      // Convert back to Zephyr format
      const roundTrippedExecution = ZephyrMapper.fromTestExecution(execution);
      
      // Verify critical fields are preserved
      expect(roundTrippedExecution.testId).toBe(originalZephyrExecution.testId);
      expect(roundTrippedExecution.cycleId).toBe(originalZephyrExecution.cycleId);
      expect(roundTrippedExecution.status).toBe(originalZephyrExecution.status);
      expect(roundTrippedExecution.comment).toBe(originalZephyrExecution.comment);
      expect(roundTrippedExecution.executedBy).toBe(originalZephyrExecution.executedBy);
      expect(roundTrippedExecution.environment).toBe(originalZephyrExecution.environment);
      expect(roundTrippedExecution.timeSpentInSeconds).toBe(originalZephyrExecution.timeSpentInSeconds);
      
      // Verify step results are preserved
      expect(roundTrippedExecution.stepResults?.length).toBe(originalZephyrExecution.stepResults.length);
      expect(roundTrippedExecution.stepResults?.[0].status).toBe(originalZephyrExecution.stepResults[0].status);
      expect(roundTrippedExecution.stepResults?.[0].actualResult).toBe(originalZephyrExecution.stepResults[0].actualResult);
      
      // Verify custom fields are preserved
      expect(roundTrippedExecution.customFields.browser).toBe(originalZephyrExecution.customFields.browser);
      expect(roundTrippedExecution.customFields.version).toBe(originalZephyrExecution.customFields.version);
    });
  });
});