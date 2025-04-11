Feature: Connection Resilience Under Network Degradation
  This feature tests the system's ability to handle various network
  degradation scenarios including latency, packet loss, connection drops,
  and intermittent failures across all provider adapters.

  Background:
    * url apiBaseUrl
    * def orchestratorUrl = orchestratorBaseUrl
    * def binaryUrl = binaryProcessorBaseUrl
    * def timestamp = function(){ return new Date().getTime() }
    * def randomId = function(prefix) { return prefix + '-' + timestamp() + '-' + Math.floor(Math.random() * 10000) }
    * def resilienceUtils = read('classpath:org/skidbladnir/utils/resilience-utils.js')
    * def testConfigUtils = read('classpath:org/skidbladnir/utils/provider-config-utils.js')
    
    # Provider configurations
    * def providers = [
      {name: 'zephyr', config: testConfigUtils.getZephyrConfig()},
      {name: 'qtest', config: testConfigUtils.getQTestConfig()},
      {name: 'testrail', config: testConfigUtils.getTestRailConfig()},
      {name: 'microfocus', config: testConfigUtils.getMicroFocusConfig()},
      {name: 'jama', config: testConfigUtils.getJamaConfig()},
      {name: 'azure', config: testConfigUtils.getAzureDevOpsConfig()}
    ]
    
  @network-latency
  Scenario Outline: Provider adapter handles high latency connections
    # This test verifies that the provider adapter can handle connections with high latency
    
    # 1. Configure test parameters
    * def providerName = '<provider>'
    * def providerConfig = karate.jsonPath(providers, "$[?(@.name=='" + providerName + "')].config")[0]
    * def operation = 'getTestCase'
    * def params = { id: 'TC-1234' }
    
    # 2. Apply latency simulation
    * def networkConditions = { latencyMs: <latencyMs>, variance: 0.2 }
    * def simulationResult = resilienceUtils.simulateNetworkCondition('latency', networkConditions)
    * assert simulationResult.success
    
    # 3. Execute request under latency simulation
    * def startTime = new Date().getTime()
    * def result = resilienceUtils.executeWithTimeout(
        providerName, 
        providerConfig, 
        operation, 
        params, 
        <timeoutMs>
      )
    * def endTime = new Date().getTime()
    * def duration = endTime - startTime
    
    # 4. Validate response
    * match result.error == null
    * assert duration >= networkConditions.latencyMs
    * karate.log('Provider:', providerName, 'Latency Test:', networkConditions.latencyMs + 'ms', 'Actual Duration:', duration + 'ms')
    
    # 5. Restore normal network conditions
    * def resetResult = resilienceUtils.resetNetworkConditions()
    * assert resetResult.success
    
    Examples:
      | provider    | latencyMs | timeoutMs |
      | zephyr      | 500       | 3000      |
      | qtest       | 750       | 3000      |
      | testrail    | 1000      | 3000      |
      | microfocus  | 750       | 3000      |
      | jama        | 1000      | 3000      |
      | azure       | 500       | 3000      |

  @connection-drops
  Scenario Outline: Provider adapter handles connection drops
    # This test verifies that the API client can handle connection drops and reconnect
    
    # 1. Configure test parameters
    * def providerName = '<provider>'
    * def providerConfig = karate.jsonPath(providers, "$[?(@.name=='" + providerName + "')].config")[0]
    * def operation = 'listTestCases'
    * def params = { limit: 10, offset: 0 }
    
    # 2. Configure connection drop simulation
    * def dropConfig = { 
        frequency: <frequency>, 
        duration: <duration>,
        maxAttempts: <maxAttempts>
      }
    * def simulationResult = resilienceUtils.simulateNetworkCondition('connectionDrops', dropConfig)
    * assert simulationResult.success
    
    # 3. Execute operation with connection drops
    * def result = resilienceUtils.executeWithRetries(
        providerName,
        providerConfig,
        operation,
        params,
        dropConfig.maxAttempts
      )
    
    # 4. Validate operation succeeded despite connection drops
    * match result.success == true
    * match result.attempts > 1
    * match result.data != null
    
    # 5. Verify retry behavior
    * assert result.attempts > 1
    * assert result.attempts <= dropConfig.maxAttempts
    * karate.log('Provider:', providerName, 'Connection Drop Test - Successful after', result.attempts, 'attempts')
    
    # 6. Restore normal network conditions
    * def resetResult = resilienceUtils.resetNetworkConditions()
    * assert resetResult.success
    
    Examples:
      | provider    | frequency | duration | maxAttempts |
      | zephyr      | 0.5       | 500      | 3           |
      | qtest       | 0.6       | 600      | 3           |
      | testrail    | 0.7       | 700      | 4           |
      | microfocus  | 0.5       | 500      | 3           |
      | jama        | 0.6       | 600      | 3           |
      | azure       | 0.5       | 500      | 3           |
      
  @packet-loss
  Scenario Outline: Provider adapter handles packet loss
    # This test verifies the resilience to packet loss in network connections
    
    # 1. Configure test parameters
    * def providerName = '<provider>'
    * def providerConfig = karate.jsonPath(providers, "$[?(@.name=='" + providerName + "')].config")[0]
    * def operation = 'createTestCase'
    * def testCase = { 
        name: 'Resilience Test - ' + timestamp(), 
        description: 'Test case created during packet loss test'
      }
    * def params = { body: testCase }
    
    # 2. Configure packet loss simulation
    * def packetLossConfig = { 
        rate: <lossRate>, 
        correlation: <correlation> 
      }
    * def simulationResult = resilienceUtils.simulateNetworkCondition('packetLoss', packetLossConfig)
    * assert simulationResult.success
    
    # 3. Execute create operation with packet loss
    * def result = resilienceUtils.executeWithRetries(
        providerName,
        providerConfig,
        operation,
        params,
        5
      )
    
    # 4. Validate operation succeeded despite packet loss
    * match result.success == true
    * match result.data != null
    * assert result.data.id || result.data.testCaseId || result.data.key
    
    # 5. Clean up the created test case if successful
    * if (result.success) resilienceUtils.cleanupTestCase(providerName, providerConfig, result.data.id || result.data.testCaseId || result.data.key)
    
    # 6. Restore normal network conditions
    * def resetResult = resilienceUtils.resetNetworkConditions()
    * assert resetResult.success
    
    Examples:
      | provider    | lossRate | correlation |
      | zephyr      | 0.1      | 0.2         |
      | qtest       | 0.2      | 0.3         |
      | testrail    | 0.15     | 0.25        |
      | microfocus  | 0.1      | 0.2         |
      | jama        | 0.2      | 0.3         |
      | azure       | 0.15     | 0.25        |
      
  @intermittent-failures
  Scenario Outline: Provider adapter handles intermittent server failures
    # This test verifies the API client can handle intermittent 5xx errors from the server
    
    # 1. Configure test parameters
    * def providerName = '<provider>'
    * def providerConfig = karate.jsonPath(providers, "$[?(@.name=='" + providerName + "')].config")[0]
    * def operation = 'getTestCase'
    * def params = { id: 'TC-1234' }
    
    # 2. Configure intermittent failures simulation
    * def failureConfig = {
        rate: <failureRate>,
        statusCodes: [500, 502, 503, 504],
        maxRetries: <maxRetries>,
        retryDelayMs: 100
      }
    * def simulationResult = resilienceUtils.simulateNetworkCondition('serverErrors', failureConfig)
    * assert simulationResult.success
    
    # 3. Execute operation with intermittent failures
    * def result = resilienceUtils.executeWithRetries(
        providerName,
        providerConfig,
        operation,
        params,
        failureConfig.maxRetries
      )
    
    # 4. Evaluate response
    * match result.success == true
    * match result.error == null
    * assert result.attempts > 1
    * assert result.attempts <= failureConfig.maxRetries
    
    # 5. Restore normal conditions
    * def resetResult = resilienceUtils.resetNetworkConditions()
    * assert resetResult.success
    
    Examples:
      | provider    | failureRate | maxRetries |
      | zephyr      | 0.5         | 3          |
      | qtest       | 0.6         | 4          |
      | testrail    | 0.7         | 5          |
      | microfocus  | 0.5         | 3          |
      | jama        | 0.6         | 4          |
      | azure       | 0.7         | 5          |
      
  @rate-limiting
  Scenario Outline: Provider adapter gracefully handles rate limiting
    # This test verifies that adapters properly handle rate limiting responses (429)
    
    # 1. Configure test parameters
    * def providerName = '<provider>'
    * def providerConfig = karate.jsonPath(providers, "$[?(@.name=='" + providerName + "')].config")[0]
    * def operation = 'listTestCases'
    * def params = { limit: 5, offset: 0 }
    
    # 2. Configure rate limiting simulation
    * def rateLimitConfig = {
        limit: <requestLimit>,
        windowMs: <windowMs>,
        retryAfterMs: <retryAfterMs>,
        maxRetries: 5
      }
    * def simulationResult = resilienceUtils.simulateNetworkCondition('rateLimit', rateLimitConfig)
    * assert simulationResult.success
    
    # 3. Make multiple requests to trigger rate limiting
    * def requests = []
    * eval
      for (var i = 0; i < rateLimitConfig.limit + 3; i++) {
        requests.push({
          provider: providerName,
          config: providerConfig,
          operation: operation,
          params: params
        });
      }
      
    # 4. Execute all requests in parallel
    * def startTime = new Date().getTime()
    * def results = resilienceUtils.executeRequestBatch(requests)
    * def endTime = new Date().getTime()
    * def totalDuration = endTime - startTime
    
    # 5. Analyze results
    * def successCount = karate.filter(results, function(r){ return r.success }).length
    * def rateErrorCount = karate.filter(results, function(r){ return r.statusCode == 429 }).length
    * def retriedCount = karate.filter(results, function(r){ return r.retried }).length
    
    # 6. Validate rate limiting was properly handled
    * assert successCount == requests.length
    * match retriedCount > 0
    * assert totalDuration >= ((rateLimitConfig.limit + 3) / rateLimitConfig.limit) * rateLimitConfig.retryAfterMs
    * karate.log('Provider:', providerName, 'Handled', retriedCount, 'rate-limited requests with', successCount, 'eventual successes')
    
    # 7. Restore normal conditions
    * def resetResult = resilienceUtils.resetNetworkConditions()
    * assert resetResult.success
    
    Examples:
      | provider    | requestLimit | windowMs | retryAfterMs |
      | zephyr      | 3            | 1000     | 500          |
      | qtest       | 4            | 1000     | 750          |
      | testrail    | 5            | 1000     | 1000         |
      | microfocus  | 3            | 1000     | 500          |
      | jama        | 4            | 1000     | 750          |
      | azure       | 5            | 1000     | 1000         |
      
  @combined-degradation
  Scenario Outline: Provider adapter functions under combined network degradation
    # This test combines multiple network degradation factors to test overall resilience
    
    # 1. Configure test parameters
    * def providerName = '<provider>'
    * def providerConfig = karate.jsonPath(providers, "$[?(@.name=='" + providerName + "')].config")[0]
    * def operation = 'updateTestCase'
    * def params = { 
        id: 'TC-1234', 
        body: {
          name: 'Updated Resilience Test - ' + timestamp(),
          description: 'Test case updated during combined degradation test'
        }
      }
    
    # 2. Configure combined degradation
    * def combinedConfig = {
        latencyMs: <latencyMs>,
        packetLossRate: <lossRate>,
        failureRate: <failureRate>,
        maxAttempts: <maxAttempts>
      }
    * def simulationResult = resilienceUtils.simulateNetworkCondition('combined', combinedConfig)
    * assert simulationResult.success
    
    # 3. Execute operation under combined degradation
    * def result = resilienceUtils.executeWithRetries(
        providerName,
        providerConfig,
        operation,
        params,
        combinedConfig.maxAttempts
      )
    
    # 4. Validate operation eventually succeeded
    * assert result.success
    * assert result.attempts > 1
    * assert result.attempts <= combinedConfig.maxAttempts
    
    # 5. Record metrics
    * def metrics = {
        provider: providerName,
        attempts: result.attempts,
        totalDurationMs: result.duration,
        averageAttemptMs: result.duration / result.attempts
      }
    * karate.log('Provider:', metrics.provider, 'Combined Test - Success after', metrics.attempts, 'attempts in', metrics.totalDurationMs, 'ms')
    
    # 6. Restore normal network conditions
    * def resetResult = resilienceUtils.resetNetworkConditions()
    * assert resetResult.success
    
    Examples:
      | provider    | latencyMs | lossRate | failureRate | maxAttempts |
      | zephyr      | 500       | 0.1      | 0.2         | 5           |
      | qtest       | 750       | 0.15     | 0.3         | 6           |
      | testrail    | 1000      | 0.2      | 0.4         | 7           |
      | microfocus  | 500       | 0.1      | 0.2         | 5           |
      | jama        | 750       | 0.15     | 0.3         | 6           |
      | azure       | 1000      | 0.2      | 0.4         | 7           |
      
  @circuit-breaker
  Scenario Outline: Circuit breaker prevents cascading failures
    # This test verifies the circuit breaker pattern triggers properly during severe outages
    
    # 1. Configure test parameters
    * def providerName = '<provider>'
    * def providerConfig = karate.jsonPath(providers, "$[?(@.name=='" + providerName + "')].config")[0]
    * def operation = 'getTestCase'
    * def params = { id: 'TC-1234' }
    
    # 2. Configure severe failure scenario
    * def outageConfig = {
        failureRate: 1.0,  // 100% failure rate
        duration: 10000,   // 10 seconds
        statusCode: 500,
        failureThreshold: <failureThreshold>
      }
    * def simulationResult = resilienceUtils.simulateNetworkCondition('catastrophicFailure', outageConfig)
    * assert simulationResult.success
    
    # 3. Make repeated requests to trigger circuit breaker
    * def circuitBreakerTest = function() {
        var results = [];
        var circuitOpen = false;
        
        // Make enough requests to trip the circuit breaker
        for (var i = 0; i < outageConfig.failureThreshold + 3; i++) {
          var result = resilienceUtils.executeWithTimeout(
            providerName,
            providerConfig,
            operation,
            params,
            1000
          );
          
          results.push({
            attempt: i + 1,
            success: !result.error,
            error: result.error,
            circuitOpen: result.error && result.error.includes('circuit')
          });
          
          if (results[i].circuitOpen) {
            circuitOpen = true;
            break;
          }
        }
        
        return {
          results: results,
          circuitOpened: circuitOpen,
          requestCount: results.length,
          failureCount: karate.filter(results, function(r){ return !r.success }).length
        };
      }
    
    # Execute circuit breaker test  
    * def testResult = circuitBreakerTest()
    
    # 4. Validate circuit breaker behavior
    * assert testResult.circuitOpened == true
    * assert testResult.failureCount >= outageConfig.failureThreshold
    * karate.log('Provider:', providerName, 'Circuit opened after', testResult.failureCount, 'failures')
    
    # 5. Wait for circuit half-open retry
    * karate.log('Waiting for circuit half-open retry period...')
    * java.lang.Thread.sleep(3000)
    
    # 6. Restore normal network conditions
    * def resetResult = resilienceUtils.resetNetworkConditions()
    * assert resetResult.success
    
    # 7. Verify circuit closes after restoration
    * java.lang.Thread.sleep(2000)
    * def finalResult = resilienceUtils.executeWithTimeout(
        providerName,
        providerConfig,
        operation,
        params,
        1000
      )
    * match finalResult.error == null
    * karate.log('Provider:', providerName, 'Circuit successfully closed after recovery')
    
    Examples:
      | provider    | failureThreshold |
      | zephyr      | 3                |
      | qtest       | 3                |
      | testrail    | 3                |
      | microfocus  | 3                |
      | jama        | 3                |
      | azure       | 3                |
      
  @long-running
  Scenario: System can operate continuously under fluctuating network conditions
    # This test runs a long migration process while network conditions change
    
    # 1. Set up a large test case migration
    * def sourceName = 'zephyr'
    * def targetName = 'qtest'
    * def sourceConfig = karate.jsonPath(providers, "$[?(@.name=='" + sourceName + "')].config")[0]
    * def targetConfig = karate.jsonPath(providers, "$[?(@.name=='" + targetName + "')].config")[0]
    
    # 2. Create test migration data
    * def testCaseCount = 20
    * def migrationId = randomId('resilience-long')
    * def testCases = resilienceUtils.createTestCaseBatch(sourceName, sourceConfig, testCaseCount)
    * def testCaseIds = karate.map(testCases, function(x){ return x.id })
    
    # 3. Configure migration
    Given path '/migration/configure'
    And request {
      migrationId: '#(migrationId)',
      sourceProvider: '#(sourceName)',
      sourceConfig: '#(sourceConfig)',
      targetProvider: '#(targetName)',
      targetConfig: '#(targetConfig)',
      options: {
        testCaseIds: testCaseIds,
        preserveHierarchy: true,
        includeAttachments: true
      }
    }
    When method POST
    Then status 200
    And match response.status == 'CONFIGURED'
    
    # 4. Start background thread to vary network conditions
    * def networkVariation = function() {
        // This function will continuously vary network conditions
        var conditions = [
          { type: 'latency', config: { latencyMs: 250, variance: 0.3 } },
          { type: 'packetLoss', config: { rate: 0.05, correlation: 0.1 } },
          { type: 'serverErrors', config: { rate: 0.1, statusCodes: [500, 502] } },
          { type: 'normal', config: {} }
        ];
        
        for (var i = 0; i < conditions.length; i++) {
          resilienceUtils.simulateNetworkCondition(conditions[i].type, conditions[i].config);
          java.lang.Thread.sleep(5000); // Change conditions every 5 seconds
        }
        
        // Reset to normal at the end
        return resilienceUtils.resetNetworkConditions();
      }
    
    # 5. Start migration
    Given path '/migration/' + migrationId + '/start'
    When method POST
    Then status 202
    And match response.status == 'RUNNING'
    
    # 6. Start network variation in parallel thread
    * karate.start(networkVariation)
    
    # 7. Poll migration status until complete
    * def migrationStatus = resilienceUtils.pollMigrationStatusUntilComplete(migrationId, 300)
    * match migrationStatus.status == 'COMPLETED' || migrationStatus.status == 'COMPLETED_WITH_WARNINGS'
    
    # 8. Get migration results
    Given path '/migration/' + migrationId + '/results'
    When method GET
    Then status 200
    And match response.migrationId == migrationId
    
    # 9. Analyze success rate
    * def successfulMigrations = karate.filter(response.results, function(r){ return r.status == 'SUCCESS' })
    * def totalMigrations = response.results.length
    * def successRate = (successfulMigrations.length / totalMigrations) * 100
    
    # 10. Validate the migration succeeded despite network fluctuations
    * assert successRate >= 90
    * karate.log('Long-running migration completed with ' + successRate.toFixed(1) + '% success rate')
    
    # 11. Ensure normal network conditions are restored
    * def resetResult = resilienceUtils.resetNetworkConditions()
    * assert resetResult.success