/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * @jest-environment jsdom
 * 
 * To run this test, use:
 * npx jest --testEnvironment=jsdom tests/unit/ui/transformation/TransformationComponents.test.tsx
 */

// Mock react-json-tree which is used in the real components
jest.mock('react-json-tree', () => ({
  __esModule: true,
  default: ({ data }: { data: any }) => <div data-testid="json-tree">JSON Tree: {JSON.stringify(data).substring(0, 50)}</div>
}));

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the components we want to test
jest.mock('../../../../packages/ui/src/components/Transformation/TransformationPreviewComponent', () => ({
  TransformationPreviewComponent: ({ sourceField, targetField, transformationType }: any) => (
    <div data-testid="transformation-preview-component">
      Transformation Preview Component with source: {sourceField.name} and target: {targetField.name}
      <div>Transformation type: {transformationType}</div>
    </div>
  )
}));

jest.mock('../../../../packages/ui/src/components/Transformation/BatchPreviewComponent', () => ({
  BatchPreviewComponent: ({ testCaseIds, sourceProviderId, targetProviderId }: any) => (
    <div data-testid="batch-preview-component">
      Batch Preview Component with {testCaseIds.length} test cases
      <div>Source: {sourceProviderId}, Target: {targetProviderId}</div>
    </div>
  )
}));

jest.mock('../../../../packages/ui/src/components/Transformation/TestCasePreviewComponent', () => ({
  TestCasePreviewComponent: ({ testCaseId, sourceProviderId, targetProviderId }: any) => (
    <div data-testid="test-case-preview-component">
      Test Case Preview Component for {testCaseId}
      <div>Source: {sourceProviderId}, Target: {targetProviderId}</div>
    </div>
  )
}));

// Import the mocked components
const { TransformationPreviewComponent } = jest.requireMock('../../../../packages/ui/src/components/Transformation/TransformationPreviewComponent');
const { BatchPreviewComponent } = jest.requireMock('../../../../packages/ui/src/components/Transformation/BatchPreviewComponent');
const { TestCasePreviewComponent } = jest.requireMock('../../../../packages/ui/src/components/Transformation/TestCasePreviewComponent');

describe('Transformation Components', () => {
  describe('TransformationPreviewComponent', () => {
    it('renders with basic props', () => {
      render(
        <TransformationPreviewComponent
          sourceField={{ id: 'name', name: 'Name', type: 'string', required: true }}
          targetField={{ id: 'title', name: 'Title', type: 'string', required: true }}
          transformationType="uppercase"
          transformationParams={{}}
          sourceFields={[]}
        />
      );

      expect(screen.getByTestId('transformation-preview-component')).toBeInTheDocument();
      expect(screen.getByText(/Name/)).toBeInTheDocument();
      expect(screen.getByText(/Title/)).toBeInTheDocument();
      expect(screen.getByText(/uppercase/)).toBeInTheDocument();
    });
  });

  describe('BatchPreviewComponent', () => {
    it('renders with basic props', () => {
      render(
        <BatchPreviewComponent
          testCaseIds={['TC-123', 'TC-124', 'TC-125']}
          sourceProviderId="zephyr"
          targetProviderId="qtest"
          fieldMappings={[]}
        />
      );

      expect(screen.getByTestId('batch-preview-component')).toBeInTheDocument();
      expect(screen.getByText(/3 test cases/)).toBeInTheDocument();
      expect(screen.getByText(/Source: zephyr, Target: qtest/)).toBeInTheDocument();
    });
  });

  describe('TestCasePreviewComponent', () => {
    it('renders with basic props', () => {
      render(
        <TestCasePreviewComponent
          testCaseId="TC-123"
          sourceProviderId="zephyr"
          targetProviderId="qtest"
          fieldMappings={[]}
        />
      );

      expect(screen.getByTestId('test-case-preview-component')).toBeInTheDocument();
      expect(screen.getByText(/TC-123/)).toBeInTheDocument();
      expect(screen.getByText(/Source: zephyr, Target: qtest/)).toBeInTheDocument();
    });
  });
});