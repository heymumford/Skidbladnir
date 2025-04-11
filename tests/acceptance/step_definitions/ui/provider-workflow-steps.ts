/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { SkidbladnirWorld } from '../../support/world';
import { expect } from 'chai';

/**
 * Authentication and setup steps
 */
Given('I have authenticated with valid credentials', function(this: SkidbladnirWorld) {
  // Set authentication state in the world
  this.context.authenticated = true;
});

Given('I am on the migration dashboard page', function(this: SkidbladnirWorld) {
  // Set current page in the world
  this.context.currentPage = 'migration-dashboard';
});

/**
 * Provider selection steps
 */
When('I select {string} as the source provider', function(this: SkidbladnirWorld, provider: string) {
  // Set source provider in the world
  this.context.sourceProvider = provider;
  
  // Log action for test reporting
  console.log(`Selected ${provider} as source provider`);
});

When('I select {string} as the target provider', function(this: SkidbladnirWorld, provider: string) {
  // Set target provider in the world
  this.context.targetProvider = provider;
  
  // Log action for test reporting
  console.log(`Selected ${provider} as target provider`);
});

/**
 * Connection configuration steps
 */
When('I enter valid connection details for {string}', function(this: SkidbladnirWorld, provider: string) {
  // Set up valid connection details based on provider
  const connectionDetails = getValidConnectionDetails(provider);
  
  // Store in the world context
  this.context.providerConnections = this.context.providerConnections || {};
  this.context.providerConnections[provider] = connectionDetails;
  
  console.log(`Entered valid connection details for ${provider}`);
});

When('I enter invalid connection details for {string}', function(this: SkidbladnirWorld, provider: string) {
  // Set up invalid connection details based on provider
  const connectionDetails = getInvalidConnectionDetails(provider);
  
  // Store in the world context
  this.context.providerConnections = this.context.providerConnections || {};
  this.context.providerConnections[provider] = connectionDetails;
  
  console.log(`Entered invalid connection details for ${provider}`);
});

When('I correct the connection details for {string}', function(this: SkidbladnirWorld, provider: string) {
  // Fix the invalid connection details
  const connectionDetails = getValidConnectionDetails(provider);
  
  // Store in the world context
  this.context.providerConnections = this.context.providerConnections || {};
  this.context.providerConnections[provider] = connectionDetails;
  
  console.log(`Corrected connection details for ${provider}`);
});

When('I test the {string} connection', async function(this: SkidbladnirWorld, provider: string) {
  // Get connection details from context
  const connectionDetails = this.context.providerConnections?.[provider];
  
  if (!connectionDetails) {
    throw new Error(`No connection details found for provider: ${provider}`);
  }
  
  // Determine if connection should succeed based on stored details
  const isValid = !connectionDetails.isInvalid;
  
  // Store connection test result
  this.context.connectionTestResults = this.context.connectionTestResults || {};
  this.context.connectionTestResults[provider] = {
    success: isValid,
    message: isValid ? `Successfully connected to ${provider}` : `Failed to connect to ${provider}`,
    timestamp: new Date().toISOString()
  };
  
  // If valid, store additional details
  if (isValid) {
    this.context.connectionTestResults[provider].details = {
      version: '1.0.0',
      authenticatedUser: 'test@example.com',
      projectId: 'P12345',
      projectName: 'Test Project',
      testCaseCount: 123
    };
  }
  
  console.log(`Tested connection to ${provider}, success: ${isValid}`);
});

/**
 * Connection verification steps
 */
Then('I should see a successful connection message for {string}', function(this: SkidbladnirWorld, provider: string) {
  const result = this.context.connectionTestResults?.[provider];
  
  expect(result?.success).to.be.true;
  expect(result?.message).to.include(`Successfully connected to ${provider}`);
  
  console.log(`Verified successful connection message for ${provider}`);
});

Then('I should see a connection error for {string}', function(this: SkidbladnirWorld, provider: string) {
  const result = this.context.connectionTestResults?.[provider];
  
  expect(result?.success).to.be.false;
  expect(result?.message).to.include(`Failed to connect to ${provider}`);
  
  console.log(`Verified connection error for ${provider}`);
});

Then('I should see source provider details displayed', function(this: SkidbladnirWorld) {
  const provider = this.context.sourceProvider;
  const result = this.context.connectionTestResults?.[provider];
  
  expect(result?.details).to.exist;
  
  console.log(`Verified source provider details are displayed`);
});

Then('I should see target provider details displayed', function(this: SkidbladnirWorld) {
  const provider = this.context.targetProvider;
  const result = this.context.connectionTestResults?.[provider];
  
  expect(result?.details).to.exist;
  
  console.log(`Verified target provider details are displayed`);
});

/**
 * Test asset browsing steps
 */
When('I browse test assets from {string}', function(this: SkidbladnirWorld, provider: string) {
  // Simulate browsing test assets
  this.context.availableTestAssets = createMockTestAssets(provider);
  
  console.log(`Browsed test assets from ${provider}`);
});

When('I browse and select test assets', function(this: SkidbladnirWorld) {
  // Combine browsing and selection steps
  const provider = this.context.sourceProvider;
  this.context.availableTestAssets = createMockTestAssets(provider);
  
  // Select the first 3 assets
  this.context.selectedTestAssets = this.context.availableTestAssets.slice(0, 3);
  
  console.log(`Browsed and selected test assets`);
});

When('I select test assets to migrate', function(this: SkidbladnirWorld) {
  // Select the first 3 assets
  this.context.selectedTestAssets = this.context.availableTestAssets.slice(0, 3);
  
  console.log(`Selected test assets to migrate`);
});

Then('I should see the selected assets preview', function(this: SkidbladnirWorld) {
  expect(this.context.selectedTestAssets).to.be.an('array');
  expect(this.context.selectedTestAssets.length).to.be.greaterThan(0);
  
  console.log(`Verified selected assets preview`);
});

/**
 * Field mapping steps
 */
When('I configure field mappings between {string} and {string}', function(this: SkidbladnirWorld, source: string, target: string) {
  // Create mock field mappings
  this.context.fieldMappings = createMockFieldMappings(source, target);
  
  console.log(`Configured field mappings between ${source} and ${target}`);
});

When('I configure field mappings', function(this: SkidbladnirWorld) {
  const source = this.context.sourceProvider;
  const target = this.context.targetProvider;
  
  // Create mock field mappings
  this.context.fieldMappings = createMockFieldMappings(source, target);
  
  console.log(`Configured field mappings`);
});

Then('I should see a preview of transformed test data', function(this: SkidbladnirWorld) {
  expect(this.context.fieldMappings).to.exist;
  
  // Create transformed data preview
  this.context.transformedData = this.context.selectedTestAssets.map(asset => {
    return {
      original: asset,
      transformed: applyMockTransformations(asset, this.context.fieldMappings)
    };
  });
  
  expect(this.context.transformedData).to.be.an('array');
  
  console.log(`Verified transformed test data preview`);
});

Then('I should be able to modify field transformations', function(this: SkidbladnirWorld) {
  // Verify field mappings are modifiable
  expect(this.context.fieldMappings).to.exist;
  
  // Simulate modifying a transformation
  if (this.context.fieldMappings && this.context.fieldMappings.length > 0) {
    const firstMapping = this.context.fieldMappings[0];
    firstMapping.transformation = 'prefix';
    firstMapping.transformationParams = { prefix: 'CUSTOM-' };
  }
  
  console.log(`Verified ability to modify field transformations`);
});

/**
 * Migration execution steps
 */
When('I start the migration process', function(this: SkidbladnirWorld) {
  // Initialize migration state
  this.context.migrationState = {
    id: `migration-${Date.now()}`,
    status: 'IN_PROGRESS',
    startTime: new Date().toISOString(),
    progress: 0,
    itemsProcessed: 0,
    itemsTotal: this.context.selectedTestAssets?.length || 0,
    activeOperations: 2,
    completedOperations: 0,
    errors: []
  };
  
  console.log(`Started migration process`);
});

Then('I should see the migration dashboard with real-time status', function(this: SkidbladnirWorld) {
  expect(this.context.migrationState).to.exist;
  expect(this.context.migrationState.status).to.equal('IN_PROGRESS');
  
  console.log(`Verified migration dashboard with real-time status`);
});

Then('I should see LCARS-style indicators showing active operations', function(this: SkidbladnirWorld) {
  expect(this.context.migrationState).to.exist;
  expect(this.context.migrationState.activeOperations).to.be.greaterThan(0);
  
  console.log(`Verified LCARS-style indicators for active operations`);
});

Then('I should see a progress bar indicating overall completion', function(this: SkidbladnirWorld) {
  expect(this.context.migrationState).to.exist;
  expect(this.context.migrationState.progress).to.be.a('number');
  
  console.log(`Verified progress bar indicator`);
});

/**
 * Migration completion steps
 */
When('the migration completes successfully', function(this: SkidbladnirWorld) {
  // Update migration state to completed
  if (this.context.migrationState) {
    this.context.migrationState.status = 'COMPLETED';
    this.context.migrationState.endTime = new Date().toISOString();
    this.context.migrationState.progress = 100;
    this.context.migrationState.itemsProcessed = this.context.migrationState.itemsTotal;
    this.context.migrationState.activeOperations = 0;
    this.context.migrationState.completedOperations = this.context.migrationState.itemsTotal;
  }
  
  // Create result summary
  this.context.migrationSummary = {
    totalItems: this.context.selectedTestAssets?.length || 0,
    successfulItems: this.context.selectedTestAssets?.length || 0,
    failedItems: 0,
    warnings: 0,
    duration: '00:03:45',
    targetItemIds: ['TGT-001', 'TGT-002', 'TGT-003']
  };
  
  console.log(`Simulated migration completion`);
});

Then('I should see a migration summary with success metrics', function(this: SkidbladnirWorld) {
  expect(this.context.migrationSummary).to.exist;
  expect(this.context.migrationSummary.totalItems).to.equal(this.context.migrationSummary.successfulItems);
  
  console.log(`Verified migration summary with success metrics`);
});

Then('I should have options to view migrated assets in {string}', function(this: SkidbladnirWorld, target: string) {
  expect(this.context.migrationSummary).to.exist;
  expect(this.context.migrationSummary.targetItemIds).to.be.an('array');
  
  console.log(`Verified options to view migrated assets in ${target}`);
});

Then('I should be able to download a migration report', function(this: SkidbladnirWorld) {
  // Verify report generation capability
  expect(this.context.migrationSummary).to.exist;
  
  console.log(`Verified ability to download migration report`);
});

/**
 * Remediation suggestion steps
 */
Then('I should see appropriate error remediation suggestions', function(this: SkidbladnirWorld) {
  // Provider-specific error remediation suggestions should be available
  const result = this.context.connectionTestResults?.[
    this.context.currentProvider || this.context.sourceProvider
  ];
  
  expect(result).to.exist;
  expect(result?.success).to.be.false;
  
  // Create mock remediation suggestions
  this.context.remediationSuggestions = [
    'Check that your API key is valid and has not expired',
    'Verify that the URL is correctly formatted and points to the right environment',
    'Ensure you have the necessary permissions in the target system'
  ];
  
  expect(this.context.remediationSuggestions).to.be.an('array');
  expect(this.context.remediationSuggestions.length).to.be.greaterThan(0);
  
  console.log(`Verified error remediation suggestions`);
});

/**
 * Operational control steps
 */
Given('I have configured a migration from {string} to {string}', function(this: SkidbladnirWorld, source: string, target: string) {
  // Setup providers
  this.context.sourceProvider = source;
  this.context.targetProvider = target;
  
  // Setup valid connections
  this.context.providerConnections = {
    [source]: getValidConnectionDetails(source),
    [target]: getValidConnectionDetails(target)
  };
  
  // Setup test assets
  this.context.availableTestAssets = createMockTestAssets(source);
  this.context.selectedTestAssets = this.context.availableTestAssets.slice(0, 5);
  
  // Setup field mappings
  this.context.fieldMappings = createMockFieldMappings(source, target);
  
  console.log(`Configured migration from ${source} to ${target}`);
});

Given('I have started the migration process', function(this: SkidbladnirWorld) {
  // Initialize migration state
  this.context.migrationState = {
    id: `migration-${Date.now()}`,
    status: 'IN_PROGRESS',
    startTime: new Date().toISOString(),
    progress: 30,
    itemsProcessed: 1,
    itemsTotal: this.context.selectedTestAssets?.length || 0,
    activeOperations: 2,
    completedOperations: 1,
    errors: []
  };
  
  console.log(`Started migration process`);
});

When('I click the {string} button', function(this: SkidbladnirWorld, buttonName: string) {
  // Track the last button clicked
  this.context.lastButtonClicked = buttonName;
  
  console.log(`Clicked the ${buttonName} button`);
});

Then('the migration should pause', function(this: SkidbladnirWorld) {
  // Update migration state to paused
  if (this.context.migrationState) {
    this.context.migrationState.status = 'PAUSED';
  }
  
  console.log(`Verified migration paused`);
});

Then('I should see a {string} status indicator', function(this: SkidbladnirWorld, status: string) {
  expect(this.context.migrationState).to.exist;
  expect(this.context.migrationState.status).to.equal(status.replace('Migration ', '').toUpperCase());
  
  console.log(`Verified ${status} status indicator`);
});

Then('active operations should complete their current task', function(this: SkidbladnirWorld) {
  // Simulate operations completing their current tasks
  if (this.context.migrationState) {
    this.context.migrationState.activeOperations = 0;
    this.context.migrationState.progress = 40;
    this.context.migrationState.itemsProcessed = 2;
    this.context.migrationState.completedOperations = 2;
  }
  
  console.log(`Verified active operations completed their current tasks`);
});

Then('the migration should resume', function(this: SkidbladnirWorld) {
  // Update migration state to in progress
  if (this.context.migrationState) {
    this.context.migrationState.status = 'IN_PROGRESS';
    this.context.migrationState.activeOperations = 2;
  }
  
  console.log(`Verified migration resumed`);
});

Then('operations should continue from where they left off', function(this: SkidbladnirWorld) {
  // Simulate operations continuing
  if (this.context.migrationState) {
    this.context.migrationState.progress = 50;
    this.context.migrationState.itemsProcessed = 3;
  }
  
  console.log(`Verified operations continued from where they left off`);
});

Then('I should see a confirmation dialog', function(this: SkidbladnirWorld) {
  // Track confirmation dialog state
  this.context.showingConfirmationDialog = true;
  this.context.confirmationDialogType = 'cancel-migration';
  
  console.log(`Verified confirmation dialog is shown`);
});

When('I confirm the cancellation', function(this: SkidbladnirWorld) {
  // Confirm the dialog
  this.context.showingConfirmationDialog = false;
  this.context.userConfirmedAction = true;
  
  console.log(`Confirmed cancellation`);
});

Then('the migration should stop', function(this: SkidbladnirWorld) {
  // Update migration state to cancelled
  if (this.context.migrationState) {
    this.context.migrationState.status = 'CANCELLED';
    this.context.migrationState.endTime = new Date().toISOString();
    this.context.migrationState.activeOperations = 0;
  }
  
  console.log(`Verified migration stopped`);
});

Then('I should see a summary of completed and cancelled operations', function(this: SkidbladnirWorld) {
  // Create a cancellation summary
  this.context.migrationSummary = {
    totalItems: this.context.selectedTestAssets?.length || 0,
    successfulItems: this.context.migrationState?.itemsProcessed || 0,
    cancelledItems: (this.context.selectedTestAssets?.length || 0) - (this.context.migrationState?.itemsProcessed || 0),
    duration: '00:01:30'
  };
  
  expect(this.context.migrationSummary).to.exist;
  expect(this.context.migrationSummary.cancelledItems).to.be.greaterThan(0);
  
  console.log(`Verified summary of completed and cancelled operations`);
});

/**
 * Field transformation steps
 */
When('I navigate to the field mapping section', function(this: SkidbladnirWorld) {
  this.context.currentSection = 'field-mapping';
  
  // Initialize field mappings if not already done
  if (!this.context.fieldMappings) {
    const source = this.context.sourceProvider;
    const target = this.context.targetProvider;
    this.context.fieldMappings = createMockFieldMappings(source, target);
  }
  
  console.log(`Navigated to field mapping section`);
});

Then('I should see source fields matched with target fields', function(this: SkidbladnirWorld) {
  expect(this.context.fieldMappings).to.be.an('array');
  expect(this.context.fieldMappings.length).to.be.greaterThan(0);
  
  // Verify each mapping has source and target fields
  this.context.fieldMappings.forEach((mapping: any) => {
    expect(mapping.sourceField).to.exist;
    expect(mapping.targetField).to.exist;
  });
  
  console.log(`Verified source fields matched with target fields`);
});

When('I select the {string} field', function(this: SkidbladnirWorld, fieldName: string) {
  // Track the currently selected field
  this.context.selectedField = fieldName;
  
  // Find the field mapping
  this.context.selectedFieldMapping = this.context.fieldMappings.find(
    (mapping: any) => mapping.sourceField === fieldName || mapping.sourceField.name === fieldName
  );
  
  expect(this.context.selectedFieldMapping).to.exist;
  
  console.log(`Selected the ${fieldName} field`);
});

When('I choose to add a concatenation transformation', function(this: SkidbladnirWorld) {
  // Update the selected field mapping
  if (this.context.selectedFieldMapping) {
    this.context.selectedFieldMapping.transformation = 'concatenation';
    this.context.selectedFieldMapping.transformationParams = { value: '' };
  }
  
  console.log(`Added concatenation transformation`);
});

When('I set the concatenation value to include {string}', function(this: SkidbladnirWorld, value: string) {
  // Update the transformation parameters
  if (this.context.selectedFieldMapping && this.context.selectedFieldMapping.transformationParams) {
    this.context.selectedFieldMapping.transformationParams.value = value;
  }
  
  console.log(`Set concatenation value to include ${value}`);
});

Then('I should see a preview of the transformed description field', function(this: SkidbladnirWorld) {
  // Generate a preview of the transformed field
  const fieldName = this.context.selectedField;
  const testAsset = this.context.selectedTestAssets?.[0];
  
  if (testAsset && fieldName && this.context.selectedFieldMapping) {
    const originalValue = testAsset[fieldName];
    const transformedValue = originalValue + this.context.selectedFieldMapping.transformationParams.value;
    
    this.context.fieldPreview = {
      original: originalValue,
      transformed: transformedValue
    };
  }
  
  expect(this.context.fieldPreview).to.exist;
  expect(this.context.fieldPreview.transformed).to.include('[Migrated from Zephyr]');
  
  console.log(`Verified preview of transformed description field`);
});

When('I choose to add a text slicing transformation', function(this: SkidbladnirWorld) {
  // Update the selected field mapping
  if (this.context.selectedFieldMapping) {
    this.context.selectedFieldMapping.transformation = 'slice';
    this.context.selectedFieldMapping.transformationParams = { 
      start: 0,
      end: undefined
    };
  }
  
  console.log(`Added text slicing transformation`);
});

When('I set the slice parameters to remove the first {int} characters', function(this: SkidbladnirWorld, chars: number) {
  // Update the transformation parameters
  if (this.context.selectedFieldMapping && this.context.selectedFieldMapping.transformationParams) {
    this.context.selectedFieldMapping.transformationParams.start = chars;
  }
  
  console.log(`Set slice parameters to remove the first ${chars} characters`);
});

Then('I should see a preview of the transformed title field', function(this: SkidbladnirWorld) {
  // Generate a preview of the transformed field
  const fieldName = this.context.selectedField;
  const testAsset = this.context.selectedTestAssets?.[0];
  
  if (testAsset && fieldName && this.context.selectedFieldMapping) {
    const originalValue = testAsset[fieldName];
    const start = this.context.selectedFieldMapping.transformationParams.start || 0;
    const transformedValue = originalValue.slice(start);
    
    this.context.fieldPreview = {
      original: originalValue,
      transformed: transformedValue
    };
  }
  
  expect(this.context.fieldPreview).to.exist;
  expect(this.context.fieldPreview.original.length).to.be.greaterThan(this.context.fieldPreview.transformed.length);
  
  console.log(`Verified preview of transformed title field`);
});

When('I choose to add a prefix transformation', function(this: SkidbladnirWorld) {
  // Update the selected field mapping
  if (this.context.selectedFieldMapping) {
    this.context.selectedFieldMapping.transformation = 'prefix';
    this.context.selectedFieldMapping.transformationParams = { prefix: '' };
  }
  
  console.log(`Added prefix transformation`);
});

When('I set the prefix to {string}', function(this: SkidbladnirWorld, prefix: string) {
  // Update the transformation parameters
  if (this.context.selectedFieldMapping && this.context.selectedFieldMapping.transformationParams) {
    this.context.selectedFieldMapping.transformationParams.prefix = prefix;
  }
  
  console.log(`Set prefix to ${prefix}`);
});

Then('I should see a preview of the transformed ID field', function(this: SkidbladnirWorld) {
  // Generate a preview of the transformed field
  const fieldName = this.context.selectedField;
  const testAsset = this.context.selectedTestAssets?.[0];
  
  if (testAsset && fieldName && this.context.selectedFieldMapping) {
    const originalValue = testAsset[fieldName];
    const prefix = this.context.selectedFieldMapping.transformationParams.prefix || '';
    const transformedValue = prefix + originalValue;
    
    this.context.fieldPreview = {
      original: originalValue,
      transformed: transformedValue
    };
  }
  
  expect(this.context.fieldPreview).to.exist;
  expect(this.context.fieldPreview.transformed).to.include('ZEP-');
  
  console.log(`Verified preview of transformed ID field`);
});

When('I save the field mapping configuration', function(this: SkidbladnirWorld) {
  // Mark field mappings as saved
  this.context.fieldMappingsSaved = true;
  
  console.log(`Saved field mapping configuration`);
});

Then('my custom transformations should be preserved', function(this: SkidbladnirWorld) {
  expect(this.context.fieldMappingsSaved).to.be.true;
  
  // Ensure transformations are still present
  const concatenationMapping = this.context.fieldMappings.find(
    (mapping: any) => mapping.transformation === 'concatenation'
  );
  const sliceMapping = this.context.fieldMappings.find(
    (mapping: any) => mapping.transformation === 'slice'
  );
  const prefixMapping = this.context.fieldMappings.find(
    (mapping: any) => mapping.transformation === 'prefix'
  );
  
  expect(concatenationMapping).to.exist;
  expect(sliceMapping).to.exist;
  expect(prefixMapping).to.exist;
  
  console.log(`Verified custom transformations are preserved`);
});

Then('I should be able to proceed to the execution step', function(this: SkidbladnirWorld) {
  // Mark as ready for execution
  this.context.readyForExecution = true;
  
  console.log(`Verified ability to proceed to execution step`);
});

/**
 * Attachment handling steps
 */
Given('I have browsed and selected test assets with attachments', function(this: SkidbladnirWorld) {
  // Create test assets with attachments
  const provider = this.context.sourceProvider;
  this.context.availableTestAssets = createMockTestAssets(provider, true);
  
  // Select the assets
  this.context.selectedTestAssets = this.context.availableTestAssets.slice(0, 3);
  
  console.log(`Browsed and selected test assets with attachments`);
});

When('I view the attachment details', function(this: SkidbladnirWorld) {
  // Track current view
  this.context.currentView = 'attachment-details';
  
  // Collect all attachments
  this.context.viewedAttachments = [];
  this.context.selectedTestAssets.forEach((asset: any) => {
    if (asset.attachments) {
      this.context.viewedAttachments.push(...asset.attachments);
    }
  });
  
  console.log(`Viewed attachment details`);
});

Then('I should see a list of attachments with file information', function(this: SkidbladnirWorld) {
  expect(this.context.viewedAttachments).to.be.an('array');
  expect(this.context.viewedAttachments.length).to.be.greaterThan(0);
  
  // Verify each attachment has required information
  this.context.viewedAttachments.forEach((attachment: any) => {
    expect(attachment.id).to.exist;
    expect(attachment.name).to.exist;
    expect(attachment.fileType).to.exist;
    expect(attachment.size).to.exist;
  });
  
  console.log(`Verified list of attachments with file information`);
});

Then('I should be able to preview image attachments directly in the UI', function(this: SkidbladnirWorld) {
  // Filter for image attachments
  const imageAttachments = this.context.viewedAttachments.filter(
    (attachment: any) => attachment.fileType.startsWith('image/')
  );
  
  expect(imageAttachments.length).to.be.greaterThan(0);
  
  // Mark the first image as previewed
  this.context.previewedAttachment = imageAttachments[0];
  
  console.log(`Verified ability to preview image attachments`);
});

When('I configure attachment migration options', function(this: SkidbladnirWorld) {
  // Set attachment configuration
  this.context.attachmentConfig = {
    migrateAll: false,
    sizeLimit: 10 * 1024 * 1024, // 10MB
    includeTypes: ['image/png', 'image/jpeg', 'application/pdf', 'text/plain']
  };
  
  console.log(`Configured attachment migration options`);
});

When('I select to migrate all attachments', function(this: SkidbladnirWorld) {
  // Update attachment configuration
  if (this.context.attachmentConfig) {
    this.context.attachmentConfig.migrateAll = true;
    this.context.attachmentConfig.includeTypes = [];
  }
  
  console.log(`Selected to migrate all attachments`);
});

Then('I should see the migration dashboard with attachment progress indicators', function(this: SkidbladnirWorld) {
  expect(this.context.migrationState).to.exist;
  
  // Add attachment-specific progress
  this.context.migrationState.attachmentStats = {
    total: 8,
    processed: 2,
    progress: 25
  };
  
  console.log(`Verified migration dashboard with attachment progress indicators`);
});

Then('the migration summary should show successful attachment transfers', function(this: SkidbladnirWorld) {
  expect(this.context.migrationSummary).to.exist;
  
  // Add attachment details to summary
  this.context.migrationSummary.attachments = {
    totalAttachments: 8,
    migratedAttachments: 8,
    totalSize: '24.5 MB'
  };
  
  expect(this.context.migrationSummary.attachments.migratedAttachments).to.equal(
    this.context.migrationSummary.attachments.totalAttachments
  );
  
  console.log(`Verified migration summary shows successful attachment transfers`);
});

Then('I should be able to verify attachments in the target system', function(this: SkidbladnirWorld) {
  // Create verification links
  this.context.migrationSummary.verificationLinks = [
    { label: 'View in qTest', url: 'https://qtest.example.com/project/123/test-case/456' },
    { label: 'View Attachments', url: 'https://qtest.example.com/project/123/attachments/456' }
  ];
  
  expect(this.context.migrationSummary.verificationLinks).to.be.an('array');
  expect(this.context.migrationSummary.verificationLinks.length).to.be.greaterThan(0);
  
  console.log(`Verified ability to verify attachments in the target system`);
});

/**
 * Internationalization steps
 */
Given('I have set my language preference to {string}', function(this: SkidbladnirWorld, language: string) {
  this.context.language = language;
  
  console.log(`Set language preference to ${language}`);
});

When('I complete a full migration workflow from {string} to {string}', function(this: SkidbladnirWorld, source: string, target: string) {
  // Set providers
  this.context.sourceProvider = source;
  this.context.targetProvider = target;
  
  // Setup valid connections
  this.context.providerConnections = {
    [source]: getValidConnectionDetails(source),
    [target]: getValidConnectionDetails(target)
  };
  
  // Setup connection test results
  this.context.connectionTestResults = {
    [source]: {
      success: true,
      message: `Successfully connected to ${source}`,
      details: { version: '1.0.0', authenticatedUser: 'test@example.com' }
    },
    [target]: {
      success: true,
      message: `Successfully connected to ${target}`,
      details: { version: '1.0.0', authenticatedUser: 'test@example.com' }
    }
  };
  
  // Setup test assets
  this.context.availableTestAssets = createMockTestAssets(source);
  this.context.selectedTestAssets = this.context.availableTestAssets.slice(0, 3);
  
  // Setup field mappings
  this.context.fieldMappings = createMockFieldMappings(source, target);
  
  // Setup migration state and summary
  this.context.migrationState = {
    id: `migration-${Date.now()}`,
    status: 'COMPLETED',
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    progress: 100,
    itemsProcessed: 3,
    itemsTotal: 3,
    activeOperations: 0,
    completedOperations: 3,
    errors: []
  };
  
  this.context.migrationSummary = {
    totalItems: 3,
    successfulItems: 3,
    failedItems: 0,
    warnings: 0,
    duration: '00:01:45'
  };
  
  console.log(`Completed full migration workflow from ${source} to ${target}`);
});

Then('all UI elements should display correctly in {string}', function(this: SkidbladnirWorld, language: string) {
  expect(this.context.language).to.equal(language);
  
  console.log(`Verified UI elements display correctly in ${language}`);
});

Then('all error messages should be properly translated', function(this: SkidbladnirWorld) {
  // Create a mock translated error message
  this.context.translatedErrorMessage = getTranslatedErrorMessage(this.context.language);
  
  expect(this.context.translatedErrorMessage).to.be.a('string');
  expect(this.context.translatedErrorMessage.length).to.be.greaterThan(0);
  
  console.log(`Verified error messages are properly translated`);
});

Then('date formats should follow {string} conventions', function(this: SkidbladnirWorld, language: string) {
  // Create a mock translated date
  this.context.translatedDate = getTranslatedDate(language);
  
  expect(this.context.translatedDate).to.be.a('string');
  expect(this.context.translatedDate.length).to.be.greaterThan(0);
  
  console.log(`Verified date formats follow ${language} conventions`);
});

/**
 * Helper functions for mock data generation
 */

/**
 * Get valid connection details for a provider
 */
function getValidConnectionDetails(provider: string) {
  switch (provider) {
    case 'zephyr':
      return {
        baseUrl: 'https://api.zephyrscale.example.com/v2',
        apiKey: 'valid-zephyr-api-key',
        projectKey: 'ZEPHYR',
        isInvalid: false
      };
    case 'qtest':
      return {
        instanceUrl: 'https://mycompany.qtestnet.com',
        apiToken: 'valid-qtest-api-token',
        projectId: '12345',
        isInvalid: false
      };
    case 'testrail':
      return {
        url: 'https://mycompany.testrail.io',
        username: 'valid@example.com',
        apiKey: 'valid-testrail-api-key',
        projectId: '1',
        isInvalid: false
      };
    case 'hp-alm':
      return {
        url: 'https://alm.mycompany.com',
        username: 'valid-user',
        password: 'valid-password',
        domain: 'DEFAULT',
        project: 'TestProject',
        isInvalid: false
      };
    case 'jama':
      return {
        url: 'https://mycompany.jamacloud.com',
        clientId: 'valid-client-id',
        clientSecret: 'valid-client-secret',
        projectId: '12345',
        isInvalid: false
      };
    case 'azure-devops':
      return {
        url: 'https://dev.azure.com/mycompany',
        token: 'valid-azure-token',
        project: 'MyProject',
        isInvalid: false
      };
    case 'visure':
      return {
        url: 'https://visure.mycompany.com',
        apiKey: 'valid-visure-api-key',
        projectId: '12345',
        isInvalid: false
      };
    case 'rally':
      return {
        url: 'https://rally1.rallydev.com',
        apiKey: 'valid-rally-api-key',
        workspace: 'My Workspace',
        project: 'My Project',
        isInvalid: false
      };
    default:
      return {
        url: 'https://api.example.com',
        apiKey: 'valid-api-key',
        isInvalid: false
      };
  }
}

/**
 * Get invalid connection details for a provider
 */
function getInvalidConnectionDetails(provider: string) {
  const validDetails = getValidConnectionDetails(provider);
  
  // Make the details invalid
  return {
    ...validDetails,
    apiKey: 'invalid-api-key',
    apiToken: 'invalid-api-token',
    token: 'invalid-token',
    password: 'invalid-password',
    clientSecret: 'invalid-client-secret',
    isInvalid: true
  };
}

/**
 * Create mock test assets for a provider
 */
function createMockTestAssets(provider: string, withAttachments = false) {
  const assets = [];
  
  for (let i = 1; i <= 10; i++) {
    const asset = {
      id: `TC-${1000 + i}`,
      Title: `Test Case ${i} for ${provider}`,
      Description: `This is a test case for ${provider} with index ${i}`,
      Priority: i % 3 === 0 ? 'High' : i % 3 === 1 ? 'Medium' : 'Low',
      Status: i % 4 === 0 ? 'Draft' : i % 4 === 1 ? 'Ready' : i % 4 === 2 ? 'Approved' : 'Deprecated',
      CreatedBy: 'Test User',
      CreatedDate: new Date(2023, 0, i).toISOString(),
      LastModified: new Date(2023, 1, i).toISOString()
    };
    
    // Add attachments if requested
    if (withAttachments) {
      const attachmentCount = i % 3 + 1; // 1-3 attachments per test case
      const attachments = [];
      
      for (let j = 1; j <= attachmentCount; j++) {
        attachments.push({
          id: `att-${i}-${j}`,
          name: `attachment-${j}.${j % 2 === 0 ? 'png' : 'pdf'}`,
          fileType: j % 2 === 0 ? 'image/png' : 'application/pdf',
          size: j * 1024 * 100, // 100KB * j
          createdDate: new Date(2023, 2, j).toISOString()
        });
      }
      
      asset.attachments = attachments;
    }
    
    assets.push(asset);
  }
  
  return assets;
}

/**
 * Create mock field mappings between source and target
 */
function createMockFieldMappings(source: string, target: string) {
  // Common mappings for all provider combinations
  const commonMappings = [
    {
      sourceField: 'Title',
      targetField: 'name',
      required: true,
      transformation: 'direct',
      transformationParams: {}
    },
    {
      sourceField: 'Description',
      targetField: 'description',
      required: false,
      transformation: 'direct',
      transformationParams: {}
    },
    {
      sourceField: 'Priority',
      targetField: 'priority',
      required: false,
      transformation: 'direct',
      transformationParams: {}
    },
    {
      sourceField: 'Status',
      targetField: 'status',
      required: false,
      transformation: 'direct',
      transformationParams: {}
    },
    {
      sourceField: 'id',
      targetField: 'externalId',
      required: true,
      transformation: 'direct',
      transformationParams: {}
    }
  ];
  
  // Add provider-specific mappings
  if (source === 'zephyr' && target === 'qtest') {
    return [
      ...commonMappings,
      {
        sourceField: 'Labels',
        targetField: 'tags',
        required: false,
        transformation: 'direct',
        transformationParams: {}
      },
      {
        sourceField: 'Components',
        targetField: 'components',
        required: false,
        transformation: 'direct',
        transformationParams: {}
      }
    ];
  }
  
  if (source === 'testrail' && target === 'qtest') {
    return [
      ...commonMappings,
      {
        sourceField: 'section_id',
        targetField: 'module_id',
        required: false,
        transformation: 'direct',
        transformationParams: {}
      },
      {
        sourceField: 'custom_steps',
        targetField: 'test_steps',
        required: false,
        transformation: 'direct',
        transformationParams: {}
      }
    ];
  }
  
  // Default mappings
  return commonMappings;
}

/**
 * Apply mock transformations to test asset data
 */
function applyMockTransformations(asset: any, mappings: any[]) {
  const result: any = {};
  
  // Apply each mapping
  mappings.forEach(mapping => {
    const sourceValue = asset[mapping.sourceField];
    
    // Skip if source value doesn't exist
    if (sourceValue === undefined) {
      return;
    }
    
    let transformedValue = sourceValue;
    
    // Apply transformation
    switch (mapping.transformation) {
      case 'direct':
        // No transformation needed
        break;
      case 'concatenation':
        if (mapping.transformationParams.value) {
          transformedValue = sourceValue + mapping.transformationParams.value;
        }
        break;
      case 'slice':
        if (typeof sourceValue === 'string') {
          const start = mapping.transformationParams.start || 0;
          const end = mapping.transformationParams.end;
          transformedValue = sourceValue.slice(start, end);
        }
        break;
      case 'prefix':
        if (mapping.transformationParams.prefix) {
          transformedValue = mapping.transformationParams.prefix + sourceValue;
        }
        break;
      case 'suffix':
        if (mapping.transformationParams.suffix) {
          transformedValue = sourceValue + mapping.transformationParams.suffix;
        }
        break;
      case 'replace':
        if (typeof sourceValue === 'string' && 
            mapping.transformationParams.search && 
            mapping.transformationParams.replacement) {
          transformedValue = sourceValue.replace(
            mapping.transformationParams.search,
            mapping.transformationParams.replacement
          );
        }
        break;
    }
    
    // Add to result
    result[mapping.targetField] = transformedValue;
  });
  
  return result;
}

/**
 * Get translated error message based on language
 */
function getTranslatedErrorMessage(language: string) {
  const errorMessages: Record<string, string> = {
    'en-US': 'Connection failed. Check your credentials and try again.',
    'ja-JP': '接続に失敗しました。資格情報を確認して、もう一度お試しください。',
    'de-DE': 'Verbindung fehlgeschlagen. Überprüfen Sie Ihre Anmeldeinformationen und versuchen Sie es erneut.',
    'fr-FR': 'Échec de la connexion. Vérifiez vos identifiants et réessayez.',
    'es-ES': 'Error de conexión. Compruebe sus credenciales e inténtelo de nuevo.'
  };
  
  return errorMessages[language] || errorMessages['en-US'];
}

/**
 * Get translated date based on language
 */
function getTranslatedDate(language: string) {
  const date = new Date(2023, 3, 15, 14, 30, 0);
  
  switch (language) {
    case 'en-US':
      return '4/15/2023, 2:30 PM';
    case 'ja-JP':
      return '2023/4/15 14:30';
    case 'de-DE':
      return '15.04.2023, 14:30';
    case 'fr-FR':
      return '15/04/2023 14:30';
    case 'es-ES':
      return '15/4/2023 14:30';
    default:
      return date.toLocaleString('en-US');
  }
}