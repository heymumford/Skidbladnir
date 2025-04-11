# Zephyr Scale to qTest Migration Guide

Welcome to the Skidbladnir migration guide! This document provides detailed instructions for migrating test assets from Zephyr Scale to qTest Manager.

## Table of Contents

- [Introduction](#introduction)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Migration Process](#detailed-migration-process)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)

## Introduction

Skidbladnir is a powerful test asset migration tool that allows you to migrate your test cases, test suites, and attachments from Zephyr Scale to qTest Manager while preserving your test structure, relationships, and execution history.

## Prerequisites

Before starting a migration, ensure you have:

- **API Access**: Valid API tokens for both Zephyr Scale and qTest
- **Permissions**: Proper read access to Zephyr Scale and write access to qTest
- **Project Structure**: Identified target projects in qTest where your Zephyr test assets will be migrated
- **System Requirements**: A machine with at least 4GB RAM and 10GB free disk space

## Quick Start

1. **Install Skidbladnir**:
   ```bash
   # For Linux
   ./scripts/install-linux.sh
   
   # For macOS
   ./scripts/install-macos.sh
   
   # For Windows
   .\scripts\install-windows.sh
   ```

2. **Launch the application**:
   ```bash
   ./scripts/skidbladnir.sh start
   ```

3. **Configure source (Zephyr Scale)**:
   - Enter your Zephyr Scale URL (e.g., `https://yourcompany.atlassian.net`)
   - Provide your Zephyr API token
   - Test the connection

4. **Configure target (qTest)**:
   - Enter your qTest URL (e.g., `https://yourcompany.qtestnet.com`)
   - Provide your qTest API token
   - Select target project
   - Test the connection

5. **Configure field mappings**:
   - Map Zephyr fields to corresponding qTest fields
   - Configure custom field transformations if needed

6. **Preview migration**:
   - Review sample test cases
   - Verify field mappings
   - Check attachment handling

7. **Start migration**:
   - Click "Start Migration"
   - Monitor progress

## Detailed Migration Process

The migration process consists of the following steps:

1. **Provider Configuration**
2. **Field Mapping**
3. **Preview and Validation**
4. **Execution**
5. **Verification**

### 1. Provider Configuration

#### Zephyr Scale Configuration

1. Open the Skidbladnir application and navigate to the "Configuration" tab
2. Select "Zephyr Scale" as the source provider
3. Enter the following information:
   - **URL**: Your Jira Cloud URL (e.g., `https://yourcompany.atlassian.net`)
   - **API Token**: Your Zephyr API token
   - **Project Key**: The Jira project key containing your test cases

#### qTest Configuration

1. In the "Configuration" tab, select "qTest Manager" as the target provider
2. Enter the following information:
   - **URL**: Your qTest URL (e.g., `https://yourcompany.qtestnet.com`)
   - **API Token**: Your qTest API token
   - **Project ID**: The qTest project ID where test cases will be migrated

### 2. Field Mapping

Field mapping allows you to specify how fields from Zephyr Scale should be mapped to qTest fields:

1. Navigate to the "Field Mapping" tab
2. For each Zephyr field, select the corresponding qTest field
3. Configure transformation rules if needed:
   - **Text transformations**: Concatenation, splitting, case changes
   - **Value mapping**: Map specific values (e.g., priorities, statuses)
   - **Custom transformations**: Advanced JavaScript transformations

Example mapping:

| Zephyr Field    | qTest Field      | Transformation |
|-----------------|------------------|----------------|
| Summary         | Name             | None           |
| Description     | Description      | None           |
| Labels          | Tags             | Split by comma |
| Priority        | Priority         | Value mapping  |
| Test Components | Custom Field     | None           |

### 3. Preview and Validation

Before starting the migration, preview how your test cases will appear in qTest:

1. Navigate to the "Preview" tab
2. Select a few sample test cases from different folders or with different properties
3. Review how each field will be transformed
4. Verify that attachments are properly identified and will be migrated
5. Check for any validation errors or warnings

### 4. Execution

Once you're satisfied with the configuration and preview:

1. Navigate to the "Migration" tab
2. Select which elements to migrate:
   - Test cases
   - Test folders/modules
   - Attachments
   - Test steps
   - Execution history (optional)
3. Click "Start Migration"
4. The migration will proceed through the following phases:
   - Initializing connection
   - Fetching source test cases
   - Transforming test cases
   - Creating test cases in qTest
   - Processing attachments
   - Establishing relationships
   - Finalizing migration

### 5. Verification

After migration completes:

1. Navigate to the "Verification" tab
2. Review the migration summary:
   - Total test cases migrated
   - Success rate
   - Any errors or warnings
3. Use the validation tool to verify:
   - Test case counts match
   - All attachments were successfully migrated
   - Test relationships were preserved

## Troubleshooting

### Common Issues

#### Connection Problems

- **Zephyr Connection Failed**: Verify your Jira URL and API token
- **qTest Connection Failed**: Check your qTest URL and API token
- **Timeout Errors**: Your network might be restricted or slow. Try increasing timeout settings in the configuration

#### Field Mapping Issues

- **Missing Fields**: Some custom fields may not be automatically detected. Use the custom field mapping tool
- **Invalid Transformations**: Check transformation rules for syntax errors
- **Field Type Mismatches**: Ensure field types are compatible between systems

#### Migration Errors

- **Rate Limiting**: If you encounter API rate limit errors, reduce the concurrency setting
- **Large Attachments**: Files over 100MB may cause timeouts. Consider migrating large attachments separately
- **Memory Issues**: For very large migrations, increase the available memory

### Error Resolution

The application provides detailed error information with suggested remediation steps. Common resolutions include:

- **Authentication errors**: Refresh your API tokens
- **Permission errors**: Ensure proper access to both systems
- **Network errors**: Check your network connection and proxy settings
- **Data format errors**: Use the transformation tools to correct field format issues

## FAQ

### General Questions

**Q: How long does migration take?**  
A: Migration time depends on the number of test cases and attachments. A typical project with 1000 test cases might take 30-60 minutes.

**Q: Will my Zephyr data be modified?**  
A: No, Skidbladnir only reads data from Zephyr Scale and does not modify your source data.

**Q: Can I pause and resume migration?**  
A: Yes, you can pause the migration process and resume it later. The system tracks progress and can continue from where it left off.

**Q: How are test folders handled?**  
A: Test folders from Zephyr will be recreated as modules in qTest with the same hierarchical structure.

### Technical Questions

**Q: How does the tool handle field type differences?**  
A: Skidbladnir includes smart field type converters that automatically transform data between different field types while preserving the information.

**Q: Can I migrate only a subset of test cases?**  
A: Yes, you can filter test cases by folder, label, or custom criteria before migration.

**Q: Are test relationships preserved?**  
A: Yes, relationships between test cases, such as dependencies or links, are preserved during migration.

**Q: How are attachments handled?**  
A: Attachments are downloaded from Zephyr Scale and uploaded to qTest. The system maintains the association between attachments and test cases.

**Q: What about custom fields?**  
A: Custom fields from Zephyr can be mapped to custom fields in qTest. You may need to create matching custom fields in qTest before migration.

## Additional Resources

- [Video Tutorial: Complete Migration Walkthrough](https://skidbladnir.example.com/tutorials/migration)
- [Field Mapping Reference](field-mapping-reference.md)
- [API Token Generation Guide](api-token-guide.md)
- [Advanced Transformation Examples](transformation-examples.md)
- [Performance Optimization Guide](performance-optimization.md)

## Support

If you encounter any issues not covered in this documentation, please contact our support team at support@skidbladnir.example.com or open an issue on our GitHub repository.