/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Field definition model for custom fields and system fields
 */
export interface FieldDefinition {
  /**
   * Field ID or key
   */
  id: string;
  
  /**
   * Field name
   */
  name: string;
  
  /**
   * Field data type
   */
  type: FieldType;
  
  /**
   * Whether the field is required
   */
  required: boolean;
  
  /**
   * Field description
   */
  description?: string;
  
  /**
   * Default value
   */
  defaultValue?: any;
  
  /**
   * Field options for enumerated types
   */
  options?: FieldOption[];
  
  /**
   * Whether this is a system field
   */
  system?: boolean;
  
  /**
   * Entity types this field applies to
   */
  appliesTo?: string[];
}

/**
 * Available field types
 */
export enum FieldType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  DATE = 'DATE',
  DATETIME = 'DATETIME',
  TEXT = 'TEXT',
  SELECT = 'SELECT',
  MULTISELECT = 'MULTISELECT',
  USER = 'USER',
  MULTIUSER = 'MULTIUSER',
  ATTACHMENT = 'ATTACHMENT',
  URL = 'URL',
  CUSTOM = 'CUSTOM'
}

/**
 * Field option for enumerated types
 */
export interface FieldOption {
  /**
   * Option ID
   */
  id: string;
  
  /**
   * Display value
   */
  value: string;
  
  /**
   * Whether this is the default option
   */
  default?: boolean;
}