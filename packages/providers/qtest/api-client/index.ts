/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

// Re-export all from the base API client
export * from '../api-client';

// Export specialized clients
export * from './manager-client';

/**
 * Factory to create appropriate qTest client based on target qTest product
 */
export enum QTestProduct {
  MANAGER = 'manager',
  PARAMETERS = 'parameters',
  SCENARIO = 'scenario',
  PULSE = 'pulse',
  DATA_EXPORT = 'data-export'
}

/**
 * Get appropriate qTest client based on target qTest product
 */
export function getQTestClient(product: QTestProduct, config: any) {
  switch(product) {
    case QTestProduct.MANAGER:
      // Import here to avoid circular dependencies
      const { QTestManagerClient } = require('./manager-client');
      return new QTestManagerClient(config);
    
    case QTestProduct.PARAMETERS:
      // Will be implemented in future tasks
      throw new Error('QTest Parameters client not yet implemented');
    
    case QTestProduct.SCENARIO:
      // Will be implemented in future tasks
      throw new Error('QTest Scenario client not yet implemented');
    
    case QTestProduct.PULSE:
      // Will be implemented in future tasks
      throw new Error('QTest Pulse client not yet implemented');
    
    case QTestProduct.DATA_EXPORT:
      // Will be implemented in future tasks
      throw new Error('QTest Data Export client not yet implemented');
    
    default:
      // Fall back to standard client
      const { QTestClient } = require('../api-client');
      return new QTestClient(config);
  }
}