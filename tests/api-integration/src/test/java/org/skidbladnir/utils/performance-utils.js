/**
 * Utility functions for provider adapter performance benchmarking
 */

/**
 * Creates a benchmark report for a specific operation
 * 
 * @param {string} provider - The provider name
 * @param {string} operation - The operation name
 * @param {number} iterations - Number of iterations
 * @param {Array} durations - Array of durations in milliseconds
 * @returns {object} Benchmark statistics
 */
function createBenchmarkReport(provider, operation, iterations, durations) {
  // Sort durations for percentile calculations
  durations.sort((a, b) => a - b);
  
  const totalDuration = durations.reduce((acc, val) => acc + val, 0);
  const avgDuration = totalDuration / durations.length;
  const minDuration = durations[0];
  const maxDuration = durations[durations.length - 1];
  
  // Calculate percentiles
  const p50Index = Math.floor(durations.length * 0.5);
  const p90Index = Math.floor(durations.length * 0.9);
  const p95Index = Math.floor(durations.length * 0.95);
  const p99Index = Math.floor(durations.length * 0.99);
  
  const p50 = durations[p50Index];
  const p90 = durations[p90Index];
  const p95 = durations[p95Index];
  const p99 = durations[p99Index];
  
  return {
    provider: provider,
    operation: operation,
    iterations: iterations,
    metrics: {
      avg: avgDuration,
      min: minDuration,
      max: maxDuration,
      p50: p50,
      p90: p90,
      p95: p95,
      p99: p99,
      total: totalDuration
    }
  };
}

/**
 * Performs a benchmark for a specific provider operation
 * 
 * @param {object} config - Provider configuration
 * @param {string} provider - Provider name
 * @param {string} operation - Operation name
 * @param {object} params - Operation parameters
 * @param {number} iterations - Number of iterations
 * @param {number} warmupIterations - Number of warmup iterations (excluded from results)
 * @returns {object} Benchmark report
 */
function benchmarkOperation(config, provider, operation, params, iterations, warmupIterations) {
  const durations = [];
  const warmup = warmupIterations || 2;
  const total = iterations + warmup;
  
  for (let i = 0; i < total; i++) {
    const start = Date.now();
    
    // Call the operation using the appropriate feature file
    const result = karate.call(`classpath:org/skidbladnir/utils/provider-operation.feature`, {
      config: config,
      provider: provider,
      operation: operation,
      params: params
    });
    
    const end = Date.now();
    const duration = end - start;
    
    // Skip warmup iterations in the results
    if (i >= warmup) {
      durations.push(duration);
    }
  }
  
  return createBenchmarkReport(provider, operation, iterations, durations);
}

/**
 * Compares benchmark results between multiple providers
 * 
 * @param {Array} benchmarks - Array of benchmark results
 * @param {string} operation - Operation name to compare
 * @returns {object} Comparison report
 */
function compareProviders(benchmarks, operation) {
  // Filter benchmarks for the given operation
  const results = benchmarks.filter(b => b.operation === operation);
  
  // Sort providers by average duration (fastest first)
  results.sort((a, b) => a.metrics.avg - b.metrics.avg);
  
  // Calculate relative performance (percentage of the fastest)
  const fastest = results[0].metrics.avg;
  
  const comparison = results.map(result => {
    const relative = (fastest / result.metrics.avg) * 100;
    return {
      provider: result.provider,
      avg: result.metrics.avg,
      p95: result.metrics.p95,
      relativePerformance: relative.toFixed(2) + '%'
    };
  });
  
  return {
    operation: operation,
    results: comparison,
    fastestProvider: results[0].provider,
    slowestProvider: results[results.length - 1].provider,
    performanceGap: ((results[results.length - 1].metrics.avg / results[0].metrics.avg) - 1) * 100
  };
}

/**
 * Creates a comprehensive performance profile for a provider
 * 
 * @param {string} provider - Provider name
 * @param {Array} benchmarks - Array of benchmark results for this provider
 * @returns {object} Provider performance profile
 */
function createProviderProfile(provider, benchmarks) {
  // Get all operations for this provider
  const operations = benchmarks
    .filter(b => b.provider === provider)
    .map(b => ({
      operation: b.operation,
      avg: b.metrics.avg,
      p95: b.metrics.p95
    }))
    .sort((a, b) => a.avg - b.avg);
  
  // Calculate overall performance score (simple average of operation times)
  const totalAvg = operations.reduce((acc, op) => acc + op.avg, 0) / operations.length;
  
  return {
    provider: provider,
    operationCount: operations.length,
    operations: operations,
    overallPerformance: totalAvg,
    fastestOperation: operations[0].operation,
    slowestOperation: operations[operations.length - 1].operation
  };
}

// Export functions
module.exports = {
  benchmarkOperation: benchmarkOperation,
  createBenchmarkReport: createBenchmarkReport,
  compareProviders: compareProviders,
  createProviderProfile: createProviderProfile
};