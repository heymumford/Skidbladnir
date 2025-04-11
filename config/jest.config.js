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
  testEnvironment: 'node',
  rootDir: path.resolve(__dirname, '..'),
  roots: [
    '<rootDir>/tests',
    '<rootDir>/pkg',
    '<rootDir>/packages'
  ],
  // Setup files for the entire test suite
  setupFilesAfterEnv: [
    path.resolve(__dirname, '..', 'tests/jest.setup.js')
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
    // Mock react-json-tree
    'react-json-tree': '<rootDir>/__mocks__/react-json-tree.js'
  },
  testMatch: [
    '**/*.test.ts',
    '**/*.test.tsx',
    '**/*.test.js'
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
  // Load the unified coverage thresholds
  coverageThreshold: require('./coverage-thresholds.json').typescript,
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        '@babel/preset-typescript',
        '@babel/preset-react'
      ],
      plugins: [
        '@babel/plugin-transform-modules-commonjs'
      ]
    }]
  }
};