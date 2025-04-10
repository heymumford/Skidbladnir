Feature: Check Migration Status
  Helper feature to check the status of a migration workflow

  Scenario:
    # Required parameters:
    # - workflowId: The ID of the workflow to check
    # - apiUrl: The base URL of the API service
    
    Given url apiUrl
    And path '/workflows/' + workflowId
    When method GET
    Then status 200
    * def status = response.status
    * def details = response
    
    # Return the status and details
    * def result = { status: status, details: details }