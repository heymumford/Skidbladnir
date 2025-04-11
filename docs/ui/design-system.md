# Skíðblaðnir Design System

This design system defines the visual language and UI component standards for the Skíðblaðnir application. It ensures consistency, efficiency, and a beautiful user experience across the application.

## Core Principles

1. **Consistency** - UI elements should maintain consistent appearance and behavior across the application
2. **Clarity** - Information should be presented in a clear, organized manner
3. **Efficiency** - UI should maximize productivity with minimal clicks and intuitive workflows
4. **Beauty** - Visually appealing design with balanced aesthetics and functionality
5. **Accessibility** - UI should be accessible to all users, following WCAG guidelines

## Design Themes

### LCARS Theme (Primary)
Inspired by Star Trek's Library Computer Access/Retrieval System (LCARS), our primary theme features:
- High contrast colors with vibrant accents
- Asymmetrical elements with curved edges
- Distinctive header and footer sections
- Blinking indicators for active elements
- Color-coded status indicators
- Segmented borders with color blocks

### Dark Theme
For users who prefer a more subdued, modern interface:
- Dark background with blue accents
- Reduced eye strain for prolonged use
- Maintains the application structure of LCARS with a more conventional style

### Light Theme
For users who prefer high-contrast light interfaces:
- Light background with teal accents
- Clean, minimal aesthetic
- Maintains the application structure with conventional styling

## Color Palette

### LCARS Theme
- Primary: `#F1DF6F` (Yellow/Gold)
- Secondary: `#CC6666` (Reddish Orange)
- Info: `#9999CC` (Blue/Purple)
- Success: `#99CC99` (Green)
- Warning: `#FFCC66` (Amber)
- Error: `#FF6666` (Red)
- Background: `#111133` (Dark Blue)
- Paper: `#222244` (Medium Blue)
- Text: `#FFFFFF` (White), `#CCCCDD` (Light Blue), `#777788` (Muted)

### Dark Theme
- Primary: `#4dabf5` (Blue)
- Secondary: `#7e57c2` (Purple)
- Info: `#29b6f6` (Light Blue)
- Success: `#66bb6a` (Green)
- Warning: `#ffa726` (Amber)
- Error: `#ef5350` (Red)
- Background: `#121212` (Very Dark Gray)
- Paper: `#1e1e1e` (Dark Gray)
- Text: `#ffffff` (White), `#b0bec5` (Light Gray), `#6e6e6e` (Muted)

### Light Theme
- Primary: `#00897b` (Teal)
- Secondary: `#5c6bc0` (Indigo)
- Info: `#29b6f6` (Light Blue)
- Success: `#66bb6a` (Green)
- Warning: `#ffa726` (Amber)
- Error: `#f44336` (Red)
- Background: `#f5f5f5` (Light Gray)
- Paper: `#ffffff` (White)
- Text: `#212121` (Dark Gray), `#757575` (Medium Gray), `#bdbdbd` (Light Gray)

## Typography

### Fonts
- LCARS Theme: `"Quicksand", "Arial", sans-serif`
- Dark Theme: `"Roboto", "Helvetica", "Arial", sans-serif`
- Light Theme: `"Roboto", "Helvetica", "Arial", sans-serif`

### Hierarchy
- **H1** - Used for page titles
  - Font weight: 700 (LCARS), 300 (Dark/Light)
  - Letter spacing: 0.02em (LCARS), -0.01em (Dark/Light)
  
- **H2** - Used for section headers
  - Font weight: 700 (LCARS), 300 (Dark/Light)
  - Letter spacing: 0.02em (LCARS), -0.01em (Dark/Light)
  
- **H3-H6** - Used for subsections
  - Font weight: 600 (LCARS), 400-500 (Dark/Light)
  
- **Subtitle1** - Used for card titles and important secondary text
  - Font weight: 600 (LCARS), 500 (Dark/Light)
  
- **Subtitle2** - Used for less prominent titles
  - Font weight: 600 (LCARS), 500 (Dark/Light)
  
- **Body1** - Primary body text
  - Font weight: 400 for all themes
  
- **Body2** - Secondary body text
  - Font weight: 400 for all themes
  
- **Button** - Text for buttons
  - Font weight: 600 (LCARS), 500 (Dark/Light)
  - Letter spacing: 0.05em (LCARS), 0.02em (Dark/Light)
  - Text transform: uppercase (LCARS), uppercase (Dark), none (Light)

## Spacing

The application uses a consistent spacing system based on a base unit of 8px.

- **Tiny**: 4px (`theme.spacing(0.5)`)
- **Small**: 8px (`theme.spacing(1)`)
- **Medium**: 16px (`theme.spacing(2)`)
- **Large**: 24px (`theme.spacing(3)`)
- **Extra Large**: 32px (`theme.spacing(4)`)
- **Huge**: 48px (`theme.spacing(6)`)

Margins and padding should use these spacing values to maintain consistency.

## Components

### Containers

#### LcarsPanel
Special container with LCARS-inspired styling:
- Distinctive colored edge on the left side
- Rounded corners
- Light background for content contrast
- Header section with title

```tsx
<LcarsPanel>
  <LcarsHeader>Panel Title</LcarsHeader>
  <LcarsContent>Content goes here</LcarsContent>
</LcarsPanel>
```

#### Card
Used for individual content sections:
- Rounded corners (border-radius: 16px)
- Subtle shadow
- Inner padding (16px)
- Optional header and actions

```tsx
<Card>
  <CardHeader title="Card Title" />
  <CardContent>Card content goes here</CardContent>
  <CardActions>
    <Button size="small">Action</Button>
  </CardActions>
</Card>
```

### Navigation

#### NavigationBar
Main application navigation:
- App logo and title
- Tab-based navigation
- Status indicator
- Theme toggle
- Settings menu

```tsx
<NavigationBar />
```

#### Breadcrumbs
Used for sub-navigation and page hierarchy:
- Navigation path display
- Clickable links for navigation levels
- Current page as text (not clickable)

```tsx
<Breadcrumbs>
  <Link to="/">Home</Link>
  <Link to="/section">Section</Link>
  <Typography>Current Page</Typography>
</Breadcrumbs>
```

### Interactive Elements

#### Buttons
Multiple button styles available:
- **Primary**: Main call to action
- **Secondary**: Alternative action
- **Outlined**: Less prominent action
- **Text**: Minimal visual action for minor options

All buttons have:
- Rounded corners (border-radius: 24px for LCARS, 8px for Dark/Light)
- Appropriate padding (8px 16px for small, 16px 24px for large)
- Optional icons
- Hover and active states

```tsx
<Button variant="contained" color="primary">Primary</Button>
<Button variant="contained" color="secondary">Secondary</Button>
<Button variant="outlined">Outlined</Button>
<Button variant="text">Text</Button>
```

#### Form Elements
Form inputs follow consistent styling:
- Clear labels above inputs
- Validation states (error, success)
- Helper text for additional information
- Consistent spacing between form elements

```tsx
<TextField label="Field Label" helperText="Helper text" />

<FormControl>
  <InputLabel>Select Label</InputLabel>
  <Select>
    <MenuItem value={1}>Option 1</MenuItem>
    <MenuItem value={2}>Option 2</MenuItem>
  </Select>
</FormControl>
```

### Status Indicators

#### BlinkingLight
Used to indicate active status:
- Small circular indicator
- Pulsing animation when active
- Color-coded by status type

```tsx
<BlinkingLight active={true} color="success" />
```

#### StatusIndicator
Used for status display:
- Text label with status
- Color-coded background
- Optionally includes a blinking light

```tsx
<StatusIndicator status="active">
  System Active
</StatusIndicator>
```

#### Chips
Used for tags, filters and status:
- Compact rounded indicators
- Color-coded by type
- Optional icons

```tsx
<Chip label="Active" color="success" />
<Chip label="Error" color="error" />
```

### Data Display

#### OperationDependencyGraph
Visualizes operation dependencies:
- Interactive canvas-based graph
- Color-coded nodes by status
- Topology-aware layout
- Hoverable nodes with tooltips

#### ResourceUsageMonitor
Displays system resource usage:
- Real-time updates
- Visual gauges for CPU, memory, network
- Historical trend visualization
- Color-coded thresholds

#### OperationTimelineView
Shows operation timing information:
- Gantt-style timeline view
- Drag handles for time range selection
- Color-coded by status
- Detail view on selection

## Layout Patterns

### App Layout Structure
The main application layout follows a consistent structure:
- Navigation bar at top
- Content area in center (flexible height)
  - Main workspace (left, flexible width)
  - Activity log (right, fixed width)
- Status bar at bottom

### Page Structure
Each page follows a consistent layout:
- Breadcrumb navigation at top
- Page title and optional actions
- Content organized in panels/cards
- Responsive grid layout for various screen sizes

### Form Layout
Forms follow a consistent structure:
- Labels above inputs
- Related fields grouped together
- Actions at bottom (primary action on right)
- Validation feedback inline with fields

## Responsive Behavior

### Breakpoints
- **xs**: 0px - 599px (Mobile)
- **sm**: 600px - 959px (Tablet)
- **md**: 960px - 1279px (Desktop)
- **lg**: 1280px - 1919px (Large Desktop)
- **xl**: 1920px and up (Extra Large)

### Responsive Adjustments
- Stack elements vertically on small screens
- Reduce padding and margins on small screens
- Hide activity log on mobile (available via drawer)
- Collapsible navigation on small screens

## Animations

### Transitions
- Component transitions should use consistent easing and duration
- Default transition duration: 300ms
- Default easing: cubic-bezier(0.4, 0, 0.2, 1)

### Interactive Feedback
- Hover effects on clickable elements
- Press/active states for buttons
- Loading states (progress indicators)
- Transition between views

## Accessibility Guidelines

- Color contrast ratio of at least 4.5:1 for normal text
- Keyboard navigation support
- Screen reader compatible markup
- Focus indicators for keyboard users
- Alternative text for images and visualizations
- Proper ARIA attributes where needed

## Usage Examples

### Workflow Page Example
```tsx
<Box>
  <Breadcrumbs>
    <Link to="/">Home</Link>
    <Typography>Workflow</Typography>
  </Breadcrumbs>
  
  <Typography variant="h4">Migration Workflow</Typography>
  
  <Grid container spacing={3}>
    <Grid item xs={12} md={8}>
      <LcarsPanel>
        <LcarsHeader>Workflow Progress</LcarsHeader>
        <LcarsContent>
          <Stepper activeStep={2}>
            <Step>
              <StepLabel>Step 1</StepLabel>
            </Step>
            <Step>
              <StepLabel>Step 2</StepLabel>
            </Step>
            <Step>
              <StepLabel>Step 3</StepLabel>
            </Step>
          </Stepper>
        </LcarsContent>
      </LcarsPanel>
    </Grid>
    
    <Grid item xs={12} md={4}>
      <LcarsPanel>
        <LcarsHeader>Status</LcarsHeader>
        <LcarsContent>
          <StatusIndicator status="active">
            Migration Active
          </StatusIndicator>
        </LcarsContent>
      </LcarsPanel>
    </Grid>
  </Grid>
</Box>
```

## Implementation Notes

- Use the ThemeProvider for consistent theme application
- Prefer styled components for component-specific styling
- Use MUI's theming system and sx prop for theme-aware styling
- Maintain separation between layout and presentation concerns
- Use testids for component testing
- Follow accessibility best practices in all components

## Resources

- UI Component Library: Material-UI (v5)
- Icon library: Material Icons
- Animation library: CSS transitions/animations
- Canvas drawing: HTML Canvas API with requestAnimationFrame