Feature: Jama Software API Contract Testing

  Background:
    * url baseUrl
    * header Accept = 'application/json'
    * header Content-Type = 'application/json'
    * def timestamp = function(){ return new Date().getTime() }
    * def jamaAuth = callonce read('classpath:auth-jama.js')
    
  Scenario: Verify Jama authentication
    Given path '/rest/v1/users/current'
    And header Authorization = 'Bearer ' + jamaAuth.token
    When method GET
    Then status 200
    And match response.data contains { id: '#number', username: '#string' }

  Scenario: Get Jama projects
    Given path '/rest/v1/projects'
    And header Authorization = 'Bearer ' + jamaAuth.token
    When method GET
    Then status 200
    And match response.data == '#array'
    And match each response.data contains { id: '#number', name: '#string' }

  Scenario: Get Jama item types for a project
    Given path '/rest/v1/projects/1/itemtypes'  # Assuming project ID 1 exists
    And header Authorization = 'Bearer ' + jamaAuth.token
    When method GET
    Then status 200
    And match response.data == '#array'
    And match each response.data contains { id: '#number', name: '#string' }
    # Find the test case type ID for use in later tests
    * def testCaseType = karate.jsonPath(response.data, "$[?(@.name == 'Test Case' || @.typeKey == 'testcase')]")[0]
    * def testCaseTypeId = testCaseType ? testCaseType.id : 0

  Scenario: Create, update and delete a test case
    # Create a test case
    Given path '/rest/v1/items'
    And header Authorization = 'Bearer ' + jamaAuth.token
    And request { project: 1, itemType: karate.get('testCaseTypeId') || 25, fields: { name: 'API Test Case ' + timestamp(), description: 'Created via API tests', status: 'Draft' } }
    When method POST
    Then status 200
    And match response.data contains { id: '#number', fields: { name: '#string' } }
    * def testCaseId = response.data.id

    # Create test steps
    Given path '/rest/v1/items/' + testCaseId + '/teststeps'
    And header Authorization = 'Bearer ' + jamaAuth.token
    And request { testSteps: [ { action: 'Test Step 1', expectedResult: 'Expected Result 1', notes: '', sequence: 1 } ] }
    When method POST
    Then status 200
    And match response.data[0] contains { fields: { action: 'Test Step 1' } }

    # Update the test case
    Given path '/rest/v1/items/' + testCaseId
    And header Authorization = 'Bearer ' + jamaAuth.token
    And request { fields: { name: 'Updated API Test Case ' + timestamp(), status: 'Complete' } }
    When method PUT
    Then status 200
    And match response.data contains { fields: { status: 'Complete' } }

    # Get the test case to verify update
    Given path '/rest/v1/items/' + testCaseId
    And header Authorization = 'Bearer ' + jamaAuth.token
    When method GET
    Then status 200
    And match response.data contains { fields: { status: 'Complete' } }

    # Delete the test case
    Given path '/rest/v1/items/' + testCaseId
    And header Authorization = 'Bearer ' + jamaAuth.token
    When method DELETE
    Then status 200

  Scenario: Handle API errors appropriately
    # Test not found error
    Given path '/rest/v1/items/99999999'  # Non-existent item ID
    And header Authorization = 'Bearer ' + jamaAuth.token
    When method GET
    Then status 404
    And match response.meta contains { message: '#string' }

    # Test authentication failure
    Given path '/rest/v1/projects'
    And header Authorization = 'Bearer InvalidToken'
    When method GET
    Then status 401
    And match response.meta contains { message: '#string' }

    # Test validation error
    Given path '/rest/v1/items'
    And header Authorization = 'Bearer ' + jamaAuth.token
    And request { project: 1 } # Missing required fields
    When method POST
    Then status 400
    And match response.meta.status contains { message: '#string' }