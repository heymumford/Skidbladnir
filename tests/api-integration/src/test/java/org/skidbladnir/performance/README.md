# Performance and Resilience Testing

This directory contains Karate feature files for performance, load, stress, soak, and connection resilience testing of the Skidbladnir API services.

## Overview

These tests evaluate how the system behaves under various load conditions and network degradations to help identify performance bottlenecks, breaking points, resource leaks, and resilience issues. The tests are organized into several categories:

1. **Performance Testing**: Measures response times and throughput for individual API endpoints
2. **Load Testing**: Tests how the system performs under expected load
3. **Stress Testing**: Tests how the system performs under extreme load to find breaking points
4. **Soak Testing**: Tests how the system performs over an extended period to find memory leaks or performance degradation
5. **Connection Resilience**: Tests how the system handles network degradation and disruption

## Features

### `api-performance.feature`

This feature measures basic performance metrics for key API endpoints:
- Response time measurement for individual endpoints
- Concurrent access performance testing
- Performance threshold validation

### `load-test.feature`

This feature tests the system under sustained load:
- Simulates a specified number of concurrent users
- Gradually ramps up traffic to avoid startup bias
- Collects metrics on throughput, response time, and error rates
- Tests API rate limiting behavior under high load

### `stress-test.feature`

This feature identifies the system's breaking point:
- Incrementally increases load until failures occur
- Identifies the saturation point where adding more load doesn't increase throughput
- Creates detailed performance profiles at various stress levels

### `soak-test.feature`

This feature tests the system over an extended period:
- Runs for a specified duration (minutes to hours)
- Samples performance metrics at regular intervals
- Detects response time degradation over time
- Monitors memory usage to detect potential leaks

## Helper Features

The directory also contains several helper features:
- `endpoint-timer.feature`: Helper for measuring endpoint response times
- `concurrent-request.feature`: Helper for executing concurrent requests
- `load-request.feature`: Helper for executing load test requests
- `load-test-runner.feature`: Helper for running load tests programmatically
- `simplified-load-test.feature`: Simplified load test for use in stress testing
- `stress-level-test.feature`: Helper for running individual stress level tests
- `system-stats.feature`: Helper for fetching system statistics

## Running the Tests

To run only the performance tests:

```bash
mvn test -Dtest=PerformanceTests
```

Individual test features can be run by using the specific test method:

```bash
mvn test -Dtest=PerformanceTests#testApiPerformance
mvn test -Dtest=PerformanceTests#testLoadTest
mvn test -Dtest=PerformanceTests#testStressTest
mvn test -Dtest=PerformanceTests#testSoakTest
```

### Configuration Parameters

You can customize the tests using the following parameters:

```bash
# For load tests
mvn test -Dtest=PerformanceTests#testLoadTest -DthreadCount=30 -DrampUpPeriod=20 -DtestDuration=120

# For stress tests
mvn test -Dtest=PerformanceTests#testStressTest -DbaseThreadCount=5 -DmaxThreads=50 -DincrementThreads=5 -DdurationPerIncrement=20

# For soak tests
mvn test -Dtest=PerformanceTests#testSoakTest -DthreadCount=10 -DsoakDuration=600 -DstatusCheckInterval=30
```

## Test Output

The tests produce detailed logs showing:
- Response time statistics (min, max, average, percentiles)
- Throughput (requests per second)
- Error rates and failure details
- Breaking points and saturation points
- Memory usage and potential leaks
- Response time degradation over time

## Performance Baselines

The tests include the following baseline expectations:
- API endpoints should respond in under 500ms average
- The system should handle at least 50 requests per second before saturation
- Success rate should be at least 95% under load
- No response time degradation should occur during soak testing

## Integrating with Monitoring

In a production environment, these tests should be integrated with:
1. System monitoring tools (for resource usage)
2. Application performance monitoring
3. Log aggregation systems
4. Alerting systems

This ensures both proactive testing and reactive monitoring for performance issues.

## Connection Resilience Testing

### `connection-resilience.feature`

This feature tests how the system handles various network degradation scenarios:

- **Network Latency**: Tests the system's ability to handle high latency connections
- **Connection Drops**: Verifies the API client can handle connection drops and reconnect
- **Packet Loss**: Tests resilience to packet loss in network connections
- **Intermittent Failures**: Validates handling of intermittent 5xx errors
- **Rate Limiting**: Ensures adapters properly handle rate limiting responses (429)
- **Combined Degradation**: Tests the system under multiple simultaneous network issues
- **Circuit Breaker**: Verifies that the circuit breaker pattern prevents cascading failures
- **Long-Running Operations**: Tests system operation under fluctuating network conditions

### Running Resilience Tests

To run all resilience tests:

```bash
mvn test -Dtest=PerformanceTests#testConnectionResilience
```

Individual resilience test scenarios can be run with:

```bash
mvn test -Dtest=PerformanceTests#testNetworkLatency
mvn test -Dtest=PerformanceTests#testConnectionDrops
mvn test -Dtest=PerformanceTests#testPacketLoss
mvn test -Dtest=PerformanceTests#testIntermittentFailures
mvn test -Dtest=PerformanceTests#testRateLimitResilience
mvn test -Dtest=PerformanceTests#testCombinedDegradation
mvn test -Dtest=PerformanceTests#testCircuitBreaker
mvn test -Dtest=PerformanceTests#testLongRunningResilience
```

### Resilience Expectations

The resilience tests enforce these expectations:

- System should handle connections with latency up to 1000ms
- Requests should retry automatically after connection drops (up to 5 attempts)
- Circuit breaker should trip after 3-5 consecutive failures to prevent cascade failures
- System should respect rate limits and implement backoff based on Retry-After headers
- Authentication tokens should refresh automatically on 401 responses
- Long-running operations should recover from intermittent failures
- Success rate should be at least 90% under combined network degradation