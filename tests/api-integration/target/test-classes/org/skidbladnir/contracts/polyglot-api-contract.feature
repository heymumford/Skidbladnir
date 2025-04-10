Feature: Cross-Language API Contract Testing
  This feature validates API contracts between different language implementations (TypeScript, Python, Go)
  to ensure they maintain consistent behavior and schema definitions.

  Background:
    * url apiBaseUrl
    * def orchestratorUrl = orchestratorBaseUrl
    * def binaryProcessorUrl = binaryProcessorBaseUrl
    
    # Language-specific endpoints for testing
    * def endpoints = 
    """
    {
      typescript: {
        baseUrl: apiBaseUrl,
        healthEndpoint: '/health',
        metricsEndpoint: '/metrics',
        serviceType: 'API (TypeScript)'
      },
      python: {
        baseUrl: orchestratorBaseUrl,
        healthEndpoint: '/health',
        metricsEndpoint: '/metrics',
        serviceType: 'Orchestrator (Python)'
      },
      go: {
        baseUrl: binaryProcessorBaseUrl,
        healthEndpoint: '/health',
        metricsEndpoint: '/metrics',
        serviceType: 'Binary Processor (Go)'
      }
    }
    """
    
    # Common schema definitions
    * def healthSchema = 
    """
    {
      status: '#string',
      version: '#string',
      uptime: '#number',
      timestamp: '#string'
    }
    """
    
    * def metricsSchema = 
    """
    {
      requestCount: '#number',
      successRate: '#number',
      avgResponseTime: '#number',
      timestamp: '#string'
    }
    """
    
    * def errorSchema = 
    """
    {
      error: '#string',
      message: '#string',
      details: '##array',
      status: '#number',
      timestamp: '#string'
    }
    """

  Scenario Outline: Validate health endpoint across language implementations
    Given url <endpoint.baseUrl>
    And path <endpoint.healthEndpoint>
    When method GET
    Then status 200
    And match response == healthSchema
    And match response.status == 'ok'
    
    Examples:
      | endpoint              |
      | endpoints.typescript  |
      | endpoints.python      |
      | endpoints.go          |

  Scenario Outline: Validate metrics endpoint across language implementations
    Given url <endpoint.baseUrl>
    And path <endpoint.metricsEndpoint>
    When method GET
    Then status 200
    And match response == metricsSchema
    
    Examples:
      | endpoint              |
      | endpoints.typescript  |
      | endpoints.python      |
      | endpoints.go          |

  Scenario Outline: Validate error responses across language implementations
    Given url <endpoint.baseUrl>
    And path '/non-existent-endpoint'
    When method GET
    Then status 404
    And match response == errorSchema
    And match response.status == 404
    
    Examples:
      | endpoint              |
      | endpoints.typescript  |
      | endpoints.python      |
      | endpoints.go          |

  Scenario Outline: Validate rate limiting behavior across language implementations
    # Make 5 rapid requests to test rate limiting
    * def makeRequests =
    """
    function() {
      var results = [];
      for (var i = 0; i < 5; i++) {
        var result = karate.call('classpath:org/skidbladnir/contracts/make-request.feature', 
          { url: endpoint.baseUrl + endpoint.healthEndpoint });
        results.push(result);
      }
      return results;
    }
    """
    
    # Set endpoint for this iteration
    * def endpoint = <endpoint>
    
    # Make the requests
    * def results = makeRequests()
    
    # Check if rate limiting is consistent
    * def rateLimited = karate.filter(results, function(x) { return x.response.status == 429 })
    
    # If any responses were rate limited, verify proper error format
    * if (rateLimited.length > 0) karate.call('classpath:org/skidbladnir/contracts/verify-rate-limit.feature', { rateLimited: rateLimited[0] })
    
    Examples:
      | endpoint              |
      | endpoints.typescript  |
      | endpoints.python      |
      | endpoints.go          |

  Scenario: Validate TestCase schema consistency across language services
    # Get TestCase schema from all three services
    
    # TypeScript API
    Given url endpoints.typescript.baseUrl
    And path '/schemas/test-case'
    When method GET
    Then status 200
    * def tsSchema = response
    
    # Python Orchestrator
    Given url endpoints.python.baseUrl
    And path '/schemas/test-case'
    When method GET
    Then status 200
    * def pySchema = response
    
    # Go Binary Processor
    Given url endpoints.go.baseUrl
    And path '/schemas/test-case'
    When method GET
    Then status 200
    * def goSchema = response
    
    # Define helper function to compare schemas
    * def compareSchemas =
    """
    function(schema1, schema2, name1, name2) {
      var result = { match: true, differences: [] };
      
      // Check top-level fields
      var allFields = new Set();
      Object.keys(schema1).forEach(k => allFields.add(k));
      Object.keys(schema2).forEach(k => allFields.add(k));
      
      allFields.forEach(function(field) {
        var inSchema1 = schema1.hasOwnProperty(field);
        var inSchema2 = schema2.hasOwnProperty(field);
        
        if (!inSchema1 || !inSchema2) {
          result.match = false;
          result.differences.push({
            field: field,
            inFirst: inSchema1 ? name1 : undefined,
            inSecond: inSchema2 ? name2 : undefined
          });
          return;
        }
        
        // Compare types
        var type1 = typeof schema1[field] === 'object' ? (Array.isArray(schema1[field]) ? 'array' : 'object') : typeof schema1[field];
        var type2 = typeof schema2[field] === 'object' ? (Array.isArray(schema2[field]) ? 'array' : 'object') : typeof schema2[field];
        
        if (type1 !== type2) {
          result.match = false;
          result.differences.push({
            field: field,
            typeInFirst: type1 + ' in ' + name1,
            typeInSecond: type2 + ' in ' + name2
          });
        }
      });
      
      return result;
    }
    """
    
    # Compare TypeScript vs Python schemas
    * def tsPyComparison = compareSchemas(tsSchema, pySchema, 'TypeScript', 'Python')
    * match tsPyComparison.match == true
    
    # Compare Python vs Go schemas
    * def pyGoComparison = compareSchemas(pySchema, goSchema, 'Python', 'Go')
    * match pyGoComparison.match == true
    
    # Compare TypeScript vs Go schemas (transitive, but we'll check explicitly for clarity)
    * def tsGoComparison = compareSchemas(tsSchema, goSchema, 'TypeScript', 'Go')
    * match tsGoComparison.match == true

  Scenario: Cross-language workflow execution across all services
    # Set up a test case for migration
    * def testCase = 
    """
    {
      id: "TC-POLY-1000",
      name: "Cross-language test case",
      description: "Test case for validating polyglot architecture",
      priority: "High",
      status: "Ready"
    }
    """
    
    # Create test case through TypeScript API
    Given url endpoints.typescript.baseUrl
    And path '/test-cases'
    And request testCase
    When method POST
    Then status 201
    * def createdTestCaseId = response.id
    
    # Trigger a migration workflow
    Given url endpoints.typescript.baseUrl
    And path '/workflows/migration'
    And request { testCaseId: '#(createdTestCaseId)', sourceProvider: 'zephyr', targetProvider: 'qtest' }
    When method POST
    Then status 202
    * def workflowId = response.workflowId
    
    # Wait a short time for workflow to be processed
    * eval sleep(1000)
    
    # Check workflow status in orchestrator (Python)
    Given url endpoints.python.baseUrl
    And path '/workflows/' + workflowId
    When method GET
    Then status 200
    * def workflowStatus = response.status
    
    # Verify workflow is being processed (status should be in_progress, completed, or failed)
    * match workflowStatus == '#regex (in_progress|completed|failed)'
    
    # Check test case data in binary processor (Go)
    Given url endpoints.go.baseUrl
    And path '/test-cases/' + createdTestCaseId
    When method GET
    Then status 200
    * def processedTestCase = response
    
    # Verify core attributes are preserved across all three services
    * match processedTestCase.id == createdTestCaseId
    * match processedTestCase.name == testCase.name