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
  Folder,
  Project
} from '../../../common/src/models/entities';

import { 
  FieldDefinition,
  FieldType,
  FieldOption
} from '../../../common/src/models/field-definition';

import { AttachmentContent } from '../../../common/src/models/attachment';

/**
 * Mapper to convert between Zephyr API models and internal models
 */
export class ZephyrMapper {
  /**
   * Convert a Zephyr test to internal TestCase model
   */
  static toTestCase(zephyrTest: any): TestCase {
    const testCase: TestCase = {
      id: zephyrTest.id,
      name: zephyrTest.name,
      description: zephyrTest.description || '',
      objective: zephyrTest.objective || '',
      precondition: zephyrTest.precondition || '',
      priority: zephyrTest.priority || 'MEDIUM',
      status: zephyrTest.status || 'DRAFT',
      folder: zephyrTest.folderId || '',
      labels: zephyrTest.labels || [],
      customFields: new Map(),
      steps: this.toTestSteps(zephyrTest.steps || []),
      attachments: this.toAttachments(zephyrTest.attachments || []),
      sourceId: zephyrTest.key,
      createdBy: zephyrTest.owner,
      createdAt: zephyrTest.createdOn ? new Date(zephyrTest.createdOn) : undefined,
      updatedBy: zephyrTest.updatedBy,
      updatedAt: zephyrTest.updatedOn ? new Date(zephyrTest.updatedOn) : undefined
    };
    
    // Handle custom fields
    if (zephyrTest.customFields) {
      for (const key in zephyrTest.customFields) {
        testCase.customFields?.set(key, zephyrTest.customFields[key]);
      }
    }
    
    return testCase;
  }
  
  /**
   * Convert internal TestCase model to Zephyr test format
   */
  static fromTestCase(testCase: TestCase): any {
    const zephyrTest: any = {
      name: testCase.name,
      description: testCase.description || '',
      objective: testCase.objective || '',
      precondition: testCase.precondition || '',
      priority: testCase.priority || 'MEDIUM',
      status: testCase.status || 'DRAFT',
      labels: testCase.labels || []
    };
    
    if (testCase.folder) {
      zephyrTest.folderId = testCase.folder;
    }
    
    if (testCase.steps && testCase.steps.length > 0) {
      zephyrTest.steps = this.fromTestSteps(testCase.steps);
    }
    
    // Handle custom fields
    if (testCase.customFields && testCase.customFields.size > 0) {
      zephyrTest.customFields = {};
      testCase.customFields.forEach((value, key) => {
        zephyrTest.customFields[key] = value;
      });
    }
    
    return zephyrTest;
  }
  
  /**
   * Convert Zephyr step array to internal TestStep array
   */
  static toTestSteps(zephyrSteps: any[]): TestStep[] {
    return zephyrSteps.map((step, index) => ({
      id: step.id || undefined,
      sequence: step.index !== undefined ? step.index : index + 1,
      action: step.description || '',
      expectedResult: step.expectedResult || '',
      testData: step.testData || '',
      attachments: step.attachments ? this.toAttachments(step.attachments) : undefined
    }));
  }
  
  /**
   * Convert internal TestStep array to Zephyr step format
   */
  static fromTestSteps(steps: TestStep[]): any[] {
    return steps.map(step => ({
      index: step.sequence,
      description: step.action,
      expectedResult: step.expectedResult || '',
      testData: step.testData || ''
    }));
  }
  
  /**
   * Convert Zephyr cycle to internal TestCycle model
   */
  static toTestCycle(zephyrCycle: any): TestCycle {
    const cycle: TestCycle = {
      id: zephyrCycle.id,
      name: zephyrCycle.name,
      description: zephyrCycle.description || '',
      folder: zephyrCycle.folderId || '',
      status: zephyrCycle.status || 'ACTIVE',
      startDate: zephyrCycle.startDate ? new Date(zephyrCycle.startDate) : undefined,
      endDate: zephyrCycle.endDate ? new Date(zephyrCycle.endDate) : undefined,
      environment: zephyrCycle.environment || '',
      customFields: new Map(),
      testCases: this.toCycleItems(zephyrCycle.items || []),
      createdBy: zephyrCycle.owner,
      createdAt: zephyrCycle.createdOn ? new Date(zephyrCycle.createdOn) : undefined,
      updatedBy: zephyrCycle.updatedBy,
      updatedAt: zephyrCycle.updatedOn ? new Date(zephyrCycle.updatedOn) : undefined
    };
    
    // Handle custom fields
    if (zephyrCycle.customFields) {
      for (const key in zephyrCycle.customFields) {
        cycle.customFields?.set(key, zephyrCycle.customFields[key]);
      }
    }
    
    return cycle;
  }
  
  /**
   * Convert internal TestCycle model to Zephyr cycle format
   */
  static fromTestCycle(cycle: TestCycle): any {
    const zephyrCycle: any = {
      name: cycle.name,
      description: cycle.description || '',
      status: cycle.status || 'ACTIVE',
      environment: cycle.environment || ''
    };
    
    if (cycle.folder) {
      zephyrCycle.folderId = cycle.folder;
    }
    
    if (cycle.startDate) {
      zephyrCycle.startDate = cycle.startDate.toISOString();
    }
    
    if (cycle.endDate) {
      zephyrCycle.endDate = cycle.endDate.toISOString();
    }
    
    // Handle custom fields
    if (cycle.customFields && cycle.customFields.size > 0) {
      zephyrCycle.customFields = {};
      cycle.customFields.forEach((value, key) => {
        zephyrCycle.customFields[key] = value;
      });
    }
    
    return zephyrCycle;
  }
  
  /**
   * Convert Zephyr cycle items to internal cycle items
   */
  static toCycleItems(zephyrItems: any[]) {
    return zephyrItems.map(item => ({
      id: item.id,
      testCaseId: item.testId,
      status: item.status || '',
      assignee: item.assignedTo || '',
      executionId: item.executionId || undefined
    }));
  }
  
  /**
   * Convert Zephyr execution to internal TestExecution model
   */
  static toTestExecution(zephyrExec: any): TestExecution {
    const execution: TestExecution = {
      id: zephyrExec.id,
      name: zephyrExec.name || `Execution ${zephyrExec.id}`,
      description: zephyrExec.comment || '',
      testCaseId: zephyrExec.testId,
      testCycleId: zephyrExec.cycleId,
      status: zephyrExec.status || 'NOT_EXECUTED',
      executedBy: zephyrExec.executedBy || '',
      executedAt: zephyrExec.executedOn ? new Date(zephyrExec.executedOn) : undefined,
      environment: zephyrExec.environment || '',
      duration: zephyrExec.timeSpentInSeconds || 0,
      results: this.toStepResults(zephyrExec.stepResults || []),
      customFields: new Map(),
      attachments: zephyrExec.attachments ? this.toAttachments(zephyrExec.attachments) : [],
      defects: zephyrExec.defects ? this.toDefects(zephyrExec.defects) : [],
      createdBy: zephyrExec.createdBy,
      createdAt: zephyrExec.createdOn ? new Date(zephyrExec.createdOn) : undefined,
      updatedBy: zephyrExec.updatedBy,
      updatedAt: zephyrExec.updatedOn ? new Date(zephyrExec.updatedOn) : undefined
    };
    
    // Handle custom fields
    if (zephyrExec.customFields) {
      for (const key in zephyrExec.customFields) {
        execution.customFields?.set(key, zephyrExec.customFields[key]);
      }
    }
    
    return execution;
  }
  
  /**
   * Convert internal TestExecution model to Zephyr execution format
   */
  static fromTestExecution(execution: TestExecution): any {
    const zephyrExec: any = {
      testId: execution.testCaseId,
      cycleId: execution.testCycleId,
      status: execution.status || 'NOT_EXECUTED',
      comment: execution.description || '',
      environment: execution.environment || ''
    };
    
    if (execution.executedBy) {
      zephyrExec.executedBy = execution.executedBy;
    }
    
    if (execution.executedAt) {
      zephyrExec.executedOn = execution.executedAt.toISOString();
    }
    
    if (execution.duration) {
      zephyrExec.timeSpentInSeconds = execution.duration;
    }
    
    if (execution.results && execution.results.length > 0) {
      zephyrExec.stepResults = this.fromStepResults(execution.results);
    }
    
    // Handle custom fields
    if (execution.customFields && execution.customFields.size > 0) {
      zephyrExec.customFields = {};
      execution.customFields.forEach((value, key) => {
        zephyrExec.customFields[key] = value;
      });
    }
    
    return zephyrExec;
  }
  
  /**
   * Convert Zephyr step results to internal test step results
   */
  static toStepResults(zephyrResults: any[]) {
    return zephyrResults.map(result => ({
      stepId: result.stepId,
      sequence: result.index,
      status: result.status || 'NOT_EXECUTED',
      actualResult: result.actualResult || '',
      comment: result.comment || '',
      attachments: result.attachments ? this.toAttachments(result.attachments) : undefined
    }));
  }
  
  /**
   * Convert internal step results to Zephyr format
   */
  static fromStepResults(results: TestExecution['results']) {
    return results.map(result => ({
      index: result.sequence,
      status: result.status,
      actualResult: result.actualResult || '',
      comment: result.comment || ''
    }));
  }
  
  /**
   * Convert Zephyr attachments to internal Attachment models
   */
  static toAttachments(zephyrAttachments: any[]): Attachment[] {
    return zephyrAttachments.map(att => ({
      id: att.id,
      filename: att.filename,
      contentType: att.contentType || 'application/octet-stream',
      size: att.fileSize,
      description: att.comment || '',
      createdBy: att.createdBy,
      createdAt: att.createdOn ? new Date(att.createdOn) : undefined
    }));
  }
  
  /**
   * Convert Zephyr defects to internal Defect models
   */
  static toDefects(zephyrDefects: any[]) {
    return zephyrDefects.map(defect => ({
      id: defect.id,
      summary: defect.summary || '',
      url: defect.url || '',
      status: defect.status || ''
    }));
  }
  
  /**
   * Convert Zephyr folders to internal Folder models
   */
  static toFolders(zephyrFolders: any[]): Folder[] {
    return zephyrFolders.map(folder => ({
      id: folder.id,
      name: folder.name,
      description: folder.description || '',
      parentId: folder.parentId,
      path: folder.folderPath || '',
      createdBy: folder.owner,
      createdAt: folder.createdOn ? new Date(folder.createdOn) : undefined,
      updatedAt: folder.updatedOn ? new Date(folder.updatedOn) : undefined
    }));
  }
  
  /**
   * Convert Zephyr projects to internal Project models
   */
  static toProjects(zephyrProjects: any[]): Project[] {
    return zephyrProjects.map(proj => ({
      id: proj.id,
      name: proj.name,
      sourceProjectId: proj.id,
      targetProjectId: '', // To be filled by target system
      sourceProjectKey: proj.key
    }));
  }
  
  /**
   * Convert Zephyr custom fields to internal FieldDefinition models
   */
  static toFieldDefinitions(zephyrFields: any[]): FieldDefinition[] {
    return zephyrFields.map(field => {
      const def: FieldDefinition = {
        id: field.id,
        name: field.name,
        type: this.mapFieldType(field.type),
        required: field.required || false,
        description: field.description || '',
        system: false
      };
      
      if (field.defaultValue !== undefined) {
        def.defaultValue = field.defaultValue;
      }
      
      if (field.options && field.options.length > 0) {
        def.options = field.options.map((opt: any) => ({
          id: opt.id,
          value: opt.value,
          default: opt.default || false
        }));
      }
      
      return def;
    });
  }
  
  /**
   * Map Zephyr field type to internal field type
   */
  private static mapFieldType(zephyrType: string): FieldType {
    const typeMap: Record<string, FieldType> = {
      'TEXT': FieldType.TEXT,
      'TEXTAREA': FieldType.TEXT,
      'RICH_TEXT': FieldType.TEXT,
      'STRING': FieldType.STRING,
      'INT': FieldType.NUMBER,
      'FLOAT': FieldType.NUMBER,
      'DATE': FieldType.DATE,
      'DATETIME': FieldType.DATETIME,
      'CHECKBOX': FieldType.BOOLEAN,
      'DROPDOWN': FieldType.SELECT,
      'RADIO': FieldType.SELECT,
      'MULTISELECT': FieldType.MULTISELECT,
      'USER': FieldType.USER,
      'MULTIUSER': FieldType.MULTIUSER,
      'ATTACHMENT': FieldType.ATTACHMENT,
      'URL': FieldType.URL
    };
    
    return typeMap[zephyrType] || FieldType.CUSTOM;
  }
}