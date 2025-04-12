/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

// Mock Feature Flags for testing

// Enum for feature flags
const Feature = {
  WIZARD_INTERFACE: 'wizardInterface',
  ENHANCED_PROVIDERS: 'enhancedProviders',
  PERFORMANCE_MONITORING: 'performanceMonitoring',
  ADVANCED_TRANSFORMATIONS: 'advancedTransformations',
  DARK_MODE: 'darkMode',
  OPERATION_DEPENDENCY_GRAPH: 'operationDependencyGraph',
  ATTACHMENT_PREVIEW: 'attachmentPreview',
  AI_ASSISTANCE: 'aiAssistance',
  REAL_TIME_UPDATES: 'realTimeUpdates',
  ERROR_REMEDIATION: 'errorRemediation',
};

// Mock feature flag service
const defaultFeatureFlagService = {
  isEnabled: (id) => true, // All features are enabled by default in tests
  getEnvironment: () => 'test',
  getUserRoles: () => ['admin'],
  getFeatureFlags: () => ({}),
  setFeatureFlags: () => {},
  setEnvironment: () => {},
  setUserRoles: () => {},
  updateFeatureFlag: () => {}
};

module.exports = {
  Feature,
  defaultFeatureFlagService
};