/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/Layout/AppLayout';
import { ProviderConfigPage, FieldMappingPage, ExecutionPage, WizardPage } from './pages';

// Import pages (placeholders for now)
const MonitoringPage = () => <div>Monitoring Page</div>;
const SettingsPage = () => <div>Settings Page</div>;

function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/providers" element={<ProviderConfigPage />} />
        <Route path="/mapping" element={<FieldMappingPage />} />
        <Route path="/execution" element={<ExecutionPage />} />
        <Route path="/monitoring" element={<MonitoringPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/wizard" element={<WizardPage />} />
        <Route path="/" element={<Navigate replace to="/providers" />} />
      </Routes>
    </AppLayout>
  );
}

export default App;