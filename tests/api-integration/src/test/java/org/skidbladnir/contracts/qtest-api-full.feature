Feature: qTest API Advanced Interface Testing
  This feature thoroughly tests the qTest API integration for real-world usage scenarios.

  Background:
    * url apiBaseUrl
    * def qtestBasePath = '/api/qtest'
    
    # Setup test data helper functions
    * def generateTestCaseData =
    """
    function() {
      var uuid = java.util.UUID.randomUUID().toString();
      return {
        name: 'Advanced Test Case ' + uuid,
        description: 'Test case with detailed information created for API testing',
        precondition: 'System is operational with user accounts created',
        priority: 'High',
        status: 'Ready',
        automationStatus: 'Not Automated',
        projectId: 'QT-PR-100', // Default project ID from mock
        moduleId: 'QT-MO-300',  // Default module ID from mock
        steps: [
          {
            order: 1,
            description: 'Navigate to login page',
            expectedResult: 'Login form is displayed'
          },
          {
            order: 2,
            description: 'Enter valid credentials',
            expectedResult: 'Credentials accepted'
          },
          {
            order: 3,
            description: 'Click login button',
            expectedResult: 'User is successfully logged in and redirected to dashboard'
          }
        ],
        properties: [
          { name: 'Component', value: 'Authentication' },
          { name: 'Feature', value: 'Login' },
          { name: 'Platform', value: 'Web' }
        ],
        tags: ['regression', 'login', 'authentication'],
        attachments: []
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
        projectId: 'QT-PR-100',
        startDate: today,
        endDate: nextMonth,
        status: 'Active'
      }
    }
    """
    
    * def generateTestRunData =
    """
    function(testCaseId, testCycleId) {
      return {
        name: 'Run for TC: ' + testCaseId,
        testCaseId: testCaseId,
        testCycleId: testCycleId,
        status: 'Not Run',
        runnerName: 'API Tester',
        plannedStartDate: new java.text.SimpleDateFormat("yyyy-MM-dd").format(new java.util.Date()),
        plannedEndDate: new java.text.SimpleDateFormat("yyyy-MM-dd").format(
          new java.util.Date(new java.util.Date().getTime() + (7 * 24 * 60 * 60 * 1000))
        )
      }
    }
    """

  # ===================== Real-world test cases =====================

  Scenario: Complete test case creation workflow with properties and validation
    # 1. Create a test case with properties and steps
    * def testCaseData = call generateTestCaseData
    
    Given path qtestBasePath + '/test-cases'
    And request testCaseData
    When method POST
    Then status 201
    And match response.id == '#string'
    And match response.name == testCaseData.name
    
    * def testCaseId = response.id
    
    # 2. Add tags to the test case
    Given path qtestBasePath + '/test-cases/' + testCaseId + '/tags'
    And request testCaseData.tags
    When method POST
    Then status 200
    And match response == '#array'
    And match response contains deep testCaseData.tags[0]
    
    # 3. Upload attachment to the test case
    Given path qtestBasePath + '/test-cases/' + testCaseId + '/attachments'
    And request { name: 'test-data.json', contentType: 'application/json', content: 'eyJ0ZXN0IjoidmFsdWUifQ==' }
    When method POST
    Then status 201
    And match response.name == 'test-data.json'
    
    * def attachmentId = response.id
    
    # 4. Get test case with all details
    Given path qtestBasePath + '/test-cases/' + testCaseId
    And param includeTags = true
    And param includeAttachments = true
    When method GET
    Then status 200
    And match response.id == testCaseId
    And match response.name == testCaseData.name
    And match response.steps == '#array'
    And match response.steps[0].description == testCaseData.steps[0].description
    And match response.attachments == '#array'
    And match response.attachments[0].id == attachmentId
    And match response.tags contains deep testCaseData.tags[0]
    And match response.properties == '#array'
    And match response.properties[0].name == testCaseData.properties[0].name
    And match response.properties[0].value == testCaseData.properties[0].value

  Scenario: Complete test cycle and execution workflow
    # 1. Create a test case for the cycle
    * def testCaseData = call generateTestCaseData
    
    Given path qtestBasePath + '/test-cases'
    And request testCaseData
    When method POST
    Then status 201
    
    * def testCaseId = response.id
    
    # 2. Create a test cycle
    * def testCycleData = call generateTestCycleData
    
    Given path qtestBasePath + '/cycles'
    And request testCycleData
    When method POST
    Then status 201
    And match response.id == '#string'
    And match response.name == testCycleData.name
    
    * def testCycleId = response.id
    
    # 3. Add test case to cycle
    Given path qtestBasePath + '/cycles/' + testCycleId + '/test-cases'
    And request { testCaseId: '#(testCaseId)' }
    When method POST
    Then status 201
    And match response.testCaseId == testCaseId
    And match response.cycleId == testCycleId
    
    # 4. Create a test run
    * def testRunData = call generateTestRunData testCaseId, testCycleId
    
    Given path qtestBasePath + '/runs'
    And request testRunData
    When method POST
    Then status 201
    And match response.id == '#string'
    And match response.testCaseId == testCaseId
    And match response.status == 'Not Run'
    
    * def testRunId = response.id
    
    # 5. Update test run status to pass
    Given path qtestBasePath + '/runs/' + testRunId
    And request { status: 'Passed', actualResult: 'All steps executed successfully' }
    When method PUT
    Then status 200
    And match response.status == 'Passed'
    
    # 6. Add step results to the run
    Given path qtestBasePath + '/runs/' + testRunId + '/step-results'
    And request [
      { stepId: 1, status: 'Passed', actualResult: 'Login page displayed as expected' },
      { stepId: 2, status: 'Passed', actualResult: 'Credentials accepted without errors' },
      { stepId: 3, status: 'Passed', actualResult: 'Successfully logged in and redirected to dashboard' }
    ]
    When method POST
    Then status 200
    And match response == '#array'
    And match response[0].status == 'Passed'
    
    # 7. Add attachment to the test run
    Given path qtestBasePath + '/runs/' + testRunId + '/attachments'
    And request { name: 'test-run-log.txt', contentType: 'text/plain', content: 'VGhpcyBpcyBhIHRlc3QgcnVuIGxvZyBmaWxl' }
    When method POST
    Then status 201
    And match response.name == 'test-run-log.txt'
    
    # 8. Get test run with full details
    Given path qtestBasePath + '/runs/' + testRunId
    And param includeStepResults = true
    And param includeAttachments = true
    When method GET
    Then status 200
    And match response.id == testRunId
    And match response.status == 'Passed'
    And match response.stepResults == '#array'
    And match response.stepResults[0].status == 'Passed'
    And match response.attachments == '#array'
    And match response.attachments[0].name == 'test-run-log.txt'

  Scenario: Test case cloning and test suite management
    # 1. Create a test case to clone
    * def testCaseData = call generateTestCaseData
    
    Given path qtestBasePath + '/test-cases'
    And request testCaseData
    When method POST
    Then status 201
    
    * def sourceTestCaseId = response.id
    
    # 2. Clone the test case
    Given path qtestBasePath + '/test-cases/' + sourceTestCaseId + '/clone'
    And request { 
      newName: 'Cloned: ' + testCaseData.name,
      destinationModuleId: testCaseData.moduleId,
      copyAttachments: true,
      copyParameters: true,
      copySteps: true
    }
    When method POST
    Then status 201
    And match response.id == '#string'
    And match response.id != sourceTestCaseId
    And match response.name == 'Cloned: ' + testCaseData.name
    
    * def clonedTestCaseId = response.id
    
    # 3. Create a test suite
    Given path qtestBasePath + '/test-suites'
    And request {
      name: 'Authentication Test Suite',
      description: 'Test suite for authentication functionality',
      projectId: 'QT-PR-100'
    }
    When method POST
    Then status 201
    And match response.id == '#string'
    
    * def testSuiteId = response.id
    
    # 4. Add both test cases to the suite
    Given path qtestBasePath + '/test-suites/' + testSuiteId + '/test-cases'
    And request [
      { testCaseId: sourceTestCaseId },
      { testCaseId: clonedTestCaseId }
    ]
    When method POST
    Then status 200
    And match response == '#array'
    And match response[0].testCaseId == sourceTestCaseId
    And match response[1].testCaseId == clonedTestCaseId
    
    # 5. Get test suite with test cases
    Given path qtestBasePath + '/test-suites/' + testSuiteId
    And param includeTestCases = true
    When method GET
    Then status 200
    And match response.id == testSuiteId
    And match response.testCases == '#array'
    And match response.testCases[*].testCaseId contains sourceTestCaseId
    And match response.testCases[*].testCaseId contains clonedTestCaseId

  Scenario: Test requirements and traceability
    # 1. Create a requirement
    Given path qtestBasePath + '/requirements'
    And request {
      name: 'Authentication Security Requirement',
      description: 'Users must authenticate before accessing secure resources',
      priority: 'High',
      projectId: 'QT-PR-100'
    }
    When method POST
    Then status 201
    And match response.id == '#string'
    
    * def requirementId = response.id
    
    # 2. Create a test case linked to the requirement
    * def testCaseData = call generateTestCaseData
    
    Given path qtestBasePath + '/test-cases'
    And request testCaseData
    When method POST
    Then status 201
    
    * def testCaseId = response.id
    
    # 3. Link test case to requirement
    Given path qtestBasePath + '/requirements/' + requirementId + '/links'
    And request {
      item: {
        id: testCaseId,
        type: 'test-case'
      },
      relationship: 'verifies'
    }
    When method POST
    Then status 201
    And match response.id == '#string'
    
    * def linkId = response.id
    
    # 4. Get requirement with linked items
    Given path qtestBasePath + '/requirements/' + requirementId
    And param includeLinks = true
    When method GET
    Then status 200
    And match response.id == requirementId
    And match response.links == '#array'
    And match response.links[0].id == linkId
    And match response.links[0].item.id == testCaseId
    
    # 5. Get test case with linked requirements
    Given path qtestBasePath + '/test-cases/' + testCaseId
    And param includeLinks = true
    When method GET
    Then status 200
    And match response.id == testCaseId
    And match response.links == '#array'
    And match response.links[0].item.id == requirementId

  # ===================== Error handling and edge cases =====================

  Scenario: Handling various error conditions gracefully
    # 1. Attempt to get non-existent test case
    Given path qtestBasePath + '/test-cases/non-existent-id'
    When method GET
    Then status 404
    And match response.error contains 'not found'
    And match response.code == 'NOT_FOUND'
    
    # 2. Create test case with invalid data
    Given path qtestBasePath + '/test-cases'
    And request { 
      // Missing required name
      description: 'Invalid test case'
    }
    When method POST
    Then status 400
    And match response.error contains 'name'
    
    # 3. Create test case with invalid project ID
    * def testCaseData = call generateTestCaseData
    * set testCaseData.projectId = 'INVALID-PROJECT'
    
    Given path qtestBasePath + '/test-cases'
    And request testCaseData
    When method POST
    Then status 400
    And match response.error contains 'project'
    
    # 4. Update test case with invalid status
    * def testCaseData = call generateTestCaseData
    
    # Create valid test case first
    Given path qtestBasePath + '/test-cases'
    And request testCaseData
    When method POST
    Then status 201
    
    * def testCaseId = response.id
    
    # Update with invalid status
    Given path qtestBasePath + '/test-cases/' + testCaseId
    And request { status: 'InvalidStatus' }
    When method PUT
    Then status 400
    And match response.error contains 'status'
    
    # 5. Create a test run for a non-existent test case
    Given path qtestBasePath + '/runs'
    And request {
      name: 'Invalid run',
      testCaseId: 'non-existent-id',
      status: 'Not Run'
    }
    When method POST
    Then status 404
    And match response.error contains 'test case'

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
        { path: qtestBasePath + '/test-cases', method: 'post', request: testData });
      return result.response;
    }
    """
    
    # Create test cases
    * def createdTestIds = call createTestCases testCount
    
    # 2. Test pagination - page 1, size 2
    Given path qtestBasePath + '/test-cases'
    And param page = 1
    And param size = 2
    When method GET
    Then status 200
    And match response.pagination.total >= testCount
    And match response.pagination.page == 1
    And match response.pagination.pageSize == 2
    And match response.testCases == '#[2]'
    
    # 3. Test pagination - page 2, size 2
    Given path qtestBasePath + '/test-cases'
    And param page = 2
    And param size = 2
    When method GET
    Then status 200
    And match response.pagination.page == 2
    And match response.testCases == '#array'
    
    # 4. Test filtering by name
    Given path qtestBasePath + '/test-cases'
    And param query = 'name ~ "Pagination Test"'
    When method GET
    Then status 200
    And match response.testCases[*].name contains 'Pagination Test'
    
    # 5. Test filtering by status
    Given path qtestBasePath + '/test-cases'
    And param query = 'status = "Ready"'
    When method GET
    Then status 200
    And match each response.testCases contains { status: 'Ready' }
    
    # 6. Test multiple filter criteria
    Given path qtestBasePath + '/test-cases'
    And param query = 'name ~ "Pagination" and status = "Ready"'
    When method GET
    Then status 200
    And match each response.testCases contains { status: 'Ready' }
    And match response.testCases[*].name contains 'Pagination'

  # ===================== Authentication and security =====================

  Scenario: Test authentication and token handling
    # 1. Test with invalid token
    * configure headers = { 'Authorization': 'Bearer invalid-token' }
    
    Given path qtestBasePath + '/status'
    When method GET
    Then status 401
    And match response.error contains 'Authentication'
    
    # Reset headers for subsequent tests
    * configure headers = null
    
    # 2. Test with expired token (mock endpoint)
    Given path qtestBasePath + '/auth/simulate-expired-token'
    When method GET
    Then status 401
    And match response.error contains 'expired'
    
    # 3. Test token refresh flow
    Given path qtestBasePath + '/auth/token'
    And request { refreshToken: 'valid-refresh-token' }
    When method POST
    Then status 200
    And match response.accessToken == '#string'
    And match response.expiresIn == '#number'
    
    # 4. Use the new token for a request
    * configure headers = { 'Authorization': 'Bearer ' + response.accessToken }
    
    Given path qtestBasePath + '/status'
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
          { path: qtestBasePath + '/status', method: 'get' });
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
    
    # 4. Test explicit rate limit endpoint
    Given path qtestBasePath + '/rate-limit-test'
    When method GET
    Then status 429
    And match response.error contains 'Rate limit'
    And match response.code == 'RATE_LIMIT_EXCEEDED'
    And match responseHeaders['Retry-After'] == '#string'
    And match responseHeaders['X-Rate-Limit-Limit'] == '#string'
    And match responseHeaders['X-Rate-Limit-Remaining'] == '0'
    And match responseHeaders['X-Rate-Limit-Reset'] == '#string'

  # ===================== Data integrity and atomicity =====================

  Scenario: Verify data integrity in multi-step operations
    # Create a test case with steps
    * def testCaseData = call generateTestCaseData
    
    Given path qtestBasePath + '/test-cases'
    And request testCaseData
    When method POST
    Then status 201
    
    * def testCaseId = response.id
    * def originalSteps = response.steps
    
    # 1. Update a single step and verify other steps remain unchanged
    * def updatedSteps = originalSteps
    * eval updatedSteps[1].description = 'UPDATED: ' + updatedSteps[1].description
    
    Given path qtestBasePath + '/test-cases/' + testCaseId
    And request { steps: updatedSteps }
    When method PUT
    Then status 200
    
    # Verify the update
    Given path qtestBasePath + '/test-cases/' + testCaseId
    When method GET
    Then status 200
    And match response.steps[0].description == originalSteps[0].description
    And match response.steps[1].description == updatedSteps[1].description
    And match response.steps[2].description == originalSteps[2].description
    
    # 2. Update test case name only and verify steps are preserved
    Given path qtestBasePath + '/test-cases/' + testCaseId
    And request { name: 'Updated: ' + testCaseData.name }
    When method PUT
    Then status 200
    
    # Verify steps weren't lost in the partial update
    Given path qtestBasePath + '/test-cases/' + testCaseId
    When method GET
    Then status 200
    And match response.name == 'Updated: ' + testCaseData.name
    And match response.steps == '#[3]'
    
    # 3. Test attachment uploads with integrity check
    * def fileContent = 'VGhpcyBpcyBhIHRlc3QgZmlsZSB3aXRoIHNwZWNpYWwgY2hhcmFjdGVyczogISDwn5iN8J+MnyI='
    
    Given path qtestBasePath + '/test-cases/' + testCaseId + '/attachments'
    And request { name: 'data-integrity.txt', contentType: 'text/plain', content: '#(fileContent)' }
    When method POST
    Then status 201
    
    * def attachmentId = response.id
    
    # Download and verify content
    Given path qtestBasePath + '/attachments/' + attachmentId + '/content'
    When method GET
    Then status 200
    And match response == fileContent
    
    # 4. Test batch operations atomicity
    # Create a second test case for batch operations
    * def testCaseData2 = call generateTestCaseData
    
    Given path qtestBasePath + '/test-cases'
    And request testCaseData2
    When method POST
    Then status 201
    
    * def testCaseId2 = response.id
    
    # Try a batch update where one item is valid, one is invalid
    Given path qtestBasePath + '/batch/test-cases'
    And request [
      {
        id: testCaseId,
        status: 'Approved'  // Valid status
      },
      {
        id: testCaseId2,
        status: 'InvalidStatus'  // Invalid status
      }
    ]
    When method PUT
    Then status 400
    And match response.error contains 'batch'
    
    # Verify neither was updated (atomicity)
    Given path qtestBasePath + '/test-cases/' + testCaseId
    When method GET
    Then status 200
    And match response.status == 'Ready'  // Original status, not 'Approved'