/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { ConfigurationService } from './ConfigurationService';
import { LoggingService } from './LoggingService';

/**
 * Fallback strategies available in the system
 */
export enum FallbackStrategy {
  SMALLER_MODEL,   // Use a smaller, less capable model
  CACHED_RESPONSE, // Use cached responses when available
  SIMPLIFIED_PROMPT, // Use simplified prompt requiring less computation
  TEMPLATE_BASED,  // Use template-based generation instead of LLM
  RULE_BASED       // Use rule-based fallback logic
}

/**
 * Provides fallback capabilities for LLM service
 */
export class FallbackService {
  private static instance: FallbackService;
  private useFallbackModel: boolean;
  private fallbackModelName: string | undefined;
  private logger = LoggingService.getInstance().getLogger('FallbackService');

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    const config = ConfigurationService.getInstance().getResilienceConfig();
    this.useFallbackModel = config.useFallbackModel;
    this.fallbackModelName = config.fallbackModelName;
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): FallbackService {
    if (!FallbackService.instance) {
      FallbackService.instance = new FallbackService();
    }
    return FallbackService.instance;
  }

  /**
   * Check if fallback is enabled
   */
  public isFallbackEnabled(): boolean {
    return this.useFallbackModel && !!this.fallbackModelName;
  }

  /**
   * Get fallback model name if configured
   */
  public getFallbackModelName(): string | undefined {
    return this.fallbackModelName;
  }

  /**
   * Determine best fallback strategy based on error
   * 
   * @param error Error that triggered fallback
   * @returns Appropriate fallback strategy
   */
  public determineFallbackStrategy(error: Error): FallbackStrategy {
    // Check for rate limiting or quota errors
    if (error.message.includes('rate limit') || 
        error.message.includes('quota exceeded') ||
        error.message.includes('too many requests')) {
      this.logger.info('Using smaller model fallback due to rate limiting');
      return FallbackStrategy.SMALLER_MODEL;
    }
    
    // Check for timeout errors
    if (error.message.includes('timeout') || error.message.includes('timed out')) {
      this.logger.info('Using simplified prompt fallback due to timeout');
      return FallbackStrategy.SIMPLIFIED_PROMPT;
    }
    
    // Default fallback strategy
    this.logger.info('Using template-based fallback as default strategy');
    return FallbackStrategy.TEMPLATE_BASED;
  }

  /**
   * Create a simplified prompt for fallback
   * 
   * @param originalPrompt Original complex prompt
   * @returns Simplified version of the prompt
   */
  public createSimplifiedPrompt(originalPrompt: string): string {
    // Split prompt into sections
    const sections = originalPrompt.split(/\n\s*\n/);
    
    // If the prompt is short enough already, return as is
    if (sections.length <= 2 || originalPrompt.length < 500) {
      return originalPrompt;
    }
    
    // Keep introduction and main instruction, simplify the rest
    const intro = sections[0];
    
    // Find the main instruction section
    const mainInstruction = sections.find(s => 
      s.includes('Your task is') || 
      s.includes('I want you to') ||
      s.includes('Please') && (s.includes('create') || s.includes('generate'))
    ) || sections[1];
    
    // Extract key requirements if they exist
    const requirementsSection = sections.find(s => 
      s.includes('requirements') || 
      s.includes('constraints') || 
      s.includes('must include')
    );
    
    const requirements = requirementsSection ? 
      'Requirements: ' + requirementsSection.replace(/^.*(requirements|constraints|must include)/i, '') : 
      '';
    
    // Combine important parts into simplified prompt
    return `${intro}\n\n${mainInstruction}\n\n${requirements}`.trim();
  }

  /**
   * Generate a template-based response for when LLM fails completely
   * 
   * @param templateName Template to use
   * @param variables Variables to fill in the template
   * @returns Generated fallback response
   */
  public generateTemplateResponse(templateName: string, variables: Record<string, string>): string {
    const templates: Record<string, string> = {
      'test-case': `Test Case: ${variables.name || 'Untitled Test Case'}

Description: ${variables.description || 'Basic test for feature functionality'}

Pre-conditions: 
- System is running
- User is logged in

Steps:
1. Navigate to ${variables.feature || 'the feature'} screen
2. Verify all UI elements are visible
3. Test basic functionality
4. Verify expected outcomes

Expected Results:
- Feature works as expected
- No errors are shown
- Performance is acceptable`,

      'error-message': `We apologize, but we couldn't process your request at this time due to ${variables.reason || 'system limitations'}. 
      
Please try again later or consider ${variables.suggestion || 'simplifying your request'}.`,

      'default': 'Unable to generate response. Please try again later.'
    };
    
    const template = templates[templateName] || templates.default;
    
    this.logger.info(`Generated template response using ${templateName} template`);
    return template;
  }
}