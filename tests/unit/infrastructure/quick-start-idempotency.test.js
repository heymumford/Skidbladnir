/**
 * Quick Start Script Idempotency Tests
 * 
 * These tests verify that the quick-start.sh script can be run multiple times 
 * without errors or unexpected side effects, ensuring a smooth user experience.
 */

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Path to project root
const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const SCRIPTS_DIR = path.join(PROJECT_ROOT, 'scripts');
const QUICK_START_SCRIPT = path.join(SCRIPTS_DIR, 'quick-start.sh');

// Create a mock version of quick-start.sh for testing
function createMockQuickStartScript() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quick-start-test-'));
  const mockScriptPath = path.join(tempDir, 'quick-start-mock.sh');
  
  // Read the original script
  const originalScript = fs.readFileSync(QUICK_START_SCRIPT, 'utf8');
  
  // Create a modified version that doesn't actually run containers or open browsers
  // but still sets up directories and other resources for idempotency testing
  const mockScript = originalScript
    .replace(/podman-compose up -d/g, 'echo "MOCK: podman-compose up -d"')
    .replace(/docker-compose up -d/g, 'echo "MOCK: docker-compose up -d"')
    .replace(/open http:/g, 'echo "MOCK: open http:')
    .replace(/xdg-open http:/g, 'echo "MOCK: xdg-open http:')
    .replace(/start http:/g, 'echo "MOCK: start http:');
  
  // Write the mock script
  fs.writeFileSync(mockScriptPath, mockScript, { mode: 0o755 });
  
  return { mockScriptPath, tempDir };
}

// Run the quick-start script in test mode
function runQuickStartTest(scriptPath, args = []) {
  console.log(`Running mock quick-start with args: ${args.join(' ')}`);
  
  const result = spawnSync('bash', [scriptPath, ...args], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, TEST_MODE: 'true' },
    stdio: 'pipe',
    encoding: 'utf8'
  });
  
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    success: result.status === 0
  };
}

describe('Quick Start Script Idempotency', () => {
  let mockScriptPath;
  let tempDir;
  
  beforeAll(() => {
    const mock = createMockQuickStartScript();
    mockScriptPath = mock.mockScriptPath;
    tempDir = mock.tempDir;
  });
  
  afterAll(() => {
    // Clean up the temp directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
  
  test('quick-start script exists', () => {
    expect(fs.existsSync(QUICK_START_SCRIPT)).toBe(true);
  });
  
  test('quick-start script is executable', () => {
    const stats = fs.statSync(QUICK_START_SCRIPT);
    const isExecutable = !!(stats.mode & 0o111);
    expect(isExecutable).toBe(true);
  });
  
  test('quick-start mock script can be run', () => {
    const result = runQuickStartTest(mockScriptPath, ['--dry-run']);
    expect(result.success).toBe(true);
  });
  
  test('quick-start script is idempotent', () => {
    // First run with test/dryrun mode
    const firstRun = runQuickStartTest(mockScriptPath, ['--dry-run']);
    expect(firstRun.success).toBe(true);
    
    // Second run with the same parameters
    const secondRun = runQuickStartTest(mockScriptPath, ['--dry-run']);
    expect(secondRun.success).toBe(true);
    
    // The script should be resilient to being run multiple times
    // Note: We're checking for success rather than identical output
    // because timestamps and other variable output might differ
  });
  
  test('quick-start script handles --help flag idempotently', () => {
    const firstRun = runQuickStartTest(mockScriptPath, ['--help']);
    const secondRun = runQuickStartTest(mockScriptPath, ['--help']);
    
    expect(firstRun.success).toBe(true);
    expect(secondRun.success).toBe(true);
    
    // Help output should be identical between runs
    expect(secondRun.stdout).toBe(firstRun.stdout);
  });
  
  test('quick-start script handles invalid flags idempotently', () => {
    const firstRun = runQuickStartTest(mockScriptPath, ['--invalid-flag']);
    const secondRun = runQuickStartTest(mockScriptPath, ['--invalid-flag']);
    
    // Both runs should fail in the same way
    expect(firstRun.success).toBe(secondRun.success);
    
    // The error code should be the same
    expect(firstRun.status).toBe(secondRun.status);
  });
  
  test('quick-start script handles existing environment idempotently', () => {
    // First run to set up the environment
    const firstRun = runQuickStartTest(mockScriptPath, ['--dry-run']);
    expect(firstRun.success).toBe(true);
    
    // Second run should detect the existing environment and handle it gracefully
    const secondRun = runQuickStartTest(mockScriptPath, ['--dry-run']);
    expect(secondRun.success).toBe(true);
    
    // We can't check for exact output matches due to timestamps, but
    // we can check that both runs succeed, indicating idempotency
  });
});