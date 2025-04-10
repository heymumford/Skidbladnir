Feature: Migration Performance
  This feature tests the performance of the migration process

  Background:
    * url apiBaseUrl
    * def testCaseCount = karate.properties['testCaseCount'] || 5
    * def concurrentMigrations = karate.properties['concurrentMigrations'] || 3
    
    # Helper function to create a test case
    * def createTestCase =
    """
    function(id) {
      return {
        id: 'TC-PERF-' + id,
        name: 'Performance Test Case ' + id,
        description: 'Test case for performance testing',
        priority: 'Medium',
        status: 'Ready',
        steps: [
          { id: 'step-1', description: 'Test step 1', expectedResult: 'Expected result 1' },
          { id: 'step-2', description: 'Test step 2', expectedResult: 'Expected result 2' }
        ]
      };
    }
    """
    
    # Helper function to start a migration
    * def startMigration =
    """
    function(id) {
      var result = { id: id, workflowId: null, startTime: Date.now(), endTime: null, duration: null, success: false };
      try {
        var testCaseId = 'TC-PERF-' + id;
        var response = karate.call('classpath:org/skidbladnir/performance/start-migration.feature', { testCaseId: testCaseId });
        result.workflowId = response.workflowId;
        result.status = 'CREATED';
        return result;
      } catch (e) {
        karate.log('Failed to start migration for ID:', id, 'Error:', e);
        result.status = 'FAILED';
        return result;
      }
    }
    """
    
    # Helper function to check migration status
    * def checkMigrationStatus =
    """
    function(migration) {
      if (!migration.workflowId) return migration; // Skip if no workflow ID
      try {
        var response = karate.call('classpath:org/skidbladnir/performance/check-migration.feature', { workflowId: migration.workflowId });
        migration.status = response.status;
        migration.progress = response.progress;
        if (response.status === 'COMPLETED' || response.status === 'FAILED') {
          migration.endTime = Date.now();
          migration.duration = migration.endTime - migration.startTime;
          migration.success = response.status === 'COMPLETED';
        }
      } catch (e) {
        karate.log('Failed to check migration status:', e);
      }
      return migration;
    }
    """

  @performance
  Scenario: Measure migration performance with concurrent migrations
    # 1. First create test cases
    * def testCases = []
    * eval for (var i = 1; i <= testCaseCount; i++) testCases.push(createTestCase(i))
    
    # 2. Create test cases in source system (mocked)
    * def creationResults = []
    * eval for (var i = 0; i < testCases.length; i++) {
        var testCase = testCases[i];
        var path = '/providers/zephyr/test-cases';
        var result = karate.call('classpath:org/skidbladnir/performance/create-test-case.feature', { path: path, testCase: testCase });
        creationResults.push(result);
    }
    
    # 3. Start migrations in batches
    * def migrations = []
    * def batches = Math.ceil(testCaseCount / concurrentMigrations)
    
    * eval for (var batch = 0; batch < batches; batch++) {
        var start = batch * concurrentMigrations;
        var end = Math.min(start + concurrentMigrations, testCaseCount);
        var batchMigrations = [];
        
        for (var i = start + 1; i <= end; i++) {
            batchMigrations.push(startMigration(i));
        }
        
        migrations = migrations.concat(batchMigrations);
        java.lang.Thread.sleep(500); // Wait between batches
    }
    
    # 4. Poll for completion
    * def allCompleted = false
    * def maxPolls = 30
    * def pollCount = 0
    
    * while (!allCompleted && pollCount < maxPolls) {
        for (var i = 0; i < migrations.length; i++) {
            if (!migrations[i].endTime) {
                migrations[i] = checkMigrationStatus(migrations[i]);
            }
        }
        
        var completed = karate.filter(migrations, function(x){ return x.endTime != null });
        allCompleted = completed.length === migrations.length;
        
        if (!allCompleted) {
            karate.log('Completed:', completed.length, 'of', migrations.length);
            java.lang.Thread.sleep(1000);
            pollCount++;
        }
    }
    
    # 5. Calculate performance metrics
    * def successfulMigrations = karate.filter(migrations, function(x){ return x.success })
    * def failedMigrations = karate.filter(migrations, function(x){ return x.endTime != null && !x.success })
    * def incompleteCount = testCaseCount - successfulMigrations.length - failedMigrations.length
    
    * def durations = karate.map(successfulMigrations, function(x){ return x.duration })
    * def totalDuration = durations.reduce(function(acc, val) { return acc + val }, 0)
    * def avgDuration = successfulMigrations.length > 0 ? totalDuration / successfulMigrations.length : 0
    * def minDuration = successfulMigrations.length > 0 ? Math.min.apply(null, durations) : 0
    * def maxDuration = successfulMigrations.length > 0 ? Math.max.apply(null, durations) : 0
    
    # 6. Log performance metrics
    * karate.log('Migration Performance Metrics:')
    * karate.log('Total test cases:', testCaseCount)
    * karate.log('Successful migrations:', successfulMigrations.length)
    * karate.log('Failed migrations:', failedMigrations.length)
    * karate.log('Incomplete migrations:', incompleteCount)
    * karate.log('Average duration (ms):', avgDuration)
    * karate.log('Min duration (ms):', minDuration)
    * karate.log('Max duration (ms):', maxDuration)
    
    # 7. Verify performance meets requirements
    # The success rate should be high (at least 90%)
    * def successRate = (successfulMigrations.length / testCaseCount) * 100
    * karate.log('Success rate:', successRate + '%')
    * assert successRate >= 90
    
    # The average duration should be below a threshold (e.g., 5000ms)
    * def durationThreshold = 5000
    * karate.log('Average duration within threshold:', avgDuration < durationThreshold)
    * assert avgDuration < durationThreshold