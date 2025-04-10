/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React from 'react';
import { FormControl, InputLabel, MenuItem, Select, SelectChangeEvent } from '@mui/material';
import { Provider } from '../../types';

interface ProviderSelectorProps {
  /**
   * Array of available providers to select from
   */
  providers: Provider[];
  
  /**
   * Callback function when a provider is selected
   */
  onSelect: (provider: Provider) => void;
  
  /**
   * The currently selected provider (optional)
   */
  value?: Provider;
  
  /**
   * Label to display for the selector
   */
  label: string;
  
  /**
   * Placeholder text when no provider is selected
   */
  placeholder?: string;
  
  /**
   * Whether to show provider version in the dropdown
   */
  showVersion?: boolean;
  
  /**
   * Whether the selector is disabled
   */
  disabled?: boolean;
}

export const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  providers,
  onSelect,
  value,
  label,
  placeholder = 'Select a provider',
  showVersion = false,
  disabled = false
}) => {
  const handleChange = (event: SelectChangeEvent<string>) => {
    const selectedProvider = providers.find(provider => provider.id === event.target.value);
    if (selectedProvider) {
      onSelect(selectedProvider);
    }
  };

  return (
    <FormControl fullWidth variant="outlined" disabled={disabled}>
      <InputLabel id={`${label.toLowerCase()}-label`}>{label}</InputLabel>
      <Select
        labelId={`${label.toLowerCase()}-label`}
        id={`${label.toLowerCase()}-select`}
        value={value?.id || ''}
        onChange={handleChange}
        label={label}
        displayEmpty
      >
        {!value && (
          <MenuItem value="" disabled>
            {placeholder}
          </MenuItem>
        )}
        {providers.map((provider) => (
          <MenuItem key={provider.id} value={provider.id}>
            {showVersion ? `${provider.name} (v${provider.version})` : provider.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};