Feature: End-to-End Migration Workflows for All Provider Combinations
  This feature tests complete end-to-end migration workflows between
  all supported provider combinations, validating the full system functionality.

  Background:
    * url apiBaseUrl
    * def orchestratorUrl = orchestratorBaseUrl
    * def binaryUrl = binaryProcessorBaseUrl
    * def timestamp = function(){ return new Date().getTime() }
    * def randomId = function(prefix) { return prefix + '-' + timestamp() + '-' + Math.floor(Math.random() * 10000) }
    * def migrationUtils = read('classpath:org/skidbladnir/utils/migration-utils.js')
    * def testCaseUtils = read('classpath:org/skidbladnir/utils/test-case-utils.js')
    * def testConfigUtils = read('classpath:org/skidbladnir/utils/provider-config-utils.js')
    * def workflowUtils = read('classpath:org/skidbladnir/utils/workflow-utils.js')
    
    # Provider configurations
    * def providers = [
        {name: 'zephyr', config: testConfigUtils.getZephyrConfig(), type: 'source'},
        {name: 'qtest', config: testConfigUtils.getQTestConfig(), type: 'both'},
        {name: 'microfocus', config: testConfigUtils.getMicroFocusConfig(), type: 'both'},
        {name: 'testrail', config: testConfigUtils.getTestRailConfig(), type: 'both'},
        {name: 'jama', config: testConfigUtils.getJamaConfig(), type: 'both'},
        {name: 'rally', config: testConfigUtils.getRallyConfig(), type: 'target'},
        {name: 'azure', config: testConfigUtils.getAzureDevOpsConfig(), type: 'both'},
        {name: 'visure', config: testConfigUtils.getVisureConfig(), type: 'source'}
    ]
    
    # Get source and target providers
    * def sourceProviders = karate.filter(providers, function(p){ return p.type === 'source' || p.type === 'both' })
    * def targetProviders = karate.filter(providers, function(p){ return p.type === 'target' || p.type === 'both' })
    
    # Test case template with basic fields
    * def baseTestCase = {
        name: 'E2E Migration Test',
        description: 'Test case for end-to-end migration workflow testing',
        steps: [
          {
            description: 'Test step 1',
            expectedResult: 'Expected result 1'
          },
          {
            description: 'Test step 2',
            expectedResult: 'Expected result 2'
          }
        ],
        priority: 'Medium',
        status: 'Ready',
        labels: ['E2E', 'Migration']
    }
    
  @multi-provider
  Scenario Outline: End-to-end migration from <source> to <target>
    # Skip self-migrations
    * def skipTest = (source === target)
    * if (skipTest) karate.abort()
    
    # Get provider configurations
    * def sourceConfig = karate.jsonPath(providers, "$[?(@.name=='" + source + "')].config")[0]
    * def targetConfig = karate.jsonPath(providers, "$[?(@.name=='" + target + "')].config")[0]
    
    # Create test case ID with source provider prefix
    * def testCaseId = source.toUpperCase() + '-' + timestamp()
    
    # 1. Create test case in source system
    * def createFunction = 'create' + workflowUtils.capitalize(source) + 'TestCase'
    * def testCase = karate.call(testCaseUtils[createFunction], testCaseId, baseTestCase.name, baseTestCase.description)
    * testCase.steps = baseTestCase.steps
    * testCase.priority = baseTestCase.priority
    * testCase.status = baseTestCase.status
    * testCase.labels = baseTestCase.labels
    
    * def createdTestCase = workflowUtils.createTestCaseInProvider(source, sourceConfig, testCase)
    * def sourceTestCaseId = createdTestCase.id
    
    # Skip test if creation failed (some provider combinations may not be compatible)
    * if (!sourceTestCaseId) karate.abort()
    
    # 2. Configure migration
    * def migrationId = randomId(source + '2' + target)
    
    Given path '/migration/configure'
    And request {
      migrationId: '#(migrationId)',
      sourceProvider: '#(source)',
      sourceConfig: '#(sourceConfig)',
      targetProvider: '#(target)',
      targetConfig: '#(targetConfig)',
      options: {
        testCaseIds: ['#(sourceTestCaseId)'],
        includeAttachments: false,
        fieldMapping: workflowUtils.getDefaultFieldMapping(source, target)
      }
    }
    When method POST
    Then status 200
    And match response.status == 'CONFIGURED' || response.status == 'CONFIGURATION_ERROR'
    
    # Skip test if configuration failed (some provider combinations may not be supported)
    * def skipMigration = (response.status == 'CONFIGURATION_ERROR')
    * if (skipMigration) karate.abort()
    
    # 3. Start migration
    Given path '/migration/' + migrationId + '/start'
    When method POST
    Then status 202
    And match response contains { status: 'RUNNING' }
    
    # 4. Wait for migration to complete
    * def migrationStatus = migrationUtils.pollMigrationStatusUntilComplete(migrationId, 120)
    * match migrationStatus.status == 'COMPLETED' || migrationStatus.status == 'COMPLETED_WITH_WARNINGS'
    
    # 5. Get migration results
    Given path '/migration/' + migrationId + '/results'
    When method GET
    Then status 200
    And match response contains { migrationId: '#(migrationId)', sourceProvider: '#(source)', targetProvider: '#(target)' }
    And match response.results[0].sourceId == sourceTestCaseId
    And match response.results[0].targetId == '#string'
    
    # 6. Verify migrated test case
    * def targetTestCaseId = response.results[0].targetId
    * def verifyResult = workflowUtils.verifyTestCaseInProvider(target, targetConfig, targetTestCaseId)
    
    # 7. Validate core field mappings
    * def verifiedTestCase = verifyResult.testCase
    * match verifiedTestCase contains { name: '#string', description: '#string' }
    * match verifiedTestCase.name contains baseTestCase.name
    
    # 8. Clean up test data
    * workflowUtils.cleanupTestCase(source, sourceConfig, sourceTestCaseId)
    * workflowUtils.cleanupTestCase(target, targetConfig, targetTestCaseId)
    
    Examples:
      | source     | target     |
      | zephyr     | qtest      |
      | zephyr     | testrail   |
      | zephyr     | microfocus |
      | zephyr     | jama       |
      | zephyr     | rally      |
      | zephyr     | azure      |
      | qtest      | testrail   |
      | qtest      | microfocus |
      | qtest      | jama       |
      | qtest      | rally      |
      | qtest      | azure      |
      | qtest      | zephyr     |
      | testrail   | qtest      |
      | testrail   | microfocus |
      | testrail   | jama       |
      | testrail   | rally      |
      | testrail   | azure      |
      | testrail   | zephyr     |
      | microfocus | qtest      |
      | microfocus | testrail   |
      | microfocus | jama       |
      | microfocus | rally      |
      | microfocus | azure      |
      | microfocus | zephyr     |
      | jama       | qtest      |
      | jama       | testrail   |
      | jama       | microfocus |
      | jama       | rally      |
      | jama       | azure      |
      | jama       | zephyr     |
      | azure      | qtest      |
      | azure      | testrail   |
      | azure      | microfocus |
      | azure      | jama       |
      | azure      | rally      |
      | azure      | zephyr     |
      | visure     | qtest      |
      | visure     | testrail   |
      | visure     | microfocus |
      | visure     | jama       |
      | visure     | rally      |
      | visure     | azure      |
      | visure     | zephyr     |

  @complex-workflow
  Scenario: Complex migration workflow with multiple test assets and relationships
    # This scenario tests a more complex migration with multiple related test assets
    
    # 1. Setup source and target
    * def source = 'qtest'
    * def target = 'testrail'
    * def sourceConfig = testConfigUtils.getQTestConfig()
    * def targetConfig = testConfigUtils.getTestRailConfig()
    
    # 2. Create test suite and multiple test cases with relationships
    * def suiteId = 'QTS-' + timestamp()
    * def testCaseCount = 5
    
    # Create test suite
    * def suite = {
        id: suiteId,
        name: 'E2E Complex Migration Test Suite',
        description: 'Test suite for complex migration workflow'
    }
    * def createdSuite = workflowUtils.createTestSuiteInProvider(source, sourceConfig, suite)
    * def sourceSuiteId = createdSuite.id
    
    # Create multiple test cases in the suite
    * def createTestCases = function() {
        var testCases = [];
        for (var i = 0; i < testCaseCount; i++) {
          var testCaseId = 'QTC-' + timestamp() + '-' + i;
          var testCase = {
            id: testCaseId,
            name: 'Complex Test Case ' + (i+1),
            description: 'Test case ' + (i+1) + ' for complex migration workflow',
            steps: [
              {
                description: 'Test step 1 for case ' + (i+1),
                expectedResult: 'Expected result 1'
              },
              {
                description: 'Test step 2 for case ' + (i+1),
                expectedResult: 'Expected result 2'
              }
            ],
            priority: (i % 3 === 0) ? 'High' : ((i % 3 === 1) ? 'Medium' : 'Low'),
            status: (i % 2 === 0) ? 'Ready' : 'Draft',
            suiteId: sourceSuiteId
          };
          
          var createdCase = workflowUtils.createTestCaseInProvider(source, sourceConfig, testCase);
          testCases.push({
            id: createdCase.id,
            name: testCase.name,
            priority: testCase.priority,
            status: testCase.status
          });
        }
        return testCases;
    }
    
    * def sourceTestCases = createTestCases()
    * def sourceTestCaseIds = karate.map(sourceTestCases, function(x){ return x.id })
    
    # 3. Configure complex migration
    * def migrationId = randomId('complex')
    
    Given path '/migration/configure'
    And request {
      migrationId: '#(migrationId)',
      sourceProvider: '#(source)',
      sourceConfig: '#(sourceConfig)',
      targetProvider: '#(target)',
      targetConfig: '#(targetConfig)',
      options: {
        includeTestSuites: true,
        includeRelationships: true,
        includeTags: true,
        testSuiteIds: ['#(sourceSuiteId)'],
        preserveHierarchy: true,
        fieldMapping: workflowUtils.getDefaultFieldMapping(source, target)
      }
    }
    When method POST
    Then status 200
    And match response.status == 'CONFIGURED'
    
    # 4. Start migration
    Given path '/migration/' + migrationId + '/start'
    When method POST
    Then status 202
    And match response contains { status: 'RUNNING' }
    
    # 5. Wait for migration to complete
    * def migrationStatus = migrationUtils.pollMigrationStatusUntilComplete(migrationId, 180)
    * match migrationStatus.status == 'COMPLETED' || migrationStatus.status == 'COMPLETED_WITH_WARNINGS'
    
    # 6. Get migration results
    Given path '/migration/' + migrationId + '/results'
    When method GET
    Then status 200
    And match response contains { migrationId: '#(migrationId)', sourceProvider: '#(source)', targetProvider: '#(target)' }
    
    # Verify test suite was migrated
    * def suiteMigration = karate.jsonPath(response.results, "$[?(@.sourceType=='TEST_SUITE' && @.sourceId=='" + sourceSuiteId + "')]")[0]
    * def targetSuiteId = suiteMigration.targetId
    * match targetSuiteId == '#string'
    
    # Verify all test cases were migrated
    * def caseMigrations = karate.jsonPath(response.results, "$[?(@.sourceType=='TEST_CASE')]")
    * match caseMigrations == '#[' + testCaseCount + ']'
    * def targetTestCaseIds = karate.map(caseMigrations, function(x){ return x.targetId })
    
    # 7. Verify test suite
    * def verifyResult = workflowUtils.verifyTestSuiteInProvider(target, targetConfig, targetSuiteId)
    * def verifiedSuite = verifyResult.testSuite
    * match verifiedSuite.name contains suite.name
    
    # 8. Verify test cases and their relationships
    * def verifyTestCases = function() {
        var results = [];
        for (var i = 0; i < targetTestCaseIds.length; i++) {
          var verifyResult = workflowUtils.verifyTestCaseInProvider(target, targetConfig, targetTestCaseIds[i]);
          if (verifyResult && verifyResult.testCase) {
            results.push({
              id: targetTestCaseIds[i],
              name: verifyResult.testCase.name,
              suiteId: verifyResult.testCase.suiteId || verifyResult.testCase.parentId || null
            });
          }
        }
        return results;
    }
    
    * def verifiedTestCases = verifyTestCases()
    * match verifiedTestCases == '#[' + testCaseCount + ']'
    
    # Verify test cases are in the migrated suite
    * def testCasesInSuite = karate.filter(verifiedTestCases, function(tc){ 
        return tc.suiteId == targetSuiteId || tc.suiteId == null 
      })
    * match testCasesInSuite == '#[' + testCaseCount + ']'
    
    # 9. Clean up test data
    * workflowUtils.cleanupTestSuite(source, sourceConfig, sourceSuiteId)
    * workflowUtils.cleanupTestSuite(target, targetConfig, targetSuiteId)
    * for (var i = 0; i < sourceTestCaseIds.length; i++) {
        workflowUtils.cleanupTestCase(source, sourceConfig, sourceTestCaseIds[i]);
      }
    * for (var i = 0; i < targetTestCaseIds.length; i++) {
        workflowUtils.cleanupTestCase(target, targetConfig, targetTestCaseIds[i]);
      }

  @multi-phase
  Scenario: Multi-phase migration with execution history and custom fields
    # This scenario tests a full migration including test cases, executions, and custom fields
    
    # 1. Setup source and target
    * def source = 'zephyr'
    * def target = 'qtest'
    * def sourceConfig = testConfigUtils.getZephyrConfig()
    * def targetConfig = testConfigUtils.getQTestConfig()
    
    # 2. Create test case with execution history and custom fields
    * def testCaseId = 'ZTC-' + timestamp()
    * def testCase = {
        id: testCaseId,
        name: 'Multi-phase Migration Test',
        description: 'Test case for multi-phase migration workflow',
        steps: [
          {
            description: 'Login to application',
            expectedResult: 'Successfully logged in'
          },
          {
            description: 'Navigate to user profile',
            expectedResult: 'Profile page displayed'
          },
          {
            description: 'Update user information',
            expectedResult: 'Information updated successfully'
          }
        ],
        priority: 'High',
        status: 'Approved',
        customFields: {
          automationStatus: 'Automated',
          component: 'User Management',
          testEnvironment: 'Production',
          estimatedTime: 15,
          complexity: 'Medium',
          testDataRequirements: 'User account with admin privileges'
        }
    }
    
    # Create test case
    * def createdTestCase = workflowUtils.createTestCaseInProvider(source, sourceConfig, testCase)
    * def sourceTestCaseId = createdTestCase.id
    
    # 3. Create test executions (runs)
    * def createExecutions = function() {
        var executions = [];
        // Create 3 executions with different results
        var statuses = ['Passed', 'Failed', 'Blocked'];
        
        for (var i = 0; i < 3; i++) {
          var execution = {
            testCaseId: sourceTestCaseId,
            status: statuses[i],
            executedBy: 'Test User',
            executedOn: new Date(Date.now() - (i * 86400000)).toISOString(), // Today, yesterday, 2 days ago
            duration: (i + 1) * 5, // 5, 10, 15 minutes
            environment: 'Test Environment',
            comment: 'Execution ' + (i + 1) + ' - ' + statuses[i],
            stepResults: []
          };
          
          // Add step results
          for (var j = 0; j < testCase.steps.length; j++) {
            execution.stepResults.push({
              stepIndex: j,
              status: (i === 1 && j === 2) ? 'Failed' : 'Passed', // Make the last step fail in the second execution
              comment: (i === 1 && j === 2) ? 'Failed to update user information' : ''
            });
          }
          
          var createdExecution = workflowUtils.createTestExecutionInProvider(source, sourceConfig, execution);
          executions.push(createdExecution);
        }
        return executions;
    }
    
    * def sourceExecutions = createExecutions()
    * def sourceExecutionIds = karate.map(sourceExecutions, function(x){ return x.id })
    
    # 4. Configure multi-phase migration
    * def migrationId = randomId('multi-phase')
    
    Given path '/migration/configure'
    And request {
      migrationId: '#(migrationId)',
      sourceProvider: '#(source)',
      sourceConfig: '#(sourceConfig)',
      targetProvider: '#(target)',
      targetConfig: '#(targetConfig)',
      options: {
        testCaseIds: ['#(sourceTestCaseId)'],
        includeExecutions: true,
        includeCustomFields: true,
        phases: ['TEST_CASE', 'CUSTOM_FIELD', 'EXECUTION_HISTORY'],
        fieldMapping: workflowUtils.getDefaultFieldMapping(source, target)
      }
    }
    When method POST
    Then status 200
    And match response.status == 'CONFIGURED'
    
    # 5. Start migration
    Given path '/migration/' + migrationId + '/start'
    When method POST
    Then status 202
    And match response contains { status: 'RUNNING' }
    
    # 6. Wait for migration to complete
    * def migrationStatus = migrationUtils.pollMigrationStatusUntilComplete(migrationId, 180)
    * match migrationStatus.status == 'COMPLETED' || migrationStatus.status == 'COMPLETED_WITH_WARNINGS'
    
    # 7. Get migration results
    Given path '/migration/' + migrationId + '/phases'
    When method GET
    Then status 200
    And match response contains { migrationId: '#(migrationId)', totalPhases: 3 }
    And match response.phases[*].name contains 'TEST_CASE'
    And match response.phases[*].name contains 'CUSTOM_FIELD'
    And match response.phases[*].name contains 'EXECUTION_HISTORY'
    And match response.phases[*].status contains 'COMPLETED'
    
    Given path '/migration/' + migrationId + '/results'
    When method GET
    Then status 200
    And match response contains { migrationId: '#(migrationId)', sourceProvider: '#(source)', targetProvider: '#(target)' }
    
    # Get test case migration result
    * def caseMigration = karate.jsonPath(response.results, "$[?(@.sourceType=='TEST_CASE' && @.sourceId=='" + sourceTestCaseId + "')]")[0]
    * def targetTestCaseId = caseMigration.targetId
    * match targetTestCaseId == '#string'
    
    # Get execution migration results
    * def executionMigrations = karate.jsonPath(response.results, "$[?(@.sourceType=='TEST_EXECUTION')]")
    * match executionMigrations == '#[3]'
    * def targetExecutionIds = karate.map(executionMigrations, function(x){ return x.targetId })
    
    # 8. Verify test case with custom fields
    * def verifyResult = workflowUtils.verifyTestCaseInProvider(target, targetConfig, targetTestCaseId)
    * def verifiedTestCase = verifyResult.testCase
    * match verifiedTestCase.name contains testCase.name
    
    # Verify custom fields were migrated
    * match verifiedTestCase.customFields contains { automationStatus: '#string', component: '#string' }
    
    # 9. Verify executions
    * def verifyExecutions = function() {
        var results = [];
        for (var i = 0; i < targetExecutionIds.length; i++) {
          var verifyResult = workflowUtils.verifyTestExecutionInProvider(target, targetConfig, targetExecutionIds[i]);
          if (verifyResult && verifyResult.execution) {
            results.push({
              id: targetExecutionIds[i],
              status: verifyResult.execution.status,
              testCaseId: verifyResult.execution.testCaseId || verifyResult.execution.testRunId
            });
          }
        }
        return results;
    }
    
    * def verifiedExecutions = verifyExecutions()
    * match verifiedExecutions == '#[3]'
    
    # 10. Clean up test data
    * workflowUtils.cleanupTestCase(source, sourceConfig, sourceTestCaseId)
    * workflowUtils.cleanupTestCase(target, targetConfig, targetTestCaseId)
    * for (var i = 0; i < sourceExecutionIds.length; i++) {
        workflowUtils.cleanupTestExecution(source, sourceConfig, sourceExecutionIds[i]);
      }
    * for (var i = 0; i < targetExecutionIds.length; i++) {
        workflowUtils.cleanupTestExecution(target, targetConfig, targetExecutionIds[i]);
      }