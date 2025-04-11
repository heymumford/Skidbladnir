Feature: Connection Verification for Provider APIs

  Background:
    * url baseUrl
    * def providerPath = '/providers'
    * def now = function() { return new Date().toISOString(); }

  Scenario: Verify successful Zephyr Scale connection with valid credentials
    Given path providerPath + '/zephyr/test-connection'
    And request
    """
    {
      "baseUrl": "https://api.zephyrscale.smartbear.com/v2",
      "apiKey": "VALID_API_KEY",
      "projectKey": "DEMO"
    }
    """
    When method post
    Then status 200
    And match response.success == true
    And match response.message contains 'Successfully connected'
    And match response.details != null
    And match response.details.version != null
    And match response.details.authenticatedUser != null
    And match response.details.projectName != null
    And match response.details.timestamp != null

  Scenario: Verify failed Zephyr Scale connection with invalid API key
    Given path providerPath + '/zephyr/test-connection'
    And request
    """
    {
      "baseUrl": "https://api.zephyrscale.smartbear.com/v2",
      "apiKey": "INVALID_API_KEY", 
      "projectKey": "DEMO"
    }
    """
    When method post
    Then status 200
    And match response.success == false
    And match response.message contains 'Invalid API key'
    And match response.details != null
    And match response.details.errorCode == 'UNAUTHORIZED'

  Scenario: Verify failed Zephyr Scale connection with invalid project key
    Given path providerPath + '/zephyr/test-connection'
    And request
    """
    {
      "baseUrl": "https://api.zephyrscale.smartbear.com/v2",
      "apiKey": "VALID_API_KEY",
      "projectKey": "INVALID_PROJECT"
    }
    """
    When method post
    Then status 200
    And match response.success == false
    And match response.message contains 'Project not found'
    And match response.details != null
    And match response.details.errorCode == 'PROJECT_NOT_FOUND'

  Scenario: Verify successful qTest connection with valid credentials
    Given path providerPath + '/qtest/test-connection'
    And request
    """
    {
      "baseUrl": "https://demo.qtestnet.com",
      "apiToken": "VALID_TOKEN",
      "projectId": "12345"
    }
    """
    When method post
    Then status 200
    And match response.success == true
    And match response.message contains 'Successfully connected'
    And match response.details != null
    And match response.details.version != null
    And match response.details.authenticatedUser != null
    And match response.details.projectName != null
    And match response.details.timestamp != null

  Scenario: Verify failed qTest connection with invalid token
    Given path providerPath + '/qtest/test-connection'
    And request
    """
    {
      "baseUrl": "https://demo.qtestnet.com",
      "apiToken": "INVALID_TOKEN",
      "projectId": "12345"
    }
    """
    When method post
    Then status 200
    And match response.success == false
    And match response.message contains 'Invalid API token'
    And match response.details != null
    And match response.details.errorCode == 'UNAUTHORIZED'

  Scenario: Verify qTest connection provides detailed feedback for project not found
    Given path providerPath + '/qtest/test-connection'
    And request
    """
    {
      "baseUrl": "https://demo.qtestnet.com",
      "apiToken": "VALID_TOKEN",
      "projectId": "99999"
    }
    """
    When method post
    Then status 200
    And match response.success == false
    And match response.message contains 'Project not found'
    And match response.details != null
    And match response.details.errorCode == 'PROJECT_NOT_FOUND'

  Scenario: Verify error response on invalid URL
    Given path providerPath + '/zephyr/test-connection'
    And request
    """
    {
      "baseUrl": "invalid-url",
      "apiKey": "VALID_API_KEY",
      "projectKey": "DEMO"
    }
    """
    When method post
    Then status 200
    And match response.success == false
    And match response.message contains 'Invalid URL'
    And match response.details != null
    And match response.details.errorCode == 'INVALID_URL'

  Scenario: Verify helpful response for network connectivity issues
    Given path providerPath + '/zephyr/test-connection'
    And request
    """
    {
      "baseUrl": "https://non-existent-domain.example",
      "apiKey": "VALID_API_KEY",
      "projectKey": "DEMO"
    }
    """
    When method post
    Then status 200
    And match response.success == false
    And match response.message contains 'Could not connect'
    And match response.details != null
    And match response.details.errorCode == 'NETWORK_ERROR'
    
  Scenario: Verify connection timeout provides clear feedback
    Given path providerPath + '/zephyr/test-connection'
    And request
    """
    {
      "baseUrl": "https://api.zephyrscale.smartbear.com/v2",
      "apiKey": "VALID_API_KEY",
      "projectKey": "DEMO",
      "advancedSettings": {
        "timeout": 100
      }
    }
    """
    When method post
    Then status 200
    And match response.success == false
    And match response.message contains 'Connection timeout'
    And match response.details != null
    And match response.details.errorCode == 'TIMEOUT'