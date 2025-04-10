/**
 * Build and Deployment Scripts Idempotency Tests
 * 
 * These tests verify that build and deployment scripts can be run multiple times
 * without errors or unexpected side effects.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Path to project root
const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const SCRIPTS_DIR = path.join(PROJECT_ROOT, 'scripts');

// Create a temporary directory for test artifacts
function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'build-deploy-test-'));
}

// Helper to run a script with mocked commands
function mockAndRunScript(scriptPath, mockReplacements = {}, args = []) {
  // Create a temporary copy of the script
  const tempDir = createTempDir();
  const mockScriptName = `mock-${path.basename(scriptPath)}`;
  const mockScriptPath = path.join(tempDir, mockScriptName);
  
  // Read the original script
  let scriptContent = fs.readFileSync(scriptPath, 'utf8');
  
  // Apply mock replacements
  for (const [command, replacement] of Object.entries(mockReplacements)) {
    // Escape special characters in the command for regex
    const escapedCommand = command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedCommand, 'g');
    scriptContent = scriptContent.replace(regex, replacement);
  }
  
  // Add a mock mode check at the beginning
  scriptContent = `#!/bin/bash
# Mock script for testing
if [ "$MOCK_MODE" = "true" ]; then
  echo "Running in mock mode"
fi

${scriptContent}`;
  
  // Write the modified script
  fs.writeFileSync(mockScriptPath, scriptContent, { mode: 0o755 });
  
  // Run the mock script
  try {
    const output = execSync(`bash ${mockScriptPath} ${args.join(' ')}`, {
      encoding: 'utf8',
      env: { ...process.env, MOCK_MODE: 'true', TEST_MODE: 'true' },
      cwd: PROJECT_ROOT
    });
    return { success: true, output, mockScriptPath, tempDir };
  } catch (error) {
    return {
      success: false,
      output: error.stdout,
      error: error.stderr,
      code: error.status,
      mockScriptPath,
      tempDir
    };
  }
}

// Cleanup temp dirs
function cleanupTempDirs(tempDirs) {
  for (const dir of tempDirs) {
    if (dir && fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
}

describe('Build Scripts Idempotency', () => {
  const tempDirs = [];
  
  afterAll(() => {
    cleanupTempDirs(tempDirs);
  });
  
  describe('build.sh', () => {
    const scriptPath = path.join(SCRIPTS_DIR, 'build.sh');
    
    test('build script is idempotent', () => {
      // Skip if script doesn't exist
      if (!fs.existsSync(scriptPath)) {
        console.warn(`Script not found: ${scriptPath}`);
        return;
      }
      
      // Mock commands that actually build things
      const mockReplacements = {
        'npm run build': 'echo "MOCK: npm run build"',
        'go build': 'echo "MOCK: go build"',
        'python -m pip install': 'echo "MOCK: python -m pip install"'
      };
      
      // First run
      const firstRun = mockAndRunScript(scriptPath, mockReplacements, ['--dry-run']);
      tempDirs.push(firstRun.tempDir);
      expect(firstRun.success).toBe(true);
      
      // Second run with the same parameters
      const secondRun = mockAndRunScript(scriptPath, mockReplacements, ['--dry-run']);
      tempDirs.push(secondRun.tempDir);
      expect(secondRun.success).toBe(true);
      
      // Both runs should succeed, indicating idempotency
    });
  });
  
  describe('build-containers.sh', () => {
    const scriptPath = path.join(SCRIPTS_DIR, 'build-containers.sh');
    
    test('container build script is idempotent', () => {
      // Skip if script doesn't exist
      if (!fs.existsSync(scriptPath)) {
        console.warn(`Script not found: ${scriptPath}`);
        return;
      }
      
      // Mock container build commands
      const mockReplacements = {
        'podman build': 'echo "MOCK: podman build"',
        'podman-compose build': 'echo "MOCK: podman-compose build"',
        'docker build': 'echo "MOCK: docker build"',
        'docker-compose build': 'echo "MOCK: docker-compose build"'
      };
      
      // First run
      const firstRun = mockAndRunScript(scriptPath, mockReplacements, ['--dry-run']);
      tempDirs.push(firstRun.tempDir);
      expect(firstRun.success).toBe(true);
      
      // Second run
      const secondRun = mockAndRunScript(scriptPath, mockReplacements, ['--dry-run']);
      tempDirs.push(secondRun.tempDir);
      expect(secondRun.success).toBe(true);
      
      // Both runs should succeed, indicating idempotency
    });
  });
  
  describe('master-build.sh', () => {
    const scriptPath = path.join(SCRIPTS_DIR, 'master-build.sh');
    
    test('master build script is idempotent', () => {
      // Skip if script doesn't exist
      if (!fs.existsSync(scriptPath)) {
        console.warn(`Script not found: ${scriptPath}`);
        return;
      }
      
      // Mock all commands that do actual work
      const mockReplacements = {
        'npm test': 'echo "MOCK: npm test"',
        'npm run build': 'echo "MOCK: npm run build"',
        'go test': 'echo "MOCK: go test"',
        'go build': 'echo "MOCK: go build"',
        'python -m pytest': 'echo "MOCK: python -m pytest"',
        'podman build': 'echo "MOCK: podman build"',
        'docker build': 'echo "MOCK: docker build"'
      };
      
      // First run
      const firstRun = mockAndRunScript(scriptPath, mockReplacements, ['--dry-run']);
      tempDirs.push(firstRun.tempDir);
      expect(firstRun.success).toBe(true);
      
      // Second run
      const secondRun = mockAndRunScript(scriptPath, mockReplacements, ['--dry-run']);
      tempDirs.push(secondRun.tempDir);
      expect(secondRun.success).toBe(true);
      
      // Both runs should succeed, indicating idempotency
    });
  });
});

describe('Deployment Scripts Idempotency', () => {
  const tempDirs = [];
  
  afterAll(() => {
    cleanupTempDirs(tempDirs);
  });
  
  describe('deploy.sh', () => {
    const scriptPath = path.join(SCRIPTS_DIR, 'deploy.sh');
    
    test('deployment script is idempotent', () => {
      // Skip if script doesn't exist
      if (!fs.existsSync(scriptPath)) {
        console.warn(`Script not found: ${scriptPath}`);
        return;
      }
      
      // Mock deployment commands
      const mockReplacements = {
        'podman push': 'echo "MOCK: podman push"',
        'docker push': 'echo "MOCK: docker push"',
        'ssh': 'echo "MOCK: ssh"',
        'scp': 'echo "MOCK: scp"'
      };
      
      // First run with dry-run flag
      const firstRun = mockAndRunScript(scriptPath, mockReplacements, ['--dry-run']);
      tempDirs.push(firstRun.tempDir);
      expect(firstRun.success).toBe(true);
      
      // Second run with the same parameters
      const secondRun = mockAndRunScript(scriptPath, mockReplacements, ['--dry-run']);
      tempDirs.push(secondRun.tempDir);
      expect(secondRun.success).toBe(true);
      
      // Both runs should succeed, indicating idempotency
    });
  });
  
  describe('start-containers.sh', () => {
    const scriptPath = path.join(SCRIPTS_DIR, 'start-containers.sh');
    
    test('container start script is idempotent', () => {
      // Skip if script doesn't exist
      if (!fs.existsSync(scriptPath)) {
        console.warn(`Script not found: ${scriptPath}`);
        return;
      }
      
      // Mock container commands
      const mockReplacements = {
        'podman-compose up': 'echo "MOCK: podman-compose up"',
        'docker-compose up': 'echo "MOCK: docker-compose up"',
        'podman start': 'echo "MOCK: podman start"',
        'docker start': 'echo "MOCK: docker start"'
      };
      
      // First run
      const firstRun = mockAndRunScript(scriptPath, mockReplacements);
      tempDirs.push(firstRun.tempDir);
      expect(firstRun.success).toBe(true);
      
      // Second run
      const secondRun = mockAndRunScript(scriptPath, mockReplacements);
      tempDirs.push(secondRun.tempDir);
      expect(secondRun.success).toBe(true);
      
      // Both runs should succeed, indicating idempotency
    });
  });
  
  describe('stop-containers.sh', () => {
    const scriptPath = path.join(SCRIPTS_DIR, 'stop-containers.sh');
    
    test('container stop script is idempotent', () => {
      // Skip if script doesn't exist
      if (!fs.existsSync(scriptPath)) {
        console.warn(`Script not found: ${scriptPath}`);
        return;
      }
      
      // Mock container commands
      const mockReplacements = {
        'podman-compose down': 'echo "MOCK: podman-compose down"',
        'docker-compose down': 'echo "MOCK: docker-compose down"',
        'podman stop': 'echo "MOCK: podman stop"',
        'docker stop': 'echo "MOCK: docker stop"'
      };
      
      // First run
      const firstRun = mockAndRunScript(scriptPath, mockReplacements);
      tempDirs.push(firstRun.tempDir);
      expect(firstRun.success).toBe(true);
      
      // Second run (stopping already stopped containers)
      const secondRun = mockAndRunScript(scriptPath, mockReplacements);
      tempDirs.push(secondRun.tempDir);
      expect(secondRun.success).toBe(true);
      
      // Both runs should succeed, indicating idempotency
    });
  });
});