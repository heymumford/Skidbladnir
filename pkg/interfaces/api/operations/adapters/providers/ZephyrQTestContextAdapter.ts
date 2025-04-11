/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { OperationType, OperationContext } from '../../types';
import { ZephyrQTestAdapter } from './ZephyrQTestAdapter';

/**
 * Adapter for converting operation context between Zephyr Scale and qTest.
 * This facilitates seamless operation execution bridging between the two systems.
 */
export class ZephyrQTestContextAdapter {
  
  /**
   * Convert a Zephyr Scale operation context to a qTest operation context
   * by mapping parameters and results appropriately.
   * 
   * @param zephyrContext The original Zephyr Scale operation context
   * @returns A qTest-compatible operation context
   */
  static toQTestContext(zephyrContext: OperationContext): OperationContext {
    const qtestContext: OperationContext = {
      input: this.mapInputParameters(zephyrContext.input),
      results: this.mapResultsToQTest(zephyrContext.results),
      sourceProvider: zephyrContext.sourceProvider,
      targetProvider: zephyrContext.targetProvider,
      abortSignal: zephyrContext.abortSignal,
      metadata: { ...zephyrContext.metadata, originalProvider: 'zephyr' }
    };
    
    return qtestContext;
  }
  
  /**
   * Convert a qTest operation context back to a Zephyr Scale operation context,
   * primarily used when needing to maintain backward compatibility.
   * 
   * @param qtestContext The qTest operation context
   * @returns A Zephyr Scale-compatible operation context
   */
  static toZephyrContext(qtestContext: OperationContext): OperationContext {
    const zephyrContext: OperationContext = {
      input: this.mapInputParametersToZephyr(qtestContext.input),
      results: this.mapResultsToZephyr(qtestContext.results),
      sourceProvider: qtestContext.sourceProvider,
      targetProvider: qtestContext.targetProvider,
      abortSignal: qtestContext.abortSignal,
      metadata: { ...qtestContext.metadata, originalProvider: 'qtest' }
    };
    
    return zephyrContext;
  }
  
  /**
   * Map input parameters from Zephyr Scale format to qTest format
   * 
   * @param zephyrInput Zephyr Scale input parameters
   * @returns qTest-compatible input parameters
   */
  private static mapInputParameters(zephyrInput: Record<string, any>): Record<string, any> {
    // Use the parameter mapping from the ZephyrQTestAdapter
    return ZephyrQTestAdapter.mapParameters(zephyrInput);
  }
  
  /**
   * Map input parameters from qTest format back to Zephyr Scale format
   * 
   * @param qtestInput qTest input parameters
   * @returns Zephyr Scale-compatible input parameters
   */
  private static mapInputParametersToZephyr(qtestInput: Record<string, any>): Record<string, any> {
    const zephyrInput: Record<string, any> = {};
    const parameterMap = ZephyrQTestAdapter.getOperationTypeMap();
    
    // Reverse the parameter mapping
    for (const [key, value] of Object.entries(qtestInput)) {
      // Find the original Zephyr parameter name if it exists
      const zephyrKey = Object.entries(parameterMap)
        .find(([_, qtestParam]) => qtestParam === key)?.[0] || key;
      
      zephyrInput[zephyrKey] = value;
    }
    
    return zephyrInput;
  }
  
  /**
   * Map operation results from Zephyr Scale format to qTest format
   * 
   * @param zephyrResults Zephyr Scale operation results
   * @returns qTest-compatible operation results
   */
  private static mapResultsToQTest(zephyrResults: Record<OperationType, any>): Record<OperationType, any> {
    const qtestResults: Record<OperationType, any> = {};
    
    // Process each result
    for (const [opType, result] of Object.entries(zephyrResults)) {
      const zephyrOpType = opType as OperationType;
      const qtestOpType = ZephyrQTestAdapter.findEquivalentQTestOperation(zephyrOpType.toString());
      
      // Transform the result data structure if needed
      const transformedResult = this.transformResultData(zephyrOpType, result);
      
      // Store under the qTest operation type
      qtestResults[qtestOpType] = transformedResult;
    }
    
    return qtestResults;
  }
  
  /**
   * Map operation results from qTest format back to Zephyr Scale format
   * 
   * @param qtestResults qTest operation results
   * @returns Zephyr Scale-compatible operation results
   */
  private static mapResultsToZephyr(qtestResults: Record<OperationType, any>): Record<OperationType, any> {
    const zephyrResults: Record<OperationType, any> = {};
    const operationMap = ZephyrQTestAdapter.getOperationTypeMap();
    
    // Process each result
    for (const [opType, result] of Object.entries(qtestResults)) {
      const qtestOpType = opType as OperationType;
      
      // Find the Zephyr equivalent operation type
      // This is more complex as we need to reverse-lookup the map
      let zephyrOpType = qtestOpType;
      for (const [zephyrType, qtestType] of Object.entries(operationMap)) {
        if (qtestType === qtestOpType.toString()) {
          zephyrOpType = zephyrType as unknown as OperationType;
          break;
        }
      }
      
      // Transform the result data structure if needed
      const transformedResult = this.transformResultDataToZephyr(qtestOpType, result);
      
      // Store under the Zephyr operation type
      zephyrResults[zephyrOpType] = transformedResult;
    }
    
    return zephyrResults;
  }
  
  /**
   * Transform result data from Zephyr Scale format to qTest format based on operation type
   * 
   * @param operationType The operation type
   * @param data The Zephyr Scale result data
   * @returns Transformed data for qTest
   */
  private static transformResultData(operationType: OperationType, data: any): any {
    // Apply specific transformations based on operation type
    switch (operationType) {
      case OperationType.GET_TEST_CASE:
        return this.transformTestCaseData(data);
        
      case OperationType.GET_TEST_CASES:
        return this.transformTestCasesData(data);
        
      case OperationType.GET_ATTACHMENTS:
        return this.transformAttachmentsData(data);
        
      case OperationType.GET_TEST_EXECUTIONS:
        return this.transformExecutionsData(data);
        
      default:
        // For other operations, return data as is
        return data;
    }
  }
  
  /**
   * Transform result data from qTest format back to Zephyr Scale format
   * 
   * @param operationType The operation type
   * @param data The qTest result data
   * @returns Transformed data for Zephyr Scale
   */
  private static transformResultDataToZephyr(operationType: OperationType, data: any): any {
    // Apply reverse transformations based on operation type
    switch (operationType) {
      case OperationType.GET_TEST_CASE:
        return this.transformTestCaseDataToZephyr(data);
        
      case OperationType.GET_TEST_CASES:
        return this.transformTestCasesDataToZephyr(data);
        
      case OperationType.GET_ATTACHMENTS:
        return this.transformAttachmentsDataToZephyr(data);
        
      case OperationType.GET_TEST_EXECUTIONS:
        return this.transformExecutionsDataToZephyr(data);
        
      default:
        // For other operations, return data as is
        return data;
    }
  }
  
  /**
   * Transform test case data from Zephyr Scale format to qTest format
   */
  private static transformTestCaseData(zephyrTestCase: any): any {
    if (!zephyrTestCase) return null;
    
    // Basic mapping from Zephyr to qTest structure
    const qtestTestCase = {
      id: zephyrTestCase.id,
      name: zephyrTestCase.name,
      description: zephyrTestCase.description || '',
      properties: [
        // Status conversion
        {
          field_name: 'Status',
          field_value: this.mapZephyrStatusToQTest(zephyrTestCase.status)
        },
        // Priority conversion
        {
          field_name: 'Priority',
          field_value: this.mapZephyrPriorityToQTest(zephyrTestCase.priority)
        }
      ],
      parent_id: zephyrTestCase.folderId
    };
    
    // Map test steps
    if (zephyrTestCase.steps && Array.isArray(zephyrTestCase.steps)) {
      qtestTestCase.test_steps = zephyrTestCase.steps.map((step: any, index: number) => ({
        id: step.id || `step-${index + 1}`,
        order: step.index || index + 1,
        description: step.description || '',
        expected_result: step.expectedResult || '',
        test_data: step.testData || ''
      }));
    }
    
    // Add objective if available
    if (zephyrTestCase.objective) {
      qtestTestCase.properties.push({
        field_name: 'Objective',
        field_value: zephyrTestCase.objective
      });
    }
    
    // Add precondition if available
    if (zephyrTestCase.precondition) {
      qtestTestCase.properties.push({
        field_name: 'Precondition',
        field_value: zephyrTestCase.precondition
      });
    }
    
    // Map custom fields if available
    if (zephyrTestCase.customFields && typeof zephyrTestCase.customFields === 'object') {
      for (const [name, value] of Object.entries(zephyrTestCase.customFields)) {
        qtestTestCase.properties.push({
          field_name: name,
          field_value: value
        });
      }
    }
    
    return qtestTestCase;
  }
  
  /**
   * Transform test case data from qTest format back to Zephyr Scale format
   */
  private static transformTestCaseDataToZephyr(qtestTestCase: any): any {
    if (!qtestTestCase) return null;
    
    // Extract status from properties
    const statusProp = qtestTestCase.properties?.find((p: any) => 
      ['Status', 'status'].includes(p.field_name)
    );
    const status = statusProp ? this.mapQTestStatusToZephyr(statusProp.field_value) : 'DRAFT';
    
    // Extract priority from properties
    const priorityProp = qtestTestCase.properties?.find((p: any) => 
      ['Priority', 'priority'].includes(p.field_name)
    );
    const priority = priorityProp ? this.mapQTestPriorityToZephyr(priorityProp.field_value) : 'MEDIUM';
    
    // Extract objective from properties
    const objectiveProp = qtestTestCase.properties?.find((p: any) => 
      ['Objective', 'objective'].includes(p.field_name)
    );
    const objective = objectiveProp ? objectiveProp.field_value : '';
    
    // Extract precondition from properties
    const preconditionProp = qtestTestCase.properties?.find((p: any) => 
      ['Precondition', 'precondition'].includes(p.field_name)
    );
    const precondition = preconditionProp ? preconditionProp.field_value : '';
    
    // Basic mapping from qTest to Zephyr structure
    const zephyrTestCase = {
      id: qtestTestCase.id,
      key: qtestTestCase.pid || `TC-${qtestTestCase.id}`,
      name: qtestTestCase.name,
      description: qtestTestCase.description || '',
      status,
      priority,
      objective,
      precondition,
      folderId: qtestTestCase.parent_id
    };
    
    // Map test steps
    if (qtestTestCase.test_steps && Array.isArray(qtestTestCase.test_steps)) {
      zephyrTestCase.steps = qtestTestCase.test_steps.map((step: any) => ({
        id: step.id,
        index: step.order,
        description: step.description || '',
        expectedResult: step.expected_result || '',
        testData: step.test_data || ''
      }));
    }
    
    // Extract custom fields from properties
    const customFields: Record<string, any> = {};
    if (qtestTestCase.properties && Array.isArray(qtestTestCase.properties)) {
      for (const prop of qtestTestCase.properties) {
        // Skip fields that we've already handled
        if (['Status', 'status', 'Priority', 'priority', 'Objective', 'objective', 'Precondition', 'precondition'].includes(prop.field_name)) {
          continue;
        }
        
        customFields[prop.field_name] = prop.field_value;
      }
    }
    
    if (Object.keys(customFields).length > 0) {
      zephyrTestCase.customFields = customFields;
    }
    
    return zephyrTestCase;
  }
  
  /**
   * Transform test cases collection from Zephyr Scale format to qTest format
   */
  private static transformTestCasesData(zephyrTestCases: any): any {
    if (!zephyrTestCases || !Array.isArray(zephyrTestCases.items || zephyrTestCases)) {
      return [];
    }
    
    const items = zephyrTestCases.items || zephyrTestCases;
    return items.map((testCase: any) => this.transformTestCaseData(testCase));
  }
  
  /**
   * Transform test cases collection from qTest format to Zephyr Scale format
   */
  private static transformTestCasesDataToZephyr(qtestTestCases: any): any {
    if (!qtestTestCases || !Array.isArray(qtestTestCases)) {
      return { items: [] };
    }
    
    return {
      items: qtestTestCases.map((testCase: any) => 
        this.transformTestCaseDataToZephyr(testCase)
      ),
      totalCount: qtestTestCases.length,
      maxResults: qtestTestCases.length
    };
  }
  
  /**
   * Transform attachments data from Zephyr Scale format to qTest format
   */
  private static transformAttachmentsData(zephyrAttachments: any): any {
    if (!zephyrAttachments || !Array.isArray(zephyrAttachments)) {
      return [];
    }
    
    return zephyrAttachments.map((attachment: any) => ({
      id: attachment.id,
      name: attachment.filename || attachment.name,
      content_type: attachment.contentType || attachment.content_type || 'application/octet-stream',
      size: attachment.fileSize || attachment.size || 0,
      created_date: attachment.createdOn || attachment.created_date,
      created_by: attachment.createdBy || attachment.created_by,
      description: attachment.comment || attachment.description || ''
    }));
  }
  
  /**
   * Transform attachments data from qTest format to Zephyr Scale format
   */
  private static transformAttachmentsDataToZephyr(qtestAttachments: any): any {
    if (!qtestAttachments || !Array.isArray(qtestAttachments)) {
      return [];
    }
    
    return qtestAttachments.map((attachment: any) => ({
      id: attachment.id,
      filename: attachment.name,
      contentType: attachment.content_type || 'application/octet-stream',
      fileSize: attachment.size || 0,
      createdOn: attachment.created_date,
      createdBy: attachment.created_by,
      comment: attachment.description || ''
    }));
  }
  
  /**
   * Transform test executions data from Zephyr Scale format to qTest format
   */
  private static transformExecutionsData(zephyrExecutions: any): any {
    if (!zephyrExecutions || !Array.isArray(zephyrExecutions.items || zephyrExecutions)) {
      return [];
    }
    
    const items = zephyrExecutions.items || zephyrExecutions;
    return items.map((execution: any) => ({
      id: execution.id,
      test_case: { id: execution.testCaseId || execution.testId },
      status: {
        name: this.mapZephyrExecutionStatusToQTest(execution.status)
      },
      note: execution.comment || execution.description || '',
      execution_date: execution.executedOn,
      executed_by: execution.executedBy,
      test_step_logs: this.transformStepResults(execution.stepResults || [])
    }));
  }
  
  /**
   * Transform test executions data from qTest format to Zephyr Scale format
   */
  private static transformExecutionsDataToZephyr(qtestExecutions: any): any {
    if (!qtestExecutions || !Array.isArray(qtestExecutions)) {
      return { items: [] };
    }
    
    return {
      items: qtestExecutions.map((execution: any) => ({
        id: execution.id,
        testId: execution.test_case?.id,
        status: this.mapQTestExecutionStatusToZephyr(execution.status?.name),
        comment: execution.note || '',
        executedOn: execution.execution_date,
        executedBy: execution.executed_by,
        stepResults: execution.test_step_logs?.map((log: any) => ({
          stepId: log.test_step_id,
          index: log.order,
          status: this.mapQTestExecutionStatusToZephyr(log.status?.name),
          actualResult: log.actual_result || '',
          comment: log.note || ''
        })) || []
      })),
      totalCount: qtestExecutions.length,
      maxResults: qtestExecutions.length
    };
  }
  
  /**
   * Transform step results from Zephyr Scale format to qTest format
   */
  private static transformStepResults(zephyrStepResults: any[]): any[] {
    if (!zephyrStepResults || !Array.isArray(zephyrStepResults)) {
      return [];
    }
    
    return zephyrStepResults.map((result: any) => ({
      test_step_id: result.stepId,
      order: result.index || 0,
      status: {
        name: this.mapZephyrExecutionStatusToQTest(result.status)
      },
      actual_result: result.actualResult || '',
      note: result.comment || ''
    }));
  }
  
  /**
   * Map Zephyr Scale status to qTest status
   */
  private static mapZephyrStatusToQTest(zephyrStatus: string): string {
    const statusMap: Record<string, string> = {
      'DRAFT': '1',
      'READY': '5',
      'APPROVED': '3',
      'DEPRECATED': '6',
      'OBSOLETE': '6',
      'ARCHIVED': '6'
    };
    
    return statusMap[zephyrStatus] || '1';
  }
  
  /**
   * Map qTest status to Zephyr Scale status
   */
  private static mapQTestStatusToZephyr(qtestStatus: string): string {
    const statusMap: Record<string, string> = {
      '1': 'DRAFT',
      '2': 'READY',
      '3': 'APPROVED',
      '4': 'DRAFT',
      '5': 'READY',
      '6': 'DEPRECATED'
    };
    
    return statusMap[qtestStatus] || 'DRAFT';
  }
  
  /**
   * Map Zephyr Scale priority to qTest priority
   */
  private static mapZephyrPriorityToQTest(zephyrPriority: string): string {
    const priorityMap: Record<string, string> = {
      'LOW': '4',
      'MEDIUM': '3',
      'HIGH': '2',
      'CRITICAL': '1',
      'HIGHEST': '1'
    };
    
    return priorityMap[zephyrPriority] || '3';
  }
  
  /**
   * Map qTest priority to Zephyr Scale priority
   */
  private static mapQTestPriorityToZephyr(qtestPriority: string): string {
    const priorityMap: Record<string, string> = {
      '1': 'CRITICAL',
      '2': 'HIGH',
      '3': 'MEDIUM',
      '4': 'LOW'
    };
    
    return priorityMap[qtestPriority] || 'MEDIUM';
  }
  
  /**
   * Map Zephyr Scale execution status to qTest execution status
   */
  private static mapZephyrExecutionStatusToQTest(zephyrStatus: string): string {
    const statusMap: Record<string, string> = {
      'PASS': 'PASSED',
      'PASSED': 'PASSED',
      'FAIL': 'FAILED',
      'FAILED': 'FAILED',
      'BLOCK': 'BLOCKED',
      'BLOCKED': 'BLOCKED',
      'NOT_EXECUTED': 'NOT_EXECUTED',
      'UNEXECUTED': 'NOT_EXECUTED',
      'IN_PROGRESS': 'INCOMPLETE',
      'SKIP': 'SKIPPED',
      'SKIPPED': 'SKIPPED'
    };
    
    return statusMap[zephyrStatus] || 'NOT_EXECUTED';
  }
  
  /**
   * Map qTest execution status to Zephyr Scale execution status
   */
  private static mapQTestExecutionStatusToZephyr(qtestStatus: string): string {
    const statusMap: Record<string, string> = {
      'PASSED': 'PASS',
      'FAILED': 'FAIL',
      'BLOCKED': 'BLOCK',
      'NOT_EXECUTED': 'NOT_EXECUTED',
      'INCOMPLETE': 'IN_PROGRESS',
      'SKIPPED': 'SKIP'
    };
    
    return statusMap[qtestStatus] || 'NOT_EXECUTED';
  }
}