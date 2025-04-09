/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { LcarsStatusHeader } from './LcarsStatusHeader';

describe('LcarsStatusHeader', () => {
  it('displays operation name and state', () => {
    render(
      <LcarsStatusHeader 
        operationName="Test Migration"
        operationState="running"
      />
    );
    
    expect(screen.getByText('Test Migration')).toBeInTheDocument();
    expect(screen.getByText('RUNNING')).toBeInTheDocument();
  });

  it('shows estimated time remaining when provided', () => {
    render(
      <LcarsStatusHeader 
        operationName="Test Migration"
        operationState="running"
        estimatedTimeRemaining={600} // 10 minutes in seconds
      />
    );
    
    expect(screen.getByText(/ETA: 10:00/)).toBeInTheDocument();
  });

  it('shows percentage complete when provided', () => {
    render(
      <LcarsStatusHeader 
        operationName="Test Migration"
        operationState="running"
        percentComplete={42}
      />
    );
    
    expect(screen.getByText('42%')).toBeInTheDocument();
  });

  it('displays stardate in the header', () => {
    render(
      <LcarsStatusHeader 
        operationName="Test Migration"
        operationState="running"
      />
    );
    
    // Stardate should be displayed in the format "STARDATE XXXXX.XX"
    expect(screen.getByText(/STARDATE \d+\.\d+/)).toBeInTheDocument();
  });

  it('shows last transaction name and status when provided', () => {
    render(
      <LcarsStatusHeader 
        operationName="Test Migration"
        operationState="running"
        lastTransactionName="Import Test Case TC-1234"
        lastTransactionStatus="completed"
      />
    );
    
    expect(screen.getByText('Import Test Case TC-1234')).toBeInTheDocument();
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
  });

  it('applies correct styling for different operation states', () => {
    const { rerender } = render(
      <LcarsStatusHeader 
        operationName="Test Migration"
        operationState="running"
      />
    );
    
    // Running state should have green color
    expect(screen.getByTestId('operation-state')).toHaveStyle({ 
      backgroundColor: expect.stringMatching(/rgba?\(0, 128, 0.*\)/) 
    });
    
    // Rerender with paused state
    rerender(
      <LcarsStatusHeader 
        operationName="Test Migration"
        operationState="paused"
      />
    );
    
    // Paused state should have amber/yellow color
    expect(screen.getByTestId('operation-state')).toHaveStyle({ 
      backgroundColor: expect.stringMatching(/rgba?\(255, 192, 0.*\)/) 
    });
    
    // Rerender with error state
    rerender(
      <LcarsStatusHeader 
        operationName="Test Migration"
        operationState="error"
      />
    );
    
    // Error state should have red color
    expect(screen.getByTestId('operation-state')).toHaveStyle({ 
      backgroundColor: expect.stringMatching(/rgba?\(255, 0, 0.*\)/) 
    });
  });
});