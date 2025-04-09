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

// Import pages (placeholders for now)
const ProvidersPage = () => <div>Providers Configuration Page</div>;
const MappingPage = () => <div>Field Mapping Page</div>;
const ExecutionPage = () => <div>Execution Control Page</div>;
const MonitoringPage = () => <div>Monitoring Page</div>;
const SettingsPage = () => <div>Settings Page</div>;

function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/providers" element={<ProvidersPage />} />
        <Route path="/mapping" element={<MappingPage />} />
        <Route path="/execution" element={<ExecutionPage />} />
        <Route path="/monitoring" element={<MonitoringPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/" element={<Navigate replace to="/providers" />} />
      </Routes>
    </AppLayout>
  );
}

export default App;