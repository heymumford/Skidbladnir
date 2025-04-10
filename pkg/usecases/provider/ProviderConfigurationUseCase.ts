/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { LoggerService } from '../../domain/services/LoggerService';
import { 
  TestManagementProvider, 
  ProviderConfig,
  ConnectionStatus
} from '../../../packages/common/src/interfaces/provider';

/**
 * Provider configuration entity
 */
export interface ProviderConfiguration {
  id: string;
  providerId: string;
  name: string;
  config: ProviderConfig;
  createdAt: Date;
  updatedAt: Date;
  lastConnectionStatus?: ConnectionStatus;
  isDefault?: boolean;
}

/**
 * Input for saving a provider configuration
 */
export interface SaveConfigurationInput {
  id?: string;
  providerId: string;
  name: string;
  config: ProviderConfig;
  testConnection?: boolean;
  makeDefault?: boolean;
  isDefault?: boolean;
}

/**
 * Result of saving a configuration
 */
export interface SaveConfigurationResult {
  configuration?: ProviderConfiguration;
  success: boolean;
  connectionStatus?: ConnectionStatus;
  error?: string;
}

/**
 * Input for getting provider configurations
 */
export interface GetConfigurationsInput {
  providerId?: string;
}

/**
 * Input for testing a configuration
 */
export interface TestConfigurationInput {
  configId: string;
}

/**
 * Result of testing a configuration
 */
export interface TestConfigurationResult {
  success: boolean;
  configId?: string;
  providerId?: string;
  name?: string;
  status?: ConnectionStatus;
  error?: string;
}

/**
 * Input for removing a configuration
 */
export interface RemoveConfigurationInput {
  configId: string;
}

/**
 * Provider configuration use case for managing provider configurations
 */
export class ProviderConfigurationUseCase {
  private logger: LoggerService;
  private configurations: Map<string, ProviderConfiguration> = new Map();
  private defaultConfigurations: Map<string, string> = new Map();
  
  constructor(
    loggerService: LoggerService,
    private readonly getProviderById: (id: string) => TestManagementProvider
  ) {
    this.logger = loggerService;
  }
  
  /**
   * Save a provider configuration
   */
  async saveConfiguration(input: SaveConfigurationInput): Promise<SaveConfigurationResult> {
    try {
      // Validate required fields
      if (!input.name || input.name.trim() === '') {
        return {
          configuration: null!,
          success: false,
          error: 'Name is required'
        };
      }
      
      if (!input.providerId || input.providerId.trim() === '') {
        return {
          configuration: null!,
          success: false,
          error: 'Provider ID is required'
        };
      }
      
      // Get provider to validate it exists
      const provider = this.getProviderById(input.providerId);
      
      // Check if we're updating an existing configuration or creating a new one
      let configId = input.id;
      
      if (!configId) {
        // Generate ID for new configuration
        configId = `${input.providerId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      }
      
      // Initialize configuration
      const configuration: ProviderConfiguration = {
        id: configId,
        providerId: input.providerId,
        name: input.name,
        config: { ...input.config },
        createdAt: new Date(),
        updatedAt: new Date(),
        isDefault: input.makeDefault || false
      };
      
      // Test connection if requested
      let connectionStatus: ConnectionStatus | undefined;
      
      if (input.testConnection) {
        try {
          await provider.initialize(input.config);
          connectionStatus = await provider.testConnection();
          configuration.lastConnectionStatus = connectionStatus;
          
          if (!connectionStatus.connected) {
            return {
              configuration,
              success: false,
              connectionStatus,
              error: connectionStatus.error || 'Connection test failed'
            };
          }
        } catch (error) {
          this.logger.error(`Connection test failed: ${error instanceof Error ? error.message : String(error)}`);
          
          return {
            configuration,
            success: false,
            connectionStatus: {
              connected: false,
              error: `Connection test failed: ${error instanceof Error ? error.message : String(error)}`
            },
            error: `Connection test failed: ${error instanceof Error ? error.message : String(error)}`
          };
        }
      }
      
      // Save configuration
      this.configurations.set(configId, configuration);
      
      // Set as default if requested or if it's the first configuration for this provider
      if (input.makeDefault || !this.defaultConfigurations.has(input.providerId)) {
        this.setDefaultConfiguration(input.providerId, configId);
      }
      
      this.logger.info(`Saved configuration ${configId} for provider ${input.providerId}: ${input.name}`);
      
      return {
        configuration,
        success: true,
        connectionStatus
      };
    } catch (error) {
      this.logger.error(`Failed to save configuration: ${error instanceof Error ? error.message : String(error)}`);
      
      return {
        configuration: null!,
        success: false,
        error: `Failed to save configuration: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  /**
   * Get all configurations or configurations for a specific provider
   */
  getConfigurations(input?: GetConfigurationsInput): ProviderConfiguration[] {
    const configurations = Array.from(this.configurations.values());
    
    if (input?.providerId) {
      return configurations.filter(config => config.providerId === input.providerId);
    }
    
    return configurations;
  }
  
  /**
   * Get all configurations
   */
  async getAllConfigurations(): Promise<ProviderConfiguration[]> {
    return Array.from(this.configurations.values());
  }
  
  /**
   * Get a configuration by ID
   */
  async getConfiguration(configId: string): Promise<{
    success: boolean;
    configuration?: ProviderConfiguration;
    error?: string;
  }> {
    const configuration = this.configurations.get(configId);
    
    if (!configuration) {
      return {
        success: false,
        error: 'Configuration not found'
      };
    }
    
    return {
      success: true,
      configuration
    };
  }
  
  /**
   * Get configurations by provider ID
   */
  async getConfigurationsByProvider(providerId: string): Promise<{
    success: boolean;
    configurations?: ProviderConfiguration[];
    error?: string;
  }> {
    const configurations = Array.from(this.configurations.values())
      .filter(config => config.providerId === providerId);
    
    return {
      success: true,
      configurations
    };
  }
  
  /**
   * Get the default configuration for a provider
   */
  getDefaultConfiguration(providerId: string): ProviderConfiguration | null {
    const defaultConfigId = this.defaultConfigurations.get(providerId);
    
    if (!defaultConfigId) {
      return null;
    }
    
    return this.configurations.get(defaultConfigId) || null;
  }
  
  /**
   * Set a configuration as the default for a provider
   */
  setDefaultConfiguration(providerId: string, configId: string): void {
    // Verify configuration exists
    const configuration = this.configurations.get(configId);
    
    if (!configuration) {
      throw new Error(`Configuration ${configId} not found`);
    }
    
    if (configuration.providerId !== providerId) {
      throw new Error(`Configuration ${configId} does not belong to provider ${providerId}`);
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
    
    this.logger.info(`Set configuration ${configId} as default for provider ${providerId}`);
  }
  
  /**
   * Test a configuration
   */
  async testConfiguration(input: TestConfigurationInput): Promise<{
    success: boolean;
    configId?: string;
    providerId?: string;
    name?: string;
    status?: ConnectionStatus;
    error?: string;
  }> {
    // Get configuration
    const configuration = this.configurations.get(input.configId);
    
    if (!configuration) {
      return {
        success: false,
        error: 'Configuration not found'
      };
    }
    
    // Get provider
    const provider = this.getProviderById(configuration.providerId);
    
    if (!provider) {
      return {
        success: false,
        error: 'Provider not found'
      };
    }
    
    try {
      // Initialize provider with configuration
      await provider.initialize(configuration.config);
      
      // Test connection
      const connectionStatus = await provider.testConnection();
      
      // Update configuration status
      configuration.lastConnectionStatus = connectionStatus;
      configuration.updatedAt = new Date();
      this.configurations.set(input.configId, configuration);
      
      return {
        success: true,
        configId: input.configId,
        providerId: configuration.providerId,
        name: configuration.name,
        status: connectionStatus
      };
    } catch (error) {
      this.logger.error(`Connection test failed: ${error instanceof Error ? error.message : String(error)}`);
      
      const errorConnectionStatus: ConnectionStatus = {
        connected: false,
        error: `Connection test failed: ${error instanceof Error ? error.message : String(error)}`
      };
      
      // Update configuration status
      configuration.lastConnectionStatus = errorConnectionStatus;
      configuration.updatedAt = new Date();
      this.configurations.set(input.configId, configuration);
      
      return {
        success: false,
        configId: input.configId,
        providerId: configuration.providerId,
        name: configuration.name,
        status: errorConnectionStatus,
        error: `Connection test failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  /**
   * Delete a configuration
   */
  async deleteConfiguration(configId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    // Get configuration
    const configuration = this.configurations.get(configId);
    
    if (!configuration) {
      return {
        success: false,
        error: 'Configuration not found'
      };
    }
    
    // Check if it's the default configuration
    if (configuration.isDefault) {
      this.defaultConfigurations.delete(configuration.providerId);
    }
    
    // Remove configuration
    this.configurations.delete(configId);
    
    this.logger.info(`Removed configuration ${configId} for provider ${configuration.providerId}: ${configuration.name}`);
    
    return {
      success: true
    };
  }
  
  /**
   * Remove a configuration (deprecated, use deleteConfiguration instead)
   */
  removeConfiguration(input: RemoveConfigurationInput): boolean {
    // Get configuration
    const configuration = this.configurations.get(input.configId);
    
    if (!configuration) {
      return false;
    }
    
    // Check if it's the default configuration
    if (configuration.isDefault) {
      this.defaultConfigurations.delete(configuration.providerId);
    }
    
    // Remove configuration
    this.configurations.delete(input.configId);
    
    this.logger.info(`Removed configuration ${input.configId} for provider ${configuration.providerId}: ${configuration.name}`);
    
    return true;
  }
}