Feature: Test Case Migration
  As a QA engineer
  I want to migrate test cases between Zephyr and qTest
  So that I can view and transfer my complete test assets including structure, executions, and attachments

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
    
  @ui @visualization
  Scenario: View test case structure before migration
    Given I have authenticated with valid credentials
    When I select Zephyr as the source provider
    And I enter valid connection details
    And I test the connection
    Then I should see a successful connection message
    When I browse the test case structure
    Then I should see a hierarchical view of test suites and test cases
    When I select a test case
    Then I should see its complete details including steps, attachments, and executions
    
  @ui @migration-wizard
  Scenario: Complete migration wizard flow
    Given I have authenticated with valid credentials
    When I start the migration wizard
    And I select Zephyr as the source provider
    And I enter valid Zephyr connection details
    And I test the Zephyr connection successfully
    And I select qTest as the target provider
    And I enter valid qTest connection details
    And I test the qTest connection successfully
    And I select the test cases to migrate
    And I configure the field mapping between systems
    And I start the migration
    Then I should see a real-time progress indicator
    And I should see each test case being processed in the activity log
    When the migration completes
    Then I should see a summary with success and failure counts
    And I should see validation links to verify the migration in qTest
    
  @ui @streamlined-experience
  Scenario: End-to-end streamlined migration experience
    Given I have followed the installation instructions in the README
    And I navigate to the web UI in my browser
    Then I should see a beautiful, simple and elegant React interface
    When I click on "New Migration"
    Then I should see the streamlined migration configuration page
    
    # Source configuration
    When I select "Zephyr" as my incoming test source
    And I enter my Zephyr authentication token
    And I click "Test Connection"
    Then I should see a success message with connection details
    When I click "Download Test Assets"
    Then I should see a progress indicator
    And I should see assets being downloaded in real-time
    And I should receive a notification when all assets are downloaded
    
    # Data adjustment configuration
    When I navigate to the "Field Mapping" section
    Then I should see all source fields mapped to destination fields
    When I select a field that needs adjustment
    Then I should see data transformation options
    When I configure a concatenation for "Description" field
    And I configure text slicing for "Title" field
    And I add a custom prefix to "ID" field
    Then I should see a preview of the transformed data
    
    # Destination configuration
    When I navigate to the "Destination" section
    And I select "qTest" as my outgoing test destination
    And I enter my qTest authentication token
    And I click "Test Connection"
    Then I should see a success message with connection details
    
    # Execution and monitoring
    When I click "Execute Migration"
    Then I should see an organized dashboard with status indicators
    And I should see LCARS-inspired blinking lights for active operations
    And I should see an accurate, easy-to-understand progress bar
    And I should see a detailed log of operations as they happen
    
    # Error handling
    When an error occurs during migration
    Then I should see detailed information about the error
    And I should see suggestions for resolving the error
    When I click "Pause Migration"
    Then the migration process should pause
    When I click "Resume Migration"
    Then the migration process should continue
    When I click "Cancel Migration"
    Then I should see a confirmation dialog
    When I confirm cancellation
    Then the migration process should stop completely
    And no further data should be uploaded to the destination