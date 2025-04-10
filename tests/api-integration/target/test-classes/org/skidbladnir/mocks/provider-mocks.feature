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
    And match response == { status: 'UP', name: 'qTest Mock API', version: '1.0.0' }
    
    # Verify default test case exists
    Given url qtestUrl
    And path '/api/qtest/test-cases/QT-TC-5000'
    When method GET
    Then status 200
    And match response.id == 'QT-TC-5000'
    And match response.name == 'Login Authentication Test'
    
    # Create a new test case
    Given url qtestUrl
    And path '/api/qtest/test-cases'
    And request { 
      name: 'Migrated Test Case', 
      description: 'From Zephyr', 
      priority: 'High',
      moduleId: 'QT-MO-300',
      projectId: 'QT-PR-100',
      steps: [
        { description: 'Step 1', expectedResult: 'Expected 1' },
        { description: 'Step 2', expectedResult: 'Expected 2' }
      ]
    }
    When method POST
    Then status 201
    And match response.id == '#string'
    * def newTestCaseId = response.id
    
    # Test cycle integration
    # Get test cycles
    Given url qtestUrl
    And path '/api/qtest/cycles'
    When method GET
    Then status 200
    And match response.cycles[0].id == 'QT-CY-2000'
    
    # Add test case to test cycle
    Given url qtestUrl
    And path '/api/qtest/cycles/QT-CY-2000/test-cases'
    And request { testCaseId: '#(newTestCaseId)' }
    When method POST
    Then status 201
    And match response.testCaseId == newTestCaseId
    And match response.cycleId == 'QT-CY-2000'
    * def testRunId = response.id
    
    # Get test run
    Given url qtestUrl
    And path '/api/qtest/runs/' + testRunId
    When method GET
    Then status 200
    And match response.id == testRunId
    And match response.status == 'Not Executed'
    
    # Update test run status
    Given url qtestUrl
    And path '/api/qtest/runs/' + testRunId
    And request { status: 'Passed', executedBy: 'automation', executedAt: '#(new Date().toISOString())' }
    When method PUT
    Then status 200
    And match response.status == 'Passed'
    
    # Add an attachment to the test case
    Given url qtestUrl
    And path '/api/qtest/test-cases/' + newTestCaseId + '/attachments'
    And request { 
      name: 'test-results.xml',
      contentType: 'application/xml',
      size: 1024,
      content: '<testsuites><testsuite name="Test Results" tests="1" failures="0" errors="0"><testcase name="Test Case" time="0.1"></testcase></testsuite></testsuites>'
    }
    When method POST
    Then status 201
    And match response.name == 'test-results.xml'
    * def attachmentId = response.id
    
    # Get attachment content
    Given url qtestUrl
    And path '/api/qtest/attachments/' + attachmentId + '/content'
    When method GET
    Then status 200
    And match response contains 'testsuites'
    
    # Clean up - stop the mock server
    * qtestMock.stop()