/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * qTest Provider Factory
 * 
 * Creates and manages different qTest providers based on configuration.
 */

import {
  TestManagementProvider,
  ProviderConfig
} from '../../common/src/interfaces/provider';

import { QTestProvider, QTestProviderConfig } from './index';
import { QTestManagerProvider, QTestManagerProviderConfig } from './manager-provider';

/**
 * qTest product types
 */
export enum QTestProductType {
  MANAGER = 'manager',
  PARAMETERS = 'parameters',
  SCENARIO = 'scenario',
  PULSE = 'pulse',
  DATA_EXPORT = 'data-export'
}

/**
 * Enhanced qTest provider configuration with product selection
 */
export interface QTestFactoryConfig extends QTestProviderConfig {
  /**
   * The qTest product to use
   */
  product?: QTestProductType;
  
  /**
   * Product-specific configuration
   */
  productConfig?: Record<string, any>;
}

/**
 * qTest provider factory
 */
export class QTestProviderFactory {
  /**
   * Create a qTest provider based on configuration
   */
  static createProvider(config: QTestFactoryConfig): TestManagementProvider {
    const product = config.product || QTestProductType.MANAGER;
    
    switch (product) {
      case QTestProductType.MANAGER:
        return new QTestManagerProvider();
      
      case QTestProductType.PARAMETERS:
        // Will be implemented in future tasks
        throw new Error('QTest Parameters provider not yet implemented');
      
      case QTestProductType.SCENARIO:
        // Will be implemented in future tasks
        throw new Error('QTest Scenario provider not yet implemented');
      
      case QTestProductType.PULSE:
        // Will be implemented in future tasks
        throw new Error('QTest Pulse provider not yet implemented');
      
      case QTestProductType.DATA_EXPORT:
        // Will be implemented in future tasks
        throw new Error('QTest Data Export provider not yet implemented');
      
      default:
        // Fall back to standard provider
        return new QTestProvider();
    }
  }
}