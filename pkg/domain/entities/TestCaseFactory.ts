/**
 * TestCaseFactory is responsible for creating validated TestCase entities
 */

import { TestCase, TestCaseStatus, Priority, TestStep } from './TestCase';
import { EntityValidator } from './EntityValidator';
import { Identifier } from '../value-objects/Identifier';
import { ValidationError } from '../errors/DomainErrors';

export interface CreateTestCaseProps {
  title: string;
  description: string;
  status?: TestCaseStatus;
  priority?: Priority;
  steps?: TestStep[];
  tags?: string[];
}

export class TestCaseFactory {
  /**
   * Creates a new TestCase entity after validating inputs
   * 
   * @param props Properties for the test case
   * @returns A validated TestCase entity
   * @throws ValidationError if the test case is invalid
   */
  public static create(props: CreateTestCaseProps): TestCase {
    const now = new Date();
    
    const testCase: TestCase = {
      id: Identifier.createRandom().toString(),
      title: props.title,
      description: props.description,
      status: props.status || TestCaseStatus.DRAFT,
      priority: props.priority || Priority.MEDIUM,
      steps: props.steps || [],
      tags: props.tags || [],
      createdAt: now,
      updatedAt: now
    };
    
    // Validate the test case
    const validationResult = EntityValidator.validateTestCase(testCase);
    if (!validationResult.isValid) {
      throw new ValidationError(
        'Cannot create TestCase: validation failed',
        validationResult.errors
      );
    }
    
    return testCase;
  }
  
  /**
   * Creates a test case from an existing entity, typically from storage
   * This method validates the input but assumes the ID and timestamps are already set
   * 
   * @param testCase An existing test case entity
   * @returns The validated test case
   * @throws ValidationError if the test case is invalid
   */
  public static reconstitute(testCase: TestCase): TestCase {
    // Validate the test case
    const validationResult = EntityValidator.validateTestCase(testCase);
    if (!validationResult.isValid) {
      throw new ValidationError(
        'Cannot reconstitute TestCase: validation failed',
        validationResult.errors
      );
    }
    
    return testCase;
  }
  
  /**
   * Adds a step to a test case
   * 
   * @param testCase The test case to add a step to
   * @param description The step description
   * @param expectedResult The expected result
   * @returns The updated test case
   * @throws ValidationError if the step is invalid
   */
  public static addStep(
    testCase: TestCase,
    description: string,
    expectedResult: string
  ): TestCase {
    // Create a copy of the test case
    const updatedTestCase = { ...testCase };
    
    // Create a new step
    const newStep: TestStep = {
      order: updatedTestCase.steps.length + 1,
      description,
      expectedResult
    };
    
    // Validate the step
    const stepErrors = EntityValidator.validateTestStep(newStep);
    if (stepErrors.length > 0) {
      throw new ValidationError(
        'Cannot add step: validation failed',
        stepErrors
      );
    }
    
    // Add the step to the test case
    updatedTestCase.steps = [...updatedTestCase.steps, newStep];
    updatedTestCase.updatedAt = new Date();
    
    return updatedTestCase;
  }
  
  /**
   * Updates the status of a test case
   * 
   * @param testCase The test case to update
   * @param status The new status
   * @returns The updated test case
   */
  public static updateStatus(
    testCase: TestCase,
    status: TestCaseStatus
  ): TestCase {
    // Create a copy of the test case
    const updatedTestCase = { ...testCase };
    
    // Update the status
    updatedTestCase.status = status;
    updatedTestCase.updatedAt = new Date();
    
    // Validate the test case
    const validationResult = EntityValidator.validateTestCase(updatedTestCase);
    if (!validationResult.isValid) {
      throw new ValidationError(
        'Cannot update TestCase status: validation failed',
        validationResult.errors
      );
    }
    
    return updatedTestCase;
  }
}