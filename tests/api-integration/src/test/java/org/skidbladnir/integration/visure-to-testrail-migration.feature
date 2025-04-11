Feature: Visure Solutions to TestRail Migration Workflow

  Background:
    * url baseUrl
    * header Accept = 'application/json'
    * header Content-Type = 'application/json'
    * def timestamp = function(){ return new Date().getTime() }
    * def visureAuth = call read('classpath:auth-visure.js')
    * def testrailAuth = call read('classpath:auth-testrail.js')
    * def migrationHelper = read('classpath:org/skidbladnir/utils/migration-helper.js')
    
  Scenario: Verify end-to-end migration workflow from Visure Solutions to TestRail
    # 1. Create test artifacts in Visure Solutions for migration
    # 1.1 Create a project or retrieve an existing one
    Given path '/api/v1/projects'
    And header Authorization = visureAuth
    And request { name: 'Migration Test Project ' + timestamp(), description: 'Created for Visure to TestRail migration test' }
    When method POST
    Then status 200
    And match response contains { id: '#string', name: '#string' }
    * def visureProjectId = response.id
    
    # 1.2 Create a folder for test cases
    Given path '/api/v1/projects/' + visureProjectId + '/folders'
    And header Authorization = visureAuth
    And request { name: 'Migration Test Folder ' + timestamp(), description: 'Test Cases for migration test' }
    When method POST
    Then status 200
    And match response contains { id: '#string', name: '#string' }
    * def visureFolderId = response.id
    
    # 1.3 Create multiple test cases with different priorities and statuses
    * def testCaseData = [
      { 
        title: 'Login Functionality Test', 
        description: 'Verify user login with valid credentials', 
        status: 'Approved',
        priority: 'High',
        steps: [
          { order: 1, action: 'Navigate to login page', expected: 'Login page is displayed' },
          { order: 2, action: 'Enter valid username and password', expected: 'User is logged in successfully' },
          { order: 3, action: 'Verify dashboard elements', expected: 'Dashboard is displayed with all user-specific elements' }
        ],
        requirementId: 'REQ001',
        automationStatus: 'Automated'
      },
      { 
        title: 'Password Reset Test', 
        description: 'Verify user can reset their password',
        status: 'Approved',
        priority: 'Medium',
        steps: [
          { order: 1, action: 'Navigate to login page', expected: 'Login page is displayed' },
          { order: 2, action: 'Click Forgot Password link', expected: 'Password reset page is displayed' },
          { order: 3, action: 'Enter email address', expected: 'System sends reset email' },
          { order: 4, action: 'Click on reset link in email', expected: 'Password reset form is displayed' },
          { order: 5, action: 'Enter new password and confirm', expected: 'Password reset confirmation is displayed' }
        ],
        requirementId: 'REQ002',
        automationStatus: 'Manual'
      },
      { 
        title: 'User Registration Test', 
        description: 'Verify new user registration process',
        status: 'Ready for Review',
        priority: 'Critical',
        steps: [
          { order: 1, action: 'Navigate to registration page', expected: 'Registration form is displayed' },
          { order: 2, action: 'Enter user details and submit', expected: 'Confirmation page is displayed' },
          { order: 3, action: 'Verify confirmation email', expected: 'Email is received with activation link' },
          { order: 4, action: 'Click activation link', expected: 'Account is activated successfully' }
        ],
        requirementId: 'REQ003',
        automationStatus: 'Planned'
      }
    ]
    
    # Create each test case
    * def visureTestCaseIds = []
    * def createTestCase = 
      """
      function(tc) {
        karate.log('Creating Visure test case:', tc.title);
        var result = karate.call('classpath:org/skidbladnir/utils/create-visure-testcase.feature', 
          { projectId: visureProjectId, folderId: visureFolderId, testCase: tc });
        visureTestCaseIds.push(result.id);
        return result;
      }
      """
    * eval visureTestCases = karate.map(testCaseData, createTestCase)
    
    # 2. Set up TestRail destination project
    # 2.1 Create a TestRail project or use existing one
    Given path '/index.php'
    And path '/api/v2/add_project'
    And header Authorization = testrailAuth
    And request { name: 'Migration Destination ' + timestamp(), announcement: 'Created for Visure migration test', suite_mode: 2 }
    When method POST
    Then status 200
    And match response contains { id: '#number', name: '#string' }
    * def testrailProjectId = response.id
    
    # 2.2 Create a test suite
    Given path '/index.php'
    And path '/api/v2/add_suite/' + testrailProjectId
    And header Authorization = testrailAuth
    And request { name: 'Migration Test Suite ' + timestamp(), description: 'Suite for migration from Visure' }
    When method POST
    Then status 200
    And match response contains { id: '#number', name: '#string' }
    * def testrailSuiteId = response.id
    
    # 2.3 Create a test section
    Given path '/index.php'
    And path '/api/v2/add_section/' + testrailProjectId
    And header Authorization = testrailAuth
    And request { name: 'Migrated Test Cases ' + timestamp(), suite_id: testrailSuiteId, description: 'Test cases migrated from Visure' }
    When method POST
    Then status 200
    And match response contains { id: '#number', name: '#string' }
    * def testrailSectionId = response.id
    
    # 3. Trigger migration process via API
    # 3.1 Configure migration settings
    Given path '/api/v1/migrations/configure'
    And request {
      sourceProvider: 'visure',
      targetProvider: 'testrail',
      sourceConfig: {
        projectId: visureProjectId,
        folderId: visureFolderId,
        testCaseIds: visureTestCaseIds
      },
      targetConfig: {
        projectId: testrailProjectId,
        suiteId: testrailSuiteId,
        sectionId: testrailSectionId
      },
      fieldMappings: [
        { sourceField: 'title', targetField: 'title' },
        { sourceField: 'description', targetField: 'description' },
        { sourceField: 'status', targetField: 'status_id', transformationRule: 'mapStatus' },
        { sourceField: 'priority', targetField: 'priority_id', transformationRule: 'mapPriority' },
        { sourceField: 'steps', targetField: 'custom_steps_separated', transformationRule: 'mapSteps' },
        { sourceField: 'automationStatus', targetField: 'custom_automation_status', transformationRule: 'mapAutomationStatus' }
      ]
    }
    When method POST
    Then status 200
    And match response contains { migrationId: '#string', status: 'CONFIGURED' }
    * def migrationId = response.migrationId
    
    # 3.2 Start migration process
    Given path '/api/v1/migrations/' + migrationId + '/start'
    When method POST
    Then status 202
    And match response contains { status: 'RUNNING' }
    
    # 3.3 Poll migration status until complete or timeout
    * def migrationStatus = migrationHelper.pollMigrationStatus(migrationId, 60) // Wait up to 60 seconds
    * match migrationStatus contains { status: 'COMPLETED' }
    
    # 4. Verify migration results
    # 4.1 Get migration summary
    Given path '/api/v1/migrations/' + migrationId
    When method GET
    Then status 200
    And match response contains { status: 'COMPLETED' }
    And match response contains { sourceItemsCount: '#number', targetItemsCount: '#number', errors: '#array' }
    And match response.sourceItemsCount == visureTestCaseIds.length
    And match response.targetItemsCount == visureTestCaseIds.length
    And match response.errors == '#[0]'
    
    # 4.2 Verify test cases in TestRail
    * def migrationDetails = response.details
    * def mappedTestCaseIds = migrationDetails.itemMappings
    
    # Verify each test case was migrated correctly
    * def verifyTestCase = 
      """
      function(mapping) {
        karate.log('Verifying migration for test case mapping:', mapping);
        var result = karate.call('classpath:org/skidbladnir/utils/verify-testrail-testcase.feature', 
          { caseId: mapping.targetId, originalTitle: mapping.sourceName });
        return result.verified;
      }
      """
    * eval verifications = karate.map(mappedTestCaseIds, verifyTestCase)
    * match verifications == '#[3]'
    * match verifications !contains false
    
    # 5. Clean up (optional, usually would be done for test isolation)
    # 5.1 Delete TestRail test cases and project
    * eval migrationHelper.cleanupTestRail(testrailProjectId, mappedTestCaseIds)
    
    # 5.2 Delete Visure test cases and project
    * eval migrationHelper.cleanupVisure(visureProjectId, visureTestCaseIds)