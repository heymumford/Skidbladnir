# Accessibility Guide for Skidbladnir UI

## Overview

Skidbladnir is committed to ensuring our application is accessible to all users, including those with disabilities. This guide outlines the accessibility features and standards implemented in the application, focusing on provider configuration screens.

## Implemented Accessibility Features

### Provider Configuration Screens

Provider configuration screens have been enhanced with the following accessibility features:

1. **Proper Form Labeling**
   - All form controls have explicit labels
   - Required fields are marked with both visual indicators and `aria-required` attributes
   - Input fields include descriptive help text and error messages
   - Form controls use unique IDs to ensure proper association between labels and fields

2. **Keyboard Navigation**
   - All interactive elements are navigable using the keyboard
   - Logical tab order follows the visual layout
   - Focus indicators are visible and high-contrast
   - Advanced settings accordions maintain proper focus management
   - Modals and dialogs trap focus appropriately

3. **Screen Reader Support**
   - ARIA roles and attributes are implemented throughout the interface
   - Status messages use `aria-live` regions to announce changes
   - Error messages are associated with their respective form fields
   - Icon buttons include descriptive `aria-label` attributes
   - Interactive components include appropriate ARIA states (expanded, pressed, etc.)

4. **Visual Accessibility**
   - Color is not used as the only means of conveying information
   - Text has sufficient contrast against backgrounds (following WCAG AA standards)
   - Form fields include both color and text to indicate errors
   - Icons have meaningful labels and tooltips
   - UI is responsive and supports text resizing up to 200%

5. **Status Indicators**
   - Connection status indicators have appropriate ARIA roles
   - Loading states are announced to screen readers
   - Errors are communicated both visually and programmatically

## Testing Accessibility

We use the following approaches to test accessibility:

1. **Automated Testing**
   - Jest-axe for testing against WCAG guidelines
   - Integration tests for keyboard navigation
   - Unit tests for ARIA attributes and roles

2. **Manual Testing**
   - Screen reader testing with NVDA, JAWS, and VoiceOver
   - Keyboard-only navigation testing
   - Color contrast verification
   - Testing at different screen sizes and zoom levels

## Accessibility Guidelines

When developing new UI components, follow these guidelines:

1. **Semantic HTML**
   - Use appropriate HTML elements (`button` for buttons, not `div`)
   - Use heading levels (`h1` through `h6`) in a logical sequence
   - Use lists (`ul`, `ol`) for list content
   - Use tables for tabular data with proper headers

2. **Keyboard Interactions**
   - Ensure all interactive elements can be accessed and activated with keyboard
   - Implement logical tab order (use `tabIndex` only when necessary)
   - Trap focus in modals and dialogs
   - Provide keyboard shortcuts for common actions (with appropriate documentation)

3. **ARIA Implementation**
   - Add ARIA roles only when HTML semantics are insufficient
   - Include descriptive labels for all interactive elements
   - Use `aria-live` regions for dynamic content
   - Implement proper ARIA states (`aria-expanded`, `aria-pressed`, etc.)

4. **Visual Design**
   - Ensure text contrast meets WCAG AA standards (4.5:1 for normal text, 3:1 for large text)
   - Don't rely solely on color to convey information
   - Make focus indicators visible and high-contrast
   - Support text resizing up to 200%

## Resources

- [Web Content Accessibility Guidelines (WCAG) 2.1](https://www.w3.org/TR/WCAG21/)
- [MDN Web Docs: Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [WAI-ARIA Practices](https://www.w3.org/TR/wai-aria-practices-1.1/)
- [Accessible Rich Internet Applications (WAI-ARIA) 1.1](https://www.w3.org/TR/wai-aria-1.1/)

## Continuous Improvement

Accessibility is an ongoing process. We continually test and improve our accessibility features based on user feedback and evolving standards. If you encounter any accessibility issues, please report them through our issue tracker.