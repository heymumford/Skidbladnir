/**
 * Test Case Transformer
 * 
 * Transforms test cases from Zephyr to qTest format
 */

import { 
  TestCase, 
  TestStep, 
  Attachment, 
  Project 
} from '../../common/src/models/entities';

/**
 * Zephyr test case structure (simplified)
 */
interface ZephyrTest {
  id: string;
  key: string;
  name: string;
  description?: string;
  objective?: string;
  precondition?: string;
  owner?: string;
  priority?: { id: string; name: string };
  status?: { id: string; name: string };
  folder?: { id: string; name: string };
  labels?: string[];
  customFields?: { [key: string]: any };
  steps?: ZephyrTestStep[];
  createdBy?: string;
  createdOn?: string;
  updatedBy?: string;
  updatedOn?: string;
}

/**
 * Zephyr test step structure (simplified)
 */
interface ZephyrTestStep {
  id: string;
  index: number;
  description: string;
  expectedResult?: string;
  testData?: string;
  attachments?: ZephyrAttachment[];
}

/**
 * Zephyr attachment structure (simplified)
 */
interface ZephyrAttachment {
  id: string;
  filename: string;
  contentType: string;
  filesize?: number;
  comment?: string;
  createdBy?: string;
  createdOn?: string;
}

/**
 * qTest test case structure (simplified)
 */
interface QTestTestCase {
  id?: number;
  name: string;
  description?: string;
  precondition?: string;
  parent_id?: number;
  properties?: QTestProperty[];
  links?: QTestLink[];
}

/**
 * qTest test step structure (simplified)
 */
interface QTestTestStep {
  id?: number;
  description: string;
  expected_result?: string;
  order: number;
}

/**
 * qTest property structure
 */
interface QTestProperty {
  field_id: number;
  field_name?: string;
  field_value: string | number | boolean | null;
}

/**
 * qTest link structure
 */
interface QTestLink {
  rel: string;
  href: string;
}

/**
 * Test case transformer
 */
export class TestCaseTransformer {
  private project: Project;
  
  constructor(project: Project) {
    this.project = project;
  }
  
  /**
   * Transform a Zephyr test case to the canonical model
   */
  public fromZephyr(zephyrTest: ZephyrTest): TestCase {
    // Map steps
    const steps: TestStep[] = zephyrTest.steps ? 
      zephyrTest.steps.map(step => this.mapZephyrTestStep(step)) : 
      [];
    
    // Map attachments (if any)
    const attachments: Attachment[] = [];
    
    // Create canonical test case
    return {
      id: zephyrTest.id,
      name: zephyrTest.name,
      description: zephyrTest.description,
      objective: zephyrTest.objective,
      precondition: zephyrTest.precondition,
      priority: zephyrTest.priority?.name,
      status: zephyrTest.status?.name,
      folder: zephyrTest.folder?.id,
      labels: zephyrTest.labels,
      customFields: zephyrTest.customFields ? 
        new Map(Object.entries(zephyrTest.customFields)) : 
        undefined,
      steps,
      attachments,
      createdBy: zephyrTest.createdBy,
      createdAt: zephyrTest.createdOn ? new Date(zephyrTest.createdOn) : undefined,
      updatedBy: zephyrTest.updatedBy,
      updatedAt: zephyrTest.updatedOn ? new Date(zephyrTest.updatedOn) : undefined,
      sourceId: zephyrTest.id
    };
  }
  
  /**
   * Transform canonical model to qTest format
   */
  public toQTest(testCase: TestCase, parentId?: number): {
    testCase: QTestTestCase,
    testSteps: QTestTestStep[]
  } {
    // Map properties using project mappings
    const properties: QTestProperty[] = this.mapProperties(testCase);
    
    // Create qTest test case
    const qTestCase: QTestTestCase = {
      name: testCase.name,
      description: testCase.description || '',
      precondition: testCase.precondition || '',
      parent_id: parentId,
      properties
    };
    
    // Map steps
    const qTestSteps: QTestTestStep[] = testCase.steps.map(step => ({
      description: step.action,
      expected_result: step.expectedResult || '',
      order: step.sequence
    }));
    
    return {
      testCase: qTestCase,
      testSteps: qTestSteps
    };
  }
  
  /**
   * Map a Zephyr test step to canonical format
   */
  private mapZephyrTestStep(step: ZephyrTestStep): TestStep {
    const attachments: Attachment[] = step.attachments ?
      step.attachments.map(att => this.mapZephyrAttachment(att)) :
      [];
    
    return {
      id: step.id,
      sequence: step.index,
      action: step.description,
      expectedResult: step.expectedResult,
      testData: step.testData,
      attachments
    };
  }
  
  /**
   * Map a Zephyr attachment to canonical format
   */
  private mapZephyrAttachment(attachment: ZephyrAttachment): Attachment {
    return {
      id: attachment.id,
      filename: attachment.filename,
      contentType: attachment.contentType,
      size: attachment.filesize,
      description: attachment.comment,
      createdBy: attachment.createdBy,
      createdAt: attachment.createdOn ? new Date(attachment.createdOn) : undefined
    };
  }
  
  /**
   * Map test case properties according to project field mappings
   */
  private mapProperties(testCase: TestCase): QTestProperty[] {
    const properties: QTestProperty[] = [];
    
    // Map known fields
    if (testCase.priority) {
      const mappedPriority = this.getMappedValue('priority', testCase.priority);
      if (mappedPriority) {
        properties.push({
          field_id: parseInt(mappedPriority, 10),
          field_name: 'Priority',
          field_value: mappedPriority
        });
      }
    }
    
    if (testCase.status) {
      const mappedStatus = this.getMappedValue('status', testCase.status);
      if (mappedStatus) {
        properties.push({
          field_id: parseInt(mappedStatus, 10),
          field_name: 'Status',
          field_value: mappedStatus
        });
      }
    }
    
    // Map custom fields
    if (testCase.customFields) {
      testCase.customFields.forEach((value, key) => {
        const mappedField = this.getMappedField(key);
        if (mappedField) {
          properties.push({
            field_id: parseInt(mappedField, 10),
            field_name: key,
            field_value: value
          });
        }
      });
    }
    
    return properties;
  }
  
  /**
   * Get mapped field ID from project config
   */
  private getMappedField(fieldName: string): string | undefined {
    if (!this.project.fieldMappings) {
      return undefined;
    }
    
    return this.project.fieldMappings.get(fieldName);
  }
  
  /**
   * Get mapped value from project config (e.g., status, priority)
   */
  private getMappedValue(type: 'status' | 'priority', value: string): string | undefined {
    if (type === 'status' && this.project.statusMappings) {
      return this.project.statusMappings.get(value);
    }
    
    if (type === 'priority' && this.project.priorityMappings) {
      return this.project.priorityMappings.get(value);
    }
    
    return undefined;
  }
}