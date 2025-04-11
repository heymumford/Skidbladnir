/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Stepper, 
  Step, 
  StepLabel, 
  Button, 
  Paper, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Grid, 
  Alert, 
  CircularProgress, 
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Chip,
  FormControlLabel,
  Switch,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  IconButton,
  Tooltip,
  Snackbar
} from '@mui/material';
import { 
  ArrowForward as ArrowForwardIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Download as DownloadIcon,
  CloudDownload as CloudDownloadIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

// Configuration for available providers
const PROVIDERS = [
  { id: 'zephyr', name: 'Zephyr Scale' },
  { id: 'qtest', name: 'qTest' },
  { id: 'testrail', name: 'TestRail' },
  { id: 'hp-alm', name: 'Micro Focus ALM' },
  { id: 'jama', name: 'Jama' },
  { id: 'azure-devops', name: 'Azure DevOps' },
  { id: 'visure', name: 'Visure' },
  { id: 'rally', name: 'Rally' }
];

// Test workflow steps
const WORKFLOW_STEPS = [
  'Provider Selection',
  'Connection Configuration',
  'Asset Selection',
  'Field Mapping',
  'Execution',
  'Verification'
];

// Provider configuration form components
const ProviderConfigForm = ({ provider, onChange, onTest, isConfigValid, testStatus }) => {
  const { t } = useTranslation();
  const [testing, setTesting] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  
  // Generic fields for all providers
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Determine which fields to show based on provider
  const getProviderFields = () => {
    switch (provider) {
      case 'zephyr':
        return (
          <>
            <TextField
              fullWidth
              margin="normal"
              label={t('providers.zephyr.baseUrl')}
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                onChange({ baseUrl: e.target.value, apiKey, projectKey: url });
              }}
            />
            <TextField
              fullWidth
              margin="normal"
              label={t('providers.zephyr.apiKey')}
              type={showSecrets ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                onChange({ baseUrl: url, apiKey: e.target.value, projectKey: url });
              }}
            />
            <TextField
              fullWidth
              margin="normal"
              label={t('providers.zephyr.projectKey')}
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                onChange({ baseUrl: url, apiKey, projectKey: e.target.value });
              }}
            />
          </>
        );
      case 'qtest':
        return (
          <>
            <TextField
              fullWidth
              margin="normal"
              label={t('providers.qtest.instanceUrl')}
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                onChange({ instanceUrl: e.target.value, apiToken: apiKey, projectId: url });
              }}
            />
            <TextField
              fullWidth
              margin="normal"
              label={t('providers.qtest.apiToken')}
              type={showSecrets ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                onChange({ instanceUrl: url, apiToken: e.target.value, projectId: url });
              }}
            />
            <TextField
              fullWidth
              margin="normal"
              label={t('providers.qtest.projectId')}
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                onChange({ instanceUrl: url, apiToken: apiKey, projectId: e.target.value });
              }}
            />
          </>
        );
      // Add other provider config forms as needed
      default:
        return (
          <>
            <TextField
              fullWidth
              margin="normal"
              label={t('providers.common.baseUrl')}
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                onChange({ url: e.target.value, apiKey });
              }}
            />
            <TextField
              fullWidth
              margin="normal"
              label={t('providers.common.apiKey')}
              type={showSecrets ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                onChange({ url, apiKey: e.target.value });
              }}
            />
          </>
        );
    }
  };
  
  const handleTestConnection = async () => {
    setTesting(true);
    try {
      await onTest();
    } finally {
      setTesting(false);
    }
  };
  
  return (
    <Box>
      <Card>
        <CardHeader 
          title={PROVIDERS.find(p => p.id === provider)?.name || provider} 
          subheader={t('providers.common.connectionDetails')}
        />
        <CardContent>
          <FormControlLabel
            control={
              <Switch
                checked={showSecrets}
                onChange={() => setShowSecrets(!showSecrets)}
              />
            }
            label={showSecrets ? t('providers.common.hidePassword') : t('providers.common.showPassword')}
          />
          
          {getProviderFields()}
          
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleTestConnection}
              disabled={!isConfigValid || testing}
              startIcon={testing ? <CircularProgress size={20} /> : null}
            >
              {testing ? t('providers.common.testingConnection') : t('common.connection.test')}
            </Button>
            
            {testStatus === 'valid' && (
              <Chip
                color="success"
                icon={<CheckIcon />}
                label={t('common.connection.success')}
              />
            )}
            
            {testStatus === 'invalid' && (
              <Chip
                color="error"
                icon={<ErrorIcon />}
                label={t('common.connection.failure')}
              />
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

// Asset Selection Component
const AssetSelectionComponent = ({ provider, onAssetsSelected }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState([]);
  const [selectedAssets, setSelectedAssets] = useState([]);
  
  useEffect(() => {
    // Simulate loading assets
    const loadAssets = async () => {
      setLoading(true);
      
      // Mock data - in a real app this would come from the API
      setTimeout(() => {
        const mockAssets = Array.from({ length: 20 }, (_, i) => ({
          id: `TC-${1000 + i}`,
          name: `Test Case ${i + 1} for ${provider}`,
          description: `This is a test case for ${provider} with index ${i + 1}`,
          priority: i % 3 === 0 ? 'High' : i % 3 === 1 ? 'Medium' : 'Low',
          status: i % 4 === 0 ? 'Draft' : i % 4 === 1 ? 'Ready' : i % 4 === 2 ? 'Approved' : 'Deprecated'
        }));
        
        setAssets(mockAssets);
        setLoading(false);
      }, 1500);
    };
    
    loadAssets();
  }, [provider]);
  
  const handleAssetSelect = (asset) => {
    const isSelected = selectedAssets.some(a => a.id === asset.id);
    
    if (isSelected) {
      setSelectedAssets(selectedAssets.filter(a => a.id !== asset.id));
    } else {
      setSelectedAssets([...selectedAssets, asset]);
    }
  };
  
  const handleSelectAll = () => {
    if (selectedAssets.length === assets.length) {
      setSelectedAssets([]);
    } else {
      setSelectedAssets([...assets]);
    }
  };
  
  const handleConfirmSelection = () => {
    onAssetsSelected(selectedAssets);
  };
  
  return (
    <Box>
      <Card>
        <CardHeader 
          title={t('migration.selectAssets')} 
          subheader={`${provider} ${t('common.source')} - ${selectedAssets.length} ${t('migration.metrics.totalItems')}`}
          action={
            <Button
              onClick={handleSelectAll}
              disabled={loading || assets.length === 0}
            >
              {selectedAssets.length === assets.length ? t('common.actions.cancel') : t('common.actions.selectAll')}
            </Button>
          }
        />
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox 
                        checked={selectedAssets.length === assets.length && assets.length > 0}
                        indeterminate={selectedAssets.length > 0 && selectedAssets.length < assets.length}
                        onChange={handleSelectAll}
                      />
                    </TableCell>
                    <TableCell>ID</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {assets.map(asset => (
                    <TableRow 
                      key={asset.id}
                      selected={selectedAssets.some(a => a.id === asset.id)}
                      onClick={() => handleAssetSelect(asset)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox checked={selectedAssets.some(a => a.id === asset.id)} />
                      </TableCell>
                      <TableCell>{asset.id}</TableCell>
                      <TableCell>{asset.name}</TableCell>
                      <TableCell>
                        <Chip 
                          size="small" 
                          color={asset.priority === 'High' ? 'error' : 
                                asset.priority === 'Medium' ? 'warning' : 'success'}
                          label={asset.priority} 
                        />
                      </TableCell>
                      <TableCell>{asset.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  color="primary"
                  disabled={selectedAssets.length === 0}
                  onClick={handleConfirmSelection}
                >
                  {t('common.actions.confirm')} ({selectedAssets.length})
                </Button>
              </Box>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

// Field Mapping Component
const FieldMappingComponent = ({ sourceProvider, targetProvider, testAssets, onFieldMappingsConfigured }) => {
  const { t } = useTranslation();
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [previewTransformation, setPreviewTransformation] = useState(null);
  
  useEffect(() => {
    // Simulate loading default mappings
    const loadMappings = async () => {
      setLoading(true);
      
      // Mock data - in a real app this would come from the API
      setTimeout(() => {
        // Create mappings based on source and target
        const defaultMappings = [
          {
            id: 1,
            sourceField: 'name',
            sourceLabel: 'Name',
            targetField: 'title',
            targetLabel: 'Title',
            required: true,
            transformation: 'direct',
            transformationParams: {}
          },
          {
            id: 2,
            sourceField: 'description',
            sourceLabel: 'Description',
            targetField: 'description',
            targetLabel: 'Description',
            required: false,
            transformation: 'direct',
            transformationParams: {}
          },
          {
            id: 3,
            sourceField: 'priority',
            sourceLabel: 'Priority',
            targetField: 'priority',
            targetLabel: 'Priority',
            required: false,
            transformation: 'direct',
            transformationParams: {}
          },
          {
            id: 4,
            sourceField: 'status',
            sourceLabel: 'Status',
            targetField: 'status',
            targetLabel: 'Status',
            required: false,
            transformation: 'direct',
            transformationParams: {}
          },
          {
            id: 5,
            sourceField: 'id',
            sourceLabel: 'ID',
            targetField: 'externalId',
            targetLabel: 'External ID',
            required: true,
            transformation: 'direct',
            transformationParams: {}
          }
        ];
        
        setMappings(defaultMappings);
        setLoading(false);
      }, 1000);
    };
    
    loadMappings();
  }, [sourceProvider, targetProvider]);
  
  const handleTransformationChange = (id, transformationType, params = {}) => {
    setMappings(mappings.map(mapping => 
      mapping.id === id 
        ? { ...mapping, transformation: transformationType, transformationParams: params } 
        : mapping
    ));
  };
  
  const handlePreviewTransformation = (mappingId) => {
    const mapping = mappings.find(m => m.id === mappingId);
    if (!mapping || !testAssets || testAssets.length === 0) return;
    
    const testAsset = testAssets[0];
    const sourceValue = testAsset[mapping.sourceField];
    
    let transformedValue = sourceValue;
    
    // Apply transformation
    switch (mapping.transformation) {
      case 'direct':
        // No transformation needed
        break;
      case 'concatenation':
        if (mapping.transformationParams.value) {
          transformedValue = sourceValue + mapping.transformationParams.value;
        }
        break;
      case 'slice':
        if (typeof sourceValue === 'string') {
          const start = mapping.transformationParams.start || 0;
          const end = mapping.transformationParams.end;
          transformedValue = sourceValue.slice(start, end);
        }
        break;
      case 'prefix':
        if (mapping.transformationParams.prefix) {
          transformedValue = mapping.transformationParams.prefix + sourceValue;
        }
        break;
      case 'suffix':
        if (mapping.transformationParams.suffix) {
          transformedValue = sourceValue + mapping.transformationParams.suffix;
        }
        break;
      case 'replace':
        if (typeof sourceValue === 'string' && 
            mapping.transformationParams.search && 
            mapping.transformationParams.replacement) {
          transformedValue = sourceValue.replace(
            mapping.transformationParams.search,
            mapping.transformationParams.replacement
          );
        }
        break;
    }
    
    setPreviewTransformation({
      mapping,
      originalValue: sourceValue,
      transformedValue
    });
  };
  
  const handleSaveMappings = () => {
    onFieldMappingsConfigured(mappings);
  };
  
  return (
    <Box>
      <Card>
        <CardHeader 
          title={t('fieldMapping.title')} 
          subheader={`${sourceProvider} → ${targetProvider}`}
        />
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('fieldMapping.sourceField')}</TableCell>
                    <TableCell>{t('fieldMapping.targetField')}</TableCell>
                    <TableCell>{t('fieldMapping.transform')}</TableCell>
                    <TableCell>{t('common.actions.edit')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mappings.map(mapping => (
                    <TableRow key={mapping.id}>
                      <TableCell>
                        {mapping.sourceLabel}
                        {mapping.required && (
                          <Chip 
                            size="small" 
                            label={t('fieldMapping.requiredField')} 
                            color="primary" 
                            sx={{ ml: 1 }}
                          />
                        )}
                      </TableCell>
                      <TableCell>{mapping.targetLabel}</TableCell>
                      <TableCell>
                        <Select
                          size="small"
                          value={mapping.transformation}
                          onChange={(e) => handleTransformationChange(mapping.id, e.target.value)}
                        >
                          <MenuItem value="direct">{t('fieldMapping.transformations.direct')}</MenuItem>
                          <MenuItem value="concatenation">{t('fieldMapping.transformations.concatenation')}</MenuItem>
                          <MenuItem value="slice">{t('fieldMapping.transformations.slice')}</MenuItem>
                          <MenuItem value="prefix">{t('fieldMapping.transformations.prefix')}</MenuItem>
                          <MenuItem value="suffix">{t('fieldMapping.transformations.suffix')}</MenuItem>
                          <MenuItem value="replace">{t('fieldMapping.transformations.replace')}</MenuItem>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <IconButton 
                          size="small" 
                          onClick={() => handlePreviewTransformation(mapping.id)}
                        >
                          <InfoIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {previewTransformation && (
                <Box sx={{ mt: 2, p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
                  <Typography variant="subtitle2">{t('fieldMapping.preview')}</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="caption">{t('fieldMapping.original')}</Typography>
                      <Typography>{previewTransformation.originalValue}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption">{t('fieldMapping.transformed')}</Typography>
                      <Typography>{previewTransformation.transformedValue}</Typography>
                    </Grid>
                  </Grid>
                </Box>
              )}
              
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSaveMappings}
                  startIcon={<SaveIcon />}
                >
                  {t('fieldMapping.saveMapping')}
                </Button>
              </Box>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

// Migration Execution Component
const MigrationExecutionComponent = ({ sourceProvider, targetProvider, testAssets, fieldMappings, onComplete }) => {
  const { t } = useTranslation();
  const [migrationState, setMigrationState] = useState({
    status: 'PENDING',
    progress: 0,
    itemsProcessed: 0,
    itemsTotal: testAssets?.length || 0,
    activeOperations: 0,
    completedOperations: 0,
    errors: []
  });
  
  // Use effect to simulate migration progress
  useEffect(() => {
    let timer;
    
    const simulateMigration = () => {
      setMigrationState(prevState => {
        if (prevState.status !== 'IN_PROGRESS') {
          return prevState;
        }
        
        // Calculate new progress
        const newItemsProcessed = Math.min(
          prevState.itemsTotal, 
          prevState.itemsProcessed + 1
        );
        const newProgress = Math.floor((newItemsProcessed / prevState.itemsTotal) * 100);
        
        // Determine if migration is complete
        const isComplete = newItemsProcessed >= prevState.itemsTotal;
        
        return {
          ...prevState,
          status: isComplete ? 'COMPLETED' : 'IN_PROGRESS',
          progress: newProgress,
          itemsProcessed: newItemsProcessed,
          activeOperations: isComplete ? 0 : Math.max(1, Math.min(3, prevState.itemsTotal - newItemsProcessed)),
          completedOperations: newItemsProcessed
        };
      });
    };
    
    if (migrationState.status === 'IN_PROGRESS') {
      // Simulate migration progress at 1-second intervals
      timer = setInterval(simulateMigration, 1000);
      
      // If migration completes, call onComplete
      if (migrationState.status === 'COMPLETED') {
        onComplete();
      }
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [migrationState.status, migrationState.itemsProcessed, migrationState.itemsTotal, onComplete]);
  
  const handleStartMigration = () => {
    setMigrationState(prevState => ({
      ...prevState,
      status: 'IN_PROGRESS',
      activeOperations: Math.min(3, prevState.itemsTotal)
    }));
  };
  
  const handlePauseMigration = () => {
    setMigrationState(prevState => ({
      ...prevState,
      status: 'PAUSED'
    }));
  };
  
  const handleResumeMigration = () => {
    setMigrationState(prevState => ({
      ...prevState,
      status: 'IN_PROGRESS'
    }));
  };
  
  const handleCancelMigration = () => {
    setMigrationState(prevState => ({
      ...prevState,
      status: 'CANCELLED'
    }));
  };
  
  return (
    <Box>
      <Card>
        <CardHeader 
          title={t('migration.migrationStatus')} 
          subheader={`${sourceProvider} → ${targetProvider}`}
        />
        <CardContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1">
              {t(`common.status.${migrationState.status.toLowerCase()}`)}
            </Typography>
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <LinearProgress 
              variant="determinate" 
              value={migrationState.progress} 
              sx={{ height: 10, borderRadius: 5 }}
            />
            <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
              {migrationState.progress}% - {migrationState.itemsProcessed} / {migrationState.itemsTotal} {t('migration.metrics.totalItems')}
            </Typography>
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2">
              {t('migration.metrics.progress')}: {migrationState.itemsProcessed} / {migrationState.itemsTotal}
            </Typography>
            <Typography variant="body2">
              {t('ui.lcars.operations')}: {migrationState.activeOperations}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            {migrationState.status === 'PENDING' && (
              <Button
                variant="contained"
                color="primary"
                onClick={handleStartMigration}
                startIcon={<PlayArrowIcon />}
              >
                {t('migration.startMigration')}
              </Button>
            )}
            
            {migrationState.status === 'IN_PROGRESS' && (
              <>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handlePauseMigration}
                  startIcon={<PauseIcon />}
                >
                  {t('migration.pauseMigration')}
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleCancelMigration}
                  startIcon={<StopIcon />}
                >
                  {t('migration.cancelMigration')}
                </Button>
              </>
            )}
            
            {migrationState.status === 'PAUSED' && (
              <>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleResumeMigration}
                  startIcon={<PlayArrowIcon />}
                >
                  {t('migration.resumeMigration')}
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleCancelMigration}
                  startIcon={<StopIcon />}
                >
                  {t('migration.cancelMigration')}
                </Button>
              </>
            )}
            
            {(migrationState.status === 'COMPLETED' || migrationState.status === 'CANCELLED') && (
              <Button
                variant="outlined"
                color="primary"
                onClick={onComplete}
              >
                {t('common.actions.next')}
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

// Migration Verification Component
const MigrationVerificationComponent = ({ sourceProvider, targetProvider, testAssets, onFinish }) => {
  const { t } = useTranslation();
  
  // Mock migration summary data
  const migrationSummary = {
    totalItems: testAssets.length,
    successfulItems: testAssets.length,
    failedItems: 0,
    warnings: 0,
    duration: '00:01:45',
    targetItemIds: testAssets.map((_, index) => `TGT-${index + 1}`)
  };
  
  return (
    <Box>
      <Card>
        <CardHeader 
          title={t('migration.migrationSummary')} 
          subheader={`${sourceProvider} → ${targetProvider}`}
        />
        <CardContent>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={3}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h5" align="center">{migrationSummary.totalItems}</Typography>
                  <Typography variant="body2" align="center">{t('migration.metrics.totalItems')}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={3}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h5" align="center" color="success.main">
                    {migrationSummary.successfulItems}
                  </Typography>
                  <Typography variant="body2" align="center">{t('migration.metrics.successfulItems')}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={3}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h5" align="center" color="error.main">
                    {migrationSummary.failedItems}
                  </Typography>
                  <Typography variant="body2" align="center">{t('migration.metrics.failedItems')}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={3}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h5" align="center">{migrationSummary.duration}</Typography>
                  <Typography variant="body2" align="center">{t('migration.metrics.duration')}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            {t('migration.metrics.totalItems')}
          </Typography>
          
          <Table size="small" sx={{ mb: 3 }}>
            <TableHead>
              <TableRow>
                <TableCell>Source ID</TableCell>
                <TableCell>Target ID</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {testAssets.map((asset, index) => (
                <TableRow key={asset.id}>
                  <TableCell>{asset.id}</TableCell>
                  <TableCell>{migrationSummary.targetItemIds[index]}</TableCell>
                  <TableCell>
                    <Chip 
                      size="small" 
                      color="success" 
                      icon={<CheckIcon />} 
                      label={t('common.status.completed')} 
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
            >
              {t('migration.downloadReport')}
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={onFinish}
            >
              {t('common.actions.finish')}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

// Main Workflow Test Page
const ProviderWorkflowTestPage = () => {
  const { t } = useTranslation();
  const [activeStep, setActiveStep] = useState(0);
  const [sourceProvider, setSourceProvider] = useState('');
  const [targetProvider, setTargetProvider] = useState('');
  const [sourceConfig, setSourceConfig] = useState(null);
  const [targetConfig, setTargetConfig] = useState(null);
  const [sourceConnectionStatus, setSourceConnectionStatus] = useState('unknown');
  const [targetConnectionStatus, setTargetConnectionStatus] = useState('unknown');
  const [selectedTestAssets, setSelectedTestAssets] = useState([]);
  const [fieldMappings, setFieldMappings] = useState([]);
  
  // Helper function to check if source provider configuration is valid
  const isSourceConfigValid = () => {
    if (!sourceConfig) return false;
    
    switch (sourceProvider) {
      case 'zephyr':
        return !!(sourceConfig.baseUrl && sourceConfig.apiKey && sourceConfig.projectKey);
      case 'qtest':
        return !!(sourceConfig.instanceUrl && sourceConfig.apiToken && sourceConfig.projectId);
      default:
        return !!(sourceConfig.url && sourceConfig.apiKey);
    }
  };
  
  // Helper function to check if target provider configuration is valid
  const isTargetConfigValid = () => {
    if (!targetConfig) return false;
    
    switch (targetProvider) {
      case 'zephyr':
        return !!(targetConfig.baseUrl && targetConfig.apiKey && targetConfig.projectKey);
      case 'qtest':
        return !!(targetConfig.instanceUrl && targetConfig.apiToken && targetConfig.projectId);
      default:
        return !!(targetConfig.url && targetConfig.apiKey);
    }
  };
  
  // Helper function to determine if current step is complete
  const isStepComplete = (step) => {
    switch (step) {
      case 0: // Provider Selection
        return !!sourceProvider && !!targetProvider;
      case 1: // Connection Configuration
        return sourceConnectionStatus === 'valid' && targetConnectionStatus === 'valid';
      case 2: // Asset Selection
        return selectedTestAssets.length > 0;
      case 3: // Field Mapping
        return fieldMappings.length > 0;
      case 4: // Execution
        return false; // Will be set by the execution component
      case 5: // Verification
        return false; // Will be set by the verification component
      default:
        return false;
    }
  };
  
  // Handle source provider testing
  const handleTestSourceConnection = async () => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setSourceConnectionStatus('valid');
  };
  
  // Handle target provider testing
  const handleTestTargetConnection = async () => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setTargetConnectionStatus('valid');
  };
  
  // Handle moving to next step
  const handleNext = () => {
    setActiveStep(activeStep + 1);
  };
  
  // Handle moving to previous step
  const handleBack = () => {
    setActiveStep(activeStep - 1);
  };
  
  // Handle completing the workflow
  const handleFinish = () => {
    // In a real app, you might want to navigate or show a completion message
    console.log('Workflow completed', {
      sourceProvider,
      targetProvider,
      sourceConfig,
      targetConfig,
      selectedTestAssets,
      fieldMappings
    });
    
    // Reset state
    setActiveStep(0);
    setSourceProvider('');
    setTargetProvider('');
    setSourceConfig(null);
    setTargetConfig(null);
    setSourceConnectionStatus('unknown');
    setTargetConnectionStatus('unknown');
    setSelectedTestAssets([]);
    setFieldMappings([]);
  };
  
  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        {t('migration.title')} - {t('common.testing')}
      </Typography>
      
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {WORKFLOW_STEPS.map((label, index) => (
          <Step key={label}>
            <StepLabel>{t(`workflow.steps.${label.toLowerCase().replace(' ', '')}`)}</StepLabel>
          </Step>
        ))}
      </Stepper>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        {/* Step 0: Provider Selection */}
        {activeStep === 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              {t('migration.selectSource')} & {t('migration.selectTarget')}
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={5}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>{t('migration.sourceProvider')}</InputLabel>
                  <Select
                    value={sourceProvider}
                    onChange={(e) => setSourceProvider(e.target.value)}
                    label={t('migration.sourceProvider')}
                  >
                    {PROVIDERS.map(provider => (
                      <MenuItem key={provider.id} value={provider.id}>{provider.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={2} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowForwardIcon />
              </Grid>
              
              <Grid item xs={5}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>{t('migration.targetProvider')}</InputLabel>
                  <Select
                    value={targetProvider}
                    onChange={(e) => setTargetProvider(e.target.value)}
                    label={t('migration.targetProvider')}
                  >
                    {PROVIDERS.map(provider => (
                      <MenuItem 
                        key={provider.id} 
                        value={provider.id}
                        disabled={provider.id === sourceProvider}
                      >
                        {provider.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        )}
        
        {/* Step 1: Connection Configuration */}
        {activeStep === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              {t('migration.configureSource')} & {t('migration.configureTarget')}
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={6}>
                <ProviderConfigForm
                  provider={sourceProvider}
                  onChange={setSourceConfig}
                  onTest={handleTestSourceConnection}
                  isConfigValid={isSourceConfigValid()}
                  testStatus={sourceConnectionStatus}
                />
              </Grid>
              
              <Grid item xs={6}>
                <ProviderConfigForm
                  provider={targetProvider}
                  onChange={setTargetConfig}
                  onTest={handleTestTargetConnection}
                  isConfigValid={isTargetConfigValid()}
                  testStatus={targetConnectionStatus}
                />
              </Grid>
            </Grid>
          </Box>
        )}
        
        {/* Step 2: Asset Selection */}
        {activeStep === 2 && (
          <AssetSelectionComponent
            provider={sourceProvider}
            onAssetsSelected={(assets) => {
              setSelectedTestAssets(assets);
              handleNext();
            }}
          />
        )}
        
        {/* Step 3: Field Mapping */}
        {activeStep === 3 && (
          <FieldMappingComponent
            sourceProvider={sourceProvider}
            targetProvider={targetProvider}
            testAssets={selectedTestAssets}
            onFieldMappingsConfigured={(mappings) => {
              setFieldMappings(mappings);
              handleNext();
            }}
          />
        )}
        
        {/* Step 4: Execution */}
        {activeStep === 4 && (
          <MigrationExecutionComponent
            sourceProvider={sourceProvider}
            targetProvider={targetProvider}
            testAssets={selectedTestAssets}
            fieldMappings={fieldMappings}
            onComplete={handleNext}
          />
        )}
        
        {/* Step 5: Verification */}
        {activeStep === 5 && (
          <MigrationVerificationComponent
            sourceProvider={sourceProvider}
            targetProvider={targetProvider}
            testAssets={selectedTestAssets}
            onFinish={handleFinish}
          />
        )}
      </Paper>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button
          disabled={activeStep === 0}
          onClick={handleBack}
        >
          {t('common.actions.back')}
        </Button>
        
        <Button
          variant="contained"
          color="primary"
          onClick={handleNext}
          disabled={
            activeStep === WORKFLOW_STEPS.length - 1 || 
            activeStep >= 2 || 
            !isStepComplete(activeStep)
          }
        >
          {t('common.actions.next')}
        </Button>
      </Box>
    </Box>
  );
};

// Define missing components or fix imports as needed
const Checkbox = (props) => <input type="checkbox" {...props} />;
const LinearProgress = (props) => (
  <Box 
    sx={{ 
      width: '100%', 
      height: props.sx?.height || 4, 
      backgroundColor: '#eee', 
      borderRadius: props.sx?.borderRadius || 0 
    }}
  >
    <Box 
      sx={{ 
        width: `${props.value}%`, 
        height: '100%', 
        backgroundColor: 'primary.main',
        borderRadius: 'inherit'
      }} 
    />
  </Box>
);

export default ProviderWorkflowTestPage;