Feature: Provider API Contract
  This feature validates the contract of the Provider API endpoints

  Background:
    * url apiBaseUrl
    * def providerSchema = 
    """
    {
      id: '#string',
      name: '#string',
      type: '#string',
      capabilities: {
        sourceProvider: '#boolean',
        targetProvider: '#boolean',
        supportAttachments: '#boolean',
        supportLinks: '#boolean'
      },
      connectionStatus: '#string',
      lastConnected: '##string'
    }
    """

  Scenario: List providers schema validation
    Given path '/providers'
    When method GET
    Then status 200
    And match response == { providers: '#array', count: '#number' }
    And match response.providers[0] == providerSchema

  Scenario: Get provider schema validation
    Given path '/providers/zephyr'
    When method GET
    Then status 200
    And match response == providerSchema

  Scenario: Get provider capabilities schema validation
    Given path '/providers/zephyr/capabilities'
    When method GET
    Then status 200
    And match response == { 
      sourceProvider: '#boolean', 
      targetProvider: '#boolean', 
      supportAttachments: '#boolean', 
      supportLinks: '#boolean'
    }

  Scenario: Validate provider connection schema
    Given path '/providers/zephyr/validate'
    And request { apiKey: 'test-key', url: 'https://zephyr-api.example.com' }
    When method POST
    Then status 200
    And match response == { valid: '#boolean', message: '#string' }