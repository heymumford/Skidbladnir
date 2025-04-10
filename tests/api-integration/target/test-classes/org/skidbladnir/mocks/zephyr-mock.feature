Feature: Zephyr Mock API

  Background:
    * def testCases = {}
    * def nextId = 1000
    
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
    * def response = { status: 'UP', name: 'Zephyr Mock API', version: '1.0.0' }

  Scenario: pathMatches('/api/zephyr/test-cases') && methodIs('get')
    * def response = { testCases: [], pagination: { total: 0, page: 1, pageSize: 10 } }
    * def testCaseList = []
    * eval for(var key in testCases) testCaseList.push(testCases[key])
    * def response = { testCases: testCaseList, pagination: { total: testCaseList.length, page: 1, pageSize: 10 } }

  Scenario: pathMatches('/api/zephyr/test-cases/(.+)') && methodIs('get')
    * def id = pathParams[0]
    * def testCase = testCases[id]
    * def responseStatus = testCase ? 200 : 404
    * def response = testCase ? testCase : { error: 'Test case not found' }

  Scenario: pathMatches('/api/zephyr/test-cases') && methodIs('post')
    * def testCase = request
    * def id = testCase.id || generateId()
    * testCase.id = id
    * eval testCases[id] = testCase
    * def responseStatus = 201
    * def response = testCase

  Scenario: pathMatches('/api/zephyr/test-cases/(.+)') && methodIs('put')
    * def id = pathParams[0]
    * def exists = testCases[id] != null
    * def responseStatus = exists ? 200 : 404
    
    * if (exists) {
        var existing = testCases[id];
        for (var key in request) {
          existing[key] = request[key];
        }
        testCases[id] = existing;
        response = existing;
      } else {
        response = { error: 'Test case not found' };
      }

  Scenario: pathMatches('/api/zephyr/test-cases/(.+)/attachments') && methodIs('get')
    * def id = pathParams[0]
    * def testCase = testCases[id]
    * def responseStatus = testCase ? 200 : 404
    * def response = testCase ? testCase.attachments : { error: 'Test case not found' }

  Scenario: pathMatches('/api/zephyr/test-cases/(.+)/attachments') && methodIs('post')
    * def id = pathParams[0]
    * def testCase = testCases[id]
    * def responseStatus = testCase ? 201 : 404
    
    * if (testCase) {
        if (!testCase.attachments) testCase.attachments = [];
        request.id = 'attach-' + Date.now();
        testCase.attachments.push(request);
        response = request;
      } else {
        response = { error: 'Test case not found' };
      }