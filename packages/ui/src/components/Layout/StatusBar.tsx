/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React from 'react';
import { 
  Box, 
  LinearProgress, 
  Typography, 
  Chip,
  styled
} from '@mui/material';
import { useMigrationContext } from '../../contexts/MigrationContext';

const StatusBarContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0.75, 2),
  borderTop: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  height: 32,
}));

const StatusChip = styled(Chip, {
  shouldForwardProp: (prop) => prop !== 'migrationStatus'
})<{ migrationStatus?: string }>(({ theme, migrationStatus }) => {
  let color = theme.palette.info.main;
  
  if (migrationStatus === 'failed') {
    color = theme.palette.error.main;
  } else if (migrationStatus === 'running') {
    color = theme.palette.success.main;
  } else if (migrationStatus === 'paused') {
    color = theme.palette.warning.main;
  } else if (migrationStatus === 'completed') {
    color = theme.palette.success.main;
  }
  
  return {
    backgroundColor: color,
    color: theme.palette.getContrastText(color),
    height: 24,
    fontSize: '0.75rem',
  };
});

const ProgressBarWrapper = styled(Box)({
  flexGrow: 1,
  display: 'flex',
  alignItems: 'center',
  margin: '0 16px',
});

export const StatusBar: React.FC = () => {
  const { currentMigration } = useMigrationContext();

  // Format the status text based on the migration state
  const getStatusText = () => {
    if (!currentMigration) return 'Ready';
    
    const status = currentMigration.status.charAt(0).toUpperCase() + currentMigration.status.slice(1);
    return status;
  };

  // Format the remaining time in a human-readable format
  const formatRemainingTime = (seconds: number) => {
    if (seconds < 60) return `${seconds} sec`;
    if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
    return `${Math.round(seconds / 3600)} hr ${Math.round((seconds % 3600) / 60)} min`;
  };

  return (
    <StatusBarContainer data-testid="status-bar">
      <Typography variant="body2" component="span" sx={{ mr: 1 }}>
        Current Operation:
      </Typography>
      
      <StatusChip 
        label={getStatusText()} 
        migrationStatus={currentMigration?.status} 
        size="small"
      />
      
      {currentMigration && (
        <>
          <ProgressBarWrapper>
            <LinearProgress 
              variant="determinate" 
              value={currentMigration.progress} 
              sx={{ flexGrow: 1, height: 8, borderRadius: 1 }}
            />
            <Typography variant="caption" sx={{ ml: 2, minWidth: 40 }}>
              {currentMigration.progress}%
            </Typography>
          </ProgressBarWrapper>
          
          <Typography variant="body2" component="span" sx={{ mr: 2 }}>
            Errors: {currentMigration.failedItems}
          </Typography>
          
          {currentMigration.estimatedRemainingTime && (
            <Typography variant="body2" component="span">
              Estimated: {formatRemainingTime(currentMigration.estimatedRemainingTime)} remaining
            </Typography>
          )}
        </>
      )}
    </StatusBarContainer>
  );
};