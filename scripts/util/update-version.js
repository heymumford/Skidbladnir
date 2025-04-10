#!/usr/bin/env node
/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Parse arguments
const args = process.argv.slice(2);
let updateType = 'build';
let pushGit = false;
let specificVersion = '';

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--major' || arg === '-m') {
    updateType = 'major';
  } else if (arg === '--minor' || arg === '-n') {
    updateType = 'minor';
  } else if (arg === '--patch' || arg === '-p') {
    updateType = 'patch';
  } else if (arg === '--build' || arg === '-b') {
    updateType = 'build';
  } else if ((arg === '--version' || arg === '-v') && i < args.length - 1) {
    specificVersion = args[++i];
    updateType = 'specific';
  } else if (arg === '--push-git' || arg === '-g') {
    pushGit = true;
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
Skidbladnir Version Update Utility

Usage: update-version.js [options]

Options:
  -m, --major          Bump major version
  -n, --minor          Bump minor version
  -p, --patch          Bump patch version
  -b, --build          Bump build number only (default)
  -v, --version VER    Set specific version (format: X.Y.Z-bN)
  -g, --push-git       Commit changes to Git
  -h, --help           Show this help

Examples:
  update-version.js             # Increment build number only
  update-version.js -p          # Bump patch version
  update-version.js -v 1.0.0-b50 # Set specific version
  update-version.js -b -g       # Bump build, commit and push
    `);
    process.exit(0);
  }
}

// Project paths
const projectRoot = path.resolve(__dirname, '../..');
const packageJsonPath = path.join(projectRoot, 'package.json');
const pyprojectTomlPath = path.join(projectRoot, 'pyproject.toml');
const buildVersionsPath = path.join(projectRoot, 'build-versions.json');

// Read current version from package.json
if (!fs.existsSync(packageJsonPath)) {
  console.error('Error: package.json not found.');
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const currentVersion = packageJson.version;
console.log(`Current version: ${currentVersion}`);

// Calculate new version
let newVersion = currentVersion;
if (updateType === 'specific') {
  newVersion = specificVersion;
} else {
  // Parse version
  const versionRegex = /^(\d+)\.(\d+)\.(\d+)(?:-b(\d+))?$/;
  const match = currentVersion.match(versionRegex);
  
  if (!match) {
    console.error(`Error: Could not parse current version: ${currentVersion}`);
    process.exit(1);
  }
  
  let [, major, minor, patch, build] = match;
  major = parseInt(major, 10);
  minor = parseInt(minor, 10);
  patch = parseInt(patch, 10);
  build = parseInt(build || '50', 10);
  
  if (updateType === 'major') {
    major++;
    minor = 0;
    patch = 0;
    build++;
  } else if (updateType === 'minor') {
    minor++;
    patch = 0;
    build++;
  } else if (updateType === 'patch') {
    patch++;
    build++;
  } else if (updateType === 'build') {
    build++;
  }
  
  // Ensure build is at least 50
  if (build < 50) build = 50;
  
  newVersion = `${major}.${minor}.${patch}-b${build}`;
}

console.log(`New version: ${newVersion}`);

// Extract version parts for updating files
const versionRegex = /^(\d+)\.(\d+)\.(\d+)(?:-b(\d+))?$/;
const match = newVersion.match(versionRegex);

if (!match) {
  console.error(`Error: Could not parse new version: ${newVersion}`);
  process.exit(1);
}

const [, major, minor, patch, build] = match;
const mavenVersion = `${major}.${minor}.${patch}`; // Maven doesn't use build number

// Update package.json
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
console.log('Updated package.json');

// Update pyproject.toml if it exists
if (fs.existsSync(pyprojectTomlPath)) {
  let pyprojectContent = fs.readFileSync(pyprojectTomlPath, 'utf8');
  // Only update version in [tool.poetry] section
  const poetrySectionRegex = /(\[tool\.poetry\][^\[]*version = ")[^"]*(")/;
  pyprojectContent = pyprojectContent.replace(poetrySectionRegex, `$1${newVersion}$2`);
  fs.writeFileSync(pyprojectTomlPath, pyprojectContent);
  console.log('Updated pyproject.toml');
}

// Update build-versions.json
const timestamp = new Date().toISOString();
const gitBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
const gitCommit = execSync('git rev-parse HEAD').toString().trim();
const gitShortCommit = execSync('git rev-parse --short HEAD').toString().trim();
const gitTimestamp = parseInt(execSync('git log -1 --format=%ct').toString().trim(), 10);
const gitTag = execSync('git describe --tags --always 2>/dev/null || echo ""').toString().trim();

const buildVersions = {
  version: newVersion,
  major: parseInt(major, 10),
  minor: parseInt(minor, 10),
  patch: parseInt(patch, 10),
  build: parseInt(build, 10),
  timestamp,
  environment: 'dev',
  git: {
    branch: gitBranch,
    commit: gitCommit,
    shortCommit: gitShortCommit,
    timestamp: gitTimestamp,
    tag: gitTag
  }
};

fs.writeFileSync(buildVersionsPath, JSON.stringify(buildVersions, null, 2) + '\n');
console.log('Updated build-versions.json');

// Update POM files
try {
  const pomFiles = execSync(`find "${projectRoot}" -name "pom.xml" -type f -not -path "*/node_modules/*" -not -path "*/.git/*"`)
    .toString().trim().split('\n').filter(Boolean);
  
  for (const pomFile of pomFiles) {
    console.log(`Updating ${pomFile}`);
    
    // Simple XML replacement for version
    let pomContent = fs.readFileSync(pomFile, 'utf8');
    
    // Update project version
    pomContent = pomContent.replace(
      /(<version>)([^<]+)(<\/version>)/, 
      `$1${mavenVersion}$3`
    );
    
    // Update skidbladnir.version property
    pomContent = pomContent.replace(
      /(<skidbladnir\.version>)([^<]+)(<\/skidbladnir\.version>)/, 
      `$1${mavenVersion}$3`
    );
    
    fs.writeFileSync(pomFile, pomContent);
  }
} catch (error) {
  console.warn('Warning: Could not update POM files:', error.message);
}

console.log(`Version update complete: ${newVersion}`);

// Commit changes if requested
if (pushGit) {
  try {
    const isBuildOnly = updateType === 'build';
    const commitMsg = isBuildOnly 
      ? `chore: Bump build number to ${newVersion}`
      : `chore: Update version to ${newVersion}`;
    
    console.log(`Committing changes with message: ${commitMsg}`);
    
    execSync(`git add package.json pyproject.toml build-versions.json $(find "${projectRoot}" -name "pom.xml" -not -path "*/node_modules/*" -not -path "*/.git/*")`, 
      { stdio: 'inherit' });
    execSync(`git commit -m "${commitMsg}"`, { stdio: 'inherit' });
    execSync(`git push origin "${gitBranch}"`, { stdio: 'inherit' });
    
    console.log('Version changes committed and pushed');
  } catch (error) {
    console.error('Error committing changes:', error.message);
    process.exit(1);
  }
}