/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import i18n from 'i18next';
import { initReactI18next, I18nextProvider } from 'react-i18next';
import { LanguageProvider, useLanguage } from '../../../../packages/ui/src/i18n/LanguageProvider';
import LanguageSelector from '../../../../packages/ui/src/components/Layout/LanguageSelector';

// Initialize i18n for testing
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: {
          common: {
            source: 'Source',
            target: 'Target'
          },
          ui: {
            language: 'Language'
          }
        }
      },
      ja: {
        translation: {
          common: {
            source: 'ソース',
            target: 'ターゲット'
          },
          ui: {
            language: '言語'
          }
        }
      }
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

// Simple component to test translation
const TranslatedComponent = () => {
  const { t } = i18n;
  return (
    <div>
      <div data-testid="source-text">{t('common.source')}</div>
      <div data-testid="target-text">{t('common.target')}</div>
    </div>
  );
};

// Component to test language switching
const TestComponent = () => {
  const { changeLanguage } = useLanguage();
  
  return (
    <div>
      <LanguageSelector />
      <TranslatedComponent />
      <button 
        data-testid="switch-to-japanese"
        onClick={() => changeLanguage('ja')}
      >
        Switch to Japanese
      </button>
    </div>
  );
};

describe('Internationalization Support', () => {
  test('should render with default English translations', () => {
    render(
      <BrowserRouter>
        <I18nextProvider i18n={i18n}>
          <LanguageProvider>
            <TranslatedComponent />
          </LanguageProvider>
        </I18nextProvider>
      </BrowserRouter>
    );

    expect(screen.getByTestId('source-text')).toHaveTextContent('Source');
    expect(screen.getByTestId('target-text')).toHaveTextContent('Target');
  });

  test('should change language when selector is used', () => {
    render(
      <BrowserRouter>
        <I18nextProvider i18n={i18n}>
          <LanguageProvider>
            <TestComponent />
          </LanguageProvider>
        </I18nextProvider>
      </BrowserRouter>
    );

    // Initial state - English
    expect(screen.getByTestId('source-text')).toHaveTextContent('Source');
    
    // Switch to Japanese
    fireEvent.click(screen.getByTestId('switch-to-japanese'));
    
    // Verify Japanese translations are displayed
    expect(screen.getByTestId('source-text')).toHaveTextContent('ソース');
    expect(screen.getByTestId('target-text')).toHaveTextContent('ターゲット');
  });

  test('language selector should be rendered', () => {
    render(
      <BrowserRouter>
        <I18nextProvider i18n={i18n}>
          <LanguageProvider>
            <LanguageSelector />
          </LanguageProvider>
        </I18nextProvider>
      </BrowserRouter>
    );

    const languageSelector = screen.getByTestId('language-selector');
    expect(languageSelector).toBeInTheDocument();
  });
});