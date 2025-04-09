/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Date manipulation utilities
 * 
 * This module provides consistent date handling across the application.
 * It includes parsing, formatting, comparison, and duration calculations.
 */

/**
 * Standard date formats used in the application
 */
export enum DateFormat {
  ISO = 'iso',                         // 2025-04-20T15:30:45.123Z
  ISO_DATE = 'iso-date',               // 2025-04-20
  ISO_TIME = 'iso-time',               // 15:30:45
  US_DATE = 'us-date',                 // 04/20/2025
  EU_DATE = 'eu-date',                 // 20/04/2025
  HUMAN_READABLE = 'human-readable',   // April 20, 2025 3:30 PM
  TIMESTAMP = 'timestamp'              // Unix timestamp in milliseconds
}

/**
 * Duration unit used for calculations
 */
export enum DurationUnit {
  MILLISECONDS = 'milliseconds',
  SECONDS = 'seconds',
  MINUTES = 'minutes',
  HOURS = 'hours',
  DAYS = 'days',
  WEEKS = 'weeks',
  MONTHS = 'months',
  YEARS = 'years'
}

/**
 * Options for duration formatting
 */
export interface DurationFormatOptions {
  /**
   * Maximum number of units to include
   */
  maxUnits?: number;
  
  /**
   * Whether to include zero values
   */
  includeZero?: boolean;
  
  /**
   * Format of the output
   */
  format?: 'short' | 'long';
}

/**
 * Format a date according to the specified format
 */
export function formatDate(date: Date | string | number, format: DateFormat = DateFormat.ISO): string {
  const dateObj = parseDate(date);
  
  if (!dateObj) {
    return '';
  }
  
  switch (format) {
    case DateFormat.ISO:
      return dateObj.toISOString();
      
    case DateFormat.ISO_DATE:
      return dateObj.toISOString().split('T')[0];
      
    case DateFormat.ISO_TIME:
      return dateObj.toISOString().split('T')[1].split('.')[0];
      
    case DateFormat.US_DATE: {
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const year = dateObj.getFullYear();
      return `${month}/${day}/${year}`;
    }
      
    case DateFormat.EU_DATE: {
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const year = dateObj.getFullYear();
      return `${day}/${month}/${year}`;
    }
      
    case DateFormat.HUMAN_READABLE: {
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      };
      return new Intl.DateTimeFormat('en-US', options).format(dateObj);
    }
      
    case DateFormat.TIMESTAMP:
      return dateObj.getTime().toString();
      
    default:
      return dateObj.toISOString();
  }
}

/**
 * Parse a date from various formats
 */
export function parseDate(input: Date | string | number): Date | null {
  if (input instanceof Date) {
    return new Date(input);
  }
  
  if (typeof input === 'number') {
    const date = new Date(input);
    return isNaN(date.getTime()) ? null : date;
  }
  
  if (typeof input === 'string') {
    // Try ISO format first
    const isoDate = new Date(input);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }
    
    // Try US date format (MM/DD/YYYY)
    const usMatch = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (usMatch) {
      const [, month, day, year] = usMatch;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return isNaN(date.getTime()) ? null : date;
    }
    
    // Try EU date format (DD/MM/YYYY)
    const euMatch = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (euMatch) {
      const [, day, month, year] = euMatch;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return isNaN(date.getTime()) ? null : date;
    }
  }
  
  return null;
}

/**
 * Check if a date is valid
 */
export function isValidDate(date: Date | string | number): boolean {
  if (date instanceof Date) {
    return !isNaN(date.getTime());
  }
  
  // Special case for strings that aren't real dates
  if (typeof date === 'string' && !/^\d{4}-\d{2}-\d{2}|^\d{1,2}\/\d{1,2}\/\d{4}/.test(date)) {
    return false;
  }
  
  const parsed = parseDate(date);
  return parsed !== null && !isNaN(parsed.getTime());
}

/**
 * Compare two dates
 * @returns negative if a < b, 0 if a = b, positive if a > b
 */
export function compareDates(a: Date | string | number, b: Date | string | number): number {
  const dateA = parseDate(a);
  const dateB = parseDate(b);
  
  if (!dateA || !dateB) {
    throw new Error('Invalid date provided for comparison');
  }
  
  return dateA.getTime() - dateB.getTime();
}

/**
 * Check if a date is before another date
 */
export function isBefore(a: Date | string | number, b: Date | string | number): boolean {
  return compareDates(a, b) < 0;
}

/**
 * Check if a date is after another date
 */
export function isAfter(a: Date | string | number, b: Date | string | number): boolean {
  return compareDates(a, b) > 0;
}

/**
 * Check if a date is between two other dates (inclusive)
 */
export function isBetween(
  date: Date | string | number,
  start: Date | string | number,
  end: Date | string | number
): boolean {
  const time = parseDate(date)?.getTime();
  const startTime = parseDate(start)?.getTime();
  const endTime = parseDate(end)?.getTime();
  
  if (!time || !startTime || !endTime) {
    throw new Error('Invalid date provided');
  }
  
  return time >= startTime && time <= endTime;
}

/**
 * Add a duration to a date
 */
export function addDuration(
  date: Date | string | number,
  amount: number,
  unit: DurationUnit
): Date {
  const dateObj = parseDate(date);
  
  if (!dateObj) {
    throw new Error('Invalid date provided');
  }
  
  const result = new Date(dateObj);
  
  switch (unit) {
    case DurationUnit.MILLISECONDS:
      result.setTime(result.getTime() + amount);
      break;
    case DurationUnit.SECONDS:
      result.setTime(result.getTime() + amount * 1000);
      break;
    case DurationUnit.MINUTES:
      result.setTime(result.getTime() + amount * 60 * 1000);
      break;
    case DurationUnit.HOURS:
      result.setTime(result.getTime() + amount * 60 * 60 * 1000);
      break;
    case DurationUnit.DAYS:
      result.setDate(result.getDate() + amount);
      break;
    case DurationUnit.WEEKS:
      result.setDate(result.getDate() + amount * 7);
      break;
    case DurationUnit.MONTHS:
      result.setMonth(result.getMonth() + amount);
      break;
    case DurationUnit.YEARS:
      result.setFullYear(result.getFullYear() + amount);
      break;
    default:
      throw new Error(`Unknown duration unit: ${unit}`);
  }
  
  return result;
}

/**
 * Calculate the difference between two dates in the specified unit
 */
export function getDuration(
  start: Date | string | number,
  end: Date | string | number,
  unit: DurationUnit
): number {
  const startDate = parseDate(start);
  const endDate = parseDate(end);
  
  if (!startDate || !endDate) {
    throw new Error('Invalid date provided');
  }
  
  const diffMs = endDate.getTime() - startDate.getTime();
  
  switch (unit) {
    case DurationUnit.MILLISECONDS:
      return diffMs;
    case DurationUnit.SECONDS:
      return diffMs / 1000;
    case DurationUnit.MINUTES:
      return diffMs / (60 * 1000);
    case DurationUnit.HOURS:
      return diffMs / (60 * 60 * 1000);
    case DurationUnit.DAYS:
      return diffMs / (24 * 60 * 60 * 1000);
    case DurationUnit.WEEKS:
      return diffMs / (7 * 24 * 60 * 60 * 1000);
    case DurationUnit.MONTHS:
      // Approximate months calculation
      const startYear = startDate.getFullYear();
      const endYear = endDate.getFullYear();
      const startMonth = startDate.getMonth();
      const endMonth = endDate.getMonth();
      const monthDiff = (endYear - startYear) * 12 + (endMonth - startMonth);
      
      // Adjust for partial months
      const startDay = startDate.getDate();
      const endDay = endDate.getDate();
      let partialMonthAdjustment = 0;
      
      if (endDay < startDay) {
        partialMonthAdjustment = -1;
      } else if (endDay > startDay) {
        partialMonthAdjustment = 1;
      }
      
      return monthDiff + partialMonthAdjustment;
    case DurationUnit.YEARS:
      // Approximate years calculation
      return getDuration(start, end, DurationUnit.MONTHS) / 12;
    default:
      throw new Error(`Unknown duration unit: ${unit}`);
  }
}

/**
 * Format a duration in a human-readable format
 */
export function formatDuration(
  durationMs: number,
  options: DurationFormatOptions = {}
): string {
  const { 
    maxUnits = 2, 
    includeZero = false, 
    format = 'long' 
  } = options;
  
  if (durationMs === 0) {
    return format === 'long' ? '0 milliseconds' : '0ms';
  }
  
  const units = [
    { unit: 'year', ms: 31536000000, short: 'y' },
    { unit: 'month', ms: 2592000000, short: 'mo' },
    { unit: 'day', ms: 86400000, short: 'd' },
    { unit: 'hour', ms: 3600000, short: 'h' },
    { unit: 'minute', ms: 60000, short: 'm' },
    { unit: 'second', ms: 1000, short: 's' },
    { unit: 'millisecond', ms: 1, short: 'ms' }
  ];
  
  let remainingMs = Math.abs(durationMs);
  const parts: string[] = [];
  
  for (const { unit, ms, short } of units) {
    if (parts.length >= maxUnits) {
      break;
    }
    
    const value = Math.floor(remainingMs / ms);
    remainingMs %= ms;
    
    if (value > 0 || (includeZero && parts.length > 0)) {
      if (format === 'long') {
        const unitStr = value === 1 ? unit : `${unit}s`;
        parts.push(`${value} ${unitStr}`);
      } else {
        parts.push(`${value}${short}`);
      }
    }
  }
  
  if (parts.length === 0) {
    const { unit, short } = units[units.length - 1];
    return format === 'long' ? `0 ${unit}s` : `0${short}`;
  }
  
  return parts.join(' ');
}

/**
 * Get the start of a time period
 */
export function getStartOf(
  date: Date | string | number,
  unit: 'day' | 'week' | 'month' | 'year'
): Date {
  const dateObj = parseDate(date);
  
  if (!dateObj) {
    throw new Error('Invalid date provided');
  }
  
  const result = new Date(dateObj);
  
  switch (unit) {
    case 'day':
      result.setHours(0, 0, 0, 0);
      break;
    case 'week':
      // Set to start of day
      result.setHours(0, 0, 0, 0);
      // Go to first day of week (Sunday is 0)
      const day = result.getDay();
      result.setDate(result.getDate() - day);
      break;
    case 'month':
      result.setDate(1);
      result.setHours(0, 0, 0, 0);
      break;
    case 'year':
      result.setMonth(0, 1);
      result.setHours(0, 0, 0, 0);
      break;
    default:
      throw new Error(`Unknown unit: ${unit}`);
  }
  
  return result;
}

/**
 * Get the end of a time period
 */
export function getEndOf(
  date: Date | string | number,
  unit: 'day' | 'week' | 'month' | 'year'
): Date {
  const dateObj = parseDate(date);
  
  if (!dateObj) {
    throw new Error('Invalid date provided');
  }
  
  const result = new Date(dateObj);
  
  switch (unit) {
    case 'day':
      result.setHours(23, 59, 59, 999);
      break;
    case 'week':
      // Set to start of day
      result.setHours(0, 0, 0, 0);
      // Go to first day of week (Sunday is 0)
      const day = result.getDay();
      result.setDate(result.getDate() - day + 6);
      // Set to end of day
      result.setHours(23, 59, 59, 999);
      break;
    case 'month':
      // Go to first day of next month, then go back 1 millisecond
      result.setMonth(result.getMonth() + 1, 0);
      result.setHours(23, 59, 59, 999);
      break;
    case 'year':
      result.setMonth(11, 31);
      result.setHours(23, 59, 59, 999);
      break;
    default:
      throw new Error(`Unknown unit: ${unit}`);
  }
  
  return result;
}

/**
 * Format a relative time (e.g., "5 minutes ago", "in 3 days")
 */
export function formatRelativeTime(
  date: Date | string | number,
  fromDate: Date | string | number = new Date()
): string {
  const dateObj = parseDate(date);
  const fromDateObj = parseDate(fromDate);
  
  if (!dateObj || !fromDateObj) {
    throw new Error('Invalid date provided');
  }
  
  const diffMs = dateObj.getTime() - fromDateObj.getTime();
  const absDiffMs = Math.abs(diffMs);
  
  // Format:
  // Just now: less than 1 minute
  // X minutes ago/in X minutes: less than 1 hour
  // X hours ago/in X hours: less than 1 day
  // X days ago/in X days: less than 1 month
  // X months ago/in X months: less than 1 year
  // X years ago/in X years: more than 1 year
  
  const isInPast = diffMs < 0;
  const suffix = isInPast ? 'ago' : 'from now';
  
  if (absDiffMs < 60000) {
    // Less than 1 minute
    return 'just now';
  } else if (absDiffMs < 3600000) {
    // Less than 1 hour
    const minutes = Math.floor(absDiffMs / 60000);
    const unit = minutes === 1 ? 'minute' : 'minutes';
    return `${minutes} ${unit} ${suffix}`;
  } else if (absDiffMs < 86400000) {
    // Less than 1 day
    const hours = Math.floor(absDiffMs / 3600000);
    const unit = hours === 1 ? 'hour' : 'hours';
    return `${hours} ${unit} ${suffix}`;
  } else if (absDiffMs < 2592000000) {
    // Less than 1 month
    const days = Math.floor(absDiffMs / 86400000);
    const unit = days === 1 ? 'day' : 'days';
    return `${days} ${unit} ${suffix}`;
  } else if (absDiffMs < 31536000000) {
    // Less than 1 year
    const months = Math.floor(absDiffMs / 2592000000);
    const unit = months === 1 ? 'month' : 'months';
    return `${months} ${unit} ${suffix}`;
  } else {
    // More than 1 year
    const years = Math.floor(absDiffMs / 31536000000);
    const unit = years === 1 ? 'year' : 'years';
    return `${years} ${unit} ${suffix}`;
  }
}