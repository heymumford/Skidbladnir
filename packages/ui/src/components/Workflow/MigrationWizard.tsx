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
  styled,
  useTheme,
  CircularProgress,
  Alert
} from '@mui/material';
import { NavigateNext as NextIcon, NavigateBefore as PrevIcon } from '@mui/icons-material';

// Import components for each step
import { ProviderConfigPanel } from '../Providers/ProviderConfigPanel';
import { FieldMappingPanel } from '../Mapping/FieldMappingPanel';
import { TransformationPreviewPanel } from '../Transformation/TransformationPreviewPanel';
import { ExecutionConfigForm, ExecutionConfig, MigrationPreview } from '../Execution/ExecutionConfigForm';

// Import services and types
import { 
  Provider, 
  Field, 
  FieldMapping, 
  ConnectionParams, 
  ConnectionStatus
} from '../../types';
import { providerConnectionService } from '../../services';

// LCARS-inspired styling
const LcarsContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  margin: theme.spacing(2, 0),
  borderRadius: theme.spacing(2),
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: theme.spacing(4),
    height: '100%',
    backgroundColor: theme.palette.primary.main,
    borderTopLeftRadius: theme.spacing(2),
    borderBottomLeftRadius: theme.spacing(2),
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    right: 0,
    width: theme.spacing(4),
    height: '100%',
    backgroundColor: theme.palette.secondary.main,
    borderTopRightRadius: theme.spacing(2),
    borderBottomRightRadius: theme.spacing(2),
  }
}));

const ContentBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2, 6),
}));

const ActionButtons = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  padding: theme.spacing(2, 6),
  marginTop: theme.spacing(2),
}));

const LcarsButton = styled(Button)(({ theme }) => ({
  borderRadius: theme.spacing(3),
  padding: theme.spacing(1, 3),
  fontWeight: 'bold',
  position: 'relative',
  overflow: 'hidden',
  '&::after': {
    content: '""',
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    height: '3px',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  }
}));

// Blinking light animation for active operations
const BlinkingLight = styled(Box)<{ isActive: boolean }>(({ theme, isActive }) => ({
  width: 12,
  height: 12,
  borderRadius: '50%',
  marginRight: theme.spacing(1),
  backgroundColor: isActive ? theme.palette.success.main : theme.palette.grey[400],
  animation: isActive ? 'blink 1s infinite' : 'none',
  display: 'inline-block',
  '@keyframes blink': {
    '0%': { opacity: 0.3 },
    '50%': { opacity: 1 },
    '100%': { opacity: 0.3 },
  }
}));

// Available providers
const availableProviders: Provider[] = [
  { 
    id: 'zephyr', 
    name: 'Zephyr Scale', 
    version: '1.0', 
    icon: 'zephyr.png', 
    type: 'source',
    capabilities: {
      supportsTestCases: true,
      supportsTestCycles: true,
      supportsTestExecutions: true,
      supportsAttachments: true,
      supportsCustomFields: true
    }
  },
  { 
    id: 'qtest', 
    name: 'qTest Manager', 
    version: '2.0', 
    icon: 'qtest.png', 
    type: 'target',
    capabilities: {
      supportsTestCases: true,
      supportsTestCycles: true,
      supportsTestExecutions: true,
      supportsAttachments: true,
      supportsCustomFields: true
    }
  }
];

const mockSourceFields: Field[] = [
  { id: 'name', name: 'Name', type: 'string', required: true },
  { id: 'description', name: 'Description', type: 'text', required: true },
  { id: 'steps', name: 'Test Steps', type: 'array', required: true },
  { id: 'labels', name: 'Labels', type: 'array', required: false },
  { id: 'priority', name: 'Priority', type: 'string', required: false },
  { id: 'status', name: 'Status', type: 'string', required: true }
];

const mockTargetFields: Field[] = [
  { id: 'name', name: 'Name', type: 'string', required: true },
  { id: 'description', name: 'Description', type: 'text', required: true },
  { id: 'testSteps', name: 'Test Steps', type: 'array', required: true },
  { id: 'tags', name: 'Tags', type: 'array', required: false },
  { id: 'priority', name: 'Priority', type: 'string', required: false },
  { id: 'automation', name: 'Automation Status', type: 'string', required: false },
  { id: 'status', name: 'Status', type: 'string', required: true }
];

// Mock migration preview
const mockMigrationPreview: MigrationPreview = {
  estimatedItems: 1250,
  estimatedDuration: 15,
  potentialIssues: [
    'Some attachments may exceed size limits',
    'Custom fields with complex formatting may lose some formatting',
    'Test steps with embedded images will require manual verification'
  ]
};

interface MigrationWizardProps {
  /**
   * Optional callback when the wizard is completed
   */
  onComplete?: () => void;
  
  /**
   * Optional callback when the wizard is cancelled
   */
  onCancel?: () => void;
}

interface WizardStep {
  label: string;
  content: React.ReactNode;
  optional?: boolean;
  isValid: boolean;
}

// Migration configuration interface
interface MigrationConfig {
  sourceProvider?: Provider;
  sourceConnection?: ConnectionParams;
  targetProvider?: Provider;
  targetConnection?: ConnectionParams;
  fieldMappings: FieldMapping[];
  executionConfig?: ExecutionConfig;
}

export const MigrationWizard: React.FC<MigrationWizardProps> = ({
  onComplete,
  onCancel
}) => {
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Wizard state
  const [migrationConfig, setMigrationConfig] = useState<MigrationConfig>({
    fieldMappings: []
  });
  
  // Step validation state
  const [stepValidation, setStepValidation] = useState<boolean[]>([false, false, false, false, false]);

  // Function to get connection fields for a provider
  const getConnectionFields = async (providerId: string) => {
    try {
      return await providerConnectionService.getConnectionFields(providerId);
    } catch (error) {
      console.error('Error getting connection fields:', error);
      setError('Failed to get connection fields');
      return [];
    }
  };
  
  // Function to test connection to a provider
  const testConnection = async (providerId: string, params: ConnectionParams): Promise<ConnectionStatus> => {
    try {
      return await providerConnectionService.testConnection(providerId, params);
    } catch (error) {
      console.error('Error testing connection:', error);
      return { 
        success: false, 
        message: 'Connection test failed due to an unexpected error',
        details: {
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  };
  
  // Save source provider connection
  const handleSaveSourceConnection = (providerId: string, params: ConnectionParams) => {
    setMigrationConfig(prev => ({
      ...prev,
      sourceProvider: availableProviders.find(p => p.id === providerId),
      sourceConnection: params
    }));
    
    // Validate step
    const newValidation = [...stepValidation];
    newValidation[0] = true;
    setStepValidation(newValidation);
  };
  
  // Save target provider connection
  const handleSaveTargetConnection = (providerId: string, params: ConnectionParams) => {
    setMigrationConfig(prev => ({
      ...prev,
      targetProvider: availableProviders.find(p => p.id === providerId),
      targetConnection: params
    }));
    
    // Validate step
    const newValidation = [...stepValidation];
    newValidation[0] = !!migrationConfig.sourceProvider;
    setStepValidation(newValidation);
  };
  
  // Handle field mappings change
  const handleFieldMappingsChange = (mappings: FieldMapping[]) => {
    setMigrationConfig(prev => ({
      ...prev,
      fieldMappings: mappings
    }));
    
    // Validate step
    const newValidation = [...stepValidation];
    newValidation[1] = mappings.length > 0;
    setStepValidation(newValidation);
  };
  
  // Handle execution config
  const handleExecutionConfigSubmit = (config: ExecutionConfig) => {
    setMigrationConfig(prev => ({
      ...prev,
      executionConfig: config
    }));
    
    // Validate step
    const newValidation = [...stepValidation];
    newValidation[3] = true;
    setStepValidation(newValidation);
    
    // Move to next step
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    }
  };
  
  // Define the steps in the wizard with dynamic content
  const steps: WizardStep[] = [
    {
      label: 'Provider Selection',
      content: (
        <Box>
          <ProviderConfigPanel
            title="Source Provider"
            providers={availableProviders.filter(p => p.type === 'source')}
            getConnectionFields={getConnectionFields}
            testConnection={testConnection}
            saveConnection={handleSaveSourceConnection}
            existingConfig={migrationConfig.sourceProvider ? {
              providerId: migrationConfig.sourceProvider.id,
              params: migrationConfig.sourceConnection || {}
            } : undefined}
            disabled={isProcessing}
          />
          
          <ProviderConfigPanel
            title="Target Provider"
            providers={availableProviders.filter(p => p.type === 'target')}
            getConnectionFields={getConnectionFields}
            testConnection={testConnection}
            saveConnection={handleSaveTargetConnection}
            existingConfig={migrationConfig.targetProvider ? {
              providerId: migrationConfig.targetProvider.id,
              params: migrationConfig.targetConnection || {}
            } : undefined}
            disabled={isProcessing}
          />
        </Box>
      ),
      isValid: stepValidation[0]
    },
    {
      label: 'Field Mapping',
      content: (
        <FieldMappingPanel
          sourceFields={mockSourceFields}
          targetFields={mockTargetFields}
          initialMappings={migrationConfig.fieldMappings}
          onMappingsChange={handleFieldMappingsChange}
          showFieldTypes={true}
          allowAutoMapping={true}
          validateMappings={true}
          showTransformations={true}
          disabled={isProcessing}
        />
      ),
      isValid: stepValidation[1]
    },
    {
      label: 'Transformation Preview',
      content: (
        <TransformationPreviewPanel
          testCaseId="mock-test-case-id"
          sourceProviderId={migrationConfig.sourceProvider?.id || 'zephyr'}
          targetProviderId={migrationConfig.targetProvider?.id || 'qtest'}
          fieldMappings={migrationConfig.fieldMappings}
          onClose={() => {
            // Mark this step as valid when user views the preview
            const newValidation = [...stepValidation];
            newValidation[2] = true;
            setStepValidation(newValidation);
          }}
        />
      ),
      isValid: stepValidation[2]
    },
    {
      label: 'Execution Configuration',
      content: (
        <ExecutionConfigForm
          onSubmit={handleExecutionConfigSubmit}
          migrationPreview={mockMigrationPreview}
          disabled={isProcessing}
        />
      ),
      isValid: stepValidation[3]
    },
    {
      label: 'Review & Start',
      content: (
        <Box>
          <Typography variant="h5" gutterBottom>
            Migration Summary
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              You're about to migrate test cases from {migrationConfig.sourceProvider?.name || 'Source'} to {migrationConfig.targetProvider?.name || 'Target'}.
            </Alert>
            
            <Typography variant="subtitle1" gutterBottom>
              Configuration Details:
            </Typography>
            
            <Typography variant="body2" paragraph>
              • Source Provider: {migrationConfig.sourceProvider?.name || 'Not selected'}
            </Typography>
            
            <Typography variant="body2" paragraph>
              • Target Provider: {migrationConfig.targetProvider?.name || 'Not selected'}
            </Typography>
            
            <Typography variant="body2" paragraph>
              • Field Mappings: {migrationConfig.fieldMappings.length} fields mapped
            </Typography>
            
            <Typography variant="body2" paragraph>
              • Execution Mode: {migrationConfig.executionConfig?.scope === 'test' ? 'Test Run (Sample)' : 'Full Migration'}
            </Typography>
            
            <Typography variant="body2" paragraph>
              • Include Attachments: {migrationConfig.executionConfig?.includeAttachments ? 'Yes' : 'No'}
            </Typography>
            
            <Typography variant="body2" paragraph>
              • Include History: {migrationConfig.executionConfig?.includeHistory ? 'Yes' : 'No'}
            </Typography>
            
            <Typography variant="body2" paragraph>
              • Estimated Items: {mockMigrationPreview.estimatedItems.toLocaleString()}
            </Typography>
            
            <Typography variant="body2" paragraph>
              • Estimated Duration: ~{mockMigrationPreview.estimatedDuration} minutes
            </Typography>
          </Box>
          
          <Alert severity="warning">
            <Typography variant="subtitle2" gutterBottom>
              Important:
            </Typography>
            <Typography variant="body2">
              Once started, the migration will run in the background. You can monitor progress, pause, or cancel the migration from the monitoring page.
            </Typography>
          </Alert>
        </Box>
      ),
      isValid: true
    }
  ];
  
  // Update the last step validation whenever we reach it
  useEffect(() => {
    if (activeStep === steps.length - 1) {
      const newValidation = [...stepValidation];
      newValidation[4] = true;
      setStepValidation(newValidation);
    }
  }, [activeStep]);
  
  const handleNext = () => {
    // If this is the last step, complete the wizard
    if (activeStep === steps.length - 1) {
      setIsProcessing(true);
      // Simulate processing
      setTimeout(() => {
        setIsProcessing(false);
        if (onComplete) onComplete();
      }, 2000);
      return;
    }
    
    // For execution configuration step, the component handles its own navigation
    if (activeStep === 3) {
      return;
    }
    
    setActiveStep((prevStep) => prevStep + 1);
  };
  
  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };
  
  const handleCancel = () => {
    if (onCancel) onCancel();
  };
  
  // Check if the current step is valid and we can proceed
  const canProceed = steps[activeStep].isValid;
  
  return (
    <Box>
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
        {steps.map((step, index) => (
          <Step key={step.label}>
            <StepLabel optional={step.optional ? <Typography variant="caption">Optional</Typography> : undefined}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <BlinkingLight isActive={index === activeStep} />
                {step.label}
              </Box>
            </StepLabel>
          </Step>
        ))}
      </Stepper>
      
      <LcarsContainer elevation={3}>
        <ContentBox>
          {isProcessing && activeStep === steps.length - 1 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
              <CircularProgress size={60} />
              <Typography variant="h6" sx={{ mt: 2 }}>
                Starting Migration...
              </Typography>
            </Box>
          ) : (
            steps[activeStep].content
          )}
        </ContentBox>
        
        <ActionButtons>
          <Box>
            <LcarsButton 
              variant="outlined"
              onClick={handleCancel}
              sx={{ mr: 1 }}
              disabled={isProcessing}
            >
              Cancel
            </LcarsButton>
            
            <LcarsButton
              variant="outlined"
              onClick={handleBack}
              disabled={activeStep === 0 || isProcessing}
              startIcon={<PrevIcon />}
            >
              Back
            </LcarsButton>
          </Box>
          
          {/* Skip the next button on the execution config step as it has its own buttons */}
          {activeStep !== 3 && (
            <LcarsButton
              variant="contained"
              color="primary"
              onClick={handleNext}
              disabled={isProcessing || !canProceed}
              endIcon={activeStep === steps.length - 1 ? undefined : <NextIcon />}
            >
              {activeStep === steps.length - 1 ? 'Start Migration' : 'Next'}
            </LcarsButton>
          )}
        </ActionButtons>
      </LcarsContainer>
    </Box>
  );
};