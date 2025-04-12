# UI Component Mocks

This directory contains mock implementations of UI components and services used in UI component tests.

## Available Mocks

- `FeatureFlagContext.js` - Mock implementation of the feature flag context
- `TestCasePreviewComponent.js` - Mock implementation of the test case preview component
- `react-i18next.js` - Mock implementation of react-i18next for internationalization
- `react-json-tree.js` - Mock implementation of react-json-tree for displaying JSON data

## Usage

These mocks are automatically loaded by Jest when testing UI components. The mapping is configured in `config/jest.ui.config.js`.

To use a mock in a test file:

```jsx
import { TestCasePreviewComponent } from '../TestCasePreviewComponent';
// Jest will automatically use the mock implementation
```

## Adding New Mocks

When adding new mocks:

1. Create the mock file in this directory
2. If needed, update `config/jest.ui.config.js` to add the mapping
3. Ensure the mock follows the same API as the original component/service