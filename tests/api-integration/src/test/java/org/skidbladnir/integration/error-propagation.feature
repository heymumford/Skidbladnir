Feature: Error Propagation Between Adapters and Orchestration Layer
  This feature tests the error handling and propagation between provider adapters, the API layer,
  and the orchestration layer to ensure consistent error reporting and recovery mechanisms.

  Background:
    * url apiBaseUrl
    * def orchestratorUrl = orchestratorBaseUrl
    * def timestamp = function(){ return new Date().getTime() }
    * def randomId = function(prefix) { return prefix + '-' + timestamp() + '-' + Math.floor(Math.random() * 10000) }
    * def errorUtils = read('classpath:org/skidbladnir/utils/error-utils.js')

  Scenario: API propagates authentication errors from source provider to orchestrator
    # Setup a migration with invalid source credentials
    * def migrationId = randomId('auth-err')
    
    Given path '/migration/configure'
    And request {
      migrationId: '#(migrationId)',
      sourceProvider: 'zephyr',
      sourceConfig: {
        url: 'https://zephyr-test.example.com',
        apiToken: 'INVALID_TOKEN',
        projectId: 'DEMO'
      },
      targetProvider: 'qtest',
      targetConfig: {
        url: 'https://qtest-test.example.com',
        apiToken: '#(qTestApiToken)',
        projectId: 123
      }
    }
    When method POST
    Then status 200
    And match response contains { migrationId: '#(migrationId)', status: 'CONFIGURED' }
    
    # Start migration, which should trigger the authentication error
    Given path '/migration/' + migrationId + '/start'
    When method POST
    Then status 202
    And match response contains { status: 'RUNNING' }
    
    # Wait for error to propagate (polling)
    * def migrationStatus = errorUtils.pollMigrationStatusUntilError(migrationId, 60)
    
    # Verify error is reported correctly in API
    Given path '/migration/' + migrationId
    When method GET
    Then status 200
    And match response.status == 'FAILED'
    And match response.error contains { code: '#string', message: '#string', category: 'AUTHENTICATION', origin: 'ZEPHYR_PROVIDER' }
    And match response.error.message contains 'Authentication failed'
    And match response.error.details contains { provider: 'zephyr' }
    
    # Verify error is propagated to orchestrator
    Given url orchestratorUrl
    And path '/workflows/' + migrationId
    When method GET
    Then status 200
    And match response.status == 'FAILED'
    And match response.error contains { code: '#string', message: '#string', category: 'AUTHENTICATION' }
    And match response.errorDetails contains { origin: 'ZEPHYR_PROVIDER' }

  Scenario: Rate limit errors from providers are properly handled and retried
    # Setup a migration with configurations that will trigger rate limiting
    * def migrationId = randomId('rate-limit-err')
    
    Given path '/migration/configure'
    And request {
      migrationId: '#(migrationId)',
      sourceProvider: 'zephyr',
      sourceConfig: {
        url: 'https://zephyr-test.example.com',
        apiToken: '#(zephyrApiToken)',
        projectId: 'RATE_LIMITED', // Special test project that triggers rate limiting
        options: {
          simulateRateLimit: true
        }
      },
      targetProvider: 'qtest',
      targetConfig: {
        url: 'https://qtest-test.example.com',
        apiToken: '#(qTestApiToken)',
        projectId: 123
      }
    }
    When method POST
    Then status 200
    And match response contains { migrationId: '#(migrationId)', status: 'CONFIGURED' }
    
    # Start migration, which should encounter rate limiting
    Given path '/migration/' + migrationId + '/start'
    When method POST
    Then status 202
    And match response contains { status: 'RUNNING' }
    
    # Wait and check that migration is still running after retries
    * def initialStatus = errorUtils.waitForMigrationStatus(migrationId, 5)
    * match initialStatus.status == 'RUNNING'
    
    # Wait for completion (should eventually succeed after retries)
    * def finalStatus = errorUtils.pollMigrationStatusUntilComplete(migrationId, 120)
    * match finalStatus.status == 'COMPLETED'
    
    # Verify retry information is recorded
    Given path '/migration/' + migrationId + '/events'
    When method GET
    Then status 200
    And match response[*].eventType contains 'RATE_LIMIT_ENCOUNTERED'
    And match response[*].eventType contains 'OPERATION_RETRIED'
    
    # Verify the workflow events in orchestrator
    Given url orchestratorUrl
    And path '/workflows/' + migrationId + '/events'
    When method GET
    Then status 200
    And match response[*].type contains 'RATE_LIMIT_ENCOUNTERED'
    And match response[*].type contains 'OPERATION_RETRIED'
    And match response[*].type contains 'STEP_COMPLETED' // Should eventually complete

  Scenario: Invalid data errors are propagated with field-level details
    # Setup a migration with data that will cause validation failures
    * def migrationId = randomId('data-err')
    
    Given path '/migration/configure'
    And request {
      migrationId: '#(migrationId)',
      sourceProvider: 'zephyr',
      sourceConfig: {
        url: 'https://zephyr-test.example.com',
        apiToken: '#(zephyrApiToken)',
        projectId: 'DEMO',
        testCaseIds: ['INVALID_FORMAT_TC']  // Special test case ID that triggers format validation error
      },
      targetProvider: 'qtest',
      targetConfig: {
        url: 'https://qtest-test.example.com',
        apiToken: '#(qTestApiToken)',
        projectId: 123
      }
    }
    When method POST
    Then status 200
    And match response contains { migrationId: '#(migrationId)', status: 'CONFIGURED' }
    
    # Start migration, which should encounter data validation errors
    Given path '/migration/' + migrationId + '/start'
    When method POST
    Then status 202
    And match response contains { status: 'RUNNING' }
    
    # Wait for error to propagate
    * def migrationStatus = errorUtils.pollMigrationStatusUntilError(migrationId, 60)
    
    # Verify detailed error information is available in API
    Given path '/migration/' + migrationId
    When method GET
    Then status 200
    And match response.status == 'FAILED'
    And match response.error contains { code: '#string', message: '#string', category: 'VALIDATION', origin: 'TARGET_PROVIDER' }
    And match response.error.details contains { targetSystem: 'qtest', fieldErrors: '#array' }
    And match response.error.details.fieldErrors[0] contains { field: '#string', message: '#string' }
    
    # Check error details endpoint for field-level validation errors
    Given path '/migration/' + migrationId + '/errors'
    When method GET
    Then status 200
    And match response contains { migrationId: '#(migrationId)', errors: '#array' }
    And match response.errors[0] contains { category: 'VALIDATION', fieldPath: '#string' }

  Scenario: Network errors during migration are handled with custom retry logic
    # Setup a migration with configuration that will trigger network errors
    * def migrationId = randomId('network-err')
    
    Given path '/migration/configure'
    And request {
      migrationId: '#(migrationId)',
      sourceProvider: 'zephyr',
      sourceConfig: {
        url: 'https://zephyr-test.example.com',
        apiToken: '#(zephyrApiToken)',
        projectId: 'DEMO'
      },
      targetProvider: 'qtest',
      targetConfig: {
        url: 'https://qtest-test.example.com',
        apiToken: '#(qTestApiToken)',
        projectId: 123,
        options: {
          simulateNetworkErrors: true,
          networkErrorCount: 2  // Simulate 2 network errors before succeeding
        }
      }
    }
    When method POST
    Then status 200
    And match response contains { migrationId: '#(migrationId)', status: 'CONFIGURED' }
    
    # Start migration, which should encounter network errors
    Given path '/migration/' + migrationId + '/start'
    When method POST
    Then status 202
    And match response contains { status: 'RUNNING' }
    
    # Wait for successful completion after retries
    * def migrationStatus = errorUtils.pollMigrationStatusUntilComplete(migrationId, 120)
    * match migrationStatus.status == 'COMPLETED'
    
    # Verify retry information is recorded
    Given path '/migration/' + migrationId + '/events'
    When method GET
    Then status 200
    And match response[*].eventType contains 'NETWORK_ERROR_ENCOUNTERED'
    And match response[*].eventType contains 'OPERATION_RETRIED'
    
    # Verify the workflow completed in orchestrator
    Given url orchestratorUrl
    And path '/workflows/' + migrationId
    When method GET
    Then status 200
    And match response.status == 'COMPLETED'

  Scenario: Resource not found errors are properly identified and reported
    # Setup a migration with non-existent resource
    * def migrationId = randomId('not-found-err')
    
    Given path '/migration/configure'
    And request {
      migrationId: '#(migrationId)',
      sourceProvider: 'zephyr',
      sourceConfig: {
        url: 'https://zephyr-test.example.com',
        apiToken: '#(zephyrApiToken)',
        projectId: 'DEMO',
        testCaseIds: ['NONEXISTENT_TC_ID']  // Test case that doesn't exist
      },
      targetProvider: 'qtest',
      targetConfig: {
        url: 'https://qtest-test.example.com',
        apiToken: '#(qTestApiToken)',
        projectId: 123
      }
    }
    When method POST
    Then status 200
    And match response contains { migrationId: '#(migrationId)', status: 'CONFIGURED' }
    
    # Start migration
    Given path '/migration/' + migrationId + '/start'
    When method POST
    Then status 202
    And match response contains { status: 'RUNNING' }
    
    # Wait for error to propagate
    * def migrationStatus = errorUtils.pollMigrationStatusUntilError(migrationId, 60)
    
    # Verify error is categorized as RESOURCE_NOT_FOUND
    Given path '/migration/' + migrationId
    When method GET
    Then status 200
    And match response.status == 'FAILED'
    And match response.error contains { code: '#string', message: '#string', category: 'RESOURCE_NOT_FOUND', origin: 'SOURCE_PROVIDER' }
    And match response.error.message contains 'Test case not found'
    
    # Verify error is propagated with complete context
    Given path '/migration/' + migrationId + '/errors'
    When method GET
    Then status 200
    And match response.errors[0] contains { resourceType: 'TEST_CASE', resourceId: 'NONEXISTENT_TC_ID' }

  Scenario: Errors from binary processor are propagated through orchestrator to API
    # Setup a migration with binary processor errors (attachment processing)
    * def migrationId = randomId('binary-err')
    
    Given path '/migration/configure'
    And request {
      migrationId: '#(migrationId)',
      sourceProvider: 'zephyr',
      sourceConfig: {
        url: 'https://zephyr-test.example.com',
        apiToken: '#(zephyrApiToken)',
        projectId: 'DEMO',
        testCaseIds: ['TC_WITH_CORRUPTED_ATTACHMENT']  // Special test case with corrupted attachment
      },
      targetProvider: 'qtest',
      targetConfig: {
        url: 'https://qtest-test.example.com',
        apiToken: '#(qTestApiToken)',
        projectId: 123
      },
      options: {
        includeAttachments: true
      }
    }
    When method POST
    Then status 200
    And match response contains { migrationId: '#(migrationId)', status: 'CONFIGURED' }
    
    # Start migration
    Given path '/migration/' + migrationId + '/start'
    When method POST
    Then status 202
    And match response contains { status: 'RUNNING' }
    
    # Wait for partial completion with errors
    * def migrationStatus = errorUtils.pollMigrationStatusUntilPartialComplete(migrationId, 60)
    * match migrationStatus.status == 'COMPLETED_WITH_ERRORS'
    
    # Verify attachment processing errors are reported
    Given path '/migration/' + migrationId + '/errors'
    When method GET
    Then status 200
    And match response.errors[*].category contains 'ATTACHMENT_PROCESSING'
    And match response.errors[*].origin contains 'BINARY_PROCESSOR'
    
    # Verify the binary processor error details
    * def attachmentErrors = response.errors.filter(e => e.category === 'ATTACHMENT_PROCESSING')
    * match attachmentErrors[0] contains { attachmentId: '#string', reason: 'CORRUPT_FILE' }
    
    # Verify orchestrator has recorded the binary processor errors
    Given url orchestratorUrl
    And path '/workflows/' + migrationId + '/events'
    When method GET
    Then status 200
    And match response[*].type contains 'BINARY_PROCESSOR_ERROR'
    And match response[*].data contains { attachmentId: '#string' }

  Scenario: Partial success with multiple error categories is properly reported
    # Setup a complex migration with multiple potential errors
    * def migrationId = randomId('mixed-err')
    
    Given path '/migration/configure'
    And request {
      migrationId: '#(migrationId)',
      sourceProvider: 'zephyr',
      sourceConfig: {
        url: 'https://zephyr-test.example.com',
        apiToken: '#(zephyrApiToken)',
        projectId: 'DEMO',
        testCaseIds: ['NORMAL_TC', 'VALIDATION_ERROR_TC', 'NETWORK_ERROR_TC', 'TC_WITH_CORRUPTED_ATTACHMENT']
      },
      targetProvider: 'qtest',
      targetConfig: {
        url: 'https://qtest-test.example.com',
        apiToken: '#(qTestApiToken)',
        projectId: 123
      },
      options: {
        includeAttachments: true,
        continueOnError: true  // Important flag to continue despite errors
      }
    }
    When method POST
    Then status 200
    And match response contains { migrationId: '#(migrationId)', status: 'CONFIGURED' }
    
    # Start migration
    Given path '/migration/' + migrationId + '/start'
    When method POST
    Then status 202
    And match response contains { status: 'RUNNING' }
    
    # Wait for partial completion
    * def migrationStatus = errorUtils.pollMigrationStatusUntilPartialComplete(migrationId, 120)
    * match migrationStatus.status == 'COMPLETED_WITH_ERRORS'
    
    # Verify multiple error types are grouped and reported
    Given path '/migration/' + migrationId + '/error-summary'
    When method GET
    Then status 200
    And match response contains { migrationId: '#(migrationId)', totalErrors: '#number', categorySummary: '#object' }
    And match response.categorySummary contains { VALIDATION: '#number', NETWORK: '#number', ATTACHMENT_PROCESSING: '#number' }
    And match response.successful contains { count: '#number', percentage: '#number' }
    
    # Verify orchestrator recorded summary information
    Given url orchestratorUrl
    And path '/workflows/' + migrationId + '/summary'
    When method GET
    Then status 200
    And match response contains { totalItems: '#number', successfulItems: '#number', failedItems: '#number' }
    And match response.errorCategories contains ['VALIDATION', 'NETWORK', 'ATTACHMENT_PROCESSING']