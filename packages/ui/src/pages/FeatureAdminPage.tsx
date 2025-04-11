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
  Switch, 
  FormControlLabel, 
  TextField,
  Button,
  Chip,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Slider,
  Divider,
  Card,
  CardContent,
  CardActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Grid,
  Tooltip,
  IconButton,
  useTheme,
  alpha
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';

import { useFeatureFlags } from '../context/FeatureFlagContext';
import { FeatureFlag } from '../../../packages/common/src/utils/feature-flags';

const ENVIRONMENTS = ['development', 'staging', 'production'];
const USER_ROLES = ['admin', 'power-user', 'standard-user', 'read-only'];

export const FeatureAdminPage: React.FC = () => {
  const { 
    featureFlags, 
    updateFeatureFlag, 
    isEnabled,
    setUserRoles,
    setEnvironment,
    getUserRoles,
    getEnvironment,
    resetToDefaults
  } = useFeatureFlags();
  
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [currentEnvironment, setCurrentEnvironment] = useState(getEnvironment());
  const [currentUserRoles, setCurrentUserRoles] = useState<string[]>(getUserRoles());
  
  const theme = useTheme();
  
  // Handle flag toggle
  const handleToggleFlag = (id: string, enabled: boolean) => {
    updateFeatureFlag(id, { enabled });
    setSnackbarMessage(`Feature "${featureFlags[id].name}" ${enabled ? 'enabled' : 'disabled'}`);
    setSnackbarOpen(true);
  };
  
  // Handle environment change
  const handleEnvironmentChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const env = event.target.value as string;
    setCurrentEnvironment(env);
    setEnvironment(env);
    setSnackbarMessage(`Environment changed to ${env}`);
    setSnackbarOpen(true);
  };
  
  // Handle user roles change
  const handleUserRolesChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const roles = event.target.value as string[];
    setCurrentUserRoles(roles);
    setUserRoles(roles);
    setSnackbarMessage(`User roles updated`);
    setSnackbarOpen(true);
  };
  
  // Handle edit flag
  const handleEditFlag = (flag: FeatureFlag) => {
    setEditingFlag({...flag});
  };
  
  // Handle save flag changes
  const handleSaveFlag = () => {
    if (editingFlag) {
      updateFeatureFlag(editingFlag.id, editingFlag);
      setSnackbarMessage(`Feature "${editingFlag.name}" updated`);
      setSnackbarOpen(true);
      setEditingFlag(null);
    }
  };
  
  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingFlag(null);
  };
  
  // Handle reset to defaults
  const handleReset = () => {
    resetToDefaults();
    setSnackbarMessage('All feature flags reset to defaults');
    setSnackbarOpen(true);
    setShowResetDialog(false);
  };
  
  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };
  
  return (
    <Box sx={{ padding: 3, maxWidth: 1200, margin: '0 auto' }}>
      <Typography variant="h4" gutterBottom>
        Feature Flag Administration
      </Typography>
      
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Environment & User Context
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
              <InputLabel id="environment-label">Current Environment</InputLabel>
              <Select
                labelId="environment-label"
                value={currentEnvironment}
                onChange={handleEnvironmentChange}
                label="Current Environment"
              >
                {ENVIRONMENTS.map(env => (
                  <MenuItem key={env} value={env}>
                    {env.charAt(0).toUpperCase() + env.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth variant="outlined">
              <InputLabel id="user-roles-label">User Roles</InputLabel>
              <Select
                labelId="user-roles-label"
                multiple
                value={currentUserRoles}
                onChange={handleUserRolesChange}
                label="User Roles"
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as string[]).map((value) => (
                      <Chip key={value} label={value} />
                    ))}
                  </Box>
                )}
              >
                {USER_ROLES.map(role => (
                  <MenuItem key={role} value={role}>
                    {role}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button 
            variant="outlined" 
            color="warning" 
            startIcon={<RefreshIcon />}
            onClick={() => setShowResetDialog(true)}
          >
            Reset to Defaults
          </Button>
        </Box>
      </Paper>
      
      <Typography variant="h5" gutterBottom>
        Feature Flags
      </Typography>
      
      <Grid container spacing={3}>
        {Object.values(featureFlags).map(flag => (
          <Grid item xs={12} md={6} lg={4} key={flag.id}>
            <Card 
              variant="outlined" 
              sx={{ 
                height: '100%',
                borderColor: isEnabled(flag.id) 
                  ? theme.palette.success.main 
                  : theme.palette.grey[300],
                borderWidth: isEnabled(flag.id) ? 2 : 1,
                bgcolor: isEnabled(flag.id) 
                  ? alpha(theme.palette.success.main, 0.05) 
                  : 'background.paper'
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="h6" component="div">
                    {flag.name}
                  </Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={flag.enabled}
                        onChange={(e) => handleToggleFlag(flag.id, e.target.checked)}
                        color="primary"
                      />
                    }
                    label=""
                  />
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {flag.description || 'No description available'}
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  <Chip 
                    label={`ID: ${flag.id}`} 
                    size="small" 
                    variant="outlined" 
                  />
                  {isEnabled(flag.id) ? (
                    <Chip 
                      icon={<CheckCircleIcon />}
                      label="Enabled" 
                      size="small" 
                      color="success"
                    />
                  ) : (
                    <Chip 
                      icon={<CancelIcon />}
                      label="Disabled" 
                      size="small" 
                      color="default"
                    />
                  )}
                </Box>
                
                <Accordion variant="outlined">
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="body2">Advanced Settings</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="caption" display="block" gutterBottom>
                      Environments
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                      {flag.environments?.map(env => (
                        <Chip 
                          key={env} 
                          label={env} 
                          size="small"
                          color={env === currentEnvironment ? "primary" : "default"}
                          variant="outlined"
                        />
                      )) || <Typography variant="body2">All environments</Typography>}
                    </Box>
                    
                    <Typography variant="caption" display="block" gutterBottom>
                      User Roles
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                      {flag.userRoles?.map(role => (
                        <Chip 
                          key={role} 
                          label={role} 
                          size="small"
                          color={currentUserRoles.includes(role) ? "primary" : "default"}
                          variant="outlined"
                        />
                      )) || <Typography variant="body2">All users</Typography>}
                    </Box>
                    
                    {flag.rolloutPercentage !== undefined && (
                      <>
                        <Typography variant="caption" display="block" gutterBottom>
                          Rollout Percentage: {flag.rolloutPercentage}%
                        </Typography>
                        <Slider
                          disabled
                          value={flag.rolloutPercentage}
                          size="small"
                          valueLabelDisplay="auto"
                          sx={{ mb: 1 }}
                        />
                      </>
                    )}
                  </AccordionDetails>
                </Accordion>
              </CardContent>
              <CardActions>
                <Button 
                  size="small" 
                  onClick={() => handleEditFlag(flag)}
                  startIcon={<SaveIcon />}
                >
                  Edit Settings
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      {/* Edit Dialog */}
      <Dialog open={editingFlag !== null} onClose={handleCancelEdit} maxWidth="md" fullWidth>
        <DialogTitle>
          Edit Feature Flag: {editingFlag?.name}
        </DialogTitle>
        <DialogContent>
          {editingFlag && (
            <Box sx={{ pt: 1 }}>
              <TextField
                label="Name"
                value={editingFlag.name}
                onChange={(e) => setEditingFlag({...editingFlag, name: e.target.value})}
                fullWidth
                margin="normal"
              />
              
              <TextField
                label="Description"
                value={editingFlag.description || ''}
                onChange={(e) => setEditingFlag({...editingFlag, description: e.target.value})}
                fullWidth
                margin="normal"
                multiline
                rows={2}
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={editingFlag.enabled}
                    onChange={(e) => setEditingFlag({...editingFlag, enabled: e.target.checked})}
                    color="primary"
                  />
                }
                label="Enabled"
                sx={{ my: 2, display: 'block' }}
              />
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle2" gutterBottom>
                Environment Settings
              </Typography>
              
              <FormControl fullWidth margin="normal">
                <InputLabel>Environments</InputLabel>
                <Select
                  multiple
                  value={editingFlag.environments || []}
                  onChange={(e) => setEditingFlag({
                    ...editingFlag, 
                    environments: e.target.value as string[]
                  })}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => (
                        <Chip key={value} label={value} />
                      ))}
                    </Box>
                  )}
                  label="Environments"
                >
                  {ENVIRONMENTS.map(env => (
                    <MenuItem key={env} value={env}>
                      {env}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl fullWidth margin="normal">
                <InputLabel>User Roles</InputLabel>
                <Select
                  multiple
                  value={editingFlag.userRoles || []}
                  onChange={(e) => setEditingFlag({
                    ...editingFlag, 
                    userRoles: e.target.value as string[]
                  })}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => (
                        <Chip key={value} label={value} />
                      ))}
                    </Box>
                  )}
                  label="User Roles"
                >
                  {USER_ROLES.map(role => (
                    <MenuItem key={role} value={role}>
                      {role}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <Box sx={{ mt: 2, mb: 2 }}>
                <Typography id="rollout-percentage-label" gutterBottom>
                  Rollout Percentage: {editingFlag.rolloutPercentage || 0}%
                </Typography>
                <Slider
                  value={editingFlag.rolloutPercentage || 0}
                  onChange={(_, newValue) => setEditingFlag({
                    ...editingFlag, 
                    rolloutPercentage: newValue as number
                  })}
                  valueLabelDisplay="auto"
                  step={5}
                  marks
                  min={0}
                  max={100}
                  aria-labelledby="rollout-percentage-label"
                />
              </Box>
              
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  Feature ID: <strong>{editingFlag.id}</strong> (cannot be changed)
                </Typography>
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelEdit} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleSaveFlag} color="primary" variant="contained">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetDialog} onClose={() => setShowResetDialog(false)}>
        <DialogTitle>Reset All Feature Flags?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will reset all feature flags to their default values. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowResetDialog(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleReset} color="error" variant="contained">
            Reset
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        message={snackbarMessage}
      />
    </Box>
  );
};