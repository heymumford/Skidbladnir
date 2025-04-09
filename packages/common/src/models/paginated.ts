/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Paginated result interface for API responses
 */
export interface PaginatedResult<T> {
  /**
   * Array of items in the current page
   */
  items: T[];
  
  /**
   * Total number of items across all pages
   */
  total: number;
  
  /**
   * Current page number (1-based)
   */
  page: number;
  
  /**
   * Number of items per page
   */
  pageSize: number;
}