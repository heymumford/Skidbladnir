// ***********************************************
// Custom Cypress commands for the Skidbladnir application
// ***********************************************

import '@testing-library/cypress/add-commands';

// Command to log in to the application 
Cypress.Commands.add('login', (username, password) => {
  cy.session([username, password], () => {
    cy.visit('/login');
    cy.get('input[name="username"]').type(username);
    cy.get('input[name="password"]').type(password);
    cy.get('button[type="submit"]').click();
    cy.url().should('not.include', '/login');
  });
});

// Command to navigate to the provider configuration page
Cypress.Commands.add('visitProviderConfig', () => {
  cy.visit('/provider-config');
  cy.findByRole('heading', { name: /Provider Configuration/i }).should('be.visible');
});

// Command to select a provider tab
Cypress.Commands.add('selectProviderTab', (providerName) => {
  cy.findByRole('tab', { name: new RegExp(providerName, 'i') }).click();
  cy.findByRole('tab', { name: new RegExp(providerName, 'i') })
    .should('have.attr', 'aria-selected', 'true');
});

// Command to fill out qTest configuration form
Cypress.Commands.add('fillQTestConfig', (config = {}) => {
  const defaultConfig = {
    instanceUrl: 'https://mycompany.qtestnet.com',
    projectId: '12345',
    apiToken: 'sample-token',
  };
  
  const finalConfig = { ...defaultConfig, ...config };
  
  cy.findByLabelText(/qTest Instance URL/i).clear().type(finalConfig.instanceUrl);
  cy.findByLabelText(/Project ID/i).clear().type(finalConfig.projectId);
  cy.findByLabelText(/API Token/i).clear().type(finalConfig.apiToken);
  
  if (finalConfig.useAutomationToken) {
    cy.findByLabelText(/Use Automation Token/i).click();
    cy.findByLabelText(/Automation Token/i).clear().type(finalConfig.automationToken || 'automation-token');
  }
});

// Command to fill out Zephyr configuration form
Cypress.Commands.add('fillZephyrConfig', (config = {}) => {
  const defaultConfig = {
    baseUrl: 'https://api.zephyrscale.smartbear.com/v2',
    projectKey: 'TEST',
    apiKey: 'sample-key',
  };
  
  const finalConfig = { ...defaultConfig, ...config };
  
  cy.findByLabelText(/Base URL/i).clear().type(finalConfig.baseUrl);
  cy.findByLabelText(/Project Key/i).clear().type(finalConfig.projectKey);
  cy.findByLabelText(/API Key/i).clear().type(finalConfig.apiKey);
  
  if (finalConfig.includeAttachments !== undefined) {
    cy.findByText(/Advanced Settings/i).click();
    
    const attachmentsSwitch = cy.findByLabelText(/Include Attachments/i);
    if ((finalConfig.includeAttachments && !attachmentsSwitch.should('be.checked')) ||
        (!finalConfig.includeAttachments && attachmentsSwitch.should('be.checked'))) {
      attachmentsSwitch.click();
    }
  }
});

// Command to test connection and verify status
Cypress.Commands.add('testConnection', (expectedStatus = 'valid') => {
  cy.intercept('POST', '**/api/providers/*/test-connection', {
    statusCode: 200,
    body: { success: expectedStatus === 'valid', message: expectedStatus === 'valid' ? 'Connection successful' : 'Connection failed' },
  }).as('testConnection');
  
  cy.findByRole('button', { name: /Test Connection/i }).click();
  cy.wait('@testConnection');
  
  if (expectedStatus === 'valid') {
    cy.findByText(/Connected|Connection successful/i).should('be.visible');
  } else {
    cy.findByText(/Connection Failed|Connection failed/i).should('be.visible');
  }
});

// Command to check browser compatibility issues
Cypress.Commands.add('checkBrowserCompatibility', () => {
  // Check for browser-specific rendering issues
  cy.document().then((doc) => {
    const browserSpecificIssues = [];
    
    // Check computed styles to detect browser differences
    const testElements = [
      { selector: '.MuiInputBase-root', property: 'border-radius' },
      { selector: '.MuiButton-contained', property: 'border-radius' },
      { selector: '.MuiChip-root', property: 'line-height' },
      { selector: '.MuiAccordionSummary-root', property: 'min-height' },
    ];
    
    testElements.forEach(({ selector, property }) => {
      const elements = doc.querySelectorAll(selector);
      if (elements.length > 0) {
        const computedStyle = window.getComputedStyle(elements[0]);
        const value = computedStyle.getPropertyValue(property);
        if (value === '') {
          browserSpecificIssues.push(`Missing CSS property: ${property} on ${selector}`);
        }
      } else {
        browserSpecificIssues.push(`Selector not found: ${selector}`);
      }
    });
    
    // Log any issues for reporting
    if (browserSpecificIssues.length > 0) {
      cy.log('Browser compatibility issues detected:');
      browserSpecificIssues.forEach(issue => cy.log(issue));
    }
  });
  
  // Check for polyfill-dependent features
  cy.window().then((win) => {
    // Array methods
    const hasArrayMethods = 'find' in Array.prototype && 
                           'includes' in Array.prototype;
    // Promise methods
    const hasPromiseMethods = 'finally' in win.Promise.prototype;
    // Object methods
    const hasObjectMethods = 'entries' in Object && 
                            'fromEntries' in Object;
    
    if (!hasArrayMethods || !hasPromiseMethods || !hasObjectMethods) {
      cy.log('Missing modern JavaScript API support that might require polyfills');
    }
  });
});