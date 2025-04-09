import { LLMAdvisorService } from '../../src/services/LLMAdvisorService';
import { ApiGateway } from '../../../api-bridge/src/services/ApiGateway';
import { TestAssetConverter } from '../../../api-bridge/src/services/TestAssetConverter';
import { MockZephyrClient } from '../mocks/MockZephyrClient';
import { MockQTestClient } from '../mocks/MockQTestClient';
import { TestContainerSetup } from '../utils/TestContainerSetup';
import { PerformanceMonitor } from '../utils/PerformanceMonitor';

describe('LLM Advisor API Bridge Integration', () => {
  let llmAdvisorService: LLMAdvisorService;
  let apiGateway: ApiGateway;
  let testAssetConverter: TestAssetConverter;
  let mockZephyrClient: MockZephyrClient;
  let mockQTestClient: MockQTestClient;
  let performanceMonitor: PerformanceMonitor;
  let containerSetup: TestContainerSetup;
  
  const testCaseCollection = [
    {
      id: 'ZEPHYR-001',
      name: 'Login Authentication Test',
      description: 'Verifies the login authentication process',
      steps: [
        { id: 1, action: 'Navigate to login page', expected: 'Login page is displayed' },
        { id: 2, action: 'Enter valid credentials', expected: 'Credentials are accepted' },
        { id: 3, action: 'Click login button', expected: 'User is authenticated and redirected to dashboard' }
      ],
      priority: 'high',
      status: 'active'
    },
    {
      id: 'ZEPHYR-002',
      name: 'Password Reset Test',
      description: 'Verifies the password reset functionality',
      steps: [
        { id: 1, action: 'Navigate to login page', expected: 'Login page is displayed' },
        { id: 2, action: 'Click forgot password link', expected: 'Password reset page is displayed' },
        { id: 3, action: 'Enter valid email', expected: 'Reset instructions sent confirmation displayed' }
      ],
      priority: 'medium',
      status: 'active'
    }
  ];

  beforeAll(async () => {
    // Setup test containers for isolation
    containerSetup = new TestContainerSetup();
    await containerSetup.startContainers();
    
    // Initialize performance monitoring
    performanceMonitor = new PerformanceMonitor();
    
    // Create real service instances
    llmAdvisorService = containerSetup.getLLMAdvisorService();
    apiGateway = containerSetup.getApiGateway();
    testAssetConverter = containerSetup.getTestAssetConverter();
    
    // Create mock API clients
    mockZephyrClient = new MockZephyrClient(testCaseCollection);
    mockQTestClient = new MockQTestClient();
    
    // Register mock clients with the API gateway
    apiGateway.registerZephyrClient(mockZephyrClient);
    apiGateway.registerQTestClient(mockQTestClient);
  });
  
  afterAll(async () => {
    await containerSetup.stopContainers();
  });

  // IT-BRIDGE-001: Verify end-to-end API translation flow
  test('successfully transfers test cases from Zephyr to QTest', async () => {
    performanceMonitor.start('zephyr-to-qtest-transfer');
    
    // Fetch test cases from Zephyr
    const zephyrTestCases = await apiGateway.fetchZephyrTestCases();
    expect(zephyrTestCases).toHaveLength(testCaseCollection.length);
    
    // Convert to QTest format using LLM advisor
    const convertedTestCases = await Promise.all(
      zephyrTestCases.map(testCase => testAssetConverter.convertZephyrToQTest(testCase))
    );
    
    // Verify all test cases were converted
    expect(convertedTestCases).toHaveLength(testCaseCollection.length);
    
    // Import to QTest
    const importResults = await apiGateway.importToQTest(convertedTestCases);
    
    // Verify import success
    expect(importResults.successful).toBe(true);
    expect(importResults.importedCount).toBe(testCaseCollection.length);
    
    // Fetch from QTest to verify
    const qTestTestCases = await apiGateway.fetchQTestTestCases();
    
    // Verify structural integrity of converted tests
    for (let i = 0; i < testCaseCollection.length; i++) {
      const originalCase = testCaseCollection[i];
      const convertedCase = qTestTestCases[i];
      
      expect(convertedCase.title).toEqual(originalCase.name);
      expect(convertedCase.test_steps.length).toEqual(originalCase.steps.length);
      
      // Verify test steps were properly converted
      for (let j = 0; j < originalCase.steps.length; j++) {
        const originalStep = originalCase.steps[j];
        const convertedStep = convertedCase.test_steps[j];
        
        expect(convertedStep.description).toEqual(originalStep.action);
        expect(convertedStep.expected_result).toEqual(originalStep.expected);
      }
    }
    
    const performance = performanceMonitor.stop('zephyr-to-qtest-transfer');
    expect(performance.duration).toBeLessThan(5000); // 5 second threshold
  });

  // IT-BRIDGE-002: Verify error handling during API integration
  test('handles errors gracefully during API translation', async () => {
    // Configure mock Zephyr client to throw an error
    mockZephyrClient.setFailureMode(true);
    
    try {
      // Attempt to fetch test cases (should fail)
      await apiGateway.fetchZephyrTestCases();
      fail('Expected an error to be thrown');
    } catch (error) {
      // Verify error was caught and handled
      expect(error).toBeDefined();
      
      // Verify adapter attempted to recover
      expect(apiGateway.getZephyrRetryCount()).toBeGreaterThan(0);
      
      // Verify error was logged
      const errorLogs = apiGateway.getErrorLogs();
      expect(errorLogs.length).toBeGreaterThan(0);
      expect(errorLogs[0]).toContain('Zephyr API error');
    }
    
    // Reset failure mode
    mockZephyrClient.setFailureMode(false);
    
    // Verify system recovered after error
    const zephyrTestCases = await apiGateway.fetchZephyrTestCases();
    expect(zephyrTestCases).toHaveLength(testCaseCollection.length);
  });

  // IT-BRIDGE-003: Verify self-healing capabilities
  test('applies self-healing for API schema changes', async () => {
    // Create a test case with a modified schema (field name change)
    const modifiedSchemaTestCase = {
      id: 'ZEPHYR-003',
      title: 'Modified Schema Test', // Changed from 'name' to 'title'
      description: 'Tests the self-healing capabilities',
      steps: [
        { id: 1, action: 'Test step 1', expected: 'Expected result 1' }
      ],
      priority: 'high',
      status: 'active'
    };
    
    // Add to mock Zephyr client
    mockZephyrClient.addTestCase(modifiedSchemaTestCase);
    
    // Fetch test cases including the modified schema
    const zephyrTestCases = await apiGateway.fetchZephyrTestCases();
    
    // Convert to QTest format using LLM advisor
    const convertedTestCases = await Promise.all(
      zephyrTestCases.map(testCase => testAssetConverter.convertZephyrToQTest(testCase))
    );
    
    // Find the converted test case
    const convertedModifiedCase = convertedTestCases.find(
      tc => tc.title === 'Modified Schema Test'
    );
    
    // Verify it was properly converted despite schema change
    expect(convertedModifiedCase).toBeDefined();
    expect(convertedModifiedCase.title).toEqual('Modified Schema Test');
    expect(convertedModifiedCase.test_steps).toHaveLength(1);
    
    // Verify self-healing was logged
    const healingLogs = llmAdvisorService.getSelfHealingLogs();
    expect(healingLogs.length).toBeGreaterThan(0);
    expect(healingLogs[0]).toContain('field mapping adjustment');
  });

  // IT-PERF-001: Verify concurrent operation performance
  test('maintains performance during concurrent operations', async () => {
    performanceMonitor.start('concurrent-operations');
    
    // Create a large batch of test cases
    const largeBatch = Array(20).fill(0).map((_, index) => ({
      id: `ZEPHYR-BATCH-${index}`,
      name: `Batch Test ${index}`,
      description: `Batch test case ${index}`,
      steps: [
        { id: 1, action: 'Step 1', expected: 'Result 1' },
        { id: 2, action: 'Step 2', expected: 'Result 2' }
      ],
      priority: 'medium',
      status: 'active'
    }));
    
    // Add batch to mock client
    mockZephyrClient.addTestCases(largeBatch);
    
    // Fetch and convert concurrently
    const zephyrTestCases = await apiGateway.fetchZephyrTestCases();
    
    // Process in batches of 5 concurrently
    const batchSize = 5;
    const batches = [];
    
    for (let i = 0; i < zephyrTestCases.length; i += batchSize) {
      batches.push(zephyrTestCases.slice(i, i + batchSize));
    }
    
    // Process each batch concurrently
    const results = await Promise.all(
      batches.map(batch => 
        Promise.all(batch.map(testCase => testAssetConverter.convertZephyrToQTest(testCase)))
      )
    );
    
    // Flatten results
    const convertedTestCases = results.flat();
    
    // Verify all were converted
    expect(convertedTestCases.length).toEqual(zephyrTestCases.length);
    
    const performance = performanceMonitor.stop('concurrent-operations');
    
    // Calculate average time per test case
    const avgTimePerTestCase = performance.duration / zephyrTestCases.length;
    
    // Verify performance scales reasonably (sub-linear growth)
    expect(avgTimePerTestCase).toBeLessThan(250); // 250ms per test case threshold
  });
});