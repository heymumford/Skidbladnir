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
  // Using babel-jest instead of ts-jest preset
  // preset: 'ts-jest',
  testEnvironment: 'jsdom',
  rootDir: path.resolve(__dirname, '..'),
  roots: [
    '<rootDir>/packages/ui'
  ],
  // Setup files for the UI test suite
  setupFilesAfterEnv: [
    path.resolve(__dirname, '..', 'tests/jest.ui.setup.js')
  ],
  moduleDirectories: [
    'node_modules',
    path.resolve(__dirname, '..', 'packages/ui/src/components')
  ],
  moduleNameMapper: {
    // Handle CSS imports (with CSS modules)
    '\\.module\\.(css|sass|scss)$': '<rootDir>/__mocks__/styleMock.js',
    // Handle CSS imports (without CSS modules)
    '\\.(css|sass|scss)$': '<rootDir>/__mocks__/styleMock.js',
    // Handle static assets
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/__mocks__/fileMock.js',
    // Mock libxmljs2 dependency
    'libxmljs2': '<rootDir>/__mocks__/libxmljs2.js',
    // Mock react-json-tree - support both root and UI-specific mocks
    'react-json-tree': ['<rootDir>/packages/ui/src/components/__mocks__/react-json-tree.js', '<rootDir>/__mocks__/react-json-tree.js'],
    // Mock i18next - support both root and UI-specific mocks
    'react-i18next': ['<rootDir>/packages/ui/src/components/__mocks__/react-i18next.js', '<rootDir>/__mocks__/react-i18next.js'],
    // Mock feature flags
    '.*\\/packages\\/common\\/src\\/utils\\/feature-flags': '<rootDir>/__mocks__/feature-flags.js',
    '.*\\/packages\\/common\\/src\\/utils\\/excel-csv-handler': '<rootDir>/__mocks__/excel-csv-handler.js',
    '.*\\/context\\/FeatureFlagContext': ['<rootDir>/packages/ui/src/components/__mocks__/FeatureFlagContext.js', '<rootDir>/__mocks__/FeatureFlagContext.js'],
    '.*\\/pkg\\/domain\\/entities\\/TestExecution': '<rootDir>/__mocks__/TestExecution.js',
    '.*\\/services\\/TransformationService': '<rootDir>/__mocks__/TransformationService.js',
    '.*\\/services\\/TransformationEngine': '<rootDir>/__mocks__/TransformationEngine.js',
    '.*\\/services\\/MigrationService': '<rootDir>/__mocks__/MigrationService.js',
    '.*\\/services\\/ProviderService': '<rootDir>/__mocks__/ProviderService.js',
    '.*\\/services\\/TestCaseService': '<rootDir>/__mocks__/TestCaseService.js',
    '.*\\/services\\/TestExecutionService': '<rootDir>/__mocks__/TestExecutionService.js',
    '.*\\/services\\/ProviderConnectionService': '<rootDir>/__mocks__/ProviderService.js',
    // UI component specific mocks
    '.*TestCasePreviewComponent': '<rootDir>/packages/ui/src/components/__mocks__/TestCasePreviewComponent.js'
  },
  testMatch: [
    '**/packages/ui/**/*.test.tsx',
    '**/packages/ui/**/*.test.jsx'
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
    'packages/ui/**/*.{tsx,jsx}',
    '!**/node_modules/**',
    '!**/dist/**'
  ],
  coverageDirectory: 'test-results/coverage-ui',
  coverageReporters: [
    'json',
    'lcov',
    'text',
    'clover'
  ],
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        '@babel/preset-typescript',
        '@babel/preset-react'
      ],
      plugins: [
        '@babel/plugin-transform-modules-commonjs'
      ]
    }]
  },
  transformIgnorePatterns: [
    "/node_modules/(?!react-json-tree)"
  ]
};