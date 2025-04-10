/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { ProviderConfiguration } from '../../usecases/provider/ProviderConfigurationUseCase';

/**
 * Repository interface for provider configurations
 */
export interface ProviderConfigurationRepository {
  /**
   * Save a provider configuration
   */
  saveConfiguration(configuration: ProviderConfiguration): Promise<ProviderConfiguration>;
  
  /**
   * Get a configuration by ID
   */
  getConfiguration(id: string): Promise<ProviderConfiguration | null>;
  
  /**
   * Get all configurations
   */
  getAllConfigurations(): Promise<ProviderConfiguration[]>;
  
  /**
   * Get configurations for a provider
   */
  getConfigurationsByProvider(providerId: string): Promise<ProviderConfiguration[]>;
  
  /**
   * Get default configuration for a provider
   */
  getDefaultConfiguration(providerId: string): Promise<ProviderConfiguration | null>;
  
  /**
   * Delete a configuration
   */
  deleteConfiguration(id: string): Promise<boolean>;
  
  /**
   * Set a configuration as default for a provider
   */
  setDefaultConfiguration(providerId: string, configId: string): Promise<boolean>;
}