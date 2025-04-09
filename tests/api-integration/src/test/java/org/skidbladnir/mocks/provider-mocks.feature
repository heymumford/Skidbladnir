Feature: Provider API Mocks
  This feature sets up mock provider APIs for isolated testing

  Background:
    * def port = karate.properties['mock.port'] || 8090
    * def baseUrl = 'http://localhost:' + port

  Scenario: Mock Zephyr API
    * def zephyrMock = karate.start({ mock: 'zephyr-mock.feature', port: port })
    * print 'Started Zephyr mock server on port:', port
    
    # Test connectivity to the mock
    Given url baseUrl
    And path '/api/zephyr/status'
    When method GET
    Then status 200
    And match response == { status: 'UP', name: 'Zephyr Mock API' }
    
    # Test test case endpoints
    Given url baseUrl
    And path '/api/zephyr/test-cases/TC-1234'
    When method GET
    Then status 200
    And match response.id == 'TC-1234'
    And match response.name == '#string'
    
    # Create a test case
    Given url baseUrl
    And path '/api/zephyr/test-cases'
    And request { name: 'New Test Case', description: 'Created in mock', priority: 'High' }
    When method POST
    Then status 201
    And match response.id == '#string'
    
    * zephyrMock.stop()

  Scenario: Mock qTest API
    * def qtestPort = port + 1
    * def qtestUrl = 'http://localhost:' + qtestPort
    * def qtestMock = karate.start({ mock: 'qtest-mock.feature', port: qtestPort })
    * print 'Started qTest mock server on port:', qtestPort
    
    # Test connectivity to the mock
    Given url qtestUrl
    And path '/api/qtest/status'
    When method GET
    Then status 200
    And match response == { status: 'UP', name: 'qTest Mock API' }
    
    # Test test case creation
    Given url qtestUrl
    And path '/api/qtest/test-cases'
    And request { name: 'Migrated Test Case', description: 'From Zephyr', priority: 'High' }
    When method POST
    Then status 201
    And match response.id == '#string'
    
    * qtestMock.stop()