/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { TransformationType } from '../components/Transformation/FieldTransformation';

/**
 * A service for applying data transformations between fields.
 * This engine applies various transformation functions like concatenation,
 * substring, replacement, value mapping, etc.
 */
export class TransformationEngine {
  /**
   * Apply a transformation to a source value.
   * 
   * @param sourceValue The source value to transform
   * @param transformationType The type of transformation to apply
   * @param transformationParams Parameters for the transformation
   * @param sourceObject Optional full source object for multi-field transformations
   * @returns The transformed value
   */
  applyTransformation(
    sourceValue: any,
    transformationType: TransformationType,
    transformationParams: Record<string, any>,
    sourceObject?: Record<string, any>
  ): any {
    try {
      switch (transformationType) {
        case TransformationType.NONE:
          return sourceValue;
          
        case TransformationType.CONCAT:
          return this.applyConcatenation(sourceValue, transformationParams, sourceObject);
          
        case TransformationType.SUBSTRING:
          return this.applySubstring(sourceValue, transformationParams);
          
        case TransformationType.REPLACE:
          return this.applyReplace(sourceValue, transformationParams);
          
        case TransformationType.MAP_VALUES:
          return this.applyValueMapping(sourceValue, transformationParams);
          
        case TransformationType.SPLIT:
          return this.applySplit(sourceValue, transformationParams);
          
        case TransformationType.JOIN:
          return this.applyJoin(sourceValue, transformationParams, sourceObject);
          
        case TransformationType.UPPERCASE:
          return this.applyUppercase(sourceValue);
          
        case TransformationType.LOWERCASE:
          return this.applyLowercase(sourceValue);
          
        case TransformationType.CUSTOM:
          return this.applyCustomTransformation(sourceValue, transformationParams);
          
        default:
          return sourceValue;
      }
    } catch (error) {
      console.error('Error applying transformation:', error);
      return sourceValue;
    }
  }
  
  /**
   * Apply concatenation transformation.
   * 
   * @param sourceValue The source value
   * @param params Transformation parameters
   * @param sourceObject Full source object for accessing other fields
   * @returns The concatenated value
   */
  private applyConcatenation(
    sourceValue: any,
    params: Record<string, any>,
    sourceObject?: Record<string, any>
  ): string {
    if (!sourceObject) {
      return String(sourceValue || '');
    }
    
    const separator = params.separator || '';
    const fieldIds = params.fields || [];
    const values: string[] = [];
    
    // Add values from all specified fields
    for (const fieldId of fieldIds) {
      const fieldValue = sourceObject[fieldId];
      if (fieldValue !== undefined && fieldValue !== null) {
        values.push(String(fieldValue));
      }
    }
    
    return values.join(separator);
  }
  
  /**
   * Apply substring transformation.
   * 
   * @param sourceValue The source value
   * @param params Transformation parameters
   * @returns The substring value
   */
  private applySubstring(sourceValue: any, params: Record<string, any>): string {
    if (sourceValue === undefined || sourceValue === null) {
      return '';
    }
    
    const strValue = String(sourceValue);
    const start = params.start || 0;
    const end = params.end !== undefined ? params.end : strValue.length;
    
    return strValue.substring(start, end);
  }
  
  /**
   * Apply replace transformation.
   * 
   * @param sourceValue The source value
   * @param params Transformation parameters
   * @returns The replaced value
   */
  private applyReplace(sourceValue: any, params: Record<string, any>): string {
    if (sourceValue === undefined || sourceValue === null) {
      return '';
    }
    
    const strValue = String(sourceValue);
    const pattern = params.pattern || '';
    const replacement = params.replacement || '';
    
    try {
      // Check if the pattern is a regular expression
      if (pattern.startsWith('/') && pattern.endsWith('/')) {
        const regexPattern = new RegExp(pattern.slice(1, -1), 'g');
        return strValue.replace(regexPattern, replacement);
      }
      
      // Otherwise, treat it as a plain string replacement
      return strValue.replace(new RegExp(this.escapeRegExp(pattern), 'g'), replacement);
    } catch (error) {
      console.error('Error applying replace transformation:', error);
      return strValue;
    }
  }
  
  /**
   * Escape special characters in a string for use in a regular expression.
   * 
   * @param string The string to escape
   * @returns The escaped string
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  /**
   * Apply value mapping transformation.
   * 
   * @param sourceValue The source value
   * @param params Transformation parameters
   * @returns The mapped value
   */
  private applyValueMapping(sourceValue: any, params: Record<string, any>): any {
    if (sourceValue === undefined || sourceValue === null) {
      return sourceValue;
    }
    
    const strValue = String(sourceValue);
    const mappings = params.mappings || {};
    
    // If the value exists in the mappings, return the mapped value
    if (strValue in mappings) {
      return mappings[strValue];
    }
    
    // Otherwise, return the original value
    return sourceValue;
  }
  
  /**
   * Apply split transformation.
   * 
   * @param sourceValue The source value
   * @param params Transformation parameters
   * @returns The split value
   */
  private applySplit(sourceValue: any, params: Record<string, any>): string {
    if (sourceValue === undefined || sourceValue === null) {
      return '';
    }
    
    const strValue = String(sourceValue);
    const separator = params.separator || ',';
    const index = params.index || 0;
    
    const parts = strValue.split(separator);
    
    // Return the part at the specified index, or an empty string if it doesn't exist
    return index < parts.length ? parts[index] : '';
  }
  
  /**
   * Apply join transformation.
   * 
   * @param sourceValue The source value (not used in this transformation)
   * @param params Transformation parameters
   * @param sourceObject Full source object for accessing other fields
   * @returns The joined value
   */
  private applyJoin(
    sourceValue: any,
    params: Record<string, any>,
    sourceObject?: Record<string, any>
  ): string {
    if (!sourceObject) {
      return String(sourceValue || '');
    }
    
    const separator = params.separator || ', ';
    const fieldIds = params.fields || [];
    const values: string[] = [];
    
    // Add values from all specified fields
    for (const fieldId of fieldIds) {
      const fieldValue = sourceObject[fieldId];
      if (fieldValue !== undefined && fieldValue !== null) {
        // Handle array values
        if (Array.isArray(fieldValue)) {
          values.push(fieldValue.join(separator));
        } else {
          values.push(String(fieldValue));
        }
      }
    }
    
    return values.join(separator);
  }
  
  /**
   * Apply uppercase transformation.
   * 
   * @param sourceValue The source value
   * @returns The uppercase value
   */
  private applyUppercase(sourceValue: any): string {
    if (sourceValue === undefined || sourceValue === null) {
      return '';
    }
    
    return String(sourceValue).toUpperCase();
  }
  
  /**
   * Apply lowercase transformation.
   * 
   * @param sourceValue The source value
   * @returns The lowercase value
   */
  private applyLowercase(sourceValue: any): string {
    if (sourceValue === undefined || sourceValue === null) {
      return '';
    }
    
    return String(sourceValue).toLowerCase();
  }
  
  /**
   * Apply custom transformation.
   * 
   * @param sourceValue The source value
   * @param params Transformation parameters
   * @returns The transformed value
   */
  private applyCustomTransformation(sourceValue: any, params: Record<string, any>): any {
    try {
      const formula = params.formula || 'return sourceValue;';
      // Evaluate the formula in a safe context
      const transformFn = new Function('sourceValue', formula);
      return transformFn(sourceValue);
    } catch (error) {
      console.error('Error applying custom transformation:', error);
      return sourceValue;
    }
  }
}

// Create and export a singleton instance
export const transformationEngine = new TransformationEngine();