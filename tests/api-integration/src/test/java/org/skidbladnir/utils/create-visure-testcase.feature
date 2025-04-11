Feature: Create Visure Test Case

  Scenario: Create a test case in Visure
    * url baseUrl
    * header Accept = 'application/json'
    * header Content-Type = 'application/json'
    * header Authorization = call read('classpath:auth-visure.js')
    * def projectId = projectId
    * def folderId = folderId
    * def testCase = testCase
    
    # Create trace link for requirement if provided
    * def traceLinks = []
    * eval if (testCase.requirementId) { traceLinks.push({ sourceId: testCase.requirementId, targetId: 'will-be-replaced', linkType: 'VERIFIES', direction: 'FORWARD' }) }
    
    # Convert steps to Visure format
    * def visureSteps = []
    * eval for (var i = 0; i < testCase.steps.length; i++) { visureSteps.push({ order: testCase.steps[i].order, action: testCase.steps[i].action, expected: testCase.steps[i].expected, notes: '' }) }
    
    # Create request payload
    * def requestBody = 
    """
    {
      "title": "#(testCase.title)",
      "description": "#(testCase.description)",
      "status": "#(testCase.status)",
      "priority": "#(testCase.priority)",
      "steps": "#(visureSteps)",
      "folderId": "#(folderId)",
      "automationStatus": "#(testCase.automationStatus)"
    }
    """
    
    # Create the test case
    Given path '/api/v1/projects/' + projectId + '/testcases'
    And request requestBody
    When method POST
    Then status 200
    And match response contains { id: '#string', title: '#string' }
    
    # Update trace links if needed
    * def testCaseId = response.id
    * eval if (traceLinks.length > 0) { for (var i = 0; i < traceLinks.length; i++) { traceLinks[i].targetId = testCaseId } }
    
    * eval if (traceLinks.length > 0) {
        karate.call('classpath:org/skidbladnir/utils/create-visure-tracelinks.feature', 
          { projectId: projectId, traceLinks: traceLinks });
      }
    
    # Return the created test case
    * def result = response