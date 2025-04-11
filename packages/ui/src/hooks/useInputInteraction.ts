/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { useState, useCallback } from 'react';

export type ValidatorFn = (value: string) => string | undefined;

export interface InputInteractionOptions {
  initialValue?: string;
  validators?: ValidatorFn[];
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  trimValue?: boolean;
}

/**
 * Custom hook for handling input interactions with validation
 * 
 * @param options Configuration options
 * @returns Input state and handlers
 */
export function useInputInteraction(options: InputInteractionOptions = {}) {
  const {
    initialValue = '',
    validators = [],
    validateOnChange = false,
    validateOnBlur = true,
    trimValue = true
  } = options;
  
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | undefined>(undefined);
  const [touched, setTouched] = useState(false);
  
  // Validate the current value
  const validate = useCallback((valueToValidate: string): string | undefined => {
    if (!validators || validators.length === 0) return undefined;
    
    // Run all validators until one fails
    for (const validator of validators) {
      const error = validator(valueToValidate);
      if (error) {
        return error;
      }
    }
    
    return undefined;
  }, [validators]);
  
  // Handle input change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = trimValue ? e.target.value.trim() : e.target.value;
    setValue(inputValue);
    
    // Validate on change if requested
    if (validateOnChange) {
      const validationError = validate(inputValue);
      setError(validationError);
    } else if (error) {
      // Clear error if the input was previously invalid
      setError(undefined);
    }
  }, [error, validate, validateOnChange, trimValue]);
  
  // Handle input blur
  const handleBlur = useCallback(() => {
    setTouched(true);
    
    // Validate on blur if requested
    if (validateOnBlur) {
      const validationError = validate(value);
      setError(validationError);
    }
  }, [validate, validateOnBlur, value]);
  
  // Reset input state
  const reset = useCallback(() => {
    setValue(initialValue);
    setError(undefined);
    setTouched(false);
  }, [initialValue]);
  
  // Set input value programmatically
  const setInputValue = useCallback((newValue: string, validateInput = false) => {
    const processedValue = trimValue ? newValue.trim() : newValue;
    setValue(processedValue);
    
    if (validateInput) {
      const validationError = validate(processedValue);
      setError(validationError);
    }
  }, [validate, trimValue]);
  
  return {
    value,
    error,
    touched,
    handleChange,
    handleBlur,
    reset,
    setInputValue,
    isValid: !error,
    validate: () => {
      const validationError = validate(value);
      setError(validationError);
      return !validationError;
    }
  };
}