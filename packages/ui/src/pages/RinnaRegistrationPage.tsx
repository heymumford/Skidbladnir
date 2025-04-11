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
  TextField, 
  Button, 
  Stepper, 
  Step, 
  StepLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  useTheme
} from '@mui/material';
import { 
  Person as PersonIcon,
  Business as BusinessIcon,
  CheckCircle as CheckCircleIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  ArrowForward as ArrowForwardIcon,
  CloudUpload as CloudUploadIcon
} from '@mui/icons-material';
import { excelCsvHandler } from '../../../packages/common/src/utils/excel-csv-handler';
import { useFeatureFlags } from '../context/FeatureFlagContext';
import { Feature } from '../../../packages/common/src/utils/feature-flags';

/**
 * Rinna Registration Page
 * 
 * This page allows users to register with Rinna and import their test data
 */
export const RinnaRegistrationPage: React.FC = () => {
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    title: '',
    phone: ''
  });
  const [registrationComplete, setRegistrationComplete] = useState(false);
  
  const { featureFlags, updateFeatureFlag } = useFeatureFlags();
  const rinnaIntegration = excelCsvHandler.getRinnaIntegration();
  
  // Steps for the registration process
  const steps = ['Your Information', 'Confirm Features', 'Complete Registration'];
  
  // Handle form field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Move to the next step
  const handleNext = () => {
    if (activeStep === steps.length - 1) {
      // Complete registration
      handleRegistration();
    } else {
      setActiveStep(prev => prev + 1);
    }
  };
  
  // Move to the previous step
  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };
  
  // Handle registration submission
  const handleRegistration = async () => {
    setLoading(true);
    
    try {
      // Simulate API call to Rinna
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Enable premium features
      updateFeatureFlag(Feature.ADVANCED_TRANSFORMATIONS, { enabled: true });
      updateFeatureFlag(Feature.AI_ASSISTANCE, { enabled: true });
      
      setRegistrationComplete(true);
    } catch (error) {
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Check if form is valid for the current step
  const isStepValid = () => {
    if (activeStep === 0) {
      return formData.name && formData.email && formData.company;
    }
    return true;
  };
  
  // Render step content based on active step
  const getStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Your Information
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField
                name="name"
                label="Full Name"
                value={formData.name}
                onChange={handleChange}
                required
                fullWidth
              />
              
              <TextField
                name="email"
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                fullWidth
              />
              
              <TextField
                name="company"
                label="Company"
                value={formData.company}
                onChange={handleChange}
                required
                fullWidth
              />
              
              <TextField
                name="title"
                label="Job Title"
                value={formData.title}
                onChange={handleChange}
                fullWidth
              />
              
              <TextField
                name="phone"
                label="Phone Number"
                value={formData.phone}
                onChange={handleChange}
                fullWidth
              />
            </Box>
          </Box>
        );
        
      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Features Available in Rinna
            </Typography>
            
            <Alert severity="info" sx={{ mb: 3 }}>
              The following features will be automatically imported from Skidbladnir to Rinna.
            </Alert>
            
            <List>
              {rinnaIntegration.supportedFeatures.map((feature, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText primary={feature} />
                </ListItem>
              ))}
            </List>
            
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Premium Features Included
              </Typography>
              
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <CheckCircleOutlineIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="subtitle2">
                      Advanced Transformations
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Advanced data transformation capabilities for complex migration scenarios.
                  </Typography>
                </CardContent>
              </Card>
              
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <CheckCircleOutlineIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="subtitle2">
                      AI Assistance
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    AI-powered assistance for error remediation and data transformation.
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Box>
        );
        
      case 2:
        return (
          <Box>
            {registrationComplete ? (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <CheckCircleIcon color="success" sx={{ fontSize: 64, mb: 2 }} />
                
                <Typography variant="h6" gutterBottom>
                  Registration Complete!
                </Typography>
                
                <Typography variant="body1" sx={{ mb: 3 }}>
                  Thank you for registering with Rinna. Your premium features have been activated.
                </Typography>
                
                <Button
                  variant="contained"
                  color="primary"
                  component="a"
                  href="/"
                >
                  Return to Dashboard
                </Button>
              </Box>
            ) : (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Complete Registration
                </Typography>
                
                <Alert severity="success" sx={{ mb: 3 }}>
                  You're almost done! Click the button below to complete your registration and activate premium features.
                </Alert>
                
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Registration Summary
                  </Typography>
                  
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Name
                      </Typography>
                      <Typography variant="body1">
                        {formData.name}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Email
                      </Typography>
                      <Typography variant="body1">
                        {formData.email}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Company
                      </Typography>
                      <Typography variant="body1">
                        {formData.company}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Job Title
                      </Typography>
                      <Typography variant="body1">
                        {formData.title || 'Not provided'}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                
                <Divider sx={{ my: 3 }} />
                
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  {loading ? (
                    <CircularProgress />
                  ) : (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleRegistration}
                      startIcon={<CloudUploadIcon />}
                      size="large"
                    >
                      Complete Registration & Activate Features
                    </Button>
                  )}
                </Box>
              </Box>
            )}
          </Box>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', flex: 1 }}>
            Register with Rinna
          </Typography>
          
          <Box 
            component="img" 
            src="/logo.png" 
            alt="Rinna Logo" 
            sx={{ height: 60 }}
          />
        </Box>
        
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map(label => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        <Box sx={{ minHeight: 400 }}>
          {getStepContent()}
        </Box>
        
        {!registrationComplete && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
            >
              Back
            </Button>
            
            <Button
              variant="contained"
              color="primary"
              onClick={handleNext}
              endIcon={activeStep < steps.length - 1 ? <ArrowForwardIcon /> : null}
              disabled={!isStepValid() || loading}
            >
              {activeStep === steps.length - 1 ? 'Finish' : 'Next'}
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
};