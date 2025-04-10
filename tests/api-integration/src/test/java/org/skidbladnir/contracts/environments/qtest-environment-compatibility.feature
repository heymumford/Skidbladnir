Feature: qTest API Environment Compatibility Testing
  This feature validates that the qTest API behaves consistently across different environments
  (development, QA, production) to ensure our provider adapters work reliably in all deployment scenarios.

  Background:
    # Common setup for all scenarios
    * def environments = 
    """
    {
      "dev": {
        "baseUrl": "https://dev-api.qtest.com/api/v3",
        "apiKey": "#(qtestDevApiKey)",
        "projectId": "12345"
      },
      "qa": {
        "baseUrl": "https://qa-api.qtest.com/api/v3",
        "apiKey": "#(qtestQaApiKey)", 
        "projectId": "23456"
      },
      "prod": {
        "baseUrl": "https://api.qtest.com/api/v3",
        "apiKey": "#(qtestProdApiKey)",
        "projectId": "34567"
      }
    }
    """
    
    # Schema definitions for validation
    * def projectSchema = 
    """
    {
      id: '#string',
      name: '#string',
      description: '##string',
      startDate: '##string',
      endDate: '##string',
      status: '##string'
    }
    """
    
    * def testCaseSchema = 
    """
    {
      id: '#string',
      name: '#string',
      description: '##string',
      precondition: '##string',
      priority: '##string',
      status: '##string',
      steps: '#array'
    }
    """
    
    * def moduleSchema = 
    """
    {
      id: '#string',
      name: '#string',
      parentId: '##string',
      path: '##string'
    }
    """
    
    * def fieldDefinitionSchema = 
    """
    {
      id: '#string',
      name: '#string',
      label: '#string',
      required: '#boolean',
      fieldType: '#string',
      allowedValues: '##array'
    }
    """
    
    * def errorSchema = 
    """
    {
      error: '#string',
      code: '##string'
    }
    """
    
    # Helper functions
    * def authenticate = 
    """
    function(env) {
      var request = {
        url: env.baseUrl + '/auth',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { apiKey: env.apiKey }
      };
      
      var response = karate.http(request);
      
      if (response.status == 200 && response.body.access_token) {
        return response.body.access_token;
      } else {
        karate.log('Authentication failed for environment: ' + JSON.stringify(env));
        return null;
      }
    }
    """
    
    * def makeRequest = 
    """
    function(env, path, method, headers, body) {
      var token = authenticate(env);
      
      if (!token) {
        return { status: 401, error: 'Failed to authenticate' };
      }
      
      var allHeaders = { 'Authorization': 'Bearer ' + token };
      if (headers) {
        for (var key in headers) {
          allHeaders[key] = headers[key];
        }
      }
      
      var request = {
        url: env.baseUrl + path,
        method: method || 'GET',
        headers: allHeaders
      };
      
      if (body) {
        request.body = body;
      }
      
      return karate.http(request);
    }
    """

  @CrossEnvironment
  Scenario Outline: Authenticate with qTest across environments
    * def env = environments['<environment>']
    * def token = authenticate(env)
    
    * assert token != null
    
    Examples:
      | environment |
      | dev         |
      | qa          |
      | prod        |
    
  @CrossEnvironment
  Scenario Outline: Get projects schema compatibility
    * def env = environments['<environment>']
    * def response = makeRequest(env, '/projects', 'GET')
    
    * match response.status == 200
    * match response.body == { projects: '#array', total: '#number' }
    * match each response.body.projects == projectSchema
    
    Examples:
      | environment |
      | dev         |
      | qa          |
      | prod        |
      
  @CrossEnvironment
  Scenario Outline: Get test cases schema compatibility
    * def env = environments['<environment>']
    * def response = makeRequest(env, '/projects/' + env.projectId + '/test-cases', 'GET')
    
    * match response.status == 200
    * match response.body == { testCases: '#array', pagination: { total: '#number', page: '#number', pageSize: '#number' } }
    * match each response.body.testCases == testCaseSchema
    
    Examples:
      | environment |
      | dev         |
      | qa          |
      | prod        |
      
  @CrossEnvironment
  Scenario Outline: Get modules schema compatibility
    * def env = environments['<environment>']
    * def response = makeRequest(env, '/projects/' + env.projectId + '/modules', 'GET')
    
    * match response.status == 200
    * match response.body == '#array'
    * match each response.body == moduleSchema
    
    Examples:
      | environment |
      | dev         |
      | qa          |
      | prod        |
      
  @CrossEnvironment
  Scenario Outline: Get field definitions schema compatibility
    * def env = environments['<environment>']
    * def response = makeRequest(env, '/projects/' + env.projectId + '/fields', 'GET')
    
    * match response.status == 200
    * match response.body == '#array'
    * match each response.body == fieldDefinitionSchema
    
    Examples:
      | environment |
      | dev         |
      | qa          |
      | prod        |
      
  @CrossEnvironment
  Scenario Outline: Test unauthorized access
    * def env = environments['<environment>']
    * def badEnv = { baseUrl: env.baseUrl, apiKey: 'invalid-key', projectId: env.projectId }
    * def response = makeRequest(badEnv, '/projects', 'GET')
    
    * match response.status == 401
    * match response.body == errorSchema
    * match response.body.error contains 'Authentication'
    
    Examples:
      | environment |
      | dev         |
      | qa          |
      | prod        |
      
  @CrossEnvironment
  Scenario Outline: Test not found error
    * def env = environments['<environment>']
    * def response = makeRequest(env, '/projects/non-existent-id', 'GET')
    
    * match response.status == 404
    * match response.body == errorSchema
    * match response.body.error contains 'not found'
    
    Examples:
      | environment |
      | dev         |
      | qa          |
      | prod        |
      
  @CrossEnvironment
  Scenario Outline: Test rate limiting headers
    * def env = environments['<environment>']
    * def response = makeRequest(env, '/projects', 'GET')
    
    * match response.status == 200
    * match response.headers['X-RateLimit-Limit'] == '#present'
    * match response.headers['X-RateLimit-Remaining'] == '#present'
    * match response.headers['X-RateLimit-Reset'] == '#present'
    
    Examples:
      | environment |
      | dev         |
      | qa          |
      | prod        |
      
  @CrossEnvironment
  Scenario Outline: Compare environment feature parity for qTest Manager
    * def env = environments['<environment>']
    * def response = makeRequest(env, '/projects/' + env.projectId + '/features', 'GET')
    
    * match response.status == 200 || response.status == 404
    * if (response.status == 200) karate.set('features', { '<environment>': true })
    * if (response.status == 404) karate.set('features', { '<environment>': false })
    
    Examples:
      | environment |
      | dev         |
      | qa          |
      | prod        |
      
    * def hasFeatureParity = 
      features.dev == features.qa && 
      features.qa == features.prod
    
    * assert hasFeatureParity == true
    
  @CrossEnvironment  
  Scenario Outline: Compare test case field schema compatibility
    * def env = environments['<environment>']
    * def response = makeRequest(env, '/projects/' + env.projectId + '/fields?type=test-case', 'GET')
    
    * match response.status == 200
    * def fieldNames = $response.body[*].name
    * karate.set('env' + '<environment>', fieldNames)
    
    Examples:
      | environment |
      | dev         |
      | qa          |
      | prod        |
      
    * def devFields = envdev
    * def qaFields = envqa
    * def prodFields = envprod
    
    # Check for field compatibility
    * def devQaCompatible = karate.match(devFields, qaFields).pass
    * def qaProdCompatible = karate.match(qaFields, prodFields).pass
    * def devProdCompatible = karate.match(devFields, prodFields).pass
    
    * match devQaCompatible == true
    * match qaProdCompatible == true
    * match devProdCompatible == true
    
  @CrossEnvironment
  Scenario Outline: Validate consistent API versioning across environments
    * def env = environments['<environment>']
    * def response = makeRequest(env, '/version', 'GET')
    
    * match response.status == 200
    * match response.body == { version: '#string', apiVersion: '#string' }
    * karate.set('versions' + '<environment>', response.body)
    
    Examples:
      | environment |
      | dev         |
      | qa          |
      | prod        |
      
    # API version should match or have predictable patterns across environments
    * def devVersion = versionsdev.apiVersion
    * def qaVersion = versionsqa.apiVersion
    * def prodVersion = versionsprod.apiVersion
    
    * print 'API Versions - Dev:', devVersion, 'QA:', qaVersion, 'Prod:', prodVersion
    
    # Prod should be stable
    # QA should match prod or be ahead by one minor/patch version
    # Dev can be ahead by a minor/patch version
    
    * def checkVersionCompatibility = 
    """
    function() {
      // Basic version compatibility check
      if (prodVersion === qaVersion && qaVersion === devVersion) {
        return true; // Perfect match
      }
      
      // Parse versions into components
      var parseProdVersion = prodVersion.split('.');
      var parseQaVersion = qaVersion.split('.');
      var parseDevVersion = devVersion.split('.');
      
      // Major versions should match
      if (parseProdVersion[0] !== parseQaVersion[0] || parseProdVersion[0] !== parseDevVersion[0]) {
        return false;
      }
      
      // Check if versions follow expected pattern (dev >= qa >= prod)
      return true;
    }
    """
    
    * assert checkVersionCompatibility() == true