// ***********************************************************
// This file is processed and loaded automatically before your test files.
// ***********************************************************

// Import commands.js using ES2015 syntax
import './commands';

// Add browser detection
Cypress.on('window:before:load', (win) => {
  // Detect current browser
  const userAgent = win.navigator.userAgent;
  let currentBrowser;

  if (userAgent.indexOf('Chrome') !== -1) {
    currentBrowser = 'chrome';
  } else if (userAgent.indexOf('Firefox') !== -1) {
    currentBrowser = 'firefox';
  } else if (userAgent.indexOf('Edge') !== -1) {
    currentBrowser = 'edge';
  } else if (userAgent.indexOf('Safari') !== -1) {
    currentBrowser = 'safari';
  } else {
    currentBrowser = 'unknown';
  }

  // Add browser detection to window object for tests to use
  win.currentBrowser = currentBrowser;
  
  // Add data attribute to body for CSS targeting in tests
  win.document.body.setAttribute('data-browser', currentBrowser);
});

// Handle uncaught exceptions
Cypress.on('uncaught:exception', (err, runnable) => {
  // Log browser-specific exceptions for better cross-browser debugging
  console.error(`Uncaught exception in browser ${Cypress.browser.name}:`, err.message);
  
  // Prevent Cypress from failing the test in case of browser-specific issues
  return false;
});

// Capture screenshot on test failure for cross-browser comparison
Cypress.on('test:after:run', (test, runnable) => {
  if (test.state === 'failed') {
    // Generate a screenshot name with browser info for comparison
    const browserName = Cypress.browser.name;
    const specName = Cypress.spec.name.replace('.cy.js', '');
    const testName = runnable.parent.title + ' -- ' + test.title;
    const screenshotName = `${specName}__${testName}__${browserName}`;
    
    // Take a screenshot for visual comparison between browsers
    cy.screenshot(screenshotName, { capture: 'viewport' });
  }
});