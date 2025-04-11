/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React from 'react';
import { Story, Meta } from '@storybook/react';
import { Box, Grid, Typography, Paper } from '@mui/material';
import { LcarsStatusLight, LcarsStatusLightProps } from './LcarsStatusLight';

export default {
  title: 'Components/StatusDisplay/LcarsStatusLight',
  component: LcarsStatusLight,
  argTypes: {
    state: {
      control: {
        type: 'select',
        options: [
          'idle',
          'active',
          'warning',
          'error',
          'success',
          'pending',
          'paused',
          'completed',
          'running',
          'failed',
          'cancelled'
        ]
      },
    },
    color: {
      control: {
        type: 'select',
        options: [
          'default',
          'primary',
          'secondary',
          'success',
          'warning',
          'error',
          'info',
          'amber',
          'blue',
          'green',
          'red',
          'purple',
          'cyan',
          'orange'
        ]
      },
    },
    size: {
      control: {
        type: 'select',
        options: ['small', 'medium', 'large']
      },
    },
    blinking: {
      control: 'boolean',
    },
    pulseEffect: {
      control: 'boolean',
    },
    customColor: {
      control: 'color',
    },
  },
} as Meta;

// Template for a single status light
const Template: Story<LcarsStatusLightProps> = (args) => (
  <Box p={3} bgcolor="#111133">
    <LcarsStatusLight {...args} />
  </Box>
);

// Create a showcase of different states
const StatesShowcaseTemplate: Story = () => (
  <Box p={3} bgcolor="#111133">
    <Typography variant="h6" gutterBottom color="white">
      Status Light States
    </Typography>
    <Grid container spacing={4}>
      <Grid item>
        <Box display="flex" flexDirection="column" alignItems="center">
          <LcarsStatusLight state="idle" />
          <Typography variant="caption" color="white" mt={1}>Idle</Typography>
        </Box>
      </Grid>
      <Grid item>
        <Box display="flex" flexDirection="column" alignItems="center">
          <LcarsStatusLight state="active" />
          <Typography variant="caption" color="white" mt={1}>Active</Typography>
        </Box>
      </Grid>
      <Grid item>
        <Box display="flex" flexDirection="column" alignItems="center">
          <LcarsStatusLight state="warning" />
          <Typography variant="caption" color="white" mt={1}>Warning</Typography>
        </Box>
      </Grid>
      <Grid item>
        <Box display="flex" flexDirection="column" alignItems="center">
          <LcarsStatusLight state="error" />
          <Typography variant="caption" color="white" mt={1}>Error</Typography>
        </Box>
      </Grid>
      <Grid item>
        <Box display="flex" flexDirection="column" alignItems="center">
          <LcarsStatusLight state="success" />
          <Typography variant="caption" color="white" mt={1}>Success</Typography>
        </Box>
      </Grid>
      <Grid item>
        <Box display="flex" flexDirection="column" alignItems="center">
          <LcarsStatusLight state="pending" />
          <Typography variant="caption" color="white" mt={1}>Pending</Typography>
        </Box>
      </Grid>
      <Grid item>
        <Box display="flex" flexDirection="column" alignItems="center">
          <LcarsStatusLight state="running" />
          <Typography variant="caption" color="white" mt={1}>Running</Typography>
        </Box>
      </Grid>
      <Grid item>
        <Box display="flex" flexDirection="column" alignItems="center">
          <LcarsStatusLight state="completed" />
          <Typography variant="caption" color="white" mt={1}>Completed</Typography>
        </Box>
      </Grid>
      <Grid item>
        <Box display="flex" flexDirection="column" alignItems="center">
          <LcarsStatusLight state="failed" />
          <Typography variant="caption" color="white" mt={1}>Failed</Typography>
        </Box>
      </Grid>
    </Grid>
  </Box>
);

// Create a showcase of different sizes
const SizesShowcaseTemplate: Story = () => (
  <Box p={3} bgcolor="#111133">
    <Typography variant="h6" gutterBottom color="white">
      Status Light Sizes
    </Typography>
    <Grid container spacing={4} alignItems="center">
      <Grid item>
        <Box display="flex" flexDirection="column" alignItems="center">
          <LcarsStatusLight state="active" size="small" />
          <Typography variant="caption" color="white" mt={1}>Small</Typography>
        </Box>
      </Grid>
      <Grid item>
        <Box display="flex" flexDirection="column" alignItems="center">
          <LcarsStatusLight state="active" size="medium" />
          <Typography variant="caption" color="white" mt={1}>Medium</Typography>
        </Box>
      </Grid>
      <Grid item>
        <Box display="flex" flexDirection="column" alignItems="center">
          <LcarsStatusLight state="active" size="large" />
          <Typography variant="caption" color="white" mt={1}>Large</Typography>
        </Box>
      </Grid>
    </Grid>
  </Box>
);

// Create a showcase of different colors
const ColorsShowcaseTemplate: Story = () => (
  <Box p={3} bgcolor="#111133">
    <Typography variant="h6" gutterBottom color="white">
      Status Light Colors
    </Typography>
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Paper sx={{ bgcolor: '#222244', p: 2, borderRadius: 2 }}>
          <Typography variant="subtitle2" gutterBottom color="white">
            Theme Colors
          </Typography>
          <Grid container spacing={3}>
            <Grid item>
              <Box display="flex" flexDirection="column" alignItems="center">
                <LcarsStatusLight color="primary" />
                <Typography variant="caption" color="white" mt={1}>Primary</Typography>
              </Box>
            </Grid>
            <Grid item>
              <Box display="flex" flexDirection="column" alignItems="center">
                <LcarsStatusLight color="secondary" />
                <Typography variant="caption" color="white" mt={1}>Secondary</Typography>
              </Box>
            </Grid>
            <Grid item>
              <Box display="flex" flexDirection="column" alignItems="center">
                <LcarsStatusLight color="success" />
                <Typography variant="caption" color="white" mt={1}>Success</Typography>
              </Box>
            </Grid>
            <Grid item>
              <Box display="flex" flexDirection="column" alignItems="center">
                <LcarsStatusLight color="error" />
                <Typography variant="caption" color="white" mt={1}>Error</Typography>
              </Box>
            </Grid>
            <Grid item>
              <Box display="flex" flexDirection="column" alignItems="center">
                <LcarsStatusLight color="warning" />
                <Typography variant="caption" color="white" mt={1}>Warning</Typography>
              </Box>
            </Grid>
            <Grid item>
              <Box display="flex" flexDirection="column" alignItems="center">
                <LcarsStatusLight color="info" />
                <Typography variant="caption" color="white" mt={1}>Info</Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Grid>
      
      <Grid item xs={12}>
        <Paper sx={{ bgcolor: '#222244', p: 2, borderRadius: 2, mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom color="white">
            LCARS Colors
          </Typography>
          <Grid container spacing={3}>
            <Grid item>
              <Box display="flex" flexDirection="column" alignItems="center">
                <LcarsStatusLight color="amber" />
                <Typography variant="caption" color="white" mt={1}>Amber</Typography>
              </Box>
            </Grid>
            <Grid item>
              <Box display="flex" flexDirection="column" alignItems="center">
                <LcarsStatusLight color="blue" />
                <Typography variant="caption" color="white" mt={1}>Blue</Typography>
              </Box>
            </Grid>
            <Grid item>
              <Box display="flex" flexDirection="column" alignItems="center">
                <LcarsStatusLight color="green" />
                <Typography variant="caption" color="white" mt={1}>Green</Typography>
              </Box>
            </Grid>
            <Grid item>
              <Box display="flex" flexDirection="column" alignItems="center">
                <LcarsStatusLight color="red" />
                <Typography variant="caption" color="white" mt={1}>Red</Typography>
              </Box>
            </Grid>
            <Grid item>
              <Box display="flex" flexDirection="column" alignItems="center">
                <LcarsStatusLight color="purple" />
                <Typography variant="caption" color="white" mt={1}>Purple</Typography>
              </Box>
            </Grid>
            <Grid item>
              <Box display="flex" flexDirection="column" alignItems="center">
                <LcarsStatusLight color="cyan" />
                <Typography variant="caption" color="white" mt={1}>Cyan</Typography>
              </Box>
            </Grid>
            <Grid item>
              <Box display="flex" flexDirection="column" alignItems="center">
                <LcarsStatusLight color="orange" />
                <Typography variant="caption" color="white" mt={1}>Orange</Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Grid>
    </Grid>
  </Box>
);

// Create a showcase of animation effects
const AnimationsShowcaseTemplate: Story = () => (
  <Box p={3} bgcolor="#111133">
    <Typography variant="h6" gutterBottom color="white">
      Status Light Animations
    </Typography>
    <Grid container spacing={4}>
      <Grid item>
        <Box display="flex" flexDirection="column" alignItems="center">
          <LcarsStatusLight state="active" />
          <Typography variant="caption" color="white" mt={1}>Blinking (default for active)</Typography>
        </Box>
      </Grid>
      <Grid item>
        <Box display="flex" flexDirection="column" alignItems="center">
          <LcarsStatusLight state="idle" blinking={true} />
          <Typography variant="caption" color="white" mt={1}>Forced Blinking</Typography>
        </Box>
      </Grid>
      <Grid item>
        <Box display="flex" flexDirection="column" alignItems="center">
          <LcarsStatusLight state="idle" pulseEffect={true} blinking={false} />
          <Typography variant="caption" color="white" mt={1}>Pulse Effect</Typography>
        </Box>
      </Grid>
      <Grid item>
        <Box display="flex" flexDirection="column" alignItems="center">
          <LcarsStatusLight state="running" blinking={false} />
          <Typography variant="caption" color="white" mt={1}>No Animation</Typography>
        </Box>
      </Grid>
    </Grid>
  </Box>
);

// Create a showcase of real-world usage
const UsageShowcaseTemplate: Story = () => (
  <Box p={3} bgcolor="#111133">
    <Typography variant="h6" gutterBottom color="white">
      Example Usage in UI
    </Typography>
    
    <Paper sx={{ bgcolor: '#222244', p: 2, borderRadius: 2, mb: 3 }}>
      <Box display="flex" alignItems="center" mb={2}>
        <LcarsStatusLight state="running" size="small" />
        <Typography variant="body2" color="white" ml={1}>
          System status: Operational
        </Typography>
      </Box>
      
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ bgcolor: '#333355', p: 2, borderRadius: 2 }}>
            <Box display="flex" alignItems="center" mb={1.5}>
              <LcarsStatusLight state="active" size="small" />
              <Typography variant="subtitle2" color="white" ml={1}>
                Data Transfer
              </Typography>
            </Box>
            <Typography variant="body2" color="#AAA" fontSize="0.8rem">
              Transferring test cases (45% complete)
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ bgcolor: '#333355', p: 2, borderRadius: 2 }}>
            <Box display="flex" alignItems="center" mb={1.5}>
              <LcarsStatusLight state="warning" size="small" />
              <Typography variant="subtitle2" color="white" ml={1}>
                API Connection
              </Typography>
            </Box>
            <Typography variant="body2" color="#AAA" fontSize="0.8rem">
              Rate limit approaching (85% utilized)
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ bgcolor: '#333355', p: 2, borderRadius: 2 }}>
            <Box display="flex" alignItems="center" mb={1.5}>
              <LcarsStatusLight state="error" size="small" />
              <Typography variant="subtitle2" color="white" ml={1}>
                Database Connection
              </Typography>
            </Box>
            <Typography variant="body2" color="#AAA" fontSize="0.8rem">
              Connection error - retry in progress
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ bgcolor: '#333355', p: 2, borderRadius: 2 }}>
            <Box display="flex" alignItems="center" mb={1.5}>
              <LcarsStatusLight state="completed" size="small" />
              <Typography variant="subtitle2" color="white" ml={1}>
                Backup Process
              </Typography>
            </Box>
            <Typography variant="body2" color="#AAA" fontSize="0.8rem">
              Daily backup completed successfully
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Paper>
    
    <Paper sx={{ bgcolor: '#222244', p: 2, borderRadius: 2 }}>
      <Typography variant="subtitle2" color="white" mb={2}>
        Operation Status Dashboard
      </Typography>
      
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Box display="flex" alignItems="center" justifyContent="space-between" p={1} borderBottom="1px solid #444">
            <Box display="flex" alignItems="center">
              <LcarsStatusLight state="completed" size="small" />
              <Typography variant="body2" color="white" ml={1}>
                Authentication
              </Typography>
            </Box>
            <Typography variant="caption" color="#AAA">
              100%
            </Typography>
          </Box>
        </Grid>
        
        <Grid item xs={12}>
          <Box display="flex" alignItems="center" justifyContent="space-between" p={1} borderBottom="1px solid #444">
            <Box display="flex" alignItems="center">
              <LcarsStatusLight state="completed" size="small" />
              <Typography variant="body2" color="white" ml={1}>
                Fetch Test Cases
              </Typography>
            </Box>
            <Typography variant="caption" color="#AAA">
              100%
            </Typography>
          </Box>
        </Grid>
        
        <Grid item xs={12}>
          <Box display="flex" alignItems="center" justifyContent="space-between" p={1} borderBottom="1px solid #444">
            <Box display="flex" alignItems="center">
              <LcarsStatusLight state="running" size="small" />
              <Typography variant="body2" color="white" ml={1}>
                Transform Data
              </Typography>
            </Box>
            <Typography variant="caption" color="#AAA">
              68%
            </Typography>
          </Box>
        </Grid>
        
        <Grid item xs={12}>
          <Box display="flex" alignItems="center" justifyContent="space-between" p={1} borderBottom="1px solid #444">
            <Box display="flex" alignItems="center">
              <LcarsStatusLight state="pending" size="small" />
              <Typography variant="body2" color="white" ml={1}>
                Upload to Target
              </Typography>
            </Box>
            <Typography variant="caption" color="#AAA">
              0%
            </Typography>
          </Box>
        </Grid>
        
        <Grid item xs={12}>
          <Box display="flex" alignItems="center" justifyContent="space-between" p={1}>
            <Box display="flex" alignItems="center">
              <LcarsStatusLight state="pending" size="small" />
              <Typography variant="body2" color="white" ml={1}>
                Verify Migration
              </Typography>
            </Box>
            <Typography variant="caption" color="#AAA">
              0%
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  </Box>
);

// Export the stories
export const Default = Template.bind({});
Default.args = {
  state: 'active',
  size: 'medium',
};

export const States = StatesShowcaseTemplate.bind({});
export const Sizes = SizesShowcaseTemplate.bind({});
export const Colors = ColorsShowcaseTemplate.bind({});
export const Animations = AnimationsShowcaseTemplate.bind({});
export const Usage = UsageShowcaseTemplate.bind({});