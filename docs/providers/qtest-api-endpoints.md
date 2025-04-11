# qTest Products API Endpoints

This document maps the key API endpoints for each qTest product that need to be implemented in our provider adapters. It serves as a reference for implementation and testing.

## qTest Manager

| Endpoint | Method | Description | Implementation Priority | Notes |
|----------|--------|-------------|-------------------------|-------|
| `/api/v3/projects` | GET | Get all projects | High | Required for project selection |
| `/api/v3/projects/{projectId}` | GET | Get project by ID | High | Required for project metadata |
| `/api/v3/projects/{projectId}/test-cases` | GET | Get test cases | Critical | Core test case extraction |
| `/api/v3/projects/{projectId}/test-cases/{testCaseId}` | GET | Get test case by ID | Critical | Detailed test case data |
| `/api/v3/projects/{projectId}/test-cases` | POST | Create test case | Critical | Core test case creation |
| `/api/v3/projects/{projectId}/test-cases/{testCaseId}` | PUT | Update test case | Critical | Test case modification |
| `/api/v3/projects/{projectId}/test-cases/{testCaseId}` | DELETE | Delete test case | Medium | Cleanup operations |
| `/api/v3/projects/{projectId}/test-cycles` | GET | Get test cycles | High | Test cycle extraction |
| `/api/v3/projects/{projectId}/test-cycles/{cycleId}` | GET | Get test cycle by ID | High | Detailed cycle data |
| `/api/v3/projects/{projectId}/test-cycles` | POST | Create test cycle | High | Test cycle creation |
| `/api/v3/projects/{projectId}/test-runs` | GET | Get test runs | High | Test execution extraction |
| `/api/v3/projects/{projectId}/test-runs` | POST | Create test run | High | Test execution creation |
| `/api/v3/projects/{projectId}/test-runs/{runId}/test-logs` | POST | Create test log | High | Test results creation |
| `/api/v3/projects/{projectId}/test-runs/{runId}/test-logs` | GET | Get test logs | High | Test results extraction |
| `/api/v3/projects/{projectId}/requirements` | GET | Get requirements | Medium | Requirements extraction |
| `/api/v3/projects/{projectId}/requirements` | POST | Create requirement | Medium | Requirements creation |
| `/api/v3/projects/{projectId}/requirements/{requirementId}` | GET | Get requirement by ID | Medium | Detailed requirement data |
| `/api/v3/projects/{projectId}/fields` | GET | Get field definitions | High | Custom field metadata |
| `/api/v3/projects/{projectId}/attachments/{attachmentId}` | GET | Download attachment | Medium | Attachment extraction |
| `/api/v3/projects/{projectId}/{entityType}/{entityId}/attachments` | POST | Upload attachment | Medium | Attachment creation |
| `/api/v3/projects/{projectId}/modules` | GET | Get modules | Medium | Module/folder structure |
| `/api/v3/projects/{projectId}/releases` | GET | Get releases | Low | Release tracking |

## qTest Parameters

| Endpoint | Method | Description | Implementation Priority | Notes |
|----------|--------|-------------|-------------------------|-------|
| `/api/v3/projects/{projectId}/parameter-sets` | GET | Get parameter sets | High | Parameter set extraction |
| `/api/v3/projects/{projectId}/parameter-sets/{setId}` | GET | Get parameter set by ID | High | Detailed parameter set data |
| `/api/v3/projects/{projectId}/parameter-sets` | POST | Create parameter set | High | Parameter set creation |
| `/api/v3/projects/{projectId}/parameter-sets/{setId}` | PUT | Update parameter set | High | Parameter set modification |
| `/api/v3/projects/{projectId}/parameter-values` | GET | Get parameter values | High | Parameter data extraction |
| `/api/v3/projects/{projectId}/parameter-values` | POST | Create parameter values | High | Parameter data creation |
| `/api/v3/projects/{projectId}/parameter-profiles` | GET | Get parameter profiles | Medium | Profile configuration |
| `/api/v3/projects/{projectId}/parameter-profiles` | POST | Create parameter profile | Medium | Profile creation |
| `/api/v3/projects/{projectId}/test-cases/{testCaseId}/parameters` | GET | Get test case parameters | High | Parameter mapping extraction |
| `/api/v3/projects/{projectId}/test-cases/{testCaseId}/parameters` | POST | Add parameters to test case | High | Parameter mapping creation |
| `/api/v3/projects/{projectId}/parameter-imports` | POST | Import parameter data | Medium | Bulk parameter import |
| `/api/v3/projects/{projectId}/parameter-exports` | POST | Export parameter data | Medium | Bulk parameter export |

## qTest Scenario

| Endpoint | Method | Description | Implementation Priority | Notes |
|----------|--------|-------------|-------------------------|-------|
| `/api/v3/projects/{projectId}/features` | GET | Get features | High | BDD feature extraction |
| `/api/v3/projects/{projectId}/features/{featureId}` | GET | Get feature by ID | High | Detailed feature data |
| `/api/v3/projects/{projectId}/features` | POST | Create feature | High | Feature creation |
| `/api/v3/projects/{projectId}/features/{featureId}` | PUT | Update feature | High | Feature modification |
| `/api/v3/projects/{projectId}/scenarios` | GET | Get scenarios | High | Scenario extraction |
| `/api/v3/projects/{projectId}/scenarios/{scenarioId}` | GET | Get scenario by ID | High | Detailed scenario data |
| `/api/v3/projects/{projectId}/scenarios` | POST | Create scenario | High | Scenario creation |
| `/api/v3/projects/{projectId}/step-definitions` | GET | Get step definitions | Medium | Step definition extraction |
| `/api/v3/projects/{projectId}/step-definitions` | POST | Create step definition | Medium | Step definition creation |
| `/api/v3/projects/{projectId}/scenario-results` | GET | Get scenario results | Medium | BDD test results extraction |
| `/api/v3/projects/{projectId}/scenario-results` | POST | Create scenario result | Medium | BDD test results creation |
| `/api/v3/projects/{projectId}/feature-files` | POST | Import feature file | High | Feature file import |
| `/api/v3/projects/{projectId}/feature-files/{featureId}` | GET | Export feature file | High | Feature file export |

## qTest Pulse

| Endpoint | Method | Description | Implementation Priority | Notes |
|----------|--------|-------------|-------------------------|-------|
| `/api/v3/projects/{projectId}/insights` | GET | Get test insights | Medium | Metrics extraction |
| `/api/v3/projects/{projectId}/metrics` | GET | Get metrics definitions | Medium | Metrics configuration |
| `/api/v3/projects/{projectId}/metrics/{metricId}/data` | GET | Get metric data | Medium | Historical metrics data |
| `/api/v3/projects/{projectId}/trends` | GET | Get trend analysis | Low | Trend data extraction |
| `/api/v3/projects/{projectId}/integrations` | GET | Get integrations | Low | CI/CD integration data |
| `/api/v3/projects/{projectId}/dashboards` | GET | Get dashboards | Low | Dashboard configurations |
| `/api/v3/projects/{projectId}/reports` | GET | Get report definitions | Low | Report configurations |
| `/api/v3/projects/{projectId}/metrics/calculate` | POST | Calculate custom metrics | Low | Custom metrics creation |
| `/api/v3/projects/{projectId}/webhooks` | GET | Get webhook configurations | Low | Notification settings |

## qTest Data Export

| Endpoint | Method | Description | Implementation Priority | Notes |
|----------|--------|-------------|-------------------------|-------|
| `/api/v3/projects/{projectId}/exports` | POST | Create export job | Medium | Data export initiation |
| `/api/v3/projects/{projectId}/exports/{exportId}` | GET | Get export status | Medium | Export job status |
| `/api/v3/projects/{projectId}/exports/{exportId}/download` | GET | Download export file | Medium | Get export file |
| `/api/v3/projects/{projectId}/imports` | POST | Create import job | Medium | Data import initiation |
| `/api/v3/projects/{projectId}/imports/{importId}` | GET | Get import status | Medium | Import job status |
| `/api/v3/projects/{projectId}/export-configurations` | GET | Get export configurations | Low | Export settings |
| `/api/v3/projects/{projectId}/export-configurations` | POST | Create export configuration | Low | Save export settings |
| `/api/v3/projects/{projectId}/archives` | GET | Get archived data | Low | Archive extraction |
| `/api/v3/projects/{projectId}/archives` | POST | Create archive | Low | Archive creation |

## Implementation Notes

1. **Authentication**:
   - All endpoints require authentication
   - Use Bearer token authentication with format: `Authorization: Bearer {token}`
   - Token obtained via `/api/v3/auth/token` (OAuth2) or `/api/v3/auth/apikey` (API key)

2. **Pagination**:
   - Most GET endpoints that return collections support pagination
   - Use `page` and `pageSize` query parameters
   - Response includes `total`, `page`, and `pageSize` fields

3. **Error Handling**:
   - 400 Bad Request: Field validation errors
   - 401 Unauthorized: Authentication issues
   - 403 Forbidden: Permission issues
   - 404 Not Found: Resource not found
   - 409 Conflict: Resource conflicts/concurrency
   - 429 Too Many Requests: Rate limiting
   - 5xx: Server errors

4. **Content Types**:
   - Request/Response: `application/json` for most endpoints
   - File uploads: `multipart/form-data`
   - File downloads: Various content types depending on file

5. **Implementation Order**:
   1. qTest Manager core endpoints (test cases, cycles, runs)
   2. qTest Parameters core endpoints (parameter sets, values)
   3. qTest Scenario core endpoints (features, scenarios)
   4. Attachment handling across products
   5. Requirements and relationships
   6. qTest Pulse metrics integration
   7. qTest Data Export utilities