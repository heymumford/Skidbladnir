/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { TestCase } from '../../domain/entities/TestCase';
import { LoggerService } from '../../domain/services/LoggerService';
import { SourceProvider, TargetProvider } from '../../../packages/common/src/interfaces/provider';
import { ProviderField } from './MigrateTestCases';

/**
 * Validation level for migration validation
 */
export enum ValidationLevel {
  STRICT = 'strict',     // All validations must pass
  LENIENT = 'lenient',   // Required field validations must pass
  NONE = 'none'          // No validation performed
}

/**
 * Input for migration validation
 */
export interface MigrationValidationInput {
  sourceSystem: string;
  targetSystem: string;
  testCases: TestCase[];
  validateAttachments?: boolean;
  validateHistory?: boolean;
  fieldMappings?: Record<string, string>;
  validationLevel?: ValidationLevel;
}

/**
 * Result of migration validation
 */
export interface MigrationValidationResult {
  valid: boolean;
  sourceSystem: string;
  targetSystem: string;
  validatedCount: number;
  validCount: number;
  invalidCount: number;
  warnings: ValidationMessage[];
  errors: ValidationMessage[];
  testCaseResults: TestCaseValidationResult[];
  fieldCompatibility: FieldCompatibilityResult[];
}

/**
 * Validation result for a single test case
 */
export interface TestCaseValidationResult {
  testCaseId: string;
  testCaseName: string;
  valid: boolean;
  errors: ValidationMessage[];
  warnings: ValidationMessage[];
}

/**
 * Field compatibility result
 */
export interface FieldCompatibilityResult {
  sourceField: string;
  targetField: string;
  compatible: boolean;
  requiredInTarget: boolean;
  presentInSource: boolean;
  dataTypeCompatible: boolean;
  valueRangeCompatible: boolean;
  needsTransformation: boolean;
  message?: string;
}

/**
 * Validation message
 */
export interface ValidationMessage {
  code: string;
  message: string;
  field?: string;
  testCaseId?: string;
  severity: 'error' | 'warning';
  details?: Record<string, any>;
}

/**
 * Cross-provider migration validator
 * 
 * This class validates the compatibility of test cases between different 
 * provider systems and identifies potential migration issues.
 */
export class MigrationValidator {
  private logger: LoggerService;
  
  constructor(
    private readonly sourceProvider: SourceProvider,
    private readonly targetProvider: TargetProvider,
    loggerService?: LoggerService
  ) {
    this.logger = loggerService || {
      debug: console.debug,
      info: console.info,
      warn: console.warn,
      error: console.error,
      child: () => this.logger
    };
  }
  
  /**
   * Validate a migration between providers
   * 
   * This method performs various compatibility checks between source and target
   * systems to identify potential issues with migration.
   */
  async validateMigration(input: MigrationValidationInput): Promise<MigrationValidationResult> {
    this.logger.info(`Validating migration from ${input.sourceSystem} to ${input.targetSystem}`);
    
    // Initialize validation result
    const result: MigrationValidationResult = {
      valid: true,
      sourceSystem: input.sourceSystem,
      targetSystem: input.targetSystem,
      validatedCount: input.testCases.length,
      validCount: 0,
      invalidCount: 0,
      warnings: [],
      errors: [],
      testCaseResults: [],
      fieldCompatibility: []
    };
    
    // Skip validation if level is NONE
    if (input.validationLevel === ValidationLevel.NONE) {
      this.logger.info('Validation level set to NONE, skipping validation');
      result.warnings.push({
        code: 'VALIDATION_SKIPPED',
        message: 'Validation skipped due to validation level set to NONE',
        severity: 'warning'
      });
      
      // Mark all test cases as valid
      result.validCount = input.testCases.length;
      result.testCaseResults = input.testCases.map(tc => ({
        testCaseId: tc.id.toString(),
        testCaseName: tc.name || '',
        valid: true,
        errors: [],
        warnings: [{
          code: 'VALIDATION_SKIPPED',
          message: 'Test case validation skipped',
          testCaseId: tc.id.toString(),
          severity: 'warning'
        }]
      }));
      
      return result;
    }
    
    try {
      // Get and validate field compatibility
      const fieldCompatibility = await this.validateFieldCompatibility(input);
      result.fieldCompatibility = fieldCompatibility;
      
      // Identify missing required fields in target
      const missingRequiredFields = fieldCompatibility.filter(f => 
        f.requiredInTarget && !f.presentInSource
      );
      
      if (missingRequiredFields.length > 0) {
        result.valid = false;
        
        missingRequiredFields.forEach(field => {
          result.errors.push({
            code: 'MISSING_REQUIRED_FIELD',
            message: `Required field '${field.targetField}' in target system has no source field mapping`,
            field: field.targetField,
            severity: 'error',
            details: { field }
          });
        });
      }
      
      // Identify incompatible data types
      const incompatibleFields = fieldCompatibility.filter(f =>
        f.presentInSource && !f.dataTypeCompatible
      );
      
      incompatibleFields.forEach(field => {
        const message: ValidationMessage = {
          code: 'INCOMPATIBLE_FIELD_TYPE',
          message: `Field '${field.sourceField}' mapping to '${field.targetField}' has incompatible data type`,
          field: field.sourceField,
          severity: input.validationLevel === ValidationLevel.STRICT ? 'error' : 'warning',
          details: { field }
        };
        
        if (input.validationLevel === ValidationLevel.STRICT) {
          result.valid = false;
          result.errors.push(message);
        } else {
          result.warnings.push(message);
        }
      });
      
      // Validate individual test cases
      const testCaseResults = await Promise.all(input.testCases.map(tc => 
        this.validateTestCase(tc, input, fieldCompatibility)
      ));
      
      result.testCaseResults = testCaseResults;
      
      // Count valid and invalid test cases
      result.validCount = testCaseResults.filter(r => r.valid).length;
      result.invalidCount = testCaseResults.filter(r => !r.valid).length;
      
      // Check if any test cases are invalid
      if (result.invalidCount > 0) {
        result.valid = false;
        
        // Add summary error
        result.errors.push({
          code: 'INVALID_TEST_CASES',
          message: `${result.invalidCount} of ${result.validatedCount} test cases have validation errors`,
          severity: 'error',
          details: { invalidCount: result.invalidCount, totalCount: result.validatedCount }
        });
      }
      
      // Validate provider capabilities
      const capabilityResults = await this.validateProviderCapabilities(
        input.sourceSystem,
        input.targetSystem,
        input.validateAttachments,
        input.validateHistory
      );
      
      // Add capability errors and warnings to result
      result.errors = [...result.errors, ...capabilityResults.filter(r => r.severity === 'error')];
      result.warnings = [...result.warnings, ...capabilityResults.filter(r => r.severity === 'warning')];
      
      // Update valid flag if there are any capability errors
      if (capabilityResults.some(r => r.severity === 'error')) {
        result.valid = false;
      }
      
      return result;
    } catch (error) {
      this.logger.error(`Migration validation failed: ${error instanceof Error ? error.message : String(error)}`);
      
      // Return failed validation result
      return {
        valid: false,
        sourceSystem: input.sourceSystem,
        targetSystem: input.targetSystem,
        validatedCount: input.testCases.length,
        validCount: 0,
        invalidCount: input.testCases.length,
        warnings: [],
        errors: [{
          code: 'VALIDATION_FAILED',
          message: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
          severity: 'error',
          details: { error }
        }],
        testCaseResults: [],
        fieldCompatibility: []
      };
    }
  }
  
  /**
   * Validate field compatibility between source and target systems
   */
  private async validateFieldCompatibility(
    input: MigrationValidationInput
  ): Promise<FieldCompatibilityResult[]> {
    try {
      // Get field metadata from both providers
      const sourceFields = await this.getSourceFields();
      const targetFields = await this.getTargetFields();
      
      // Check if field mappings are provided, if not create default mappings
      const fieldMappings = input.fieldMappings || this.createDefaultFieldMappings(sourceFields, targetFields);
      
      // Create a result for each mapping
      const results: FieldCompatibilityResult[] = [];
      
      // Process each target field
      for (const targetField of targetFields) {
        // Find source field that maps to this target field
        const sourceFieldName = Object.entries(fieldMappings)
          .find(([_src, tgt]) => tgt === targetField.id)?.[0];
        
        const sourceField = sourceFieldName ? 
          sourceFields.find(f => f.id === sourceFieldName) : 
          undefined;
        
        // Check compatibility
        const isRequired = targetField.required;
        const isPresent = !!sourceField;
        
        // Data type compatibility (simple version)
        const isTypeCompatible = !isPresent ? false : this.areTypesCompatible(
          sourceField.type,
          targetField.type
        );
        
        // Value range compatibility (for enums)
        const isValueRangeCompatible = !isPresent ? false : 
          this.areValueRangesCompatible(sourceField, targetField);
        
        // Determine if transformation needed
        const needsTransformation = isPresent && (
          !isTypeCompatible || 
          !isValueRangeCompatible ||
          (sourceField.type !== targetField.type)
        );
        
        // Generate result message
        let message = '';
        if (isRequired && !isPresent) {
          message = `Required target field '${targetField.id}' has no source mapping`;
        } else if (isPresent && !isTypeCompatible) {
          message = `Source field '${sourceField.id}' type '${sourceField.type}' is not compatible with target field '${targetField.id}' type '${targetField.type}'`;
        } else if (isPresent && !isValueRangeCompatible) {
          message = `Source field '${sourceField.id}' allowed values are not fully compatible with target field '${targetField.id}' allowed values`;
        } else if (needsTransformation) {
          message = `Field mapping from '${sourceField.id}' to '${targetField.id}' requires transformation`;
        }
        
        // Add result
        results.push({
          sourceField: sourceFieldName || '',
          targetField: targetField.id,
          compatible: (isPresent && isTypeCompatible) || !isRequired,
          requiredInTarget: isRequired,
          presentInSource: isPresent,
          dataTypeCompatible: isTypeCompatible,
          valueRangeCompatible: isValueRangeCompatible,
          needsTransformation,
          message: message || undefined
        });
      }
      
      // Also check for source fields that don't map to any target field
      for (const sourceField of sourceFields) {
        const targetFieldName = fieldMappings[sourceField.id];
        if (!targetFieldName) {
          results.push({
            sourceField: sourceField.id,
            targetField: '',
            compatible: true, // It's compatible because it's just unmapped, not incompatible
            requiredInTarget: false,
            presentInSource: true,
            dataTypeCompatible: false,
            valueRangeCompatible: false,
            needsTransformation: false,
            message: `Source field '${sourceField.id}' is not mapped to any target field`
          });
        }
      }
      
      return results;
    } catch (error) {
      this.logger.error(`Failed to validate field compatibility: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * Validate an individual test case
   */
  private async validateTestCase(
    testCase: TestCase,
    input: MigrationValidationInput,
    fieldCompatibility: FieldCompatibilityResult[]
  ): Promise<TestCaseValidationResult> {
    this.logger.debug(`Validating test case ${testCase.id.toString()}: ${testCase.name || 'Unnamed'}`);
    
    const result: TestCaseValidationResult = {
      testCaseId: testCase.id.toString(),
      testCaseName: testCase.name || '',
      valid: true,
      errors: [],
      warnings: []
    };
    
    // Create field mappings if not provided
    const fieldMappings = input.fieldMappings || {};
    
    // Check for missing required fields in this test case
    const missingRequiredFields = fieldCompatibility.filter(f => 
      f.requiredInTarget && 
      (!testCase[f.sourceField as keyof TestCase] && f.sourceField)
    );
    
    if (missingRequiredFields.length > 0) {
      result.valid = false;
      
      missingRequiredFields.forEach(field => {
        result.errors.push({
          code: 'MISSING_REQUIRED_VALUE',
          message: `Test case is missing required value for field '${field.targetField}'`,
          field: field.sourceField,
          testCaseId: testCase.id.toString(),
          severity: 'error',
          details: { field }
        });
      });
    }
    
    // Check for test steps if present
    if (testCase.steps) {
      // Validate that target supports test steps
      const targetSupportsSteps = await this.targetSupportsTestSteps();
      
      if (!targetSupportsSteps && testCase.steps.length > 0) {
        result.warnings.push({
          code: 'STEPS_NOT_SUPPORTED',
          message: 'Target system does not support test steps, but test case has steps defined',
          testCaseId: testCase.id.toString(),
          severity: 'warning',
          details: { stepCount: testCase.steps.length }
        });
      }
      
      // Validate test step structure if supported
      if (targetSupportsSteps) {
        for (let i = 0; i < testCase.steps.length; i++) {
          const step = testCase.steps[i];
          
          // Check for empty steps
          if (!step.action && !step.expected) {
            result.warnings.push({
              code: 'EMPTY_TEST_STEP',
              message: `Test step ${i + 1} is empty (no action or expected result)`,
              testCaseId: testCase.id.toString(),
              severity: 'warning',
              details: { stepIndex: i }
            });
          }
        }
      }
    }
    
    // Check attachments if requested
    if (input.validateAttachments && testCase.attachments && testCase.attachments.length > 0) {
      const attachmentValidations = await this.validateAttachments(
        testCase.id.toString(),
        testCase.attachments,
        input.validationLevel === ValidationLevel.STRICT
      );
      
      // Add attachment validation messages
      attachmentValidations.forEach(validation => {
        if (validation.severity === 'error') {
          result.valid = false;
          result.errors.push(validation);
        } else {
          result.warnings.push(validation);
        }
      });
    }
    
    // Check history if requested
    if (input.validateHistory && testCase.history && testCase.history.length > 0) {
      const historyValidations = await this.validateHistory(
        testCase.id.toString(),
        testCase.history,
        input.validationLevel === ValidationLevel.STRICT
      );
      
      // Add history validation messages
      historyValidations.forEach(validation => {
        if (validation.severity === 'error') {
          result.valid = false;
          result.errors.push(validation);
        } else {
          result.warnings.push(validation);
        }
      });
    }
    
    // Validate field values meet target constraints
    const fieldValidations = await this.validateFieldValues(
      testCase,
      input.validationLevel === ValidationLevel.STRICT
    );
    
    // Add field validation messages
    fieldValidations.forEach(validation => {
      if (validation.severity === 'error') {
        result.valid = false;
        result.errors.push(validation);
      } else {
        result.warnings.push(validation);
      }
    });
    
    return result;
  }
  
  /**
   * Validate provider capabilities
   */
  private async validateProviderCapabilities(
    sourceSystem: string,
    targetSystem: string,
    validateAttachments?: boolean,
    validateHistory?: boolean
  ): Promise<ValidationMessage[]> {
    const messages: ValidationMessage[] = [];
    
    try {
      // Check if providers support capabilities API
      if (
        (this.sourceProvider as any).getCapabilities && 
        (this.targetProvider as any).getCapabilities
      ) {
        const sourceCapabilities = await (this.sourceProvider as any).getCapabilities();
        const targetCapabilities = await (this.targetProvider as any).getCapabilities();
        
        // Check attachment support
        if (validateAttachments) {
          if (!sourceCapabilities.features.attachments) {
            messages.push({
              code: 'SOURCE_NO_ATTACHMENTS',
              message: `Source provider ${sourceSystem} does not support attachments`,
              severity: 'error'
            });
          }
          
          if (!targetCapabilities.features.attachments) {
            messages.push({
              code: 'TARGET_NO_ATTACHMENTS',
              message: `Target provider ${targetSystem} does not support attachments`,
              severity: 'error'
            });
          }
          
          // Check attachment size limits
          if (sourceCapabilities.features.attachments && targetCapabilities.features.attachments) {
            if (targetCapabilities.limits.maxAttachmentSize < sourceCapabilities.limits.maxAttachmentSize) {
              messages.push({
                code: 'ATTACHMENT_SIZE_LIMIT',
                message: `Target provider has smaller attachment size limit (${targetCapabilities.limits.maxAttachmentSize} bytes) than source provider (${sourceCapabilities.limits.maxAttachmentSize} bytes)`,
                severity: 'warning',
                details: {
                  sourceSizeLimit: sourceCapabilities.limits.maxAttachmentSize,
                  targetSizeLimit: targetCapabilities.limits.maxAttachmentSize
                }
              });
            }
            
            // Check attachment format support
            if (targetCapabilities.formats.supportedAttachmentTypes.length > 0) {
              if (sourceCapabilities.formats.supportedAttachmentTypes.length > 0) {
                const unsupportedFormats = sourceCapabilities.formats.supportedAttachmentTypes.filter(
                  (format: string) => !targetCapabilities.formats.supportedAttachmentTypes.includes(format)
                );
                
                if (unsupportedFormats.length > 0) {
                  messages.push({
                    code: 'UNSUPPORTED_ATTACHMENT_FORMATS',
                    message: `Target provider does not support some attachment formats from source: ${unsupportedFormats.join(', ')}`,
                    severity: 'warning',
                    details: { unsupportedFormats }
                  });
                }
              }
            }
          }
        }
        
        // Check history support
        if (validateHistory) {
          if (!sourceCapabilities.features.history) {
            messages.push({
              code: 'SOURCE_NO_HISTORY',
              message: `Source provider ${sourceSystem} does not support history`,
              severity: 'error'
            });
          }
          
          if (!targetCapabilities.features.history) {
            messages.push({
              code: 'TARGET_NO_HISTORY',
              message: `Target provider ${targetSystem} does not support history`,
              severity: 'error'
            });
          }
        }
        
        // Check test steps support
        if (!targetCapabilities.features.testSteps) {
          messages.push({
            code: 'TARGET_NO_TEST_STEPS',
            message: `Target provider ${targetSystem} does not support test steps`,
            severity: 'warning'
          });
        }
        
        // Check custom fields support
        if (sourceCapabilities.features.customFields && !targetCapabilities.features.customFields) {
          messages.push({
            code: 'TARGET_NO_CUSTOM_FIELDS',
            message: `Source provider supports custom fields but target provider ${targetSystem} does not`,
            severity: 'warning'
          });
        }
        
        // Check batch size limits
        if (targetCapabilities.limits.maxBatchSize < sourceCapabilities.limits.maxBatchSize) {
          messages.push({
            code: 'BATCH_SIZE_LIMIT',
            message: `Target provider has smaller batch size limit (${targetCapabilities.limits.maxBatchSize}) than source provider (${sourceCapabilities.limits.maxBatchSize})`,
            severity: 'warning',
            details: {
              sourceBatchSize: sourceCapabilities.limits.maxBatchSize,
              targetBatchSize: targetCapabilities.limits.maxBatchSize
            }
          });
        }
        
        // Rate limit information
        if (
          targetCapabilities.limits.rateLimit && 
          sourceCapabilities.limits.rateLimit &&
          targetCapabilities.limits.rateLimit.requestsPerMinute < sourceCapabilities.limits.rateLimit.requestsPerMinute
        ) {
          messages.push({
            code: 'RATE_LIMIT_CONSTRAINT',
            message: `Target provider has more restrictive rate limits (${targetCapabilities.limits.rateLimit.requestsPerMinute} req/min) than source provider (${sourceCapabilities.limits.rateLimit.requestsPerMinute} req/min)`,
            severity: 'warning',
            details: {
              sourceRateLimit: sourceCapabilities.limits.rateLimit,
              targetRateLimit: targetCapabilities.limits.rateLimit
            }
          });
        }
      } else {
        // Fallback to basic capability checks
        
        // Check attachment support
        if (validateAttachments) {
          const sourceSupportsAttachments = 'getTestCaseAttachments' in this.sourceProvider;
          const targetSupportsAttachments = 'addTestCaseAttachment' in this.targetProvider;
          
          if (!sourceSupportsAttachments) {
            messages.push({
              code: 'SOURCE_NO_ATTACHMENTS',
              message: `Source provider ${sourceSystem} does not support attachments`,
              severity: 'error'
            });
          }
          
          if (!targetSupportsAttachments) {
            messages.push({
              code: 'TARGET_NO_ATTACHMENTS',
              message: `Target provider ${targetSystem} does not support attachments`,
              severity: 'error'
            });
          }
        }
        
        // Check history support
        if (validateHistory) {
          const sourceSupportsHistory = 'getTestCaseHistory' in this.sourceProvider;
          const targetSupportsHistory = 'addTestCaseHistory' in this.targetProvider;
          
          if (!sourceSupportsHistory) {
            messages.push({
              code: 'SOURCE_NO_HISTORY',
              message: `Source provider ${sourceSystem} does not support history`,
              severity: 'error'
            });
          }
          
          if (!targetSupportsHistory) {
            messages.push({
              code: 'TARGET_NO_HISTORY',
              message: `Target provider ${targetSystem} does not support history`,
              severity: 'error'
            });
          }
        }
      }
    } catch (error) {
      this.logger.warn(`Error checking provider capabilities: ${error instanceof Error ? error.message : String(error)}`);
      
      messages.push({
        code: 'CAPABILITY_CHECK_FAILED',
        message: `Failed to check provider capabilities: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'warning',
        details: { error }
      });
    }
    
    return messages;
  }
  
  /**
   * Validate attachments against target provider capabilities
   */
  private async validateAttachments(
    testCaseId: string,
    attachments: any[],
    isStrict: boolean
  ): Promise<ValidationMessage[]> {
    const messages: ValidationMessage[] = [];
    
    try {
      // Get target provider capabilities for attachments
      const targetSupportsAttachments = 'addTestCaseAttachment' in this.targetProvider;
      
      if (!targetSupportsAttachments) {
        messages.push({
          code: 'ATTACHMENTS_NOT_SUPPORTED',
          message: 'Target provider does not support attachments',
          testCaseId,
          severity: isStrict ? 'error' : 'warning'
        });
        return messages;
      }
      
      // Get detailed capabilities if available
      let maxSize = Number.MAX_SAFE_INTEGER;
      let supportedTypes: string[] = [];
      
      if ((this.targetProvider as any).getCapabilities) {
        const capabilities = await (this.targetProvider as any).getCapabilities();
        
        if (capabilities.limits && capabilities.limits.maxAttachmentSize) {
          maxSize = capabilities.limits.maxAttachmentSize;
        }
        
        if (capabilities.formats && capabilities.formats.supportedAttachmentTypes) {
          supportedTypes = capabilities.formats.supportedAttachmentTypes;
        }
      }
      
      // Validate each attachment
      for (let i = 0; i < attachments.length; i++) {
        const attachment = attachments[i];
        
        // Check attachment size
        if (attachment.size > maxSize) {
          messages.push({
            code: 'ATTACHMENT_TOO_LARGE',
            message: `Attachment '${attachment.name}' size (${attachment.size} bytes) exceeds target provider limit (${maxSize} bytes)`,
            testCaseId,
            severity: isStrict ? 'error' : 'warning',
            details: {
              attachmentIndex: i,
              attachmentName: attachment.name,
              attachmentSize: attachment.size,
              maxSize
            }
          });
        }
        
        // Check attachment type if restrictions exist
        if (supportedTypes.length > 0) {
          const contentType = attachment.contentType || '';
          const isSupported = supportedTypes.some(type => 
            contentType.startsWith(type) || 
            type === '*/*' || 
            (type.endsWith('/*') && contentType.startsWith(type.replace('/*', '/')))
          );
          
          if (!isSupported) {
            messages.push({
              code: 'UNSUPPORTED_ATTACHMENT_TYPE',
              message: `Attachment '${attachment.name}' content type '${contentType}' is not supported by target provider`,
              testCaseId,
              severity: isStrict ? 'error' : 'warning',
              details: {
                attachmentIndex: i,
                attachmentName: attachment.name,
                contentType,
                supportedTypes
              }
            });
          }
        }
      }
    } catch (error) {
      this.logger.warn(`Error validating attachments: ${error instanceof Error ? error.message : String(error)}`);
      
      messages.push({
        code: 'ATTACHMENT_VALIDATION_FAILED',
        message: `Failed to validate attachments: ${error instanceof Error ? error.message : String(error)}`,
        testCaseId,
        severity: 'warning',
        details: { error }
      });
    }
    
    return messages;
  }
  
  /**
   * Validate history against target provider capabilities
   */
  private async validateHistory(
    testCaseId: string,
    history: any[],
    isStrict: boolean
  ): Promise<ValidationMessage[]> {
    const messages: ValidationMessage[] = [];
    
    try {
      // Check if target provider supports history
      const targetSupportsHistory = 'addTestCaseHistory' in this.targetProvider;
      
      if (!targetSupportsHistory) {
        messages.push({
          code: 'HISTORY_NOT_SUPPORTED',
          message: 'Target provider does not support history',
          testCaseId,
          severity: isStrict ? 'error' : 'warning'
        });
        return messages;
      }
      
      // Nothing more to validate for history at the moment
    } catch (error) {
      this.logger.warn(`Error validating history: ${error instanceof Error ? error.message : String(error)}`);
      
      messages.push({
        code: 'HISTORY_VALIDATION_FAILED',
        message: `Failed to validate history: ${error instanceof Error ? error.message : String(error)}`,
        testCaseId,
        severity: 'warning',
        details: { error }
      });
    }
    
    return messages;
  }
  
  /**
   * Validate field values against target provider constraints
   */
  private async validateFieldValues(
    testCase: TestCase,
    isStrict: boolean
  ): Promise<ValidationMessage[]> {
    const messages: ValidationMessage[] = [];
    
    try {
      // Get target fields with constraints
      const targetFields = await this.getTargetFields();
      
      // Only validate fields that are mapped from test case properties
      const fieldsToValidate = targetFields.filter(field => {
        // Check if there's a corresponding property in the test case
        const testCaseKeys = Object.keys(testCase);
        return testCaseKeys.includes(field.id) || 
               (testCase.customFields && Object.keys(testCase.customFields).includes(field.id));
      });
      
      // Validate each field
      for (const field of fieldsToValidate) {
        let value;
        
        // Get value from test case
        if (field.id in testCase) {
          value = (testCase as any)[field.id];
        } else if (testCase.customFields && field.id in testCase.customFields) {
          value = testCase.customFields[field.id];
        } else {
          continue; // Skip fields that don't exist in test case
        }
        
        // Skip null/undefined values
        if (value === null || value === undefined) {
          continue;
        }
        
        // Validate string length
        if (field.type === 'string' && field.maxLength && typeof value === 'string') {
          if (value.length > field.maxLength) {
            messages.push({
              code: 'STRING_TOO_LONG',
              message: `Field '${field.id}' value exceeds maximum length of ${field.maxLength} characters`,
              field: field.id,
              testCaseId: testCase.id.toString(),
              severity: isStrict ? 'error' : 'warning',
              details: {
                fieldId: field.id,
                valueLength: value.length,
                maxLength: field.maxLength
              }
            });
          }
        }
        
        // Validate enum values
        if (field.allowedValues && field.allowedValues.length > 0) {
          if (!field.allowedValues.includes(String(value))) {
            messages.push({
              code: 'INVALID_ENUM_VALUE',
              message: `Field '${field.id}' value '${value}' is not in allowed values: ${field.allowedValues.join(', ')}`,
              field: field.id,
              testCaseId: testCase.id.toString(),
              severity: isStrict ? 'error' : 'warning',
              details: {
                fieldId: field.id,
                value,
                allowedValues: field.allowedValues
              }
            });
          }
        }
      }
    } catch (error) {
      this.logger.warn(`Error validating field values: ${error instanceof Error ? error.message : String(error)}`);
      
      messages.push({
        code: 'FIELD_VALIDATION_FAILED',
        message: `Failed to validate field values: ${error instanceof Error ? error.message : String(error)}`,
        testCaseId: testCase.id.toString(),
        severity: 'warning',
        details: { error }
      });
    }
    
    return messages;
  }
  
  /**
   * Create default field mappings where source and target field IDs match
   */
  private createDefaultFieldMappings(
    sourceFields: ProviderField[],
    targetFields: ProviderField[]
  ): Record<string, string> {
    const mappings: Record<string, string> = {};
    
    // Map fields with the same ID
    for (const sourceField of sourceFields) {
      const matchingTargetField = targetFields.find(tf => tf.id === sourceField.id);
      if (matchingTargetField) {
        mappings[sourceField.id] = matchingTargetField.id;
      }
    }
    
    // Try to map some common fields by name if not already mapped
    const commonMappings: [string, string[]][] = [
      ['id', ['id', 'key', 'testCaseId']],
      ['name', ['name', 'title', 'summary']],
      ['description', ['description', 'content']],
      ['priority', ['priority', 'priorityId', 'priorityName']],
      ['status', ['status', 'statusId', 'statusName', 'state']],
      ['steps', ['steps', 'testSteps']]
    ];
    
    for (const [targetName, sourceNames] of commonMappings) {
      const targetField = targetFields.find(tf => tf.id === targetName);
      if (targetField && !Object.values(mappings).includes(targetField.id)) {
        // Find a source field that matches one of the source names
        for (const sourceName of sourceNames) {
          const sourceField = sourceFields.find(sf => sf.id === sourceName);
          if (sourceField && !mappings[sourceField.id]) {
            mappings[sourceField.id] = targetField.id;
            break;
          }
        }
      }
    }
    
    return mappings;
  }
  
  /**
   * Check if two field types are compatible
   */
  private areTypesCompatible(sourceType: string, targetType: string): boolean {
    // Same types are always compatible
    if (sourceType === targetType) {
      return true;
    }
    
    // Define compatibility matrix
    const compatibilityMatrix: Record<string, string[]> = {
      'string': ['string', 'text', 'enum', 'date', 'array', 'object'],
      'text': ['string', 'text'],
      'number': ['number', 'string', 'text'],
      'boolean': ['boolean', 'string', 'text', 'number'],
      'date': ['date', 'string', 'text'],
      'enum': ['enum', 'string', 'text'],
      'array': ['array', 'string', 'text'],
      'object': ['object', 'string', 'text']
    };
    
    // Check if target type is in the compatible list for source type
    return compatibilityMatrix[sourceType]?.includes(targetType) || false;
  }
  
  /**
   * Check if value ranges between fields are compatible
   */
  private areValueRangesCompatible(
    sourceField: ProviderField,
    targetField: ProviderField
  ): boolean {
    // If either field doesn't have allowed values, they're compatible
    if (!sourceField.allowedValues || !targetField.allowedValues) {
      return true;
    }
    
    // If target field has no allowed values, it can accept any value
    if (targetField.allowedValues.length === 0) {
      return true;
    }
    
    // If source field has no allowed values, we can't determine compatibility
    if (sourceField.allowedValues.length === 0) {
      return true;
    }
    
    // Check if all source values are in target allowedValues
    // This is a strict check that ensures all possible source values can be directly mapped
    // to allowed target values without transformation
    return sourceField.allowedValues?.every(value => 
      targetField.allowedValues?.includes(value) ?? false
    ) ?? true;
  }
  
  /**
   * Get field metadata from source provider
   */
  private async getSourceFields(): Promise<ProviderField[]> {
    try {
      if ((this.sourceProvider as any).getFields) {
        return await (this.sourceProvider as any).getFields();
      }
      
      // Return default fields if not available from provider
      return this.getDefaultFields();
    } catch (error) {
      this.logger.warn(`Failed to get source fields: ${error instanceof Error ? error.message : String(error)}`);
      return this.getDefaultFields();
    }
  }
  
  /**
   * Get field metadata from target provider
   */
  private async getTargetFields(): Promise<ProviderField[]> {
    try {
      if ((this.targetProvider as any).getFields) {
        return await (this.targetProvider as any).getFields();
      }
      
      // Return default fields if not available from provider
      return this.getDefaultFields();
    } catch (error) {
      this.logger.warn(`Failed to get target fields: ${error instanceof Error ? error.message : String(error)}`);
      return this.getDefaultFields();
    }
  }
  
  /**
   * Get default field metadata for providers that don't support field inspection
   */
  private getDefaultFields(): ProviderField[] {
    // Return default fields that most test management systems have
    return [
      {
        id: 'id',
        name: 'ID',
        type: 'string',
        required: true
      },
      {
        id: 'name',
        name: 'Name',
        type: 'string',
        required: true,
        maxLength: 255
      },
      {
        id: 'description',
        name: 'Description',
        type: 'string',
        required: false
      },
      {
        id: 'status',
        name: 'Status',
        type: 'string',
        required: true,
        allowedValues: ['OPEN', 'ACTIVE', 'DRAFT', 'READY', 'APPROVED', 'COMPLETED', 'ARCHIVED']
      },
      {
        id: 'priority',
        name: 'Priority',
        type: 'string',
        required: true,
        allowedValues: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'TRIVIAL']
      },
      {
        id: 'steps',
        name: 'Test Steps',
        type: 'array',
        required: false
      }
    ];
  }
  
  /**
   * Check if target provider supports test steps
   */
  private async targetSupportsTestSteps(): Promise<boolean> {
    try {
      if ((this.targetProvider as any).getCapabilities) {
        const capabilities = await (this.targetProvider as any).getCapabilities();
        return capabilities.features.testSteps || false;
      }
      
      // Assume steps are supported if we can't check
      return true;
    } catch (error) {
      this.logger.warn(`Failed to check test steps support: ${error instanceof Error ? error.message : String(error)}`);
      return true; // Assume support if we can't check
    }
  }
  
  /**
   * Validate that the migration is possible
   * 
   * This is a high-level check to determine if migration is possible at all,
   * without looking at specific test cases.
   */
  async validateMigrationPossibility(
    sourceSystem: string,
    targetSystem: string,
    includeAttachments?: boolean,
    includeHistory?: boolean
  ): Promise<{
    possible: boolean;
    errors: ValidationMessage[];
    warnings: ValidationMessage[];
  }> {
    const result = {
      possible: true,
      errors: [] as ValidationMessage[],
      warnings: [] as ValidationMessage[]
    };
    
    try {
      // Check provider capabilities
      const capabilityMessages = await this.validateProviderCapabilities(
        sourceSystem,
        targetSystem,
        includeAttachments,
        includeHistory
      );
      
      // Add capability errors and warnings
      result.errors = capabilityMessages.filter(m => m.severity === 'error');
      result.warnings = capabilityMessages.filter(m => m.severity === 'warning');
      
      // Check field compatibility
      const sourceFields = await this.getSourceFields();
      const targetFields = await this.getTargetFields();
      
      // Check for missing required fields
      const requiredTargetFields = targetFields.filter(f => f.required);
      
      // Create default mappings
      const defaultMappings = this.createDefaultFieldMappings(sourceFields, targetFields);
      
      // Check if all required target fields have a mapping
      for (const requiredField of requiredTargetFields) {
        if (!Object.values(defaultMappings).includes(requiredField.id)) {
          result.errors.push({
            code: 'MISSING_REQUIRED_FIELD_MAPPING',
            message: `Required target field '${requiredField.id}' has no default mapping from source fields`,
            field: requiredField.id,
            severity: 'error',
            details: {
              field: requiredField,
              availableSourceFields: sourceFields.map(f => f.id)
            }
          });
        }
      }
      
      // Set possible flag based on errors
      result.possible = result.errors.length === 0;
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to validate migration possibility: ${error instanceof Error ? error.message : String(error)}`);
      
      return {
        possible: false,
        errors: [{
          code: 'VALIDATION_FAILED',
          message: `Failed to validate migration possibility: ${error instanceof Error ? error.message : String(error)}`,
          severity: 'error',
          details: { error }
        }],
        warnings: []
      };
    }
  }
}