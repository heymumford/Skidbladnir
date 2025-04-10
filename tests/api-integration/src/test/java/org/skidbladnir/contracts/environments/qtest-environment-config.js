function fn() {
  // Common configuration for qTest API environment testing
  
  // Base environment configuration - this would typically be loaded
  // from environment variables or a secure configuration store
  var environmentConfig = {
    dev: {
      baseUrl: 'https://dev-api.qtest.com/api/v3',
      apiKey: java.lang.System.getenv('QTEST_DEV_API_KEY') || 'dev-api-key',
      projectId: java.lang.System.getenv('QTEST_DEV_PROJECT_ID') || '12345'
    },
    qa: {
      baseUrl: 'https://qa-api.qtest.com/api/v3',
      apiKey: java.lang.System.getenv('QTEST_QA_API_KEY') || 'qa-api-key',
      projectId: java.lang.System.getenv('QTEST_QA_PROJECT_ID') || '23456'
    },
    prod: {
      baseUrl: 'https://api.qtest.com/api/v3',
      apiKey: java.lang.System.getenv('QTEST_PROD_API_KEY') || 'prod-api-key',
      projectId: java.lang.System.getenv('QTEST_PROD_PROJECT_ID') || '34567'
    }
  };
  
  // Determine which environments to test
  // By default, include all environments, but this can be controlled via environment variables
  var testEnvironments = [];
  
  // Check which environments should be tested
  if (java.lang.System.getenv('QTEST_TEST_DEV') !== 'false') {
    testEnvironments.push('dev');
  }
  
  if (java.lang.System.getenv('QTEST_TEST_QA') !== 'false') {
    testEnvironments.push('qa');
  }
  
  if (java.lang.System.getenv('QTEST_TEST_PROD') !== 'false') {
    testEnvironments.push('prod');
  }
  
  // If no environments are explicitly included, default to testing QA
  if (testEnvironments.length === 0) {
    testEnvironments.push('qa');
  }
  
  // Configuration for test timeouts
  var timeoutConfig = {
    defaultTimeout: 10000,
    longTimeout: 30000,
    connectionTimeout: 5000
  };
  
  return {
    environments: environmentConfig,
    testEnvironments: testEnvironments,
    timeouts: timeoutConfig,
    
    // Helper function to check if an environment should be tested
    shouldTestEnvironment: function(env) {
      return testEnvironments.indexOf(env) !== -1;
    },
    
    // Provide environment-specific API keys
    qtestDevApiKey: environmentConfig.dev.apiKey,
    qtestQaApiKey: environmentConfig.qa.apiKey,
    qtestProdApiKey: environmentConfig.prod.apiKey
  };
}