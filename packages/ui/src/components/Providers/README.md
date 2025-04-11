# Provider Connection Components

This directory contains components for configuring and testing connections to external test management systems.

## Key Components

### Provider Config Panels

- **ZephyrConfigPanel**: Configuration panel for Zephyr Scale with connection testing
- **QTestConfigPanel**: Configuration panel for qTest Manager with connection testing
- **ProviderConfigPanel**: Generic provider configuration panel
- **ProviderSelector**: Component for selecting between available providers
- **ConnectionForm**: Reusable connection form component

## Connection Verification

Each provider config panel includes robust connection testing functionality with the following features:

1. **Validation of credentials and parameters**:
   - Checks for required fields
   - URL format validation
   - Project ID/key validation
   - Token/API key validation
   - Advanced configuration validation

2. **Real-time feedback during connection testing**:
   - Visual loading indicator while testing
   - Real-time status updates
   - Color-coded status indicators

3. **Detailed Success Information**:
   - Connection success message
   - API version information
   - Authenticated user details
   - Project name and metadata
   - Test case count information
   - Project statistics

4. **Detailed Error Information**:
   - Clear failure messages
   - Specific error codes and descriptions
   - Troubleshooting guidance
   - Visual error indicators

5. **Security Features**:
   - Password/API key masking
   - Copy-to-clipboard functionality
   - Token generation helpers
   - Link to provider documentation

## Testing

The connection verification components have been thoroughly tested:

1. **Unit Tests**:
   - ZephyrConfigPanel.test.tsx
   - QTestConfigPanel.test.tsx
   - ConnectionForm.test.tsx
   - ProviderConfigPanel.test.tsx

2. **API Integration Tests**:
   - Karate tests for connection verification
   - Tests for different error scenarios
   - Tests for successful connection responses

3. **Security Testing**:
   - Handling of sensitive credentials
   - Proper masking of secret values
   - Secure API key/token storage

## Implementation Notes

- The components follow a consistent design pattern for uniformity
- All components provide detailed error messages and validation feedback
- The UI displays appropriate loading states, success indicators, and error states
- Tooltips and help text provide guidance for users
- Links to provider documentation help with troubleshooting

## Example Usage

```tsx
// ZephyrConfigPanel example
<ZephyrConfigPanel
  initialParams={{
    baseUrl: 'https://api.zephyrscale.smartbear.com/v2',
    apiKey: '',
    projectKey: ''
  }}
  onSave={handleSaveZephyrConfig}
/>

// QTestConfigPanel example
<QTestConfigPanel
  initialParams={{
    baseUrl: 'https://example.qtestnet.com',
    apiToken: '',
    projectId: ''
  }}
  onSave={handleSaveQTestConfig}
/>
```

## Backend API

The connection testing is handled by the `ProviderConnectionService`, which makes requests to the backend:

- POST `/api/providers/{providerId}/test-connection` - Test a provider connection
- GET `/api/providers/{providerId}/connection-fields` - Get fields for a provider connection

The API responses include detailed success and error information that is displayed in the UI.