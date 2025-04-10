/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Canonical data model module for the translation layer.
 * 
 * This module provides the core components for bidirectional translation
 * between different test management systems.
 */

// Export canonical models
export * from './CanonicalModels';

// Export mapper interfaces
export * from './BaseMapper';

// Export transformer implementation
export * from './Transformer';

// Import mappers (don't export * to avoid naming conflicts)
import { QTestTestCaseMapper, QTestTestExecutionMapper } from './mappers/QTestMapper';
import { ZephyrTestCaseMapper, ZephyrTestExecutionMapper } from './mappers/ZephyrMapper';

// Export specific mapper classes
export {
  QTestTestCaseMapper,
  QTestTestExecutionMapper,
  ZephyrTestCaseMapper,
  ZephyrTestExecutionMapper
};

// Import register functions
import { registerMappers as registerQTestMappers } from './mappers/QTestMapper';
import { registerMappers as registerZephyrMappers } from './mappers/ZephyrMapper';

/**
 * Register all mappers with the registry.
 */
export function registerAllMappers(): void {
  registerQTestMappers();
  registerZephyrMappers();
}