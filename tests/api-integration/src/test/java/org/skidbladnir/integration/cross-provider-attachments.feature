Feature: Cross-Provider Migration with Attachments
  This feature tests comprehensive migration of test cases with attachments 
  between multiple provider combinations, validating the full system workflow.

  Background:
    * url apiBaseUrl
    * def orchestratorUrl = orchestratorBaseUrl
    * def binaryUrl = binaryProcessorBaseUrl
    * def timestamp = function(){ return new Date().getTime() }
    * def randomId = function(prefix) { return prefix + '-' + timestamp() + '-' + Math.floor(Math.random() * 10000) }
    * def migrationUtils = read('classpath:org/skidbladnir/utils/migration-utils.js')
    * def testCaseUtils = read('classpath:org/skidbladnir/utils/test-case-utils.js')
    * def testConfigUtils = read('classpath:org/skidbladnir/utils/provider-config-utils.js')
    * def attachmentUtils = read('classpath:org/skidbladnir/utils/attachment-utils.js')
    
    # Get provider configurations from config
    * def zephyrConfig = testConfigUtils.getZephyrConfig()
    * def qtestConfig = testConfigUtils.getQTestConfig()
    * def microfocusConfig = testConfigUtils.getMicroFocusConfig()
    * def testRailConfig = testConfigUtils.getTestRailConfig()
    * def jamaConfig = testConfigUtils.getJamaConfig()
    
    # Create a test resource (attachment) that will be used across providers
    * def testImage = attachmentUtils.createPngImage(300, 200, "Test Screenshot")
    * def testDocument = attachmentUtils.createTextDocument("Test Document Content")
    * def testSpreadsheet = attachmentUtils.createExcelSpreadsheet([{"name": "Sheet1", "data": [["ID", "Name", "Value"], ["1", "Test", "100"]]}])
    
  @zephyr-to-qtest
  Scenario: Migrate test case with attachments from Zephyr to qTest
    # 1. Create test cases with attachments in Zephyr
    * def testCaseId = "ZTC-" + timestamp()
    * def testCase = testCaseUtils.createZephyrTestCase(testCaseId, "Zephyr to qTest Attachment Test", "A test case with multiple attachment types")
    
    # Add attachments to the test case
    * def attachments = [
      attachmentUtils.createAttachment("screenshot.png", "image/png", testImage),
      attachmentUtils.createAttachment("test-doc.txt", "text/plain", testDocument),
      attachmentUtils.createAttachment("test-data.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", testSpreadsheet)
    ]
    * testCase.attachments = attachments
    
    # Create the test case in Zephyr
    * def createResult = karate.call('classpath:org/skidbladnir/utils/create-zephyr-testcase.feature', 
        { config: zephyrConfig, testCase: testCase })
    * def zephyrTestCaseId = createResult.testCaseId
    
    # 2. Configure and start migration
    * def migrationId = randomId('z2q-attach')
    
    # Configure migration
    Given path '/migration/configure'
    And request {
      migrationId: '#(migrationId)',
      sourceProvider: 'zephyr',
      sourceConfig: '#(zephyrConfig)',
      targetProvider: 'qtest',
      targetConfig: '#(qtestConfig)',
      options: {
        includeAttachments: true,
        testCaseIds: ['#(zephyrTestCaseId)']
      }
    }
    When method POST
    Then status 200
    And match response contains { migrationId: '#(migrationId)', status: 'CONFIGURED' }
    
    # Start migration
    Given path '/migration/' + migrationId + '/start'
    When method POST
    Then status 202
    And match response contains { status: 'RUNNING' }
    
    # 3. Wait for migration to complete
    * def migrationStatus = migrationUtils.pollMigrationStatusUntilComplete(migrationId, 120)
    * match migrationStatus.status == 'COMPLETED'
    
    # 4. Get migration results
    Given path '/migration/' + migrationId + '/results'
    When method GET
    Then status 200
    And match response contains { migrationId: '#(migrationId)', sourceProvider: 'zephyr', targetProvider: 'qtest' }
    And match response.results[0].sourceId == zephyrTestCaseId
    And match response.results[0].targetId == '#string'
    And match response.results[0].attachments == '#[3]'
    
    # Store target test case ID
    * def qtestTestCaseId = response.results[0].targetId
    
    # 5. Verify the test case in qTest
    * def verifyResult = karate.call('classpath:org/skidbladnir/utils/verify-qtest-testcase.feature', 
        { config: qtestConfig, testCaseId: qtestTestCaseId })
    * def verifiedTestCase = verifyResult.testCase
    
    # 6. Verify attachments
    * match verifiedTestCase.attachments == '#[3]'
    * def verifiedAttachmentNames = karate.map(verifiedTestCase.attachments, function(x) { return x.name })
    * match verifiedAttachmentNames contains 'screenshot.png'
    * match verifiedAttachmentNames contains 'test-doc.txt'
    * match verifiedAttachmentNames contains 'test-data.xlsx'
    
    # 7. Download an attachment to verify content integrity
    * def imageAttachment = verifiedTestCase.attachments.find(function(a) { return a.name === 'screenshot.png' })
    * def downloadResult = karate.call('classpath:org/skidbladnir/utils/download-qtest-attachment.feature', 
        { config: qtestConfig, attachmentId: imageAttachment.id })
    * def downloadedContent = downloadResult.content
    
    # 8. Verify attachment content integrity
    * def contentMatch = attachmentUtils.compareBase64Content(testImage, downloadedContent)
    * match contentMatch == true
    
    # 9. Clean up test data
    * karate.call('classpath:org/skidbladnir/utils/cleanup-testcase.feature', 
        { provider: 'zephyr', config: zephyrConfig, testCaseId: zephyrTestCaseId })
    * karate.call('classpath:org/skidbladnir/utils/cleanup-testcase.feature', 
        { provider: 'qtest', config: qtestConfig, testCaseId: qtestTestCaseId })

  @microfocus-to-testrail 
  Scenario: Migrate test case with attachments from Micro Focus ALM to TestRail
    # 1. Create test cases with attachments in Micro Focus ALM
    * def testCaseId = "MFTC-" + timestamp()
    * def testCase = testCaseUtils.createMicroFocusTestCase(testCaseId, "MF ALM to TestRail Attachment Test", "A test case with attachment requiring conversion")
    
    # Add attachments that will need conversion
    * def attachments = [
      attachmentUtils.createAttachment("requirements.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 
          attachmentUtils.createWordDocument("# Requirements\n\n* Requirement 1\n* Requirement 2")),
      attachmentUtils.createAttachment("test_results.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", testSpreadsheet)
    ]
    * testCase.attachments = attachments
    
    # Create the test case in Micro Focus ALM
    * def createResult = karate.call('classpath:org/skidbladnir/utils/create-microfocus-testcase.feature', 
        { config: microfocusConfig, testCase: testCase })
    * def mfTestCaseId = createResult.testCaseId
    
    # 2. Configure and start migration
    * def migrationId = randomId('mf2tr-attach')
    
    # Configure migration
    Given path '/migration/configure'
    And request {
      migrationId: '#(migrationId)',
      sourceProvider: 'microfocus',
      sourceConfig: '#(microfocusConfig)',
      targetProvider: 'testrail',
      targetConfig: '#(testRailConfig)',
      options: {
        includeAttachments: true,
        convertDocuments: true,
        testCaseIds: ['#(mfTestCaseId)']
      }
    }
    When method POST
    Then status 200
    And match response contains { migrationId: '#(migrationId)', status: 'CONFIGURED' }
    
    # Start migration
    Given path '/migration/' + migrationId + '/start'
    When method POST
    Then status 202
    And match response contains { status: 'RUNNING' }
    
    # 3. Wait for migration to complete
    * def migrationStatus = migrationUtils.pollMigrationStatusUntilComplete(migrationId, 120)
    * match migrationStatus.status == 'COMPLETED'
    
    # 4. Get migration results
    Given path '/migration/' + migrationId + '/results'
    When method GET
    Then status 200
    And match response contains { migrationId: '#(migrationId)', sourceProvider: 'microfocus', targetProvider: 'testrail' }
    And match response.results[0].sourceId == mfTestCaseId
    And match response.results[0].targetId == '#string'
    
    # Store target test case ID
    * def testRailCaseId = response.results[0].targetId
    
    # 5. Verify the test case in TestRail
    * def verifyResult = karate.call('classpath:org/skidbladnir/utils/verify-testrail-testcase.feature', 
        { config: testRailConfig, testCaseId: testRailCaseId })
    * def verifiedTestCase = verifyResult.testCase
    
    # 6. Verify attachments (including conversion)
    * match verifiedTestCase.attachments == '#[3]'  // Including the converted PDF
    * def verifiedAttachmentNames = karate.map(verifiedTestCase.attachments, function(x) { return x.name })
    * match verifiedAttachmentNames contains 'requirements.pdf'  // Word doc converted to PDF
    * match verifiedAttachmentNames contains 'test_results.xlsx'
    
    # 7. Check conversion records
    Given path '/migration/' + migrationId + '/attachments'
    When method GET
    Then status 200
    And match response contains { total: '#number', converted: '#number' }
    And match response.conversions[*].sourceFormat contains 'DOCX'
    And match response.conversions[*].targetFormat contains 'PDF'
    
    # 8. Clean up test data
    * karate.call('classpath:org/skidbladnir/utils/cleanup-testcase.feature', 
        { provider: 'microfocus', config: microfocusConfig, testCaseId: mfTestCaseId })
    * karate.call('classpath:org/skidbladnir/utils/cleanup-testcase.feature', 
        { provider: 'testrail', config: testRailConfig, testCaseId: testRailCaseId })

  @jama-to-zephyr
  Scenario: Migrate test case with attachments from Jama Connect to Zephyr
    # 1. Create test cases with attachments in Jama
    * def testCaseId = "JAMA-" + timestamp()
    * def testCase = testCaseUtils.createJamaTestCase(testCaseId, "Jama to Zephyr Attachment Test", "A test case with large attachments")
    
    # Add large attachments
    * def largeImage = attachmentUtils.createPngImage(1200, 800, "Large Test Screenshot")
    * def largeDocument = attachmentUtils.createLargeTextDocument(50000) // 50KB text
    
    * def attachments = [
      attachmentUtils.createAttachment("large-screenshot.png", "image/png", largeImage),
      attachmentUtils.createAttachment("large-document.txt", "text/plain", largeDocument)
    ]
    * testCase.attachments = attachments
    
    # Create the test case in Jama
    * def createResult = karate.call('classpath:org/skidbladnir/utils/create-jama-testcase.feature', 
        { config: jamaConfig, testCase: testCase })
    * def jamaTestCaseId = createResult.testCaseId
    
    # 2. Configure and start migration
    * def migrationId = randomId('jama2z-attach')
    
    # Configure migration
    Given path '/migration/configure'
    And request {
      migrationId: '#(migrationId)',
      sourceProvider: 'jama',
      sourceConfig: '#(jamaConfig)',
      targetProvider: 'zephyr',
      targetConfig: '#(zephyrConfig)',
      options: {
        includeAttachments: true,
        compressLargeImages: true,
        testCaseIds: ['#(jamaTestCaseId)']
      }
    }
    When method POST
    Then status 200
    And match response contains { migrationId: '#(migrationId)', status: 'CONFIGURED' }
    
    # Start migration
    Given path '/migration/' + migrationId + '/start'
    When method POST
    Then status 202
    And match response contains { status: 'RUNNING' }
    
    # 3. Monitor binary processor events specifically
    * def monitorResult = karate.call('classpath:org/skidbladnir/utils/monitor-binary-processor.feature', 
        { migrationId: migrationId, timeoutSeconds: 60 })
    * match monitorResult.events contains 'IMAGE_COMPRESSION_STARTED'
    * match monitorResult.events contains 'IMAGE_COMPRESSION_COMPLETED'
    
    # 4. Wait for migration to complete
    * def migrationStatus = migrationUtils.pollMigrationStatusUntilComplete(migrationId, 120)
    * match migrationStatus.status == 'COMPLETED'
    
    # 5. Get migration results
    Given path '/migration/' + migrationId + '/results'
    When method GET
    Then status 200
    And match response contains { migrationId: '#(migrationId)', sourceProvider: 'jama', targetProvider: 'zephyr' }
    And match response.results[0].sourceId == jamaTestCaseId
    And match response.results[0].targetId == '#string'
    
    # Store target test case ID
    * def newZephyrTestCaseId = response.results[0].targetId
    
    # 6. Verify the test case in Zephyr
    * def verifyResult = karate.call('classpath:org/skidbladnir/utils/verify-zephyr-testcase.feature', 
        { config: zephyrConfig, testCaseId: newZephyrTestCaseId })
    * def verifiedTestCase = verifyResult.testCase
    
    # 7. Verify attachments
    * match verifiedTestCase.attachments == '#[2]'
    * def verifiedAttachmentNames = karate.map(verifiedTestCase.attachments, function(x) { return x.name })
    * match verifiedAttachmentNames contains 'large-screenshot.png'
    * match verifiedAttachmentNames contains 'large-document.txt'
    
    # 8. Download the image attachment to verify compression
    * def imageAttachment = verifiedTestCase.attachments.find(function(a) { return a.name === 'large-screenshot.png' })
    * def downloadResult = karate.call('classpath:org/skidbladnir/utils/download-zephyr-attachment.feature', 
        { config: zephyrConfig, attachmentId: imageAttachment.id })
    * def downloadedContent = downloadResult.content
    
    # 9. Verify the image was compressed (should be smaller than original)
    * def originalSize = largeImage.length
    * def compressedSize = downloadedContent.length
    * assert compressedSize < originalSize
    
    # 10. Verify compression statistics
    Given path '/migration/' + migrationId + '/attachments'
    When method GET
    Then status 200
    And match response contains { total: '#number', compressedCount: '#number' }
    And match response.compressionStats contains { originalTotalSize: '#number', compressedTotalSize: '#number', savingsPercentage: '#number' }
    And assert response.compressionStats.savingsPercentage > 0
    
    # 11. Clean up test data
    * karate.call('classpath:org/skidbladnir/utils/cleanup-testcase.feature', 
        { provider: 'jama', config: jamaConfig, testCaseId: jamaTestCaseId })
    * karate.call('classpath:org/skidbladnir/utils/cleanup-testcase.feature', 
        { provider: 'zephyr', config: zephyrConfig, testCaseId: newZephyrTestCaseId })

  @multi-provider
  Scenario: Migrate attachments through multiple providers in sequence
    # This scenario tests a more complex workflow where test assets move through multiple systems
    # Zephyr → qTest → TestRail, verifying attachments remain intact through both migrations
    
    # 1. Create initial test case in Zephyr
    * def testCaseId = "Z-MULTI-" + timestamp()
    * def testCase = testCaseUtils.createZephyrTestCase(testCaseId, "Multi-Provider Attachment Migration", "Test case that will traverse multiple systems")
    
    # Add mixed attachments
    * def attachments = [
      attachmentUtils.createAttachment("test-image.png", "image/png", testImage),
      attachmentUtils.createAttachment("requirements.pdf", "application/pdf", 
          attachmentUtils.createPdfDocument("# Test Requirements\n\nThis document contains test requirements."))
    ]
    * testCase.attachments = attachments
    
    # Create the test case in Zephyr
    * def createResult = karate.call('classpath:org/skidbladnir/utils/create-zephyr-testcase.feature', 
        { config: zephyrConfig, testCase: testCase })
    * def zephyrTestCaseId = createResult.testCaseId
    
    # 2. First migration: Zephyr → qTest
    * def migrationId1 = randomId('z2q-multi')
    
    # Configure migration
    Given path '/migration/configure'
    And request {
      migrationId: '#(migrationId1)',
      sourceProvider: 'zephyr',
      sourceConfig: '#(zephyrConfig)',
      targetProvider: 'qtest',
      targetConfig: '#(qtestConfig)',
      options: {
        includeAttachments: true,
        testCaseIds: ['#(zephyrTestCaseId)']
      }
    }
    When method POST
    Then status 200
    And match response contains { migrationId: '#(migrationId1)', status: 'CONFIGURED' }
    
    # Start first migration
    Given path '/migration/' + migrationId1 + '/start'
    When method POST
    Then status 202
    And match response contains { status: 'RUNNING' }
    
    # Wait for first migration to complete
    * def migrationStatus1 = migrationUtils.pollMigrationStatusUntilComplete(migrationId1, 120)
    * match migrationStatus1.status == 'COMPLETED'
    
    # Get first migration results
    Given path '/migration/' + migrationId1 + '/results'
    When method GET
    Then status 200
    And match response.results[0].sourceId == zephyrTestCaseId
    * def qtestTestCaseId = response.results[0].targetId
    
    # 3. Second migration: qTest → TestRail
    * def migrationId2 = randomId('q2tr-multi')
    
    # Configure second migration
    Given path '/migration/configure'
    And request {
      migrationId: '#(migrationId2)',
      sourceProvider: 'qtest',
      sourceConfig: '#(qtestConfig)',
      targetProvider: 'testrail',
      targetConfig: '#(testRailConfig)',
      options: {
        includeAttachments: true,
        testCaseIds: ['#(qtestTestCaseId)']
      }
    }
    When method POST
    Then status 200
    And match response contains { migrationId: '#(migrationId2)', status: 'CONFIGURED' }
    
    # Start second migration
    Given path '/migration/' + migrationId2 + '/start'
    When method POST
    Then status 202
    And match response contains { status: 'RUNNING' }
    
    # Wait for second migration to complete
    * def migrationStatus2 = migrationUtils.pollMigrationStatusUntilComplete(migrationId2, 120)
    * match migrationStatus2.status == 'COMPLETED'
    
    # Get second migration results
    Given path '/migration/' + migrationId2 + '/results'
    When method GET
    Then status 200
    And match response.results[0].sourceId == qtestTestCaseId
    * def testRailCaseId = response.results[0].targetId
    
    # 4. Verify final test case in TestRail
    * def verifyResult = karate.call('classpath:org/skidbladnir/utils/verify-testrail-testcase.feature', 
        { config: testRailConfig, testCaseId: testRailCaseId })
    * def verifiedTestCase = verifyResult.testCase
    
    # 5. Verify attachments survived both migrations
    * match verifiedTestCase.attachments == '#[2]'
    * def verifiedAttachmentNames = karate.map(verifiedTestCase.attachments, function(x) { return x.name })
    * match verifiedAttachmentNames contains 'test-image.png'
    * match verifiedAttachmentNames contains 'requirements.pdf'
    
    # 6. Download final attachment to verify content integrity after multiple migrations
    * def pdfAttachment = verifiedTestCase.attachments.find(function(a) { return a.name === 'requirements.pdf' })
    * def downloadResult = karate.call('classpath:org/skidbladnir/utils/download-testrail-attachment.feature', 
        { config: testRailConfig, attachmentId: pdfAttachment.id })
    * def finalContent = downloadResult.content
    
    # 7. Verify content integrity across multiple migrations
    * def originalPdfContent = attachmentUtils.createPdfDocument("# Test Requirements\n\nThis document contains test requirements.")
    * def contentIntegrityMaintained = attachmentUtils.compareBase64Content(originalPdfContent, finalContent)
    * match contentIntegrityMaintained == true
    
    # 8. Clean up test data from all systems
    * karate.call('classpath:org/skidbladnir/utils/cleanup-testcase.feature', 
        { provider: 'zephyr', config: zephyrConfig, testCaseId: zephyrTestCaseId })
    * karate.call('classpath:org/skidbladnir/utils/cleanup-testcase.feature', 
        { provider: 'qtest', config: qtestConfig, testCaseId: qtestTestCaseId })
    * karate.call('classpath:org/skidbladnir/utils/cleanup-testcase.feature', 
        { provider: 'testrail', config: testRailConfig, testCaseId: testRailCaseId })

  @batch-attachments
  Scenario: Test batch processing of attachments across providers
    # This scenario tests batch attachment processing with multiple test cases and many attachments
    
    # 1. Create multiple test cases with attachments
    * def testCaseCount = 3
    * def attachmentsPerCase = 4
    * def sourceTestCaseIds = []
    
    # Create multiple test cases
    * def createBatchTestCases = function(count) {
        var results = [];
        for (var i = 0; i < count; i++) {
          var testCaseId = "BATCH-" + timestamp() + "-" + i;
          var testCase = testCaseUtils.createZephyrTestCase(
            testCaseId, 
            "Batch Attachment Test " + i, 
            "Test case for batch attachment processing"
          );
          
          var caseAttachments = [];
          for (var j = 0; j < attachmentsPerCase; j++) {
            if (j % 4 === 0) {
              caseAttachments.push(attachmentUtils.createAttachment(
                "image-" + j + ".png", "image/png", testImage
              ));
            } else if (j % 4 === 1) {
              caseAttachments.push(attachmentUtils.createAttachment(
                "doc-" + j + ".txt", "text/plain", testDocument
              ));
            } else if (j % 4 === 2) {
              caseAttachments.push(attachmentUtils.createAttachment(
                "spreadsheet-" + j + ".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
                testSpreadsheet
              ));
            } else {
              caseAttachments.push(attachmentUtils.createAttachment(
                "pdf-" + j + ".pdf", "application/pdf", 
                attachmentUtils.createPdfDocument("PDF content for test case " + i + ", attachment " + j)
              ));
            }
          }
          
          testCase.attachments = caseAttachments;
          
          var createResult = karate.call('classpath:org/skidbladnir/utils/create-zephyr-testcase.feature', 
            { config: zephyrConfig, testCase: testCase });
          
          sourceTestCaseIds.push(createResult.testCaseId);
          results.push({
            id: createResult.testCaseId,
            name: testCase.name,
            attachmentCount: attachmentsPerCase
          });
        }
        return results;
    }
    
    * def batchTestCases = createBatchTestCases(testCaseCount)
    
    # 2. Configure batch migration with many attachments
    * def migrationId = randomId('batch-attach')
    
    # Configure migration
    Given path '/migration/configure'
    And request {
      migrationId: '#(migrationId)',
      sourceProvider: 'zephyr',
      sourceConfig: '#(zephyrConfig)',
      targetProvider: 'qtest',
      targetConfig: '#(qtestConfig)',
      options: {
        includeAttachments: true,
        batchSize: 10,
        concurrentAttachmentProcessing: 4,
        testCaseIds: sourceTestCaseIds
      }
    }
    When method POST
    Then status 200
    And match response contains { migrationId: '#(migrationId)', status: 'CONFIGURED' }
    
    # Start migration
    Given path '/migration/' + migrationId + '/start'
    When method POST
    Then status 202
    And match response contains { status: 'RUNNING' }
    
    # 3. Monitor batch processing
    Given url binaryUrl
    And path '/batch/status/' + migrationId
    When method GET
    Then status 200
    And match response contains { 
      migrationId: '#(migrationId)', 
      batchCount: '#number', 
      processedCount: '#number',
      inProgressCount: '#number'
    }
    
    # 4. Wait for migration to complete
    * def migrationStatus = migrationUtils.pollMigrationStatusUntilComplete(migrationId, 180)
    * match migrationStatus.status == 'COMPLETED'
    
    # 5. Get migration stats
    Given path '/migration/' + migrationId + '/statistics'
    When method GET
    Then status 200
    And match response contains { 
      migrationId: '#(migrationId)',
      testCasesCount: '#(testCaseCount)',
      attachmentsCount: '#(testCaseCount * attachmentsPerCase)',
      totalProcessingTimeMs: '#number'
    }
    
    # 6. Verify all attachments were processed
    * def expectedTotalAttachments = testCaseCount * attachmentsPerCase
    Given path '/migration/' + migrationId + '/attachments'
    When method GET
    Then status 200
    And match response.total == expectedTotalAttachments
    And match response.processed == expectedTotalAttachments
    
    # Get target test case IDs for cleanup
    Given path '/migration/' + migrationId + '/results'
    When method GET
    Then status 200
    * def targetTestCaseIds = karate.map(response.results, function(x){ return x.targetId })
    
    # 7. Clean up test data
    * def cleanupSourceTestCases = function(){ 
        for (var i = 0; i < sourceTestCaseIds.length; i++) {
          karate.call('classpath:org/skidbladnir/utils/cleanup-testcase.feature', 
            { provider: 'zephyr', config: zephyrConfig, testCaseId: sourceTestCaseIds[i] });
        }
      }
    * def cleanupTargetTestCases = function(){ 
        for (var i = 0; i < targetTestCaseIds.length; i++) {
          karate.call('classpath:org/skidbladnir/utils/cleanup-testcase.feature', 
            { provider: 'qtest', config: qtestConfig, testCaseId: targetTestCaseIds[i] });
        }
      }
      
    * cleanupSourceTestCases()
    * cleanupTargetTestCases()