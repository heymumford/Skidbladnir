Feature: End-to-End Migration Flow
  This feature tests the complete end-to-end flow of a test case migration

  Background:
    * url apiBaseUrl
    * def sourceTestCase = 
    """
    {
      id: "TC-E2E-1",
      name: "End-to-End Migration Test",
      description: "Test case for end-to-end migration testing",
      priority: "High",
      status: "Ready",
      steps: [
        { id: "step-1", description: "Open login page", expectedResult: "Login page is displayed" },
        { id: "step-2", description: "Enter credentials", expectedResult: "User is logged in" }
      ],
      attachments: [
        {
          id: "attachment-e2e-1",
          name: "login-screenshot.png",
          contentType: "image/png",
          size: 1024,
          content: "base64:iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
        }
      ]
    }
    """

  Scenario: Complete test case migration from source to target provider
    # 1. First, set up the test case in the source system (mocked)
    Given path '/providers/zephyr/test-cases'
    And request sourceTestCase
    When method POST
    Then status 201
    
    # 2. Initiate migration via API
    Given path '/migration/test-cases'
    And request { 
      sourceId: "TC-E2E-1", 
      sourceProvider: "zephyr", 
      targetProvider: "qtest",
      options: {
        preserveAttachments: true,
        preserveLinks: true
      }
    }
    When method POST
    Then status 202
    And match response == { workflowId: '#string', status: '#string' }
    * def workflowId = response.workflowId
    
    # 3. Wait for workflow to complete (polling)
    * def isComplete = false
    * def maxAttempts = 10
    * def currentAttempt = 0
    * def waitTimeMs = 500
    
    Given path '/workflows/' + workflowId
    
    # Use a loop to poll the workflow status until completion or timeout
    * while (!isComplete && currentAttempt < maxAttempts) {
        When method GET
        Then status 200
        * isComplete = response.status == 'COMPLETED' || response.status == 'FAILED'
        * if (!isComplete) karate.log('Workflow status:', response.status, '- waiting...')
        * if (!isComplete) java.lang.Thread.sleep(waitTimeMs)
        * currentAttempt = currentAttempt + 1
    }
    
    # 4. Verify workflow completed successfully
    * assert isComplete
    And match response.status == 'COMPLETED'
    And match response.progress == 100
    * def targetId = response.targetId
    
    # 5. Verify test case was created in target system
    Given path '/providers/qtest/test-cases/' + targetId
    When method GET
    Then status 200
    And match response.name == sourceTestCase.name
    And match response.description == sourceTestCase.description
    And match response.priority == sourceTestCase.priority
    And match response.status == sourceTestCase.status
    And match response.steps[0].description == "Open login page"
    And match response.steps[1].description == "Enter credentials"
    
    # 6. Verify attachment was transferred
    And match response.attachments[0].name == "login-screenshot.png"
    And match response.attachments[0].contentType == "image/png"
    
    # 7. Verify migration logs
    Given path '/workflows/' + workflowId + '/logs'
    When method GET
    Then status 200
    And match response.logs[*].message contains "Migration completed successfully"