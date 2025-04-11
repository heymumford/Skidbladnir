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
export * from './parameters-client';
export * from './scenario-client';
export * from './data-export-client';
export * from './pulse-client';

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
export async function getQTestClient(product: QTestProduct, config: any) {
  // Using dynamic import to avoid circular dependencies
  let clientModule;
  
  switch(product) {
    case QTestProduct.MANAGER:
      clientModule = await import('./manager-client');
      return new clientModule.QTestManagerClient(config);
    
    case QTestProduct.PARAMETERS:
      clientModule = await import('./parameters-client');
      return new clientModule.QTestParametersClient(config);
    
    case QTestProduct.SCENARIO:
      clientModule = await import('./scenario-client');
      return new clientModule.QTestScenarioClient(config);
    
    case QTestProduct.PULSE:
      clientModule = await import('./pulse-client');
      return new clientModule.QTestPulseClient(config);
    
    case QTestProduct.DATA_EXPORT:
      // Will be implemented in future tasks
      throw new Error('QTest Data Export client not yet implemented');
    
    default:
      // Fall back to standard client
      clientModule = await import('../api-client');
      return new clientModule.QTestClient(config);
  }
}