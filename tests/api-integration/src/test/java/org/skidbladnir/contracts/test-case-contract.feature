Feature: Test Case API Contract
  This feature validates the contract of the Test Case API endpoints

  Background:
    * url apiBaseUrl
    * def testCaseSchema = 
    """
    {
      id: '#string',
      name: '#string',
      description: '#string',
      priority: '#string',
      status: '#string',
      attachments: '##[]{id:string, name:string, contentType:string, size:number}',
      createdAt: '#string',
      updatedAt: '#string'
    }
    """

  Scenario: Get test case schema validation
    Given path '/test-cases/TC-1234'
    When method GET
    Then status 200
    And match response == testCaseSchema

  Scenario: Create test case schema validation
    Given path '/test-cases'
    And request testCase
    When method POST
    Then status 201
    And match response == testCaseSchema
    And match response.id == '#string'
    And match response.createdAt == '#string'

  Scenario: Update test case schema validation
    Given path '/test-cases/TC-1234'
    And request { name: 'Updated Test Case', description: 'Updated description', priority: 'Medium', status: 'Ready' }
    When method PUT
    Then status 200
    And match response == testCaseSchema
    And match response.name == 'Updated Test Case'
    And match response.description == 'Updated description'

  Scenario: List test cases schema validation
    Given path '/test-cases'
    When method GET
    Then status 200
    And match response == { testCases: '#array', pagination: { total: '#number', page: '#number', pageSize: '#number' } }
    And match response.testCases[0] == testCaseSchema