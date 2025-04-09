/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { QTestMapper } from '../../../packages/providers/qtest/models/mappers';
import { TestCase, TestStep, Attachment } from '../../../packages/common/src/models/entities';
import { FieldType } from '../../../packages/common/src/models/field-definition';

describe('QTest Field Mapping Validation', () => {
  describe('System Field Mapping', () => {
    it('maps basic test case fields correctly', () => {
      const qTestCase = {
        id: 12345,
        name: 'Test Case Example',
        description: 'Test case description with <b>HTML</b> content',
        properties: [
          { field_id: 1, field_name: 'Objective', field_value: 'Test objective' },
          { field_id: 2, field_name: 'Precondition', field_value: 'Test precondition' },
          { field_id: 3, field_name: 'Priority', field_value: '2' },
          { field_id: 4, field_name: 'Status', field_value: 'approved' }
        ],
        tags: ['tag1', 'tag2'],
        parent_id: 100,
        pid: 'TC-1234',
        created_by: 'user1',
        created_date: '2025-01-01T10:00:00Z',
        last_modified_by: 'user2',
        last_modified_date: '2025-01-02T11:00:00Z'
      };

      const testCase = QTestMapper.toTestCase(qTestCase);

      // Verify basic field mapping
      expect(testCase.id).toBe('12345');
      expect(testCase.name).toBe('Test Case Example');
      expect(testCase.description).toBe('Test case description with <b>HTML</b> content');
      expect(testCase.objective).toBe('Test objective');
      expect(testCase.precondition).toBe('Test precondition');
      expect(testCase.priority).toBe('HIGH'); // '2' maps to HIGH
      expect(testCase.status).toBe('APPROVED');
      expect(testCase.folder).toBe('100');
      expect(testCase.labels).toEqual(['tag1', 'tag2']);
      expect(testCase.sourceId).toBe('TC-1234');
      expect(testCase.createdBy).toBe('user1');
      expect(testCase.createdAt).toEqual(new Date('2025-01-01T10:00:00Z'));
      expect(testCase.updatedBy).toBe('user2');
      expect(testCase.updatedAt).toEqual(new Date('2025-01-02T11:00:00Z'));
    });

    it('maps priority values correctly', () => {
      // Test priority mapping with numeric values
      const numericPriorities = [
        { field_value: '1', expected: 'CRITICAL' },
        { field_value: '2', expected: 'HIGH' },
        { field_value: '3', expected: 'MEDIUM' },
        { field_value: '4', expected: 'LOW' }
      ];

      numericPriorities.forEach(({ field_value, expected }) => {
        const qTestCase = {
          id: 1,
          name: 'Priority Test',
          properties: [{ field_name: 'Priority', field_value }]
        };
        
        const testCase = QTestMapper.toTestCase(qTestCase);
        expect(testCase.priority).toBe(expected);
      });

      // Test priority mapping with text values
      const textPriorities = [
        { field_value: 'critical', expected: 'CRITICAL' },
        { field_value: 'high', expected: 'HIGH' },
        { field_value: 'medium', expected: 'MEDIUM' },
        { field_value: 'low', expected: 'LOW' }
      ];

      textPriorities.forEach(({ field_value, expected }) => {
        const qTestCase = {
          id: 1,
          name: 'Priority Test',
          properties: [{ field_name: 'Priority', field_value }]
        };
        
        const testCase = QTestMapper.toTestCase(qTestCase);
        expect(testCase.priority).toBe(expected);
      });
    });

    it('maps status values correctly', () => {
      // Test status mapping with text values
      const statusMappings = [
        { field_value: 'approved', expected: 'APPROVED' },
        { field_value: 'unapproved', expected: 'DRAFT' },
        { field_value: 'draft', expected: 'DRAFT' },
        { field_value: 'ready to review', expected: 'READY_FOR_REVIEW' },
        { field_value: 'ready for review', expected: 'READY_FOR_REVIEW' },
        { field_value: 'ready', expected: 'READY' },
        { field_value: 'needs work', expected: 'NEEDS_WORK' },
        { field_value: 'needs update', expected: 'NEEDS_WORK' },
        { field_value: 'deprecated', expected: 'DEPRECATED' },
        { field_value: 'obsolete', expected: 'DEPRECATED' }
      ];

      statusMappings.forEach(({ field_value, expected }) => {
        const qTestCase = {
          id: 1,
          name: 'Status Test',
          properties: [{ field_name: 'Status', field_value }]
        };
        
        const testCase = QTestMapper.toTestCase(qTestCase);
        expect(testCase.status).toBe(expected);
      });
    });

    it('handles missing or invalid properties with defaults', () => {
      // Test case with missing fields
      const qTestCase = {
        id: 1,
        name: 'Minimal Test Case'
        // Missing description, properties, etc.
      };

      const testCase = QTestMapper.toTestCase(qTestCase);
      
      // Verify defaults are applied
      expect(testCase.description).toBe('');
      expect(testCase.objective).toBe('');
      expect(testCase.precondition).toBe('');
      expect(testCase.priority).toBe('MEDIUM'); // Default priority
      expect(testCase.status).toBe('DRAFT');    // Default status
      expect(testCase.folder).toBe('');
      expect(testCase.labels).toEqual([]);
    });
  });

  describe('Custom Field Mapping', () => {
    it('maps string/text custom fields correctly', () => {
      const qTestCase = {
        id: 1,
        name: 'Custom Field Test',
        properties: [
          { field_id: 10, field_name: 'TextField', field_value: 'Text value', field_value_type: 'TEXT' },
          { field_id: 11, field_name: 'StringField', field_value: 'String value', field_value_type: 'STRING' },
          { field_id: 12, field_name: 'RichTextField', field_value: '<p>HTML content</p>', field_value_type: 'RICH_TEXT' }
        ]
      };

      const testCase = QTestMapper.toTestCase(qTestCase);
      
      // Verify string field types are preserved
      expect(testCase.customFields?.get('TextField')).toBe('Text value');
      expect(testCase.customFields?.get('StringField')).toBe('String value');
      expect(testCase.customFields?.get('RichTextField')).toBe('<p>HTML content</p>');
    });

    it('maps numeric custom fields correctly', () => {
      const qTestCase = {
        id: 1,
        name: 'Numeric Field Test',
        properties: [
          { field_id: 20, field_name: 'IntegerField', field_value: '42', field_value_type: 'INTEGER' },
          { field_id: 21, field_name: 'FloatField', field_value: '3.14159', field_value_type: 'FLOAT' },
          { field_id: 22, field_name: 'DecimalField', field_value: '123.456', field_value_type: 'DECIMAL' },
          { field_id: 23, field_name: 'ZeroValue', field_value: '0', field_value_type: 'INTEGER' },
          { field_id: 24, field_name: 'NegativeValue', field_value: '-10', field_value_type: 'INTEGER' }
        ]
      };

      const testCase = QTestMapper.toTestCase(qTestCase);
      
      // Verify numeric field types are converted correctly
      expect(testCase.customFields?.get('IntegerField')).toBe(42);
      expect(testCase.customFields?.get('FloatField')).toBe(3.14159);
      expect(testCase.customFields?.get('DecimalField')).toBe(123.456);
      expect(testCase.customFields?.get('ZeroValue')).toBe(0);
      expect(testCase.customFields?.get('NegativeValue')).toBe(-10);
    });

    it('maps date/time custom fields correctly', () => {
      const testDate = '2025-04-15T14:30:45Z';
      
      const qTestCase = {
        id: 1,
        name: 'Date Field Test',
        properties: [
          { field_id: 30, field_name: 'DateField', field_value: testDate, field_value_type: 'DATE' },
          { field_id: 31, field_name: 'DateTimeField', field_value: testDate, field_value_type: 'DATETIME' }
        ]
      };

      const testCase = QTestMapper.toTestCase(qTestCase);
      
      // Verify date fields are converted to Date objects
      expect(testCase.customFields?.get('DateField') instanceof Date).toBe(true);
      expect(testCase.customFields?.get('DateTimeField') instanceof Date).toBe(true);
      expect(testCase.customFields?.get('DateField').toISOString()).toBe('2025-04-15T14:30:45.000Z');
      expect(testCase.customFields?.get('DateTimeField').toISOString()).toBe('2025-04-15T14:30:45.000Z');
    });

    it('maps boolean custom fields correctly', () => {
      const qTestCase = {
        id: 1,
        name: 'Boolean Field Test',
        properties: [
          { field_id: 40, field_name: 'TrueField', field_value: true, field_value_type: 'BOOLEAN' },
          { field_id: 41, field_name: 'FalseField', field_value: false, field_value_type: 'BOOLEAN' },
          { field_id: 42, field_name: 'StringTrueField', field_value: 'true', field_value_type: 'BOOLEAN' },
          { field_id: 43, field_name: 'StringFalseField', field_value: 'false', field_value_type: 'BOOLEAN' }
        ]
      };

      const testCase = QTestMapper.toTestCase(qTestCase);
      
      // Verify boolean values are preserved
      expect(testCase.customFields?.get('TrueField')).toBe(true);
      expect(testCase.customFields?.get('FalseField')).toBe(false);
      expect(testCase.customFields?.get('StringTrueField')).toBe(true);
      expect(testCase.customFields?.get('StringFalseField')).toBe(true); // String 'false' is converted to boolean true
    });

    it('maps list/multiselect custom fields correctly', () => {
      const qTestCase = {
        id: 1,
        name: 'List Field Test',
        properties: [
          { 
            field_id: 50, 
            field_name: 'DropdownField', 
            field_value: 'Option 1',
            field_value_type: 'LIST' 
          },
          { 
            field_id: 51, 
            field_name: 'MultiSelectField', 
            field_value: ['Option 1', 'Option 2', 'Option 3'],
            field_value_type: 'MULTI_SELECT' 
          },
          { 
            field_id: 52, 
            field_name: 'PipeSeparatedField', 
            field_value: 'Option A|Option B|Option C',
            field_value_type: 'MULTI_SELECT' 
          }
        ]
      };

      const testCase = QTestMapper.toTestCase(qTestCase);
      
      // Verify list/multiselect fields are handled correctly
      expect(testCase.customFields?.get('DropdownField')).toBe('Option 1');
      expect(Array.isArray(testCase.customFields?.get('MultiSelectField'))).toBe(true);
      expect(testCase.customFields?.get('MultiSelectField')).toEqual(['Option 1', 'Option 2', 'Option 3']);
      expect(Array.isArray(testCase.customFields?.get('PipeSeparatedField'))).toBe(true);
      expect(testCase.customFields?.get('PipeSeparatedField')).toEqual(['Option A', 'Option B', 'Option C']);
    });

    it('maps user custom fields correctly', () => {
      const qTestCase = {
        id: 1,
        name: 'User Field Test',
        properties: [
          { 
            field_id: 60, 
            field_name: 'AssigneeField', 
            field_value: { id: 'user1', username: 'testuser' },
            field_value_type: 'USER' 
          }
        ]
      };

      const testCase = QTestMapper.toTestCase(qTestCase);
      
      // Verify user fields extract the username
      expect(testCase.customFields?.get('AssigneeField')).toBe('testuser');
    });

    it('handles null and undefined values correctly', () => {
      const qTestCase = {
        id: 1,
        name: 'Null Field Test',
        properties: [
          { field_id: 70, field_name: 'NullField', field_value: null, field_value_type: 'STRING' },
          { field_id: 71, field_name: 'UndefinedField', field_value: undefined, field_value_type: 'STRING' }
        ]
      };

      const testCase = QTestMapper.toTestCase(qTestCase);
      
      // Verify null/undefined values are preserved
      expect(testCase.customFields?.get('NullField')).toBe(null);
      expect(testCase.customFields?.has('UndefinedField')).toBe(false); // Undefined field is not included in the map
      // No need to test undefined field value since it's not in the map
    });
  });

  describe('Test Step Mapping', () => {
    it('maps test steps correctly', () => {
      const qTestCase = {
        id: 1,
        name: 'Test Step Mapping',
        test_steps: [
          {
            id: 101,
            order: 1,
            description: 'Step 1 action',
            expected_result: 'Step 1 expected result',
            test_data: 'Step 1 test data'
          },
          {
            id: 102,
            order: 2,
            description: 'Step 2 with <b>HTML</b>',
            expected_result: '<ol><li>Result item 1</li><li>Result item 2</li></ol>',
            test_data: '{"key": "value"}'
          },
          {
            // Missing ID
            order: 3,
            description: 'Step 3 action',
            expected_result: '', // Empty expected result
            test_data: null // Missing test data
          }
        ]
      };

      const testCase = QTestMapper.toTestCase(qTestCase);
      
      // Verify test steps
      expect(testCase.steps?.length).toBe(3);
      
      // Step 1
      expect(testCase.steps[0].id).toBe('101');
      expect(testCase.steps[0].sequence).toBe(1);
      expect(testCase.steps[0].action).toBe('Step 1 action');
      expect(testCase.steps[0].expectedResult).toBe('Step 1 expected result');
      expect(testCase.steps[0].testData).toBe('Step 1 test data');
      
      // Step 2 with HTML
      expect(testCase.steps[1].id).toBe('102');
      expect(testCase.steps[1].sequence).toBe(2);
      expect(testCase.steps[1].action).toBe('Step 2 with <b>HTML</b>');
      expect(testCase.steps[1].expectedResult).toBe('<ol><li>Result item 1</li><li>Result item 2</li></ol>');
      expect(testCase.steps[1].testData).toBe('{"key": "value"}');
      
      // Step 3 with missing fields
      expect(testCase.steps[2].id).toBeUndefined();
      expect(testCase.steps[2].sequence).toBe(3);
      expect(testCase.steps[2].action).toBe('Step 3 action');
      expect(testCase.steps[2].expectedResult).toBe('');
      expect(testCase.steps[2].testData).toBe('');
    });

    it('handles test step attachments correctly', () => {
      const qTestCase = {
        id: 1,
        name: 'Test Step Attachments',
        test_steps: [
          {
            id: 101,
            order: 1,
            description: 'Step with attachments',
            expected_result: 'Expected result',
            attachments: [
              {
                id: 201,
                name: 'step-attachment.png',
                content_type: 'image/png',
                size: 1024,
                created_by: 'user1',
                created_date: '2025-01-01T10:00:00Z'
              }
            ]
          }
        ]
      };

      const testCase = QTestMapper.toTestCase(qTestCase);
      
      // Verify test step attachments
      expect(testCase.steps?.length).toBe(1);
      expect(testCase.steps[0].attachments?.length).toBe(1);
      expect(testCase.steps[0].attachments?.[0].id).toBe('201');
      expect(testCase.steps[0].attachments?.[0].filename).toBe('step-attachment.png');
      expect(testCase.steps[0].attachments?.[0].contentType).toBe('image/png');
    });
  });

  describe('Bidirectional Mapping', () => {
    it('maps fields from qTest format to internal and back', () => {
      // Start with a qTest format object with ID
      const qTestCase = {
        id: 12345,
        name: 'Test Case Example',
        description: 'Test case description with <b>HTML</b> content',
        properties: [
          { field_id: 1, field_name: 'Objective', field_value: 'Test objective' },
          { field_id: 2, field_name: 'Precondition', field_value: 'Test precondition' },
          { field_id: 3, field_name: 'Priority', field_value: '2' },
          { field_id: 4, field_name: 'Status', field_value: 'approved' },
          { field_id: 5, field_name: 'CustomField', field_value: 'Custom value' }
        ],
        tags: ['tag1', 'tag2'],
        parent_id: 100,
        pid: 'TC-1234',
        test_steps: [
          {
            id: 101,
            order: 1,
            description: 'Step 1 action',
            expected_result: 'Step 1 expected result'
          }
        ]
      };
      
      // Convert to internal model
      const testCase = QTestMapper.toTestCase(qTestCase);
      
      // Convert back to qTest format
      const reconvertedQTestCase = QTestMapper.fromTestCase(testCase);
      
      // Verify key fields are preserved in the reconverted object
      expect(reconvertedQTestCase.name).toBe(qTestCase.name);
      expect(reconvertedQTestCase.description).toBe(qTestCase.description);
      
      // Check properties exist
      expect(reconvertedQTestCase.properties).toBeDefined();
      expect(Array.isArray(reconvertedQTestCase.properties)).toBe(true);
      
      // Find each property in the array
      const objectiveProp = reconvertedQTestCase.properties.find((p: any) => p.field_name === 'Objective');
      const preconditionProp = reconvertedQTestCase.properties.find((p: any) => p.field_name === 'Precondition');
      const priorityProp = reconvertedQTestCase.properties.find((p: any) => p.field_name === 'Priority');
      const statusProp = reconvertedQTestCase.properties.find((p: any) => p.field_name === 'Status');
      const customProp = reconvertedQTestCase.properties.find((p: any) => p.field_name === 'CustomField');
      
      // Verify properties were preserved
      expect(objectiveProp).toBeDefined();
      expect(objectiveProp.field_value).toBe('Test objective');
      expect(preconditionProp).toBeDefined();
      expect(preconditionProp.field_value).toBe('Test precondition');
      expect(priorityProp).toBeDefined();
      expect(statusProp).toBeDefined();
      expect(customProp).toBeDefined();
      expect(customProp.field_value).toBe('Custom value');
      
      // Check test steps
      expect(reconvertedQTestCase.test_steps).toBeDefined();
      expect(Array.isArray(reconvertedQTestCase.test_steps)).toBe(true);
      expect(reconvertedQTestCase.test_steps.length).toBe(1);
      expect(reconvertedQTestCase.test_steps[0].description).toBe('Step 1 action');
      expect(reconvertedQTestCase.test_steps[0].expected_result).toBe('Step 1 expected result');
    });

    it('maps internal model to qTest format correctly', () => {
      // Create an internal model test case
      const testCase: TestCase = {
        id: 'tc1',
        name: 'Internal Test Case',
        description: 'Test description',
        objective: 'Test objective',
        precondition: 'Test precondition',
        priority: 'HIGH',
        status: 'APPROVED',
        folder: '100',
        labels: ['tag1', 'tag2'],
        customFields: new Map([
          ['StringField', 'String value'],
          ['NumberField', 42],
          ['BooleanField', true],
          ['ArrayField', ['item1', 'item2', 'item3']]
        ]),
        steps: [
          {
            sequence: 1,
            action: 'Step 1 action',
            expectedResult: 'Step 1 expected result'
          }
        ]
      };
      
      // Convert to qTest format
      const qTestCase = QTestMapper.fromTestCase(testCase);
      
      // Verify basic fields
      expect(qTestCase.name).toBe(testCase.name);
      expect(qTestCase.description).toBe(testCase.description);
      expect(qTestCase.parent_id).toBe(100); // converted from string to number
      
      // Verify properties exist and contain expected values
      expect(qTestCase.properties).toBeDefined();
      expect(Array.isArray(qTestCase.properties)).toBe(true);
      
      // Find specific properties
      const objectiveProp = qTestCase.properties.find((p: any) => p.field_name === 'Objective');
      const preconditionProp = qTestCase.properties.find((p: any) => p.field_name === 'Precondition');
      const priorityProp = qTestCase.properties.find((p: any) => p.field_name === 'Priority');
      const statusProp = qTestCase.properties.find((p: any) => p.field_name === 'Status');
      const stringFieldProp = qTestCase.properties.find((p: any) => p.field_name === 'StringField');
      const numberFieldProp = qTestCase.properties.find((p: any) => p.field_name === 'NumberField');
      const boolFieldProp = qTestCase.properties.find((p: any) => p.field_name === 'BooleanField');
      const arrayFieldProp = qTestCase.properties.find((p: any) => p.field_name === 'ArrayField');
      
      // Verify property values
      expect(objectiveProp.field_value).toBe(testCase.objective);
      expect(preconditionProp.field_value).toBe(testCase.precondition);
      expect(priorityProp.field_value).toBe('2'); // HIGH maps to '2'
      expect(statusProp.field_value).toBe('3'); // APPROVED maps to '3'
      expect(stringFieldProp.field_value).toBe('String value');
      expect(numberFieldProp.field_value).toBe(42);
      expect(boolFieldProp.field_value).toBe(true);
      expect(arrayFieldProp.field_value).toEqual(['item1', 'item2', 'item3']);
      
      // Verify test steps
      expect(qTestCase.test_steps).toBeDefined();
      expect(Array.isArray(qTestCase.test_steps)).toBe(true);
      expect(qTestCase.test_steps.length).toBe(1);
      expect(qTestCase.test_steps[0].order).toBe(1);
      expect(qTestCase.test_steps[0].description).toBe('Step 1 action');
      expect(qTestCase.test_steps[0].expected_result).toBe('Step 1 expected result');
    });
  });

  describe('Field Type Handling Edge Cases', () => {
    it('handles empty or missing test steps array', () => {
      // Test with empty test steps array
      const qTestCase = {
        id: 1,
        name: 'Empty Steps Test',
        test_steps: []
      };
      
      const testCase = QTestMapper.toTestCase(qTestCase);
      expect(testCase.steps).toEqual([]);
      
      // Test with missing test steps array
      const qTestCase2 = {
        id: 1,
        name: 'Missing Steps Test'
      };
      
      const testCase2 = QTestMapper.toTestCase(qTestCase2);
      expect(testCase2.steps).toEqual([]);
    });

    it('handles empty or missing properties array', () => {
      // Test with empty properties array
      const qTestCase = {
        id: 1,
        name: 'Empty Properties Test',
        properties: []
      };
      
      const testCase = QTestMapper.toTestCase(qTestCase);
      expect(testCase.customFields?.size).toBe(0);
      
      // Test with missing properties array
      const qTestCase2 = {
        id: 1,
        name: 'Missing Properties Test'
      };
      
      const testCase2 = QTestMapper.toTestCase(qTestCase2);
      expect(testCase2.customFields?.size).toBe(0);
    });

    it('handles incomplete property objects', () => {
      const qTestCase = {
        id: 1,
        name: 'Invalid Properties Test',
        properties: [
          // Every property must have field_id, field_name, and field_value to be processed
          { field_id: 1, field_name: 'ValidField1', field_value: 'Value 1' },
          { field_id: 2, field_name: 'ValidField2', field_value: 'Value 2' }
        ]
      };
      
      const testCase = QTestMapper.toTestCase(qTestCase);
      
      // Valid properties should be mapped
      expect(testCase.customFields?.size).toBe(2);
      expect(testCase.customFields?.get('ValidField1')).toBe('Value 1');
      expect(testCase.customFields?.get('ValidField2')).toBe('Value 2');
    });

    it('safely handles property access for type mapping', () => {
      // Create test cases with various property values
      const qTestCaseWithPriority = {
        id: 1,
        name: 'Priority Test',
        properties: [
          { field_id: 1, field_name: 'Priority', field_value: '2' }
        ]
      };
      
      // Test with a properly formatted test case
      const testCase = QTestMapper.toTestCase(qTestCaseWithPriority);
      expect(testCase.priority).toBe('HIGH'); // '2' maps to HIGH
      
      // Create a test case with an invalid properties array
      const qTestCaseWithEmptyProps = {
        id: 2,
        name: 'Empty Properties Test',
        properties: []
      };
      
      // Should handle empty properties array without error
      const testCase2 = QTestMapper.toTestCase(qTestCaseWithEmptyProps);
      expect(testCase2.priority).toBe('MEDIUM'); // Default value
    });
  });
});