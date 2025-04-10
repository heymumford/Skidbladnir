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
  moduleNameMapper: {
    // Handle CSS imports (with CSS modules)
    '\\.module\\.(css|sass|scss)$': '<rootDir>/__mocks__/styleMock.js',
    // Handle CSS imports (without CSS modules)
    '\\.(css|sass|scss)$': '<rootDir>/__mocks__/styleMock.js',
    // Handle static assets
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/__mocks__/fileMock.js',
    // Mock libxmljs2 dependency
    'libxmljs2': '<rootDir>/__mocks__/libxmljs2.js'
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
  }
};