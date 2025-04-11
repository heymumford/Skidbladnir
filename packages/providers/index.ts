/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Providers Registry
 * 
 * Central export point for all providers in the system
 */

// HP ALM Provider (now Micro Focus ALM)
export { createHPALMProvider } from './hp-alm';
export type { HPALMProviderConfig } from './hp-alm';

// TestRail Provider
export { createTestRailProvider } from './testrail';
export type { TestRailProviderConfig } from './testrail';

// Jama Software Provider
export { createJamaProvider } from './jama';
export type { JamaProviderConfig } from './jama';

// Visure Solutions Provider
export { createVisureProvider } from './visure';
export type { VisureProviderConfig, TraceabilityLink, TraceabilityLinkType, TraceDirection, Requirement } from './visure';

// Other providers
export * from './qtest';
export * from './zephyr';
export * from './azure-devops';
export * from './rally';
export * from './excel';

// Provider interfaces and common types
export {
  ProviderConfig,
  TestManagementProvider,
  SourceProvider,
  TargetProvider
} from '../common/src/interfaces/provider';