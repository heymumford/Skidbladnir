/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * qTest mapper for the translation layer.
 *
 * This module provides the mapper implementation for converting between
 * qTest specific formats and the canonical data model.
 */

import {
  TestCaseStatus,
  ExecutionStatus,
  Priority,
  CanonicalTestCase,
  CanonicalTestStep,
  CanonicalTestExecution,
  CanonicalAttachment,
  CanonicalCustomField,
  CanonicalTag,
  CanonicalUser,
  CanonicalStepResult,
  TransformationContext
} from '../CanonicalModels';

import { TestCaseMapper, TestExecutionMapper } from '../BaseMapper';

/**
 * Mapper for qTest test cases.
 */
export class QTestTestCaseMapper implements TestCaseMapper<Record<string, any>> {
  readonly systemName: string = 'qtest';

  /**
   * Convert from qTest format to canonical model.
   * 
   * @param source Source data in qTest format
   * @param context Optional transformation context
   * @returns Canonical test case
   */
  toCanonical(source: Record<string, any>, context?: TransformationContext): CanonicalTestCase {
    // Map status from qTest to canonical
    const status = this.mapStatusToCanonical(source);
    
    // Map priority from qTest to canonical
    const priority = this.mapPriorityToCanonical(source);
    
    // Create the canonical test case
    const testCase: CanonicalTestCase = {
      id: String(source.id || ''),
      name: source.name || '',
      objective: this.getPropertyValue(source, 'objective', ''),
      status,
      priority,
      description: source.description || '',
      preconditions: this.getPropertyValue(source, 'precondition', ''),
      folderPath: source.parent_id ? String(source.parent_id) : undefined,
      externalId: source.pid ? String(source.pid) : undefined,
      sourceSystem: "qtest"
    };
    
    // Map test steps
    if (source.test_steps && Array.isArray(source.test_steps)) {
      testCase.testSteps = this.mapStepsToCanonical(source.test_steps);
    }
    
    // Map user information
    if (source.created_by) {
      testCase.createdBy = {
        id: source.created_by,
        username: source.created_by
      };
    }
    
    if (source.last_modified_by) {
      testCase.updatedBy = {
        id: source.last_modified_by,
        username: source.last_modified_by
      };
    }
    
    // Map timestamps
    if (source.created_date) {
      // Parse the date string to a Date object
      testCase.createdAt = new Date(source.created_date);
    }
    
    if (source.last_modified_date) {
      testCase.updatedAt = new Date(source.last_modified_date);
    }
    
    // Map tags/labels
    if (source.tags && Array.isArray(source.tags)) {
      testCase.tags = source.tags.map((tag: string) => ({
        name: tag
      }));
    }
    
    // Map attachments
    if (source.attachments && Array.isArray(source.attachments)) {
      testCase.attachments = this.mapAttachments(source, context);
    }
    
    // Map custom fields
    if (source.properties && Array.isArray(source.properties)) {
      testCase.customFields = this.mapCustomFields(source, context);
    }
    
    return testCase;
  }

  /**
   * Convert from canonical model to qTest format.
   * 
   * @param canonical Canonical test case
   * @param context Optional transformation context
   * @returns qTest test case data
   */
  fromCanonical(canonical: CanonicalTestCase, context?: TransformationContext): Record<string, any> {
    // Create the qTest test case
    const qtestCase: Record<string, any> = {
      name: canonical.name,
      description: canonical.description || '',
      properties: []
    };
    
    // Add parent ID if folder is specified
    if (canonical.folderPath) {
      try {
        qtestCase.parent_id = parseInt(canonical.folderPath, 10);
      } catch (e) {
        // If it's not a number, we might need to handle folder paths differently
      }
    }
    
    // Add objective as property
    if (canonical.objective) {
      qtestCase.properties.push({
        field_name: 'Objective',
        field_value: canonical.objective
      });
    }
    
    // Add precondition as property
    if (canonical.preconditions) {
      qtestCase.properties.push({
        field_name: 'Precondition',
        field_value: canonical.preconditions
      });
    }
    
    // Add priority as property
    qtestCase.properties.push({
      field_name: 'Priority',
      field_value: this.mapPriorityFromCanonical(canonical.priority)
    });
    
    // Add status as property
    qtestCase.properties.push({
      field_name: 'Status',
      field_value: this.mapStatusFromCanonical(canonical.status)
    });
    
    // Map test steps
    if (canonical.testSteps && canonical.testSteps.length > 0) {
      qtestCase.test_steps = this.mapStepsFromCanonical(canonical.testSteps);
    }
    
    // Map labels from tags
    if (canonical.tags && canonical.tags.length > 0) {
      qtestCase.tags = canonical.tags.map(tag => tag.name);
    }
    
    // Map custom fields
    if (canonical.customFields && canonical.customFields.length > 0) {
      for (const field of canonical.customFields) {
        // Skip fields that are handled specifically
        if (['priority', 'status', 'objective', 'precondition'].includes(field.name.toLowerCase())) {
          continue;
        }
        
        qtestCase.properties.push({
          field_name: field.name,
          field_value: field.value
        });
      }
    }
    
    return qtestCase;
  }

  /**
   * Validate the mapping between qTest and canonical model.
   * 
   * @param source Source data in qTest format
   * @param target Canonical test case
   * @returns List of validation messages (empty if valid)
   */
  validateMapping(source: Record<string, any>, target: CanonicalTestCase): string[] {
    const messages: string[] = [];
    
    // Check required fields
    if (!target.id && 'id' in source) {
      messages.push("ID was not properly mapped");
    }
    
    if (!target.name && 'name' in source) {
      messages.push("Name was not properly mapped");
    }
    
    // Check steps mapping
    if (source.test_steps && Array.isArray(source.test_steps)) {
      if (target.testSteps && source.test_steps.length !== target.testSteps.length) {
        messages.push(`Step count mismatch: ${source.test_steps.length} in source, ${target.testSteps?.length || 0} in target`);
      }
    }
    
    return messages;
  }

  /**
   * Map custom fields from qTest format.
   * 
   * @param source Source data in qTest format
   * @param context Optional transformation context
   * @returns List of canonical custom fields
   */
  mapCustomFields(source: Record<string, any>, context?: TransformationContext): CanonicalCustomField[] {
    const customFields: CanonicalCustomField[] = [];
    
    if (source.properties && Array.isArray(source.properties)) {
      for (const prop of source.properties) {
        // Skip fields that are handled specifically
        if (['priority', 'status', 'objective', 'precondition'].includes(prop.field_name?.toLowerCase() || '')) {
          continue;
        }
        
        const fieldType = this.determineFieldType(prop.field_value);
        
        const customField: CanonicalCustomField = {
          name: prop.field_name || '',
          value: prop.field_value,
          fieldType,
          fieldId: prop.field_id ? String(prop.field_id) : undefined
        };
        
        customFields.push(customField);
      }
    }
    
    return customFields;
  }

  /**
   * Map attachments from qTest format.
   * 
   * @param source Source data in qTest format
   * @param context Optional transformation context
   * @returns List of canonical attachments
   */
  mapAttachments(source: Record<string, any>, context?: TransformationContext): CanonicalAttachment[] {
    const attachments: CanonicalAttachment[] = [];
    
    if (source.attachments && Array.isArray(source.attachments)) {
      for (const attachment of source.attachments) {
        const canonicalAttachment: CanonicalAttachment = {
          id: String(attachment.id || ''),
          fileName: attachment.name || '',
          fileType: attachment.content_type || 'application/octet-stream',
          size: attachment.size || 0,
          storageLocation: '',  // This would be set by the storage service
          description: attachment.description || ''
        };
        
        if (attachment.created_by) {
          canonicalAttachment.uploadedBy = attachment.created_by;
        }
        
        if (attachment.created_date) {
          canonicalAttachment.uploadedAt = new Date(attachment.created_date);
        }
        
        attachments.push(canonicalAttachment);
      }
    }
    
    return attachments;
  }

  /**
   * Map qTest steps to canonical test steps.
   */
  private mapStepsToCanonical(qtestSteps: Record<string, any>[]): CanonicalTestStep[] {
    const steps: CanonicalTestStep[] = [];
    
    for (let i = 0; i < qtestSteps.length; i++) {
      const step = qtestSteps[i];
      const canonicalStep: CanonicalTestStep = {
        id: String(step.id || `step-${i+1}`),
        order: step.order || i+1,
        action: step.description || '',
        expectedResult: step.expected_result || '',
        data: step.test_data || '',
        isDataDriven: Boolean(step.test_data)
      };
      
      // Map attachments if present
      if (step.attachments && Array.isArray(step.attachments)) {
        canonicalStep.attachments = [];
        for (const attachment of step.attachments) {
          const canonicalAttachment: CanonicalAttachment = {
            id: String(attachment.id || ''),
            fileName: attachment.name || '',
            fileType: attachment.content_type || 'application/octet-stream',
            size: attachment.size || 0,
            storageLocation: '',  // This would be set by the storage service
            description: attachment.description || ''
          };
          
          canonicalStep.attachments.push(canonicalAttachment);
        }
      }
      
      steps.push(canonicalStep);
    }
    
    return steps;
  }

  /**
   * Map canonical test steps to qTest steps.
   */
  private mapStepsFromCanonical(canonicalSteps: CanonicalTestStep[]): Record<string, any>[] {
    const qtestSteps: Record<string, any>[] = [];
    
    for (const step of canonicalSteps) {
      const qtestStep: Record<string, any> = {
        order: step.order,
        description: step.action,
        expected_result: step.expectedResult || '',
        test_data: step.data || ''
      };
      
      // Include ID if available
      if (step.id) {
        qtestStep.id = step.id;
      }
      
      qtestSteps.push(qtestStep);
    }
    
    return qtestSteps;
  }

  /**
   * Map qTest status to canonical status.
   */
  private mapStatusToCanonical(qtestCase: Record<string, any>): TestCaseStatus {
    if (!qtestCase.properties) {
      return TestCaseStatus.DRAFT;
    }
    
    const statusProp = qtestCase.properties?.find((p: Record<string, any>) => 
      ['Status', 'status'].includes(p.field_name)
    );
    
    if (!statusProp || !statusProp.field_value) {
      return TestCaseStatus.DRAFT;
    }
    
    const statusValue = String(statusProp.field_value).toLowerCase();
    
    const statusMap: Record<string, TestCaseStatus> = {
      '1': TestCaseStatus.DRAFT,
      '2': TestCaseStatus.READY,
      '3': TestCaseStatus.APPROVED,
      '4': TestCaseStatus.DRAFT,  // NEEDS_WORK
      '5': TestCaseStatus.READY,
      '6': TestCaseStatus.DEPRECATED,
      'approved': TestCaseStatus.APPROVED,
      'unapproved': TestCaseStatus.DRAFT,
      'draft': TestCaseStatus.DRAFT,
      'ready to review': TestCaseStatus.READY,
      'ready for review': TestCaseStatus.READY,
      'ready': TestCaseStatus.READY,
      'needs work': TestCaseStatus.DRAFT,  // NEEDS_WORK
      'needs update': TestCaseStatus.DRAFT,  // NEEDS_WORK
      'deprecated': TestCaseStatus.DEPRECATED,
      'obsolete': TestCaseStatus.DEPRECATED
    };
    
    return statusMap[statusValue] || TestCaseStatus.DRAFT;
  }

  /**
   * Map canonical status to qTest status.
   */
  private mapStatusFromCanonical(canonicalStatus: TestCaseStatus): string {
    const statusMap: Record<string, string> = {
      [TestCaseStatus.DRAFT]: '1',
      [TestCaseStatus.READY]: '5',
      [TestCaseStatus.APPROVED]: '3',
      [TestCaseStatus.DEPRECATED]: '6',
      [TestCaseStatus.ARCHIVED]: '6'  // Map ARCHIVED to DEPRECATED in qTest
    };
    
    return statusMap[canonicalStatus] || '1';
  }

  /**
   * Map qTest priority to canonical priority.
   */
  private mapPriorityToCanonical(qtestCase: Record<string, any>): Priority {
    if (!qtestCase.properties) {
      return Priority.MEDIUM;
    }
    
    const priorityProp = qtestCase.properties?.find((p: Record<string, any>) => 
      ['Priority', 'priority'].includes(p.field_name)
    );
    
    if (!priorityProp || !priorityProp.field_value) {
      return Priority.MEDIUM;
    }
    
    const priorityValue = String(priorityProp.field_value).toLowerCase();
    
    const priorityMap: Record<string, Priority> = {
      '1': Priority.CRITICAL,
      '2': Priority.HIGH,
      '3': Priority.MEDIUM,
      '4': Priority.LOW,
      'critical': Priority.CRITICAL,
      'high': Priority.HIGH,
      'medium': Priority.MEDIUM,
      'low': Priority.LOW
    };
    
    return priorityMap[priorityValue] || Priority.MEDIUM;
  }

  /**
   * Map canonical priority to qTest priority.
   */
  private mapPriorityFromCanonical(canonicalPriority: Priority): string {
    const priorityMap: Record<string, string> = {
      [Priority.LOW]: '4',
      [Priority.MEDIUM]: '3',
      [Priority.HIGH]: '2',
      [Priority.CRITICAL]: '1'
    };
    
    return priorityMap[canonicalPriority] || '3';
  }

  /**
   * Get a property value from the qTest test case.
   */
  private getPropertyValue(qtestCase: Record<string, any>, propertyName: string, defaultValue = ''): string {
    if (!qtestCase.properties) {
      return defaultValue;
    }
    
    const prop = qtestCase.properties?.find((p: Record<string, any>) => 
      (p.field_name || '').toLowerCase() === propertyName.toLowerCase()
    );
    
    return prop ? String(prop.field_value || defaultValue) : defaultValue;
  }

  /**
   * Determine the field type based on the value.
   */
  private determineFieldType(value: any): string {
    if (typeof value === 'boolean') {
      return 'BOOLEAN';
    } else if (typeof value === 'number' && Number.isInteger(value)) {
      return 'INTEGER';
    } else if (typeof value === 'number') {
      return 'FLOAT';
    } else if (Array.isArray(value)) {
      return 'MULTISELECT';
    } else if (typeof value === 'object' && value !== null) {
      return 'OBJECT';
    } else {
      return 'STRING';
    }
  }
}

/**
 * Mapper for qTest test executions.
 */
export class QTestTestExecutionMapper implements TestExecutionMapper<Record<string, any>> {
  readonly systemName: string = 'qtest';

  /**
   * Convert from qTest format to canonical model.
   * 
   * @param source Source data in qTest format
   * @param context Optional transformation context
   * @returns Canonical test execution
   */
  toCanonical(source: Record<string, any>, context?: TransformationContext): CanonicalTestExecution {
    // In qTest, an execution is a combination of a test run and its logs
    const testRun = source.test_run || source;
    const testLog = source.test_log || testRun.latest_test_log || {};
    
    // Map status from qTest to canonical
    const status = this.mapExecutionStatusToCanonical(testLog.status?.name || 'NOT_EXECUTED');
    
    // Create the canonical test execution
    const execution: CanonicalTestExecution = {
      id: String(testLog.id || testRun.id || ''),
      testCaseId: String(testRun.test_case?.id || ''),
      status
    };
    
    // Map core execution data
    execution.description = testLog.note || '';
    execution.environment = this.getPropertyValue(testLog, 'environment', '');
    
    // Map test cycle ID
    if (testRun.test_cycle) {
      execution.testCycleId = String(testRun.test_cycle.id);
    }
    
    // Map timestamps
    if (testLog.execution_date) {
      execution.startTime = new Date(testLog.execution_date);
    }
    
    // Map executed by
    if (testLog.executed_by) {
      execution.executedBy = {
        id: testLog.executed_by,
        username: testLog.executed_by
      };
    }
    
    // Map duration
    if (testLog.execution_time_seconds) {
      execution.executionTime = testLog.execution_time_seconds;
    }
    
    // Map step results
    if (testLog.test_step_logs && Array.isArray(testLog.test_step_logs)) {
      execution.stepResults = this.mapStepResults(testLog, context);
    }
    
    // Map attachments
    if (testLog.attachments && Array.isArray(testLog.attachments)) {
      execution.attachments = [];
      for (const attachment of testLog.attachments) {
        const canonicalAttachment: CanonicalAttachment = {
          id: String(attachment.id || ''),
          fileName: attachment.name || '',
          fileType: attachment.content_type || 'application/octet-stream',
          size: attachment.size || 0,
          storageLocation: '',  // This would be set by the storage service
          description: attachment.description || ''
        };
        
        if (attachment.created_by) {
          canonicalAttachment.uploadedBy = attachment.created_by;
        }
        
        if (attachment.created_date) {
          canonicalAttachment.uploadedAt = new Date(attachment.created_date);
        }
        
        execution.attachments.push(canonicalAttachment);
      }
    }
    
    // Map defects
    if (testLog.defects && Array.isArray(testLog.defects)) {
      execution.defects = testLog.defects.map((defect: Record<string, any>) => 
        String(defect.id || '')
      );
    }
    
    return execution;
  }

  /**
   * Convert from canonical model to qTest format.
   * 
   * @param canonical Canonical test execution
   * @param context Optional transformation context
   * @returns qTest test execution data
   */
  fromCanonical(canonical: CanonicalTestExecution, context?: TransformationContext): Record<string, any> {
    // For qTest, we typically create a test log
    const qtestLog: Record<string, any> = {
      status: {
        name: this.mapExecutionStatusFromCanonical(canonical.status)
      },
      note: canonical.description || '',
      properties: []
    };
    
    // Map test case ID
    if (canonical.testCaseId) {
      qtestLog.test_case_id = canonical.testCaseId;
    }
    
    // Map environment
    if (canonical.environment) {
      qtestLog.properties.push({
        field_name: 'Environment',
        field_value: canonical.environment
      });
    }
    
    // Map execution timestamp
    if (canonical.startTime) {
      qtestLog.execution_date = canonical.startTime.toISOString();
    }
    
    // Map executed by
    if (canonical.executedBy) {
      qtestLog.executed_by = canonical.executedBy.id || canonical.executedBy.username;
    }
    
    // Map execution time
    if (canonical.executionTime) {
      qtestLog.execution_time_seconds = canonical.executionTime;
    }
    
    // Map step results
    if (canonical.stepResults && canonical.stepResults.length > 0) {
      qtestLog.test_step_logs = [];
      for (const result of canonical.stepResults) {
        const qtestStepLog: Record<string, any> = {
          test_step_id: result.stepId,
          order: result.metadata?.sequence || 0,
          status: {
            name: this.mapExecutionStatusFromCanonical(result.status)
          },
          actual_result: result.actualResult || '',
          note: result.notes || ''
        };
        qtestLog.test_step_logs.push(qtestStepLog);
      }
    }
    
    // Map defects
    if (canonical.defects && canonical.defects.length > 0) {
      qtestLog.defects = canonical.defects.map(defectId => ({ id: defectId }));
    }
    
    return qtestLog;
  }

  /**
   * Validate the mapping between qTest and canonical model.
   * 
   * @param source Source data in qTest format
   * @param target Canonical test execution
   * @returns List of validation messages (empty if valid)
   */
  validateMapping(source: Record<string, any>, target: CanonicalTestExecution): string[] {
    const messages: string[] = [];
    const testLog = source.test_log || source.latest_test_log || source;
    const testRun = source.test_run || source;
    
    // Check required fields
    if (!target.id && ('id' in testLog || 'id' in testRun)) {
      messages.push("ID was not properly mapped");
    }
    
    if (!target.testCaseId && 'test_case' in testRun) {
      messages.push("Test case ID was not properly mapped");
    }
    
    // Check step results mapping
    if (testLog.test_step_logs && Array.isArray(testLog.test_step_logs)) {
      if (target.stepResults && testLog.test_step_logs.length !== target.stepResults.length) {
        messages.push(`Step result count mismatch: ${testLog.test_step_logs.length} in source, ${target.stepResults.length} in target`);
      }
    }
    
    return messages;
  }

  /**
   * Map step results from qTest format.
   * 
   * @param source Source data in qTest format
   * @param context Optional transformation context
   * @returns List of canonical step results
   */
  mapStepResults(source: Record<string, any>, context?: TransformationContext): CanonicalStepResult[] {
    const stepResults: CanonicalStepResult[] = [];
    
    if (source.test_step_logs && Array.isArray(source.test_step_logs)) {
      for (const log of source.test_step_logs) {
        const statusName = log.status?.name || 'NOT_EXECUTED';
        
        const stepResult: CanonicalStepResult = {
          stepId: String(log.test_step_id || ''),
          status: this.mapExecutionStatusToCanonical(statusName),
          actualResult: log.actual_result || '',
          notes: log.note || '',
          metadata: {
            sequence: log.order || 0
          }
        };
        
        // Map attachments if present
        if (log.attachments && Array.isArray(log.attachments)) {
          stepResult.attachments = [];
          for (const attachment of log.attachments) {
            const canonicalAttachment: CanonicalAttachment = {
              id: String(attachment.id || ''),
              fileName: attachment.name || '',
              fileType: attachment.content_type || 'application/octet-stream',
              size: attachment.size || 0,
              storageLocation: '',  // This would be set by the storage service
              description: attachment.description || ''
            };
            stepResult.attachments.push(canonicalAttachment);
          }
        }
        
        stepResults.push(stepResult);
      }
    }
    
    return stepResults;
  }

  /**
   * Map qTest execution status to canonical execution status.
   */
  private mapExecutionStatusToCanonical(qtestStatus: string): ExecutionStatus {
    const statusMap: Record<string, ExecutionStatus> = {
      'PASS': ExecutionStatus.PASSED,
      'PASSED': ExecutionStatus.PASSED,
      'FAIL': ExecutionStatus.FAILED,
      'FAILED': ExecutionStatus.FAILED,
      'BLOCK': ExecutionStatus.BLOCKED,
      'BLOCKED': ExecutionStatus.BLOCKED,
      'NOT_EXECUTED': ExecutionStatus.NOT_EXECUTED,
      'UNEXECUTED': ExecutionStatus.NOT_EXECUTED,
      'INCOMPLETE': ExecutionStatus.IN_PROGRESS,
      'IN_PROGRESS': ExecutionStatus.IN_PROGRESS,
      'SKIP': ExecutionStatus.SKIPPED,
      'SKIPPED': ExecutionStatus.SKIPPED
    };
    
    return statusMap[qtestStatus.toUpperCase()] || ExecutionStatus.NOT_EXECUTED;
  }

  /**
   * Map canonical execution status to qTest execution status.
   */
  private mapExecutionStatusFromCanonical(canonicalStatus: ExecutionStatus): string {
    const statusMap: Record<string, string> = {
      [ExecutionStatus.PASSED]: 'PASSED',
      [ExecutionStatus.FAILED]: 'FAILED',
      [ExecutionStatus.BLOCKED]: 'BLOCKED',
      [ExecutionStatus.NOT_EXECUTED]: 'NOT_EXECUTED',
      [ExecutionStatus.IN_PROGRESS]: 'INCOMPLETE',
      [ExecutionStatus.SKIPPED]: 'SKIPPED'
    };
    
    return statusMap[canonicalStatus] || 'NOT_EXECUTED';
  }

  /**
   * Get a property value from the qTest object.
   */
  private getPropertyValue(qtestObject: Record<string, any>, propertyName: string, defaultValue = ''): string {
    if (!qtestObject.properties) {
      return defaultValue;
    }
    
    const prop = qtestObject.properties?.find((p: Record<string, any>) => 
      (p.field_name || '').toLowerCase() === propertyName.toLowerCase()
    );
    
    return prop ? String(prop.field_value || defaultValue) : defaultValue;
  }
}

/**
 * Register the qTest mappers with the registry.
 */
export function registerMappers(): void {
  // Import at top level to avoid circular imports
  import('../BaseMapper').then(({ mapperRegistry }) => {
    mapperRegistry.register("qtest", "test-case", new QTestTestCaseMapper());
    mapperRegistry.register("qtest", "test-execution", new QTestTestExecutionMapper());
  }).catch(error => {
    console.error("Failed to register qTest mappers:", error);
  });
}