/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid,
  Divider,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
  Tab,
  Tabs,
  Alert,
  useTheme,
  styled,
  alpha
} from '@mui/material';
import { useDesignSystem } from '../../utils/designSystem';

// Component to display a color swatch
const ColorSwatch = styled(Box)<{ bgcolor: string; textColor: string }>(
  ({ bgcolor, textColor }) => ({
    backgroundColor: bgcolor,
    color: textColor,
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    borderRadius: '8px',
    height: '100px',
    position: 'relative',
    overflow: 'hidden',
    transition: 'transform 0.2s ease-in-out',
    cursor: 'pointer',
    '&:hover': {
      transform: 'scale(1.05)',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
    }
  })
);

// Style for section headers
const SectionTitle = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  marginTop: theme.spacing(4),
  position: 'relative',
  paddingLeft: theme.spacing(2),
  '&::before': {
    content: '""',
    position: 'absolute',
    left: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    width: '4px',
    height: '80%',
    backgroundColor: theme.palette.primary.main,
    borderRadius: '4px',
  }
}));

// Component for displaying spacing metrics
const SpacingBlock = styled(Box)<{ width: string; label: string }>(
  ({ theme, width, label }) => ({
    height: '40px',
    width,
    backgroundColor: alpha(theme.palette.primary.main, 0.1),
    border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
    borderRadius: '4px',
    marginBottom: theme.spacing(1),
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    '&::after': {
      content: `"${label}"`,
      position: 'absolute',
      right: '-40px',
      color: theme.palette.text.secondary,
      fontSize: '0.75rem',
    }
  })
);

// Sample component group for display
const ComponentGroup = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(4),
  padding: theme.spacing(2),
  backgroundColor: alpha(theme.palette.background.paper, 0.5),
  borderRadius: theme.shape.borderRadius,
  border: `1px dashed ${alpha(theme.palette.divider, 0.5)}`,
}));

interface DesignSystemVisualizerProps {
  /**
   * Optional tab to show initially
   */
  initialTab?: number;
}

/**
 * Component for visualizing and exploring the design system
 */
export const DesignSystemVisualizer: React.FC<DesignSystemVisualizerProps> = ({
  initialTab = 0
}) => {
  const theme = useTheme();
  const ds = useDesignSystem();
  const [activeTab, setActiveTab] = useState(initialTab);
  
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  // Creates a simple card displaying a typography variant
  const TypographyCard = ({ variant, text }: { variant: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'subtitle1' | 'subtitle2' | 'body1' | 'body2' | 'caption' | 'button' | 'overline'; text: string }) => (
    <Box sx={{ mb: 2, p: 2, borderRadius: 1, bgcolor: 'background.paper' }}>
      <Typography variant={variant}>{text}</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
        {variant} • {theme.typography[variant].fontWeight && `Weight: ${theme.typography[variant].fontWeight}`} 
        {theme.typography[variant].fontSize && ` • Size: ${theme.typography[variant].fontSize}`}
      </Typography>
    </Box>
  );
  
  // Creates a color swatch with details
  const renderColorSwatch = (colorName: string, colorObj: any, key: string = 'main') => {
    const color = colorObj[key];
    const textColor = key === 'contrastText' ? colorObj.main : colorObj.contrastText;
    
    return (
      <Grid item xs={12} sm={6} md={3} key={`${colorName}-${key}`}>
        <ColorSwatch bgcolor={color} textColor={textColor}>
          <Typography variant="subtitle2">{colorName}.{key}</Typography>
          <Typography variant="caption">{color}</Typography>
        </ColorSwatch>
      </Grid>
    );
  };
  
  return (
    <Box>
      <Paper sx={{ mb: 4 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 2, pb: 0 }}
        >
          <Tab label="Colors" />
          <Tab label="Typography" />
          <Tab label="Spacing" />
          <Tab label="Components" />
          <Tab label="Forms" />
          <Tab label="Theme" />
        </Tabs>
      </Paper>
      
      {/* Colors Tab */}
      {activeTab === 0 && (
        <Box>
          <SectionTitle variant="h4">Color Palette</SectionTitle>
          <Typography variant="body1" paragraph>
            The color palette defines the visual identity of the application. It consists of primary, secondary, and semantic colors.
          </Typography>
          
          <SectionTitle variant="h5">Primary & Secondary</SectionTitle>
          <Grid container spacing={2}>
            {renderColorSwatch('primary', theme.palette.primary, 'main')}
            {renderColorSwatch('primary', theme.palette.primary, 'light')}
            {renderColorSwatch('primary', theme.palette.primary, 'dark')}
            {renderColorSwatch('primary', theme.palette.primary, 'contrastText')}
            
            {renderColorSwatch('secondary', theme.palette.secondary, 'main')}
            {renderColorSwatch('secondary', theme.palette.secondary, 'light')}
            {renderColorSwatch('secondary', theme.palette.secondary, 'dark')}
            {renderColorSwatch('secondary', theme.palette.secondary, 'contrastText')}
          </Grid>
          
          <SectionTitle variant="h5">Semantic Colors</SectionTitle>
          <Grid container spacing={2}>
            {renderColorSwatch('success', theme.palette.success, 'main')}
            {renderColorSwatch('error', theme.palette.error, 'main')}
            {renderColorSwatch('warning', theme.palette.warning, 'main')}
            {renderColorSwatch('info', theme.palette.info, 'main')}
          </Grid>
          
          <SectionTitle variant="h5">Background & Text</SectionTitle>
          <Grid container spacing={2}>
            {renderColorSwatch('background', { 
              default: theme.palette.background.default, 
              contrastText: theme.palette.text.primary 
            }, 'default')}
            {renderColorSwatch('background', { 
              paper: theme.palette.background.paper, 
              contrastText: theme.palette.text.primary 
            }, 'paper')}
            
            {renderColorSwatch('text', { 
              primary: theme.palette.text.primary, 
              contrastText: theme.palette.background.paper 
            }, 'primary')}
            {renderColorSwatch('text', { 
              secondary: theme.palette.text.secondary, 
              contrastText: theme.palette.background.paper 
            }, 'secondary')}
          </Grid>
        </Box>
      )}
      
      {/* Typography Tab */}
      {activeTab === 1 && (
        <Box>
          <SectionTitle variant="h4">Typography</SectionTitle>
          <Typography variant="body1" paragraph>
            Typography creates visual hierarchy and ensures readability across the application.
          </Typography>
          
          <SectionTitle variant="h5">Headings</SectionTitle>
          <Box>
            <TypographyCard variant="h1" text="Heading 1" />
            <TypographyCard variant="h2" text="Heading 2" />
            <TypographyCard variant="h3" text="Heading 3" />
            <TypographyCard variant="h4" text="Heading 4" />
            <TypographyCard variant="h5" text="Heading 5" />
            <TypographyCard variant="h6" text="Heading 6" />
          </Box>
          
          <SectionTitle variant="h5">Body Text</SectionTitle>
          <Box>
            <TypographyCard variant="subtitle1" text="Subtitle 1 - Used for emphasis and important secondary text" />
            <TypographyCard variant="subtitle2" text="Subtitle 2 - Used for card titles and section headers" />
            <TypographyCard variant="body1" text="Body 1 - Main body text used for most content. Should be easy to read at length and have good contrast." />
            <TypographyCard variant="body2" text="Body 2 - Secondary body text for supporting information and details." />
          </Box>
          
          <SectionTitle variant="h5">Utility Text</SectionTitle>
          <Box>
            <TypographyCard variant="button" text="BUTTON TEXT" />
            <TypographyCard variant="caption" text="Caption text for small labels and metadata" />
            <TypographyCard variant="overline" text="OVERLINE TEXT FOR CATEGORIES" />
          </Box>
        </Box>
      )}
      
      {/* Spacing Tab */}
      {activeTab === 2 && (
        <Box>
          <SectionTitle variant="h4">Spacing System</SectionTitle>
          <Typography variant="body1" paragraph>
            The spacing system ensures consistent layout and component sizing throughout the application.
          </Typography>
          
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>Base Unit: 8px</Typography>
              <Typography variant="body2" paragraph>
                All spacing values are multiples of the base unit (8px). This ensures consistent
                visual rhythm across the application.
              </Typography>
              
              <Box sx={{ mt: 3 }}>
                <SpacingBlock width={ds.spacing('tiny')} label="4px - Tiny (0.5x)" />
                <SpacingBlock width={ds.spacing('small')} label="8px - Small (1x)" />
                <SpacingBlock width={ds.spacing('medium')} label="16px - Medium (2x)" />
                <SpacingBlock width={ds.spacing('large')} label="24px - Large (3x)" />
                <SpacingBlock width={ds.spacing('xl')} label="32px - XL (4x)" />
                <SpacingBlock width={ds.spacing('huge')} label="48px - Huge (6x)" />
              </Box>
            </CardContent>
          </Card>
          
          <SectionTitle variant="h5">Spacing Usage</SectionTitle>
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Component Internal Spacing" />
                <CardContent>
                  <Typography variant="body2" paragraph>
                    Components use consistent internal spacing:
                  </Typography>
                  <Box sx={{ p: 2, border: `1px dashed ${alpha(theme.palette.primary.main, 0.3)}` }}>
                    <Typography variant="caption" color="text.secondary" sx={{ position: 'absolute', mt: -3, ml: 1, backgroundColor: 'background.paper', px: 1 }}>
                      16px padding (Medium)
                    </Typography>
                    <Box sx={{ p: 1, border: `1px dashed ${alpha(theme.palette.secondary.main, 0.3)}` }}>
                      <Typography variant="caption" color="text.secondary" sx={{ position: 'absolute', mt: -3, ml: 1, backgroundColor: 'background.paper', px: 1 }}>
                        8px padding (Small)
                      </Typography>
                      <Box sx={{ height: 40, backgroundColor: alpha(theme.palette.primary.main, 0.1), borderRadius: 1 }} />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Component Spacing" />
                <CardContent>
                  <Typography variant="body2" paragraph>
                    Space between components:
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ height: 40, backgroundColor: alpha(theme.palette.primary.main, 0.1), borderRadius: 1 }}>
                      <Typography variant="caption" sx={{ ml: 1 }}>Component 1</Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
                      16px gap (Medium)
                    </Typography>
                    <Box sx={{ height: 40, backgroundColor: alpha(theme.palette.primary.main, 0.1), borderRadius: 1 }}>
                      <Typography variant="caption" sx={{ ml: 1 }}>Component 2</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}
      
      {/* Components Tab */}
      {activeTab === 3 && (
        <Box>
          <SectionTitle variant="h4">UI Components</SectionTitle>
          <Typography variant="body1" paragraph>
            Components are the building blocks of the user interface, designed for consistency and reusability.
          </Typography>
          
          <SectionTitle variant="h5">Buttons</SectionTitle>
          <ComponentGroup>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2">Contained</Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Button variant="contained" color="primary">Primary</Button>
                  <Button variant="contained" color="secondary">Secondary</Button>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2">Outlined</Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Button variant="outlined" color="primary">Primary</Button>
                  <Button variant="outlined" color="secondary">Secondary</Button>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2">Text</Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Button variant="text" color="primary">Primary</Button>
                  <Button variant="text" color="secondary">Secondary</Button>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2">Sizes</Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'center' }}>
                  <Button variant="contained" color="primary" size="small">Small</Button>
                  <Button variant="contained" color="primary">Medium</Button>
                  <Button variant="contained" color="primary" size="large">Large</Button>
                </Box>
              </Grid>
            </Grid>
          </ComponentGroup>
          
          <SectionTitle variant="h5">Cards</SectionTitle>
          <ComponentGroup>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardHeader title="Basic Card" subheader="With header" />
                  <CardContent>
                    <Typography variant="body2">
                      Cards contain content and actions related to a single subject.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Simple Card</Typography>
                    <Typography variant="body2">
                      This card has no CardHeader component for a simpler appearance.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardHeader 
                    title="Interactive Card"
                    action={
                      <Button size="small" color="primary">Action</Button>
                    }
                  />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="body2">
                      This card includes interactive elements and actions.
                    </Typography>
                  </CardContent>
                  <Divider />
                  <Box sx={{ p: 1, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button size="small" color="primary">Learn More</Button>
                  </Box>
                </Card>
              </Grid>
            </Grid>
          </ComponentGroup>
          
          <SectionTitle variant="h5">Status Indicators</SectionTitle>
          <ComponentGroup>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>Chips</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label="Default" />
                  <Chip label="Primary" color="primary" />
                  <Chip label="Success" color="success" />
                  <Chip label="Warning" color="warning" />
                  <Chip label="Error" color="error" />
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>Alerts</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Alert severity="info">This is an info alert</Alert>
                  <Alert severity="success">This is a success alert</Alert>
                  <Alert severity="warning">This is a warning alert</Alert>
                  <Alert severity="error">This is an error alert</Alert>
                </Box>
              </Grid>
            </Grid>
          </ComponentGroup>
        </Box>
      )}
      
      {/* Forms Tab */}
      {activeTab === 4 && (
        <Box>
          <SectionTitle variant="h4">Form Elements</SectionTitle>
          <Typography variant="body1" paragraph>
            Form elements provide consistent ways to collect user input across the application.
          </Typography>
          
          <ComponentGroup>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>Text Inputs</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField label="Standard" />
                  <TextField label="With helper text" helperText="This is helper text" />
                  <TextField label="With error" error helperText="This is an error message" />
                  <TextField label="Disabled" disabled />
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>Select Inputs</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <FormControl fullWidth>
                    <InputLabel>Standard Select</InputLabel>
                    <Select label="Standard Select">
                      <MenuItem value={1}>Option 1</MenuItem>
                      <MenuItem value={2}>Option 2</MenuItem>
                      <MenuItem value={3}>Option 3</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <FormControl fullWidth error>
                    <InputLabel>Error Select</InputLabel>
                    <Select label="Error Select">
                      <MenuItem value={1}>Option 1</MenuItem>
                      <MenuItem value={2}>Option 2</MenuItem>
                      <MenuItem value={3}>Option 3</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Grid>
            </Grid>
          </ComponentGroup>
          
          <ComponentGroup>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>Toggles & Checkboxes</Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>Switches</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <FormControlLabel control={<Switch />} label="Enabled" />
                    <FormControlLabel control={<Switch checked />} label="Active" />
                    <FormControlLabel control={<Switch disabled />} label="Disabled" />
                  </Box>
                </Box>
                
                <Box>
                  <Typography variant="body2" gutterBottom>Radio Buttons</Typography>
                  <FormControl component="fieldset">
                    <FormLabel component="legend">Radio Group</FormLabel>
                    <RadioGroup defaultValue="option1">
                      <FormControlLabel value="option1" control={<Radio />} label="Option 1" />
                      <FormControlLabel value="option2" control={<Radio />} label="Option 2" />
                      <FormControlLabel value="disabled" disabled control={<Radio />} label="Disabled" />
                    </RadioGroup>
                  </FormControl>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>Form Layout</Typography>
                <Box 
                  component="form" 
                  sx={{ 
                    padding: 3, 
                    border: `1px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
                    borderRadius: 2
                  }}
                >
                  <Typography variant="h6" gutterBottom>Contact Information</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField label="First Name" fullWidth margin="normal" />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField label="Last Name" fullWidth margin="normal" />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField label="Email" fullWidth margin="normal" />
                    </Grid>
                    <Grid item xs={12}>
                      <FormControl fullWidth margin="normal">
                        <InputLabel>Subject</InputLabel>
                        <Select label="Subject">
                          <MenuItem value="support">Support</MenuItem>
                          <MenuItem value="feedback">Feedback</MenuItem>
                          <MenuItem value="other">Other</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField 
                        label="Message" 
                        fullWidth 
                        multiline 
                        rows={4} 
                        margin="normal" 
                      />
                    </Grid>
                    <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                      <Button variant="outlined">Cancel</Button>
                      <Button variant="contained" color="primary">Submit</Button>
                    </Grid>
                  </Grid>
                </Box>
              </Grid>
            </Grid>
          </ComponentGroup>
        </Box>
      )}
      
      {/* Theme Tab */}
      {activeTab === 5 && (
        <Box>
          <SectionTitle variant="h4">Theme System</SectionTitle>
          <Typography variant="body1" paragraph>
            The theme system provides consistent styling and enables theme switching.
          </Typography>
          
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Current Theme: {ds.isLcarsTheme() ? 'LCARS Theme' : theme.palette.mode === 'dark' ? 'Dark Theme' : 'Light Theme'}
              </Typography>
              <Typography variant="body2" paragraph>
                The application supports multiple themes while maintaining consistent layout and behavior.
                The LCARS theme is the signature look, with dark and light alternatives.
              </Typography>
              
              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, height: '100%' }}>
                    <Typography variant="subtitle2" gutterBottom>Border Radius</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body2">Button</Typography>
                        <Typography variant="body2">{ds.getBorderRadius('button')}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body2">Card</Typography>
                        <Typography variant="body2">{ds.getBorderRadius('card')}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body2">Chip</Typography>
                        <Typography variant="body2">{ds.getBorderRadius('chip')}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body2">Panel</Typography>
                        <Typography variant="body2">{ds.getBorderRadius('panel')}</Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, height: '100%' }}>
                    <Typography variant="subtitle2" gutterBottom>Animations</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body2">Transition</Typography>
                        <Typography variant="body2">{ds.getAnimationDuration('transition')}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body2">Blinking Light</Typography>
                        <Typography variant="body2">{ds.getAnimationDuration('blinkingLight')}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body2">Fade In</Typography>
                        <Typography variant="body2">{ds.getAnimationDuration('fadeIn')}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body2">Fade Out</Typography>
                        <Typography variant="body2">{ds.getAnimationDuration('fadeOut')}</Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, height: '100%' }}>
                    <Typography variant="subtitle2" gutterBottom>Font Weights</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body2">H1</Typography>
                        <Typography variant="body2">{ds.getFontWeight('h1')}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body2">H4</Typography>
                        <Typography variant="body2">{ds.getFontWeight('h4')}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body2">Button</Typography>
                        <Typography variant="body2">{ds.getFontWeight('button')}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body2">Body</Typography>
                        <Typography variant="body2">{ds.getFontWeight('body1')}</Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
};