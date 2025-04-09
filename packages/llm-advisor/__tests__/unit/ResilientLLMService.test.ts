/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { ResilientLLMService } from '../../src/services/ResilientLLMService';
import { ConfigurationService } from '../../src/services/ConfigurationService';
import { CircuitBreakerService } from '../../src/services/CircuitBreakerService';
import { RetryService } from '../../src/services/RetryService';
import { FallbackService } from '../../src/services/FallbackService';
import { LoggingService } from '../../src/services/LoggingService';

jest.mock('../../src/services/ConfigurationService');
jest.mock('../../src/services/CircuitBreakerService');
jest.mock('../../src/services/RetryService');
jest.mock('../../src/services/FallbackService');
jest.mock('../../src/services/LoggingService');

describe('ResilientLLMService', () => {
  let resilientService: ResilientLLMService;
  let configService: jest.Mocked<ConfigurationService>;
  let circuitBreakerService: jest.Mocked<CircuitBreakerService>;
  let retryService: jest.Mocked<RetryService>;
  let fallbackService: jest.Mocked<FallbackService>;
  let loggingService: jest.Mocked<LoggingService>;
  
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
      getResilienceConfig: jest.fn().mockReturnValue({
        circuitBreakerThreshold: 5,
        retryAttempts: 3,
        retryBackoffFactor: 1.5,
        fallbackEnabled: true
      }),
    } as unknown as jest.Mocked<ConfigurationService>;
    
    circuitBreakerService = {
      isCircuitOpen: jest.fn().mockReturnValue(false),
      recordSuccess: jest.fn(),
      recordFailure: jest.fn(),
      getState: jest.fn(),
      reset: jest.fn(),
    } as unknown as jest.Mocked<CircuitBreakerService>;
    
    retryService = {
      executeWithRetry: jest.fn().mockImplementation((fn) => fn()),
      getRetryStats: jest.fn(),
    } as unknown as jest.Mocked<RetryService>;
    
    fallbackService = {
      getFallbackMapping: jest.fn(),
      registerFallback: jest.fn(),
    } as unknown as jest.Mocked<FallbackService>;
    
    loggingService = {
      logInfo: jest.fn(),
      logWarning: jest.fn(),
      logError: jest.fn(),
      logDebug: jest.fn(),
    } as unknown as jest.Mocked<LoggingService>;
    
    resilientService = new ResilientLLMService(
      configService,
      circuitBreakerService,
      retryService,
      fallbackService,
      loggingService
    );

    // Mock the internal LLM service
    // @ts-ignore - implementation for test purposes
    resilientService.llmService = {
      mapZephyrToQTest: jest.fn().mockResolvedValue(sampleQTestSpec),
      mapQTestToZephyr: jest.fn().mockResolvedValue(sampleZephyrSpec),
    };
  });

  // UT-STAB-001: Verify circuit breaker trips after threshold failures
  test('circuit breaker prevents calls when open', async () => {
    // Set circuit to open state
    circuitBreakerService.isCircuitOpen.mockReturnValue(true);
    
    try {
      await resilientService.mapZephyrToQTest(sampleZephyrSpec);
      fail('Should have thrown circuit breaker error');
    } catch (error) {
      expect(circuitBreakerService.isCircuitOpen).toHaveBeenCalled();
      expect(error.message).toContain('Circuit breaker is open');
    }
    
    // Verify the underlying service was never called
    expect(resilientService.llmService.mapZephyrToQTest).not.toHaveBeenCalled();
  });

  // UT-STAB-002: Verify retry behavior
  test('retries failed requests with exponential backoff', async () => {
    // First create a failing implementation
    const failingImpl = jest.fn()
      .mockRejectedValueOnce(new Error('Temporary failure'))
      .mockResolvedValueOnce(sampleQTestSpec);
      
    // @ts-ignore - implementation for test purposes
    resilientService.llmService.mapZephyrToQTest = failingImpl;
    
    // Make retry actually execute the function multiple times
    retryService.executeWithRetry = jest.fn().mockImplementation(async (fn) => {
      try {
        return await fn();
      } catch (error) {
        return await fn();
      }
    });
    
    const result = await resilientService.mapZephyrToQTest(sampleZephyrSpec);
    
    expect(retryService.executeWithRetry).toHaveBeenCalled();
    expect(failingImpl).toHaveBeenCalledTimes(2);
    expect(result).toEqual(sampleQTestSpec);
  });

  // UT-STAB-003: Verify fallback behavior when all retries fail
  test('uses fallback when all retries fail', async () => {
    // Make the LLM service always fail
    // @ts-ignore - implementation for test purposes
    resilientService.llmService.mapZephyrToQTest = jest.fn().mockRejectedValue(
      new Error('Persistent failure')
    );
    
    // Setup fallback service to return data
    fallbackService.getFallbackMapping.mockResolvedValue(sampleQTestSpec);
    
    // Make retry actually execute the function and then fail
    retryService.executeWithRetry = jest.fn().mockImplementation(async (fn) => {
      try {
        return await fn();
      } catch (error) {
        throw error; // Re-throw after all retries
      }
    });
    
    const result = await resilientService.mapZephyrToQTest(sampleZephyrSpec);
    
    expect(retryService.executeWithRetry).toHaveBeenCalled();
    expect(resilientService.llmService.mapZephyrToQTest).toHaveBeenCalled();
    expect(fallbackService.getFallbackMapping).toHaveBeenCalled();
    expect(result).toEqual(sampleQTestSpec);
    expect(circuitBreakerService.recordFailure).toHaveBeenCalled();
  });

  // UT-STAB-004: Verify circuit records successes
  test('records successful operations in circuit breaker', async () => {
    await resilientService.mapZephyrToQTest(sampleZephyrSpec);
    
    expect(resilientService.llmService.mapZephyrToQTest).toHaveBeenCalledWith(sampleZephyrSpec);
    expect(circuitBreakerService.recordSuccess).toHaveBeenCalled();
  });

  // UT-STAB-005: Verify graceful degradation
  test('gracefully degrades when under stress', async () => {
    // Mock implementation to simulate resource constraints
    // @ts-ignore - implementation for test purposes
    resilientService.isUnderResourceConstraint = jest.fn().mockReturnValue(true);
    
    // Create a simplified response that would be returned under constraint
    const simplifiedResponse = {
      test_case_id: 'TC-123',
      title: 'Sample Test Case',
      test_steps: [],
      priority_level: 1,
      active: true
    };
    
    // Setup degraded service response
    // @ts-ignore - implementation for test purposes
    resilientService.executeDegradedOperation = jest.fn().mockResolvedValue(simplifiedResponse);
    
    const result = await resilientService.mapZephyrToQTest(sampleZephyrSpec);
    
    // Should use degraded operation
    expect(resilientService.executeDegradedOperation).toHaveBeenCalled();
    expect(loggingService.logWarning).toHaveBeenCalledWith(
      expect.stringContaining('resource constraints')
    );
    expect(result).toEqual(simplifiedResponse);
  });

  // UT-STAB-006: Verify self-healing attempt after circuit opens
  test('attempts self-healing after circuit opens', async () => {
    // Mock circuit as open
    circuitBreakerService.isCircuitOpen.mockReturnValue(true);
    
    // Mock the reset check to indicate it should reset
    // @ts-ignore - implementation for test purposes
    resilientService.shouldAttemptCircuitReset = jest.fn().mockReturnValue(true);
    
    // Reset should succeed
    circuitBreakerService.reset.mockImplementation(() => {
      // Change the mock to return false after reset
      circuitBreakerService.isCircuitOpen.mockReturnValue(false);
    });
    
    const result = await resilientService.mapZephyrToQTest(sampleZephyrSpec);
    
    expect(circuitBreakerService.reset).toHaveBeenCalled();
    expect(resilientService.llmService.mapZephyrToQTest).toHaveBeenCalledWith(sampleZephyrSpec);
    expect(result).toEqual(sampleQTestSpec);
    expect(loggingService.logInfo).toHaveBeenCalledWith(
      expect.stringContaining('Circuit breaker reset')
    );
  });
});