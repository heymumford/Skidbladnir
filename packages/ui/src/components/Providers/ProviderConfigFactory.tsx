/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React from 'react';
import { Box, Alert } from '@mui/material';
import { ProviderConfig } from '../../types';
import { ZephyrConfigPanel } from './ZephyrConfigPanel';
import { QTestConfigPanel } from './QTestConfigPanel';
import { TestRailConfigPanel } from './TestRailConfigPanel';
import { ALMConfigPanel } from './ALMConfigPanel';
import { JamaConfigPanel } from './JamaConfigPanel';

interface ProviderConfigFactoryProps {
  providerId: string;
  config: ProviderConfig | null;
  onConfigUpdate: (config: ProviderConfig) => void;
  connectionStatus?: 'pending' | 'valid' | 'invalid' | 'unknown';
}

/**
 * Provider Config Factory Component
 * 
 * This component renders the appropriate provider configuration panel
 * based on the provided providerId.
 */
export const ProviderConfigFactory: React.FC<ProviderConfigFactoryProps> = ({
  providerId,
  config,
  onConfigUpdate,
  connectionStatus = 'unknown'
}) => {
  // Render the appropriate config panel based on provider ID
  switch (providerId) {
    case 'zephyr':
      return (
        <ZephyrConfigPanel
          config={config}
          onConfigUpdate={onConfigUpdate}
          connectionStatus={connectionStatus}
        />
      );
      
    case 'qtest':
      return (
        <QTestConfigPanel
          config={config}
          onConfigUpdate={onConfigUpdate}
          connectionStatus={connectionStatus}
        />
      );
      
    case 'testrail':
      return (
        <TestRailConfigPanel
          config={config}
          onConfigUpdate={onConfigUpdate}
          connectionStatus={connectionStatus}
        />
      );
      
    case 'hp-alm':
    case 'alm':
      return (
        <ALMConfigPanel
          config={config}
          onConfigUpdate={onConfigUpdate}
          connectionStatus={connectionStatus}
        />
      );
      
    case 'jama':
      return (
        <JamaConfigPanel
          config={config}
          onConfigUpdate={onConfigUpdate}
          connectionStatus={connectionStatus}
        />
      );
      
    // Additional providers could be added here
      
    default:
      // Generic error for unsupported provider
      return (
        <Box sx={{ p: 2 }}>
          <Alert severity="warning">
            Configuration panel for provider "{providerId}" is not implemented yet.
          </Alert>
        </Box>
      );
  }
};

export default ProviderConfigFactory;