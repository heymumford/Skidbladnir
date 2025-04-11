/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React from 'react';

// Mock implementation of TestCasePreviewComponent
export const TestCasePreviewComponent = ({ testCaseId, sourceProviderId, targetProviderId }) => {
  return (
    <div data-testid="test-case-preview">
      Test Case Preview for {testCaseId} (Source: {sourceProviderId}, Target: {targetProviderId})
    </div>
  );
};