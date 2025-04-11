/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

// Import Jest DOM for DOM testing utilities
require('@testing-library/jest-dom');

// Set default timeout for all tests
jest.setTimeout(30000);

// Mock implementation flag - in CI or non-dev environments,
// we often want to run with mocks rather than real implementations
process.env.USE_MOCKS = process.env.USE_MOCKS || 'true';

// Global mock handling
beforeAll(() => {
  // Setup any global test utilities or mocks here
  console.log('Test setup - running with', 
    process.env.USE_MOCKS === 'true' ? 'mock implementations' : 'real implementations');
});

// Global teardown
afterAll(() => {
  // Clean up any global resources
});