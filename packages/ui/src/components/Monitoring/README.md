# Real-Time Migration Monitoring Dashboard

This directory contains components for the real-time migration monitoring dashboard, providing users with detailed insights into the progress, performance, and operational details of test case migrations.

## Key Components

### RealTimeMigrationDashboard

The main dashboard component that integrates multiple visualizations and monitoring tools to provide a comprehensive view of a migration's status and progress.

Features:
- Real-time progress tracking with auto-refresh capability
- Migration status overview with key metrics
- Detailed operation tracking with dependency visualization
- Performance metrics and resource usage monitoring
- Timeline visualization of operation execution
- Support for pause, resume, and cancel operations

### OperationDependencyGraph

A canvas-based component that visualizes the dependencies between migration operations, showing their status, progress, and relationships.

Features:
- Interactive graph with hover tooltips
- Color-coded operation states (pending, running, completed, failed)
- Visual progress indicators
- Support for selecting operations to view details

### OperationTimelineView

A timeline visualization showing when each operation started, how long it ran, and its status.

Features:
- Gantt chart-style visualization
- Time scale with markers
- Operation details on hover
- Color-coded operation states

### ResourceUsageMonitor

A component for monitoring system resource usage during migration operations.

Features:
- CPU, memory, and network usage monitoring
- Real-time updates
- Visual indicators for resource pressure

### PerformanceMetricsPanel

A panel displaying performance metrics for the migration process.

Features:
- Throughput metrics (items processed per minute)
- Response time metrics
- Error rate tracking
- Performance trends

## Architecture

The monitoring components follow a hierarchical structure:

```
MonitoringDashboardPage
└── RealTimeMigrationDashboard
    ├── Migration Status Summary
    ├── OperationDependencyGraph
    ├── OperationTimelineView
    ├── ResourceUsageMonitor
    └── PerformanceMetricsPanel
```

## Usage

The RealTimeMigrationDashboard component can be used to monitor any migration by providing a migration ID:

```tsx
<RealTimeMigrationDashboard
  migrationId="migration-123"
  autoRefresh={true}
  refreshInterval={5000}
  onPause={handlePauseMigration}
  onResume={handleResumeMigration}
  onCancel={handleCancelMigration}
/>
```

## Testing

Each component has corresponding test files:
- RealTimeMigrationDashboard.test.tsx
- OperationDependencyGraph.test.tsx
- OperationTimelineView.test.tsx
- ResourceUsageMonitor.test.tsx
- PerformanceMetricsPanel.test.tsx

To run tests for these components:

```bash
npm test -- -t "RealTimeMigrationDashboard\|OperationDependencyGraph"
```

## Implementation Notes

- The dashboard uses the Canvas API for graphical components
- Components adapt to both light and dark themes
- Polling is implemented with configurable intervals for real-time updates
- Resource usage monitoring is client-side only in development mode
- In production environments, the dashboard connects to server metrics