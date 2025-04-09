/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/** @type {import('ts-jest').JestConfigWithTsJest} */
const path = require('path');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: path.resolve(__dirname, '..'),
  roots: [
    '<rootDir>/tests',
    '<rootDir>/pkg',
    '<rootDir>/packages'
  ],
  // Simple configuration without projects to fix setupFilesAfterEnv issue
  setupFilesAfterEnv: [
    '<rootDir>/tests/jest.setup.js'
  ],
  moduleNameMapper: {
    // Handle CSS imports (with CSS modules)
    '\\.module\\.(css|sass|scss)$': '<rootDir>/__mocks__/styleMock.js',
    // Handle CSS imports (without CSS modules)
    '\\.(css|sass|scss)$': '<rootDir>/__mocks__/styleMock.js',
    // Handle static assets
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/__mocks__/fileMock.js'
  },
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
    'packages/**/*.{ts,tsx}',
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
      tsconfig: path.resolve(__dirname, 'tsconfig.json')
    }]
  },
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  }
};