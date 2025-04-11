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
  Typography, 
  Paper, 
  Card, 
  CardContent, 
  Button, 
  LinearProgress, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon,
  Divider,
  Grid,
  styled,
  useTheme,
  alpha,
  Stack
} from '@mui/material';
import { 
  Check as CheckIcon, 
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Storage as StorageIcon,
  Code as CodeIcon,
  Memory as MemoryIcon
} from '@mui/icons-material';
import { LcarsPanel, LcarsPanelGrid } from './LcarsPanel';
import { useDesignSystem } from '../../utils/designSystem';

const StatusBox = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'status'
})<{ status: 'success' | 'error' | 'warning' | 'info' }>(
  ({ theme, status }) => ({
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(1, 2),
    borderRadius: theme.shape.borderRadius,
    backgroundColor: alpha(theme.palette[status].main, 0.1),
    border: `1px solid ${alpha(theme.palette[status].main, 0.3)}`,
    color: theme.palette[status].main,
    marginBottom: theme.spacing(2),
  })
);

const DataValue = styled(Typography)(({ theme }) => ({
  fontSize: '2rem',
  fontWeight: 700,
  marginBottom: theme.spacing(1),
}));

const ProgressBar = styled(LinearProgress)(({ theme }) => ({
  height: 10,
  borderRadius: 5,
  marginBottom: theme.spacing(0.5),
}));

export interface LcarsDashboardProps {
  /**
   * Optional test ID for unit testing
   */
  'data-testid'?: string;
}

/**
 * A dashboard component that showcases the design system principles
 * using LCARS-style UI components
 */
export const LcarsDashboard: React.FC<LcarsDashboardProps> = ({
  'data-testid': dataTestId = 'lcars-dashboard'
}) => {
  const theme = useTheme();
  const ds = useDesignSystem();
  const isLcarsTheme = ds.isLcarsTheme();
  
  // Sample data for the dashboard
  const stats = {
    migrated: 328,
    pending: 72,
    failed: 12,
    progress: 80,
    errors: [
      { id: 1, message: 'Failed to extract test data from Zephyr API' },
      { id: 2, message: 'Connection timeout during attachment upload' },
      { id: 3, message: 'Invalid test format received from provider' }
    ],
    resources: {
      cpu: 38,
      memory: 62,
      storage: 45
    }
  };
  
  return (
    <Box data-testid={dataTestId}>
      {/* Dashboard Header */}
      <Box 
        sx={{ 
          mb: 4,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
        data-testid={`${dataTestId}-header`}
      >
        <Box>
          <Typography variant="h4" gutterBottom fontWeight={600}>
            Migration Dashboard
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Real-time monitoring for Zephyr → qTest migration
          </Typography>
        </Box>
        
        <Button 
          variant="contained" 
          color="primary"
          size="large"
          sx={{ 
            borderRadius: isLcarsTheme ? '24px' : undefined,
            px: 3
          }}
          data-testid={`${dataTestId}-action-button`}
        >
          Monitor Progress
        </Button>
      </Box>
      
      {/* Status Summary */}
      <Box sx={{ mb: 4 }} data-testid={`${dataTestId}-status-section`}>
        <Typography 
          variant="h6" 
          gutterBottom 
          sx={{ 
            fontWeight: 600,
            position: 'relative',
            pl: 2,
            '&::before': {
              content: '""',
              position: 'absolute',
              left: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 4,
              height: '80%',
              backgroundColor: theme.palette.primary.main,
              borderRadius: 2
            }
          }}
        >
          Migration Status
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <StatusBox status="info" data-testid={`${dataTestId}-status-box`}>
              <InfoIcon sx={{ mr: 1 }} />
              <Typography variant="body2">
                Migration is in progress. {stats.migrated} test cases migrated, {stats.pending} pending, {stats.failed} failed.
              </Typography>
            </StatusBox>
            
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" fontWeight={600}>Overall Progress</Typography>
                <Typography variant="body2">{stats.progress}%</Typography>
              </Box>
              <ProgressBar 
                variant="determinate" 
                value={stats.progress} 
                color="primary"
                data-testid={`${dataTestId}-progress-bar`}
              />
              <Typography variant="caption" color="textSecondary">
                Estimated completion: 45 minutes remaining
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card 
              sx={{ 
                height: '100%',
                borderRadius: isLcarsTheme ? 3 : undefined,
                backgroundColor: alpha(theme.palette.background.paper, 0.6)
              }}
              data-testid={`${dataTestId}-summary-card`}
            >
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Current Migration
                </Typography>
                <Typography variant="h6" gutterBottom>
                  Zephyr Scale → qTest Manager
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                  <Box>
                    <Typography variant="caption" color="textSecondary">Migrated</Typography>
                    <Typography variant="h6" color="primary" fontWeight={600}>{stats.migrated}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="textSecondary">Pending</Typography>
                    <Typography variant="h6" color="info.main" fontWeight={600}>{stats.pending}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="textSecondary">Failed</Typography>
                    <Typography variant="h6" color="error" fontWeight={600}>{stats.failed}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
      
      {/* Main Dashboard Content using LCARS Panels */}
      <LcarsPanelGrid data-testid={`${dataTestId}-panels`}>
        {/* Migration Statistics Panel */}
        <LcarsPanel
          title="Migration Statistics"
          color="primary"
          subtitle="Key metrics for the current migration process"
          data-testid={`${dataTestId}-statistics-panel`}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center' }}>
                <DataValue color="primary">{stats.migrated}</DataValue>
                <Typography variant="body2" color="textSecondary">Migrated</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center' }}>
                <DataValue color="info.main">{stats.pending}</DataValue>
                <Typography variant="body2" color="textSecondary">Pending</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ textAlign: 'center' }}>
                <DataValue color="error">{stats.failed}</DataValue>
                <Typography variant="body2" color="textSecondary">Failed</Typography>
              </Box>
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 2 }} />
          
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Migration Rate
            </Typography>
            <Typography variant="h6" fontWeight={600}>
              14.2 test cases / minute
            </Typography>
          </Box>
        </LcarsPanel>
        
        {/* System Resources Panel */}
        <LcarsPanel
          title="System Resources"
          color="secondary"
          status="Stable"
          statusColor="success"
          statusActive={true}
          data-testid={`${dataTestId}-resources-panel`}
        >
          <Stack spacing={2}>
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <MemoryIcon sx={{ mr: 1, color: 'secondary.main' }} fontSize="small" />
                  <Typography variant="body2">CPU Usage</Typography>
                </Box>
                <Typography variant="body2">{stats.resources.cpu}%</Typography>
              </Box>
              <ProgressBar 
                variant="determinate" 
                value={stats.resources.cpu} 
                color="secondary"
              />
            </Box>
            
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CodeIcon sx={{ mr: 1, color: 'info.main' }} fontSize="small" />
                  <Typography variant="body2">Memory Usage</Typography>
                </Box>
                <Typography variant="body2">{stats.resources.memory}%</Typography>
              </Box>
              <ProgressBar 
                variant="determinate" 
                value={stats.resources.memory} 
                color="info"
              />
            </Box>
            
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <StorageIcon sx={{ mr: 1, color: 'warning.main' }} fontSize="small" />
                  <Typography variant="body2">Storage Usage</Typography>
                </Box>
                <Typography variant="body2">{stats.resources.storage}%</Typography>
              </Box>
              <ProgressBar 
                variant="determinate" 
                value={stats.resources.storage} 
                color="warning"
              />
            </Box>
          </Stack>
        </LcarsPanel>
        
        {/* Error Log Panel */}
        <LcarsPanel
          title="Error Log"
          color="error"
          status="Attention Required"
          statusColor="error"
          statusActive={true}
          data-testid={`${dataTestId}-error-panel`}
        >
          <List>
            {stats.errors.map((error) => (
              <ListItem key={error.id} sx={{ px: 0, py: 1 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <ErrorIcon color="error" />
                </ListItemIcon>
                <ListItemText 
                  primary={error.message} 
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
            ))}
          </List>
          
          <Button 
            variant="outlined" 
            color="error"
            size="small"
            fullWidth
            sx={{ mt: 2 }}
          >
            View All Errors
          </Button>
        </LcarsPanel>
        
        {/* Connection Status Panel */}
        <LcarsPanel
          title="Connection Status"
          color="info"
          status="Connected"
          statusColor="success"
          statusActive={true}
          data-testid={`${dataTestId}-connection-panel`}
        >
          <List>
            <ListItem sx={{ px: 0, py: 1 }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <CheckIcon color="success" />
              </ListItemIcon>
              <ListItemText 
                primary="Zephyr Scale API" 
                secondary="Stable connection at 3.2 Mbps"
                primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </ListItem>
            
            <ListItem sx={{ px: 0, py: 1 }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <CheckIcon color="success" />
              </ListItemIcon>
              <ListItemText 
                primary="qTest Manager API" 
                secondary="Stable connection at 2.8 Mbps"
                primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </ListItem>
            
            <ListItem sx={{ px: 0, py: 1 }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <WarningIcon color="warning" />
              </ListItemIcon>
              <ListItemText 
                primary="Binary Processor" 
                secondary="High load (78% capacity)"
                primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </ListItem>
            
            <ListItem sx={{ px: 0, py: 1 }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <CheckIcon color="success" />
              </ListItemIcon>
              <ListItemText 
                primary="Orchestrator Service" 
                secondary="Normal operation"
                primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </ListItem>
          </List>
        </LcarsPanel>
      </LcarsPanelGrid>
    </Box>
  );
};