/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { LoggerService } from '../../domain/services/LoggerService';
import { TestManagementProvider, ProviderRegistry } from '../../../packages/common/src/interfaces/provider';
import { ProviderConfigurationRepository } from '../../domain/repositories/ProviderConfigurationRepository';
import { InMemoryProviderConfigurationRepository } from '../../infrastructure/repositories/InMemoryProviderConfigurationRepository';
import { ManageProvidersUseCase, MigrateTestCasesInput, MigrationResult } from './ManageProvidersUseCase';
import { ProviderFactoryUseCase, CreateProviderInput, CreateProviderResult } from './ProviderFactoryUseCase';
import { 
  ProviderConfigurationUseCase, 
  SaveConfigurationInput, 
  SaveConfigurationResult,
  TestConfigurationInput,
  TestConfigurationResult
} from './ProviderConfigurationUseCase';

/**
 * Facade for provider management
 * 
 * This class coordinates between the various provider-related use cases
 * and provides a simpler interface for the application to use.
 */
export class ProviderManagementFacade {
  private providerRegistry: ProviderRegistry;
  private providerRepository: ProviderConfigurationRepository;
  private manageProvidersUseCase: ManageProvidersUseCase;
  private providerFactoryUseCase: ProviderFactoryUseCase;
  private providerConfigurationUseCase: ProviderConfigurationUseCase;
  
  constructor(private logger: LoggerService) {
    this.providerRegistry = new ProviderRegistry();
    this.providerRepository = new InMemoryProviderConfigurationRepository(logger);
    
    this.manageProvidersUseCase = new ManageProvidersUseCase(
      logger,
      this.providerRegistry
    );
    
    this.providerFactoryUseCase = new ProviderFactoryUseCase(
      logger,
      this.providerRegistry
    );
    
    this.providerConfigurationUseCase = new ProviderConfigurationUseCase(
      logger,
      (providerId: string) => this.getProviderById(providerId)
    );
  }
  
  /**
   * Create a provider instance
   */
  createProvider(input: CreateProviderInput): CreateProviderResult {
    return this.providerFactoryUseCase.createProvider(input);
  }
  
  /**
   * Register a provider builder
   */
  registerProviderBuilder(type: string, builder: () => TestManagementProvider): void {
    this.providerFactoryUseCase.registerProviderBuilder(type, builder);
  }
  
  /**
   * Get available provider types
   */
  getAvailableProviderTypes(): string[] {
    return this.providerFactoryUseCase.getAvailableProviderTypes();
  }
  
  /**
   * Get all registered providers
   */
  getAllProviders(): TestManagementProvider[] {
    return this.manageProvidersUseCase.getAllProviders();
  }
  
  /**
   * Get a provider by ID
   */
  getProviderById(providerId: string): TestManagementProvider {
    const provider = this.providerRegistry.getProvider(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }
    return provider;
  }
  
  /**
   * Get all source providers
   */
  getSourceProviders(): TestManagementProvider[] {
    return this.manageProvidersUseCase.getSourceProviders();
  }
  
  /**
   * Get all target providers
   */
  getTargetProviders(): TestManagementProvider[] {
    return this.manageProvidersUseCase.getTargetProviders();
  }
  
  /**
   * Initialize a provider with configuration
   */
  async initializeProvider(providerId: string, config: any): Promise<void> {
    await this.manageProvidersUseCase.initializeProvider({
      providerId,
      config
    });
  }
  
  /**
   * Save a provider configuration
   */
  async saveProviderConfiguration(input: SaveConfigurationInput): Promise<SaveConfigurationResult> {
    const result = await this.providerConfigurationUseCase.saveConfiguration(input);
    
    if (result.success && result.configuration) {
      // Save to repository
      await this.providerRepository.saveConfiguration(result.configuration);
    }
    
    return result;
  }
  
  /**
   * Test connection to a provider
   */
  async testProviderConnection(providerId: string): Promise<TestConfigurationResult> {
    // Get default configuration
    const configuration = await this.providerRepository.getDefaultConfiguration(providerId);
    
    if (!configuration) {
      throw new Error(`No default configuration found for provider ${providerId}`);
    }
    
    return await this.providerConfigurationUseCase.testConfiguration({
      configId: configuration.id
    });
  }
  
  /**
   * Start a migration job
   */
  async startMigration(input: MigrateTestCasesInput): Promise<MigrationResult> {
    // Ensure providers are initialized
    const sourceConfiguration = await this.providerRepository.getDefaultConfiguration(input.sourceProviderId);
    const targetConfiguration = await this.providerRepository.getDefaultConfiguration(input.targetProviderId);
    
    if (!sourceConfiguration) {
      throw new Error(`No default configuration found for source provider ${input.sourceProviderId}`);
    }
    
    if (!targetConfiguration) {
      throw new Error(`No default configuration found for target provider ${input.targetProviderId}`);
    }
    
    // Initialize providers with their configurations
    await this.manageProvidersUseCase.initializeProvider({
      providerId: input.sourceProviderId,
      config: sourceConfiguration.config
    });
    
    await this.manageProvidersUseCase.initializeProvider({
      providerId: input.targetProviderId,
      config: targetConfiguration.config
    });
    
    // Start migration
    return await this.manageProvidersUseCase.startMigration(input);
  }
  
  /**
   * Get migration status
   */
  getMigrationStatus(jobId: string): MigrationResult | null {
    return this.manageProvidersUseCase.getMigrationStatus(jobId);
  }
}