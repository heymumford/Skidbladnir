Feature: Verify TestRail Test Case

  Scenario: Verify a migrated TestRail test case matches its original source
    * url baseUrl
    * header Accept = 'application/json'
    * header Content-Type = 'application/json'
    * header Authorization = call read('classpath:auth-testrail.js')
    * def caseId = caseId
    * def originalTitle = originalTitle
    
    # Get the test case from TestRail
    Given path '/index.php'
    And path '/api/v2/get_case/' + caseId
    When method GET
    Then status 200
    And match response contains { id: '#number', title: '#string' }
    
    # Verify the test case has the expected title
    * def verified = response.title.includes(originalTitle)
    * def result = { verified: verified, testCase: response }
    * eval if (!verified) karate.log('TITLE MISMATCH. Expected:', originalTitle, ', Actual:', response.title)