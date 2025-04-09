import { TestCase, TestStep } from '../../domain/entities/TestCase';
import { ValidationError } from '../../domain/errors/DomainErrors';

/**
 * Input data for generating test cases using LLM
 */
export interface GenerateTestCasesInput {
  requirementText: string;
  apiSpecification?: string;
  userStory?: string;
  options: {
    count: number;
    language: string;
    includeSetup: boolean;
    includeTeardown: boolean;
    priority?: string;
  };
}

/**
 * Result of the test case generation
 */
export interface GenerateTestCasesResult {
  testCases: TestCase[];
  generationMetrics: {
    executionTime: number;
    tokensUsed: number;
    modelName: string;
  };
}

/**
 * Use case for generating test cases using LLM
 */
export class GenerateTestCasesUseCase {
  constructor(
    private readonly llmService: LlmService,
    private readonly testCaseAnalyzer: TestCaseAnalyzer
  ) {}

  async execute(input: GenerateTestCasesInput): Promise<GenerateTestCasesResult> {
    // Validate input
    this.validateInput(input);

    // Prepare the prompt for the LLM
    const prompt = this.preparePrompt(input);

    // Start timing for metrics
    const startTime = Date.now();

    // Query the LLM service
    const llmResponse = await this.llmService.generateCompletion(prompt, {
      maxTokens: 2000,
      temperature: 0.7,
      model: 'test-case-generation-v1'
    });

    // Calculate execution time
    const executionTime = Date.now() - startTime;

    // Parse generated test cases
    const testCases = this.parseTestCases(llmResponse.content, input);

    // Analyze and validate the generated test cases
    const analyzedTestCases = await Promise.all(
      testCases.map(tc => this.testCaseAnalyzer.analyzeTestCase(tc))
    );

    return {
      testCases: analyzedTestCases,
      generationMetrics: {
        executionTime,
        tokensUsed: llmResponse.usage.totalTokens,
        modelName: llmResponse.model
      }
    };
  }

  private validateInput(input: GenerateTestCasesInput): void {
    const validationErrors: string[] = [];

    if (!input.requirementText && !input.apiSpecification && !input.userStory) {
      validationErrors.push('At least one of requirementText, apiSpecification, or userStory must be provided');
    }

    if (input.options.count <= 0 || input.options.count > 10) {
      validationErrors.push('Number of test cases must be between 1 and 10');
    }

    if (validationErrors.length > 0) {
      throw new ValidationError('Invalid input for test case generation', validationErrors);
    }
  }

  private preparePrompt(input: GenerateTestCasesInput): string {
    // Build a detailed prompt based on input data
    let prompt = `Generate ${input.options.count} detailed test cases for the following requirement:\n\n`;
    
    if (input.requirementText) {
      prompt += `Requirement: ${input.requirementText}\n\n`;
    }
    
    if (input.apiSpecification) {
      prompt += `API Specification: ${input.apiSpecification}\n\n`;
    }
    
    if (input.userStory) {
      prompt += `User Story: ${input.userStory}\n\n`;
    }
    
    prompt += `Each test case should include:\n`;
    prompt += `- A descriptive title\n`;
    prompt += `- A clear description\n`;
    prompt += `- Detailed test steps with expected results\n`;
    
    if (input.options.includeSetup) {
      prompt += `- Setup/precondition steps\n`;
    }
    
    if (input.options.includeTeardown) {
      prompt += `- Teardown/cleanup steps\n`;
    }
    
    if (input.options.priority) {
      prompt += `\nAll test cases should have ${input.options.priority} priority.\n`;
    }
    
    prompt += `\nFormat each test case as a JSON object.\n`;
    
    return prompt;
  }

  private parseTestCases(llmOutput: string, input: GenerateTestCasesInput): TestCase[] {
    try {
      // Extract JSON objects from LLM output
      const jsonMatches = llmOutput.match(/\{[\s\S]*?\}/g) || [];
      const parsedTestCases: TestCase[] = [];
      
      for (const jsonStr of jsonMatches) {
        try {
          const parsedJson = JSON.parse(jsonStr);
          
          // Create a standardized test case object from parsed JSON
          const testCase: TestCase = {
            id: `temp-${parsedTestCases.length + 1}`,
            title: parsedJson.title || 'Untitled Test Case',
            description: parsedJson.description || '',
            status: 'DRAFT',
            priority: input.options.priority ? (input.options.priority.toUpperCase() as any) : 'MEDIUM',
            steps: this.parseTestSteps(parsedJson.steps || []),
            tags: parsedJson.tags || [],
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          parsedTestCases.push(testCase);
        } catch (error) {
          console.error('Failed to parse test case JSON:', error);
          // Continue to next JSON object
        }
      }
      
      return parsedTestCases.slice(0, input.options.count);
    } catch (error) {
      console.error('Error parsing LLM output:', error);
      return [];
    }
  }

  private parseTestSteps(stepsInput: any[]): TestStep[] {
    if (!Array.isArray(stepsInput)) {
      return [];
    }
    
    return stepsInput.map((step, index) => {
      return {
        order: index + 1,
        description: typeof step.description === 'string' ? step.description : 'Step description',
        expectedResult: typeof step.expectedResult === 'string' ? step.expectedResult : 'Expected result'
      };
    });
  }
}

/**
 * Interface for LLM service
 */
interface LlmService {
  generateCompletion(prompt: string, options: LlmOptions): Promise<LlmResponse>;
}

interface LlmOptions {
  maxTokens: number;
  temperature: number;
  model: string;
}

interface LlmResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Interface for test case analyzer
 */
interface TestCaseAnalyzer {
  analyzeTestCase(testCase: TestCase): Promise<TestCase>;
}
