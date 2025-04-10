#!/usr/bin/env node
/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

// Version consistency checker for Git hooks
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes
const RED = '\x1b[0;31m';
const GREEN = '\x1b[0;32m';
const YELLOW = '\x1b[0;33m';
const NC = '\x1b[0m'; // No Color

// Log functions
const logError = (message) => console.error(`${RED}ERROR:${NC} ${message}`);
const logWarning = (message) => console.error(`${YELLOW}WARNING:${NC} ${message}`);
const logSuccess = (message) => console.log(`${GREEN}SUCCESS:${NC} ${message}`);

const projectRoot = path.resolve(__dirname, '../..');
const packageJsonPath = path.join(projectRoot, 'package.json');
const buildVersionsPath = path.join(projectRoot, 'build-versions.json');
const pyprojectTomlPath = path.join(projectRoot, 'pyproject.toml');

// Read versions from different files
function getPackageJsonVersion() {
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return packageJson.version;
  } catch (error) {
    logError(`Failed to read package.json: ${error.message}`);
    return null;
  }
}

function getBuildVersionsJsonVersion() {
  try {
    const buildVersions = JSON.parse(fs.readFileSync(buildVersionsPath, 'utf8'));
    return buildVersions.version;
  } catch (error) {
    logError(`Failed to read build-versions.json: ${error.message}`);
    return null;
  }
}

function getPyprojectTomlVersion() {
  try {
    if (!fs.existsSync(pyprojectTomlPath)) {
      return null;
    }
    
    const content = fs.readFileSync(pyprojectTomlPath, 'utf8');
    const match = content.match(/\[tool\.poetry\][^\[]*version = "([^"]*)"/);
    return match ? match[1] : null;
  } catch (error) {
    logError(`Failed to read pyproject.toml: ${error.message}`);
    return null;
  }
}

function getPomVersions() {
  try {
    const pomFiles = execSync(`find "${projectRoot}" -name "pom.xml" -type f -not -path "*/node_modules/*" -not -path "*/.git/*"`)
      .toString().trim().split('\n').filter(Boolean);
    
    return pomFiles.map(file => {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check project version
      const projectVersionMatch = content.match(/<version>([^<]+)<\/version>/);
      const projectVersion = projectVersionMatch ? projectVersionMatch[1] : null;
      
      // Check skidbladnir.version property
      const propertyVersionMatch = content.match(/<skidbladnir\.version>([^<]+)<\/skidbladnir\.version>/);
      const propertyVersion = propertyVersionMatch ? propertyVersionMatch[1] : null;
      
      return {
        file: file.replace(projectRoot + '/', ''),
        projectVersion,
        propertyVersion
      };
    });
  } catch (error) {
    logWarning(`Failed to check POM files: ${error.message}`);
    return [];
  }
}

// Main check function
function checkVersionConsistency() {
  const packageVersion = getPackageJsonVersion();
  const buildVersion = getBuildVersionsJsonVersion();
  const pyprojectVersion = getPyprojectTomlVersion();
  const pomVersions = getPomVersions();
  
  if (!packageVersion) {
    return false;
  }
  
  let hasVersionMismatch = false;
  
  // Compare package.json and build-versions.json
  if (buildVersion && packageVersion !== buildVersion) {
    logError(`Version mismatch between package.json (${packageVersion}) and build-versions.json (${buildVersion})`);
    hasVersionMismatch = true;
  }
  
  // Compare package.json and pyproject.toml
  if (pyprojectVersion && packageVersion !== pyprojectVersion) {
    logError(`Version mismatch between package.json (${packageVersion}) and pyproject.toml (${pyprojectVersion})`);
    hasVersionMismatch = true;
  }
  
  // Extract major.minor.patch for Maven
  let mavenBaseVersion = packageVersion;
  const versionMatch = packageVersion.match(/^(\d+\.\d+\.\d+)/);
  if (versionMatch) {
    mavenBaseVersion = versionMatch[1];
  }
  
  // Check POM files
  for (const pom of pomVersions) {
    if (pom.projectVersion && pom.projectVersion !== mavenBaseVersion) {
      logError(`Version mismatch in ${pom.file}: POM version (${pom.projectVersion}) differs from package.json version base (${mavenBaseVersion})`);
      hasVersionMismatch = true;
    }
    
    if (pom.propertyVersion && pom.propertyVersion !== mavenBaseVersion) {
      logError(`Version mismatch in ${pom.file}: skidbladnir.version property (${pom.propertyVersion}) differs from package.json version base (${mavenBaseVersion})`);
      hasVersionMismatch = true;
    }
  }
  
  if (hasVersionMismatch) {
    logError('Run npm run version:sync to fix version inconsistencies');
    return false;
  }
  
  logSuccess(`All version files are in sync: ${packageVersion}`);
  return true;
}

// Execute the check
const isConsistent = checkVersionConsistency();

if (!isConsistent && process.env.VERSION_CHECK_DISPLAY_WARNING) {
  console.error(`${YELLOW}========================= WARNING =========================${NC}`);
  console.error(`${YELLOW}Version files are out of sync. Please run one of:${NC}`);
  console.error(`${YELLOW}  - npm run version:sync   (to synchronize versions)${NC}`);
  console.error(`${YELLOW}  - npm run version:bump   (to update build number)${NC}`);
  console.error(`${YELLOW}  - npm run version:patch  (to update patch version)${NC}`);
  console.error(`${YELLOW}  - npm run version:minor  (to update minor version)${NC}`);
  console.error(`${YELLOW}  - npm run version:major  (to update major version)${NC}`);
  console.error(`${YELLOW}========================= WARNING =========================${NC}`);
}

// Exit with appropriate code: 0 for consistent (or warning only), 1 for error
process.exit(isConsistent || process.env.VERSION_CHECK_DISPLAY_WARNING ? 0 : 1);