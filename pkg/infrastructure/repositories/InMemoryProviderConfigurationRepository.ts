/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { LoggerService } from '../../domain/services/LoggerService';
import { ProviderConfigurationRepository } from '../../domain/repositories/ProviderConfigurationRepository';
import { ProviderConfiguration } from '../../usecases/provider/ProviderConfigurationUseCase';

/**
 * In-memory implementation of the provider configuration repository
 */
export class InMemoryProviderConfigurationRepository implements ProviderConfigurationRepository {
  private configurations: Map<string, ProviderConfiguration> = new Map();
  private defaultConfigurations: Map<string, string> = new Map();
  
  constructor(private logger: LoggerService) {}
  
  /**
   * Save a provider configuration
   */
  async saveConfiguration(configuration: ProviderConfiguration): Promise<ProviderConfiguration> {
    this.logger.debug(`Saving configuration ${configuration.id} for provider ${configuration.providerId}`);
    
    // Set updated timestamp
    configuration.updatedAt = new Date();
    
    // Save configuration
    this.configurations.set(configuration.id, { ...configuration });
    
    // Set as default if specified
    if (configuration.isDefault) {
      await this.setDefaultConfiguration(configuration.providerId, configuration.id);
    }
    
    return { ...configuration };
  }
  
  /**
   * Get a configuration by ID
   */
  async getConfiguration(id: string): Promise<ProviderConfiguration | null> {
    const configuration = this.configurations.get(id);
    return configuration ? { ...configuration } : null;
  }
  
  /**
   * Get all configurations
   */
  async getAllConfigurations(): Promise<ProviderConfiguration[]> {
    return Array.from(this.configurations.values()).map(config => ({ ...config }));
  }
  
  /**
   * Get configurations for a provider
   */
  async getConfigurationsByProvider(providerId: string): Promise<ProviderConfiguration[]> {
    return Array.from(this.configurations.values())
      .filter(config => config.providerId === providerId)
      .map(config => ({ ...config }));
  }
  
  /**
   * Get default configuration for a provider
   */
  async getDefaultConfiguration(providerId: string): Promise<ProviderConfiguration | null> {
    const defaultConfigId = this.defaultConfigurations.get(providerId);
    
    if (!defaultConfigId) {
      return null;
    }
    
    const configuration = this.configurations.get(defaultConfigId);
    return configuration ? { ...configuration } : null;
  }
  
  /**
   * Delete a configuration
   */
  async deleteConfiguration(id: string): Promise<boolean> {
    this.logger.debug(`Deleting configuration ${id}`);
    
    // Get configuration
    const configuration = this.configurations.get(id);
    
    if (!configuration) {
      return false;
    }
    
    // Check if it's the default configuration
    if (configuration.isDefault) {
      this.defaultConfigurations.delete(configuration.providerId);
    }
    
    // Delete configuration
    this.configurations.delete(id);
    
    return true;
  }
  
  /**
   * Set a configuration as default for a provider
   */
  async setDefaultConfiguration(providerId: string, configId: string): Promise<boolean> {
    this.logger.debug(`Setting configuration ${configId} as default for provider ${providerId}`);
    
    // Verify configuration exists
    const configuration = this.configurations.get(configId);
    
    if (!configuration) {
      return false;
    }
    
    if (configuration.providerId !== providerId) {
      return false;
    }
    
    // Update previous default configuration
    const previousDefaultConfigId = this.defaultConfigurations.get(providerId);
    
    if (previousDefaultConfigId && previousDefaultConfigId !== configId) {
      const previousDefaultConfig = this.configurations.get(previousDefaultConfigId);
      
      if (previousDefaultConfig) {
        previousDefaultConfig.isDefault = false;
        this.configurations.set(previousDefaultConfigId, previousDefaultConfig);
      }
    }
    
    // Set new default configuration
    configuration.isDefault = true;
    this.configurations.set(configId, configuration);
    this.defaultConfigurations.set(providerId, configId);
    
    return true;
  }
}