/**
 * Comprehensive workflow utilities for provider-related operations
 */

/**
 * Capitalizes the first letter of a string
 * 
 * @param {string} str - The string to capitalize
 * @returns {string} The capitalized string
 */
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Creates a test case in the specified provider
 * 
 * @param {string} provider - The provider name
 * @param {object} config - The provider configuration
 * @param {object} testCase - The test case to create
 * @returns {object} The created test case with ID
 */
function createTestCaseInProvider(provider, config, testCase) {
  try {
    const result = karate.call('classpath:org/skidbladnir/utils/create-' + provider + '-testcase.feature', 
      { config: config, testCase: testCase });
    return {
      id: result.testCaseId,
      name: testCase.name,
      provider: provider
    };
  } catch (e) {
    karate.log('Error creating test case in provider:', provider, e);
    return { id: null, error: e.message };
  }
}

/**
 * Creates a test suite in the specified provider
 * 
 * @param {string} provider - The provider name
 * @param {object} config - The provider configuration
 * @param {object} suite - The test suite to create
 * @returns {object} The created test suite with ID
 */
function createTestSuiteInProvider(provider, config, suite) {
  try {
    const result = karate.call('classpath:org/skidbladnir/utils/create-' + provider + '-testsuite.feature', 
      { config: config, suite: suite });
    return {
      id: result.testSuiteId,
      name: suite.name,
      provider: provider
    };
  } catch (e) {
    karate.log('Error creating test suite in provider:', provider, e);
    return { id: null, error: e.message };
  }
}

/**
 * Creates a test execution in the specified provider
 * 
 * @param {string} provider - The provider name
 * @param {object} config - The provider configuration
 * @param {object} execution - The test execution to create
 * @returns {object} The created test execution with ID
 */
function createTestExecutionInProvider(provider, config, execution) {
  try {
    const result = karate.call('classpath:org/skidbladnir/utils/create-' + provider + '-execution.feature', 
      { config: config, execution: execution });
    return {
      id: result.executionId,
      testCaseId: execution.testCaseId,
      status: execution.status,
      provider: provider
    };
  } catch (e) {
    karate.log('Error creating test execution in provider:', provider, e);
    return { id: null, error: e.message };
  }
}

/**
 * Verifies a test case in the specified provider
 * 
 * @param {string} provider - The provider name
 * @param {object} config - The provider configuration
 * @param {string} testCaseId - The test case ID to verify
 * @returns {object} The verification result with the test case
 */
function verifyTestCaseInProvider(provider, config, testCaseId) {
  try {
    const result = karate.call('classpath:org/skidbladnir/utils/verify-' + provider + '-testcase.feature', 
      { config: config, testCaseId: testCaseId });
    return {
      testCase: result.testCase,
      verified: true,
      provider: provider
    };
  } catch (e) {
    karate.log('Error verifying test case in provider:', provider, e);
    return { verified: false, error: e.message };
  }
}

/**
 * Verifies a test suite in the specified provider
 * 
 * @param {string} provider - The provider name
 * @param {object} config - The provider configuration
 * @param {string} testSuiteId - The test suite ID to verify
 * @returns {object} The verification result with the test suite
 */
function verifyTestSuiteInProvider(provider, config, testSuiteId) {
  try {
    const result = karate.call('classpath:org/skidbladnir/utils/verify-' + provider + '-testsuite.feature', 
      { config: config, testSuiteId: testSuiteId });
    return {
      testSuite: result.testSuite,
      verified: true,
      provider: provider
    };
  } catch (e) {
    karate.log('Error verifying test suite in provider:', provider, e);
    return { verified: false, error: e.message };
  }
}

/**
 * Verifies a test execution in the specified provider
 * 
 * @param {string} provider - The provider name
 * @param {object} config - The provider configuration
 * @param {string} executionId - The test execution ID to verify
 * @returns {object} The verification result with the test execution
 */
function verifyTestExecutionInProvider(provider, config, executionId) {
  try {
    const result = karate.call('classpath:org/skidbladnir/utils/verify-' + provider + '-execution.feature', 
      { config: config, executionId: executionId });
    return {
      execution: result.execution,
      verified: true,
      provider: provider
    };
  } catch (e) {
    karate.log('Error verifying test execution in provider:', provider, e);
    return { verified: false, error: e.message };
  }
}

/**
 * Cleans up a test case in the specified provider
 * 
 * @param {string} provider - The provider name
 * @param {object} config - The provider configuration
 * @param {string} testCaseId - The test case ID to clean up
 * @returns {boolean} Success status
 */
function cleanupTestCase(provider, config, testCaseId) {
  if (!testCaseId) return false;
  
  try {
    karate.call('classpath:org/skidbladnir/utils/cleanup-testcase.feature', 
      { provider: provider, config: config, testCaseId: testCaseId });
    return true;
  } catch (e) {
    karate.log('Error cleaning up test case:', provider, testCaseId, e);
    return false;
  }
}

/**
 * Cleans up a test suite in the specified provider
 * 
 * @param {string} provider - The provider name
 * @param {object} config - The provider configuration
 * @param {string} testSuiteId - The test suite ID to clean up
 * @returns {boolean} Success status
 */
function cleanupTestSuite(provider, config, testSuiteId) {
  if (!testSuiteId) return false;
  
  try {
    karate.call('classpath:org/skidbladnir/utils/cleanup-testsuite.feature', 
      { provider: provider, config: config, testSuiteId: testSuiteId });
    return true;
  } catch (e) {
    karate.log('Error cleaning up test suite:', provider, testSuiteId, e);
    return false;
  }
}

/**
 * Cleans up a test execution in the specified provider
 * 
 * @param {string} provider - The provider name
 * @param {object} config - The provider configuration
 * @param {string} executionId - The test execution ID to clean up
 * @returns {boolean} Success status
 */
function cleanupTestExecution(provider, config, executionId) {
  if (!executionId) return false;
  
  try {
    karate.call('classpath:org/skidbladnir/utils/cleanup-execution.feature', 
      { provider: provider, config: config, executionId: executionId });
    return true;
  } catch (e) {
    karate.log('Error cleaning up test execution:', provider, executionId, e);
    return false;
  }
}

/**
 * Gets default field mapping between source and target providers
 * 
 * @param {string} source - Source provider name
 * @param {string} target - Target provider name
 * @returns {object} Field mapping configuration
 */
function getDefaultFieldMapping(source, target) {
  // Common field mappings between different providers
  const mappingKey = source + '-to-' + target;
  
  const mappings = {
    'zephyr-to-qtest': {
      'name': 'name',
      'description': 'description',
      'priority': 'priority',
      'status': 'status',
      'steps[].description': 'test_steps[].description',
      'steps[].expectedResult': 'test_steps[].expected_result',
      'folder': 'parent_id'
    },
    'zephyr-to-testrail': {
      'name': 'title',
      'description': 'custom_description',
      'priority': 'priority_id',
      'steps[].description': 'custom_steps_separated[].content',
      'steps[].expectedResult': 'custom_steps_separated[].expected'
    },
    'qtest-to-zephyr': {
      'name': 'name',
      'description': 'description',
      'properties.priority': 'priority',
      'properties.status': 'status',
      'test_steps[].description': 'steps[].description',
      'test_steps[].expected_result': 'steps[].expectedResult'
    }
  };
  
  // Get specific mapping or create a generic one
  return mappings[mappingKey] || createGenericMapping(source, target);
}

/**
 * Creates a generic field mapping between providers based on common field patterns
 * 
 * @param {string} source - Source provider name
 * @param {string} target - Target provider name
 * @returns {object} Generic field mapping
 */
function createGenericMapping(source, target) {
  // Common field names across providers with their variations
  const nameFields = ['name', 'title', 'Name'];
  const descFields = ['description', 'custom_description', 'Description'];
  const priorityFields = ['priority', 'priority_id', 'Priority'];
  const statusFields = ['status', 'Status'];
  
  // Map source to target fields based on common patterns
  const mapping = {};
  const fieldPatterns = {
    name: { source: nameFields, target: nameFields },
    description: { source: descFields, target: descFields },
    priority: { source: priorityFields, target: priorityFields },
    status: { source: statusFields, target: statusFields }
  };
  
  // Generate generic mappings
  for (const field in fieldPatterns) {
    const sourceField = fieldPatterns[field].source.find(f => isFieldInProvider(source, f));
    const targetField = fieldPatterns[field].target.find(f => isFieldInProvider(target, f));
    
    if (sourceField && targetField) {
      mapping[sourceField] = targetField;
    }
  }
  
  return mapping;
}

/**
 * Checks if a field is typically used in a specific provider
 * 
 * @param {string} provider - The provider name
 * @param {string} field - The field name to check
 * @returns {boolean} Whether the field is typically used in the provider
 */
function isFieldInProvider(provider, field) {
  // Simplified logic - in a real implementation, this would contain
  // provider-specific field name patterns
  return true;
}

// Export the utility functions
module.exports = {
  capitalize: capitalize,
  createTestCaseInProvider: createTestCaseInProvider,
  createTestSuiteInProvider: createTestSuiteInProvider,
  createTestExecutionInProvider: createTestExecutionInProvider,
  verifyTestCaseInProvider: verifyTestCaseInProvider,
  verifyTestSuiteInProvider: verifyTestSuiteInProvider,
  verifyTestExecutionInProvider: verifyTestExecutionInProvider,
  cleanupTestCase: cleanupTestCase,
  cleanupTestSuite: cleanupTestSuite,
  cleanupTestExecution: cleanupTestExecution,
  getDefaultFieldMapping: getDefaultFieldMapping
};