/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

const React = require('react');

// Mock FeatureFlag context
const useFeature = (featureId) => {
  return true; // All features are enabled in tests
};

const useFeatureFlags = () => {
  return {
    isEnabled: (featureId) => true, // All features are enabled in tests
    getEnabledFeatures: () => [],
    setFeature: () => {}
  };
};

const FeatureFlagProvider = ({ children }) => {
  return React.createElement(React.Fragment, null, children);
};

module.exports = {
  useFeature,
  useFeatureFlags,
  FeatureFlagProvider
};