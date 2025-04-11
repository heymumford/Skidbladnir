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
  ProviderConfig as _ProviderConfig
} from '../../common/src/interfaces/provider';

import { QTestProvider, QTestProviderConfig } from './index';
import { QTestManagerProvider, QTestManagerProviderConfig as _QTestManagerProviderConfig } from './manager-provider';
import { QTestParametersProvider, QTestParametersProviderConfig as _QTestParametersProviderConfig } from './parameters-provider';
import { QTestScenarioProvider, QTestScenarioProviderConfig as _QTestScenarioProviderConfig } from './scenario-provider';
import { QTestPulseProvider, QTestPulseProviderConfig as _QTestPulseProviderConfig } from './pulse-provider';
import { QTestDataExportProvider, QTestDataExportProviderConfig as _QTestDataExportProviderConfig } from './data-export-provider';

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
        return new QTestParametersProvider();
      
      case QTestProductType.SCENARIO:
        return new QTestScenarioProvider();
      
      case QTestProductType.PULSE:
        return new QTestPulseProvider();
      
      case QTestProductType.DATA_EXPORT:
        return new QTestDataExportProvider();
      
      default:
        // Fall back to standard provider
        return new QTestProvider();
    }
  }
}