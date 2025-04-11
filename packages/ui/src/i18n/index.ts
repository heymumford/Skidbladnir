/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// Import translations
import enTranslation from './locales/en/translation.json';
import jaTranslation from './locales/ja/translation.json';
import deTranslation from './locales/de/translation.json';
import frTranslation from './locales/fr/translation.json';
import esTranslation from './locales/es/translation.json';

// Resources object with all translations
const resources = {
  en: {
    translation: enTranslation
  },
  ja: {
    translation: jaTranslation
  },
  de: {
    translation: deTranslation
  },
  fr: {
    translation: frTranslation
  },
  es: {
    translation: esTranslation
  }
};

// Map locale codes to their full variants
const localeMapping = {
  'en': 'en-US',
  'ja': 'ja-JP',
  'de': 'de-DE',
  'fr': 'fr-FR',
  'es': 'es-ES'
};

// Initialize i18n
i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['querystring', 'localStorage', 'navigator'],
      lookupQuerystring: 'lng',
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
    react: {
      useSuspense: true,
    },
  });

/**
 * Set the application language
 * @param locale The locale code (en, ja, de, fr, es)
 * @returns The full locale code (en-US, ja-JP, etc.)
 */
export const setLanguage = (locale: string): string => {
  const mappedLocale = localeMapping[locale] || locale;
  i18n.changeLanguage(locale);
  return mappedLocale;
};

/**
 * Get the current language full locale code
 * @returns The full locale code (en-US, ja-JP, etc.)
 */
export const getCurrentLocale = (): string => {
  const lang = i18n.language;
  return localeMapping[lang] || lang;
};

export default i18n;