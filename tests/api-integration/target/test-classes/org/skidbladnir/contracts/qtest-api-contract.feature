Feature: qTest API Contract Testing
  This feature validates that our qTest API client correctly handles API responses and errors.

  Background:
    * url apiBaseUrl
    * def qtestBasePath = '/api/qtest'
    
    # Schema definitions for validation
    * def testCaseSchema = 
    """
    {
      id: '#string',
      name: '#string',
      description: '##string',
      precondition: '##string',
      priority: '##string',
      status: '##string',
      automationStatus: '##string',
      moduleId: '##string',
      projectId: '#string',
      createdBy: '##string',
      createdAt: '##string',
      updatedAt: '##string',
      steps: '#array',
      properties: '##array',
      tags: '##array',
      attachments: '##array'
    }
    """
    
    * def errorSchema =
    """
    {
      error: '#string',
      code: '##string'
    }
    """
    
    * def projectSchema =
    """
    {
      id: '#string',
      name: '#string',
      description: '##string',
      startDate: '##string',
      endDate: '##string',
      status: '##string'
    }
    """
    
    * def testCycleSchema =
    """
    {
      id: '#string',
      name: '#string',
      description: '##string',
      projectId: '#string',
      startDate: '##string',
      endDate: '##string',
      status: '##string'
    }
    """
    
    * def attachmentSchema =
    """
    {
      id: '#string',
      name: '#string',
      fileSize: '##number',
      contentType: '##string',
      uploadedAt: '##string',
      uploadedBy: '##string'
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
        precondition: 'System is operational',
        priority: 'High',
        status: 'Ready',
        projectId: 'QT-PR-100', // Default project ID from mock
        moduleId: 'QT-MO-300',  // Default module ID from mock
        steps: [
          {
            order: 1,
            description: 'Step 1',
            expectedResult: 'Expected result 1'
          },
          {
            order: 2,
            description: 'Step 2',
            expectedResult: 'Expected result 2'
          }
        ]
      }
    }
    """

  Scenario: Get qTest API status should return health information
    Given path qtestBasePath + '/status'
    When method GET
    Then status 200
    And match response.status == 'UP'
    And match response.name == 'qTest Mock API'
    
  Scenario: Get projects should return a list of projects
    Given path qtestBasePath + '/projects'
    When method GET
    Then status 200
    And match response == { projects: '#array', total: '#number' }
    And match each response.projects == projectSchema
  
  Scenario: Get a specific project should return details
    Given path qtestBasePath + '/projects/QT-PR-100'
    When method GET
    Then status 200
    And match response == projectSchema
    And match response.id == 'QT-PR-100'
  
  Scenario: Get a non-existent project should return 404
    Given path qtestBasePath + '/projects/non-existent-id'
    When method GET
    Then status 404
    And match response == errorSchema
    And match response.error contains 'not found'
    And match response.code == 'NOT_FOUND'
  
  Scenario: Get test cases should return a list with pagination
    Given path qtestBasePath + '/test-cases'
    When method GET
    Then status 200
    And match response == { testCases: '#array', pagination: { total: '#number', page: '#number', pageSize: '#number' } }
    And match each response.testCases == '#object'
  
  Scenario: Get a specific test case should return details
    # First create a test case to ensure we have one to retrieve
    * def testCase = call createValidTestCase
    
    Given path qtestBasePath + '/test-cases'
    And request testCase
    When method POST
    Then status 201
    
    * def testCaseId = response.id
    
    # Now retrieve the created test case
    Given path qtestBasePath + '/test-cases/' + testCaseId
    When method GET
    Then status 200
    And match response == testCaseSchema
    And match response.id == testCaseId
    And match response.name == testCase.name
  
  Scenario: Get a non-existent test case should return 404
    Given path qtestBasePath + '/test-cases/non-existent-id'
    When method GET
    Then status 404
    And match response == errorSchema
    And match response.error contains 'not found'
    And match response.code == 'NOT_FOUND'
  
  Scenario: Create test case should validate required fields
    # Attempt to create an invalid test case
    * def invalidTestCase = call createInvalidTestCase
    
    Given path qtestBasePath + '/test-cases'
    And request invalidTestCase
    When method POST
    Then status 400
    And match response == errorSchema
  
  Scenario: Create test case should return the created resource
    * def testCase = call createValidTestCase
    
    Given path qtestBasePath + '/test-cases'
    And request testCase
    When method POST
    Then status 201
    And match response == testCaseSchema
    And match response.name == testCase.name
    And match response.id == '#string'
    And match response.steps == '#[2]'
  
  Scenario: Update test case should modify the resource
    # First create a test case
    * def testCase = call createValidTestCase
    
    Given path qtestBasePath + '/test-cases'
    And request testCase
    When method POST
    Then status 201
    
    * def testCaseId = response.id
    * def updatedName = 'Updated Test Case Name'
    
    # Now update the test case
    Given path qtestBasePath + '/test-cases/' + testCaseId
    And request { name: '#(updatedName)' }
    When method PUT
    Then status 200
    And match response.id == testCaseId
    And match response.name == updatedName
  
  Scenario: Update non-existent test case should return 404
    Given path qtestBasePath + '/test-cases/non-existent-id'
    And request { name: 'Updated Test Case Name' }
    When method PUT
    Then status 404
    And match response == errorSchema
    And match response.error contains 'not found'
    And match response.code == 'NOT_FOUND'
  
  Scenario: Delete test case should remove the resource
    # First create a test case
    * def testCase = call createValidTestCase
    
    Given path qtestBasePath + '/test-cases'
    And request testCase
    When method POST
    Then status 201
    
    * def testCaseId = response.id
    
    # Now delete the test case
    Given path qtestBasePath + '/test-cases/' + testCaseId
    When method DELETE
    Then status 200
    And match response.message contains 'deleted'
    
    # Verify it's gone
    Given path qtestBasePath + '/test-cases/' + testCaseId
    When method GET
    Then status 404
  
  Scenario: Get test cycles should return a list
    Given path qtestBasePath + '/cycles'
    When method GET
    Then status 200
    And match response == { cycles: '#array', total: '#number' }
    And match each response.cycles == testCycleSchema
  
  Scenario: Create test cycle should return the created resource
    Given path qtestBasePath + '/cycles'
    And request { name: 'New Test Cycle', description: 'Created for testing', projectId: 'QT-PR-100' }
    When method POST
    Then status 201
    And match response == testCycleSchema
    And match response.name == 'New Test Cycle'
    And match response.id == '#string'
  
  Scenario: Add test case to test cycle
    # Get the default test cycle
    Given path qtestBasePath + '/cycles/QT-CY-2000'
    When method GET
    Then status 200
    
    # Create a test case
    * def testCase = call createValidTestCase
    
    Given path qtestBasePath + '/test-cases'
    And request testCase
    When method POST
    Then status 201
    
    * def testCaseId = response.id
    
    # Add the test case to the cycle
    Given path qtestBasePath + '/cycles/QT-CY-2000/test-cases'
    And request { testCaseId: '#(testCaseId)' }
    When method POST
    Then status 201
    And match response.testCaseId == testCaseId
    And match response.cycleId == 'QT-CY-2000'
  
  Scenario: Upload attachment to test case
    # First create a test case
    * def testCase = call createValidTestCase
    
    Given path qtestBasePath + '/test-cases'
    And request testCase
    When method POST
    Then status 201
    
    * def testCaseId = response.id
    
    # Now upload an attachment
    Given path qtestBasePath + '/test-cases/' + testCaseId + '/attachments'
    And request { name: 'test.txt', contentType: 'text/plain', content: 'VGhpcyBpcyBhIHRlc3QgZmlsZQ==' }
    When method POST
    Then status 201
    And match response.name == 'test.txt'
    And match response.contentType == 'text/plain'
  
  Scenario: Get test case attachments
    # First create a test case with an attachment
    * def testCase = call createValidTestCase
    
    Given path qtestBasePath + '/test-cases'
    And request testCase
    When method POST
    Then status 201
    
    * def testCaseId = response.id
    
    # Upload an attachment
    Given path qtestBasePath + '/test-cases/' + testCaseId + '/attachments'
    And request { name: 'test.txt', contentType: 'text/plain', content: 'VGhpcyBpcyBhIHRlc3QgZmlsZQ==' }
    When method POST
    Then status 201
    
    # Now get the attachments
    Given path qtestBasePath + '/test-cases/' + testCaseId + '/attachments'
    When method GET
    Then status 200
    And match response == '#array'
  
  Scenario: Error responses should follow the standard error format
    Given path qtestBasePath + '/non-existent-endpoint'
    When method GET
    Then status 404
    And match response == errorSchema
    And match response.error contains 'not found'
    And match response.code == 'NOT_FOUND'

  # Testing API client error handling
  Scenario: Authentication errors should have specific error format
    Given path qtestBasePath + '/authenticate'
    And request { username: 'invalid', password: 'invalid' }
    When method POST
    Then status 401
    And match response.error contains 'Authentication'
    And match response.code == 'NOT_FOUND'
    
  Scenario: Rate limit errors should provide retry information
    Given path qtestBasePath + '/rate-limit-test'
    When method GET
    Then status 429
    And match response == errorSchema
    And match response.error contains 'Rate limit'