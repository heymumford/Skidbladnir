# Transformation Preview Testing

This directory contains tests for the transformation preview components and functionality. These components provide users with a visual representation of how test case data will be transformed between different test management systems.

## Components Tested

1. **TransformationPreviewComponent**: 
   - Displays a real-time preview of transformations applied to individual fields
   - Supports various transformation types (concatenation, substring, mapping, etc.)
   - Includes visual diffs, history, and detailed JSON views

2. **TransformationPreviewPanel**:
   - Displays source, canonical, and target data views in a tabbed interface
   - Provides field comparison tables and JSON tree visualization

3. **TestCasePreviewComponent**:
   - Enhanced preview with additional test case details
   - More advanced visualization options and interactive features

4. **BatchPreviewComponent**:
   - Previews transformations for multiple test cases simultaneously
   - Provides summary views and allows drilling down into individual test cases

5. **TransformationPreviewPage**:
   - Comprehensive page that demonstrates all preview components
   - Includes a wizard interface for configuring and previewing transformations
   - Supports various preview modes and transformation configurations

## Component Structure

Here's the component hierarchy for the transformation preview functionality:

```
TransformationPreviewPage
├── TransformationPreviewPanel
│   ├── FieldComparisonTable
│   └── JSONTree
├── TestCasePreviewComponent
│   ├── DataStructureComparison
│   └── FieldComparisonTable
├── BatchPreviewComponent
│   └── TestCasePreviewComponent
├── FieldTransformation
│   └── TransformationPreviewComponent
└── DataStructureComparison
```

## Implementation Status

All components have been fully implemented with the following features:

1. Real-time preview of field transformations
2. Support for various transformation types:
   - Direct mapping (no transformation)
   - Text transformations (uppercase, lowercase)
   - String manipulations (concatenation, substring, replace)
   - Value mapping
   - Custom JavaScript transformations
3. Visual representation of differences between source and target data
4. Tabbed interface for different views (simple, JSON, visual diff, history)
5. Batch preview for multiple test cases
6. Interactive data structure comparison
7. Validation of transformed data against target system requirements
8. Configuration wizard with step-by-step guidance

## Testing Notes

- When testing this functionality, use mock data for previews since the actual API endpoints may not be available
- The UI is designed to work with the transformation service but falls back to mock data for development
- For deeper testing, consider using the JSONTree component which requires the react-json-tree package
- Some components have Material-UI dependencies that need to be mocked in tests

## Manual Testing Verification

As of April 10, 2025, manual verification has confirmed:

1. ✅ TransformationPreviewPage loads without errors
2. ✅ All tabs display the expected content
3. ✅ The wizard flow works correctly with field mapping configuration
4. ✅ Transformation previews render correctly for all supported transformation types
5. ✅ Batch preview works with multiple test cases
6. ✅ Data visualization components correctly highlight differences

## Future Work

While the core functionality is complete, future enhancements could include:

1. Additional transformation types for specific data formats
2. Enhanced visualization for complex data structures
3. Performance optimizations for large test cases
4. Expanded test coverage for edge cases