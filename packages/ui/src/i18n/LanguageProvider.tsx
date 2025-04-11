/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { setLanguage, getCurrentLocale } from './index';

interface LanguageContextType {
  currentLanguage: string;
  changeLanguage: (language: string) => void;
  languageOptions: { value: string; label: string }[];
}

const LanguageContext = createContext<LanguageContextType>({
  currentLanguage: 'en-US',
  changeLanguage: () => {},
  languageOptions: []
});

export const useLanguage = () => useContext(LanguageContext);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(getCurrentLocale());

  const languageOptions = [
    { value: 'en', label: 'English (US)' },
    { value: 'ja', label: '日本語 (Japanese)' },
    { value: 'de', label: 'Deutsch (German)' },
    { value: 'fr', label: 'Français (French)' },
    { value: 'es', label: 'Español (Spanish)' }
  ];

  useEffect(() => {
    // Set initial language based on browser or localStorage settings
    const detectedLanguage = i18n.language;
    if (detectedLanguage) {
      setCurrentLanguage(getCurrentLocale());
    }
  }, [i18n.language]);

  const changeLanguage = (language: string) => {
    const fullLocale = setLanguage(language);
    setCurrentLanguage(fullLocale);
  };

  return (
    <LanguageContext.Provider value={{ currentLanguage, changeLanguage, languageOptions }}>
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageProvider;