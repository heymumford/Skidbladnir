/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { AppLayout } from './AppLayout';
import { Box, Typography, Button } from '@mui/material';

export default {
  title: 'Layout/AppLayout',
  component: AppLayout,
  parameters: {
    layout: 'fullscreen',
  },
} as Meta<typeof AppLayout>;

const Template: StoryFn<typeof AppLayout> = (args) => <AppLayout {...args} />;

export const Default = Template.bind({});
Default.args = {
  children: (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Welcome to Skíðblaðnir
      </Typography>
      <Typography variant="body1" paragraph>
        This is the universal test asset migration platform.
      </Typography>
      <Button variant="contained" color="primary">
        Get Started
      </Button>
    </Box>
  ),
};

export const WithContent = Template.bind({});
WithContent.args = {
  children: (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Provider Configuration
      </Typography>
      <Typography variant="body1" paragraph>
        Configure your source and target providers to begin the migration process.
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {['Jira/Zephyr', 'qTest', 'Azure DevOps', 'HP ALM', 'Rally', 'Excel'].map((provider) => (
          <Button
            key={provider}
            variant="outlined"
            sx={{ 
              p: 2, 
              minWidth: 200, 
              height: 120, 
              display: 'flex', 
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Box sx={{ fontSize: 40 }}>🔌</Box>
            <Typography variant="body2">{provider}</Typography>
          </Button>
        ))}
      </Box>
    </Box>
  ),
};