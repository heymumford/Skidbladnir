/**
 * Cucumber hooks for Skidbladnir
 * 
 * This file defines hooks that run before or after scenarios and features.
 * It's used for setup, teardown, and other global test management.
 */

import { Before, After, BeforeAll, AfterAll, Status } from '@cucumber/cucumber';
import { SkidbladnirWorld } from './world';
import * as fs from 'fs';
import * as path from 'path';

// Constants
const SCREENSHOTS_DIR = path.join(process.cwd(), 'test-results', 'cucumber', 'screenshots');

/**
 * Global setup - runs once before all tests
 */
BeforeAll(async function() {
  console.log(`Starting Acceptance Tests at ${new Date().toISOString()}`);
  
  // Create screenshots directory if it doesn't exist
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }
  
  // Other global setup (e.g., starting servers, databases)
  // Only start services if they're not already running
  if (!process.env.ACCEPTANCE_USE_EXISTING_SERVICES) {
    // Implement service startup logic if needed
    // This is usually handled by the CI/CD pipeline or docker-compose
  }
});

/**
 * Global teardown - runs once after all tests
 */
AfterAll(async function() {
  console.log(`Finished Acceptance Tests at ${new Date().toISOString()}`);
  
  // Shutdown services if we started them
  if (!process.env.ACCEPTANCE_USE_EXISTING_SERVICES) {
    // Implement service shutdown logic if needed
  }
});

/**
 * Setup for each scenario
 */
Before(async function(this: SkidbladnirWorld) {
  // Reset the world context
  this.context.scenarioContext = {};
  
  // Initialize scenario-specific data
  this.context.requestHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  
  // Check if all required services are running
  try {
    // Implement health check logic if needed
    // const healthResponse = await this.context.apiClient.get('/health');
    // if (healthResponse.status !== 200) {
    //   throw new Error('API is not healthy');
    // }
  } catch (error) {
    console.error('Health check failed', error);
    // Don't fail the test here, let individual scenarios handle it
  }
});

/**
 * Tag-specific hooks
 */
Before({ tags: '@api' }, async function(this: SkidbladnirWorld) {
  // Setup specific to API tests
  console.log('Setting up for API test');
});

Before({ tags: '@migration' }, async function(this: SkidbladnirWorld) {
  // Setup specific to migration tests
  console.log('Setting up for migration test');
});

Before({ tags: '@workflow' }, async function(this: SkidbladnirWorld) {
  // Setup specific to UI workflow tests
  console.log('Setting up for UI workflow test');
  
  // Set authentication to true for UI workflow tests
  this.context.authenticated = true;
  
  // Mock auth token
  this.context.authToken = 'mock-auth-token-for-ui-tests';
  this.context.requestHeaders['Authorization'] = `Bearer ${this.context.authToken}`;
});

/**
 * Teardown for each scenario
 */
After(async function(this: SkidbladnirWorld, scenario) {
  // Check for API errors
  if (this.context.apiError) {
    console.error('API Error in scenario:', this.context.apiError);
    // Attach error details to scenario
    this.attach(
      JSON.stringify(this.context.apiError, null, 2),
      'application/json'
    );
  }
  
  // Take screenshot on failure (if browser testing is implemented)
  if (scenario.result?.status === Status.FAILED) {
    console.log(`Scenario failed: ${scenario.pickle.name}`);
    
    // If working with a browser (e.g., Playwright/Puppeteer), take screenshot
    // const screenshot = await browser.takeScreenshot();
    // this.attach(screenshot, 'image/png');
    
    // Also save API response information on failure
    if (this.context.apiResponse) {
      this.attach(
        JSON.stringify({
          status: this.context.apiResponse.status,
          headers: this.context.apiResponse.headers,
          data: this.context.apiResponse.data
        }, null, 2),
        'application/json'
      );
    }
  }
  
  // Clean up resources
  this.resetContext();
});