/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

const React = require('react');

// This mock simulates the react-i18next translation functionality
const reactI18next = jest.createMockFromModule('react-i18next');

// Mock useTranslation hook
const useTranslation = () => {
  return {
    t: jest.fn((key, params) => {
      // Handle specific keys for tests that expect particular translations
      const translations = {
        // Zephyr translations
        'providers.zephyr.title': 'Zephyr Scale Configuration',
        'providers.zephyr.baseUrl': 'API Base URL',
        'providers.zephyr.apiKey': 'API Key',
        'providers.zephyr.projectKey': 'Project Key',
        'providers.zephyr.advancedSettings': 'Advanced Settings',
        'providers.zephyr.showAdvanced': 'Show Advanced Settings',
        'providers.zephyr.hideAdvanced': 'Hide Advanced Settings',
        'providers.zephyr.testConnection': 'Test Connection',
        'providers.zephyr.save': 'Save',
        'providers.zephyr.cancel': 'Cancel',
        'providers.zephyr.connectionSuccess': 'Connection successful',
        'providers.zephyr.connectionFailed': 'Connection failed',
        'providers.zephyr.cloudInstance': 'Cloud Instance',
        'providers.zephyr.serverInstance': 'Server Instance',
        'providers.zephyr.instanceType': 'Instance Type',
        
        // qTest translations
        'providers.qtest.title': 'qTest Manager Configuration',
        'providers.qtest.instanceUrl': 'qTest Instance URL',
        'providers.qtest.apiToken': 'API Token',
        'providers.qtest.projectId': 'Project ID',
        'providers.qtest.useAutomationToken': 'Use Automation Token',
        'providers.qtest.impersonationUser': 'Impersonation User',
        'providers.qtest.userEmail': 'User Email',
        'providers.qtest.advancedSettings': 'Advanced Settings',
        'providers.qtest.connectionDetails': 'Connection Details',
        'providers.qtest.version': 'Version',
        'providers.qtest.user': 'User',
        'providers.qtest.project': 'Project',
        'providers.qtest.testCases': 'Test Cases',
        'providers.qtest.modules': 'Modules',
        'providers.qtest.connectionSuccess': 'Connection Successful',
        'providers.qtest.connectionFailed': 'Connection Failed',
        'providers.qtest.instanceUrlHelper': 'Replace {instance} with your qTest instance name',
        'providers.qtest.projectIdHelper': 'The numeric ID of the project',
        'providers.qtest.apiTokenHelper': 'Your personal API token from qTest Manager',
        'providers.qtest.automationTokenHelper': 'Enable if you are using the Automation API Token',
        'providers.qtest.impersonationUserHelper': 'Email of the user to impersonate when using automation token',
        
        // Common translations
        'providers.common.testingConnection': 'Testing...',
        'common.loading': 'Loading...',
        'common.required': 'Required',
        'common.save': 'Save',
        'common.cancel': 'Cancel',
        'common.connection.test': 'Test Connection',
        'common.connection.success': 'Connected',
        'common.connection.failure': 'Connection failed',
        'common.show': 'Show',
        'common.hide': 'Hide',
        
        // Error translations
        'error.validation.required': 'This field is required',
        'error.validation.url': 'Instance URL must be a valid URL starting with http:// or https://',
        'error.validation.numeric': 'Project ID must be a number',
        'error.validation.email': 'Invalid email address',
        'error.validation.required.impersonationUser': 'Impersonation user is required when using automation token',
        'error.api.auth': 'Auth Errors',
        'error.api.network': 'Network Errors', 
        'error.api.validation': 'Validation Errors',
        'error.api.system': 'System Errors',
        'error.api.resource': 'Resource Errors',
      };

      // Return translation if it exists
      if (typeof key === 'string' && translations[key]) {
        return translations[key];
      }
      
      // Handle count parameters for pluralization
      if (params && params.count !== undefined) {
        const countSuffix = params.count === 1 ? '' : 's';
        // Handle error count case specifically
        if (key.includes('error.api.')) {
          return `${translations[key] || key.split('.').pop()} (${params.count})`;
        }
        return `${key.split('.').pop()}${countSuffix}`;
      }
      
      // Return the last part of the key as a fallback
      if (typeof key === 'string') {
        return key.split('.').pop();
      }
      
      // Handle pluralization objects
      if (typeof key === 'object') {
        return key[Object.keys(key)[0]];
      }
      
      return key;
    }),
    i18n: {
      changeLanguage: jest.fn(),
      language: 'en',
    },
  };
};

// Mock Trans component
const Trans = ({ i18nKey, children }) => {
  return React.createElement('span', { 'data-testid': 'trans-component' }, i18nKey || children);
};

// Mock Translation component
const Translation = ({ children }) => {
  const t = (key) => key;
  return children(t);
};

// Mock withTranslation HOC
const withTranslation = () => (Component) => {
  const WrappedComponent = (props) => {
    const { t, i18n } = useTranslation();
    return React.createElement(Component, {
      ...props,
      t,
      i18n,
    });
  };
  WrappedComponent.displayName = `withTranslation(${Component.displayName || Component.name || 'Component'})`;
  return WrappedComponent;
};

// Mock initialized i18next instance
const initReactI18next = {
  type: '3rdParty',
  init: jest.fn(),
};

// Export all mocked components and functions
reactI18next.useTranslation = useTranslation;
reactI18next.Trans = Trans;
reactI18next.Translation = Translation;
reactI18next.withTranslation = withTranslation;
reactI18next.initReactI18next = initReactI18next;

module.exports = reactI18next;