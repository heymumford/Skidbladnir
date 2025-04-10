/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

/**
 * Karate test file for Zephyr Scale API contract validation
 * 
 * This test ensures the Zephyr API client correctly implements the API contract
 * for test case, test cycle, and execution data types.
 */

Feature: Zephyr Scale API Contract Tests

  Background:
    * url baseUrl
    * header Authorization = 'Bearer ' + apiToken
    * header Content-Type = 'application/json'
    * header Accept = 'application/json'
    
    # Function to generate a random string for test data uniqueness
    * def randomString = 
      """
      function() {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (var i = 0; i < 10; i++)
          text += possible.charAt(Math.floor(Math.random() * possible.length));
        return text;
      }
      """
    
    # Test data setup  
    * def projectKey = 'DEMO'
    * def testCaseName = 'Karate API Test - ' + randomString()
    * def testCycleName = 'Karate Test Cycle - ' + randomString()
    
    # Define schema validation matchers for fuzzy matching
    * def testCaseSchema =
      """
      {
        id: '#string',
        key: '#string',
        name: '#string',
        description: '##string',
        objective: '##string',
        precondition: '##string',
        priority: '##string',
        status: '#string',
        folder: '##string',
        folderId: '##string',
        labels: '##array',
        steps: '#array',
        customFields: '##object'
      }
      """
    
    * def testStepSchema =
      """
      {
        id: '##string',
        index: '#number',
        description: '#string',
        expectedResult: '##string',
        testData: '##string',
        attachments: '##array'
      }
      """
      
    * def testCycleSchema =
      """
      {
        id: '#string',
        name: '#string',
        description: '##string',
        status: '#string',
        environment: '##string',
        folderId: '##string',
        startDate: '##string',
        endDate: '##string',
        items: '##array',
        customFields: '##object'
      }
      """
      
    * def executionSchema = 
      """
      {
        id: '#string',
        testId: '#string',
        cycleId: '#string',
        status: '#string',
        comment: '##string',
        environment: '##string',
        executedBy: '##string',
        executedOn: '##string',
        timeSpentInSeconds: '##number',
        stepResults: '##array',
        customFields: '##object'
      }
      """

  Scenario: Verify Test Case Structure
    Given path '/tests'
    And param projectKey = projectKey
    And param maxResults = 1
    When method get
    Then status 200
    And match response[0] contains testCaseSchema
    
    # Verify test steps structure if present
    * if (response[0].steps && response[0].steps.length > 0) karate.match(response[0].steps[0], testStepSchema)
    
    # Verify that custom fields are properly structured
    * if (response[0].customFields) karate.forEach(response[0].customFields, function(k, v) { karate.log('Custom field: ' + k + ' with type: ' + (typeof v)) })
    
  Scenario: Create and Retrieve Test Case with Complex Data Types
    # Create test case with various data types
    Given path '/tests'
    And request
      """
      {
        projectKey: '#(projectKey)',
        name: '#(testCaseName)',
        description: '<div>HTML formatted description with special chars: áéíóú</div>',
        objective: 'Test objective with multiple\nlines and emoji 🚀',
        precondition: 'System is ready for testing',
        priority: 'MEDIUM',
        status: 'DRAFT',
        labels: ['karate-test', 'data-types'],
        steps: [
          {
            description: 'Step with HTML: <b>bold text</b>',
            expectedResult: '<ul><li>Expected item 1</li><li>Expected item 2</li></ul>',
            testData: '{"complex": true, "values": [1, 2, 3]}'
          },
          {
            description: 'Step with special chars: áéíóú',
            expectedResult: 'Result with emoji 🚀',
            testData: 'Simple test data'
          }
        ],
        customFields: {
          textField: 'Text value',
          numberField: 42,
          booleanField: true,
          dateField: '2025-01-01',
          multiSelectField: ['option1', 'option2'],
          objectField: {
            nested: 'value',
            array: [1, 2, 3]
          }
        }
      }
      """
    When method post
    Then status 201
    And match response.id == '#string'
    And match response.name == testCaseName
    
    # Retrieve created test case
    * def testId = response.id
    Given path '/tests/' + testId
    When method get
    Then status 200
    And match response.id == testId
    And match response.name == testCaseName
    
    # Verify complex data types
    And match response.description contains 'HTML formatted description'
    And match response.description contains 'áéíóú'
    And match response.objective contains '🚀'
    And match response.steps[0].description contains '<b>bold text</b>'
    And match response.steps[1].description contains 'áéíóú'
    And match response.customFields.numberField == 42
    And match response.customFields.booleanField == true
    And match response.customFields.multiSelectField contains 'option1'
    
  Scenario: Verify Test Cycle Structure
    Given path '/cycles'
    And param projectKey = projectKey
    And param maxResults = 1
    When method get
    Then status 200
    * if (response.length > 0) karate.match(response[0], testCycleSchema)
    
  Scenario: Create and Execute Test Cycle with Various Data Types
    # Create test cycle
    Given path '/cycles'
    And request
      """
      {
        projectKey: '#(projectKey)',
        name: '#(testCycleName)',
        description: 'Test cycle created by Karate test',
        status: 'ACTIVE',
        environment: 'QA',
        customFields: {
          dateField: '2025-01-01',
          textField: 'Text value with special chars: áéíóú',
          numberField: 3.14159,
          booleanField: true
        }
      }
      """
    When method post
    Then status 201
    And match response.id == '#string'
    And match response.name == testCycleName
    
    # Get created cycle ID
    * def cycleId = response.id
    
    # Add a test case to the cycle
    * def existingTestId = null
    Given path '/tests'
    And param projectKey = projectKey
    And param maxResults = 1
    When method get
    Then status 200
    * if (response.length > 0) existingTestId = response[0].key
    
    * if (existingTestId != null) {
        Given path '/cycles/' + cycleId + '/items'
        And request { testKeys: ['#(existingTestId)'] }
        When method post
        Then status 201
      }
    
    # Create a test execution with complex data
    * if (existingTestId != null) {
        Given path '/executions'
        And request
          """
          {
            testId: '#(existingTestId)',
            cycleId: '#(cycleId)',
            status: 'PASSED',
            comment: 'Execution with <b>HTML</b> and special chars: áéíóú',
            environment: 'QA',
            timeSpentInSeconds: 120,
            customFields: {
              browserField: 'Chrome',
              versionField: '115.0.1',
              notesField: 'Test passed with emoji 🚀'
            }
          }
          """
        When method post
        Then status 201
        And match response.id == '#string'
        And match response.testId == existingTestId
        And match response.status == 'PASSED'
        And match response.customFields.notesField contains '🚀'
      }
    
  Scenario: Verify Pagination Handling
    Given path '/tests'
    And param projectKey = projectKey
    And param maxResults = 5
    And param startAt = 0
    When method get
    Then status 200
    And match response == '#array'
    
    # Check next page
    Given path '/tests'
    And param projectKey = projectKey
    And param maxResults = 5
    And param startAt = 5
    When method get
    Then status 200
    And match response == '#array'
    
  Scenario: Verify Attachment Handling
    # Find a test case to attach to
    Given path '/tests'
    And param projectKey = projectKey
    And param maxResults = 1
    When method get
    Then status 200
    * def testId = response.length > 0 ? response[0].id : null
    
    * if (testId != null) {
        # Create sample text file
        * def textContent = 'Test attachment content'
        * def TextAttachment = Java.type('java.io.File')
        * def textFile = new TextAttachment('test-attachment.txt')
        * karate.write(textContent, textFile)
        
        # Create multipart request to upload attachment
        Given path '/tests/' + testId + '/attachments'
        And multipart file file = textFile
        When method post
        Then status 201
        And match response.id == '#string'
        And match response.filename == 'test-attachment.txt'
      }