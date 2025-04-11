# LCARS Design System Implementation Guide

## Overview

The Skidbladnir application uses a UI design language inspired by Star Trek's LCARS (Library Computer Access/Retrieval System) interface. This guide provides detailed implementation instructions and best practices for using the LCARS design system components.

## Key Design Principles

The LCARS design system is built around these core principles:

1. **Asymmetric Panel Design**: Distinctive panels with color blocks along one side to create visual hierarchy
2. **Rounded UI Elements**: Generous border radii on containers, buttons, and interactive elements
3. **Status Indicators**: Blinking lights and color-coded status elements that communicate system state
4. **Distinctive Color Palette**: High-contrast colors that indicate function and status
5. **Modular Component Structure**: Components composed together to create complex interfaces

## Core Components

### LcarsPanel

The foundational layout component that provides the characteristic asymmetric design with rounded corners.

```tsx
<LcarsPanel 
  title="Panel Title"
  subtitle="Optional subtitle"
  status="Active"
  statusColor="success"
  statusActive={true}
  color="primary"
>
  Content goes here
</LcarsPanel>
```

#### Props

| Prop | Type | Description |
|------|------|-------------|
| `title` | string | Main panel title |
| `subtitle` | string | Optional subtitle |
| `status` | string | Status text to display |
| `statusColor` | 'primary' \| 'secondary' \| 'success' \| 'error' \| 'warning' \| 'info' | Color of status indicator |
| `statusActive` | boolean | Whether status indicator should blink |
| `color` | 'primary' \| 'secondary' \| 'success' \| 'error' \| 'warning' \| 'info' | Panel header color |
| `elevation` | number | Shadow elevation (0-24) |

### LcarsPanelGrid

A grid layout component for organizing multiple panels with consistent spacing.

```tsx
<LcarsPanelGrid>
  <LcarsPanel title="Panel 1">Content 1</LcarsPanel>
  <LcarsPanel title="Panel 2">Content 2</LcarsPanel>
  <LcarsPanel title="Panel 3">Content 3</LcarsPanel>
</LcarsPanelGrid>
```

#### Props

| Prop | Type | Description |
|------|------|-------------|
| `spacing` | number | Grid spacing (default: 2) |
| `columns` | number \| { xs: number, sm: number, md: number, lg: number, xl: number } | Number of columns at different breakpoints |

### LcarsStatusLight

A blinking status indicator that follows the LCARS visual language.

```tsx
<LcarsStatusLight 
  state="active" 
  size="medium" 
  label="System Active" 
/>
```

#### Props

| Prop | Type | Description |
|------|------|-------------|
| `state` | 'active' \| 'idle' \| 'error' \| 'warning' \| 'success' \| 'info' \| 'running' | State of the indicator |
| `size` | 'small' \| 'medium' \| 'large' | Size of indicator |
| `label` | string | Optional label text |
| `blinking` | boolean | Override default blinking behavior |

### LcarsStatusHeader

A header component that displays operation status with progress information.

```tsx
<LcarsStatusHeader 
  operationName="Migration Process"
  operationState="running"
  percentComplete={45}
  estimatedTimeRemaining={360}
/>
```

#### Props

| Prop | Type | Description |
|------|------|-------------|
| `operationName` | string | Name of the current operation |
| `operationState` | 'idle' \| 'running' \| 'paused' \| 'completed' \| 'error' | Current state |
| `percentComplete` | number | Completion percentage (0-100) |
| `estimatedTimeRemaining` | number | Time remaining in seconds |

### LcarsDataIndicators

A component that displays data transfer metrics with blinking indicators for activity.

```tsx
<LcarsDataIndicators 
  bytesIn={1048576}  // 1MB
  bytesOut={524288}  // 512KB
  hasIncomingData={true}
  hasOutgoingData={false}
/>
```

#### Props

| Prop | Type | Description |
|------|------|-------------|
| `bytesIn` | number | Bytes received |
| `bytesOut` | number | Bytes sent |
| `hasIncomingData` | boolean | Whether incoming data is active |
| `hasOutgoingData` | boolean | Whether outgoing data is active |

### LcarsDashboard

A complete dashboard layout with status header, data indicators, and multiple panels.

```tsx
<LcarsDashboard />
```

## Color System

The LCARS design system uses a specific color palette inspired by the Star Trek LCARS interface. These colors are integrated into the Material UI theme.

| Color | Hex Code | Usage |
|-------|----------|-------|
| Primary | #FF9900 | Main UI elements |
| Secondary | #CC99CC | Complementary UI elements |
| Success | #99CC99 | Positive status indicators |
| Error | #CC6666 | Error status and alerts |
| Warning | #FFCC66 | Warning indicators |
| Info | #9999CC | Informational elements |
| Background | #000000 | Main background |
| Surface | #111111 | Elevated surfaces |

## Typography

The LCARS design system uses a custom typography scale based on the "Okuda" font inspiration. We implement this using system fonts with appropriate fallbacks.

| Element | Font Family | Weight | Size | Usage |
|---------|-------------|--------|------|-------|
| h1 | 'Helvetica', sans-serif | 700 | 2.5rem | Main page headers |
| h2 | 'Helvetica', sans-serif | 700 | 2rem | Panel titles |
| h3 | 'Helvetica', sans-serif | 600 | 1.75rem | Section headers |
| h4 | 'Helvetica', sans-serif | 600 | 1.5rem | Subsection headers |
| body1 | 'Helvetica', sans-serif | 400 | 1rem | Standard text |
| body2 | 'Helvetica', sans-serif | 400 | 0.875rem | Secondary text |
| button | 'Helvetica', sans-serif | 500 | 0.875rem | Button text |

## Animation System

The LCARS design utilizes subtle animations for status indicators and transitions.

### Status Light Blinking

Active status indicators blink at a rate of 1.5 seconds per cycle, with a smooth transition.

```css
@keyframes lcarsBlinkActive {
  0%, 49% {
    opacity: 1;
  }
  50%, 100% {
    opacity: 0.5;
  }
}
```

### Progress Indicators

Progress indicators use a pulsing animation that alternates between two shades of the indicator color.

```css
@keyframes lcarsProgress {
  0%, 100% {
    background-color: var(--color-primary);
  }
  50% {
    background-color: var(--color-primary-light);
  }
}
```

## Layout Guidelines

### Panel Layout

LCARS panels follow these layout guidelines:

1. Header is asymmetric with rounded corners
2. Title positioned with text-align: left
3. Status indicators positioned in the top-right corner
4. Content area has consistent padding (16px)

### Dashboard Layout

Dashboards use a grid layout with the following structure:

1. Full-width status header at the top
2. Main content area divided into panels
3. Panels arranged in a responsive grid (12-column system)
4. Primary operations panel spans the full width when needed

## Implementation Examples

### Basic Panel with Status

```tsx
import { LcarsPanel, LcarsStatusLight } from '../components/DesignSystem';

function SystemStatus() {
  return (
    <LcarsPanel 
      title="System Status" 
      status="Online"
      statusColor="success"
      statusActive={true}
    >
      <div className="status-items">
        <div className="status-item">
          <LcarsStatusLight state="active" />
          <span>Database Connection</span>
        </div>
        <div className="status-item">
          <LcarsStatusLight state="active" />
          <span>API Services</span>
        </div>
        <div className="status-item">
          <LcarsStatusLight state="warning" />
          <span>Background Tasks</span>
        </div>
      </div>
    </LcarsPanel>
  );
}
```

### Dashboard with Multiple Panels

```tsx
import { 
  LcarsDashboard, 
  LcarsPanel, 
  LcarsPanelGrid, 
  LcarsStatusHeader 
} from '../components/DesignSystem';

function MigrationDashboard() {
  return (
    <div className="dashboard-container">
      <LcarsStatusHeader 
        operationName="Zephyr to qTest Migration"
        operationState="running"
        percentComplete={68}
        estimatedTimeRemaining={420}
      />
      
      <LcarsPanelGrid>
        <LcarsPanel 
          title="Migration Progress" 
          status="In Progress"
          statusColor="primary"
          statusActive={true}
        >
          {/* Progress details */}
        </LcarsPanel>
        
        <LcarsPanel 
          title="Test Case Summary" 
          status="Updated"
          statusColor="info"
        >
          {/* Test case counts */}
        </LcarsPanel>
        
        <LcarsPanel 
          title="Error Log" 
          status="Warning"
          statusColor="warning"
          statusActive={true}
        >
          {/* Error messages */}
        </LcarsPanel>
      </LcarsPanelGrid>
    </div>
  );
}
```

## Best Practices

### Do's
- Use consistent color schemes for related functionality
- Maintain the asymmetric design of panel headers
- Use status lights for active/inactive states
- Group related information within a single panel
- Use consistent spacing between panels (16px recommended)
- Implement responsive designs that maintain the LCARS aesthetic at all screen sizes

### Don'ts
- Don't mix too many status colors in a single view
- Avoid symmetric layouts that break the LCARS aesthetic
- Don't overuse blinking elements (limit to critical statuses)
- Avoid cluttering panels with too many elements
- Don't use colors inconsistently (maintain semantic meaning)

## Accessibility Considerations

The LCARS design system is implemented with accessibility in mind:

1. All status colors meet WCAG 2.1 AA contrast requirements
2. Status is never conveyed by color alone (always accompanied by text)
3. Blinking elements can be disabled via a user preference
4. All interactive elements are keyboard accessible
5. Proper ARIA attributes are used throughout components

## Theming

The LCARS design system is implemented as a Material UI theme extension. To use it:

```tsx
import { ThemeProvider } from '@mui/material/styles';
import { lcarsThemeExtended } from '../theme';

function App() {
  return (
    <ThemeProvider theme={lcarsThemeExtended}>
      <YourApplication />
    </ThemeProvider>
  );
}
```

The theme can be customized further by extending the base theme:

```tsx
import { createTheme } from '@mui/material/styles';
import { lcarsThemeExtended } from '../theme';

const customLcarsTheme = createTheme({
  ...lcarsThemeExtended,
  palette: {
    ...lcarsThemeExtended.palette,
    primary: {
      main: '#FF9900', // Custom primary color
    },
  },
});
```

## Testing LCARS Components

Each LCARS component includes comprehensive tests to ensure design compliance:

1. **Visual tests**: Ensure components render correctly
2. **Interaction tests**: Verify behavior when interacted with
3. **Theme compatibility**: Ensure components work across themes
4. **Responsiveness**: Test across different viewport sizes

Example test for an LCARS component:

```tsx
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { lcarsThemeExtended } from '../theme';
import { LcarsPanel } from './LcarsPanel';

describe('LcarsPanel', () => {
  it('renders with the correct styling', () => {
    render(
      <ThemeProvider theme={lcarsThemeExtended}>
        <LcarsPanel 
          title="Test Panel" 
          status="Active"
          data-testid="test-panel"
        >
          Content
        </LcarsPanel>
      </ThemeProvider>
    );
    
    const panel = screen.getByTestId('test-panel');
    expect(panel).toBeInTheDocument();
    
    // Check for correct styling
    const header = screen.getByTestId('test-panel-header');
    const headerStyle = window.getComputedStyle(header);
    expect(headerStyle.borderTopLeftRadius).not.toBe('0px');
  });
});
```

## Resources

- [ADR 0014: LCARS-Inspired UI Design Implementation](../adrs/0014-lcars-ui-implementation.md)
- [Component Storybook](../../packages/ui/storybook)
- [LCARS Components Test Suite](../../tests/unit/ui/LcarsDesignImplementation.test.tsx)