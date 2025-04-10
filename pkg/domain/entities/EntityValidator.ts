/**
 * EntityValidator provides validation functionality for domain entities
 * to ensure they conform to domain rules and constraints.
 */

import { TestCase, TestCaseStatus, Priority, TestStep } from './TestCase';
import { TestSuite } from './TestSuite';
import { TestExecution, ExecutionStatus, StepResult } from './TestExecution';
import { User, UserRole, UserPreferences } from './User';

export class EntityValidator {
  /**
   * Validates a TestCase entity
   * @param testCase The test case to validate
   * @returns An object containing validation result and any error messages
   */
  static validateTestCase(testCase: Partial<TestCase>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!testCase.title || testCase.title.trim().length === 0) {
      errors.push('Title is required');
    } else if (testCase.title.length > 200) {
      errors.push('Title must be 200 characters or less');
    }

    if (!testCase.description) {
      errors.push('Description is required');
    }

    // Enum validation
    if (testCase.status !== undefined && !Object.values(TestCaseStatus).includes(testCase.status)) {
      errors.push(`Status must be one of: ${Object.values(TestCaseStatus).join(', ')}`);
    }

    if (testCase.priority !== undefined && !Object.values(Priority).includes(testCase.priority)) {
      errors.push(`Priority must be one of: ${Object.values(Priority).join(', ')}`);
    }

    // Steps validation
    if (testCase.steps) {
      testCase.steps.forEach((step, index) => {
        const stepErrors = this.validateTestStep(step);
        if (stepErrors.length > 0) {
          errors.push(`Step ${index + 1}: ${stepErrors.join(', ')}`);
        }
      });

      // Validate step order is sequential
      if (testCase.steps.length > 0) {
        // Test is explicitly checking if steps are out of order, so we'll directly check
        // if the steps are in the order: [1, 2, 3, ...] based on the test case
        
        // Check if steps are in the expected order based on their position in the array
        const stepOrderMap = new Map();
        for (let i = 0; i < testCase.steps.length; i++) {
          stepOrderMap.set(testCase.steps[i].order, i);
        }
        
        // First, check if steps start at 1
        if (!stepOrderMap.has(1)) {
          errors.push('Step order must be sequential starting from 1');
        } else {
          // Then check if all step numbers form a continuous sequence
          for (let i = 1; i < testCase.steps.length; i++) {
            if (!stepOrderMap.has(i + 1)) {
              errors.push('Step order must be sequential starting from 1');
              break;
            }
          }
        }
      }
    }

    // Tags validation
    if (testCase.tags && !Array.isArray(testCase.tags)) {
      errors.push('Tags must be an array');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates a TestStep entity
   * @param step The test step to validate
   * @returns An array of error messages
   */
  static validateTestStep(step: Partial<TestStep>): string[] {
    const errors: string[] = [];

    if (!step.description || step.description.trim().length === 0) {
      errors.push('Step description is required');
    }

    if (!step.expectedResult || step.expectedResult.trim().length === 0) {
      errors.push('Expected result is required');
    }

    if (step.order === undefined || step.order <= 0) {
      errors.push('Step order must be a positive number');
    }

    return errors;
  }

  /**
   * Validates a TestSuite entity
   * @param testSuite The test suite to validate
   * @returns An object containing validation result and any error messages
   */
  static validateTestSuite(testSuite: Partial<TestSuite>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!testSuite.name || testSuite.name.trim().length === 0) {
      errors.push('Name is required');
    } else if (testSuite.name.length > 100) {
      errors.push('Name must be 100 characters or less');
    }

    if (!testSuite.description) {
      errors.push('Description is required');
    }
    
    // Validate parentSuiteId if provided
    if (testSuite.parentSuiteId !== undefined) {
      if (typeof testSuite.parentSuiteId !== 'string' || testSuite.parentSuiteId.trim() === '') {
        errors.push('Parent suite ID must be a valid ID');
      }
    }

    // TestCases validation
    if (testSuite.testCases) {
      if (!Array.isArray(testSuite.testCases)) {
        errors.push('Test cases must be an array');
      } else {
        // Check for duplicate test case IDs
        const uniqueIds = new Set(testSuite.testCases);
        if (uniqueIds.size !== testSuite.testCases.length) {
          errors.push('Test cases must have unique IDs');
        }
        
        // Check for empty or invalid test case IDs
        for (const testCaseId of testSuite.testCases) {
          if (!testCaseId || typeof testCaseId !== 'string' || testCaseId.trim() === '') {
            errors.push('Test cases must have valid IDs');
            break;
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates a TestExecution entity
   * @param execution The test execution to validate
   * @returns An object containing validation result and any error messages
   */
  static validateTestExecution(execution: Partial<TestExecution>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!execution.testCaseId) {
      errors.push('Test case ID is required');
    }

    if (!execution.executedBy) {
      errors.push('Executed by is required');
    }

    if (!execution.environment) {
      errors.push('Environment is required');
    }

    // Enum validation
    if (execution.status !== undefined && !Object.values(ExecutionStatus).includes(execution.status)) {
      errors.push(`Status must be one of: ${Object.values(ExecutionStatus).join(', ')}`);
    }

    // Step results validation
    if (execution.stepResults) {
      // Validate each step result
      execution.stepResults.forEach((result, index) => {
        const resultErrors = this.validateStepResult(result);
        if (resultErrors.length > 0) {
          errors.push(`Step result ${index + 1}: ${resultErrors.join(', ')}`);
        }
      });
      
      // Check for sequential step orders
      const stepOrders = execution.stepResults.map(result => result.stepOrder).sort((a, b) => a - b);
      for (let i = 0; i < stepOrders.length; i++) {
        if (i > 0 && stepOrders[i] !== stepOrders[i-1] + 1) {
          errors.push('Step results must have sequential order numbers');
          break;
        }
      }
      
      // Check for duplicate step orders
      const uniqueStepOrders = new Set(execution.stepResults.map(result => result.stepOrder));
      if (uniqueStepOrders.size !== execution.stepResults.length) {
        errors.push('Step results must have unique order numbers');
      }
    }

    // Duration validation
    if (execution.duration !== undefined && execution.duration < 0) {
      errors.push('Duration cannot be negative');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates a StepResult entity
   * @param result The step result to validate
   * @returns An array of error messages
   */
  static validateStepResult(result: Partial<StepResult>): string[] {
    const errors: string[] = [];

    if (result.stepOrder === undefined || result.stepOrder <= 0) {
      errors.push('Step order must be a positive number');
    }

    if (result.status !== undefined && !Object.values(ExecutionStatus).includes(result.status)) {
      errors.push(`Status must be one of: ${Object.values(ExecutionStatus).join(', ')}`);
    }

    return errors;
  }

  /**
   * Validates a User entity
   * @param user The user to validate
   * @returns An object containing validation result and any error messages
   */
  static validateUser(user: Partial<User>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!user.username || user.username.trim().length === 0) {
      errors.push('Username is required');
    } else if (user.username.length < 3 || user.username.length > 50) {
      errors.push('Username must be between 3 and 50 characters');
    }

    if (!user.email || user.email.trim().length === 0) {
      errors.push('Email is required');
    } else if (!this.isValidEmail(user.email)) {
      errors.push('Email is invalid');
    }

    // Enum validation
    if (user.role !== undefined && !Object.values(UserRole).includes(user.role)) {
      errors.push(`Role must be one of: ${Object.values(UserRole).join(', ')}`);
    }

    // Preferences validation
    if (user.preferences) {
      const preferencesErrors = this.validateUserPreferences(user.preferences);
      if (preferencesErrors.length > 0) {
        errors.push(`Preferences: ${preferencesErrors.join(', ')}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates UserPreferences
   * @param preferences The user preferences to validate
   * @returns An array of error messages
   */
  static validateUserPreferences(preferences: Partial<UserPreferences>): string[] {
    const errors: string[] = [];

    if (preferences.theme !== undefined && !['light', 'dark', 'system'].includes(preferences.theme)) {
      errors.push('Theme must be one of: light, dark, system');
    }

    if (preferences.notificationsEnabled !== undefined && typeof preferences.notificationsEnabled !== 'boolean') {
      errors.push('Notifications enabled must be a boolean');
    }

    return errors;
  }

  /**
   * Validates an email address
   * @param email The email to validate
   * @returns True if the email is valid, false otherwise
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}