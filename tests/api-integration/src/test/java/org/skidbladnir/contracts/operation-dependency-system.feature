Feature: API Operation Dependency System
  As an API developer
  I want to ensure that operations are executed in the correct order
  So that API requests don't fail due to missing dependencies

  Background:
    Given url baseUrl
    And path '/api'
    And header Accept = 'application/json'
    And header Content-Type = 'application/json'
    
  Scenario: Validate operation dependency resolution
    # First, get the list of available operations
    Given path '/operations'
    When method GET
    Then status 200
    And match response.operations != null
    And match response.operations[*].type contains ['authenticate', 'get_projects', 'get_test_cases']
    
    # Get the dependency graph
    Given path '/operations/dependency-graph'
    When method GET
    Then status 200
    And match response.graph != null
    And match response.executionOrder != null
    
    # Verify authenticate happens before get_projects
    * def authIndex = karate.jsonPath(response, "$.executionOrder.indexOf('authenticate')")
    * def projectsIndex = karate.jsonPath(response, "$.executionOrder.indexOf('get_projects')")
    * assert authIndex < projectsIndex
    
    # Verify get_projects happens before get_test_cases
    * def testCasesIndex = karate.jsonPath(response, "$.executionOrder.indexOf('get_test_cases')")
    * assert projectsIndex < testCasesIndex
    
  Scenario: Successfully run a multi-step operation with dependencies
    # This test will execute a complex operation that requires multiple steps
    Given path '/migration/plan'
    And request 
    """
    {
      "sourceSystem": "zephyr",
      "targetSystem": "qtest",
      "projectKey": "TEST",
      "options": {
        "includeAttachments": true 
      }
    }
    """
    When method POST
    Then status 200
    And match response.migrationPlan != null
    And match response.migrationPlan.operations[*].type contains ['authenticate', 'get_projects', 'get_test_cases']
    And match response.executionOrder != null
    
    # Start the migration
    * def migrationId = response.migrationId
    
    Given path '/migration/execute/' + migrationId
    When method POST
    Then status 202
    And match response.status == 'RUNNING'
    
    # Check migration status
    Given path '/migration/' + migrationId
    And retry until response.status == 'COMPLETED' || response.status == 'FAILED'
    When method GET
    Then status 200
    And match response.status == 'COMPLETED'
    
  Scenario: Operation dependency validation detects circular dependencies
    # Test that circular dependencies are detected
    Given path '/operations/validate'
    And request 
    """
    {
      "operations": [
        {
          "type": "operation_a",
          "dependencies": ["operation_b"],
          "required": true,
          "description": "Operation A",
          "requiredParams": []
        },
        {
          "type": "operation_b",
          "dependencies": ["operation_c"],
          "required": true,
          "description": "Operation B",
          "requiredParams": []
        },
        {
          "type": "operation_c",
          "dependencies": ["operation_a"],
          "required": true,
          "description": "Operation C",
          "requiredParams": []
        }
      ]
    }
    """
    When method POST
    Then status 400
    And match response.valid == false
    And match response.errors[0].type == 'circular_dependency'
    
  Scenario: Operation dependency validation detects missing operations
    # Test that missing operation dependencies are detected
    Given path '/operations/validate'
    And request 
    """
    {
      "operations": [
        {
          "type": "operation_a",
          "dependencies": ["non_existent_operation"],
          "required": true,
          "description": "Operation A",
          "requiredParams": []
        }
      ]
    }
    """
    When method POST
    Then status 400
    And match response.valid == false
    And match response.errors[0].type == 'missing_operation'
    
  Scenario: Generate visualization of dependency graph
    # Generate a visualization of the dependency graph
    Given path '/operations/visualize'
    And request 
    """
    {
      "sourceSystem": "zephyr",
      "targetSystem": "qtest",
      "format": "html"
    }
    """
    When method POST
    Then status 200
    And match response.visualization != null
    And match response.visualization contains '<html>'
    And match response.visualization contains 'API Operation Dependency Graph'
    
  Scenario: Calculate minimal operation set for specific goal
    # Calculate minimal set of operations needed for a goal
    Given path '/operations/minimal-set'
    And request 
    """
    {
      "sourceSystem": "zephyr",
      "targetSystem": "qtest",
      "goalOperation": "create_test_case"
    }
    """
    When method POST
    Then status 200
    And match response.operations != null
    And match response.operations contains 'authenticate'
    And match response.operations contains 'get_projects'
    And match response.operations contains 'get_test_cases'
    And match response.operations contains 'create_test_case'