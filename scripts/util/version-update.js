#!/usr/bin/env node

/**
 * Version update script for Skidbladnir.
 * This script updates the build-versions.json file with incremented version numbers.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BUILD_VERSION_PATH = path.join(__dirname, '..', 'build', 'build-versions.json');
const README_PATH = path.join(__dirname, '..', '..', 'README.md');

function getBuildVersions() {
  try {
    return JSON.parse(fs.readFileSync(BUILD_VERSION_PATH, 'utf8'));
  } catch (error) {
    console.error('Error reading build-versions.json:', error.message);
    process.exit(1);
  }
}

function writeBuildVersions(versions) {
  try {
    fs.writeFileSync(
      BUILD_VERSION_PATH,
      JSON.stringify(versions, null, 2),
      'utf8'
    );
    console.log(`Updated build-versions.json to version ${versions.version}`);
  } catch (error) {
    console.error('Error writing build-versions.json:', error.message);
    process.exit(1);
  }
}

function updateReadmeVersion(version) {
  try {
    const readmeContent = fs.readFileSync(README_PATH, 'utf8');
    const updatedContent = readmeContent.replace(
      /\[\!\[Version\]\(https:\/\/img\.shields\.io\/badge\/version-[\d\.]+/,
      `[![Version](https://img.shields.io/badge/version-${version}`
    );
    fs.writeFileSync(README_PATH, updatedContent, 'utf8');
    console.log(`Updated README.md version to ${version}`);
  } catch (error) {
    console.error('Error updating README.md:', error.message);
  }
}

function getGitInfo() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
    const commit = execSync('git rev-parse HEAD').toString().trim();
    const shortCommit = execSync('git rev-parse --short HEAD').toString().trim();
    const timestamp = parseInt(
      execSync('git log -1 --format=%ct').toString().trim()
    );
    
    let tag = '';
    try {
      tag = execSync('git describe --tags').toString().trim();
    } catch (e) {
      tag = 'no-tag';
    }
    
    return { branch, commit, shortCommit, timestamp, tag };
  } catch (error) {
    console.error('Error getting git info:', error.message);
    return {};
  }
}

function updateVersion(type = 'patch') {
  const versions = getBuildVersions();
  
  // Increment the appropriate version component
  switch (type.toLowerCase()) {
    case 'major':
      versions.major += 1;
      versions.minor = 0;
      versions.patch = 0;
      break;
    case 'minor':
      versions.minor += 1;
      versions.patch = 0;
      break;
    case 'patch':
    default:
      versions.patch += 1;
      break;
  }
  
  // Update the build number
  versions.build += 1;
  
  // Update the timestamp
  versions.timestamp = new Date().toISOString();
  
  // Update the full version
  versions.version = `${versions.major}.${versions.minor}.${versions.patch}-b${versions.build}`;
  
  // Update git info
  versions.git = getGitInfo();
  
  // Update the environment if specified
  if (process.env.NODE_ENV) {
    versions.environment = process.env.NODE_ENV;
  }
  
  writeBuildVersions(versions);
  updateReadmeVersion(`${versions.major}.${versions.minor}.${versions.patch}`);
  
  return versions;
}

function main() {
  const args = process.argv.slice(2);
  const type = args[0] || 'patch';
  
  if (!['major', 'minor', 'patch'].includes(type.toLowerCase())) {
    console.error('Invalid version type. Use "major", "minor", or "patch".');
    process.exit(1);
  }
  
  const updatedVersions = updateVersion(type);
  
  console.log(`Version bumped to ${updatedVersions.version} (${type} version increment)`);
}

// Execute the script if run directly
if (require.main === module) {
  main();
}

module.exports = {
  updateVersion,
  getBuildVersions
};