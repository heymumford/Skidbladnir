/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { 
  TransformationConfigurationPort, 
  TransformationConfiguration 
} from '../../usecases/transformation/TransformTestCasesUseCase';
import { LoggerService } from '../../interfaces/LoggerService';

/**
 * In-memory implementation of TransformationConfigurationPort.
 * 
 * This is a simple implementation for testing and development.
 * In a production environment, this would be replaced with a persistent storage solution.
 */
export class InMemoryTransformationConfigurationRepository implements TransformationConfigurationPort {
  private configurations: Map<string, TransformationConfiguration> = new Map();
  private defaultConfigurations: Map<string, string> = new Map();
  
  constructor(private readonly logger: LoggerService) {
    // Initialize with some default configurations
    this.initializeDefaultConfigurations();
  }
  
  /**
   * Get a transformation configuration by ID.
   * 
   * @param configurationId Configuration ID
   * @returns Transformation configuration or null if not found
   */
  async getTransformationConfiguration(configurationId: string): Promise<TransformationConfiguration | null> {
    this.logger.debug(`Getting transformation configuration with ID: ${configurationId}`);
    
    const configuration = this.configurations.get(configurationId);
    
    if (!configuration) {
      this.logger.debug(`Configuration not found with ID: ${configurationId}`);
      return null;
    }
    
    return { ...configuration };
  }
  
  /**
   * Save a transformation configuration.
   * 
   * @param configuration Transformation configuration
   * @returns Saved configuration
   */
  async saveTransformationConfiguration(configuration: TransformationConfiguration): Promise<TransformationConfiguration> {
    this.logger.debug(`Saving transformation configuration with ID: ${configuration.id}`);
    
    const configToSave = { ...configuration };
    this.configurations.set(configuration.id, configToSave);
    
    // If this is the first configuration for this source-target pair, set it as default
    const key = this.getDefaultConfigKey(configuration.sourceSystem, configuration.targetSystem);
    if (!this.defaultConfigurations.has(key)) {
      this.defaultConfigurations.set(key, configuration.id);
      this.logger.debug(`Set as default configuration for ${configuration.sourceSystem} to ${configuration.targetSystem}`);
    }
    
    return configToSave;
  }
  
  /**
   * Delete a transformation configuration.
   * 
   * @param configurationId Configuration ID
   * @returns True if deleted, false otherwise
   */
  async deleteTransformationConfiguration(configurationId: string): Promise<boolean> {
    this.logger.debug(`Deleting transformation configuration with ID: ${configurationId}`);
    
    const configuration = this.configurations.get(configurationId);
    if (!configuration) {
      this.logger.debug(`Configuration not found with ID: ${configurationId}`);
      return false;
    }
    
    const deleted = this.configurations.delete(configurationId);
    
    // Check if this was a default configuration and remove the reference
    const key = this.getDefaultConfigKey(configuration.sourceSystem, configuration.targetSystem);
    if (this.defaultConfigurations.get(key) === configurationId) {
      this.defaultConfigurations.delete(key);
      this.logger.debug(`Removed default configuration reference for ${configuration.sourceSystem} to ${configuration.targetSystem}`);
    }
    
    return deleted;
  }
  
  /**
   * Get the default configuration for a source and target system.
   * 
   * @param sourceSystem Source system identifier
   * @param targetSystem Target system identifier
   * @returns Default configuration or null if none exists
   */
  async getDefaultConfiguration(sourceSystem: string, targetSystem: string): Promise<TransformationConfiguration | null> {
    this.logger.debug(`Getting default configuration for ${sourceSystem} to ${targetSystem}`);
    
    const key = this.getDefaultConfigKey(sourceSystem, targetSystem);
    const configId = this.defaultConfigurations.get(key);
    
    if (!configId) {
      this.logger.debug(`No default configuration found for ${sourceSystem} to ${targetSystem}`);
      return null;
    }
    
    return this.getTransformationConfiguration(configId);
  }
  
  /**
   * Initialize with some default configurations.
   */
  private initializeDefaultConfigurations(): void {
    this.logger.debug('Initializing default transformation configurations');
    
    // qTest to Zephyr configuration
    const qtestToZephyr: TransformationConfiguration = {
      id: 'default-qtest-to-zephyr',
      name: 'Default qTest to Zephyr',
      sourceSystem: 'qtest',
      targetSystem: 'zephyr',
      fieldMappings: {
        // qTest to Zephyr field mappings
        'name': 'name',
        'description': 'description',
        'objective': 'objective',
        'precondition': 'precondition',
        'test_steps': 'steps'
      },
      valueMappings: {
        // Status mappings
        'status': {
          '1': 'DRAFT',        // Draft
          '2': 'READY',        // Ready for Review
          '3': 'APPROVED',     // Approved
          '4': 'DRAFT',        // Needs Work
          '5': 'READY',        // Ready
          '6': 'DEPRECATED'    // Deprecated
        },
        // Priority mappings
        'priority': {
          '1': 'CRITICAL',     // Critical
          '2': 'HIGH',         // High
          '3': 'MEDIUM',       // Medium
          '4': 'LOW'           // Low
        }
      }
    };
    
    // Zephyr to qTest configuration
    const zephyrToQTest: TransformationConfiguration = {
      id: 'default-zephyr-to-qtest',
      name: 'Default Zephyr to qTest',
      sourceSystem: 'zephyr',
      targetSystem: 'qtest',
      fieldMappings: {
        // Zephyr to qTest field mappings
        'name': 'name',
        'description': 'description',
        'objective': 'objective',
        'precondition': 'precondition',
        'steps': 'test_steps'
      },
      valueMappings: {
        // Status mappings
        'status': {
          'DRAFT': '1',        // Draft
          'READY': '5',        // Ready
          'APPROVED': '3',     // Approved
          'DEPRECATED': '6'    // Deprecated
        },
        // Priority mappings
        'priority': {
          'LOW': '4',          // Low
          'MEDIUM': '3',       // Medium
          'HIGH': '2',         // High
          'CRITICAL': '1'      // Critical
        }
      }
    };
    
    // Save configurations and set as defaults
    this.configurations.set(qtestToZephyr.id, qtestToZephyr);
    this.configurations.set(zephyrToQTest.id, zephyrToQTest);
    
    this.defaultConfigurations.set(
      this.getDefaultConfigKey('qtest', 'zephyr'),
      qtestToZephyr.id
    );
    
    this.defaultConfigurations.set(
      this.getDefaultConfigKey('zephyr', 'qtest'),
      zephyrToQTest.id
    );
  }
  
  /**
   * Get the key for the default configuration map.
   * 
   * @param sourceSystem Source system identifier
   * @param targetSystem Target system identifier
   * @returns Key for the default configuration map
   */
  private getDefaultConfigKey(sourceSystem: string, targetSystem: string): string {
    return `${sourceSystem}:${targetSystem}`;
  }
}