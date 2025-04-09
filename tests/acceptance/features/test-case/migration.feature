Feature: Test Case Migration
  As a test manager
  I want to migrate test cases between different systems
  So that I can consolidate my test assets

  Background:
    Given I am authenticated with a valid API token
    And the system has a valid connection to the "zephyr" source provider
    And the system has a valid connection to the "qtest" target provider

  @migration @smoke
  Scenario: Successfully migrate a single test case
    Given I have a test case with ID "TC-1234" in the source system
    When I request to migrate the test case to the target system
    Then the response status code should be 202
    And the response should contain a field "workflowId" with a non-empty value
    When I wait for the migration to complete
    Then the test case should exist in the target system
    And the test case in the target system should have the same name

  @migration
  Scenario: Migration should preserve test case attributes
    Given I have a test case with the following attributes in the source system:
      | id          | TC-5678           |
      | name        | Login Validation  |
      | description | Verify user login |
      | priority    | High              |
      | status      | Ready             |
    When I request to migrate the test case to the target system
    And I wait for the migration to complete
    Then the test case should exist in the target system
    And the test case in the target system should have the following attributes:
      | name        | Login Validation  |
      | description | Verify user login |
      | priority    | High              |
      | status      | Ready             |

  @migration
  Scenario: Migration should handle attachments
    Given I have a test case with ID "TC-9876" in the source system
    And the test case has 2 attachments
    When I request to migrate the test case to the target system
    And I wait for the migration to complete
    Then the test case should exist in the target system
    And the test case in the target system should have 2 attachments
    And the attachments should have the same content

  @migration @error
  Scenario: Handle source system connection failure
    Given the source system is not available
    When I request to migrate a test case with ID "TC-1234"
    Then the response status code should be 503
    And the response should contain a field "error" with value "Source system unavailable"

  @migration @error
  Scenario: Handle test case not found in source system
    Given the source system is available
    When I request to migrate a test case with ID "NONEXISTENT"
    Then the response status code should be 404
    And the response should contain a field "error" with value "Test case not found"