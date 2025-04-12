/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

const React = require('react');

// Mock implementation of JSONTree
const JSONTree = ({ data, theme, invertTheme, shouldExpandNode }) => {
  return React.createElement(
    'div',
    { 
      'data-testid': 'json-tree',
      'className': 'json-tree-mock'
    },
    React.createElement(
      'pre',
      null,
      `Mock JSON Tree: ${JSON.stringify(data, null, 2)}`
    )
  );
};

module.exports = JSONTree;
module.exports.default = JSONTree;