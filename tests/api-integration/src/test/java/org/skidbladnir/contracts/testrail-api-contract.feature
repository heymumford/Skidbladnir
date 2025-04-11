Feature: TestRail API Contract Testing

  Background:
    * url baseUrl
    * header Accept = 'application/json'
    * header Content-Type = 'application/json'
    * def timestamp = function(){ return new Date().getTime() }
    
  Scenario: Verify TestRail authentication
    Given path '/index.php'
    And path '/api/v2/get_current_user'
    And header Authorization = call read('classpath:auth-testrail.js')
    When method GET
    Then status 200
    And match response contains { email: '#string' }

  Scenario: Get TestRail projects
    Given path '/index.php'
    And path '/api/v2/get_projects'
    And header Authorization = call read('classpath:auth-testrail.js')
    When method GET
    Then status 200
    And match response == '#array'
    And match each response contains { id: '#number', name: '#string' }

  Scenario: Get TestRail test suites for a project
    Given path '/index.php'
    And path '/api/v2/get_suites/1'  # Assuming project ID 1 exists
    And header Authorization = call read('classpath:auth-testrail.js')
    When method GET
    Then status 200
    And match response == '#array'
    And match each response contains { id: '#number', name: '#string', project_id: '#number' }

  Scenario: Create, update and delete a test case
    # Create a section first (test cases require a section)
    Given path '/index.php'
    And path '/api/v2/add_section/1'  # Assuming project ID 1 exists
    And header Authorization = call read('classpath:auth-testrail.js')
    And request { name: 'API Test Section ' + timestamp(), suite_id: 1, description: 'Created via API tests' }
    When method POST
    Then status 200
    And match response contains { id: '#number', name: '#string' }
    * def sectionId = response.id

    # Create a test case in the section
    Given path '/index.php'
    And path '/api/v2/add_case/' + sectionId
    And header Authorization = call read('classpath:auth-testrail.js')
    And request { title: 'API Test Case ' + timestamp(), priority_id: 2, custom_steps_separated: [{ content: 'Step 1', expected: 'Expected result 1' }] }
    When method POST
    Then status 200
    And match response contains { id: '#number', title: '#string' }
    * def caseId = response.id

    # Update the test case
    Given path '/index.php'
    And path '/api/v2/update_case/' + caseId
    And header Authorization = call read('classpath:auth-testrail.js')
    And request { title: 'Updated API Test Case ' + timestamp(), priority_id: 3 }
    When method POST
    Then status 200
    And match response contains { id: '#number', title: '#string' }
    And match response.priority_id == 3

    # Delete the test case
    Given path '/index.php'
    And path '/api/v2/delete_case/' + caseId
    And header Authorization = call read('classpath:auth-testrail.js')
    When method POST
    Then status 200

  Scenario: Handle API errors appropriately
    # Test not found error
    Given path '/index.php'
    And path '/api/v2/get_case/99999999'  # Non-existent case ID
    And header Authorization = call read('classpath:auth-testrail.js')
    When method GET
    Then status 400
    And match response contains { error: '#string' }

    # Test authentication failure
    Given path '/index.php'
    And path '/api/v2/get_projects'
    And header Authorization = 'Basic ' + java.util.Base64.getEncoder().encodeToString('invalid:invalid'.bytes)
    When method GET
    Then status 401