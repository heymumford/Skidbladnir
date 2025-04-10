/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React from 'react';

// Mock implementation of JSONTree
const JSONTree = ({ data, theme, invertTheme, shouldExpandNode }) => {
  return (
    <div data-testid="json-tree">
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};

export default JSONTree;