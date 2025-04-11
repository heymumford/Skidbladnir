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
  Stepper, 
  Step, 
  StepLabel, 
  Button, 
  Typography, 
  Paper, 
  useTheme,
  styled,
  Container,
  Alert,
  Chip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';

import { ZephyrConfigPanel } from '../Providers/ZephyrConfigPanel';
import { QTestConfigPanel } from '../Providers/QTestConfigPanel';
import { FieldMappingPanel } from '../Transformation/FieldMappingPanel';
import { TransformationPreviewPanel } from '../Transformation/TransformationPreviewPanel';
import { ExecutionConfigForm, ExecutionConfig } from './ExecutionConfigForm';
import { ProviderConfig, FieldMapping } from '../../types';

// Styled components for LCARS-inspired elements
const WizardContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    width: '16px',
    backgroundColor: theme.palette.primary.dark,
    borderTopLeftRadius: '24px',
    borderBottomLeftRadius: '24px',
  }
}));

const LcarsHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  padding: theme.spacing(2, 3),
  backgroundColor: theme.palette.primary.dark,
  color: theme.palette.primary.contrastText,
  borderTopLeftRadius: '24px',
  borderTopRightRadius: '24px',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    right: 0,
    bottom: 0,
    height: '8px',
    width: '70%',
    backgroundColor: theme.palette.primary.main,
  }
}));

const LcarsContent = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  backgroundColor: theme.palette.background.paper,
  borderBottomLeftRadius: '24px',
  borderBottomRightRadius: '24px',
  borderLeft: `1px solid ${theme.palette.divider}`,
  borderRight: `1px solid ${theme.palette.divider}`,
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const BlinkingLight = styled(Box)<{ active: boolean; color: string }>(
  ({ theme, active, color }) => ({
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: active ? theme.palette[color].main : theme.palette.grey[500],
    marginRight: theme.spacing(1),
    animation: active ? `$blink 1.2s infinite alternate` : 'none',
    '@keyframes blink': {
      '0%': {
        opacity: 0.4,
      },
      '100%': {
        opacity: 1,
      },
    },
  })
);

const StatusIndicator = styled(Box)<{ status: string }>(
  ({ theme, status }) => ({
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(0.5, 1.5),
    borderRadius: '16px',
    backgroundColor: 
      status === 'valid' ? theme.palette.success.light : 
      status === 'invalid' ? theme.palette.error.light : 
      status === 'pending' ? theme.palette.warning.light : 
      theme.palette.grey[200],
    color: 
      status === 'valid' ? theme.palette.success.contrastText : 
      status === 'invalid' ? theme.palette.error.contrastText : 
      status === 'pending' ? theme.palette.warning.contrastText : 
      theme.palette.text.primary,
  })
);

const NavigationButton = styled(Button)(({ theme }) => ({
  borderRadius: '24px',
  padding: theme.spacing(1, 3),
}));

interface MigrationStep {
  label: string;
  description: string;
  isOptional?: boolean;
}

interface MigrationWizardProps {
  onComplete: (config: any) => void;
  onCancel: () => void;
}

export const MigrationWizard: React.FC<MigrationWizardProps> = ({ onComplete, onCancel }) => {
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [completed, setCompleted] = useState<{[k: number]: boolean}>({});
  
  // Configuration state
  const [sourceConfig, setSourceConfig] = useState<ProviderConfig | null>(null);
  const [targetConfig, setTargetConfig] = useState<ProviderConfig | null>(null);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [executionConfig, setExecutionConfig] = useState<ExecutionConfig | null>(null);
  
  // Connection status
  const [sourceConnectionStatus, setSourceConnectionStatus] = useState<'pending' | 'valid' | 'invalid' | 'unknown'>('unknown');
  const [targetConnectionStatus, setTargetConnectionStatus] = useState<'pending' | 'valid' | 'invalid' | 'unknown'>('unknown');
  
  // Test case sample
  const [sampleTestCaseId, setSampleTestCaseId] = useState<string>('SAMPLE-123');
  
  // Define steps
  const steps: MigrationStep[] = [
    { 
      label: 'Provider Configuration', 
      description: 'Configure source and target connections' 
    },
    { 
      label: 'Field Mapping', 
      description: 'Map fields between source and target systems' 
    },
    { 
      label: 'Transformation Preview', 
      description: 'Preview and fine-tune transformations', 
      isOptional: true 
    },
    { 
      label: 'Execution Configuration', 
      description: 'Configure migration parameters' 
    },
    { 
      label: 'Review & Start', 
      description: 'Review and start migration' 
    }
  ];
  
  // Check if step is completed
  const isStepComplete = (step: number) => {
    return completed[step] || false;
  };
  
  // Handle next step
  const handleNext = () => {
    // Mark current step as completed
    const newCompleted = { ...completed };
    newCompleted[activeStep] = true;
    setCompleted(newCompleted);
    
    // Move to next step
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };
  
  // Handle back
  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };
  
  // Handle skip for optional steps
  const handleSkip = () => {
    if (!steps[activeStep].isOptional) {
      throw new Error("Cannot skip a required step");
    }
    
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };
  
  // Handle provider config update
  const handleSourceConfigUpdate = (config: ProviderConfig) => {
    setSourceConfig(config);
    setSourceConnectionStatus('pending');
    
    // In a real app, this would make an API call to verify the connection
    setTimeout(() => {
      setSourceConnectionStatus(config.apiKey ? 'valid' : 'invalid');
    }, 1000);
  };
  
  const handleTargetConfigUpdate = (config: ProviderConfig) => {
    setTargetConfig(config);
    setTargetConnectionStatus('pending');
    
    // In a real app, this would make an API call to verify the connection
    setTimeout(() => {
      setTargetConnectionStatus(config.apiKey ? 'valid' : 'invalid');
    }, 1000);
  };
  
  // Handle field mappings update
  const handleFieldMappingsUpdate = (mappings: FieldMapping[]) => {
    setFieldMappings(mappings);
  };
  
  // Handle execution config update
  const handleExecutionConfigUpdate = (config: ExecutionConfig) => {
    setExecutionConfig(config);
  };
  
  // Handle start migration
  const handleStartMigration = () => {
    if (!sourceConfig || !targetConfig || !executionConfig) {
      return;
    }
    
    // Combine all configurations
    const migrationConfig = {
      source: sourceConfig,
      target: targetConfig,
      fieldMappings,
      execution: executionConfig
    };
    
    // Call the parent's onComplete callback
    onComplete(migrationConfig);
  };
  
  // Check if current step can proceed
  const canProceed = () => {
    switch (activeStep) {
      case 0: // Provider Configuration
        return sourceConnectionStatus === 'valid' && targetConnectionStatus === 'valid';
      case 1: // Field Mapping
        return fieldMappings.length > 0;
      case 2: // Transformation Preview
        return true; // Optional step can always proceed
      case 3: // Execution Configuration
        return executionConfig !== null;
      case 4: // Review & Start
        return true;
      default:
        return false;
    }
  };
  
  // Render step content
  const getStepContent = (step: number) => {
    switch (step) {
      case 0: // Provider Configuration
        return (
          <Box>
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                Source System: Zephyr Scale
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <ZephyrConfigPanel 
                  config={sourceConfig} 
                  onConfigUpdate={handleSourceConfigUpdate} 
                  connectionStatus={sourceConnectionStatus}
                />
              </Paper>
            </Box>
            
            <Box>
              <Typography variant="h6" gutterBottom>
                Target System: qTest
              </Typography>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <QTestConfigPanel 
                  config={targetConfig} 
                  onConfigUpdate={handleTargetConfigUpdate}
                  connectionStatus={targetConnectionStatus}
                />
              </Paper>
            </Box>
          </Box>
        );
      case 1: // Field Mapping
        return (
          <Box>
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <FieldMappingPanel 
                sourceProviderId="zephyr" 
                targetProviderId="qtest"
                fieldMappings={fieldMappings}
                onMappingsUpdate={handleFieldMappingsUpdate}
              />
            </Paper>
          </Box>
        );
      case 2: // Transformation Preview
        return (
          <Box>
            {sourceConfig && targetConfig && fieldMappings.length > 0 ? (
              <TransformationPreviewPanel 
                testCaseId={sampleTestCaseId}
                sourceProviderId={sourceConfig.providerId}
                targetProviderId={targetConfig.providerId}
                fieldMappings={fieldMappings}
                onEditMapping={(mapping) => {
                  // In a real app, this would allow editing individual mappings
                  console.log('Edit mapping:', mapping);
                }}
                additionalTestCaseIds={['SAMPLE-124', 'SAMPLE-125']}
              />
            ) : (
              <Alert severity="warning">
                Please complete provider configuration and field mapping to preview transformations.
              </Alert>
            )}
          </Box>
        );
      case 3: // Execution Configuration
        return (
          <Box>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <ExecutionConfigForm 
                onSubmit={handleExecutionConfigUpdate}
                migrationPreview={{
                  estimatedItems: 1243,
                  estimatedDuration: 45,
                  potentialIssues: [
                    'Some attachments may exceed size limits',
                    'Custom fields may require manual review',
                    'Some test steps might be truncated due to length limitations'
                  ]
                }}
                disabled={false}
              />
            </Paper>
          </Box>
        );
      case 4: // Review & Start
        return (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              Please review your migration configuration before starting the process.
            </Alert>
            
            <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Provider Configuration
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2">Source: Zephyr Scale</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <StatusIndicator status={sourceConnectionStatus} sx={{ mr: 1 }}>
                    <BlinkingLight active={sourceConnectionStatus === 'valid'} color="success" />
                    <Typography variant="body2">
                      {sourceConnectionStatus === 'valid' ? 'Connected' : 'Not Connected'}
                    </Typography>
                  </StatusIndicator>
                  {sourceConfig && (
                    <Chip 
                      label={`Project: ${sourceConfig.projectKey || 'Not Set'}`} 
                      size="small" 
                      sx={{ ml: 1 }}
                    />
                  )}
                </Box>
              </Box>
              
              <Box>
                <Typography variant="subtitle2">Target: qTest</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <StatusIndicator status={targetConnectionStatus} sx={{ mr: 1 }}>
                    <BlinkingLight active={targetConnectionStatus === 'valid'} color="success" />
                    <Typography variant="body2">
                      {targetConnectionStatus === 'valid' ? 'Connected' : 'Not Connected'}
                    </Typography>
                  </StatusIndicator>
                  {targetConfig && (
                    <Chip 
                      label={`Project: ${targetConfig.projectId || 'Not Set'}`} 
                      size="small" 
                      sx={{ ml: 1 }}
                    />
                  )}
                </Box>
              </Box>
            </Paper>
            
            <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Field Mappings
              </Typography>
              <Typography variant="body2">
                {fieldMappings.length} field mappings configured
              </Typography>
              {fieldMappings.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  {fieldMappings.slice(0, 3).map((mapping, index) => (
                    <Chip 
                      key={index}
                      label={`${mapping.sourceField} → ${mapping.targetField}`}
                      size="small"
                      sx={{ mr: 1, mb: 1 }}
                    />
                  ))}
                  {fieldMappings.length > 3 && (
                    <Chip 
                      label={`+${fieldMappings.length - 3} more`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Box>
              )}
            </Paper>
            
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Execution Configuration
              </Typography>
              {executionConfig ? (
                <Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                    <Chip 
                      label={`Scope: ${executionConfig.scope === 'test' ? 'Test Run (Sample)' : 'Full Migration'}`} 
                      size="small"
                      color={executionConfig.scope === 'test' ? 'info' : 'primary'}
                    />
                    <Chip 
                      label={`Include Attachments: ${executionConfig.includeAttachments ? 'Yes' : 'No'}`} 
                      size="small"
                    />
                    <Chip 
                      label={`Include History: ${executionConfig.includeHistory ? 'Yes' : 'No'}`} 
                      size="small"
                    />
                  </Box>
                  
                  <Typography variant="body2">
                    Estimated Items: 1,243
                  </Typography>
                  <Typography variant="body2">
                    Estimated Duration: ~45 minutes
                  </Typography>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Execution configuration not complete.
                </Typography>
              )}
            </Paper>
          </Box>
        );
      default:
        return 'Unknown step';
    }
  };
  
  // Check if can proceed when dependencies change
  useEffect(() => {
    // Update completed status for current step based on canProceed
    if (canProceed()) {
      const newCompleted = { ...completed };
      newCompleted[activeStep] = true;
      setCompleted(newCompleted);
    }
  }, [sourceConnectionStatus, targetConnectionStatus, fieldMappings, executionConfig, activeStep]);
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <WizardContainer>
        <LcarsHeader>
          <Typography variant="h4">
            Zephyr → qTest Migration Wizard
          </Typography>
        </LcarsHeader>
        
        <LcarsContent>
          <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
            {steps.map((step, index) => {
              const stepProps: { completed?: boolean } = {};
              const labelProps: { optional?: React.ReactNode } = {};
              
              if (step.isOptional) {
                labelProps.optional = (
                  <Typography variant="caption">Optional</Typography>
                );
              }
              
              if (isStepComplete(index)) {
                stepProps.completed = true;
              }
              
              return (
                <Step key={step.label} {...stepProps}>
                  <StepLabel {...labelProps}>
                    {step.label}
                    <Typography variant="caption" sx={{ display: 'block' }}>
                      {step.description}
                    </Typography>
                  </StepLabel>
                </Step>
              );
            })}
          </Stepper>
          
          <Box sx={{ mb: 4 }}>
            {getStepContent(activeStep)}
          </Box>
          
          <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
            <Box>
              <NavigationButton
                color="inherit"
                disabled={activeStep === 0}
                onClick={handleBack}
                startIcon={<ArrowBackIcon />}
                sx={{ mr: 1 }}
              >
                Back
              </NavigationButton>
              
              <Button
                variant="outlined"
                color="inherit"
                onClick={onCancel}
              >
                Cancel
              </Button>
            </Box>
            
            <Box>
              {steps[activeStep].isOptional && (
                <NavigationButton 
                  variant="text"
                  onClick={handleSkip} 
                  color="inherit"
                  sx={{ mr: 1 }}
                >
                  Skip
                </NavigationButton>
              )}
              
              {activeStep === steps.length - 1 ? (
                <NavigationButton
                  variant="contained"
                  color="primary"
                  onClick={handleStartMigration}
                  disabled={!canProceed()}
                  startIcon={<PlayArrowIcon />}
                >
                  Start Migration
                </NavigationButton>
              ) : (
                <NavigationButton
                  variant="contained"
                  color="primary"
                  onClick={handleNext}
                  disabled={!canProceed()}
                  endIcon={<ArrowForwardIcon />}
                >
                  Next
                </NavigationButton>
              )}
            </Box>
          </Box>
        </LcarsContent>
      </WizardContainer>
    </Container>
  );
};

export default MigrationWizard;