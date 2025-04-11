/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { 
  TestCase,
  TestCycle,
  TestExecution,
  TestStep,
  Attachment,
  Folder as _Folder,
  Project
} from '../../../common/src/models/entities';

import { 
  FieldDefinition,
  FieldType,
  FieldOption as _FieldOption
} from '../../../common/src/models/field-definition';

import { AttachmentContent as _AttachmentContent } from '../../../common/src/models/attachment';

/**
 * Mapper to convert between qTest API models and internal models
 */
export class QTestMapper {
  /**
   * Convert a qTest test case to internal TestCase model
   */
  static toTestCase(qTestCase: any): TestCase {
    const testCase: TestCase = {
      id: qTestCase.id.toString(),
      name: qTestCase.name,
      description: qTestCase.description || '',
      // In qTest, objectives and preconditions are part of the properties
      objective: this.getPropertyValue(qTestCase, 'objective') || '',
      precondition: this.getPropertyValue(qTestCase, 'precondition') || '',
      priority: this.mapPriorityFromQTest(qTestCase),
      status: this.mapStatusFromQTest(qTestCase),
      folder: qTestCase.parent_id ? qTestCase.parent_id.toString() : '',
      labels: qTestCase.tags || [],
      customFields: new Map(),
      steps: this.toTestSteps(qTestCase.test_steps || []),
      attachments: qTestCase.attachments ? this.toAttachments(qTestCase.attachments) : [],
      sourceId: qTestCase.pid ? qTestCase.pid.toString() : undefined,
      createdBy: qTestCase.created_by,
      createdAt: qTestCase.created_date ? new Date(qTestCase.created_date) : undefined,
      updatedBy: qTestCase.last_modified_by,
      updatedAt: qTestCase.last_modified_date ? new Date(qTestCase.last_modified_date) : undefined
    };
    
    // Handle properties as custom fields
    if (qTestCase.properties && Array.isArray(qTestCase.properties)) {
      for (const prop of qTestCase.properties) {
        if (prop.field_id && prop.field_name && prop.field_value !== undefined) {
          testCase.customFields?.set(prop.field_name, this.convertQTestFieldValue(prop));
        }
      }
    }
    
    return testCase;
  }
  
  /**
   * Convert multiple qTest test cases to internal TestCase models
   */
  static toTestCases(qTestCases: any[]): TestCase[] {
    if (!Array.isArray(qTestCases)) {
      return [];
    }
    return qTestCases.map(this.toTestCase);
  }
  
  /**
   * Convert internal TestCase model to qTest test case format
   */
  static fromTestCase(testCase: TestCase): any {
    const qTestCase: any = {
      name: testCase.name,
      description: testCase.description || '',
      // Priority and status are special in qTest
      properties: []
    };
    
    // Add parent ID if folder is specified
    if (testCase.folder) {
      qTestCase.parent_id = parseInt(testCase.folder, 10);
    }
    
    // Add objective as property
    if (testCase.objective) {
      qTestCase.properties.push({
        field_name: 'Objective',
        field_value: testCase.objective
      });
    }
    
    // Add precondition as property
    if (testCase.precondition) {
      qTestCase.properties.push({
        field_name: 'Precondition',
        field_value: testCase.precondition
      });
    }
    
    // Add priority as property
    if (testCase.priority) {
      qTestCase.properties.push({
        field_name: 'Priority',
        field_value: this.mapPriorityToQTest(testCase.priority)
      });
    }
    
    // Add status as property
    if (testCase.status) {
      qTestCase.properties.push({
        field_name: 'Status',
        field_value: this.mapStatusToQTest(testCase.status)
      });
    }
    
    // Add test steps
    if (testCase.steps && testCase.steps.length > 0) {
      qTestCase.test_steps = this.fromTestSteps(testCase.steps);
    }
    
    // Add tags
    if (testCase.labels && testCase.labels.length > 0) {
      qTestCase.tags = testCase.labels;
    }
    
    // Handle custom fields
    if (testCase.customFields && testCase.customFields.size > 0) {
      testCase.customFields.forEach((value, key) => {
        qTestCase.properties.push({
          field_name: key,
          field_value: value
        });
      });
    }
    
    return qTestCase;
  }
  
  /**
   * Convert qTest test steps to internal TestStep array
   */
  static toTestSteps(qTestSteps: any[]): TestStep[] {
    if (!Array.isArray(qTestSteps)) {
      return [];
    }
    
    return qTestSteps.map((step, index) => ({
      id: step.id ? step.id.toString() : undefined,
      sequence: step.order || index + 1,
      action: step.description || '',
      expectedResult: step.expected_result || '',
      testData: step.test_data || '',
      attachments: step.attachments ? this.toAttachments(step.attachments) : undefined
    }));
  }
  
  /**
   * Convert internal TestStep array to qTest test step format
   */
  static fromTestSteps(steps: TestStep[]): any[] {
    return steps.map((step, _index) => ({
      order: step.sequence,
      description: step.action,
      expected_result: step.expectedResult || '',
      test_data: step.testData || ''
    }));
  }
  
  /**
   * Convert qTest test cycle to internal TestCycle model
   */
  static toTestCycle(qTestCycle: any): TestCycle {
    const cycle: TestCycle = {
      id: qTestCycle.id.toString(),
      name: qTestCycle.name,
      description: qTestCycle.description || '',
      folder: qTestCycle.parent_id ? qTestCycle.parent_id.toString() : '',
      status: this.mapCycleStatusFromQTest(qTestCycle),
      startDate: qTestCycle.target_build_start ? new Date(qTestCycle.target_build_start) : undefined,
      endDate: qTestCycle.target_build_end ? new Date(qTestCycle.target_build_end) : undefined,
      environment: this.getPropertyValue(qTestCycle, 'environment') || '',
      customFields: new Map(),
      testCases: this.toTestCaseReferences(qTestCycle.test_runs || []),
      createdBy: qTestCycle.created_by,
      createdAt: qTestCycle.created_date ? new Date(qTestCycle.created_date) : undefined,
      updatedBy: qTestCycle.last_modified_by,
      updatedAt: qTestCycle.last_modified_date ? new Date(qTestCycle.last_modified_date) : undefined
    };
    
    // Handle properties as custom fields
    if (qTestCycle.properties && Array.isArray(qTestCycle.properties)) {
      for (const prop of qTestCycle.properties) {
        if (prop.field_id && prop.field_name && prop.field_value !== undefined) {
          cycle.customFields?.set(prop.field_name, this.convertQTestFieldValue(prop));
        }
      }
    }
    
    return cycle;
  }
  
  /**
   * Convert multiple qTest test cycles to internal TestCycle models
   */
  static toTestCycles(qTestCycles: any[]): TestCycle[] {
    if (!Array.isArray(qTestCycles)) {
      return [];
    }
    return qTestCycles.map(this.toTestCycle);
  }
  
  /**
   * Convert internal TestCycle model to qTest test cycle format
   */
  static fromTestCycle(cycle: TestCycle): any {
    const qTestCycle: any = {
      name: cycle.name,
      description: cycle.description || '',
      properties: []
    };
    
    // Add parent ID if folder is specified
    if (cycle.folder) {
      qTestCycle.parent_id = parseInt(cycle.folder, 10);
    }
    
    // Add dates
    if (cycle.startDate) {
      qTestCycle.target_build_start = cycle.startDate.toISOString();
    }
    
    if (cycle.endDate) {
      qTestCycle.target_build_end = cycle.endDate.toISOString();
    }
    
    // Add environment as property
    if (cycle.environment) {
      qTestCycle.properties.push({
        field_name: 'Environment',
        field_value: cycle.environment
      });
    }
    
    // Add status as property
    if (cycle.status) {
      qTestCycle.properties.push({
        field_name: 'Status',
        field_value: this.mapCycleStatusToQTest(cycle.status)
      });
    }
    
    // Handle custom fields
    if (cycle.customFields && cycle.customFields.size > 0) {
      cycle.customFields.forEach((value, key) => {
        qTestCycle.properties.push({
          field_name: key,
          field_value: value
        });
      });
    }
    
    return qTestCycle;
  }
  
  /**
   * Convert qTest test runs to internal test case references
   */
  static toTestCaseReferences(qTestRuns: any[]): TestCycle['testCases'] {
    if (!Array.isArray(qTestRuns)) {
      return [];
    }
    
    return qTestRuns.map(run => ({
      id: run.id.toString(),
      testCaseId: run.test_case ? run.test_case.id.toString() : '',
      status: run.status ? run.status.name : '',
      assignee: run.assigned_to,
      executionId: run.latest_test_log ? run.latest_test_log.id.toString() : undefined
    }));
  }
  
  /**
   * Convert qTest test execution to internal TestExecution model
   */
  static toTestExecution(qTestExecution: any): TestExecution {
    // In qTest, an execution is a combination of a test run and its logs
    const testRun = qTestExecution.test_run || qTestExecution;
    const testLog = qTestExecution.test_log || (testRun.latest_test_log ? testRun.latest_test_log : {});
    
    const execution: TestExecution = {
      id: testLog.id ? testLog.id.toString() : testRun.id.toString(),
      name: testRun.name || `Execution ${testRun.id}`,
      description: testLog.note || '',
      testCaseId: testRun.test_case ? testRun.test_case.id.toString() : '',
      testCycleId: testRun.test_cycle ? testRun.test_cycle.id.toString() : '',
      status: testLog.status ? testLog.status.name : 'NOT_EXECUTED',
      executedBy: testLog.executed_by,
      executedAt: testLog.execution_date ? new Date(testLog.execution_date) : undefined,
      environment: this.getPropertyValue(testLog, 'environment') || '',
      duration: testLog.execution_time_seconds || 0,
      results: this.toStepResults(testLog.test_step_logs || []),
      customFields: new Map(),
      attachments: testLog.attachments ? this.toAttachments(testLog.attachments) : [],
      defects: testLog.defects ? this.toDefects(testLog.defects) : [],
      createdBy: testLog.created_by || testRun.created_by,
      createdAt: testLog.created_date ? new Date(testLog.created_date) : 
                  (testRun.created_date ? new Date(testRun.created_date) : undefined),
      updatedBy: testLog.last_modified_by || testRun.last_modified_by,
      updatedAt: testLog.last_modified_date ? new Date(testLog.last_modified_date) : 
                  (testRun.last_modified_date ? new Date(testRun.last_modified_date) : undefined)
    };
    
    // Handle properties as custom fields
    if (testLog.properties && Array.isArray(testLog.properties)) {
      for (const prop of testLog.properties) {
        if (prop.field_id && prop.field_name && prop.field_value !== undefined) {
          execution.customFields?.set(prop.field_name, this.convertQTestFieldValue(prop));
        }
      }
    }
    
    return execution;
  }
  
  /**
   * Convert qTest step results to internal test step results
   */
  static toStepResults(qTestStepLogs: any[]) {
    if (!Array.isArray(qTestStepLogs)) {
      return [];
    }
    
    return qTestStepLogs.map(log => ({
      stepId: log.test_step_id ? log.test_step_id.toString() : undefined,
      sequence: log.order || 0,
      status: log.status ? log.status.name : 'NOT_EXECUTED',
      actualResult: log.actual_result || '',
      comment: log.note || '',
      attachments: log.attachments ? this.toAttachments(log.attachments) : undefined
    }));
  }
  
  /**
   * Convert qTest attachments to internal Attachment models
   */
  static toAttachments(qTestAttachments: any[]): Attachment[] {
    if (!Array.isArray(qTestAttachments)) {
      return [];
    }
    
    return qTestAttachments.map(att => ({
      id: att.id ? att.id.toString() : undefined,
      filename: att.name,
      contentType: att.content_type || 'application/octet-stream',
      size: att.size || 0,
      description: att.description || '',
      createdBy: att.created_by,
      createdAt: att.created_date ? new Date(att.created_date) : undefined
    }));
  }
  
  /**
   * Convert qTest defects to internal defect models
   */
  static toDefects(qTestDefects: any[]) {
    if (!Array.isArray(qTestDefects)) {
      return [];
    }
    
    return qTestDefects.map(defect => ({
      id: defect.id.toString(),
      summary: defect.summary || '',
      url: defect.web_url || '',
      status: defect.status || ''
    }));
  }
  
  /**
   * Convert qTest projects to internal Project models
   */
  static toProjects(qTestProjects: any[]): Project[] {
    if (!Array.isArray(qTestProjects)) {
      return [];
    }
    
    return qTestProjects.map(proj => ({
      id: proj.id.toString(),
      name: proj.name,
      sourceProjectId: proj.id.toString(),
      targetProjectId: '', // To be filled by target system
      sourceProjectKey: proj.key || proj.id.toString()
    }));
  }
  
  /**
   * Convert qTest custom fields to internal FieldDefinition models
   */
  static toFieldDefinitions(qTestFields: any[]): FieldDefinition[] {
    if (!Array.isArray(qTestFields)) {
      return [];
    }
    
    return qTestFields.map(field => {
      const def: FieldDefinition = {
        id: field.id.toString(),
        name: field.label || field.name,
        type: this.mapFieldType(field.data_type),
        required: field.required || false,
        description: field.description || '',
        system: field.origin === 'system'
      };
      
      if (field.allowed_values && field.allowed_values.length > 0) {
        def.options = field.allowed_values.map((val: any) => ({
          id: val.id ? val.id.toString() : val.value,
          value: val.label || val.value,
          default: val.is_default || false
        }));
      }
      
      return def;
    });
  }
  
  /**
   * Map priority from qTest to internal format
   */
  static mapPriorityFromQTest(qTestCase: any): string {
    if (!qTestCase.properties) {
      return 'MEDIUM';
    }
    
    const priorityProp = qTestCase.properties.find((p: any) => 
      p.field_name === 'Priority' || p.field_name === 'priority'
    );
    
    if (!priorityProp || !priorityProp.field_value) {
      return 'MEDIUM';
    }
    
    // Map qTest priority values to internal values
    const priorityMap: Record<string, string> = {
      '1': 'CRITICAL',
      '2': 'HIGH',
      '3': 'MEDIUM',
      '4': 'LOW',
      'critical': 'CRITICAL',
      'high': 'HIGH',
      'medium': 'MEDIUM',
      'low': 'LOW'
    };
    
    return priorityMap[priorityProp.field_value.toString().toLowerCase()] || 'MEDIUM';
  }
  
  /**
   * Map priority from internal format to qTest
   */
  static mapPriorityToQTest(priority: string): string {
    const priorityMap: Record<string, string> = {
      'CRITICAL': '1',
      'HIGH': '2',
      'MEDIUM': '3',
      'LOW': '4'
    };
    
    return priorityMap[priority] || '3';
  }
  
  /**
   * Map status from qTest to internal format
   */
  static mapStatusFromQTest(qTestCase: any): string {
    if (!qTestCase.properties) {
      return 'DRAFT';
    }
    
    const statusProp = qTestCase.properties.find((p: any) => 
      p.field_name === 'Status' || p.field_name === 'status'
    );
    
    if (!statusProp || !statusProp.field_value) {
      return 'DRAFT';
    }
    
    // Map qTest status values to internal values
    const statusMap: Record<string, string> = {
      'approved': 'APPROVED',
      'unapproved': 'DRAFT',
      'draft': 'DRAFT',
      'ready to review': 'READY_FOR_REVIEW',
      'ready for review': 'READY_FOR_REVIEW',
      'ready': 'READY',
      'needs work': 'NEEDS_WORK',
      'needs update': 'NEEDS_WORK',
      'deprecated': 'DEPRECATED',
      'obsolete': 'DEPRECATED'
    };
    
    return statusMap[statusProp.field_value.toString().toLowerCase()] || 'DRAFT';
  }
  
  /**
   * Map status from internal format to qTest
   */
  static mapStatusToQTest(status: string): string {
    const statusMap: Record<string, string> = {
      'DRAFT': '1',
      'READY_FOR_REVIEW': '2',
      'APPROVED': '3',
      'NEEDS_WORK': '4',
      'READY': '5',
      'DEPRECATED': '6',
      
      // Execution statuses
      'PASSED': '601',
      'FAILED': '602',
      'BLOCKED': '603',
      'SKIPPED': '604',
      'INCOMPLETE': '605',
      'UNEXECUTED': '606',
      'NOT_EXECUTED': '606'
    };
    
    return statusMap[status] || '1';
  }
  
  /**
   * Map cycle status from qTest to internal format
   */
  static mapCycleStatusFromQTest(qTestCycle: any): string {
    if (!qTestCycle.properties) {
      return 'ACTIVE';
    }
    
    const statusProp = qTestCycle.properties.find((p: any) => 
      p.field_name === 'Status' || p.field_name === 'status'
    );
    
    if (!statusProp || !statusProp.field_value) {
      return 'ACTIVE';
    }
    
    // Map qTest status values to internal values
    const statusMap: Record<string, string> = {
      'active': 'ACTIVE',
      'planning': 'PLANNING',
      'planned': 'PLANNED',
      'in progress': 'IN_PROGRESS',
      'completed': 'COMPLETED',
      'closed': 'CLOSED',
      'cancelled': 'CANCELLED',
      'canceled': 'CANCELLED'
    };
    
    return statusMap[statusProp.field_value.toString().toLowerCase()] || 'ACTIVE';
  }
  
  /**
   * Map cycle status from internal format to qTest
   */
  static mapCycleStatusToQTest(status: string): string {
    const statusMap: Record<string, string> = {
      'PLANNING': '701',
      'PLANNED': '702',
      'IN_PROGRESS': '703',
      'ACTIVE': '703', // Map ACTIVE to IN_PROGRESS
      'COMPLETED': '704',
      'CLOSED': '705',
      'CANCELLED': '706'
    };
    
    return statusMap[status] || '703';
  }
  
  /**
   * Map field type from qTest to internal format
   */
  static mapFieldType(qTestFieldType: string): FieldType {
    const typeMap: Record<string, FieldType> = {
      'TEXT': FieldType.TEXT,
      'RICH_TEXT': FieldType.TEXT,
      'LONG_TEXT': FieldType.TEXT,
      'STRING': FieldType.STRING,
      'SHORT_STRING': FieldType.STRING,
      'INTEGER': FieldType.NUMBER,
      'INT': FieldType.NUMBER,
      'FLOAT': FieldType.NUMBER,
      'DECIMAL': FieldType.NUMBER,
      'DATE': FieldType.DATE,
      'DATETIME': FieldType.DATETIME,
      'BOOLEAN': FieldType.BOOLEAN,
      'CHECKBOX': FieldType.BOOLEAN,
      'LIST': FieldType.SELECT,
      'DROPDOWN': FieldType.SELECT,
      'SELECT': FieldType.SELECT,
      'MULTI_SELECT': FieldType.MULTISELECT,
      'MULTISELECT': FieldType.MULTISELECT,
      'USER': FieldType.USER,
      'USER_LIST': FieldType.MULTIUSER,
      'ATTACHMENT': FieldType.ATTACHMENT,
      'URL': FieldType.URL,
      'HYPERLINK': FieldType.URL
    };
    
    return typeMap[qTestFieldType.toUpperCase()] || FieldType.CUSTOM;
  }
  
  /**
   * Get property value from qTest object
   */
  private static getPropertyValue(qTestObject: any, propertyName: string): string | undefined {
    if (!qTestObject.properties || !Array.isArray(qTestObject.properties)) {
      return undefined;
    }
    
    const property = qTestObject.properties.find((p: any) => 
      p.field_name.toLowerCase() === propertyName.toLowerCase()
    );
    
    return property ? String(property.field_value) : undefined;
  }
  
  /**
   * Convert qTest field value to appropriate type
   */
  private static convertQTestFieldValue(property: any): any {
    if (property.field_value === null || property.field_value === undefined) {
      return null;
    }
    
    // Handle different field types
    if (property.field_value_type === 'BOOLEAN' || property.data_type === 'BOOLEAN') {
      return Boolean(property.field_value);
    }
    
    if (property.field_value_type === 'INTEGER' || property.data_type === 'INTEGER') {
      return parseInt(property.field_value, 10);
    }
    
    if (property.field_value_type === 'DECIMAL' || property.data_type === 'DECIMAL' || 
        property.field_value_type === 'FLOAT' || property.data_type === 'FLOAT') {
      return parseFloat(property.field_value);
    }
    
    if (property.field_value_type === 'DATE' || property.data_type === 'DATE' ||
        property.field_value_type === 'DATETIME' || property.data_type === 'DATETIME') {
      return new Date(property.field_value);
    }
    
    if (property.field_value_type === 'USER' || property.data_type === 'USER') {
      // User fields often have a specific structure
      if (typeof property.field_value === 'object' && property.field_value !== null) {
        return property.field_value.username || property.field_value.id;
      }
    }
    
    if (property.field_value_type === 'LIST' || property.data_type === 'LIST' ||
        property.field_value_type === 'MULTI_SELECT' || property.data_type === 'MULTI_SELECT') {
      // Handle list types, which might be arrays or pipe-separated strings
      if (Array.isArray(property.field_value)) {
        return property.field_value;
      }
      
      if (typeof property.field_value === 'string' && property.field_value.includes('|')) {
        return property.field_value.split('|').filter(Boolean);
      }
    }
    
    // Default: return as string
    return property.field_value;
  }
}