/**
 * Cross-browser compatibility tests for provider configuration forms
 * Tests form rendering, interactions, and functionality across browsers
 */

describe('Provider Configuration Forms - Cross-browser Compatibility', () => {
  beforeEach(() => {
    // Visit the provider configuration page before each test
    cy.visitProviderConfig();
    
    // Check for browser-specific issues
    cy.checkBrowserCompatibility();
  });
  
  it('should render QTest provider form correctly across browsers', () => {
    // Select qTest tab
    cy.selectProviderTab('qTest');
    
    // Check basic form rendering
    cy.findByLabelText(/qTest Instance URL/i).should('be.visible');
    cy.findByLabelText(/Project ID/i).should('be.visible');
    cy.findByLabelText(/API Token/i).should('be.visible');
    
    // Check form layout
    cy.findByLabelText(/qTest Instance URL/i).parent().should('have.css', 'margin-bottom');
    
    // Test form functionality
    cy.fillQTestConfig();
    
    // Verify form values persist
    cy.findByLabelText(/qTest Instance URL/i).should('have.value', 'https://mycompany.qtestnet.com');
    cy.findByLabelText(/Project ID/i).should('have.value', '12345');
    
    // Test connection button
    cy.testConnection('valid');
    
    // Verify advanced section expands/collapses correctly
    cy.findByText(/Advanced Settings/i).click();
    cy.findByLabelText(/Connection Timeout/i).should('be.visible');
    cy.findByText(/Advanced Settings/i).click();
    cy.findByLabelText(/Connection Timeout/i).should('not.be.visible');
  });
  
  it('should render Zephyr provider form correctly across browsers', () => {
    // Select Zephyr tab
    cy.selectProviderTab('Zephyr');
    
    // Check basic form rendering
    cy.findByLabelText(/Base URL/i).should('be.visible');
    cy.findByLabelText(/Project Key/i).should('be.visible');
    cy.findByLabelText(/API Key/i).should('be.visible');
    
    // Test form functionality
    cy.fillZephyrConfig();
    
    // Verify form values persist
    cy.findByLabelText(/Base URL/i).should('have.value', 'https://api.zephyrscale.smartbear.com/v2');
    cy.findByLabelText(/Project Key/i).should('have.value', 'TEST');
    
    // Test dropdown control
    cy.get('select').select('server');
    cy.get('select').should('have.value', 'server');
    
    // Test connection button
    cy.testConnection('valid');
  });
  
  it('should handle form validation consistently across browsers', () => {
    // Select qTest tab
    cy.selectProviderTab('qTest');
    
    // Test invalid URL format
    cy.fillQTestConfig({ instanceUrl: 'invalid-url' });
    cy.testConnection('invalid');
    cy.findByText(/Connection failed/i).should('be.visible');
    
    // Test empty required fields
    cy.findByLabelText(/qTest Instance URL/i).clear();
    cy.findByLabelText(/qTest Instance URL/i).blur();
    cy.findByText(/required/i).should('be.visible');
    
    // Test number input validation
    cy.findByText(/Advanced Settings/i).click();
    cy.findByLabelText(/Connection Timeout/i).clear().type('500');
    cy.findByLabelText(/Connection Timeout/i).blur();
    cy.findByText(/must be between/i).should('be.visible');
  });
  
  it('should toggle password visibility consistently across browsers', () => {
    // Test qTest password visibility toggle
    cy.selectProviderTab('qTest');
    
    // Check initial state (password should be masked)
    cy.findByLabelText(/API Token/i).should('have.attr', 'type', 'password');
    
    // Toggle visibility
    cy.findByLabelText(/API Token/i)
      .parent()
      .find('button')
      .click();
    
    // Verify toggle worked
    cy.findByLabelText(/API Token/i).should('have.attr', 'type', 'text');
    
    // Toggle back
    cy.findByLabelText(/API Token/i)
      .parent()
      .find('button')
      .click();
    
    // Verify toggle worked again
    cy.findByLabelText(/API Token/i).should('have.attr', 'type', 'password');
  });
  
  it('should support keyboard interactions consistently across browsers', () => {
    // Tab navigation
    cy.findByLabelText(/qTest Instance URL/i).focus();
    cy.focused().should('have.attr', 'id').and('include', 'qTest Instance URL');
    
    // Press tab to move to next field
    cy.focused().tab();
    cy.focused().should('have.attr', 'type', 'number'); // Project ID
    
    // Press tab to move to next field
    cy.focused().tab();
    cy.focused().should('have.attr', 'type', 'password'); // API Token
    
    // Tab to the Test Connection button
    cy.focused().tab();
    cy.focused().should('have.text', 'Test Connection');
    
    // Press Enter to click the button
    cy.focused().type('{enter}');
    cy.findByText(/Connection successful|Connected/i).should('be.visible');
  });
  
  it('should render tooltips and help text consistently across browsers', () => {
    // Check tooltips in qTest form
    cy.selectProviderTab('qTest');
    
    // Hover over help icon to show tooltip
    cy.findByLabelText(/qTest Instance URL/i)
      .parent()
      .find('button')
      .trigger('mouseover');
    
    // Wait for tooltip to appear
    cy.findByRole('tooltip').should('be.visible');
    
    // Verify tooltip content
    cy.findByRole('tooltip').should('contain', 'qTest instance');
  });

  it('should handle browser-specific CSS issues', () => {
    // Test for browser-specific CSS issues based on browser detection
    cy.window().then((win) => {
      const browser = win.currentBrowser;
      cy.log(`Running in ${browser} browser`);
      
      // Handle Firefox-specific flexbox issues
      if (browser === 'firefox') {
        // Check flexbox layout rendering
        cy.get('.MuiGrid-container').should('have.css', 'display', 'flex');
        cy.get('.MuiFormControl-root').should('have.css', 'width');
      }
      
      // Handle Safari-specific form control rendering
      if (browser === 'safari') {
        cy.log('Checking Safari-specific form rendering');
        // Safari may have different default form control styling
        cy.get('input[type="number"]').should('exist');
      }
      
      // Check for Edge-specific dialog issues
      if (browser === 'edge') {
        cy.log('Checking Edge-specific dialog rendering');
        cy.findByText(/Advanced Settings/i).click();
        cy.get('.MuiAccordionDetails-root').should('be.visible');
      }
    });
  });

  it('should handle responsive layouts consistently across browsers', () => {
    // Test responsive behavior at different viewport sizes
    
    // Mobile viewport
    cy.viewport('iphone-x');
    cy.findByLabelText(/qTest Instance URL/i).should('be.visible');
    cy.get('.MuiGrid-item').invoke('width').should('be.lt', 500);
    
    // Tablet viewport
    cy.viewport('ipad-2');
    cy.findByLabelText(/qTest Instance URL/i).should('be.visible');
    
    // Desktop viewport
    cy.viewport(1280, 800);
    cy.findByLabelText(/qTest Instance URL/i).should('be.visible');
  });
});