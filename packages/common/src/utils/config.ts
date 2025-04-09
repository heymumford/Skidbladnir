/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Configuration management utility
 * 
 * This utility provides a flexible configuration system with support for
 * environment variables, defaults, type conversion, and validation.
 */

import { createLogger, LogLevel } from './logger';

export type ValueType = 'string' | 'int' | 'float' | 'boolean' | 'json';

export interface SchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  minimum?: number;
  maximum?: number;
  pattern?: string;
  format?: string;
  items?: SchemaProperty;
  properties?: Record<string, SchemaProperty>;
  required?: string[];
}

export interface Schema {
  properties: Record<string, SchemaProperty>;
  required?: string[];
}

export interface ConfigOptions {
  /**
   * Default configuration values
   */
  defaults?: Record<string, any>;
  
  /**
   * Prefix for environment variables
   */
  envPrefix?: string;
  
  /**
   * Mapping from config keys to environment variable names
   */
  envMappings?: Record<string, string>;
  
  /**
   * Type conversions for config values
   */
  types?: Record<string, ValueType>;
  
  /**
   * JSON schema validation for config values
   */
  schemas?: Record<string, Schema>;
}

/**
 * Get a nested property from an object using dot notation
 */
function getNestedProperty(obj: any, path: string): any {
  const parts = path.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current === undefined || current === null) {
      return undefined;
    }
    current = current[part];
  }
  
  return current;
}

/**
 * Set a nested property on an object using dot notation
 */
function setNestedProperty(obj: any, path: string, value: any): void {
  const parts = path.split('.');
  let current = obj;
  
  // Navigate to the parent of the property to set
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || current[part] === null) {
      current[part] = {};
    }
    current = current[part];
  }
  
  // Set the value on the parent
  current[parts[parts.length - 1]] = value;
}

/**
 * Convert a string value to a specified type
 */
function convertValue(value: string, type: ValueType): any {
  if (value === undefined || value === null) {
    return value;
  }
  
  switch (type) {
    case 'int':
      return parseInt(value, 10);
    case 'float':
      return parseFloat(value);
    case 'boolean':
      return ['true', '1', 'yes', 'y'].includes(value.toLowerCase());
    case 'json':
      try {
        return JSON.parse(value);
      } catch (error) {
        throw new Error(`Failed to parse JSON value: ${error.message}`);
      }
    case 'string':
    default:
      return value;
  }
}

/**
 * Validate a value against a schema
 */
function validateValue(value: any, schema: Schema): boolean {
  // Check required properties
  if (schema.required) {
    for (const prop of schema.required) {
      if (value[prop] === undefined) {
        throw new Error(`Missing required property: ${prop}`);
      }
    }
  }
  
  // Validate properties
  for (const [prop, propSchema] of Object.entries(schema.properties)) {
    const propValue = value[prop];
    
    // Skip undefined properties
    if (propValue === undefined) {
      continue;
    }
    
    // Type validation
    if (propSchema.type === 'string' && typeof propValue !== 'string') {
      throw new Error(`Property ${prop} must be a string`);
    } else if (propSchema.type === 'number' && typeof propValue !== 'number') {
      throw new Error(`Property ${prop} must be a number`);
    } else if (propSchema.type === 'boolean' && typeof propValue !== 'boolean') {
      throw new Error(`Property ${prop} must be a boolean`);
    } else if (propSchema.type === 'object' && typeof propValue !== 'object') {
      throw new Error(`Property ${prop} must be an object`);
    } else if (propSchema.type === 'array' && !Array.isArray(propValue)) {
      throw new Error(`Property ${prop} must be an array`);
    }
    
    // Number range validation
    if (propSchema.type === 'number') {
      if (propSchema.minimum !== undefined && propValue < propSchema.minimum) {
        throw new Error(`Property ${prop} must be at least ${propSchema.minimum}`);
      }
      if (propSchema.maximum !== undefined && propValue > propSchema.maximum) {
        throw new Error(`Property ${prop} must be at most ${propSchema.maximum}`);
      }
    }
    
    // String pattern validation
    if (propSchema.type === 'string' && propSchema.pattern) {
      const regex = new RegExp(propSchema.pattern);
      if (!regex.test(propValue)) {
        throw new Error(`Property ${prop} does not match pattern ${propSchema.pattern}`);
      }
    }
    
    // Nested object validation
    if (propSchema.type === 'object' && propSchema.properties) {
      const nestedSchema = {
        properties: propSchema.properties,
        required: propSchema.required
      };
      validateValue(propValue, nestedSchema);
    }
    
    // Array item validation
    if (propSchema.type === 'array' && propSchema.items && Array.isArray(propValue)) {
      for (const item of propValue) {
        if (propSchema.items.type === 'object') {
          const itemSchema = {
            properties: propSchema.items.properties || {},
            required: propSchema.items.required
          };
          validateValue(item, itemSchema);
        }
      }
    }
  }
  
  return true;
}

export class Config {
  private values: Record<string, any> = {};
  private options: ConfigOptions;
  private logger = createLogger({ context: 'Config', level: LogLevel.NONE });
  
  constructor(options: ConfigOptions = {}) {
    this.options = options;
    
    // Initialize with defaults
    if (options.defaults) {
      this.values = { ...options.defaults };
    }
    
    // Load from environment variables if mappings are provided
    if (options.envMappings) {
      for (const [key, envName] of Object.entries(options.envMappings)) {
        const fullEnvName = options.envPrefix ? `${options.envPrefix}${envName}` : envName;
        const envValue = process.env[fullEnvName];
        
        if (envValue !== undefined) {
          // Auto-detect type based on defaults if available
          let type = options.types?.[key];
          if (!type && options.defaults && key in options.defaults) {
            const defaultValue = options.defaults[key];
            if (typeof defaultValue === 'number') {
              type = Number.isInteger(defaultValue) ? 'int' : 'float';
            } else if (typeof defaultValue === 'boolean') {
              type = 'boolean';
            }
          }
          
          // Convert value based on detected or specified type
          const value = type ? convertValue(envValue, type) : envValue;
          
          // Set the value
          setNestedProperty(this.values, key, value);
        }
      }
    }
  }
  
  /**
   * Get a configuration value
   */
  public get<T = any>(key: string): T {
    return getNestedProperty(this.values, key);
  }
  
  /**
   * Set a configuration value
   */
  public set<T = any>(key: string, value: T): void {
    // Validate against schema if provided
    const schema = this.getSchemaForKey(key);
    if (schema) {
      validateValue(value, schema);
    }
    
    // Set the value
    setNestedProperty(this.values, key, value);
  }
  
  /**
   * Check if a configuration key exists
   */
  public has(key: string): boolean {
    return getNestedProperty(this.values, key) !== undefined;
  }
  
  /**
   * Get all configuration values
   */
  public getAll(): Record<string, any> {
    return { ...this.values };
  }
  
  /**
   * Load configuration from a file
   */
  public loadFromFile(filePath: string): void {
    try {
      // Use dynamic import to avoid dependency on fs
      const fs = require('fs');
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);
      
      // Merge with existing values
      this.values = { ...this.values, ...data };
    } catch (error) {
      this.logger.error(`Failed to load config from file: ${error.message}`, error);
      throw new Error(`Failed to load config from file: ${error.message}`);
    }
  }
  
  /**
   * Find the schema for a given key
   */
  private getSchemaForKey(key: string): Schema | undefined {
    if (!this.options.schemas) {
      return undefined;
    }
    
    // Exact match
    if (this.options.schemas[key]) {
      return this.options.schemas[key];
    }
    
    // Parent key match for nested properties
    const parentKey = key.split('.')[0];
    return this.options.schemas[parentKey];
  }
}

/**
 * Create a new config instance
 */
export function createConfig(options: ConfigOptions = {}): Config {
  return new Config(options);
}

// Create a default config for application-wide use
export const defaultConfig = createConfig();