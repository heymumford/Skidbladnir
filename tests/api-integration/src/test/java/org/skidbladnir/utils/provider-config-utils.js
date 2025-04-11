/**
 * Utility functions for provider configurations in tests
 */

// Default Zephyr configuration for tests
const DEFAULT_ZEPHYR_CONFIG = {
  url: 'https://zephyr-test.example.com',
  apiToken: 'zephyr-test-token',
  projectId: 'TEST',
  options: {
    apiVersion: 'v1'
  }
};

// Default qTest configuration for tests
const DEFAULT_QTEST_CONFIG = {
  url: 'https://qtest-test.example.com',
  apiToken: 'qtest-test-token',
  projectId: 123,
  options: {
    apiVersion: 'v3'
  }
};

// Default Micro Focus ALM configuration for tests
const DEFAULT_MICROFOCUS_CONFIG = {
  url: 'https://microfocus-test.example.com',
  username: 'test-user',
  password: 'test-password',
  domain: 'DEFAULT',
  project: 'TEST',
  options: {
    apiVersion: 'v1',
    useSSO: false
  }
};

// Default TestRail configuration for tests
const DEFAULT_TESTRAIL_CONFIG = {
  url: 'https://testrail-test.example.com',
  username: 'test@example.com',
  apiKey: 'testrail-test-key',
  projectId: 1,
  suiteId: 1
};

// Default Jama configuration for tests
const DEFAULT_JAMA_CONFIG = {
  url: 'https://jama-test.example.com',
  clientId: 'jama-client-id',
  clientSecret: 'jama-client-secret',
  projectId: 123
};

/**
 * Gets Zephyr configuration, merging with provided overrides
 * 
 * @param {object} overrides - Optional configuration overrides
 * @returns {object} Zephyr configuration
 */
function getZephyrConfig(overrides) {
  return { ...DEFAULT_ZEPHYR_CONFIG, ...overrides };
}

/**
 * Gets qTest configuration, merging with provided overrides
 * 
 * @param {object} overrides - Optional configuration overrides
 * @returns {object} qTest configuration
 */
function getQTestConfig(overrides) {
  return { ...DEFAULT_QTEST_CONFIG, ...overrides };
}

/**
 * Gets Micro Focus ALM configuration, merging with provided overrides
 * 
 * @param {object} overrides - Optional configuration overrides
 * @returns {object} Micro Focus ALM configuration
 */
function getMicroFocusConfig(overrides) {
  return { ...DEFAULT_MICROFOCUS_CONFIG, ...overrides };
}

/**
 * Gets TestRail configuration, merging with provided overrides
 * 
 * @param {object} overrides - Optional configuration overrides
 * @returns {object} TestRail configuration
 */
function getTestRailConfig(overrides) {
  return { ...DEFAULT_TESTRAIL_CONFIG, ...overrides };
}

/**
 * Gets Jama configuration, merging with provided overrides
 * 
 * @param {object} overrides - Optional configuration overrides
 * @returns {object} Jama configuration
 */
function getJamaConfig(overrides) {
  return { ...DEFAULT_JAMA_CONFIG, ...overrides };
}

// Export config utilities
module.exports = {
  getZephyrConfig: getZephyrConfig,
  getQTestConfig: getQTestConfig,
  getMicroFocusConfig: getMicroFocusConfig,
  getTestRailConfig: getTestRailConfig,
  getJamaConfig: getJamaConfig
};