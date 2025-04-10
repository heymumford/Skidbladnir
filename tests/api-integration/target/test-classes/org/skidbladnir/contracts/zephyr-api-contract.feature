Feature: Zephyr API Contract Testing
  This feature validates that our Zephyr API client correctly handles API responses and errors.

  Background:
    * url apiBaseUrl
    * def zephyrBasePath = '/api/zephyr'
    
    # Schema definitions for validation
    * def testCaseSchema = 
    """
    {
      id: '#string',
      name: '#string',
      description: '##string',
      priority: '##string',
      status: '##string',
      steps: '#array',
      attachments: '#array'
    }
    """
    
    * def errorSchema =
    """
    {
      error: '#string',
      code: '##string',
      details: '##object'
    }
    """
    
    * def attachmentSchema =
    """
    {
      id: '#string',
      filename: '#string',
      contentType: '#string',
      size: '##number',
      description: '##string'
    }
    """
    
    # Helper functions for testing error handling
    * def createInvalidTestCase = 
    """
    function() {
      return {
        // Missing required name field
        description: 'This test case is invalid',
        priority: 'High'
      }
    }
    """
    
    * def createValidTestCase = 
    """
    function() {
      return {
        name: 'Automatically created test case ' + java.util.UUID.randomUUID(),
        description: 'This test case was created for API contract testing',
        priority: 'High',
        status: 'Ready',
        steps: [
          { description: 'Step 1', expectedResult: 'Expected result 1' },
          { description: 'Step 2', expectedResult: 'Expected result 2' }
        ]
      }
    }
    """

  Scenario: Get Zephyr API status should return health information
    Given path zephyrBasePath + '/status'
    When method GET
    Then status 200
    And match response.status == 'UP'
    And match response.name == 'Zephyr Mock API'
    
  Scenario: Get test cases should return a list with pagination
    Given path zephyrBasePath + '/test-cases'
    When method GET
    Then status 200
    And match response == { testCases: '#array', pagination: { total: '#number', page: '#number', pageSize: '#number' } }
    And match each response.testCases == '#object'
  
  Scenario: Get a specific test case should return details
    # First create a test case to ensure we have one to retrieve
    * def testCase = call createValidTestCase
    
    Given path zephyrBasePath + '/test-cases'
    And request testCase
    When method POST
    Then status 201
    
    * def testCaseId = response.id
    
    # Now retrieve the created test case
    Given path zephyrBasePath + '/test-cases/' + testCaseId
    When method GET
    Then status 200
    And match response == testCaseSchema
    And match response.id == testCaseId
    And match response.name == testCase.name
  
  Scenario: Get a non-existent test case should return 404
    Given path zephyrBasePath + '/test-cases/non-existent-id'
    When method GET
    Then status 404
    And match response == errorSchema
    And match response.error contains 'not found'
  
  Scenario: Create test case should validate required fields
    # Attempt to create an invalid test case
    * def invalidTestCase = call createInvalidTestCase
    
    Given path zephyrBasePath + '/test-cases'
    And request invalidTestCase
    When method POST
    Then status 400
    And match response == errorSchema
    And match response.error contains 'name'
  
  Scenario: Create test case should return the created resource
    * def testCase = call createValidTestCase
    
    Given path zephyrBasePath + '/test-cases'
    And request testCase
    When method POST
    Then status 201
    And match response == testCaseSchema
    And match response.name == testCase.name
    And match response.id == '#string'
  
  Scenario: Update test case should modify the resource
    # First create a test case
    * def testCase = call createValidTestCase
    
    Given path zephyrBasePath + '/test-cases'
    And request testCase
    When method POST
    Then status 201
    
    * def testCaseId = response.id
    * def updatedName = 'Updated Test Case Name'
    
    # Now update the test case
    Given path zephyrBasePath + '/test-cases/' + testCaseId
    And request { name: '#(updatedName)' }
    When method PUT
    Then status 200
    And match response.id == testCaseId
    And match response.name == updatedName
  
  Scenario: Update non-existent test case should return 404
    Given path zephyrBasePath + '/test-cases/non-existent-id'
    And request { name: 'Updated Test Case Name' }
    When method PUT
    Then status 404
    And match response == errorSchema
    And match response.error contains 'not found'
  
  Scenario: Upload attachment to test case
    # First create a test case
    * def testCase = call createValidTestCase
    
    Given path zephyrBasePath + '/test-cases'
    And request testCase
    When method POST
    Then status 201
    
    * def testCaseId = response.id
    
    # Now upload an attachment
    Given path zephyrBasePath + '/test-cases/' + testCaseId + '/attachments'
    And request { filename: 'test.txt', contentType: 'text/plain', content: 'VGhpcyBpcyBhIHRlc3QgZmlsZQ==' }
    When method POST
    Then status 201
    And match response == attachmentSchema
    And match response.filename == 'test.txt'
    And match response.contentType == 'text/plain'
  
  Scenario: Get test case attachments
    # First create a test case with an attachment
    * def testCase = call createValidTestCase
    
    Given path zephyrBasePath + '/test-cases'
    And request testCase
    When method POST
    Then status 201
    
    * def testCaseId = response.id
    
    # Upload an attachment
    Given path zephyrBasePath + '/test-cases/' + testCaseId + '/attachments'
    And request { filename: 'test.txt', contentType: 'text/plain', content: 'VGhpcyBpcyBhIHRlc3QgZmlsZQ==' }
    When method POST
    Then status 201
    
    # Now get the attachments
    Given path zephyrBasePath + '/test-cases/' + testCaseId + '/attachments'
    When method GET
    Then status 200
    And match response == '#array'
    And match response[0] == attachmentSchema
  
  Scenario: Error responses should include standard error details for debugging
    Given path zephyrBasePath + '/non-existent-endpoint'
    When method GET
    Then status 404
    And match response == errorSchema
    And match response.error contains 'not found'

  # Testing API client error handling
  Scenario: Network errors should be properly handled and transformed
    # This is a mock test - in a real implementation, we would use fault injection
    # Here we just validate the contract with our mocked endpoints
    
    Given path zephyrBasePath + '/simulate-network-error'
    When method GET
    Then status 500
    And match response == errorSchema
    
  Scenario: Authentication errors should be properly handled
    Given path zephyrBasePath + '/authenticate'
    And request { apiToken: 'invalid-token' }
    When method POST
    Then status 401
    And match response == errorSchema
    And match response.error contains 'Authentication'