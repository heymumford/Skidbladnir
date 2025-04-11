# Cross-Browser Compatibility Testing Guide

## Overview

This document outlines the cross-browser compatibility testing approach for Skidbladnir. Our testing strategy ensures that the application functions correctly and maintains consistent visual appearance across all supported browsers.

## Supported Browsers

Skidbladnir officially supports the following browsers:

- **Chrome** - Latest 2 versions
- **Firefox** - Latest 2 versions
- **Edge** - Latest 2 versions
- **Safari** - Latest 2 versions (Mac only)

For each browser, we test:
- Desktop layouts (1280+ px width)
- Tablet layouts (768-1279 px width)
- Mobile layouts (320-767 px width)

## Testing Approach

Our cross-browser testing approach consists of three layers:

1. **Automated Tests** - Cypress tests run on multiple browsers to verify functional and visual consistency
2. **Visual Testing** - Compare screenshots across browsers to detect visual inconsistencies
3. **Manual Testing** - For complex interactions and edge cases that are difficult to automate

### Automated Cross-Browser Tests

We use Cypress to run automated cross-browser tests. The tests are organized into three categories:

1. **Basic Provider Forms** (`provider-forms.cy.js`) - Tests form rendering, interactions, and functionality
2. **Visual Consistency** (`visual-consistency.cy.js`) - Tests consistent rendering of UI elements
3. **Advanced Interactions** (`advanced-interactions.cy.js`) - Tests complex behaviors like animations and state management

### Running Cross-Browser Tests

To run cross-browser tests, use the following npm scripts:

```bash
# Run tests on all supported browsers
npm run test:cross-browser

# Run tests on a specific browser
npm run test:cross-browser:chrome
npm run test:cross-browser:firefox
npm run test:cross-browser:edge

# Run tests in parallel (one browser per process)
npm run test:cross-browser:parallel

# Open Cypress UI for interactive testing
npm run cypress:open
```

Advanced options available in the test script:

```bash
./scripts/run-cross-browser-tests.sh [options]

Options:
  --browsers     Comma-separated list of browsers to test (default: chrome,firefox,edge)
  --parallel     Run tests in parallel (one browser per process)
  --spec         Spec pattern to run (default: cypress/e2e/browser-compatibility/**/*.cy.js)
  --report-dir   Directory for test reports (default: cypress/reports)
```

### Test Reports

After running cross-browser tests, a consolidated HTML report is generated in `cypress/reports/cross-browser-report.html`. This report includes:

- Summary of test results by browser
- List of browser-specific issues
- Test failures with screenshots
- Execution time and performance metrics

## Test Coverage

Our cross-browser tests verify the following aspects:

### UI Components

- Form controls (text fields, checkboxes, dropdowns)
- Buttons and interactive elements
- Icons and visual indicators
- Status messages and alerts
- Modal dialogs and popovers
- Accordions and expandable sections

### User Interactions

- Form submission and validation
- Keyboard navigation
- Focus management
- Error handling
- Animation and transitions
- Touch interactions (for touch-enabled devices)

### Visual Consistency

- Typography and text rendering
- Layout and component alignment
- Color application
- Spacing and margins
- Responsive layouts at different viewport sizes

## Troubleshooting Common Issues

### Browser-Specific Issues

| Browser | Common Issues | Solutions |
|---------|---------------|-----------|
| Safari | Flex layout inconsistencies | Use prefixed properties or alternative layouts |
| Firefox | Form control styling differences | Use standardized form styles or browser-specific overrides |
| Edge | Animation performance issues | Optimize animations or provide fallbacks |
| IE11 | Lack of modern JS support | Add polyfills or provide graceful degradation |

### Environment Setup

Before running cross-browser tests, ensure:

1. You have all required browsers installed
2. Each browser has WebDriver support configured
3. Development server is running on the expected port

## Best Practices

When developing UI components, follow these guidelines to minimize cross-browser issues:

1. **Use feature detection instead of browser detection**
2. **Test early and often** across browsers
3. **Keep browser-specific CSS in separate files** or clearly marked sections
4. **Use established UI libraries** with good cross-browser support
5. **Avoid bleeding-edge CSS features** without proper fallbacks
6. **Implement graceful degradation** for unsupported features
7. **Follow accessibility standards** which often improve cross-browser compatibility

## Extending the Test Suite

To add new cross-browser tests:

1. Create a new test file in `cypress/e2e/browser-compatibility/`
2. Import the necessary Cypress commands
3. Use the `cy.checkBrowserCompatibility()` helper to detect browser-specific issues
4. Include browser-specific code branches using `cy.window().then(win => { if (win.currentBrowser === 'firefox') { ... } })`

## Continuous Integration

Cross-browser tests run automatically:

- On Pull Requests (Chrome only)
- Nightly builds (All browsers)
- Release candidates (All browsers with extended test coverage)

Test results are reported in GitHub Actions summaries and stored as artifacts.