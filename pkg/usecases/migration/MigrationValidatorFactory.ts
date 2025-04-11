/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { MigrationValidator } from './MigrationValidator';
import { LoggerService } from '../../domain/services/LoggerService';
import { SourceProvider, TargetProvider } from '../../../packages/common/src/interfaces/provider';

/**
 * Factory for creating MigrationValidator instances
 */
export interface MigrationValidatorFactory {
  createValidator(
    sourceProviderType: string,
    targetProviderType: string
  ): Promise<MigrationValidator>;
}

/**
 * Implementation of MigrationValidatorFactory
 * 
 * Creates MigrationValidator instances for specific provider combinations
 */
export class MigrationValidatorFactoryImpl implements MigrationValidatorFactory {
  constructor(
    private readonly sourceProviderFactory: ProviderFactory,
    private readonly targetProviderFactory: ProviderFactory,
    private readonly loggerService?: LoggerService
  ) {}
  
  /**
   * Create a MigrationValidator for specific source and target providers
   */
  async createValidator(
    sourceProviderType: string,
    targetProviderType: string
  ): Promise<MigrationValidator> {
    const logger = this.loggerService?.child?.('MigrationValidatorFactory') || this.loggerService;
    
    logger?.debug('Creating migration validator', {
      sourceProvider: sourceProviderType,
      targetProvider: targetProviderType
    });
    
    // Create provider instances
    const sourceProvider = this.sourceProviderFactory.createProvider(sourceProviderType);
    const targetProvider = this.targetProviderFactory.createProvider(targetProviderType);
    
    if (!sourceProvider) {
      throw new Error(`Source provider '${sourceProviderType}' not found`);
    }
    
    if (!targetProvider) {
      throw new Error(`Target provider '${targetProviderType}' not found`);
    }
    
    // Create validator instance
    return new MigrationValidator(
      sourceProvider as SourceProvider,
      targetProvider as TargetProvider,
      logger
    );
  }
}

/**
 * Provider factory interface
 */
export interface ProviderFactory {
  createProvider(providerType: string): any;
}