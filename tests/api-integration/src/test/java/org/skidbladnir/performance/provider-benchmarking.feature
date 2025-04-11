Feature: Provider Adapter Performance Benchmarking
  This feature performs comprehensive benchmarking across all provider adapters
  to measure and compare their performance characteristics.

  Background:
    * url apiBaseUrl
    * def timestamp = function(){ return new Date().getTime() }
    * def randomId = function(prefix) { return prefix + '-' + timestamp() + '-' + Math.floor(Math.random() * 10000) }
    * def perfUtils = read('classpath:org/skidbladnir/utils/performance-utils.js')
    * def testConfigUtils = read('classpath:org/skidbladnir/utils/provider-config-utils.js')
    
    # Test configuration
    * def iterations = karate.properties['iterations'] || 10
    * def warmupIterations = karate.properties['warmupIterations'] || 2
    
    # Provider configurations
    * def providers = [
      {name: 'zephyr', config: testConfigUtils.getZephyrConfig()},
      {name: 'qtest', config: testConfigUtils.getQTestConfig()},
      {name: 'testrail', config: testConfigUtils.getTestRailConfig()},
      {name: 'microfocus', config: testConfigUtils.getMicroFocusConfig()},
      {name: 'jama', config: testConfigUtils.getJamaConfig()},
      {name: 'azure', config: testConfigUtils.getAzureDevOpsConfig()}
    ]
    
    # Define operations to benchmark
    * def operations = ['getTestCase', 'listTestCases', 'createTestCase', 'updateTestCase', 'deleteTestCase']
    
    # Test data template
    * def testCaseTemplate = {
      name: 'Performance Benchmark Test Case',
      description: 'Test case used for performance benchmarking',
      priority: 'Medium',
      status: 'Ready',
      steps: [
        {
          description: 'Navigate to test page',
          expectedResult: 'Page loads successfully'
        },
        {
          description: 'Enter test data',
          expectedResult: 'Data is accepted'
        },
        {
          description: 'Submit the form',
          expectedResult: 'Form processes successfully'
        }
      ]
    }

  @benchmark @getTestCase
  Scenario: Benchmark getTestCase operation across providers
    # First create test case in each provider
    * def testCaseIds = {}
    
    # For each provider, create a test case and store its ID
    * eval for (var i = 0; i < providers.length; i++) {
        var provider = providers[i];
        var testCase = { ...testCaseTemplate, id: randomId(provider.name) };
        var params = { body: testCase };
        
        try {
          var result = perfUtils.benchmarkOperation(
            provider.config, 
            provider.name, 
            'createTestCase', 
            params, 
            1, 
            0
          );
          
          // Store the created test case ID
          testCaseIds[provider.name] = result.operation === 'createTestCase' ? 
            testCase.id : 'TC-12345'; // Fallback ID if creation failed
        } catch (e) {
          karate.log('Failed to create test case for provider:', provider.name, e);
          testCaseIds[provider.name] = 'TC-12345'; // Use default test case ID
        }
      }
    
    # Run benchmark for getTestCase against each provider
    * def benchmarks = []
    
    * eval for (var i = 0; i < providers.length; i++) {
        var provider = providers[i];
        var params = { id: testCaseIds[provider.name] };
        
        try {
          var benchmark = perfUtils.benchmarkOperation(
            provider.config,
            provider.name,
            'getTestCase',
            params,
            iterations,
            warmupIterations
          );
          
          benchmarks.push(benchmark);
          
          // Log results
          karate.log('Provider:', provider.name, 'Operation: getTestCase');
          karate.log('  Avg:', benchmark.metrics.avg.toFixed(2), 'ms');
          karate.log('  P95:', benchmark.metrics.p95.toFixed(2), 'ms');
          karate.log('  Min:', benchmark.metrics.min.toFixed(2), 'ms');
          karate.log('  Max:', benchmark.metrics.max.toFixed(2), 'ms');
        } catch (e) {
          karate.log('Failed to benchmark getTestCase for provider:', provider.name, e);
        }
      }
    
    # Compare provider performance
    * def comparison = perfUtils.compareProviders(benchmarks, 'getTestCase')
    
    # Log comparison results
    * karate.log('GetTestCase Performance Comparison:')
    * karate.log('  Fastest provider:', comparison.fastestProvider)
    * karate.log('  Slowest provider:', comparison.slowestProvider)
    * karate.log('  Performance gap:', comparison.performanceGap.toFixed(2) + '%')
    
    # For each provider in the comparison
    * eval for (var i = 0; i < comparison.results.length; i++) {
        var result = comparison.results[i];
        karate.log('  Provider:', result.provider, 'Avg:', result.avg.toFixed(2), 'ms', 'Relative:', result.relativePerformance);
      }
    
    # Store benchmark results for later analysis
    * def getTestCaseBenchmarks = benchmarks
    * def getTestCaseComparison = comparison

  @benchmark @listTestCases
  Scenario: Benchmark listTestCases operation across providers
    # Run benchmark for listTestCases against each provider
    * def benchmarks = []
    
    * eval for (var i = 0; i < providers.length; i++) {
        var provider = providers[i];
        var params = { limit: 20, offset: 0 };
        
        // Add provider-specific parameters
        if (provider.name === 'testrail') params.sectionId = 1;
        if (provider.name === 'jama' || provider.name === 'azure') params.projectId = 1;
        if (provider.name === 'zephyr' || provider.name === 'qtest' || provider.name === 'microfocus') params.folderId = 1;
        
        try {
          var benchmark = perfUtils.benchmarkOperation(
            provider.config,
            provider.name,
            'listTestCases',
            params,
            iterations,
            warmupIterations
          );
          
          benchmarks.push(benchmark);
          
          // Log results
          karate.log('Provider:', provider.name, 'Operation: listTestCases');
          karate.log('  Avg:', benchmark.metrics.avg.toFixed(2), 'ms');
          karate.log('  P95:', benchmark.metrics.p95.toFixed(2), 'ms');
        } catch (e) {
          karate.log('Failed to benchmark listTestCases for provider:', provider.name, e);
        }
      }
    
    # Compare provider performance
    * def comparison = perfUtils.compareProviders(benchmarks, 'listTestCases')
    
    # Log comparison results
    * karate.log('ListTestCases Performance Comparison:')
    * karate.log('  Fastest provider:', comparison.fastestProvider)
    * karate.log('  Slowest provider:', comparison.slowestProvider)
    * karate.log('  Performance gap:', comparison.performanceGap.toFixed(2) + '%')
    
    # Store benchmark results for later analysis
    * def listTestCasesBenchmarks = benchmarks
    * def listTestCasesComparison = comparison

  @benchmark @createTestCase
  Scenario: Benchmark createTestCase operation across providers
    # Run benchmark for createTestCase against each provider
    * def benchmarks = []
    
    * eval for (var i = 0; i < providers.length; i++) {
        var provider = providers[i];
        var testCaseIds = [];
        
        try {
          // Create a function to generate unique test cases for each iteration
          var createParams = function(iteration) {
            var testCase = { ...testCaseTemplate, id: randomId(provider.name + '-' + iteration) };
            return { body: testCase };
          };
          
          var benchmark = perfUtils.benchmarkOperation(
            provider.config,
            provider.name,
            'createTestCase',
            createParams(0), // Initial params
            iterations,
            warmupIterations
          );
          
          benchmarks.push(benchmark);
          
          // Log results
          karate.log('Provider:', provider.name, 'Operation: createTestCase');
          karate.log('  Avg:', benchmark.metrics.avg.toFixed(2), 'ms');
          karate.log('  P95:', benchmark.metrics.p95.toFixed(2), 'ms');
        } catch (e) {
          karate.log('Failed to benchmark createTestCase for provider:', provider.name, e);
        }
      }
    
    # Compare provider performance
    * def comparison = perfUtils.compareProviders(benchmarks, 'createTestCase')
    
    # Log comparison results
    * karate.log('CreateTestCase Performance Comparison:')
    * karate.log('  Fastest provider:', comparison.fastestProvider)
    * karate.log('  Slowest provider:', comparison.slowestProvider)
    * karate.log('  Performance gap:', comparison.performanceGap.toFixed(2) + '%')
    
    # Store benchmark results for later analysis
    * def createTestCaseBenchmarks = benchmarks
    * def createTestCaseComparison = comparison

  @benchmark @updateTestCase
  Scenario: Benchmark updateTestCase operation across providers
    # First create test case in each provider to update
    * def testCaseIds = {}
    
    # For each provider, create a test case and store its ID
    * eval for (var i = 0; i < providers.length; i++) {
        var provider = providers[i];
        var testCase = { ...testCaseTemplate, id: randomId(provider.name) };
        var params = { body: testCase };
        
        try {
          var result = perfUtils.benchmarkOperation(
            provider.config, 
            provider.name, 
            'createTestCase', 
            params, 
            1, 
            0
          );
          
          // Store the created test case ID
          testCaseIds[provider.name] = result.operation === 'createTestCase' ? 
            testCase.id : 'TC-12345'; // Fallback ID if creation failed
        } catch (e) {
          karate.log('Failed to create test case for provider:', provider.name, e);
          testCaseIds[provider.name] = 'TC-12345'; // Use default test case ID
        }
      }
    
    # Run benchmark for updateTestCase against each provider
    * def benchmarks = []
    
    * eval for (var i = 0; i < providers.length; i++) {
        var provider = providers[i];
        
        try {
          // Create a function to update test case with random content for each iteration
          var updateParams = function(iteration) {
            return { 
              id: testCaseIds[provider.name],
              body: {
                ...testCaseTemplate,
                name: 'Updated Performance Test Case ' + iteration,
                description: 'Updated description for iteration ' + iteration
              }
            };
          };
          
          var benchmark = perfUtils.benchmarkOperation(
            provider.config,
            provider.name,
            'updateTestCase',
            updateParams(0), // Initial params
            iterations,
            warmupIterations
          );
          
          benchmarks.push(benchmark);
          
          // Log results
          karate.log('Provider:', provider.name, 'Operation: updateTestCase');
          karate.log('  Avg:', benchmark.metrics.avg.toFixed(2), 'ms');
          karate.log('  P95:', benchmark.metrics.p95.toFixed(2), 'ms');
        } catch (e) {
          karate.log('Failed to benchmark updateTestCase for provider:', provider.name, e);
        }
      }
    
    # Compare provider performance
    * def comparison = perfUtils.compareProviders(benchmarks, 'updateTestCase')
    
    # Log comparison results
    * karate.log('UpdateTestCase Performance Comparison:')
    * karate.log('  Fastest provider:', comparison.fastestProvider)
    * karate.log('  Slowest provider:', comparison.slowestProvider)
    * karate.log('  Performance gap:', comparison.performanceGap.toFixed(2) + '%')
    
    # Store benchmark results for later analysis
    * def updateTestCaseBenchmarks = benchmarks
    * def updateTestCaseComparison = comparison

  @benchmark @deleteTestCase
  Scenario: Benchmark deleteTestCase operation across providers
    # First create test cases in each provider to delete
    * def testCaseIds = {}
    
    # For each provider, create multiple test cases to delete
    * eval for (var i = 0; i < providers.length; i++) {
        var provider = providers[i];
        var ids = [];
        
        // Create test cases for each iteration plus warmup
        for (var j = 0; j < iterations + warmupIterations; j++) {
          var testCase = { ...testCaseTemplate, id: randomId(provider.name + '-delete-' + j) };
          var params = { body: testCase };
          
          try {
            var result = perfUtils.benchmarkOperation(
              provider.config, 
              provider.name, 
              'createTestCase', 
              params, 
              1, 
              0
            );
            
            ids.push(testCase.id);
          } catch (e) {
            karate.log('Failed to create test case for deletion, provider:', provider.name, e);
            ids.push('TC-DELETE-' + j); // Fallback ID
          }
        }
        
        testCaseIds[provider.name] = ids;
      }
    
    # Run benchmark for deleteTestCase against each provider
    * def benchmarks = []
    
    * eval for (var i = 0; i < providers.length; i++) {
        var provider = providers[i];
        var ids = testCaseIds[provider.name];
        var durations = [];
        
        try {
          // For each test case (skipping warmup iterations)
          for (var j = warmupIterations; j < ids.length; j++) {
            var params = { id: ids[j] };
            var start = Date.now();
            
            // Delete the test case
            var result = karate.call('classpath:org/skidbladnir/utils/provider-operation.feature', {
              config: provider.config,
              provider: provider.name,
              operation: 'deleteTestCase',
              params: params
            });
            
            var end = Date.now();
            var duration = end - start;
            durations.push(duration);
          }
          
          // Create benchmark report for delete operation
          var benchmark = perfUtils.createBenchmarkReport(
            provider.name,
            'deleteTestCase',
            iterations,
            durations
          );
          
          benchmarks.push(benchmark);
          
          // Log results
          karate.log('Provider:', provider.name, 'Operation: deleteTestCase');
          karate.log('  Avg:', benchmark.metrics.avg.toFixed(2), 'ms');
          karate.log('  P95:', benchmark.metrics.p95.toFixed(2), 'ms');
        } catch (e) {
          karate.log('Failed to benchmark deleteTestCase for provider:', provider.name, e);
        }
      }
    
    # Compare provider performance
    * def comparison = perfUtils.compareProviders(benchmarks, 'deleteTestCase')
    
    # Log comparison results
    * karate.log('DeleteTestCase Performance Comparison:')
    * karate.log('  Fastest provider:', comparison.fastestProvider)
    * karate.log('  Slowest provider:', comparison.slowestProvider)
    * karate.log('  Performance gap:', comparison.performanceGap.toFixed(2) + '%')
    
    # Store benchmark results for later analysis
    * def deleteTestCaseBenchmarks = benchmarks
    * def deleteTestCaseComparison = comparison

  @benchmark @comprehensive
  Scenario: Generate comprehensive provider performance profiles
    # This scenario combines results from all operations to create provider profiles
    
    # Combine all benchmarks from previous scenarios
    * def allBenchmarks = karate.append(
        getTestCaseBenchmarks || [],
        listTestCasesBenchmarks || [],
        createTestCaseBenchmarks || [],
        updateTestCaseBenchmarks || [],
        deleteTestCaseBenchmarks || []
      )
    
    # Create performance profiles for each provider
    * def providerProfiles = {}
    
    * eval for (var i = 0; i < providers.length; i++) {
        var provider = providers[i];
        providerProfiles[provider.name] = perfUtils.createProviderProfile(provider.name, allBenchmarks);
      }
    
    # Log provider profiles
    * karate.log('Provider Performance Profiles:')
    
    * eval for (var providerName in providerProfiles) {
        var profile = providerProfiles[providerName];
        karate.log('Provider:', providerName);
        karate.log('  Overall Performance:', profile.overallPerformance.toFixed(2), 'ms');
        karate.log('  Operations:', profile.operationCount);
        karate.log('  Fastest Operation:', profile.fastestOperation);
        karate.log('  Slowest Operation:', profile.slowestOperation);
      }
    
    # Compare providers overall
    * def providerRanking = []
    * eval for (var providerName in providerProfiles) {
        providerRanking.push({
          provider: providerName,
          performance: providerProfiles[providerName].overallPerformance
        });
      }
    
    # Sort providers by performance (faster first)
    * eval providerRanking.sort(function(a, b) { return a.performance - b.performance })
    
    # Log provider ranking
    * karate.log('Provider Performance Ranking:')
    * eval for (var i = 0; i < providerRanking.length; i++) {
        karate.log('  ' + (i+1) + '. ' + providerRanking[i].provider + ' - ' + providerRanking[i].performance.toFixed(2) + ' ms');
      }
    
    # Create performance report
    * def performanceReport = {
        providers: providerRanking,
        operations: {
          getTestCase: getTestCaseComparison,
          listTestCases: listTestCasesComparison,
          createTestCase: createTestCaseComparison,
          updateTestCase: updateTestCaseComparison,
          deleteTestCase: deleteTestCaseComparison
        },
        profiles: providerProfiles,
        fastestProvider: providerRanking[0].provider,
        slowestProvider: providerRanking[providerRanking.length - 1].provider,
        performanceSpread: ((providerRanking[providerRanking.length - 1].performance / providerRanking[0].performance) - 1) * 100
      }
      
    # Final performance validation
    * def overallPerformanceThreshold = 2000 // 2 seconds average across operations
    * def fastestProviderPerformance = providerRanking[0].performance
    * assert fastestProviderPerformance < overallPerformanceThreshold
    
    * karate.log('Overall Provider Performance Assessment:')
    * karate.log('  Fastest Provider:', performanceReport.fastestProvider, '(' + fastestProviderPerformance.toFixed(2) + ' ms)');
    * karate.log('  Slowest Provider:', performanceReport.slowestProvider);
    * karate.log('  Performance spread between fastest and slowest:', performanceReport.performanceSpread.toFixed(2) + '%');
    * karate.log('  Validation result: ' + (fastestProviderPerformance < overallPerformanceThreshold ? 'PASSED' : 'FAILED'));