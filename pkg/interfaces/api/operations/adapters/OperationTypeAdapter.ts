/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { 
  OperationType, 
  OperationDefinition as ApiOperationDefinition 
} from '../types';

import { 
  OperationDefinition as ProviderOperationDefinition 
} from '../../../../../packages/common/src/interfaces/provider';

/**
 * Adapter class to convert between provider operation definition and API operation definition types
 * This solves the type mismatch between string-based and enum-based operation types
 */
export class OperationTypeAdapter {
  /**
   * Converts a provider operation definition to an API operation definition
   * 
   * @param providerDefinition Provider operation definition with string type
   * @returns API operation definition with enum type
   */
  static toApiOperationDefinition(
    providerDefinition: ProviderOperationDefinition
  ): ApiOperationDefinition {
    // Convert string type to enum type
    const operationType = this.stringToOperationType(providerDefinition.type);
    
    // Convert string dependencies to enum dependencies
    const dependencies = providerDefinition.dependencies.map(
      dep => this.stringToOperationType(dep)
    );
    
    return {
      type: operationType,
      dependencies,
      required: providerDefinition.required,
      description: providerDefinition.description,
      requiredParams: providerDefinition.requiredParams,
      estimatedTimeCost: providerDefinition.estimatedTimeCost
    };
  }
  
  /**
   * Converts an API operation definition to a provider operation definition
   * 
   * @param apiDefinition API operation definition with enum type
   * @returns Provider operation definition with string type
   */
  static toProviderOperationDefinition(
    apiDefinition: ApiOperationDefinition
  ): ProviderOperationDefinition {
    // Convert enum type to string type
    const type = apiDefinition.type.toString();
    
    // Convert enum dependencies to string dependencies
    const dependencies = apiDefinition.dependencies.map(
      dep => dep.toString()
    );
    
    return {
      type,
      dependencies,
      required: apiDefinition.required,
      description: apiDefinition.description,
      requiredParams: apiDefinition.requiredParams,
      estimatedTimeCost: apiDefinition.estimatedTimeCost
    };
  }
  
  /**
   * Converts an array of provider operation definitions to API operation definitions
   * 
   * @param providerDefinitions Array of provider operation definitions
   * @returns Array of API operation definitions
   */
  static toApiOperationDefinitions(
    providerDefinitions: ProviderOperationDefinition[]
  ): ApiOperationDefinition[] {
    return providerDefinitions.map(
      def => this.toApiOperationDefinition(def)
    );
  }
  
  /**
   * Converts an array of API operation definitions to provider operation definitions
   * 
   * @param apiDefinitions Array of API operation definitions
   * @returns Array of provider operation definitions
   */
  static toProviderOperationDefinitions(
    apiDefinitions: ApiOperationDefinition[]
  ): ProviderOperationDefinition[] {
    return apiDefinitions.map(
      def => this.toProviderOperationDefinition(def)
    );
  }
  
  /**
   * Converts a string to an OperationType enum value
   * 
   * @param operationTypeString String representation of operation type
   * @returns OperationType enum value
   */
  static stringToOperationType(operationTypeString: string): OperationType {
    // Check if the string is a valid OperationType
    if (Object.values(OperationType).includes(operationTypeString as OperationType)) {
      return operationTypeString as OperationType;
    }
    
    // Handle string formats that might not exactly match the enum (e.g., with spaces or different casing)
    const normalized = operationTypeString.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    
    // Find the matching enum value
    for (const [key, value] of Object.entries(OperationType)) {
      if (value.toLowerCase() === normalized) {
        return value;
      }
    }
    
    // If no match found, use a fallback approach
    if (operationTypeString.includes('auth')) {
      return OperationType.AUTHENTICATE;
    } else if (operationTypeString.includes('project') && operationTypeString.includes('get')) {
      return operationTypeString.includes('projects') ? OperationType.GET_PROJECTS : OperationType.GET_PROJECT;
    } else if (operationTypeString.includes('test_case') && operationTypeString.includes('get')) {
      return operationTypeString.includes('cases') ? OperationType.GET_TEST_CASES : OperationType.GET_TEST_CASE;
    } else if (operationTypeString.includes('test_case') && operationTypeString.includes('create')) {
      return OperationType.CREATE_TEST_CASE;
    } else if (operationTypeString.includes('attachment') && operationTypeString.includes('get')) {
      return operationTypeString.includes('attachments') ? OperationType.GET_ATTACHMENTS : OperationType.GET_ATTACHMENT;
    } else if (operationTypeString.includes('attachment') && operationTypeString.includes('upload')) {
      return OperationType.UPLOAD_ATTACHMENT;
    }
    
    // Default fallback
    console.warn(`Unrecognized operation type: ${operationTypeString}, falling back to AUTHENTICATE`);
    return OperationType.AUTHENTICATE;
  }
}