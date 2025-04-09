/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: [
    '<rootDir>/tests',
    '<rootDir>/pkg'
  ],
  testMatch: [
    '**/?(*.)+(spec|test).+(ts|tsx|js)'
  ],
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'node'
  ],
  collectCoverageFrom: [
    'pkg/**/*.{ts,tsx}',
    'internal/typescript/**/*.{ts,tsx}',
    'cmd/api/**/*.{ts,tsx}',
    '!**/node_modules/**',
    '!**/dist/**'
  ],
  coverageDirectory: 'test-results/coverage',
  coverageReporters: [
    'json',
    'lcov',
    'text',
    'clover'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    }
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json'
    }]
  },
  setupFilesAfterEnv: [
    '<rootDir>/tests/jest.setup.js'
  ],
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  }
};