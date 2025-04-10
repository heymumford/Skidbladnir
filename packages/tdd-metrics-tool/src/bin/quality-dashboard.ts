#!/usr/bin/env node

/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { QualityDashboardCLI } from '../utils/quality-dashboard-cli';

// Get command-line arguments
const args = process.argv.slice(2);

// Run the CLI
QualityDashboardCLI.run(args).catch(error => {
  console.error('Error running test quality dashboard tool:', error);
  process.exit(1);
});