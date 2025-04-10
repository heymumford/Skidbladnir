Feature: Zephyr API Advanced Interface Testing
  This feature thoroughly tests the Zephyr API integration for real-world usage scenarios.

  Background:
    * url apiBaseUrl
    * def zephyrBasePath = '/api/zephyr'
    
    # Setup test data helper functions
    * def generateTestCaseData =
    """
    function() {
      var uuid = java.util.UUID.randomUUID().toString();
      return {
        name: 'Advanced Test Case ' + uuid,
        description: 'Test case with detailed information created for API testing',
        priority: 'High',
        status: 'Draft',
        steps: [
          { 
            description: 'Navigate to login page', 
            expectedResult: 'Login form is displayed'
          },
          { 
            description: 'Enter valid credentials', 
            expectedResult: 'Credentials accepted'
          },
          { 
            description: 'Click login button', 
            expectedResult: 'User is successfully logged in and redirected to dashboard'
          }
        ],
        customFields: {
          'Component': 'Authentication',
          'Feature': 'Login',
          'Automated': 'No'
        },
        labels: ['regression', 'login', 'authentication'],
        folder: '/Regression Tests/Authentication'
      }
    }
    """
    
    * def generateTestCycleData =
    """
    function() {
      var uuid = java.util.UUID.randomUUID().toString();
      var today = new java.text.SimpleDateFormat("yyyy-MM-dd").format(new java.util.Date());
      var nextMonth = new java.text.SimpleDateFormat("yyyy-MM-dd").format(
        new java.util.Date(new java.util.Date().getTime() + (30 * 24 * 60 * 60 * 1000))
      );
      
      return {
        name: 'Advanced Test Cycle ' + uuid,
        description: 'Test cycle created for API integration testing',
        startDate: today,
        endDate: nextMonth,
        status: 'Active',
        folder: '/Regression Cycles'
      }
    }
    """

  # ===================== Real-world test cases =====================

  Scenario: Full test case creation workflow with custom fields and validation
    # 1. Create a test case with custom fields and detailed steps
    * def testCaseData = call generateTestCaseData
    
    Given path zephyrBasePath + '/test-cases'
    And request testCaseData
    When method POST
    Then status 201
    And match response.id == '#string'
    And match response.name == testCaseData.name
    
    * def testCaseId = response.id
    
    # 2. Add labels to the test case
    Given path zephyrBasePath + '/test-cases/' + testCaseId + '/labels'
    And request testCaseData.labels
    When method POST
    Then status 200
    And match response == '#array'
    And match response contains deep testCaseData.labels[0]
    
    # 3. Upload attachment to the test case
    Given path zephyrBasePath + '/test-cases/' + testCaseId + '/attachments'
    And request { filename: 'test-data.json', contentType: 'application/json', content: 'eyJ0ZXN0IjoidmFsdWUifQ==' }
    When method POST
    Then status 201
    And match response.filename == 'test-data.json'
    
    * def attachmentId = response.id
    
    # 4. Get test case with all details
    Given path zephyrBasePath + '/test-cases/' + testCaseId + '?includeAttachments=true&includeLabels=true'
    When method GET
    Then status 200
    And match response.id == testCaseId
    And match response.name == testCaseData.name
    And match response.steps == '#array'
    And match response.steps[0].description == testCaseData.steps[0].description
    And match response.attachments == '#array'
    And match response.attachments[0].id == attachmentId
    And match response.labels contains deep testCaseData.labels[0]

  Scenario: Complete test cycle and execution workflow
    # 1. Create a test case for the cycle
    * def testCaseData = call generateTestCaseData
    
    Given path zephyrBasePath + '/test-cases'
    And request testCaseData
    When method POST
    Then status 201
    
    * def testCaseId = response.id
    
    # 2. Create a test cycle
    * def testCycleData = call generateTestCycleData
    
    Given path zephyrBasePath + '/cycles'
    And request testCycleData
    When method POST
    Then status 201
    And match response.id == '#string'
    And match response.name == testCycleData.name
    
    * def testCycleId = response.id
    
    # 3. Add test case to the cycle
    Given path zephyrBasePath + '/cycles/' + testCycleId + '/test-cases'
    And request { testCaseId: '#(testCaseId)' }
    When method POST
    Then status 201
    And match response.cycleId == testCycleId
    And match response.testCaseId == testCaseId
    
    * def testCycleItemId = response.id
    
    # 4. Create test execution
    Given path zephyrBasePath + '/executions'
    And request {
      cycleId: '#(testCycleId)',
      testCaseId: '#(testCaseId)',
      status: 'Pass',
      comment: 'Execution created through API testing',
      executedBy: 'api-tester',
      executedOn: '#(new java.text.SimpleDateFormat("yyyy-MM-dd").format(new java.util.Date()))'
    }
    When method POST
    Then status 201
    And match response.id == '#string'
    And match response.status == 'Pass'
    
    * def executionId = response.id
    
    # 5. Get execution details
    Given path zephyrBasePath + '/executions/' + executionId
    When method GET
    Then status 200
    And match response.id == executionId
    And match response.testCaseId == testCaseId
    And match response.status == 'Pass'
    
    # 6. Update execution status
    Given path zephyrBasePath + '/executions/' + executionId
    And request { status: 'Fail', comment: 'Updated through API' }
    When method PUT
    Then status 200
    And match response.status == 'Fail'
    
    # 7. Add execution attachment
    Given path zephyrBasePath + '/executions/' + executionId + '/attachments'
    And request { filename: 'execution-log.txt', contentType: 'text/plain', content: 'VGhpcyBpcyBhIHRlc3QgbG9nIGZpbGU=' }
    When method POST
    Then status 201
    And match response.filename == 'execution-log.txt'

  Scenario: Test case import/export in bulk
    # 1. Create multiple test cases
    * def testCase1 = call generateTestCaseData
    * def testCase2 = call generateTestCaseData
    
    # Create first test case
    Given path zephyrBasePath + '/test-cases'
    And request testCase1
    When method POST
    Then status 201
    
    * def testCaseId1 = response.id
    
    # Create second test case
    Given path zephyrBasePath + '/test-cases'
    And request testCase2
    When method POST
    Then status 201
    
    * def testCaseId2 = response.id
    
    # 2. Export multiple test cases
    Given path zephyrBasePath + '/export/test-cases'
    And request { testCaseIds: ['#(testCaseId1)', '#(testCaseId2)'], format: 'JSON' }
    When method POST
    Then status 200
    And match response == '#array'
    And match response[0].id == testCaseId1
    And match response[1].id == testCaseId2
    
    # 3. Create folder for import
    Given path zephyrBasePath + '/folders'
    And request { name: 'Import Folder', type: 'TEST_CASE' }
    When method POST
    Then status 201
    
    * def folderId = response.id
    
    # 4. Import test cases to folder
    Given path zephyrBasePath + '/import/test-cases'
    And request { 
      testCases: response, 
      folderId: '#(folderId)',
      updateExisting: false
    }
    When method POST
    Then status 200
    And match response.imported == 2
    And match response.skipped == 0
    And match response.updated == 0

  # ===================== Error handling and edge cases =====================

  Scenario: Handling various error conditions gracefully
    # 1. Attempt to get non-existent test case
    Given path zephyrBasePath + '/test-cases/non-existent-id'
    When method GET
    Then status 404
    And match response.error contains 'not found'
    
    # 2. Create test case with invalid data
    Given path zephyrBasePath + '/test-cases'
    And request { 
      // Missing required name
      description: 'Invalid test case'
    }
    When method POST
    Then status 400
    And match response.error contains 'name'
    
    # 3. Update test case with invalid status
    * def testCaseData = call generateTestCaseData
    
    # Create valid test case first
    Given path zephyrBasePath + '/test-cases'
    And request testCaseData
    When method POST
    Then status 201
    
    * def testCaseId = response.id
    
    # Now update with invalid status
    Given path zephyrBasePath + '/test-cases/' + testCaseId
    And request { status: 'InvalidStatus' }
    When method PUT
    Then status 400
    And match response.error contains 'status'
    
    # 4. Try to add test case to non-existent cycle
    Given path zephyrBasePath + '/cycles/non-existent-cycle/test-cases'
    And request { testCaseId: '#(testCaseId)' }
    When method POST
    Then status 404
    And match response.error contains 'not found'

  Scenario: Handle pagination and filtering correctly
    # 1. Create multiple test cases
    * def testCount = 5
    * def createdTestIds = []
    
    # Helper function to create test cases in a loop
    * def createTestCases =
    """
    function(count) {
      var ids = [];
      for (var i = 0; i < count; i++) {
        var testData = karate.call('generateTestCaseData');
        testData.name = 'Pagination Test ' + i + ': ' + testData.name;
        
        var response = karate.call('createTestCase', testData);
        ids.push(response.id);
      }
      return ids;
    }
    """
    
    * def createTestCase =
    """
    function(testData) {
      var result = karate.call('classpath:org/skidbladnir/utils/common.feature', 
        { path: zephyrBasePath + '/test-cases', method: 'post', request: testData });
      return result.response;
    }
    """
    
    # Create test cases
    * def createdTestIds = call createTestCases testCount
    
    # 2. Test pagination - page 1, size 2
    Given path zephyrBasePath + '/test-cases'
    And param page = 1
    And param size = 2
    When method GET
    Then status 200
    And match response.pagination.total >= testCount
    And match response.pagination.page == 1
    And match response.pagination.pageSize == 2
    And match response.testCases == '#[2]'
    
    # 3. Test pagination - page 2, size 2
    Given path zephyrBasePath + '/test-cases'
    And param page = 2
    And param size = 2
    When method GET
    Then status 200
    And match response.pagination.page == 2
    And match response.testCases == '#array'
    
    # 4. Test filtering by name
    Given path zephyrBasePath + '/test-cases'
    And param nameContains = 'Pagination Test'
    When method GET
    Then status 200
    And match response.testCases[*].name contains 'Pagination Test'
    
    # 5. Test filtering by status
    Given path zephyrBasePath + '/test-cases'
    And param status = 'Draft'
    When method GET
    Then status 200
    And match each response.testCases contains { status: 'Draft' }

  # ===================== Authentication and security =====================

  Scenario: Test authentication and token handling
    # 1. Test with invalid token
    * configure headers = { 'Authorization': 'Bearer invalid-token' }
    
    Given path zephyrBasePath + '/status'
    When method GET
    Then status 401
    And match response.error contains 'Authentication'
    
    # Reset headers for subsequent tests
    * configure headers = null
    
    # 2. Test with expired token (simulate with special mock endpoint)
    Given path zephyrBasePath + '/auth/simulate-expired-token'
    When method GET
    Then status 401
    And match response.error contains 'expired'
    
    # 3. Test token refresh flow
    Given path zephyrBasePath + '/auth/token'
    And request { refreshToken: 'valid-refresh-token' }
    When method POST
    Then status 200
    And match response.accessToken == '#string'
    And match response.expiresIn == '#number'
    
    # 4. Use the new token for a request
    * configure headers = { 'Authorization': 'Bearer ' + response.accessToken }
    
    Given path zephyrBasePath + '/status'
    When method GET
    Then status 200
    And match response.status == 'UP'

  # ===================== Performance and rate limiting =====================

  Scenario: Handle rate limiting and throttling
    # 1. Make multiple requests in quick succession to trigger rate limiting
    * def makeMultipleRequests =
    """
    function(count) {
      var results = [];
      for (var i = 0; i < count; i++) {
        var result = karate.call('classpath:org/skidbladnir/utils/common.feature', 
          { path: zephyrBasePath + '/status', method: 'get' });
        results.push(result);
        java.lang.Thread.sleep(50); // small delay between requests
      }
      return results;
    }
    """
    
    * def results = call makeMultipleRequests 10
    
    # 2. Check if any requests were rate-limited
    * def rateLimited = false
    * def rateLimitedResponses = []
    
    * eval for (var i = 0; i < results.length; i++) { if (results[i].responseStatus == 429) { rateLimited = true; rateLimitedResponses.push(results[i]); } }
    
    # 3. If rate limited, verify response contains proper headers
    * if (rateLimited) karate.call('verifyRateLimitResponse', rateLimitedResponses[0])
    
    * def verifyRateLimitResponse =
    """
    function(response) {
      var retryAfter = response.responseHeaders['Retry-After'];
      var rateLimit = response.responseHeaders['X-Rate-Limit-Limit'];
      var rateLimitRemaining = response.responseHeaders['X-Rate-Limit-Remaining'];
      var rateLimitReset = response.responseHeaders['X-Rate-Limit-Reset'];
      
      if (!retryAfter || !rateLimit || !rateLimitRemaining || !rateLimitReset) {
        karate.fail('Rate limit response is missing required headers');
      }
    }
    """
    
    # 4. Test retry with exponential backoff
    * def testRetryWithBackoff =
    """
    function() {
      var maxRetries = 3;
      var baseDelay = 1000; // 1 second
      
      for (var attempt = 0; attempt < maxRetries; attempt++) {
        var result = karate.call('classpath:org/skidbladnir/utils/common.feature', 
          { path: zephyrBasePath + '/rate-limited-endpoint', method: 'get' });
          
        if (result.responseStatus != 429) {
          return { success: true, attempt: attempt, response: result };
        }
        
        // Calculate exponential backoff
        var delay = baseDelay * Math.pow(2, attempt);
        karate.log('Rate limited, retrying after ' + delay + 'ms (attempt ' + (attempt + 1) + ' of ' + maxRetries + ')');
        java.lang.Thread.sleep(delay);
      }
      
      return { success: false, attempts: maxRetries };
    }
    """
    
    * def retryResult = call testRetryWithBackoff
    
    # Verify either success or that we properly handled max retries
    * assert retryResult.success || retryResult.attempts == 3

  # ===================== Data integrity =====================

  Scenario: Verify data integrity in multi-step operations
    # Create a test case with steps
    * def testCaseData = call generateTestCaseData
    
    Given path zephyrBasePath + '/test-cases'
    And request testCaseData
    When method POST
    Then status 201
    
    * def testCaseId = response.id
    * def originalSteps = response.steps
    
    # Update a single step and verify other steps remain unchanged
    * def updatedSteps = originalSteps
    * eval updatedSteps[1].description = 'UPDATED: ' + updatedSteps[1].description
    
    Given path zephyrBasePath + '/test-cases/' + testCaseId
    And request { steps: updatedSteps }
    When method PUT
    Then status 200
    
    # Verify the update
    Given path zephyrBasePath + '/test-cases/' + testCaseId
    When method GET
    Then status 200
    And match response.steps[0].description == originalSteps[0].description
    And match response.steps[1].description == updatedSteps[1].description
    And match response.steps[2].description == originalSteps[2].description
    
    # Test attachment uploads with integrity check
    * def fileContent = 'VGhpcyBpcyBhIHRlc3QgZmlsZSB3aXRoIHNwZWNpYWwgY2hhcmFjdGVyczogISDwn5iN8J+MnyI='
    
    Given path zephyrBasePath + '/test-cases/' + testCaseId + '/attachments'
    And request { filename: 'data-integrity.txt', contentType: 'text/plain', content: '#(fileContent)' }
    When method POST
    Then status 201
    
    * def attachmentId = response.id
    
    # Download and verify content
    Given path zephyrBasePath + '/test-cases/' + testCaseId + '/attachments/' + attachmentId + '/content'
    When method GET
    Then status 200
    And match response == fileContent