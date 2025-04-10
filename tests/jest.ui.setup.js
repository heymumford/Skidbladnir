/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

// Import jest-dom additions
require('@testing-library/jest-dom');

// Set default timeout for all tests
jest.setTimeout(30000);

// Mock implementation flag - in CI or non-dev environments,
// we often want to run with mocks rather than real implementations
process.env.USE_MOCKS = process.env.USE_MOCKS || 'true';

// Global mock handling
beforeAll(() => {
  // Setup any global test utilities or mocks here
  console.log('UI Test setup - running with', 
    process.env.USE_MOCKS === 'true' ? 'mock implementations' : 'real implementations');
  
  // Add any DOM-specific mocks here
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
  
  // Mock window.scrollTo
  window.scrollTo = jest.fn();
});

// Global teardown
afterAll(() => {
  // Clean up any global resources
});