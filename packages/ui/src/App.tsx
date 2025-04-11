/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline, Box } from '@mui/material';
import { ThemeProvider } from './theme';
import { FeatureFlagProvider } from './context/FeatureFlagContext';
import { LanguageProvider } from './i18n/LanguageProvider';
import { AppLayout } from './components/Layout/AppLayout';
import { Footer } from './components/Layout/Footer';
import './i18n'; // Initialize i18next
import { 
  ProviderConfigPage, 
  FieldMappingPage, 
  ExecutionPage, 
  WizardPage, 
  TransformationPage,
  TransformationPreviewPage,
  ModernWorkflowPage,
  DesignSystemPage,
  EnhancedProviderConfigPage,
  MonitoringDashboardPage,
  ProgressIndicatorsDemo,
  AttachmentPreviewDemo,
  FeatureAdminPage,
  RinnaRegistrationPage,
  ProviderWorkflowTestPage,
  ZephyrQTestMigrationDemoPage
} from './pages';

// Import pages (placeholders for now)
const SettingsPage = () => <div>Settings Page</div>;

function App() {
  // Initialize theme from localStorage if available
  useEffect(() => {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('skidbladnir-theme');
    if (savedTheme) {
      // Theme will be set by ThemeProvider
    }
  }, []);

  return (
    <FeatureFlagProvider>
      <ThemeProvider>
        <LanguageProvider>
          <CssBaseline />
          <Box sx={{ position: 'relative', minHeight: '100vh', pb: 5 }}>
            <AppLayout>
              <Routes>
              <Route path="/providers" element={<EnhancedProviderConfigPage />} />
              <Route path="/mapping" element={<FieldMappingPage />} />
              <Route path="/execution" element={<ExecutionPage />} />
              <Route path="/monitoring" element={<MonitoringDashboardPage />} />
              <Route path="/monitoring/:migrationId" element={<MonitoringDashboardPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/admin/features" element={<FeatureAdminPage />} />
              <Route path="/wizard" element={<WizardPage />} />
              <Route path="/transformation" element={<TransformationPage />} />
              <Route path="/transformation-preview" element={<TransformationPreviewPage />} />
              <Route path="/workflow" element={<ModernWorkflowPage />} />
              <Route path="/workflow-test" element={<ProviderWorkflowTestPage />} />
              <Route path="/zephyr-qtest-demo" element={<ZephyrQTestMigrationDemoPage />} />
              <Route path="/design-system" element={<DesignSystemPage />} />
              <Route path="/progress-demo" element={<ProgressIndicatorsDemo />} />
              <Route path="/attachment-preview" element={<AttachmentPreviewDemo />} />
              <Route path="/register-with-rinna" element={<RinnaRegistrationPage />} />
              <Route path="/" element={<Navigate replace to="/workflow" />} />
            </Routes>
            </AppLayout>
            <Footer />
          </Box>
        </LanguageProvider>
      </ThemeProvider>
    </FeatureFlagProvider>
  );
}

export default App;