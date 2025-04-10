function fn() {
  // Configure environments
  var env = karate.env || 'dev';
  karate.log('Karate environment:', env);
  
  // Base configuration that's common to all environments
  var config = {
    // Base URLs for different services
    apiBaseUrl: 'http://localhost:8080/api',
    orchestratorBaseUrl: 'http://localhost:8000/api',
    binaryProcessorBaseUrl: 'http://localhost:8090/api',
    
    // Common test data
    testCase: {
      id: 'TC-1234',
      name: 'Login functionality',
      description: 'Verify user can login with valid credentials',
      priority: 'High',
      status: 'Ready'
    },
    
    // Auth token generator function
    getAuthToken: function() {
      return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlRlc3QgVXNlciIsImlhdCI6MTUxNjIzOTAyMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    }
  };
  
  // Environment-specific configurations
  if (env === 'dev') {
    // Development-specific settings
    config.mockEnabled = true;
  } else if (env === 'qa') {
    // QA-specific settings
    config.apiBaseUrl = 'http://qa-api.internal:8080/api';
    config.orchestratorBaseUrl = 'http://qa-orchestrator.internal:8000/api';
    config.binaryProcessorBaseUrl = 'http://qa-binary.internal:8090/api';
    config.mockEnabled = false;
  } else if (env === 'prod') {
    // Production-specific settings
    config.apiBaseUrl = 'https://api.skidbladnir.org/api';
    config.orchestratorBaseUrl = 'https://orchestrator.skidbladnir.org/api';
    config.binaryProcessorBaseUrl = 'https://binary.skidbladnir.org/api';
    config.mockEnabled = false;
  } else if (env === 'perf') {
    // Performance testing specific settings
    config.apiBaseUrl = 'http://perf-api.internal:8080/api';
    config.orchestratorBaseUrl = 'http://perf-orchestrator.internal:8000/api';
    config.binaryProcessorBaseUrl = 'http://perf-binary.internal:8090/api';
    config.mockEnabled = false;
    config.threadCount = 10;
    config.iterationCount = 100;
  }
  
  // Add authorization header to all requests
  var authToken = config.getAuthToken();
  karate.configure('headers', { 
    'Authorization': 'Bearer ' + authToken,
    'Content-Type': 'application/json'
  });
  
  return config;
}