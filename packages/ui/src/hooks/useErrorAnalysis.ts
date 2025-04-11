/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { useState, useEffect } from 'react';
import { ErrorDetails, RemediationSuggestion, migrationService } from '../services/MigrationService';

interface ErrorPattern {
  id: string;
  name: string;
  description: string;
  frequency: number;
  affectedOperations: string[];
  firstOccurrence: Date;
  lastOccurrence: Date;
  status: 'active' | 'resolved' | 'investigating';
}

interface ErrorAnalysisResult {
  patterns: ErrorPattern[];
  mostCommonTypes: Array<{ type: string; count: number }>;
  mostAffectedComponents: Array<{ component: string; count: number }>;
  resolutionEffectiveness: Record<string, number>; // remediation id -> success rate percentage
  averageResolutionTime: number; // in minutes
  totalRootCauses: Record<string, number>; // root cause -> count
  remediationMapping: Record<string, string[]>; // error type -> remediation ids
}

/**
 * Custom hook for analyzing error patterns and generating remediation suggestions
 * 
 * @param errors List of error details to analyze
 * @param remediations List of available remediation suggestions
 */
export const useErrorAnalysis = (
  errors: ErrorDetails[] = [],
  remediations: RemediationSuggestion[] = []
) => {
  const [loading, setLoading] = useState(false);
  const [errorAnalysis, setErrorAnalysis] = useState<ErrorAnalysisResult | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<RemediationSuggestion[]>([]);
  
  // Analyze error patterns
  useEffect(() => {
    if (errors.length === 0) {
      setErrorAnalysis(null);
      return;
    }
    
    setLoading(true);
    
    try {
      // Group errors by type
      const byType: Record<string, ErrorDetails[]> = {};
      errors.forEach(error => {
        byType[error.errorType] = byType[error.errorType] || [];
        byType[error.errorType].push(error);
      });
      
      // Group errors by component
      const byComponent: Record<string, ErrorDetails[]> = {};
      errors.forEach(error => {
        byComponent[error.component] = byComponent[error.component] || [];
        byComponent[error.component].push(error);
      });
      
      // Count error types
      const mostCommonTypes = Object.entries(byType)
        .map(([type, errs]) => ({ type, count: errs.length }))
        .sort((a, b) => b.count - a.count);
      
      // Count affected components
      const mostAffectedComponents = Object.entries(byComponent)
        .map(([component, errs]) => ({ component, count: errs.length }))
        .sort((a, b) => b.count - a.count);
      
      // Extract unique operations
      const operationsSet = new Set<string>();
      errors.forEach(error => operationsSet.add(error.operation));
      const operations = Array.from(operationsSet);
      
      // Generate mock error patterns (simplified)
      const patterns: ErrorPattern[] = [];
      Object.entries(byType).forEach(([errorType, errs]) => {
        if (errs.length < 2) return;
        
        // Find operations affected by this error type
        const opSet = new Set<string>();
        errs.forEach(err => opSet.add(err.operation));
        
        // Calculate first and last occurrence
        const timestamps = errs.map(err => new Date(err.timestamp));
        const firstOccurrence = new Date(Math.min(...timestamps.map(d => d.getTime())));
        const lastOccurrence = new Date(Math.max(...timestamps.map(d => d.getTime())));
        
        // Generate a pattern
        patterns.push({
          id: `pattern-${errorType}`,
          name: `${errorType.charAt(0).toUpperCase() + errorType.slice(1)} Errors`,
          description: `Pattern of ${errorType} errors during ${Array.from(opSet).join(', ')} operations`,
          frequency: errs.length,
          affectedOperations: Array.from(opSet),
          firstOccurrence,
          lastOccurrence,
          status: 'active'
        });
      });
      
      // Mock remediation effectiveness (in a real app, this would be calculated from history)
      const resolutionEffectiveness: Record<string, number> = {};
      remediations.forEach(remediation => {
        resolutionEffectiveness[remediation.id] = 60 + Math.floor(Math.random() * 40); // 60-100%
      });
      
      // Mock average resolution time
      const averageResolutionTime = 15 + Math.floor(Math.random() * 45); // 15-60 minutes
      
      // Mock root causes
      const rootCauses = [
        'API Rate Limiting',
        'Network Timeout',
        'Invalid Authentication',
        'Schema Validation Failure',
        'Resource Conflict',
        'Missing Permissions'
      ];
      
      const totalRootCauses: Record<string, number> = {};
      rootCauses.forEach(cause => {
        totalRootCauses[cause] = Math.floor(Math.random() * errors.length / 3) + 1;
      });
      
      // Map remediations to error types
      const remediationMapping: Record<string, string[]> = {};
      remediations.forEach(remediation => {
        remediationMapping[remediation.errorType] = remediationMapping[remediation.errorType] || [];
        remediationMapping[remediation.errorType].push(remediation.id);
      });
      
      // Set the analysis result
      setErrorAnalysis({
        patterns,
        mostCommonTypes,
        mostAffectedComponents,
        resolutionEffectiveness,
        averageResolutionTime,
        totalRootCauses,
        remediationMapping
      });
      
      // Generate AI remediation suggestions
      generateAISuggestions(byType);
    } catch (error) {
      console.error('Error analyzing errors:', error);
    } finally {
      setLoading(false);
    }
  }, [errors, remediations]);
  
  // Generate AI remediation suggestions based on error patterns
  const generateAISuggestions = (byType: Record<string, ErrorDetails[]>) => {
    const suggestions: RemediationSuggestion[] = [];
    
    // For demo purposes, generate some more sophisticated suggestions
    // that would normally come from an AI model
    
    // Validation errors with multiple field issues
    const validationErrors = byType['validation'] || [];
    if (validationErrors.length > 1) {
      const fieldsWithIssues = new Set<string>();
      validationErrors.forEach(error => {
        if (error.details?.fields) {
          error.details.fields.forEach((field: string) => fieldsWithIssues.add(field));
        }
      });
      
      if (fieldsWithIssues.size > 0) {
        suggestions.push({
          id: `ai-remedy-validation`,
          errorType: 'validation',
          title: 'Bulk Field Mapping Correction',
          description: `Multiple validation errors detected with fields: ${Array.from(fieldsWithIssues).join(', ')}. An automated field mapping correction can fix these issues systematically.`,
          steps: [
            'Review all field mappings in the affected test cases',
            'Apply standardized field mapping rules for consistency',
            'Verify field transformations with preview functionality',
            'Perform batch update of all affected fields'
          ],
          automated: true,
          actionName: 'Apply Bulk Correction'
        });
      }
    }
    
    // Network errors with rate limiting pattern
    const networkErrors = byType['network'] || [];
    if (networkErrors.length > 2) {
      // Check if there are rate limiting issues
      const hasRateLimiting = networkErrors.some(error => 
        error.message.toLowerCase().includes('rate limit') || 
        error.details?.statusCode === 429
      );
      
      if (hasRateLimiting) {
        suggestions.push({
          id: `ai-remedy-ratelimit`,
          errorType: 'network',
          title: 'Adaptive Rate Limit Management',
          description: 'Multiple rate limit errors detected. AI analysis suggests implementing adaptive rate limiting with exponential backoff.',
          steps: [
            'Analyze current API usage patterns',
            'Implement adaptive concurrency based on provider response times',
            'Configure exponential backoff for rate limit responses',
            'Apply progressive throttling to optimize throughput'
          ],
          automated: true,
          actionName: 'Configure Adaptive Limits'
        });
      }
    }
    
    // System errors with resource pattern
    const systemErrors = byType['system'] || [];
    if (systemErrors.length > 0) {
      const resourceIssues = systemErrors.some(error => 
        error.message.toLowerCase().includes('memory') || 
        error.message.toLowerCase().includes('resources') ||
        error.details?.resourceUsage?.memory > 90
      );
      
      if (resourceIssues) {
        suggestions.push({
          id: `ai-remedy-resources`,
          errorType: 'system',
          title: 'Optimized Resource Allocation',
          description: 'System resource constraints detected. AI analysis suggests optimizing memory usage and implementing incremental processing.',
          steps: [
            'Analyze memory consumption patterns',
            'Implement batch size adjustment based on available resources',
            'Enable incremental file processing to reduce memory footprint',
            'Configure resource monitoring and auto-scaling thresholds'
          ],
          automated: true,
          actionName: 'Optimize Resources'
        });
      }
    }
    
    // Authentication errors with expiration pattern
    const authErrors = byType['auth'] || [];
    if (authErrors.length > 0) {
      const tokenExpirations = authErrors.some(error => 
        error.message.toLowerCase().includes('expired') || 
        error.message.toLowerCase().includes('token')
      );
      
      if (tokenExpirations) {
        suggestions.push({
          id: `ai-remedy-auth-advanced`,
          errorType: 'auth',
          title: 'Proactive Token Management',
          description: 'Pattern of authentication token expirations detected. AI analysis suggests implementing proactive token refresh strategy.',
          steps: [
            'Monitor token expiration time and refresh proactively',
            'Implement automatic retry with fresh tokens for failed operations',
            'Configure parallel token management to prevent operation blocking',
            'Set up token health monitoring with alerts'
          ],
          automated: true,
          actionName: 'Enable Proactive Refresh'
        });
      }
    }
    
    setAiSuggestions(suggestions);
  };
  
  // Get suggested remediations for a specific error
  const getSuggestedRemediations = (error: ErrorDetails): RemediationSuggestion[] => {
    // Start with standard remediations for this error type
    const standardRemediations = remediations.filter(r => r.errorType === error.errorType);
    
    // Add any AI-generated suggestions for this error type
    const aiSpecificSuggestions = aiSuggestions.filter(r => r.errorType === error.errorType);
    
    return [...standardRemediations, ...aiSpecificSuggestions];
  };
  
  // Get best remediation for a specific error (highest success rate)
  const getBestRemediation = (error: ErrorDetails): RemediationSuggestion | null => {
    if (!errorAnalysis) return null;
    
    const suggestions = getSuggestedRemediations(error);
    if (suggestions.length === 0) return null;
    
    // Sort by effectiveness and return the best one
    return suggestions.slice().sort((a, b) => {
      const effectivenessA = errorAnalysis.resolutionEffectiveness[a.id] || 0;
      const effectivenessB = errorAnalysis.resolutionEffectiveness[b.id] || 0;
      return effectivenessB - effectivenessA;
    })[0];
  };
  
  // Get related errors for a specific error (similar pattern)
  const getRelatedErrors = (error: ErrorDetails): ErrorDetails[] => {
    return errors.filter(e => 
      e.errorId !== error.errorId && 
      (e.errorType === error.errorType || e.component === error.component)
    );
  };
  
  return {
    loading,
    errorAnalysis,
    aiSuggestions,
    getSuggestedRemediations,
    getBestRemediation,
    getRelatedErrors
  };
};