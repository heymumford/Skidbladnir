/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

// Mock Excel/CSV handler for testing

// Define the interface for import results
const ImportResult = {
  success: true,
  message: 'Success',
  data: [],
  errors: []
};

// Mock implementation
const excelCsvHandler = {
  importFile: async (file, options) => {
    return {
      success: true,
      message: 'File imported successfully',
      data: [],
      errors: []
    };
  },
  
  exportToExcel: (data, fileName) => {
    // Just a mock implementation
    return true;
  },
  
  exportToCsv: (data, fileName) => {
    // Just a mock implementation
    return true;
  }
};

module.exports = {
  ImportResult,
  excelCsvHandler
};