Feature: Test Case Migration Workflow
  This feature demonstrates how provider mocks can be used to test the migration workflow

  Background:
    * def zephyrPort = karate.properties['zephyr.mock.port'] || 8090
    * def qtestPort = karate.properties['qtest.mock.port'] || 8091
    * def apiPort = karate.properties['api.port'] || 8080
    
    * def zephyrUrl = 'http://localhost:' + zephyrPort
    * def qtestUrl = 'http://localhost:' + qtestPort
    * def apiUrl = 'http://localhost:' + apiPort
    
    # Start the provider mock servers
    * def zephyrMock = karate.start({ mock: '../mocks/zephyr-api-mock.feature', port: zephyrPort })
    * def qtestMock = karate.start({ mock: '../mocks/qtest-mock.feature', port: qtestPort })
    
    * print 'Started Zephyr mock server on port:', zephyrPort
    * print 'Started qTest mock server on port:', qtestPort

  Scenario: Migrate test cases from Zephyr to qTest
    # Step 1: Set up test data in Zephyr mock
    # Create additional test cases in Zephyr mock
    Given url zephyrUrl
    And path '/api/test-cases'
    And request { 
      name: 'User Registration Test', 
      description: 'Verify that new users can register for an account', 
      priority: 'Medium',
      status: 'Active',
      steps: [
        { description: 'Navigate to registration page', expectedResult: 'Registration form is displayed' },
        { description: 'Enter user details', expectedResult: 'Form validates input' },
        { description: 'Submit form', expectedResult: 'Account is created and confirmation shown' }
      ]
    }
    When method POST
    Then status 201
    * def testCase1 = response
    
    Given url zephyrUrl
    And path '/api/test-cases'
    And request { 
      name: 'Password Reset Test', 
      description: 'Verify that users can reset their password', 
      priority: 'High',
      status: 'Active',
      steps: [
        { description: 'Navigate to login page', expectedResult: 'Login form is displayed' },
        { description: 'Click forgot password', expectedResult: 'Password reset form shown' },
        { description: 'Enter email address', expectedResult: 'Reset email is sent' }
      ]
    }
    When method POST
    Then status 201
    * def testCase2 = response
    
    # Step 2: Add attachment to a test case
    Given url zephyrUrl
    And path '/api/test-cases/' + testCase1.id + '/attachments'
    And request { name: 'screenshot.png', contentType: 'image/png', content: 'base64-encoded-content' }
    When method POST
    Then status 201
    
    # Step 3: Trigger migration via Skidbladnir API
    Given url apiUrl
    And path '/api/migrations'
    And request {
      source: {
        provider: 'zephyr',
        baseUrl: '#(zephyrUrl)',
        credentials: { apiKey: 'mock-api-key' }
      },
      target: {
        provider: 'qtest',
        baseUrl: '#(qtestUrl)',
        credentials: { username: 'admin', password: 'password' }
      },
      options: {
        includeAttachments: true,
        createMissingProjects: true,
        createMissingModules: true
      }
    }
    When method POST
    Then status 202
    And match response contains { id: '#string', status: 'QUEUED' }
    * def migrationId = response.id
    
    # Step 4: Poll migration status (simulation)
    * def migrationComplete = false
    * def maxRetries = 5
    * def retry = 0
    
    Given url apiUrl
    And path '/api/migrations/' + migrationId
    And retry until (response.status == 'COMPLETED' || response.status == 'FAILED' || retry++ == maxRetries)
    When method GET
    Then status 200
    And match response.status == 'COMPLETED'
    
    # Step 5: Verify migrated test cases in qTest
    # Get all test cases from qTest
    Given url qtestUrl
    And path '/api/qtest/test-cases'
    When method GET
    Then status 200
    * def migratedTestCases = response.testCases
    
    # Verify at least the original count of test cases were migrated
    * assert migratedTestCases.length >= 3  // Default + 2 we created
    
    # Find our specific test cases by name
    * def findTestCase = function(name) { return migratedTestCases.find(function(tc) { return tc.name === name; }) }
    * def migratedTC1 = findTestCase('User Registration Test')
    * def migratedTC2 = findTestCase('Password Reset Test')
    
    # Verify test case 1 details
    * match migratedTC1.name == 'User Registration Test'
    * match migratedTC1.description == 'Verify that new users can register for an account'
    * match migratedTC1.priority == 'Medium'
    * assert migratedTC1.steps.length == 3
    
    # Verify test case 2 details
    * match migratedTC2.name == 'Password Reset Test'
    * match migratedTC2.priority == 'High'
    * assert migratedTC2.steps.length == 3
    
    # Verify attachments were migrated
    Given url qtestUrl
    And path '/api/qtest/test-cases/' + migratedTC1.id + '/attachments'
    When method GET
    Then status 200
    And match response[0].name == 'screenshot.png'
    
    # Cleanup - stop the mock servers
    * zephyrMock.stop()
    * qtestMock.stop()