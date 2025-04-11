# Skidbladnir User Interface Guide

## Overview

Skidbladnir features a distinctive LCARS-inspired user interface (based on Star Trek's "Library Computer Access/Retrieval System") designed to provide a beautiful, intuitive workflow for migrating test cases between Zephyr Scale and qTest. The UI guides you through each step of the process with clear visual indicators and interactive components.

## Key UI Components

### Migration Wizard

The migration process is organized as a 5-step wizard:

1. **Provider Configuration**: Connect to your Zephyr Scale and qTest instances
2. **Field Mapping**: Match fields between source and target systems
3. **Transformation Preview**: Preview and fine-tune field transformations
4. **Execution Configuration**: Set up migration parameters
5. **Review & Start**: Final review before starting the migration

### LCARS Design Elements

The interface features several distinctive Star Trek LCARS-inspired elements:

- **Asymmetric Panels**: Information panels with color blocks along one side
- **Blinking Status Indicators**: Real-time status feedback with animated indicators
- **Rounded Interface Elements**: Distinctive curved corners on containers and buttons
- **Color-Coded Components**: Intuitive color scheme for different functions and states

### Key Screens

#### Provider Configuration

Configure your connections to Zephyr Scale and qTest:

- **Zephyr Configuration**: API URL, API Key, Project Key
- **qTest Configuration**: Instance URL, API Token, Project ID
- **Connection Testing**: Verify connectivity before proceeding
- **Advanced Settings**: Configure timeouts, retries, and other options

#### Field Mapping

Map fields between Zephyr Scale and qTest:

- **Auto-Mapping**: Automatically match fields with similar names
- **Field Filtering**: Search and filter available fields
- **Required Fields**: Visual indicators for mandatory mappings
- **Field Types**: Type compatibility verification
- **Mapping Status**: Real-time validation of mapping completeness

#### Transformation Preview

Preview how data will be transformed between systems:

- **Real-Time Preview**: Instant preview of transformations
- **Visual Diff View**: Side-by-side comparisons showing changes
- **JSON View**: Detailed view of the transformed data structure
- **Batch Preview**: Test transformations across multiple test cases
- **Field Comparison**: Field-by-field breakdown of transformations

#### Execution Control

Control and monitor the migration process:

- **Progress Tracking**: Real-time progress indicators
- **Operation Timeline**: Visual representation of migration steps
- **Play/Pause/Cancel**: Intuitive controls for managing migration
- **Status Feedback**: Clear indicators for successful/failed operations
- **Resource Monitoring**: CPU, memory, and network utilization stats

## Navigation Tips

- **Wizard Navigation**: Use the Next/Back buttons to navigate between wizard steps
- **Dashboard Access**: The sidebar provides quick access to different views
- **Status Panel**: Monitor overall system status via the top status bar
- **Help Icons**: Look for (?) icons for contextual help and tooltips

## Customization

The interface supports multiple themes:

- **LCARS Theme**: The default Star Trek inspired interface
- **Dark Theme**: A modern dark interface for reduced eye strain
- **Light Theme**: A clean, professional light interface

Toggle between themes using the theme selector in the user menu.

## Troubleshooting Tips

- **Connection Issues**: Use the "Test Connection" button to diagnose API connectivity problems
- **Validation Errors**: Field mapping validation errors appear in red with clear instructions
- **Migration Errors**: The error summary panel provides detailed error information with remediation options
- **Performance Issues**: Check the resource utilization panel if migrations seem slow

## Related Documentation

- [UI Implementation Architecture](../../docs/adrs/0014-lcars-ui-implementation.md)
- [Field Mapping Guide](../user/field-mapping-guide.md)
- [Transformation Preview Guide](../user/transformation-preview-guide.md)
- [Execution Monitoring Guide](../user/execution-monitoring-guide.md)