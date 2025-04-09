Feature: System Stats Helper

  Scenario: Fetch system statistics
    # This is a simulation of getting system stats since Karate doesn't have direct access
    # In a real implementation, this would call an API endpoint that returns actual metrics
    
    Given url apiBaseUrl
    And path '/system/stats'
    When method GET
    
    # If the endpoint exists and returns data, use it
    * def statsAvailable = responseStatus == 200
    
    # If stats endpoint doesn't exist, simulate some data for testing
    * def memory = statsAvailable ? response.memory : Math.floor(Math.random() * 1000) + 500
    * def cpu = statsAvailable ? response.cpu : Math.floor(Math.random() * 60) + 10