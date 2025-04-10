/**
 * Helper utility functions
 */

/**
 * Wait for a specified number of milliseconds
 * 
 * @param ms Number of milliseconds to wait
 * @returns Promise that resolves after the specified time
 */
export const wait = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Generate a random string of specified length
 * 
 * @param length Length of the random string
 * @returns Random string
 */
export const randomString = (length: number): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

/**
 * Deep clone an object
 * 
 * @param obj Object to clone
 * @returns Deep cloned object
 */
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Check if a value is defined and not null
 * 
 * @param value Value to check
 * @returns True if the value is defined and not null
 */
export const isDefined = <T>(value: T | null | undefined): value is T => {
  return value !== null && value !== undefined;
};

/**
 * Check if a string is empty or only whitespace
 * 
 * @param str String to check
 * @returns True if the string is empty or only whitespace
 */
export const isEmptyString = (str: string | null | undefined): boolean => {
  return !str || str.trim() === '';
};

/**
 * Check if an object is empty (has no own properties)
 * 
 * @param obj Object to check
 * @returns True if the object is empty
 */
export const isEmptyObject = (obj: Record<string, any> | null | undefined): boolean => {
  return !obj || Object.keys(obj).length === 0;
};

/**
 * Format a date as ISO8601 string
 * 
 * @param date Date to format
 * @returns ISO8601 date string
 */
export const formatDate = (date: Date): string => {
  return date.toISOString();
};

/**
 * Truncate a string to a maximum length, adding an ellipsis if truncated
 * 
 * @param str String to truncate
 * @param maxLength Maximum length of the string
 * @returns Truncated string
 */
export const truncate = (str: string, maxLength: number): string => {
  if (str.length <= maxLength) {
    return str;
  }
  return str.slice(0, maxLength) + '...';
};

/**
 * Safely parse JSON with error handling
 * 
 * @param jsonString JSON string to parse
 * @param defaultValue Default value to return if parsing fails
 * @returns Parsed JSON or default value
 */
export const safeJsonParse = <T>(jsonString: string, defaultValue: T): T => {
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    return defaultValue;
  }
};

/**
 * Format a number with thousands separators
 * 
 * @param num Number to format
 * @returns Formatted number
 */
export const formatNumber = (num: number): string => {
  return num.toLocaleString();
};

/**
 * Convert milliseconds to a human-readable time string
 * 
 * @param ms Milliseconds
 * @returns Human readable time string (e.g. "2 hrs 30 mins")
 */
export const msToTimeString = (ms: number): string => {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

/**
 * Checks if a value is an array and has at least one element
 * 
 * @param arr Array to check
 * @returns True if the array is defined and not empty
 */
export const hasItems = <T>(arr: T[] | null | undefined): boolean => {
  return !!arr && Array.isArray(arr) && arr.length > 0;
};

/**
 * Calculate the percentage of a value relative to a total
 * 
 * @param value Current value
 * @param total Total value
 * @param decimals Number of decimal places to return
 * @returns Percentage value
 */
export const calculatePercentage = (value: number, total: number, decimals = 0): number => {
  if (total === 0) {
    return 0;
  }
  
  const percentage = (value / total) * 100;
  return Number(percentage.toFixed(decimals));
};

/**
 * Group an array of objects by a property value
 * 
 * @param array Array to group
 * @param key Property key to group by
 * @returns Object with groups
 */
export const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
};

/**
 * Get a URL query parameter by name
 * 
 * @param url URL string
 * @param paramName Parameter name
 * @returns Parameter value or null if not found
 */
export const getQueryParam = (url: string, paramName: string): string | null => {
  const urlObj = new URL(url);
  return urlObj.searchParams.get(paramName);
};

/**
 * Build a URL with query parameters
 * 
 * @param baseUrl Base URL
 * @param params Query parameters
 * @returns URL with query parameters
 */
export const buildUrl = (baseUrl: string, params: Record<string, string | number | boolean | null | undefined>): string => {
  const url = new URL(baseUrl);
  
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined) {
      url.searchParams.append(key, String(value));
    }
  }
  
  return url.toString();
};