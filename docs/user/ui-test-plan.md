# Skíðblaðnir UI Test-Driven Development Plan

This document outlines the detailed test-driven development approach for implementing the Skíðblaðnir web interface, aligned with [ADR-0006: Web Interface Architecture](./adrs/0006-web-interface-architecture.md) and the [UI Requirements Document](./ui-requirements.md).

## TDD Approach for UI Components

Each UI component will be developed following a rigorous TDD approach:

1. **Write Component Test First**: Define test cases that validate the component's expected behavior.
2. **Implement Minimal Component**: Create the simplest implementation that passes tests.
3. **Refactor**: Improve the component design and implementation without changing functionality.
4. **Extend Tests**: Add tests for additional features and edge cases.
5. **Extend Implementation**: Enhance the component to pass the additional tests.
6. **Documentation**: Document the component's API and usage.

## Testing Tools and Structure

- **Jest**: Primary test runner
- **React Testing Library**: Component testing
- **Cypress**: End-to-end testing
- **MSW (Mock Service Worker)**: API mocking
- **Storybook**: Component development and visual testing

## Test Categories

### 1. Unit Tests

| Category | Description | Examples |
|----------|-------------|----------|
| Component Rendering | Verify components render correctly | Button renders with correct text |
| Props Handling | Verify components handle props correctly | Dropdown shows correct options from props |
| State Management | Verify components manage internal state | Form field shows validation error on invalid input |
| Event Handling | Verify components respond to events | Click handler is called when button is clicked |
| Conditional Rendering | Verify conditional UI elements | Error message appears when network request fails |

### 2. Integration Tests

| Category | Description | Examples |
|----------|-------------|----------|
| Component Composition | Test components working together | Form submission triggers validation then submits |
| API Integration | Test interaction with backend APIs | Provider list loads from API and displays |
| Feature Workflows | Test complete feature flows | Complete provider connection form and test connection |
| Page Composition | Test complete page rendering | Provider configuration page renders all required components |
| Navigation | Test navigation between pages | Clicking next button advances to mapping page |

### 3. End-to-End Tests

| Category | Description | Examples |
|----------|-------------|----------|
| User Workflows | Test complete user journeys | Configure source and target, map fields, run migration |
| Error Recovery | Test error handling and recovery | Recover from connection failure with retry |
| Performance | Test UI under load conditions | Render large field mapping list without performance issues |
| API Failure Scenarios | Test behavior when APIs fail | Show appropriate error message when API unavailable |
| Data Persistence | Test saving and loading configurations | Save connection profile and reload it later |

## Detailed Test Specifications by Component

### 1. Provider Selection Component Tests

```typescript
// Test: Provider selection component displays available providers
test('displays list of available providers', async () => {
  // Arrange: Mock the provider API response
  const mockProviders = [
    { id: 'jira', name: 'Jira/Zephyr', version: '1.0.0' },
    { id: 'qtest', name: 'qTest', version: '1.0.0' }
  ];
  
  // Act: Render the component
  render(<ProviderSelector providers={mockProviders} onSelect={jest.fn()} />);
  
  // Assert: Provider options are displayed
  expect(screen.getByText('Jira/Zephyr')).toBeInTheDocument();
  expect(screen.getByText('qTest')).toBeInTheDocument();
});

// Test: Provider selection triggers selection callback
test('selecting a provider calls onSelect callback', async () => {
  // Arrange: Create mock callback and providers
  const mockOnSelect = jest.fn();
  const mockProviders = [
    { id: 'jira', name: 'Jira/Zephyr', version: '1.0.0' },
    { id: 'qtest', name: 'qTest', version: '1.0.0' }
  ];
  
  // Act: Render and select a provider
  render(<ProviderSelector providers={mockProviders} onSelect={mockOnSelect} />);
  userEvent.click(screen.getByText('Jira/Zephyr'));
  
  // Assert: Callback was called with correct provider
  expect(mockOnSelect).toHaveBeenCalledWith(mockProviders[0]);
});
```

### 2. Connection Form Component Tests

```typescript
// Test: Connection form validates required fields
test('validates required connection fields', async () => {
  // Arrange: Create mock provider with required fields
  const mockProvider = {
    id: 'jira',
    name: 'Jira/Zephyr',
    connectionFields: [
      { name: 'url', label: 'API URL', required: true },
      { name: 'apiKey', label: 'API Key', required: true }
    ]
  };
  
  // Act: Render form and attempt to submit without filling fields
  render(<ConnectionForm provider={mockProvider} onSubmit={jest.fn()} />);
  userEvent.click(screen.getByText('Test Connection'));
  
  // Assert: Validation errors are displayed
  expect(screen.getByText('API URL is required')).toBeInTheDocument();
  expect(screen.getByText('API Key is required')).toBeInTheDocument();
});

// Test: Connection testing provides appropriate feedback
test('displays appropriate feedback during connection test', async () => {
  // Arrange: Mock successful connection test
  const mockTestConnection = jest.fn().mockResolvedValue({ success: true });
  
  // Act: Render form and submit with valid data
  render(<ConnectionForm 
    provider={{ id: 'jira', name: 'Jira/Zephyr' }}
    onTestConnection={mockTestConnection}
  />);
  
  // Fill required fields
  userEvent.type(screen.getByLabelText('API URL'), 'https://jira.example.com');
  userEvent.type(screen.getByLabelText('API Key'), 'test-api-key');
  
  // Submit form
  userEvent.click(screen.getByText('Test Connection'));
  
  // Assert: Loading and success states
  expect(screen.getByText('Testing connection...')).toBeInTheDocument();
  await waitFor(() => {
    expect(screen.getByText('Connection successful!')).toBeInTheDocument();
  });
});
```

### 3. Field Mapping Component Tests

```typescript
// Test: Source and target fields are correctly displayed
test('displays source and target fields correctly', async () => {
  // Arrange: Mock source and target fields
  const mockSourceFields = [
    { id: 'summary', name: 'Summary', type: 'string' },
    { id: 'description', name: 'Description', type: 'text' }
  ];
  const mockTargetFields = [
    { id: 'name', name: 'Name', type: 'string' },
    { id: 'details', name: 'Details', type: 'text' }
  ];
  
  // Act: Render the mapping component
  render(
    <FieldMapping 
      sourceFields={mockSourceFields} 
      targetFields={mockTargetFields}
      mappings={[]}
      onUpdateMappings={jest.fn()}
    />
  );
  
  // Assert: Fields are displayed correctly
  expect(screen.getByText('Summary')).toBeInTheDocument();
  expect(screen.getByText('Description')).toBeInTheDocument();
  expect(screen.getByText('Name')).toBeInTheDocument();
  expect(screen.getByText('Details')).toBeInTheDocument();
});

// Test: Mapping operations correctly link source to target fields
test('creates mapping between source and target fields', async () => {
  // Arrange: Mock fields and update callback
  const mockSourceFields = [{ id: 'summary', name: 'Summary', type: 'string' }];
  const mockTargetFields = [{ id: 'name', name: 'Name', type: 'string' }];
  const onUpdateMappings = jest.fn();
  
  // Act: Render and create mapping
  render(
    <FieldMapping 
      sourceFields={mockSourceFields} 
      targetFields={mockTargetFields}
      mappings={[]}
      onUpdateMappings={onUpdateMappings}
    />
  );
  
  // Select fields and create mapping
  userEvent.click(screen.getByText('Summary')); // Select source
  userEvent.click(screen.getByText('Name')); // Select target
  userEvent.click(screen.getByText('Create Mapping')); // Create mapping
  
  // Assert: Mapping callback was called with correct data
  expect(onUpdateMappings).toHaveBeenCalledWith([
    { sourceId: 'summary', targetId: 'name', transformation: null }
  ]);
});
```

### 4. Migration Control Component Tests

```typescript
// Test: Migration configuration correctly validates inputs
test('validates migration configuration inputs', async () => {
  // Arrange: Render component
  render(<MigrationConfig onSubmit={jest.fn()} />);
  
  // Act: Submit with invalid values
  userEvent.type(screen.getByLabelText('Batch Size'), '-1');
  userEvent.click(screen.getByText('Start Migration'));
  
  // Assert: Validation errors are displayed
  expect(screen.getByText('Batch size must be a positive number')).toBeInTheDocument();
});

// Test: Execution controls correctly affect migration state
test('pause button correctly pauses migration', async () => {
  // Arrange: Mock migration control API
  const mockPauseMigration = jest.fn().mockResolvedValue({ status: 'paused' });
  
  // Act: Render control panel and click pause
  render(
    <MigrationControlPanel 
      migrationId="test-migration"
      status="running"
      onPause={mockPauseMigration}
    />
  );
  userEvent.click(screen.getByText('Pause'));
  
  // Assert: Pause function was called
  expect(mockPauseMigration).toHaveBeenCalledWith('test-migration');
});
```

### 5. Monitoring Component Tests

```typescript
// Test: Progress indicators correctly reflect migration status
test('progress bar reflects migration completion percentage', async () => {
  // Arrange: Mock migration status
  const mockStatus = {
    totalItems: 100,
    processedItems: 42,
    failedItems: 3,
    status: 'running'
  };
  
  // Act: Render progress component
  render(<MigrationProgress status={mockStatus} />);
  
  // Assert: Progress is correctly displayed
  const progressBar = screen.getByRole('progressbar');
  expect(progressBar).toHaveAttribute('aria-valuenow', '42');
  expect(screen.getByText('42%')).toBeInTheDocument();
});

// Test: Log filtering correctly filters by criteria
test('log filtering restricts displayed logs', async () => {
  // Arrange: Mock logs with different severity levels
  const mockLogs = [
    { id: '1', message: 'Info message', severity: 'info', timestamp: new Date() },
    { id: '2', message: 'Error occurred', severity: 'error', timestamp: new Date() }
  ];
  
  // Act: Render log component and filter by error
  render(<ActivityLog logs={mockLogs} />);
  userEvent.click(screen.getByLabelText('Error'));
  
  // Assert: Only error logs are visible
  expect(screen.getByText('Error occurred')).toBeInTheDocument();
  expect(screen.queryByText('Info message')).not.toBeInTheDocument();
});
```

## Integration Test Examples

```typescript
// Test: Complete provider configuration workflow
test('completes provider configuration workflow', async () => {
  // Arrange: Mock API responses
  server.use(
    rest.get('/api/providers', (req, res, ctx) => {
      return res(ctx.json([
        { id: 'jira', name: 'Jira/Zephyr', version: '1.0.0' },
        { id: 'qtest', name: 'qTest', version: '1.0.0' }
      ]));
    }),
    rest.post('/api/connection/test', (req, res, ctx) => {
      return res(ctx.json({ success: true, message: 'Connected successfully' }));
    })
  );
  
  // Act: Render provider configuration page
  render(<ProviderConfigPage />);
  
  // Select providers
  userEvent.click(screen.getByLabelText('Source Provider'));
  userEvent.click(screen.getByText('Jira/Zephyr'));
  userEvent.click(screen.getByLabelText('Target Provider'));
  userEvent.click(screen.getByText('qTest'));
  
  // Fill connection forms
  userEvent.type(screen.getByLabelText('API URL'), 'https://jira.example.com');
  userEvent.type(screen.getByLabelText('API Key'), 'test-api-key');
  
  // Test connection
  userEvent.click(screen.getByText('Test Connection'));
  
  // Assert: Success message and navigation
  await waitFor(() => {
    expect(screen.getByText('Connected successfully')).toBeInTheDocument();
  });
  
  // Continue to next step
  userEvent.click(screen.getByText('Next'));
  
  // Verify navigation to mapping page
  await waitFor(() => {
    expect(screen.getByText('Field Mapping')).toBeInTheDocument();
  });
});
```

## E2E Test Examples

```typescript
// Cypress test for complete migration workflow
describe('End-to-end migration workflow', () => {
  it('completes a full migration', () => {
    // Visit app
    cy.visit('/');
    
    // Configure source provider
    cy.contains('Providers').click();
    cy.get('[data-testid="source-provider-select"]').click();
    cy.contains('Jira/Zephyr').click();
    cy.get('[data-testid="source-url"]').type('https://jira.example.com');
    cy.get('[data-testid="source-apikey"]').type('test-api-key');
    cy.contains('Test Connection').click();
    cy.contains('Connection successful').should('be.visible');
    
    // Configure target provider
    cy.get('[data-testid="target-provider-select"]').click();
    cy.contains('qTest').click();
    cy.get('[data-testid="target-url"]').type('https://qtest.example.com');
    cy.get('[data-testid="target-apikey"]').type('test-api-key');
    cy.contains('Test Connection').click();
    cy.contains('Connection successful').should('be.visible');
    
    // Go to mapping page
    cy.contains('Next').click();
    cy.contains('Field Mapping').should('be.visible');
    
    // Create field mappings
    cy.get('[data-testid="source-field-summary"]').click();
    cy.get('[data-testid="target-field-name"]').click();
    cy.contains('Create Mapping').click();
    
    // Validate mappings
    cy.contains('Validate Mappings').click();
    cy.contains('Mappings are valid').should('be.visible');
    
    // Go to execution page
    cy.contains('Next').click();
    cy.contains('Migration Configuration').should('be.visible');
    
    // Configure migration
    cy.get('[data-testid="batch-size"]').clear().type('10');
    cy.get('[data-testid="scope-select"]').click();
    cy.contains('Test Sample').click();
    
    // Start migration
    cy.contains('Start Test Run').click();
    
    // Verify progress on monitoring page
    cy.contains('Migration Progress').should('be.visible');
    cy.get('[role="progressbar"]').should('exist');
    
    // Verify completion
    cy.contains('Migration completed', { timeout: 10000 }).should('be.visible');
  });
});
```

## Component Documentation Template

For each component, the following documentation will be generated:

```markdown
# Component: [ComponentName]

## Purpose
Brief description of the component's purpose

## Props
| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| prop1 | string | Yes | - | Description of prop1 |
| prop2 | number | No | 0 | Description of prop2 |

## Usage Examples
```tsx
// Basic usage
<ComponentName prop1="value" />

// Advanced usage
<ComponentName prop1="value" prop2={42} />
```

## Behavior
Description of component behavior, including:
- State management
- Side effects
- Event handling
- Conditional rendering

## Accessibility
Accessibility considerations and implementations

## Related Components
Links to related components
```

## Implementation Sequence

The UI implementation will follow this sequence to ensure foundational components are available for more complex features:

1. Setup TypeScript React project with testing infrastructure
2. Implement core layout components (AppLayout, NavigationBar, ActivityLog)
3. Develop base UI component library (Button, Input, Select, etc.)
4. Implement Provider Configuration components
5. Develop Field Mapping interface
6. Implement Execution Control components
7. Create Monitoring and Statistics visualizations
8. Develop Settings and Utilities components
9. Implement API integration for all features
10. Develop end-to-end integration

Each step will follow the TDD cycle with tests written before implementation.

## Storybook Documentation

All components will include Storybook stories that demonstrate:

1. Default usage
2. Variations and states
3. Responsive behavior
4. Edge cases
5. Accessibility features

The Storybook documentation will serve as a living component catalog and development guide.