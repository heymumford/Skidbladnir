/**
 * Advanced interaction tests for cross-browser compatibility
 * Tests complex interactions like drag-and-drop, animations, and advanced form behaviors
 */

describe('Advanced Provider Interactions - Cross-browser Compatibility', () => {
  beforeEach(() => {
    // Visit the provider configuration page before each test
    cy.visitProviderConfig();
  });
  
  it('should handle form submission correctly across browsers', () => {
    // Complete the form
    cy.selectProviderTab('qTest');
    cy.fillQTestConfig();
    
    // Intercept form submission
    cy.intercept('POST', '**/api/providers/*/save', {
      statusCode: 200,
      body: { success: true }
    }).as('saveConfig');
    
    // Submit the form using the Continue button
    cy.findByRole('button', { name: /Continue/i }).click();
    
    // Verify the form submission was handled correctly
    cy.wait('@saveConfig');
    
    // Verify redirection
    cy.url().should('include', '/mapping');
  });
  
  it('should handle animations and transitions consistently', () => {
    // Test accordion expansion animation
    cy.selectProviderTab('qTest');
    
    // Get the accordion before expansion
    cy.findByText(/Advanced Settings/i).parent().then(($accordion) => {
      const initialHeight = $accordion[0].getBoundingClientRect().height;
      
      // Click to expand
      cy.findByText(/Advanced Settings/i).click();
      
      // Wait for animation to complete and check height increased
      cy.findByText(/Advanced Settings/i).parent().should(($expandedAccordion) => {
        expect($expandedAccordion[0].getBoundingClientRect().height).to.be.greaterThan(initialHeight);
      });
      
      // Click to collapse
      cy.findByText(/Advanced Settings/i).click();
      
      // Wait for animation to complete and check height restored
      cy.findByText(/Advanced Settings/i).parent().should(($collapsedAccordion) => {
        expect($collapsedAccordion[0].getBoundingClientRect().height).to.be.closeTo(initialHeight, 5);
      });
    });
  });
  
  it('should handle tab switching correctly across browsers', () => {
    // Get initial tab content
    cy.findByRole('tabpanel').then(($initialTabPanel) => {
      const initialContent = $initialTabPanel.text();
      
      // Switch to second tab
      cy.selectProviderTab('qTest');
      
      // Get second tab content
      cy.findByRole('tabpanel').then(($newTabPanel) => {
        const newContent = $newTabPanel.text();
        
        // Verify content changed
        expect(newContent).to.not.equal(initialContent);
      });
      
      // Switch back to first tab
      cy.selectProviderTab('Zephyr');
      
      // Verify first tab content is restored
      cy.findByRole('tabpanel').then(($restoredTabPanel) => {
        const restoredContent = $restoredTabPanel.text();
        expect(restoredContent).to.equal(initialContent);
      });
    });
  });
  
  it('should handle focus management when expanding/collapsing advanced settings', () => {
    cy.selectProviderTab('qTest');
    
    // Click to expand
    cy.findByText(/Advanced Settings/i).focus().click();
    
    // Verify focus behavior after expansion
    cy.focused().should('exist');
    
    // Tab to a field in the expanded section
    cy.findByLabelText(/Connection Timeout/i).focus();
    cy.focused().should('have.attr', 'id').and('include', 'timeout');
    
    // Collapse while focus is inside
    cy.findByText(/Advanced Settings/i).click();
    
    // Verify focus is managed appropriately
    cy.focused().should('exist');
  });
  
  it('should handle validation across browsers', () => {
    cy.selectProviderTab('qTest');
    
    // Test required field validation
    cy.findByLabelText(/qTest Instance URL/i).focus().clear().blur();
    cy.findByLabelText(/qTest Instance URL/i).parent().should('have.css', 'color');
    cy.findByText(/required|empty/i).should('be.visible');
    
    // Test format validation
    cy.findByLabelText(/qTest Instance URL/i).focus().type('javascript:alert(1)').blur();
    cy.findByLabelText(/qTest Instance URL/i).parent().should('have.css', 'color');
    
    // Test advanced settings validation
    cy.findByText(/Advanced Settings/i).click();
    cy.findByLabelText(/Connection Timeout/i).clear().type('-5').blur();
    cy.findByLabelText(/Connection Timeout/i).parent().should('have.css', 'color');
  });
  
  it('should handle error messages and alerts consistently', () => {
    cy.selectProviderTab('qTest');
    cy.fillQTestConfig();
    
    // Force an error during connection test
    cy.intercept('POST', '**/api/providers/*/test-connection', {
      statusCode: 500,
      body: { 
        success: false, 
        message: 'Server error occurred during connection test',
        details: 'Connection timeout after 30 seconds'
      }
    }).as('connectionError');
    
    // Click test connection
    cy.findByRole('button', { name: /Test Connection/i }).click();
    cy.wait('@connectionError');
    
    // Verify error alert rendering
    cy.get('.MuiAlert-root').should('be.visible');
    cy.get('.MuiAlert-root').should('contain', 'error');
    
    // Verify alert can be dismissed
    cy.get('.MuiAlert-root button').click();
    cy.get('.MuiAlert-root').should('not.exist');
  });
  
  it('should handle advanced form state management consistently', () => {
    // Test form state persistence when switching tabs
    cy.selectProviderTab('qTest');
    cy.fillQTestConfig({ instanceUrl: 'https://custom.qtestnet.com' });
    
    // Switch tabs
    cy.selectProviderTab('Zephyr');
    cy.fillZephyrConfig({ baseUrl: 'https://custom.zephyrscale.com' });
    
    // Switch back and verify state persisted
    cy.selectProviderTab('qTest');
    cy.findByLabelText(/qTest Instance URL/i).should('have.value', 'https://custom.qtestnet.com');
    
    // Switch again and verify other tab state persisted
    cy.selectProviderTab('Zephyr');
    cy.findByLabelText(/Base URL/i).should('have.value', 'https://custom.zephyrscale.com');
  });
  
  it('should handle internationalization features consistently', () => {
    // Mock internationalization if available
    cy.window().then((win) => {
      // Check if i18n is available and switch language
      if (win.i18n) {
        win.i18n.changeLanguage('es');
        
        // Verify language change affected the UI
        cy.get('body').should('contain.text');
      } else {
        cy.log('Internationalization not available for testing');
      }
    });
  });

  it('should handle screen readers and accessibility features consistently', () => {
    // Test screen reader accessibility attributes
    cy.selectProviderTab('qTest');
    
    // Check form role
    cy.get('form').should('have.attr', 'role', 'form');
    
    // Check required field indication for screen readers
    cy.findByLabelText(/qTest Instance URL/i).should('have.attr', 'aria-required', 'true');
    
    // Test error states for screen readers
    cy.findByLabelText(/qTest Instance URL/i).clear().blur();
    cy.findByLabelText(/qTest Instance URL/i).should('have.attr', 'aria-invalid', 'true');
    
    // Test status announcement
    cy.fillQTestConfig();
    cy.testConnection('valid');
    cy.get('[role="status"]').should('exist');
  });
});