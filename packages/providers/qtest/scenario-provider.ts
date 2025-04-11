/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * qTest Scenario Provider implementation
 * 
 * This provider implements the TestManagementProvider interface
 * specifically for qTest Scenario for BDD features.
 */

import {
  ProviderConfig,
  ConnectionStatus,
  TestCaseQueryOptions,
  EntityType,
  SourceProvider,
  TargetProvider
} from '../../common/src/interfaces/provider';

import {
  Project,
  TestCase
} from '../../common/src/models/entities';

import { PaginatedResult } from '../../common/src/models/paginated';

import { QTestProviderConfig, QTestProvider } from './index';
import {
  QTestScenarioClient,
  Feature,
  FeatureStatus,
  Step,
  StepType
} from './api-client/scenario-client';
import { ExternalServiceError } from '../../../pkg/domain/errors/DomainErrors';

/**
 * Enhanced qTest Scenario provider configuration
 */
export interface QTestScenarioProviderConfig extends QTestProviderConfig {
  /**
   * Default feature status for new features
   */
  defaultFeatureStatus?: FeatureStatus;
  
  /**
   * Default tags to apply to new features
   */
  defaultTags?: string[];
  
  /**
   * Maximum number of steps to fetch per request
   */
  maxStepsPerRequest?: number;
}

/**
 * BDD Feature with steps
 */
export interface BDDFeature extends Feature {
  steps: Step[];
}

/**
 * Gherkin Scenario structure
 */
export interface GherkinScenario {
  id?: string;
  name: string;
  description?: string;
  tags?: string[];
  steps: Array<{
    type: StepType;
    description: string;
  }>;
}

/**
 * qTest Scenario Provider specialization for BDD features
 */
export class QTestScenarioProvider extends QTestProvider {
  private scenarioClient: QTestScenarioClient | null = null;
  private scenarioConfig: QTestScenarioProviderConfig | null = null;
  
  /**
   * Override id to clearly identify the provider type
   */
  readonly id = 'qtest-scenario';
  
  /**
   * Override name to clearly identify the provider type
   */
  readonly name = 'qTest Scenario';
  
  /**
   * Initialize the provider with configuration
   */
  async initialize(config: QTestScenarioProviderConfig): Promise<void> {
    // First initialize the base provider
    await super.initialize(config);
    
    try {
      this.scenarioConfig = config;
      
      // Create specialized scenario client
      this.scenarioClient = new QTestScenarioClient({
        baseUrl: config.baseUrl,
        apiToken: config.apiToken,
        username: config.username,
        password: config.password,
        maxRequestsPerMinute: config.maxRequestsPerMinute,
        bypassSSL: config.bypassSSL,
        maxRetries: config.maxRetries
      });
    } catch (error) {
      throw this.wrapError('Failed to initialize qTest Scenario provider', error);
    }
  }
  
  /**
   * Test connection to qTest Scenario
   */
  async testConnection(): Promise<ConnectionStatus> {
    try {
      this.ensureScenarioClient();
      
      const isConnected = await this.scenarioClient!.testConnection();
      
      return {
        connected: isConnected,
        details: {
          metrics: this.scenarioClient!.getRateLimiterMetrics()
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        return {
          connected: false,
          error: `qTest Scenario API error: ${error.message}`
        };
      }
      
      return {
        connected: false,
        error: 'Unknown error occurred'
      };
    }
  }
  
  /**
   * Get BDD features
   */
  async getFeatures(
    projectId: string,
    options: {
      page?: number;
      pageSize?: number;
      status?: FeatureStatus;
      searchText?: string;
      tags?: string[];
    } = {}
  ): Promise<PaginatedResult<Feature>> {
    try {
      this.ensureScenarioClient();
      
      const numericProjectId = this.getProjectId(projectId);
      
      // Build filter for query
      const filter: Record<string, any> = {
        projectId: numericProjectId
      };
      
      if (options.status) {
        filter.status = options.status;
      }
      
      if (options.searchText) {
        filter.name = { $contains: options.searchText };
      }
      
      // Query features
      const response = await this.scenarioClient!.queryFeatures({
        page: options.page ? options.page - 1 : 0, // convert to 0-based indexing for API
        size: options.pageSize,
        filter,
        sort: 'name,asc',
        tags: options.tags
      });
      
      return {
        items: response.data.content,
        total: response.data.totalElements,
        page: response.data.number + 1, // qTest is 0-based, our API is 1-based
        pageSize: response.data.size
      };
    } catch (error) {
      throw this.wrapError(`Failed to get features for project ${projectId}`, error);
    }
  }
  
  /**
   * Get a feature by ID
   */
  async getFeature(
    projectId: string,
    featureId: string
  ): Promise<Feature> {
    try {
      this.ensureScenarioClient();
      
      const numericFeatureId = parseInt(featureId, 10);
      
      if (isNaN(numericFeatureId)) {
        throw new Error(`Invalid feature ID: ${featureId}`);
      }
      
      // Get feature
      const response = await this.scenarioClient!.getFeature(numericFeatureId);
      
      return response.data;
    } catch (error) {
      throw this.wrapError(`Failed to get feature ${featureId}`, error);
    }
  }
  
  /**
   * Get a BDD feature with its steps
   */
  async getBDDFeature(
    projectId: string,
    featureId: string
  ): Promise<BDDFeature> {
    try {
      // First get the feature
      const feature = await this.getFeature(projectId, featureId);
      
      // Then get the steps
      const numericFeatureId = parseInt(featureId, 10);
      const stepsResponse = await this.scenarioClient!.getFeatureSteps(numericFeatureId);
      
      // Return combined result
      return {
        ...feature,
        steps: stepsResponse.data.content || []
      };
    } catch (error) {
      throw this.wrapError(`Failed to get BDD feature ${featureId} with steps`, error);
    }
  }
  
  /**
   * Create a feature
   */
  async createFeature(
    projectId: string,
    feature: Feature
  ): Promise<string> {
    try {
      this.ensureScenarioClient();
      
      const numericProjectId = this.getProjectId(projectId);
      
      // Set defaults
      const featureToCreate: Feature = {
        ...feature,
        projectId: numericProjectId,
        status: feature.status || this.scenarioConfig?.defaultFeatureStatus || FeatureStatus.ACTIVE,
        tags: feature.tags || this.scenarioConfig?.defaultTags
      };
      
      // Create feature
      const response = await this.scenarioClient!.createFeature(featureToCreate);
      
      return response.data.id.toString();
    } catch (error) {
      throw this.wrapError(`Failed to create feature in project ${projectId}`, error);
    }
  }
  
  /**
   * Update a feature
   */
  async updateFeature(
    projectId: string,
    featureId: string,
    feature: Feature
  ): Promise<void> {
    try {
      this.ensureScenarioClient();
      
      const numericFeatureId = parseInt(featureId, 10);
      
      if (isNaN(numericFeatureId)) {
        throw new Error(`Invalid feature ID: ${featureId}`);
      }
      
      // Update feature
      await this.scenarioClient!.updateFeature(numericFeatureId, feature);
    } catch (error) {
      throw this.wrapError(`Failed to update feature ${featureId}`, error);
    }
  }
  
  /**
   * Delete a feature
   */
  async deleteFeature(
    projectId: string,
    featureId: string
  ): Promise<void> {
    try {
      this.ensureScenarioClient();
      
      const numericFeatureId = parseInt(featureId, 10);
      
      if (isNaN(numericFeatureId)) {
        throw new Error(`Invalid feature ID: ${featureId}`);
      }
      
      // Delete feature
      await this.scenarioClient!.deleteFeature(numericFeatureId);
    } catch (error) {
      throw this.wrapError(`Failed to delete feature ${featureId}`, error);
    }
  }
  
  /**
   * Get steps for a feature
   */
  async getFeatureSteps(
    projectId: string,
    featureId: string,
    options: {
      page?: number;
      pageSize?: number;
    } = {}
  ): Promise<PaginatedResult<Step>> {
    try {
      this.ensureScenarioClient();
      
      const numericFeatureId = parseInt(featureId, 10);
      
      if (isNaN(numericFeatureId)) {
        throw new Error(`Invalid feature ID: ${featureId}`);
      }
      
      // Query feature steps
      const response = await this.scenarioClient!.getFeatureSteps(
        numericFeatureId,
        {
          page: options.page ? options.page - 1 : 0, // convert to 0-based indexing for API
          size: options.pageSize || this.scenarioConfig?.maxStepsPerRequest || 100
        }
      );
      
      return {
        items: response.data.content,
        total: response.data.totalElements,
        page: response.data.number + 1, // qTest is 0-based, our API is 1-based
        pageSize: response.data.size
      };
    } catch (error) {
      throw this.wrapError(`Failed to get steps for feature ${featureId}`, error);
    }
  }
  
  /**
   * Create steps for a feature
   */
  async createFeatureSteps(
    projectId: string,
    featureId: string,
    steps: Step[]
  ): Promise<void> {
    try {
      this.ensureScenarioClient();
      
      const numericFeatureId = parseInt(featureId, 10);
      const numericProjectId = this.getProjectId(projectId);
      
      if (isNaN(numericFeatureId)) {
        throw new Error(`Invalid feature ID: ${featureId}`);
      }
      
      // Prepare steps with feature and project IDs
      const stepsToCreate = steps.map(step => ({
        ...step,
        featureId: numericFeatureId,
        projectId: numericProjectId
      }));
      
      // Add steps to feature
      await this.scenarioClient!.addFeatureSteps(numericFeatureId, stepsToCreate);
    } catch (error) {
      throw this.wrapError(`Failed to create steps for feature ${featureId}`, error);
    }
  }
  
  /**
   * Create a BDD feature with steps
   */
  async createBDDFeature(
    projectId: string,
    feature: BDDFeature
  ): Promise<string> {
    try {
      // First create the feature
      const featureId = await this.createFeature(projectId, {
        name: feature.name,
        description: feature.description,
        status: feature.status,
        tags: feature.tags
      });
      
      // Then add the steps
      if (feature.steps && feature.steps.length > 0) {
        await this.createFeatureSteps(projectId, featureId, feature.steps);
      }
      
      return featureId;
    } catch (error) {
      throw this.wrapError(`Failed to create BDD feature with steps in project ${projectId}`, error);
    }
  }
  
  /**
   * Convert a Gherkin scenario to a BDD feature
   */
  gherkinScenarioToBDDFeature(scenario: GherkinScenario): BDDFeature {
    return {
      name: scenario.name,
      description: scenario.description,
      tags: scenario.tags,
      steps: scenario.steps.map((step, index) => ({
        type: step.type,
        description: step.description,
        order: index + 1
      }))
    };
  }
  
  /**
   * Convert a BDD feature to a Gherkin scenario
   */
  bddFeatureToGherkinScenario(feature: BDDFeature): GherkinScenario {
    return {
      id: feature.id?.toString(),
      name: feature.name,
      description: feature.description,
      tags: feature.tags,
      steps: feature.steps.map(step => ({
        type: step.type,
        description: step.description
      }))
    };
  }
  
  /**
   * Format a BDD feature as Gherkin text
   */
  formatBDDFeatureAsGherkin(feature: BDDFeature): string {
    const lines: string[] = [];
    
    // Add tags
    if (feature.tags && feature.tags.length > 0) {
      lines.push(`@${feature.tags.join(' @')}`);
    }
    
    // Add feature name
    lines.push(`Feature: ${feature.name}`);
    
    // Add description if present
    if (feature.description) {
      lines.push('');
      feature.description.split('\n').forEach(line => lines.push(`  ${line}`));
    }
    
    // Scenario block
    lines.push('');
    lines.push('  Scenario: Main Scenario');
    lines.push('');
    
    // Add steps
    if (feature.steps && feature.steps.length > 0) {
      // Sort steps by order if available
      const sortedSteps = [...feature.steps].sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
        }
        return 0;
      });
      
      sortedSteps.forEach(step => {
        const stepType = step.type.charAt(0).toUpperCase() + step.type.slice(1);
        lines.push(`    ${stepType} ${step.description}`);
      });
    }
    
    return lines.join('\n');
  }
  
  /**
   * Parse Gherkin text into a BDD feature
   */
  parseGherkinText(gherkinText: string): BDDFeature {
    const lines = gherkinText.split('\n');
    const feature: BDDFeature = {
      name: '',
      steps: []
    };
    
    let currentSection: 'tags' | 'feature' | 'description' | 'steps' = 'tags';
    const descriptionLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) continue;
      
      // Parse tags
      if (line.startsWith('@') && currentSection === 'tags') {
        feature.tags = line.split(' ').filter(tag => tag.startsWith('@')).map(tag => tag.substring(1));
        continue;
      }
      
      // Parse feature name
      if (line.startsWith('Feature:')) {
        currentSection = 'feature';
        feature.name = line.substring('Feature:'.length).trim();
        continue;
      }
      
      // Parse description (anything between Feature and Scenario)
      if (currentSection === 'feature' && !line.startsWith('Scenario:')) {
        currentSection = 'description';
        descriptionLines.push(line);
        continue;
      }
      
      // Switch to steps after scenario
      if (line.startsWith('Scenario:')) {
        currentSection = 'steps';
        // Set description if we collected any lines
        if (descriptionLines.length > 0) {
          feature.description = descriptionLines.join('\n').trim();
        }
        continue;
      }
      
      // Parse steps
      if (currentSection === 'steps') {
        // Check for step keywords
        const stepTypes = ['Given', 'When', 'Then', 'And', 'But'];
        for (const stepType of stepTypes) {
          if (line.startsWith(stepType)) {
            const typeEnum = stepType.toLowerCase() as StepType;
            const description = line.substring(stepType.length).trim();
            
            feature.steps.push({
              type: typeEnum,
              description,
              order: feature.steps.length + 1
            });
            break;
          }
        }
      }
    }
    
    return feature;
  }
  
  // Helper methods
  
  /**
   * Ensure the scenario client is initialized
   */
  private ensureScenarioClient(): void {
    if (!this.scenarioClient || !this.scenarioConfig) {
      throw new Error('qTest Scenario provider not initialized. Call initialize() first.');
    }
  }
}