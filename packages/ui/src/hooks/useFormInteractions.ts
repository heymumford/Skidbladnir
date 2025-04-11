/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { useState, useCallback } from 'react';

export interface FormValidationErrors {
  [key: string]: string;
}

export interface FormInteractionOptions<T> {
  initialValues: T;
  validate?: (values: T) => FormValidationErrors;
  onSubmit?: (values: T) => Promise<void> | void;
}

/**
 * Custom hook for handling form interactions including validation and submission
 * 
 * @param options Configuration options
 * @returns Form state and handlers
 */
export function useFormInteractions<T extends Record<string, any>>(
  options: FormInteractionOptions<T>
) {
  const { initialValues, validate, onSubmit } = options;
  
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FormValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  // Handle text/select input change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value, checked, type } = e.target as HTMLInputElement;
    
    if (!name) return;
    
    // Handle different input types accordingly
    const newValue = type === 'checkbox' ? checked : value;
    
    setValues(prev => ({
      ...prev,
      [name]: newValue
    }));
    
    // Mark field as touched
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
    
    // Clear error when field is changed if we have validation
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  }, [errors]);
  
  // Handle blur event - mark field as touched
  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    
    if (!name) return;
    
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
    
    // Validate single field on blur if validate function is provided
    if (validate) {
      const validationErrors = validate(values);
      
      if (validationErrors[name]) {
        setErrors(prev => ({
          ...prev,
          [name]: validationErrors[name]
        }));
      }
    }
  }, [validate, values]);
  
  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched
    const allTouched = Object.keys(values).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {} as Record<string, boolean>);
    
    setTouched(allTouched);
    
    // Validate all fields if validate function is provided
    let hasErrors = false;
    
    if (validate) {
      const validationErrors = validate(values);
      setErrors(validationErrors);
      hasErrors = Object.keys(validationErrors).length > 0;
    }
    
    if (!hasErrors && onSubmit) {
      setIsSubmitting(true);
      
      try {
        await onSubmit(values);
        setIsSubmitted(true);
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [values, validate, onSubmit]);
  
  // Reset form to initial values
  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitted(false);
  }, [initialValues]);
  
  // Set a single field value programmatically
  const setFieldValue = useCallback((name: string, value: any) => {
    setValues(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);
  
  // Set a single field error programmatically
  const setFieldError = useCallback((name: string, error: string) => {
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  }, []);
  
  return {
    values,
    errors,
    touched,
    isSubmitting,
    isSubmitted,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    setFieldValue,
    setFieldError
  };
}