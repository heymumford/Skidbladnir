/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Attachment content model
 * 
 * Used for storing binary attachment data
 */
export interface AttachmentContent {
  /**
   * Attachment ID
   */
  id?: string;
  
  /**
   * File name
   */
  name: string;
  
  /**
   * MIME content type
   */
  contentType: string;
  
  /**
   * File size in bytes
   */
  size: number;
  
  /**
   * Binary content
   */
  content: Buffer;
  
  /**
   * Optional description
   */
  description?: string;
}