Feature: API Health Check
  As a system administrator
  I want to check the health of the API
  So that I can ensure the system is operational

  @smoke @api
  Scenario: Basic health check
    When I make a GET request to "/api/status"
    Then the response status code should be 200
    And the response should contain a field "status" with value "ok"
    And the response should contain a field "version" with a non-empty value

  @api
  Scenario: Health check includes component statuses
    When I make a GET request to "/api/status"
    Then the response status code should be 200
    And the response should contain a field "components"
    And the components should include "api"
    And the components should include "orchestrator"
    And the components should include "binary-processor"