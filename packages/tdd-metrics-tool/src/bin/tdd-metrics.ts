#!/usr/bin/env node

/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { CLI } from '../utils/cli';

// Get command-line arguments
const args = process.argv.slice(2);

// Run the CLI
CLI.run(args).catch(error => {
  console.error('Error running TDD metrics tool:', error);
  process.exit(1);
});