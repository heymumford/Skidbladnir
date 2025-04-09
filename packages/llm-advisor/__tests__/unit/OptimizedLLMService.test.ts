import { OptimizedLLMService } from '../../src/services/OptimizedLLMService';
import { ConfigurationService } from '../../src/services/ConfigurationService';
import { MemoryMonitor } from '../../src/utils/MemoryMonitor';
import { ModelRegistry } from '../../src/services/ModelRegistry';
import { ApiSpecService } from '../../src/services/ApiSpecService';
import { CacheService } from '../../src/services/CacheService';

jest.mock('../../src/services/ConfigurationService');
jest.mock('../../src/utils/MemoryMonitor');
jest.mock('../../src/services/ModelRegistry');
jest.mock('../../src/services/ApiSpecService');
jest.mock('../../src/services/CacheService');

describe('OptimizedLLMService', () => {
  let llmService: OptimizedLLMService;
  let configService: jest.Mocked<ConfigurationService>;
  let memoryMonitor: jest.Mocked<MemoryMonitor>;
  let modelRegistry: jest.Mocked<ModelRegistry>;
  let apiSpecService: jest.Mocked<ApiSpecService>;
  let cacheService: jest.Mocked<CacheService>;
  
  const sampleZephyrSpec = {
    id: 'TEST-123',
    name: 'Sample Test Case',
    description: 'This is a sample test case',
    steps: [
      { id: 1, action: 'Open application', expected: 'Application opens' },
      { id: 2, action: 'Click login', expected: 'Login form appears' }
    ],
    priority: 'high',
    status: 'active'
  };
  
  const sampleQTestSpec = {
    test_case_id: 'TC-123',
    title: 'Sample Test Case',
    description: 'This is a sample test case',
    test_steps: [
      { step_number: 1, description: 'Open application', expected_result: 'Application opens' },
      { step_number: 2, description: 'Click login', expected_result: 'Login form appears' }
    ],
    priority_level: 1,
    active: true
  };

  beforeEach(() => {
    configService = {
      getModelConfig: jest.fn(),
      getPerformanceThresholds: jest.fn().mockReturnValue({
        loadTimeStandard: 5000,
        loadTimeFull: 15000,
        inferenceTime: 500,
        memoryThreshold: 4 * 1024 * 1024 * 1024 // 4GB
      }),
      getResourceLimits: jest.fn(),
    } as unknown as jest.Mocked<ConfigurationService>;
    
    memoryMonitor = {
      getCurrentUsage: jest.fn().mockReturnValue(2 * 1024 * 1024 * 1024), // 2GB
      registerThresholdAlert: jest.fn(),
    } as unknown as jest.Mocked<MemoryMonitor>;
    
    modelRegistry = {
      loadModel: jest.fn().mockImplementation((modelName) => {
        return Promise.resolve({
          name: modelName,
          loaded: true,
          size: modelName.includes('standard') ? '1GB' : '4GB'
        });
      }),
      getAvailableModels: jest.fn(),
    } as unknown as jest.Mocked<ModelRegistry>;
    
    apiSpecService = {
      getZephyrSchema: jest.fn().mockResolvedValue({ schema: 'zephyr' }),
      getQTestSchema: jest.fn().mockResolvedValue({ schema: 'qtest' }),
    } as unknown as jest.Mocked<ApiSpecService>;
    
    cacheService = {
      getCachedMapping: jest.fn(),
      storeCachedMapping: jest.fn(),
      getCacheStats: jest.fn(),
    } as unknown as jest.Mocked<CacheService>;
    
    llmService = new OptimizedLLMService(
      configService,
      memoryMonitor,
      modelRegistry,
      apiSpecService,
      cacheService
    );
  });

  // UT-PERF-001: Verify model loading time is within threshold
  test('loads model within time threshold', async () => {
    const startTime = Date.now();
    await llmService.initializeModel('standard');
    const endTime = Date.now();
    const loadTime = endTime - startTime;
    
    expect(modelRegistry.loadModel).toHaveBeenCalledWith('standard');
    expect(loadTime).toBeLessThan(configService.getPerformanceThresholds().loadTimeStandard);
  });

  // UT-PERF-002: Verify inference time for standard API mappings
  test('performs inference within time threshold', async () => {
    // Setup model and mock inference time
    await llmService.initializeModel('standard');
    
    // Setup cache miss to force inference
    cacheService.getCachedMapping.mockReturnValue(null);
    
    const startTime = Date.now();
    await llmService.mapZephyrToQTest(sampleZephyrSpec);
    const endTime = Date.now();
    const inferenceTime = endTime - startTime;
    
    expect(inferenceTime).toBeLessThan(configService.getPerformanceThresholds().inferenceTime);
    expect(cacheService.storeCachedMapping).toHaveBeenCalled();
  });

  // UT-PERF-003: Verify memory usage remains within boundaries
  test('keeps memory usage within configured limits', async () => {
    await llmService.initializeModel('standard');
    await llmService.mapZephyrToQTest(sampleZephyrSpec);
    
    expect(memoryMonitor.getCurrentUsage).toHaveBeenCalled();
    const currentUsage = memoryMonitor.getCurrentUsage();
    expect(currentUsage).toBeLessThan(configService.getPerformanceThresholds().memoryThreshold);
  });

  // UT-API-001: Verify Zephyr to QTest field mapping accuracy
  test('accurately maps Zephyr to QTest fields', async () => {
    await llmService.initializeModel('standard');
    
    // Setup mock implementation for inference
    // @ts-ignore - implementation for test purposes
    llmService.performInference = jest.fn().mockResolvedValue(sampleQTestSpec);
    
    const result = await llmService.mapZephyrToQTest(sampleZephyrSpec);
    
    expect(result.test_case_id).toBeDefined();
    expect(result.title).toEqual(sampleZephyrSpec.name);
    expect(result.test_steps.length).toEqual(sampleZephyrSpec.steps.length);
    expect(result.priority_level).toBeDefined();
    expect(result.active).toBeDefined();
  });

  // UT-API-002: Verify QTest to Zephyr field mapping accuracy
  test('accurately maps QTest to Zephyr fields', async () => {
    await llmService.initializeModel('standard');
    
    // Setup mock implementation for inference
    // @ts-ignore - implementation for test purposes
    llmService.performInference = jest.fn().mockResolvedValue(sampleZephyrSpec);
    
    const result = await llmService.mapQTestToZephyr(sampleQTestSpec);
    
    expect(result.id).toBeDefined();
    expect(result.name).toEqual(sampleQTestSpec.title);
    expect(result.steps.length).toEqual(sampleQTestSpec.test_steps.length);
    expect(result.priority).toBeDefined();
    expect(result.status).toBeDefined();
  });

  // UT-HEAL-001: Verify automatic correction of common mapping errors
  test('self-corrects common mapping errors', async () => {
    await llmService.initializeModel('standard');
    
    // Create a malformed QTest result that's missing required fields
    const malformedResult = {
      title: 'Sample Test Case',
      description: 'This is a sample test case',
      // Missing test_steps
      priority_level: 1,
      // Missing active flag
    };
    
    // Setup mock implementation for inference that returns malformed data
    // @ts-ignore - implementation for test purposes
    llmService.performInference = jest.fn().mockResolvedValue(malformedResult);
    
    const result = await llmService.mapZephyrToQTest(sampleZephyrSpec);
    
    // Service should correct the output
    expect(result.test_case_id).toBeDefined(); // Generated or default
    expect(result.test_steps).toBeDefined(); // Created from source
    expect(result.active).toBeDefined(); // Default value applied
  });

  // UT-STAB-001: Verify circuit breaker behavior
  test('circuit breaker trips after threshold failures', async () => {
    await llmService.initializeModel('standard');
    
    // Setup mock implementation that always fails
    // @ts-ignore - implementation for test purposes
    llmService.performInference = jest.fn().mockRejectedValue(new Error('Model failure'));
    
    // Attempt multiple operations to trigger circuit breaker
    for (let i = 0; i < 5; i++) {
      try {
        await llmService.mapZephyrToQTest(sampleZephyrSpec);
      } catch (error) {
        // Expected to fail
      }
    }
    
    // Next attempt should fail immediately with circuit breaker error
    try {
      await llmService.mapZephyrToQTest(sampleZephyrSpec);
      fail('Should have thrown circuit breaker error');
    } catch (error) {
      expect(error.message).toContain('Circuit breaker open');
    }
  });
});