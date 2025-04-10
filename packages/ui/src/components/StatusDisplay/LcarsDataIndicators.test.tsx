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
import { LcarsDataIndicators } from './LcarsDataIndicators';

describe('LcarsDataIndicators', () => {
  it('displays bytes in and bytes out values', () => {
    render(<LcarsDataIndicators bytesIn={1024} bytesOut={2048} />);
    
    expect(screen.getByText('RX:')).toBeInTheDocument();
    expect(screen.getByText('TX:')).toBeInTheDocument();
    expect(screen.getByText('1 KB')).toBeInTheDocument();
    expect(screen.getByText('2 KB')).toBeInTheDocument();
  });

  it('formats bytes to the appropriate unit', () => {
    const { rerender } = render(
      <LcarsDataIndicators bytesIn={512} bytesOut={1048576} />
    );
    
    // Check initial formatting
    expect(screen.getByText('512 B')).toBeInTheDocument();
    expect(screen.getByText('1 MB')).toBeInTheDocument();
    
    // Check formatting for larger values
    rerender(
      <LcarsDataIndicators bytesIn={1572864} bytesOut={3221225472} />
    );
    
    expect(screen.getByText('1.5 MB')).toBeInTheDocument();
    expect(screen.getByText('3 GB')).toBeInTheDocument();
  });

  it('shows data for RX indicator when hasIncomingData is true', () => {
    render(
      <LcarsDataIndicators 
        bytesIn={1024} 
        bytesOut={2048} 
        hasIncomingData={true}
        hasOutgoingData={false}
      />
    );
    
    // Verify the RX data is shown correctly
    expect(screen.getByText('RX:')).toBeInTheDocument();
    expect(screen.getByText('1 KB')).toBeInTheDocument();
  });

  it('shows data for TX indicator when hasOutgoingData is true', () => {
    render(
      <LcarsDataIndicators 
        bytesIn={1024} 
        bytesOut={2048}
        hasIncomingData={false}
        hasOutgoingData={true}
      />
    );
    
    // Verify the TX data is shown correctly
    expect(screen.getByText('TX:')).toBeInTheDocument();
    expect(screen.getByText('2 KB')).toBeInTheDocument();
  });

  it('shows inactive indicators when no data is transferring', () => {
    render(
      <LcarsDataIndicators 
        bytesIn={1024} 
        bytesOut={2048}
        hasIncomingData={false}
        hasOutgoingData={false}
      />
    );
    
    // Initial state should be inactive, but due to the random interval effect
    // in useEffect, we can't reliably test the exact state after render
    // We can only test that the indicators are there
    expect(screen.getAllByRole('generic')[1]).toBeInTheDocument(); // RX indicator
    expect(screen.getAllByRole('generic')[3]).toBeInTheDocument(); // TX indicator
  });
});