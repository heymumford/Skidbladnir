/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Zephyr Scale mapper for the translation layer.
 * 
 * This module provides the mapper implementation for converting between
 * Zephyr Scale specific formats and the canonical data model.
 */

import {
  TestCaseStatus,
  ExecutionStatus,
  Priority,
  CanonicalTestCase,
  CanonicalTestStep,
  CanonicalTestExecution,
  CanonicalTestSuite,
  CanonicalTestCycle,
  CanonicalAttachment,
  CanonicalCustomField,
  CanonicalTag,
  CanonicalLink,
  CanonicalUser,
  CanonicalStepResult,
  TransformationContext
} from '../CanonicalModels';

import { TestCaseMapper, TestExecutionMapper, TestSuiteMapper, TestCycleMapper } from '../BaseMapper';

/**
 * Mapper for Zephyr Scale test cases.
 */
export class ZephyrTestCaseMapper implements TestCaseMapper<Record<string, any>> {
  readonly systemName: string = 'zephyr';

  /**
   * Convert from Zephyr Scale format to canonical model.
   * 
   * @param source Source data in Zephyr Scale format
   * @param context Optional transformation context
   * @returns Canonical test case
   */
  toCanonical(source: Record<string, any>, context?: TransformationContext): CanonicalTestCase {
    // Map status from Zephyr to canonical
    const status = this.mapStatusToCanonical(source.status || 'DRAFT');
    
    // Map priority from Zephyr to canonical
    const priority = this.mapPriorityToCanonical(source.priority || 'MEDIUM');
    
    // Create the canonical test case
    const testCase: CanonicalTestCase = {
      id: source.id || '',
      name: source.name || '',
      objective: source.objective || '',
      status,
      priority,
      description: source.description || '',
      preconditions: source.precondition || '',
      folderPath: source.folderPath || '',
      externalId: source.key || '',
      sourceSystem: "zephyr"
    };
    
    // Map test steps
    if (source.steps && Array.isArray(source.steps)) {
      testCase.testSteps = this.mapStepsToCanonical(source.steps);
    }
    
    // Map user information
    if (source.owner) {
      testCase.owner = {
        id: source.owner,
        username: source.owner
      };
    }
    
    if (source.createdBy) {
      testCase.createdBy = {
        id: source.createdBy,
        username: source.createdBy
      };
    }
    
    // Map timestamps
    if (source.createdOn) {
      testCase.createdAt = new Date(source.createdOn);
    }
    
    if (source.updatedOn) {
      testCase.updatedAt = new Date(source.updatedOn);
    }
    
    // Map tags/labels
    if (source.labels && Array.isArray(source.labels)) {
      testCase.tags = source.labels.map((label: string) => ({
        name: label
      }));
    }
    
    // Map attachments
    if (source.attachments && Array.isArray(source.attachments)) {
      testCase.attachments = this.mapAttachments(source, context);
    }
    
    // Map custom fields
    if (source.customFields && typeof source.customFields === 'object') {
      testCase.customFields = this.mapCustomFields(source, context);
    }
    
    return testCase;
  }

  /**
   * Convert from canonical model to Zephyr Scale format.
   * 
   * @param canonical Canonical test case
   * @param context Optional transformation context
   * @returns Zephyr Scale test case data
   */
  fromCanonical(canonical: CanonicalTestCase, context?: TransformationContext): Record<string, any> {
    // Create the Zephyr Scale test case
    const zephyrTest: Record<string, any> = {
      name: canonical.name,
      description: canonical.description || '',
      objective: canonical.objective || '',
      precondition: canonical.preconditions || '',
      status: this.mapStatusFromCanonical(canonical.status),
      priority: this.mapPriorityFromCanonical(canonical.priority),
    };
    
    // Map folder path
    if (canonical.folderPath) {
      zephyrTest.folderPath = canonical.folderPath;
    }
    
    // Map test steps
    if (canonical.testSteps && canonical.testSteps.length > 0) {
      zephyrTest.steps = this.mapStepsFromCanonical(canonical.testSteps);
    }
    
    // Map labels from tags
    if (canonical.tags && canonical.tags.length > 0) {
      zephyrTest.labels = canonical.tags.map(tag => tag.name);
    }
    
    // Map custom fields
    if (canonical.customFields && canonical.customFields.length > 0) {
      zephyrTest.customFields = {};
      for (const field of canonical.customFields) {
        zephyrTest.customFields[field.name] = field.value;
      }
    }
    
    return zephyrTest;
  }

  /**
   * Validate the mapping between Zephyr Scale and canonical model.
   * 
   * @param source Source data in Zephyr Scale format
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
    if (source.steps && Array.isArray(source.steps)) {
      if (target.testSteps && source.steps.length !== target.testSteps.length) {
        messages.push(`Step count mismatch: ${source.steps.length} in source, ${target.testSteps.length} in target`);
      }
    }
    
    return messages;
  }

  /**
   * Map custom fields from Zephyr Scale format.
   * 
   * @param source Source data in Zephyr Scale format
   * @param context Optional transformation context
   * @returns List of canonical custom fields
   */
  mapCustomFields(source: Record<string, any>, context?: TransformationContext): CanonicalCustomField[] {
    const customFields: CanonicalCustomField[] = [];
    
    if (source.customFields && typeof source.customFields === 'object') {
      for (const [name, value] of Object.entries(source.customFields)) {
        const fieldType = this.determineFieldType(value);
        
        const customField: CanonicalCustomField = {
          name,
          value,
          fieldType
        };
        
        customFields.push(customField);
      }
    }
    
    return customFields;
  }

  /**
   * Map attachments from Zephyr Scale format.
   * 
   * @param source Source data in Zephyr Scale format
   * @param context Optional transformation context
   * @returns List of canonical attachments
   */
  mapAttachments(source: Record<string, any>, context?: TransformationContext): CanonicalAttachment[] {
    const attachments: CanonicalAttachment[] = [];
    
    if (source.attachments && Array.isArray(source.attachments)) {
      for (const attachment of source.attachments) {
        const canonicalAttachment: CanonicalAttachment = {
          id: String(attachment.id || ''),
          fileName: attachment.filename || '',
          fileType: attachment.contentType || 'application/octet-stream',
          size: attachment.fileSize || 0,
          storageLocation: '',  // This would be set by the storage service
          description: attachment.comment || ''
        };
        
        if (attachment.createdBy) {
          canonicalAttachment.uploadedBy = attachment.createdBy;
        }
        
        if (attachment.createdOn) {
          canonicalAttachment.uploadedAt = new Date(attachment.createdOn);
        }
        
        attachments.push(canonicalAttachment);
      }
    }
    
    return attachments;
  }

  /**
   * Map Zephyr Scale steps to canonical test steps.
   */
  private mapStepsToCanonical(zephyrSteps: Record<string, any>[]): CanonicalTestStep[] {
    const steps: CanonicalTestStep[] = [];
    
    for (let i = 0; i < zephyrSteps.length; i++) {
      const step = zephyrSteps[i];
      const canonicalStep: CanonicalTestStep = {
        id: String(step.id || `step-${i+1}`),
        order: step.index || i+1,
        action: step.description || '',
        expectedResult: step.expectedResult || '',
        data: step.testData || '',
        isDataDriven: Boolean(step.testData)
      };
      
      // Map attachments if present
      if (step.attachments && Array.isArray(step.attachments)) {
        canonicalStep.attachments = [];
        for (const attachment of step.attachments) {
          const canonicalAttachment: CanonicalAttachment = {
            id: String(attachment.id || ''),
            fileName: attachment.filename || '',
            fileType: attachment.contentType || 'application/octet-stream',
            size: attachment.fileSize || 0,
            storageLocation: '',  // This would be set by the storage service
            description: attachment.comment || ''
          };
          
          canonicalStep.attachments.push(canonicalAttachment);
        }
      }
      
      steps.push(canonicalStep);
    }
    
    return steps;
  }

  /**
   * Map canonical test steps to Zephyr Scale steps.
   */
  private mapStepsFromCanonical(canonicalSteps: CanonicalTestStep[]): Record<string, any>[] {
    const zephyrSteps: Record<string, any>[] = [];
    
    for (const step of canonicalSteps) {
      const zephyrStep: Record<string, any> = {
        index: step.order,
        description: step.action,
        expectedResult: step.expectedResult || '',
        testData: step.data || ''
      };
      
      // Include ID if available
      if (step.id) {
        zephyrStep.id = step.id;
      }
      
      zephyrSteps.push(zephyrStep);
    }
    
    return zephyrSteps;
  }

  /**
   * Map Zephyr Scale status to canonical status.
   */
  private mapStatusToCanonical(zephyrStatus: string): TestCaseStatus {
    const statusMap: Record<string, TestCaseStatus> = {
      'DRAFT': TestCaseStatus.DRAFT,
      'READY': TestCaseStatus.READY,
      'APPROVED': TestCaseStatus.APPROVED,
      'DEPRECATED': TestCaseStatus.DEPRECATED,
      'OBSOLETE': TestCaseStatus.DEPRECATED,
      'ARCHIVED': TestCaseStatus.ARCHIVED
    };
    
    return statusMap[zephyrStatus.toUpperCase()] || TestCaseStatus.DRAFT;
  }

  /**
   * Map canonical status to Zephyr Scale status.
   */
  private mapStatusFromCanonical(canonicalStatus: TestCaseStatus): string {
    const statusMap: Record<string, string> = {
      [TestCaseStatus.DRAFT]: 'DRAFT',
      [TestCaseStatus.READY]: 'READY',
      [TestCaseStatus.APPROVED]: 'APPROVED',
      [TestCaseStatus.DEPRECATED]: 'DEPRECATED',
      [TestCaseStatus.ARCHIVED]: 'ARCHIVED'
    };
    
    return statusMap[canonicalStatus] || 'DRAFT';
  }

  /**
   * Map Zephyr Scale priority to canonical priority.
   */
  private mapPriorityToCanonical(zephyrPriority: string): Priority {
    const priorityMap: Record<string, Priority> = {
      'LOW': Priority.LOW,
      'MEDIUM': Priority.MEDIUM,
      'HIGH': Priority.HIGH,
      'CRITICAL': Priority.CRITICAL,
      'HIGHEST': Priority.CRITICAL
    };
    
    return priorityMap[zephyrPriority.toUpperCase()] || Priority.MEDIUM;
  }

  /**
   * Map canonical priority to Zephyr Scale priority.
   */
  private mapPriorityFromCanonical(canonicalPriority: Priority): string {
    const priorityMap: Record<string, string> = {
      [Priority.LOW]: 'LOW',
      [Priority.MEDIUM]: 'MEDIUM',
      [Priority.HIGH]: 'HIGH',
      [Priority.CRITICAL]: 'CRITICAL'
    };
    
    return priorityMap[canonicalPriority] || 'MEDIUM';
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
 * Mapper for Zephyr Scale test executions.
 */
export class ZephyrTestExecutionMapper implements TestExecutionMapper<Record<string, any>> {
  readonly systemName: string = 'zephyr';

  /**
   * Convert from Zephyr Scale format to canonical model.
   * 
   * @param source Source data in Zephyr Scale format
   * @param context Optional transformation context
   * @returns Canonical test execution
   */
  toCanonical(source: Record<string, any>, context?: TransformationContext): CanonicalTestExecution {
    // Map status from Zephyr to canonical
    const status = this.mapExecutionStatusToCanonical(source.status || 'NOT_EXECUTED');
    
    // Create the canonical test execution
    const execution: CanonicalTestExecution = {
      id: source.id || '',
      testCaseId: source.testId || '',
      status
    };
    
    // Map core execution data
    execution.description = source.comment || '';
    execution.environment = source.environment || '';
    
    // Map timestamps
    if (source.executedOn) {
      execution.startTime = new Date(source.executedOn);
    }
    
    // Map executed by
    if (source.executedBy) {
      execution.executedBy = {
        id: source.executedBy,
        username: source.executedBy
      };
    }
    
    // Map test cycle ID
    if (source.cycleId) {
      execution.testCycleId = source.cycleId;
    }
    
    // Map duration
    if (source.timeSpentInSeconds) {
      execution.executionTime = source.timeSpentInSeconds;
    }
    
    // Map step results
    if (source.stepResults && Array.isArray(source.stepResults)) {
      execution.stepResults = this.mapStepResults(source, context);
    }
    
    // Map attachments
    if (source.attachments && Array.isArray(source.attachments)) {
      execution.attachments = [];
      for (const attachment of source.attachments) {
        const canonicalAttachment: CanonicalAttachment = {
          id: String(attachment.id || ''),
          fileName: attachment.filename || '',
          fileType: attachment.contentType || 'application/octet-stream',
          size: attachment.fileSize || 0,
          storageLocation: '',  // This would be set by the storage service
          description: attachment.comment || ''
        };
        
        if (attachment.createdBy) {
          canonicalAttachment.uploadedBy = attachment.createdBy;
        }
        
        if (attachment.createdOn) {
          canonicalAttachment.uploadedAt = new Date(attachment.createdOn);
        }
        
        execution.attachments.push(canonicalAttachment);
      }
    }
    
    // Map defects
    if (source.defects && Array.isArray(source.defects)) {
      execution.defects = source.defects.map((defect: Record<string, any>) => 
        defect.id || ''
      );
    }
    
    return execution;
  }

  /**
   * Convert from canonical model to Zephyr Scale format.
   * 
   * @param canonical Canonical test execution
   * @param context Optional transformation context
   * @returns Zephyr Scale test execution data
   */
  fromCanonical(canonical: CanonicalTestExecution, context?: TransformationContext): Record<string, any> {
    // Create the Zephyr Scale test execution
    const zephyrExecution: Record<string, any> = {
      testId: canonical.testCaseId,
      status: this.mapExecutionStatusFromCanonical(canonical.status),
      comment: canonical.description || ''
    };
    
    // Map environment
    if (canonical.environment) {
      zephyrExecution.environment = canonical.environment;
    }
    
    // Map cycle ID
    if (canonical.testCycleId) {
      zephyrExecution.cycleId = canonical.testCycleId;
    }
    
    // Map executed by
    if (canonical.executedBy) {
      zephyrExecution.executedBy = canonical.executedBy.id || canonical.executedBy.username;
    }
    
    // Map execution time
    if (canonical.startTime) {
      zephyrExecution.executedOn = canonical.startTime.toISOString();
    }
    
    // Map duration
    if (canonical.executionTime) {
      zephyrExecution.timeSpentInSeconds = canonical.executionTime;
    }
    
    // Map step results
    if (canonical.stepResults && canonical.stepResults.length > 0) {
      zephyrExecution.stepResults = [];
      for (const result of canonical.stepResults) {
        const zephyrResult: Record<string, any> = {
          stepId: result.stepId,
          index: result.metadata?.sequence,
          status: this.mapExecutionStatusFromCanonical(result.status),
          actualResult: result.actualResult || '',
          comment: result.notes || ''
        };
        zephyrExecution.stepResults.push(zephyrResult);
      }
    }
    
    return zephyrExecution;
  }

  /**
   * Validate the mapping between Zephyr Scale and canonical model.
   * 
   * @param source Source data in Zephyr Scale format
   * @param target Canonical test execution
   * @returns List of validation messages (empty if valid)
   */
  validateMapping(source: Record<string, any>, target: CanonicalTestExecution): string[] {
    const messages: string[] = [];
    
    // Check required fields
    if (!target.id && 'id' in source) {
      messages.push("ID was not properly mapped");
    }
    
    if (!target.testCaseId && 'testId' in source) {
      messages.push("Test case ID was not properly mapped");
    }
    
    // Check step results mapping
    if (source.stepResults && Array.isArray(source.stepResults)) {
      if (target.stepResults && source.stepResults.length !== target.stepResults.length) {
        messages.push(`Step result count mismatch: ${source.stepResults.length} in source, ${target.stepResults.length} in target`);
      }
    }
    
    return messages;
  }

  /**
   * Map step results from Zephyr Scale format.
   * 
   * @param source Source data in Zephyr Scale format
   * @param context Optional transformation context
   * @returns List of canonical step results
   */
  mapStepResults(source: Record<string, any>, context?: TransformationContext): CanonicalStepResult[] {
    const stepResults: CanonicalStepResult[] = [];
    
    if (source.stepResults && Array.isArray(source.stepResults)) {
      for (const result of source.stepResults) {
        const stepResult: CanonicalStepResult = {
          stepId: result.stepId || '',
          status: this.mapExecutionStatusToCanonical(result.status || 'NOT_EXECUTED'),
          actualResult: result.actualResult || '',
          notes: result.comment || '',
          metadata: {
            sequence: result.index || 0
          }
        };
        
        // Map attachments if present
        if (result.attachments && Array.isArray(result.attachments)) {
          stepResult.attachments = [];
          for (const attachment of result.attachments) {
            const canonicalAttachment: CanonicalAttachment = {
              id: String(attachment.id || ''),
              fileName: attachment.filename || '',
              fileType: attachment.contentType || 'application/octet-stream',
              size: attachment.fileSize || 0,
              storageLocation: '',  // This would be set by the storage service
              description: attachment.comment || ''
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
   * Map Zephyr Scale execution status to canonical execution status.
   */
  private mapExecutionStatusToCanonical(zephyrStatus: string): ExecutionStatus {
    const statusMap: Record<string, ExecutionStatus> = {
      'PASS': ExecutionStatus.PASSED,
      'PASSED': ExecutionStatus.PASSED,
      'FAIL': ExecutionStatus.FAILED,
      'FAILED': ExecutionStatus.FAILED,
      'BLOCK': ExecutionStatus.BLOCKED,
      'BLOCKED': ExecutionStatus.BLOCKED,
      'NOT_EXECUTED': ExecutionStatus.NOT_EXECUTED,
      'UNEXECUTED': ExecutionStatus.NOT_EXECUTED,
      'IN_PROGRESS': ExecutionStatus.IN_PROGRESS,
      'SKIP': ExecutionStatus.SKIPPED,
      'SKIPPED': ExecutionStatus.SKIPPED
    };
    
    return statusMap[zephyrStatus.toUpperCase()] || ExecutionStatus.NOT_EXECUTED;
  }

  /**
   * Map canonical execution status to Zephyr Scale execution status.
   */
  private mapExecutionStatusFromCanonical(canonicalStatus: ExecutionStatus): string {
    const statusMap: Record<string, string> = {
      [ExecutionStatus.PASSED]: 'PASSED',
      [ExecutionStatus.FAILED]: 'FAILED',
      [ExecutionStatus.BLOCKED]: 'BLOCKED',
      [ExecutionStatus.NOT_EXECUTED]: 'NOT_EXECUTED',
      [ExecutionStatus.IN_PROGRESS]: 'IN_PROGRESS',
      [ExecutionStatus.SKIPPED]: 'SKIPPED'
    };
    
    return statusMap[canonicalStatus] || 'NOT_EXECUTED';
  }
}

/**
 * Register the Zephyr Scale mappers with the registry.
 */
export function registerMappers(): void {
  // Import at top level to avoid circular imports
  import('../BaseMapper').then(({ mapperRegistry }) => {
    mapperRegistry.register("zephyr", "test-case", new ZephyrTestCaseMapper());
    mapperRegistry.register("zephyr", "test-execution", new ZephyrTestExecutionMapper());
  }).catch(error => {
    console.error("Failed to register Zephyr mappers:", error);
  });
}