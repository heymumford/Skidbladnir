Feature: qTest Pulse API Environment Compatibility Testing
  This feature validates that the qTest Pulse API behaves consistently across different environments
  for metric extraction and analysis capabilities.

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
    * def insightSchema = 
    """
    {
      id: '#string',
      name: '#string',
      description: '##string',
      type: '#string',
      value: '#number',
      trend: '##string',
      lastUpdated: '##string'
    }
    """
    
    * def metricSchema = 
    """
    {
      id: '#string',
      name: '#string',
      description: '##string',
      formula: '##string',
      parameters: '##array'
    }
    """
    
    * def trendDataSchema = 
    """
    {
      metric: '#string',
      dataPoints: '#array',
      startDate: '##string',
      endDate: '##string'
    }
    """
    
    * def dashboardSchema = 
    """
    {
      id: '#string',
      name: '#string',
      widgets: '#array'
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

  @CrossEnvironment @qTestPulse
  Scenario Outline: Validate insights endpoint consistency
    * def env = environments['<environment>']
    * def response = makeRequest(env, '/projects/' + env.projectId + '/insights', 'GET')
    
    * match response.status == 200 || (response.status == 404 && '<environment>' == 'dev')
    * if (response.status == 200) karate.set('insightsSupport', { '<environment>': true })
    * if (response.status == 404) karate.set('insightsSupport', { '<environment>': false })
    
    # If insights are supported, verify schema compatibility
    * if (response.status == 200) match response.body == '#array'
    * if (response.status == 200) match each response.body == insightSchema
    
    Examples:
      | environment |
      | dev         |
      | qa          |
      | prod        |
    
    # Check if QA and Prod have the same support level
    * if (karate.exists('insightsSupport.qa') && karate.exists('insightsSupport.prod')) assert insightsSupport.qa == insightsSupport.prod
    
  @CrossEnvironment @qTestPulse
  Scenario Outline: Validate metrics definitions endpoint consistency
    * def env = environments['<environment>']
    * def response = makeRequest(env, '/projects/' + env.projectId + '/metrics', 'GET')
    
    * match response.status == 200 || (response.status == 404 && '<environment>' == 'dev')
    * if (response.status == 200) karate.set('metricsSupport', { '<environment>': true })
    * if (response.status == 404) karate.set('metricsSupport', { '<environment>': false })
    
    # If metrics are supported, verify schema compatibility
    * if (response.status == 200) match response.body == '#array'
    * if (response.status == 200) match each response.body == metricSchema
    
    Examples:
      | environment |
      | dev         |
      | qa          |
      | prod        |
    
    # Check if QA and Prod have the same support level
    * if (karate.exists('metricsSupport.qa') && karate.exists('metricsSupport.prod')) assert metricsSupport.qa == metricsSupport.prod
    
  @CrossEnvironment @qTestPulse
  Scenario Outline: Validate metric data endpoint consistency
    * def env = environments['<environment>']
    * def response = makeRequest(env, '/projects/' + env.projectId + '/metrics/overall-test-progress/data', 'GET')
    
    * match response.status == 200 || response.status == 404
    * if (response.status == 200) karate.set('metricDataSupport', { '<environment>': true })
    * if (response.status == 404) karate.set('metricDataSupport', { '<environment>': false })
    
    # If metric data is supported, verify schema compatibility
    * if (response.status == 200) match response.body.metricName == '#string'
    * if (response.status == 200) match response.body.data == '#array'
    
    Examples:
      | environment |
      | dev         |
      | qa          |
      | prod        |
    
    # Check if QA and Prod have the same support level
    * if (karate.exists('metricDataSupport.qa') && karate.exists('metricDataSupport.prod')) assert metricDataSupport.qa == metricDataSupport.prod
    
  @CrossEnvironment @qTestPulse
  Scenario Outline: Validate trends endpoint consistency
    * def env = environments['<environment>']
    * def response = makeRequest(env, '/projects/' + env.projectId + '/trends', 'GET')
    
    * match response.status == 200 || response.status == 404
    * if (response.status == 200) karate.set('trendsSupport', { '<environment>': true })
    * if (response.status == 404) karate.set('trendsSupport', { '<environment>': false })
    
    # If trends are supported, verify schema compatibility
    * if (response.status == 200) match response.body == '#array'
    * if (response.status == 200 && response.body.length > 0) match response.body[0] == trendDataSchema
    
    Examples:
      | environment |
      | dev         |
      | qa          |
      | prod        |
    
    # Check if QA and Prod have the same support level
    * if (karate.exists('trendsSupport.qa') && karate.exists('trendsSupport.prod')) assert trendsSupport.qa == trendsSupport.prod
    
  @CrossEnvironment @qTestPulse
  Scenario Outline: Validate dashboards endpoint consistency
    * def env = environments['<environment>']
    * def response = makeRequest(env, '/projects/' + env.projectId + '/dashboards', 'GET')
    
    * match response.status == 200 || response.status == 404
    * if (response.status == 200) karate.set('dashboardsSupport', { '<environment>': true })
    * if (response.status == 404) karate.set('dashboardsSupport', { '<environment>': false })
    
    # If dashboards are supported, verify schema compatibility
    * if (response.status == 200) match response.body == '#array'
    * if (response.status == 200 && response.body.length > 0) match response.body[0] == dashboardSchema
    
    Examples:
      | environment |
      | dev         |
      | qa          |
      | prod        |
    
    # Check if QA and Prod have the same support level
    * if (karate.exists('dashboardsSupport.qa') && karate.exists('dashboardsSupport.prod')) assert dashboardsSupport.qa == dashboardsSupport.prod
    
  @CrossEnvironment @qTestPulse
  Scenario Outline: Compare feature availability between environments
    * def env = environments['<environment>']
    
    # Check a comprehensive list of potential Pulse endpoints
    * def endpoints = ['insights', 'metrics', 'trends', 'dashboards', 'reports', 'integrations', 'webhooks']
    * def supportMap = {}
    
    # For each endpoint, check availability
    * def checkEndpoint = 
    """
    function(endpoint) {
      var path = '/projects/' + env.projectId + '/' + endpoint;
      var response = makeRequest(env, path, 'GET');
      return response.status == 200;
    }
    """
    
    # Check all endpoints and record results
    * def results = karate.map(endpoints, checkEndpoint)
    * eval
    """
    for (var i = 0; i < endpoints.length; i++) {
      supportMap[endpoints[i]] = results[i];
    }
    """
    
    # Save the results for this environment
    * karate.set('support_' + '<environment>', supportMap)
    
    Examples:
      | environment |
      | dev         |
      | qa          |
      | prod        |
    
    # Compare feature availability between environments
    * def devSupport = support_dev
    * def qaSupport = support_qa
    * def prodSupport = support_prod
    
    # At minimum, QA and Prod should have the same feature set
    * def checkFeatureParity = 
    """
    function() {
      for (var endpoint in qaSupport) {
        if (qaSupport[endpoint] !== prodSupport[endpoint]) {
          return false;
        }
      }
      return true;
    }
    """
    
    * assert checkFeatureParity() == true
    
    # Log the feature availability for all environments
    * print 'Feature availability comparison:', devSupport, qaSupport, prodSupport