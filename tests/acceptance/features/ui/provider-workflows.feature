Feature: Provider-specific end-to-end UI workflows
  As a test engineer
  I want to perform complete migration workflows for each provider combination
  So that I can verify the system works correctly for all supported provider integrations

  Background:
    Given I have authenticated with valid credentials
    And I am on the migration dashboard page

  @ui @workflow @providers @wip
  Scenario Outline: Complete end-to-end migration workflow between providers
    # Source configuration
    When I select "<source>" as the source provider
    And I enter valid connection details for "<source>"
    And I test the "<source>" connection
    Then I should see a successful connection message for "<source>"
    And I should see source provider details displayed
    
    # Browse and select test assets
    When I browse test assets from "<source>"
    And I select test assets to migrate
    Then I should see the selected assets preview
    
    # Destination configuration
    When I select "<target>" as the target provider
    And I enter valid connection details for "<target>"
    And I test the "<target>" connection
    Then I should see a successful connection message for "<target>"
    And I should see target provider details displayed
    
    # Field mapping configuration
    When I configure field mappings between "<source>" and "<target>"
    Then I should see a preview of transformed test data
    And I should be able to modify field transformations
    
    # Migration execution and monitoring
    When I start the migration process
    Then I should see the migration dashboard with real-time status
    And I should see LCARS-style indicators showing active operations
    And I should see a progress bar indicating overall completion
    
    # Verification and validation
    When the migration completes successfully
    Then I should see a migration summary with success metrics
    And I should have options to view migrated assets in "<target>"
    And I should be able to download a migration report

    Examples:
      | source   | target           |
      | zephyr   | qtest            |
      | qtest    | zephyr           |
      | zephyr   | testrail         |
      | testrail | qtest            |
      | hp-alm   | qtest            |
      | qtest    | hp-alm           |
      | jama     | qtest            |
      | zephyr   | azure-devops     |
      | visure   | zephyr           |
      | rally    | qtest            |
      
  @ui @workflow @error-handling
  Scenario Outline: Handle connection errors during provider workflows
    # Source configuration with error
    When I select "<source>" as the source provider
    And I enter invalid connection details for "<source>"
    And I test the "<source>" connection
    Then I should see a connection error for "<source>"
    And I should see appropriate error remediation suggestions
    
    # Fix source configuration and proceed
    When I correct the connection details for "<source>"
    And I test the "<source>" connection
    Then I should see a successful connection message for "<source>"
    
    # Target configuration with error
    When I select "<target>" as the target provider
    And I enter invalid connection details for "<target>"
    And I test the "<target>" connection
    Then I should see a connection error for "<target>"
    And I should see appropriate error remediation suggestions
    
    # Fix target configuration and proceed
    When I correct the connection details for "<target>"
    And I test the "<target>" connection
    Then I should see a successful connection message for "<target>"
    
    # Continue with normal workflow
    When I browse and select test assets
    And I configure field mappings
    And I start the migration process
    Then I should see the migration dashboard with real-time status

    Examples:
      | source   | target   |
      | zephyr   | qtest    |
      | qtest    | zephyr   |
      | testrail | hp-alm   |
    
  @ui @workflow @operational-controls
  Scenario: Control ongoing migration with pause, resume and cancel
    Given I have configured a migration from "zephyr" to "qtest"
    And I have started the migration process
    
    # Test pause functionality
    When I click the "Pause Migration" button
    Then the migration should pause
    And I should see a "Migration Paused" status indicator
    And active operations should complete their current task
    
    # Test resume functionality  
    When I click the "Resume Migration" button
    Then the migration should resume
    And I should see the status change to "Migration In Progress"
    And operations should continue from where they left off
    
    # Test cancellation
    When I click the "Cancel Migration" button
    Then I should see a confirmation dialog
    When I confirm the cancellation
    Then the migration should stop
    And I should see a "Migration Cancelled" status
    And I should see a summary of completed and cancelled operations

  @ui @workflow @data-transformations
  Scenario: Configure and preview custom field transformations
    Given I have selected "zephyr" as the source provider
    And I have selected "qtest" as the target provider
    And I have browsed and selected test assets
    
    # Basic field mapping
    When I navigate to the field mapping section
    Then I should see source fields matched with target fields
    
    # Concatenation transformation
    When I select the "Description" field
    And I choose to add a concatenation transformation
    And I set the concatenation value to include "[Migrated from Zephyr]"
    Then I should see a preview of the transformed description field
    
    # Text slicing transformation
    When I select the "Title" field
    And I choose to add a text slicing transformation
    And I set the slice parameters to remove the first 4 characters
    Then I should see a preview of the transformed title field
    
    # Custom prefix/suffix
    When I select the "ID" field
    And I choose to add a prefix transformation
    And I set the prefix to "ZEP-"
    Then I should see a preview of the transformed ID field
    
    # Save transformations
    When I save the field mapping configuration
    Then my custom transformations should be preserved
    And I should be able to proceed to the execution step

  @ui @workflow @attachment-handling
  Scenario: Verify attachment migration between providers
    Given I have selected "zephyr" as the source provider
    And I have selected "qtest" as the target provider
    And I have browsed and selected test assets with attachments
    
    # Attachment preview
    When I view the attachment details
    Then I should see a list of attachments with file information
    And I should be able to preview image attachments directly in the UI
    
    # Configure attachment handling
    When I configure attachment migration options
    And I select to migrate all attachments
    And I start the migration process
    Then I should see the migration dashboard with attachment progress indicators
    
    # Verify attachment migration
    When the migration completes successfully
    Then the migration summary should show successful attachment transfers
    And I should be able to verify attachments in the target system
    
  @ui @workflow @internationalization
  Scenario Outline: Verify workflow with internationalized content
    Given I have set my language preference to "<language>"
    When I complete a full migration workflow from "<source>" to "<target>"
    Then all UI elements should display correctly in "<language>"
    And all error messages should be properly translated
    And date formats should follow "<language>" conventions
    
    Examples:
      | language | source | target  |
      | en-US    | zephyr | qtest   |
      | ja-JP    | qtest  | zephyr  |
      | de-DE    | hp-alm | testrail|
      | fr-FR    | jama   | qtest   |
      | es-ES    | zephyr | hp-alm  |