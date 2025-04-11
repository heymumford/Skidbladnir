/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React from 'react';
import { Box, Typography, Link, Button, useTheme } from '@mui/material';
import { SvgIcon } from '@mui/material';
import { useFeature } from '../../context/FeatureFlagContext';
import { Feature } from '../../../../packages/common/src/utils/feature-flags';

// Rinna logo icon as SvgIcon component
const RinnaIcon = (props: any) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path d="M12,2C6.48,2,2,6.48,2,12s4.48,10,10,10s10-4.48,10-10S17.52,2,12,2z M12,20c-4.41,0-8-3.59-8-8s3.59-8,8-8s8,3.59,8,8 S16.41,20,12,20z M11,9h2v7h-2V9z M11,6h2v2h-2V6z" />
  </SvgIcon>
);

/**
 * Footer component displayed on all pages
 * Includes copyright information and registration status
 */
export const Footer: React.FC = () => {
  const theme = useTheme();
  const isPremium = useFeature(Feature.ADVANCED_TRANSFORMATIONS);
  
  const handleRegisterClick = () => {
    // Open Rinna app for registration
    window.open('/register-with-rinna', '_blank');
  };
  
  return (
    <Box
      component="footer"
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        py: 0.5,
        px: 2,
        backgroundColor: theme.palette.mode === 'dark' 
          ? 'rgba(0, 0, 0, 0.7)' 
          : 'rgba(245, 245, 245, 0.8)',
        borderTop: `1px solid ${theme.palette.divider}`,
        backdropFilter: 'blur(5px)',
        zIndex: 100
      }}
    >
      <Typography variant="caption" color="text.secondary">
        Copyright © 2025 Eric C. Mumford (@heymumford)
      </Typography>
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {!isPremium && (
          <Button 
            variant="outlined" 
            size="small" 
            color="primary"
            startIcon={<RinnaIcon />}
            onClick={handleRegisterClick}
            sx={{ height: 24, fontSize: '0.7rem' }}
          >
            Register with Rinna
          </Button>
        )}
        
        <Typography 
          variant="caption" 
          color={isPremium ? "success.main" : "error.main"}
          fontWeight="bold"
        >
          {isPremium ? "REGISTERED" : "UNREGISTERED/OPEN SOURCE"}
        </Typography>
      </Box>
    </Box>
  );
};