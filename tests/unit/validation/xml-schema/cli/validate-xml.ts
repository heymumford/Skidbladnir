#!/usr/bin/env node

/**
 * CLI tool for validating XML files against schemas
 * 
 * This tool can be used to validate XML files in a project against their
 * corresponding schemas. It automatically detects schema locations based
 * on XML namespaces.
 */

import * as fs from 'fs';
import * as path from 'path';
import { XmlSchemaValidator } from '../XmlSchemaValidator';

// Command-line argument parsing
const args = process.argv.slice(2);
const options: {
  xmlDir?: string;
  schemaDir?: string;
  pattern?: string;
  verbose?: boolean;
  help?: boolean;
} = {};

// Parse command-line arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  if (arg === '--help' || arg === '-h') {
    options.help = true;
  } else if (arg === '--verbose' || arg === '-v') {
    options.verbose = true;
  } else if (arg === '--xml-dir' || arg === '-x') {
    options.xmlDir = args[++i];
  } else if (arg === '--schema-dir' || arg === '-s') {
    options.schemaDir = args[++i];
  } else if (arg === '--pattern' || arg === '-p') {
    options.pattern = args[++i];
  }
}

// Display help
if (options.help) {
  console.log(`XML Schema Validation Tool

Usage:
  npx ts-node validate-xml.ts [options]

Options:
  --xml-dir, -x     Directory containing XML files to validate (default: project root)
  --schema-dir, -s  Directory containing XML schemas (default: schemas/)
  --pattern, -p     Glob pattern to filter XML files (default: **/*.xml)
  --verbose, -v     Show more detailed output
  --help, -h        Show this help message

Examples:
  npx ts-node validate-xml.ts -x ./src -s ./schemas
  npx ts-node validate-xml.ts -p "**/*pom.xml" -v
`);
  process.exit(0);
}

// Set default options
const projectRoot = path.resolve(process.cwd());
const xmlDir = options.xmlDir ? path.resolve(options.xmlDir) : projectRoot;
const schemaDir = options.schemaDir 
  ? path.resolve(options.schemaDir) 
  : path.join(projectRoot, 'schemas');
const pattern = options.pattern || '**/*.xml';

// Ensure schema directory exists
if (!fs.existsSync(schemaDir)) {
  console.error(`Schema directory not found: ${schemaDir}`);
  console.error('Create the directory or specify a different one with --schema-dir');
  process.exit(1);
}

// Validate files
console.log(`Validating XML files in ${xmlDir} against schemas in ${schemaDir}`);
console.log(`Using pattern: ${pattern}`);

const results = XmlSchemaValidator.validateDirectory(xmlDir, schemaDir, pattern);

// Display results
console.log(`\nValidated ${results.length} XML files`);

const validFiles = results.filter(r => r.valid);
const invalidFiles = results.filter(r => !r.valid);

console.log(`Valid: ${validFiles.length}`);
console.log(`Invalid: ${invalidFiles.length}`);

if (invalidFiles.length > 0) {
  console.log('\nInvalid files:');
  
  for (const result of invalidFiles) {
    const relativePath = path.relative(projectRoot, result.filePath);
    console.log(`- ${relativePath}`);
    
    if (options.verbose) {
      console.log(`  Schema: ${result.usedSchema ? path.relative(projectRoot, result.usedSchema) : 'None'}`);
      console.log('  Errors:');
      for (const error of result.errors) {
        console.log(`  - ${error}`);
      }
      console.log('');
    }
  }
}

// Exit with appropriate status code
process.exit(invalidFiles.length > 0 ? 1 : 0);