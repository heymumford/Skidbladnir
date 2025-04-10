Feature: Zephyr Error Mock API
  This feature mocks the Zephyr API with intermittent errors to test resilience

  Background:
    * def testCases = {}
    * def errorCounter = {}
    * def nextId = 1000
    
    # Track request counts per endpoint to trigger errors at specific intervals
    * def endpoint = function(method, path) { return method + ':' + path; }
    * def shouldFail = function(ep) {
        if (!errorCounter[ep]) errorCounter[ep] = 0;
        errorCounter[ep]++;
        // Fail on first and second tries, succeed on third
        return errorCounter[ep] % 3 !== 0;
      }
    
    * def generateId = function(){ return 'TC-MOCK-' + (nextId++); }
    
    * def defaultTestCase = 
    """
    {
      id: 'TC-1234',
      name: 'Login Test Case',
      description: 'Verify user can login successfully',
      priority: 'High',
      status: 'Ready',
      steps: [
        { id: 'step-1', description: 'Navigate to login page', expectedResult: 'Login page displayed' },
        { id: 'step-2', description: 'Enter valid credentials', expectedResult: 'User logged in successfully' }
      ],
      attachments: []
    }
    """
    
    # Initialize with some test data
    * eval testCases['TC-1234'] = defaultTestCase

  Scenario: pathMatches('/api/zephyr/status') && methodIs('get')
    * def ep = endpoint('GET', '/api/zephyr/status')
    * def shouldError = shouldFail(ep)
    
    * if (shouldError) {
        def responseStatus = 503
        def response = { error: 'Service Unavailable', message: 'The service is temporarily unavailable', timestamp: new Date().toISOString() }
      } else {
        def responseStatus = 200
        def response = { status: 'UP', name: 'Zephyr Mock API', version: '1.0.0' }
      }

  Scenario: pathMatches('/api/zephyr/test-cases') && methodIs('get')
    * def ep = endpoint('GET', '/api/zephyr/test-cases')
    * def shouldError = shouldFail(ep)
    
    * if (shouldError) {
        def responseStatus = 500
        def response = { error: 'Internal Server Error', message: 'An unexpected error occurred', timestamp: new Date().toISOString() }
      } else {
        def testCaseList = []
        def eval for(var key in testCases) testCaseList.push(testCases[key])
        def responseStatus = 200
        def response = { testCases: testCaseList, pagination: { total: testCaseList.length, page: 1, pageSize: 10 } }
      }

  Scenario: pathMatches('/api/zephyr/test-cases/(.+)') && methodIs('get')
    * def id = pathParams[0]
    * def ep = endpoint('GET', '/api/zephyr/test-cases/' + id)
    * def shouldError = shouldFail(ep)
    
    * if (shouldError) {
        def responseStatus = Math.random() < 0.5 ? 500 : 429 // Mix of internal errors and rate limiting
        def response = responseStatus === 500 ? 
                      { error: 'Internal Server Error', message: 'An unexpected error occurred', timestamp: new Date().toISOString() } :
                      { error: 'Too Many Requests', message: 'Rate limit exceeded', timestamp: new Date().toISOString() }
      } else {
        def testCase = testCases[id]
        def responseStatus = testCase ? 200 : 404
        def response = testCase ? testCase : { error: 'Test case not found' }
      }

  Scenario: pathMatches('/api/zephyr/test-cases') && methodIs('post')
    * def ep = endpoint('POST', '/api/zephyr/test-cases')
    * def shouldError = shouldFail(ep)
    
    * if (shouldError) {
        def responseStatus = 503
        def response = { error: 'Service Unavailable', message: 'The service is temporarily unavailable', timestamp: new Date().toISOString() }
      } else {
        def testCase = request
        def id = testCase.id || generateId()
        testCase.id = id
        eval testCases[id] = testCase
        def responseStatus = 201
        def response = testCase
      }

  Scenario: pathMatches('/api/zephyr/test-cases/(.+)/attachments') && methodIs('get')
    * def id = pathParams[0]
    * def ep = endpoint('GET', '/api/zephyr/test-cases/' + id + '/attachments')
    * def shouldError = shouldFail(ep)
    
    * if (shouldError) {
        def responseStatus = 502
        def response = { error: 'Bad Gateway', message: 'Error connecting to upstream service', timestamp: new Date().toISOString() }
      } else {
        def testCase = testCases[id]
        def responseStatus = testCase ? 200 : 404
        def response = testCase ? testCase.attachments : { error: 'Test case not found' }
      }

  Scenario: pathMatches('/api/zephyr/test-cases/(.+)/attachments') && methodIs('post')
    * def id = pathParams[0]
    * def ep = endpoint('POST', '/api/zephyr/test-cases/' + id + '/attachments')
    * def shouldError = shouldFail(ep)
    
    * if (shouldError) {
        def responseStatus = 503
        def response = { error: 'Service Unavailable', message: 'The service is temporarily unavailable', timestamp: new Date().toISOString() }
      } else {
        def testCase = testCases[id]
        def responseStatus = testCase ? 201 : 404
        
        if (testCase) {
          if (!testCase.attachments) testCase.attachments = [];
          request.id = 'attach-' + Date.now();
          testCase.attachments.push(request);
          response = request;
        } else {
          response = { error: 'Test case not found' };
        }
      }