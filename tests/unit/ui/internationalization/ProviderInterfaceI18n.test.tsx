/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import i18n from 'i18next';
import { initReactI18next, I18nextProvider } from 'react-i18next';
import { LanguageProvider } from '../../../../packages/ui/src/i18n/LanguageProvider';
import ZephyrConfigPanel from '../../../../packages/ui/src/components/Providers/ZephyrConfigPanel';
import { default as _QTestConfigPanel } from '../../../../packages/ui/src/components/Providers/QTestConfigPanel';
import { ProviderConfigFactory } from '../../../../packages/ui/src/components/Providers/ProviderConfigFactory';

// Initialize i18n for testing
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: {
          common: {
            connection: {
              test: "Test Connection",
              success: "Connection Successful",
              failure: "Connection Failed"
            }
          },
          providers: {
            common: {
              testingConnection: "Testing Connection...",
              connectionSuccess: "Successfully connected to {{provider}}",
              connectionFailure: "Failed to connect to {{provider}}"
            },
            zephyr: {
              name: "Zephyr Scale",
              baseUrl: "Base URL",
              apiKey: "API Key"
            },
            qtest: {
              name: "qTest",
              instanceUrl: "Instance URL",
              apiToken: "API Token"
            }
          }
        }
      },
      ja: {
        translation: {
          common: {
            connection: {
              test: "接続テスト",
              success: "接続成功",
              failure: "接続失敗"
            }
          },
          providers: {
            common: {
              testingConnection: "接続テスト中...",
              connectionSuccess: "{{provider}}への接続に成功しました",
              connectionFailure: "{{provider}}への接続に失敗しました"
            },
            zephyr: {
              name: "Zephyr Scale",
              baseUrl: "ベースURL",
              apiKey: "APIキー"
            },
            qtest: {
              name: "qTest",
              instanceUrl: "インスタンスURL",
              apiToken: "APIトークン"
            }
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

// Mock provider config for testing
const mockConfig = {
  providerId: 'zephyr',
  baseUrl: 'https://api.zephyrscale.example.com',
  apiKey: 'test-api-key',
  projectKey: 'TEST'
};

const mockUpdateConfig = jest.fn();

describe('Provider Interface Internationalization', () => {
  test('Zephyr config panel should render with English translations', () => {
    render(
      <BrowserRouter>
        <I18nextProvider i18n={i18n}>
          <LanguageProvider>
            <ZephyrConfigPanel 
              config={mockConfig} 
              onConfigUpdate={mockUpdateConfig}
              connectionStatus="valid"
            />
          </LanguageProvider>
        </I18nextProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('Test Connection')).toBeInTheDocument();
    // Check if API Key field exists (exact label comparison)
    expect(screen.getByLabelText('Base URL')).toBeInTheDocument();
  });

  test('ProviderConfigFactory should render correct provider with translations', () => {
    render(
      <BrowserRouter>
        <I18nextProvider i18n={i18n}>
          <LanguageProvider>
            <ProviderConfigFactory
              providerId="zephyr"
              config={mockConfig}
              onConfigUpdate={mockUpdateConfig}
              connectionStatus="valid"
            />
          </LanguageProvider>
        </I18nextProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('Test Connection')).toBeInTheDocument();
    expect(screen.getByLabelText('Base URL')).toBeInTheDocument();
  });

  test('should switch language to Japanese for provider components', async () => {
    // Set language to Japanese
    await i18n.changeLanguage('ja');
    
    render(
      <BrowserRouter>
        <I18nextProvider i18n={i18n}>
          <LanguageProvider>
            <ZephyrConfigPanel 
              config={mockConfig} 
              onConfigUpdate={mockUpdateConfig}
              connectionStatus="valid"
            />
          </LanguageProvider>
        </I18nextProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('接続テスト')).toBeInTheDocument();
    expect(screen.getByLabelText('ベースURL')).toBeInTheDocument();
    
    // Reset to English for other tests
    await i18n.changeLanguage('en');
  });
});