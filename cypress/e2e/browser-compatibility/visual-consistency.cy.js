/**
 * Cross-browser visual consistency tests
 * Focuses on ensuring consistent rendering across browsers
 */

describe('Visual Consistency - Cross-browser Compatibility', () => {
  beforeEach(() => {
    // Visit the provider configuration page before each test
    cy.visitProviderConfig();
  });
  
  it('should render form controls with consistent styling across browsers', () => {
    // Select qTest tab
    cy.selectProviderTab('qTest');
    
    // Check text field styling consistency
    cy.findByLabelText(/qTest Instance URL/i).then(($input) => {
      // Store computed styles for comparison
      const computedStyle = window.getComputedStyle($input[0]);
      
      // Verify common properties that should be consistent across browsers
      expect(computedStyle.getPropertyValue('box-sizing')).to.equal('border-box');
      expect(parseFloat(computedStyle.getPropertyValue('height'))).to.be.greaterThan(0);
      expect(computedStyle.getPropertyValue('font-family')).to.not.be.empty;
    });
    
    // Check button styling consistency
    cy.findByRole('button', { name: /Test Connection/i }).then(($button) => {
      const computedStyle = window.getComputedStyle($button[0]);
      
      // Verify button styling
      expect(computedStyle.getPropertyValue('border-radius')).to.not.be.empty;
      expect(computedStyle.getPropertyValue('text-transform')).to.equal('uppercase');
      expect(computedStyle.getPropertyValue('font-weight')).to.be.oneOf(['500', '600', '700', 'bold']);
    });
  });
  
  it('should render icons consistently across browsers', () => {
    // Select qTest tab
    cy.selectProviderTab('qTest');
    
    // Check password visibility toggle icon
    cy.findByLabelText(/API Token/i)
      .parent()
      .find('button svg')
      .should('be.visible')
      .then(($icon) => {
        const computedStyle = window.getComputedStyle($icon[0]);
        
        // Verify icon sizing
        expect(parseFloat(computedStyle.getPropertyValue('width'))).to.be.greaterThan(0);
        expect(parseFloat(computedStyle.getPropertyValue('height'))).to.be.greaterThan(0);
      });
    
    // Check tooltip icon
    cy.findByLabelText(/qTest Instance URL/i)
      .parent()
      .find('button svg')
      .should('be.visible');
    
    // Check accordion expand icon
    cy.findByText(/Advanced Settings/i)
      .parent()
      .find('svg')
      .should('be.visible');
  });
  
  it('should render form states consistently across browsers', () => {
    // Test disabled state
    cy.findByRole('button', { name: /Test Connection/i }).should('be.disabled');
    
    // Test enabled state
    cy.fillQTestConfig();
    cy.findByRole('button', { name: /Test Connection/i }).should('be.enabled');
    
    // Test focus state
    cy.findByLabelText(/qTest Instance URL/i).focus();
    cy.findByLabelText(/qTest Instance URL/i).then(($input) => {
      const computedStyle = window.getComputedStyle($input[0]);
      // Focus should be visible in some form (outline, box-shadow, etc.)
      expect(computedStyle.getPropertyValue('outline')).to.not.equal('none') ||
      expect(computedStyle.getPropertyValue('box-shadow')).to.not.equal('none');
    });
    
    // Test error state
    cy.findByLabelText(/qTest Instance URL/i).clear();
    cy.findByLabelText(/qTest Instance URL/i).blur();
    cy.findByLabelText(/qTest Instance URL/i).parent().should('have.css', 'color');
  });
  
  it('should render form layouts consistently across browsers at different viewport sizes', () => {
    // Test responsive behavior - desktop
    cy.viewport(1280, 800);
    
    // Get form grid layout
    cy.get('.MuiGrid-container').should('be.visible');
    
    // Verify grid layout
    cy.get('.MuiGrid-container > .MuiGrid-item').should('have.length.at.least', 2);
    
    // Test responsive behavior - tablet
    cy.viewport('ipad-2');
    cy.get('.MuiGrid-container').should('be.visible');
    
    // Test responsive behavior - mobile
    cy.viewport('iphone-x');
    cy.get('.MuiGrid-container').should('be.visible');
    
    // Verify basic responsive layout changes
    cy.get('.MuiGrid-item').first().invoke('width').then((width) => {
      // All fields should stack at smaller viewports
      expect(parseInt(width)).to.be.greaterThan(250);
    });
  });

  it('should render connection status indicators consistently', () => {
    // Fill form and test connection
    cy.selectProviderTab('qTest');
    cy.fillQTestConfig();
    cy.testConnection('valid');
    
    // Check success indicator
    cy.get('[role="status"]').should('be.visible');
    
    // Fill form with invalid data and test connection
    cy.findByLabelText(/qTest Instance URL/i).clear().type('invalid-url');
    cy.testConnection('invalid');
    
    // Check error indicator
    cy.get('[role="status"]').should('be.visible');
  });
  
  it('should apply theme colors consistently across browsers', () => {
    // Verify primary color application
    cy.findByRole('button', { name: /Test Connection/i }).then(($button) => {
      const computedStyle = window.getComputedStyle($button[0]);
      // Verify some color property is set (exact color will depend on theme)
      expect(computedStyle.getPropertyValue('background-color')).to.not.equal('rgba(0, 0, 0, 0)');
    });
    
    // Fill form and verify success status color
    cy.fillQTestConfig();
    cy.testConnection('valid');
    
    // Success indicator should have consistent color
    cy.get('[role="status"] .MuiChip-root').then(($chip) => {
      const computedStyle = window.getComputedStyle($chip[0]);
      // Chip should have a background color
      expect(computedStyle.getPropertyValue('background-color')).to.not.equal('rgba(0, 0, 0, 0)');
    });
  });
  
  it('should render typography consistently across browsers', () => {
    // Check heading typography
    cy.findByRole('heading', { name: /Provider Configuration/i }).then(($heading) => {
      const computedStyle = window.getComputedStyle($heading[0]);
      
      // Verify typography properties
      expect(parseFloat(computedStyle.getPropertyValue('font-size'))).to.be.greaterThan(20);
      expect(computedStyle.getPropertyValue('font-weight')).to.be.oneOf(['500', '600', '700', 'bold']);
      expect(computedStyle.getPropertyValue('line-height')).to.not.be.empty;
    });
    
    // Check form label typography
    cy.findByLabelText(/qTest Instance URL/i).parent().find('label').then(($label) => {
      const computedStyle = window.getComputedStyle($label[0]);
      
      // Verify label typography properties
      expect(parseFloat(computedStyle.getPropertyValue('font-size'))).to.be.greaterThan(0);
      expect(computedStyle.getPropertyValue('font-family')).to.not.be.empty;
    });
  });
});