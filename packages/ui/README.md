# Skíðblaðnir Web Interface

This package contains the React-based web interface for Skíðblaðnir, the universal test asset migration platform. The interface provides a clean, professional UI for configuring, monitoring, and controlling test asset migrations between various test management systems.

## Features

- Provider configuration and connection management
- Field mapping and transformation configuration
- Migration execution control and monitoring
- Real-time progress tracking and statistics
- Comprehensive logging and diagnostics

## Technology Stack

- React 18+ with TypeScript
- Material UI for component library
- React Router for navigation
- React Query for data fetching and caching
- Socket.IO for real-time updates
- Storybook for component development
- Jest and React Testing Library for testing

## Development

### Prerequisites

- Node.js 16+
- npm 7+

### Getting Started

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm start
```

3. Run tests:

```bash
npm test
```

4. Start Storybook:

```bash
npm run storybook
```

## Project Structure

- `/src/components`: Reusable UI components
  - `/Layout`: Core layout components
  - `/Providers`: Provider configuration components
  - `/Mapping`: Field mapping components
  - `/Execution`: Migration execution components
  - `/Monitoring`: Progress monitoring components
  - `/Settings`: Application settings components
  - `/common`: Common UI elements

- `/src/pages`: Application pages
  - `ProvidersPage`: Provider selection and configuration
  - `MappingPage`: Field mapping configuration
  - `ExecutionPage`: Migration control and execution
  - `MonitoringPage`: Migration monitoring and statistics
  - `SettingsPage`: Application settings

- `/src/contexts`: React contexts for state management
  - `LogContext`: Logging and activity tracking
  - `MigrationContext`: Migration state and control
  - `ProviderContext`: Provider configuration state

- `/src/hooks`: Custom React hooks
- `/src/services`: API client and service functions
- `/src/utils`: Utility functions
- `/src/types`: TypeScript type definitions
- `/src/assets`: Static assets like images and icons

## Testing Approach

The web interface is developed following a TDD (Test-Driven Development) approach:

1. Write component tests that define expected behavior
2. Implement the minimal component to pass tests
3. Refactor and enhance the component
4. Add tests for additional features
5. Implement the additional features

The test suite includes:

- Unit tests for individual components
- Integration tests for component combinations
- End-to-end tests for complete workflows

## Building for Production

To build the application for production:

```bash
npm run build
```

The built files will be in the `build` directory, ready to be served from the container.

## Container Integration

The web interface is designed to be served from within the Skíðblaðnir container infrastructure. It communicates with backend services through a well-defined API.

## Accessibility

The interface is designed with accessibility in mind and aims to meet WCAG 2.1 AA standards.

## Browser Compatibility

The application is tested with:

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Edge (latest 2 versions)
- Safari (latest 2 versions)