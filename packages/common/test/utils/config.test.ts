/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { Config, createConfig } from '../../src/utils/config';

describe('Config', () => {
  let originalEnv: NodeJS.ProcessEnv;
  
  beforeEach(() => {
    // Save original environment
    originalEnv = process.env;
    process.env = { ...originalEnv };
    
    // Set up test environment variables
    process.env.APP_PORT = '3000';
    process.env.APP_HOST = 'localhost';
    process.env.APP_DEBUG = 'true';
    process.env.APP_MAX_CONNECTIONS = '10';
  });
  
  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });
  
  describe('Basic functionality', () => {
    it('should create a config instance with default values', () => {
      const config = createConfig({
        defaults: {
          port: 8080,
          host: '0.0.0.0',
          debug: false,
          maxConnections: 5
        }
      });
      expect(config).toBeInstanceOf(Config);
    });
    
    it('should read values from environment variables', () => {
      const config = createConfig({
        envPrefix: 'APP_',
        envMappings: {
          port: 'PORT',
          host: 'HOST',
          debug: 'DEBUG',
          maxConnections: 'MAX_CONNECTIONS'
        },
        defaults: {
          port: 8080,
          host: '0.0.0.0',
          debug: false,
          maxConnections: 5
        }
      });
      
      expect(config.get('port')).toBe(3000);
      expect(config.get('host')).toBe('localhost');
      expect(config.get('debug')).toBe(true);
      expect(config.get('maxConnections')).toBe(10);
    });
    
    it('should use default values when environment variables are not set', () => {
      // Remove some env vars
      delete process.env.APP_HOST;
      delete process.env.APP_MAX_CONNECTIONS;
      
      const config = createConfig({
        envPrefix: 'APP_',
        envMappings: {
          port: 'PORT',
          host: 'HOST',
          debug: 'DEBUG',
          maxConnections: 'MAX_CONNECTIONS'
        },
        defaults: {
          port: 8080,
          host: '0.0.0.0',
          debug: false,
          maxConnections: 5
        }
      });
      
      expect(config.get('port')).toBe(3000); // From env
      expect(config.get('host')).toBe('0.0.0.0'); // From default
      expect(config.get('debug')).toBe(true); // From env
      expect(config.get('maxConnections')).toBe(5); // From default
    });
  });
  
  describe('Type conversions', () => {
    it('should convert string values to appropriate types', () => {
      process.env.APP_FLOAT = '123.45';
      process.env.APP_INT = '42';
      process.env.APP_BOOL = 'true';
      process.env.APP_STR = 'hello';
      process.env.APP_JSON = '{"key":"value","count":5}';
      
      const config = createConfig({
        envPrefix: 'APP_',
        envMappings: {
          floatVal: 'FLOAT',
          intVal: 'INT',
          boolVal: 'BOOL',
          strVal: 'STR',
          jsonVal: 'JSON'
        },
        types: {
          floatVal: 'float',
          intVal: 'int',
          boolVal: 'boolean',
          strVal: 'string',
          jsonVal: 'json'
        }
      });
      
      expect(config.get('floatVal')).toBe(123.45);
      expect(config.get('intVal')).toBe(42);
      expect(config.get('boolVal')).toBe(true);
      expect(config.get('strVal')).toBe('hello');
      expect(config.get('jsonVal')).toEqual({ key: 'value', count: 5 });
    });
    
    it('should handle boolean conversions correctly', () => {
      process.env.APP_BOOL_TRUE_1 = 'true';
      process.env.APP_BOOL_TRUE_2 = '1';
      process.env.APP_BOOL_TRUE_3 = 'yes';
      process.env.APP_BOOL_FALSE_1 = 'false';
      process.env.APP_BOOL_FALSE_2 = '0';
      process.env.APP_BOOL_FALSE_3 = 'no';
      
      const config = createConfig({
        envPrefix: 'APP_',
        envMappings: {
          true1: 'BOOL_TRUE_1',
          true2: 'BOOL_TRUE_2',
          true3: 'BOOL_TRUE_3',
          false1: 'BOOL_FALSE_1',
          false2: 'BOOL_FALSE_2',
          false3: 'BOOL_FALSE_3'
        },
        types: {
          true1: 'boolean',
          true2: 'boolean',
          true3: 'boolean',
          false1: 'boolean',
          false2: 'boolean',
          false3: 'boolean'
        }
      });
      
      expect(config.get('true1')).toBe(true);
      expect(config.get('true2')).toBe(true);
      expect(config.get('true3')).toBe(true);
      expect(config.get('false1')).toBe(false);
      expect(config.get('false2')).toBe(false);
      expect(config.get('false3')).toBe(false);
    });
  });
  
  describe('Advanced functionality', () => {
    it('should support setting values at runtime', () => {
      const config = createConfig();
      
      config.set('customValue', 'test');
      config.set('nestedValue', { foo: 'bar' });
      
      expect(config.get('customValue')).toBe('test');
      expect(config.get('nestedValue')).toEqual({ foo: 'bar' });
    });
    
    it('should support nested values with dot notation', () => {
      const config = createConfig({
        defaults: {
          database: {
            host: 'localhost',
            port: 5432,
            credentials: {
              username: 'admin',
              password: 'secret'
            }
          }
        }
      });
      
      expect(config.get('database.host')).toBe('localhost');
      expect(config.get('database.port')).toBe(5432);
      expect(config.get('database.credentials.username')).toBe('admin');
      expect(config.get('database.credentials.password')).toBe('secret');
    });
    
    it('should support setting nested values with dot notation', () => {
      const config = createConfig({
        defaults: {
          database: {
            host: 'localhost',
            port: 5432
          }
        }
      });
      
      config.set('database.host', 'db.example.com');
      config.set('database.credentials.username', 'newadmin');
      
      expect(config.get('database.host')).toBe('db.example.com');
      expect(config.get('database.port')).toBe(5432);
      expect(config.get('database.credentials.username')).toBe('newadmin');
    });
    
    it('should validate values against schemas if provided', () => {
      const config = createConfig({
        schemas: {
          server: {
            properties: {
              port: { type: 'number', minimum: 1024, maximum: 65535 },
              host: { type: 'string' }
            },
            required: ['port', 'host']
          }
        }
      });
      
      // Valid values
      config.set('server', { port: 8080, host: 'localhost' });
      expect(config.get('server')).toEqual({ port: 8080, host: 'localhost' });
      
      // Invalid value - should throw
      expect(() => {
        config.set('server', { port: 80, host: 'localhost' });
      }).toThrow();
      
      // Still has the original valid value
      expect(config.get('server')).toEqual({ port: 8080, host: 'localhost' });
    });
  });
});