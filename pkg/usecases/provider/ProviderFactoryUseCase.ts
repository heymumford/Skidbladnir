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

/**
 * Input for creating a provider
 */
export interface CreateProviderInput {
  type: string;
  options?: Record<string, any>;
}

/**
 * Result for provider creation
 */
export interface CreateProviderResult {
  provider?: TestManagementProvider;
  success: boolean;
  error?: string;
}

/**
 * Provider factory use case for creating provider instances
 */
export class ProviderFactoryUseCase {
  private logger: LoggerService;
  private providerRegistry: ProviderRegistry;
  private providerBuilders: Map<string, () => TestManagementProvider> = new Map();

  constructor(
    loggerService: LoggerService,
    providerRegistry?: ProviderRegistry
  ) {
    this.logger = loggerService;
    this.providerRegistry = providerRegistry || new ProviderRegistry();
  }

  /**
   * Register a provider builder
   */
  registerProviderBuilder(type: string, builder: () => TestManagementProvider): void {
    this.logger.info(`Registering provider builder for type: ${type}`);
    
    // Check if builder already exists
    if (this.providerBuilders.has(type)) {
      throw new Error(`Provider type already registered: ${type}`);
    }
    
    this.providerBuilders.set(type, builder);
  }

  /**
   * Create a provider instance
   */
  createProvider(input: CreateProviderInput): CreateProviderResult {
    try {
      this.logger.info(`Creating provider of type: ${input.type}`);
      
      // Check if we have a builder for this provider type
      const builder = this.providerBuilders.get(input.type);
      
      if (!builder) {
        return {
          provider: undefined,
          success: false,
          error: `Provider type not found: ${input.type}`
        };
      }
      
      // Create the provider
      const provider = builder();
      
      // Register the provider
      this.providerRegistry.registerProvider(provider);
      
      return {
        provider,
        success: true
      };
    } catch (error) {
      this.logger.error(`Failed to create provider of type ${input.type}: ${error instanceof Error ? error.message : String(error)}`);
      
      return {
        provider: undefined,
        success: false,
        error: `Failed to create provider: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Get available provider types
   */
  getAvailableProviderTypes(): string[] {
    return Array.from(this.providerBuilders.keys());
  }

  /**
   * Get provider registry
   */
  getProviderRegistry(): ProviderRegistry {
    return this.providerRegistry;
  }
}