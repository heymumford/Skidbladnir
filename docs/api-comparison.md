# Zephyr Scale vs qTest API Comparison

This document outlines the key differences between Zephyr Scale and qTest APIs to inform our transformation strategy.

## Authentication

### Zephyr Scale
- Uses JWT or API tokens
- Standard Jira API authentication for Jira-related data
- Rate limits based on Atlassian Cloud plans

### qTest
- Uses bearer tokens
- OAuth 2.0 support
- Rate limits based on subscription tier

## Core Entity Mapping

| Zephyr Scale Entity | qTest Entity       | Notes                                  |
|---------------------|--------------------|-----------------------------------------|
| Test                | Test Case          | Direct mapping with hierarchy differences |
| Test Step           | Test Step          | Similar structure                      |
| Test Script         | Automated Test Case| Different automation paradigms         |
| Folder              | Module             | Hierarchy mapping required              |
| Cycle               | Test Cycle         | Similar but with structural differences |
| Execution           | Test Run           | Similar concept                        |
| Status              | Status             | Custom status mapping required         |
| Defect              | Defect Link        | Integration differences with issue trackers |
| Attachment          | Attachment         | Similar approach to binary data        |
| Test Plan           | Test Plan          | Feature parity but different structure |

## API Endpoints

### Zephyr Scale Key Endpoints
- `/tests` - Test case management
- `/folders` - Test folder structure
- `/cycles` - Test cycle definition
- `/executions` - Test execution records
- `/attachments` - Binary content management

### qTest Key Endpoints
- `/projects/{projectId}/test-cases` - Test case management
- `/projects/{projectId}/modules` - Module structure (folders)
- `/projects/{projectId}/test-cycles` - Test cycle management
- `/projects/{projectId}/test-runs` - Test execution records
- `/projects/{projectId}/attachments` - Attachment management

## Data Structure Differences

### Test Cases
- Zephyr Scale uses flat custom fields, qTest has structured properties
- Test step structure differs in required fields
- Automation metadata structure varies significantly

### Test Cycles
- qTest has more structured cycle hierarchy
- Zephyr cycles have different access control model
- Execution assignment differs between platforms

### Attachments
- Both use multipart form data for uploads
- Different size limits and supported formats
- Different storage and reference mechanisms

## Rate Limits and Performance Considerations

### Zephyr Scale
- Rate limits typically 300-1000 requests/minute depending on plan
- Bulk operations limited in scope
- Attachment size restrictions vary by plan

### qTest
- Rate limits typically 100-500 requests/minute depending on subscription
- More comprehensive bulk operations
- Different caching strategies required

## Transformation Challenges

1. **Custom Fields**: Mapping between custom field schemas
2. **Status Values**: Preserving status values and workflows
3. **Hierarchical Structure**: Converting between different hierarchy models
4. **Relationship Preservation**: Maintaining links between entities
5. **Execution History**: Preserving execution history and results
6. **Attachments**: Migrating binary content efficiently
7. **Automation Integration**: Adapting automation references