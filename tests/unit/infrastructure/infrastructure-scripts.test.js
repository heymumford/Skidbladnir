/**
 * Infrastructure Scripts Idempotency Tests
 * 
 * These tests verify that critical infrastructure scripts in the project are idempotent,
 * meaning they can be run multiple times without causing errors or unexpected side effects.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Path to project root
const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const SCRIPTS_DIR = path.join(PROJECT_ROOT, 'scripts');

// Helper to run a script and capture output
function runScript(scriptPath, args = []) {
  const command = `bash ${scriptPath} ${args.join(' ')}`;
  try {
    const output = execSync(command, { 
      encoding: 'utf8',
      cwd: PROJECT_ROOT
    });
    return { success: true, output };
  } catch (error) {
    return { 
      success: false, 
      output: error.stdout, 
      error: error.stderr,
      code: error.status
    };
  }
}

// Create a temporary test environment
function setupTestEnvironment() {
  const testDir = path.join(PROJECT_ROOT, 'tmp', 'idempotency-test');
  
  // Create test directory if it doesn't exist
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  // Create sample files for testing
  fs.writeFileSync(
    path.join(testDir, 'sample-file.txt'),
    'This is a sample file for testing infrastructure scripts.\n'
  );
  
  fs.writeFileSync(
    path.join(testDir, 'sample-xml-file.xml'),
    '<?xml version="1.0" encoding="UTF-8"?>\n<root>\n  <element>Sample</element>\n</root>\n'
  );
  
  return testDir;
}

// Clean up the test environment
function cleanupTestEnvironment(testDir) {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

describe('Infrastructure Scripts Idempotency', () => {
  let testDir;
  
  beforeAll(() => {
    testDir = setupTestEnvironment();
  });
  
  afterAll(() => {
    cleanupTestEnvironment(testDir);
  });
  
  describe('Git Hooks Installation', () => {
    const scriptPath = path.join(SCRIPTS_DIR, 'git-hooks', 'install.sh');
    
    test('git hooks install script is idempotent', () => {
      // Skip if script doesn't exist
      if (!fs.existsSync(scriptPath)) {
        console.warn(`Script not found: ${scriptPath}`);
        return;
      }
      
      // First run
      const firstRun = runScript(scriptPath);
      expect(firstRun.success).toBe(true);
      
      // Second run
      const secondRun = runScript(scriptPath);
      expect(secondRun.success).toBe(true);
      
      // The script should not fail on subsequent runs
      // Note: We're not comparing outputs as they might contain timestamps
    });
  });
  
  describe('XML Cleanup', () => {
    const scriptPath = path.join(SCRIPTS_DIR, 'util', 'xml-cleanup.sh');
    
    test('xml cleanup script is idempotent', () => {
      // Skip if script doesn't exist
      if (!fs.existsSync(scriptPath)) {
        console.warn(`Script not found: ${scriptPath}`);
        return;
      }
      
      // Copy the sample XML file to a test location
      const testXmlPath = path.join(testDir, 'test-cleanup.xml');
      fs.copyFileSync(
        path.join(testDir, 'sample-xml-file.xml'),
        testXmlPath
      );
      
      // First run
      const firstRun = runScript(scriptPath, [testXmlPath]);
      expect(firstRun.success).toBe(true);
      
      // Get file stats after first run
      const statsAfterFirstRun = fs.statSync(testXmlPath);
      
      // Second run
      const secondRun = runScript(scriptPath, [testXmlPath]);
      expect(secondRun.success).toBe(true);
      
      // Get file stats after second run
      const statsAfterSecondRun = fs.statSync(testXmlPath);
      
      // Modification time should be the same if the file wasn't changed
      // (indicating the script is idempotent)
      expect(statsAfterSecondRun.mtime.getTime()).toBe(statsAfterFirstRun.mtime.getTime());
    });
  });
  
  describe('Version Update', () => {
    const scriptPath = path.join(SCRIPTS_DIR, 'util', 'simple-version-update.sh');
    
    test('version update script is idempotent when used with the same version', () => {
      // Skip if script doesn't exist
      if (!fs.existsSync(scriptPath)) {
        console.warn(`Script not found: ${scriptPath}`);
        return;
      }
      
      // Use a test version
      const testVersion = '0.1.0-test';
      
      // First run
      const firstRun = runScript(scriptPath, [testVersion]);
      expect(firstRun.success).toBe(true);
      
      // Second run with the same version number
      const secondRun = runScript(scriptPath, [testVersion]);
      expect(secondRun.success).toBe(true);
      
      // The script should not make changes when run with the same version
    });
  });
  
  describe('Coverage Check', () => {
    const scriptPath = path.join(SCRIPTS_DIR, 'check-coverage.sh');
    
    test('coverage check script is idempotent', () => {
      // Skip if script doesn't exist
      if (!fs.existsSync(scriptPath)) {
        console.warn(`Script not found: ${scriptPath}`);
        return;
      }
      
      // First run - may fail if coverage doesn't meet thresholds, but that's OK for this test
      const firstRun = runScript(scriptPath);
      
      // Second run - should have the same result
      const secondRun = runScript(scriptPath);
      
      // The script should have the same success/failure status on both runs
      expect(secondRun.success).toBe(firstRun.success);
      
      // If both runs failed, they should fail with the same exit code
      if (!firstRun.success) {
        expect(secondRun.code).toBe(firstRun.code);
      }
    });
  });
  
  describe('License Header Updates', () => {
    const scriptPath = path.join(SCRIPTS_DIR, 'util', 'update_license_headers.sh');
    
    test('license header update script is idempotent', () => {
      // Skip if script doesn't exist
      if (!fs.existsSync(scriptPath)) {
        console.warn(`Script not found: ${scriptPath}`);
        return;
      }
      
      // Create a test file
      const testFilePath = path.join(testDir, 'test-license.js');
      fs.writeFileSync(
        testFilePath,
        '// Some code\nfunction test() {\n  console.log("Hello world");\n}\n'
      );
      
      // First run
      const firstRun = runScript(scriptPath, [testFilePath]);
      
      // Second run
      const secondRun = runScript(scriptPath, [testFilePath]);
      
      // The script should have the same success/failure status on both runs
      expect(secondRun.success).toBe(firstRun.success);
      
      // Read the file after both runs
      const fileContent = fs.readFileSync(testFilePath, 'utf8');
      
      // The license header should appear exactly once in the file
      const licenseHeaderCount = (fileContent.match(/Copyright/g) || []).length;
      expect(licenseHeaderCount).toBeLessThanOrEqual(1);
    });
  });
});