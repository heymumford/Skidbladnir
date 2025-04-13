#!/usr/bin/env node
/**
 * Enhanced version update script for Skidbladnir.
 * Designed to work in harmony with the bash scripts to provide a unified
 * version management solution for the project.
 * 
 * CommonJS module version to avoid ESM/CJS compatibility issues.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const PROJECT_ROOT = path.join(__dirname, '..', '..');
const BUILD_VERSION_PATH = path.join(PROJECT_ROOT, 'build-versions.json');
const README_PATH = path.join(PROJECT_ROOT, 'README.md');
const VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)(?:-b(\d+))?$/;

/**
 * Read current build versions from build-versions.json
 */
function readBuildVersions() {
  try {
    if (!fs.existsSync(BUILD_VERSION_PATH)) {
      console.warn(`Warning: ${BUILD_VERSION_PATH} not found, creating default version object`);
      return {
        version: "0.1.1",
        major: 0,
        minor: 1,
        patch: 1,
        build: 51,
        timestamp: new Date().toISOString(),
        environment: "dev",
        git: getGitInfo()
      };
    }
    return JSON.parse(fs.readFileSync(BUILD_VERSION_PATH, 'utf8'));
  } catch (error) {
    console.error('Error reading build-versions.json:', error.message);
    process.exit(1);
  }
}

/**
 * Write updated build versions to build-versions.json
 */
function saveBuildVersions(buildVersions) {
  try {
    fs.writeFileSync(
        BUILD_VERSION_PATH,
        JSON.stringify(buildVersions, null, 2),
        'utf8'
    );
    console.log(`Updated build-versions.json to version ${buildVersions.version}`);
  } catch (error) {
    console.error('Error writing build-versions.json:', error.message);
    process.exit(1);
  }
}

/**
 * Update version badge in README.md
 */
function updateReadmeVersion(version) {
  try {
    if (!fs.existsSync(README_PATH)) {
      console.warn('README.md not found, skipping update');
      return;
    }
    const readmeContent = fs.readFileSync(README_PATH, 'utf8');
    const versionRegex = /\[!\[Version]\(https:\/\/img\.shields\.io\/badge\/version-[\d.]+/;
    if (!versionRegex.test(readmeContent)) {
      console.warn('Version badge not found in README.md, skipping update');
      return;
    }
    const updatedContent = readmeContent.replace(
        versionRegex,
        `[![Version](https://img.shields.io/badge/version-${version}`
    );
    fs.writeFileSync(README_PATH, updatedContent, 'utf8');
    console.log(`Updated README.md version to ${version}`);
  } catch (error) {
    console.error('Error updating README.md:', error.message);
  }
}

/**
 * Retrieve Git information for version tracking
 */
function getGitInfo() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
    const commit = execSync('git rev-parse HEAD').toString().trim();
    const shortCommit = execSync('git rev-parse --short HEAD').toString().trim();
    const timestamp = parseInt(execSync('git log -1 --format=%ct').toString().trim(), 10);
    let tag = '';
    try {
      tag = execSync('git describe --tags').toString().trim();
    } catch (e) {
      tag = 'no-tag';
    }
    return { branch, commit, shortCommit, timestamp, tag };
  } catch (error) {
    console.error('Error getting git info:', error.message);
    return {
      branch: 'unknown',
      commit: 'unknown',
      shortCommit: 'unknown',
      timestamp: Math.floor(Date.now() / 1000),
      tag: 'no-tag'
    };
  }
}

/**
 * Extract and parse specific version string.
 *
 * @param {string} specificVersion
 * @param {number} currentBuild
 * @returns {object} Parsed version components
 */
function parseSpecificVersion(specificVersion, currentBuild) {
  const match = specificVersion.match(VERSION_PATTERN);
  if (!match) {
    console.error(`Invalid version format: ${specificVersion}. Expected format: X.Y.Z[-bN]`);
    process.exit(1);
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    build: match[4] ? parseInt(match[4], 10) : currentBuild + 1
  };
}

/**
 * Update version in all project files
 *
 * @param {string} versionUpdateType - 'major', 'minor', 'patch', or 'build'
 * @param {string|null} specificVersion - Optional specific version to set
 * @returns {object} Updated version information
 */
function updateVersion(versionUpdateType = 'patch', specificVersion = null) {
  const buildVersions = readBuildVersions();
  let newMajor, newMinor, newPatch, newBuild;

  if (specificVersion) {
    const parsed = parseSpecificVersion(specificVersion, buildVersions.build);
    newMajor = parsed.major;
    newMinor = parsed.minor;
    newPatch = parsed.patch;
    newBuild = parsed.build;
  } else {
    // Start with current values
    newMajor = buildVersions.major;
    newMinor = buildVersions.minor;
    newPatch = buildVersions.patch;
    newBuild = buildVersions.build;

    switch (versionUpdateType.toLowerCase()) {
      case 'major':
        newMajor += 1;
        newMinor = 0;
        newPatch = 0;
        break;
      case 'minor':
        newMinor += 1;
        newPatch = 0;
        break;
      case 'patch':
        newPatch += 1;
        break;
      case 'build':
      default:
        // For build, we only increment the build number
        break;
    }
    // Always increment the build number
    newBuild += 1;
  }

  // Create clean versions for different formats
  const semverBase = `${newMajor}.${newMinor}.${newPatch}`;
  const buildVersion = `${semverBase}-b${newBuild}`;
  
  // Update build-versions.json
  buildVersions.major = newMajor;
  buildVersions.minor = newMinor;
  buildVersions.patch = newPatch;
  buildVersions.build = newBuild;
  buildVersions.timestamp = new Date().toISOString();
  buildVersions.version = buildVersion;
  buildVersions.git = getGitInfo();

  // Update the environment if specified
  if (process.env.NODE_ENV) {
    buildVersions.environment = process.env.NODE_ENV;
  }

  console.log(`Updating to version: ${semverBase} (build ${newBuild})`);

  // 1. Save build-versions.json
  saveBuildVersions(buildVersions);
  
  // 2. Update README.md version badge
  updateReadmeVersion(semverBase);
  
  // 3. Use the shell script to update other files
  syncWithOtherFiles(buildVersion);
  
  return buildVersions;
}

/**
 * Run a shell command to update versions in other file types
 */
function syncWithOtherFiles(version) {
  try {
    const scriptPath = path.join(__dirname, 'simple-version-update.sh');
    if (!fs.existsSync(scriptPath)) {
      console.error(`Error: Script not found: ${scriptPath}`);
      return false;
    }
    console.log(`Updating other files with version ${version}...`);
    execSync(`bash "${scriptPath}" "${version}"`, {
      stdio: 'inherit',
      cwd: PROJECT_ROOT
    });
    return true;
  } catch (error) {
    console.error('Error updating other files:', error.message);
    return false;
  }
}

/**
 * Main function to run when the script is executed directly
 */
function main() {
  const args = process.argv.slice(2);
  let versionUpdateType = 'patch';
  let specificVersion = null;
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-m' || arg === '--major') {
      versionUpdateType = 'major';
    } else if (arg === '-n' || arg === '--minor') {
      versionUpdateType = 'minor';
    } else if (arg === '-p' || arg === '--patch') {
      versionUpdateType = 'patch';
    } else if (arg === '-b' || arg === '--build') {
      versionUpdateType = 'build';
    } else if (arg === '-v' || arg === '--version') {
      specificVersion = args[++i];
    }
  }

  // Validate version type
  if (!['major', 'minor', 'patch', 'build'].includes(versionUpdateType.toLowerCase()) && !specificVersion) {
    console.error('Invalid version type. Use "major", "minor", "patch", or "build".');
    process.exit(1);
  }

  // Update version in all files
  updateVersion(versionUpdateType, specificVersion);
  
  // Always log a success message at the end
  console.log('Version update completed successfully');
}

// Execute when run directly
if (require.main === module) {
  main();
}

// Export functions for module usage
module.exports = {
  updateVersion,
  syncWithOtherFiles,
  getGitInfo,
  readBuildVersions,
  saveBuildVersions
};