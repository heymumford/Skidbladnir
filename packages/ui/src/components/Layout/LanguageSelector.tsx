/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../i18n/LanguageProvider';
import { FormControl, InputLabel, Select, MenuItem, SelectChangeEvent } from '@mui/material';

interface LanguageSelectorProps {
  variant?: 'standard' | 'outlined' | 'filled';
  size?: 'small' | 'medium';
  className?: string;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'outlined',
  size = 'small',
  className
}) => {
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage, languageOptions } = useLanguage();

  const handleChange = (event: SelectChangeEvent<string>) => {
    const language = event.target.value;
    changeLanguage(language);
  };

  // Extract the base language code (e.g., 'en' from 'en-US')
  const baseLanguage = currentLanguage.split('-')[0].toLowerCase();

  return (
    <FormControl variant={variant} size={size} className={className}>
      <InputLabel id="language-selector-label">{t('ui.language')}</InputLabel>
      <Select
        labelId="language-selector-label"
        id="language-selector"
        value={baseLanguage}
        onChange={handleChange}
        label={t('ui.language')}
        data-testid="language-selector"
      >
        {languageOptions.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default LanguageSelector;