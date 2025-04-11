/**
 * Helper functions for migration testing
 */

/**
 * Polls migration status until completion or timeout
 * 
 * @param {string} migrationId - The ID of the migration to poll
 * @param {number} timeoutSeconds - Maximum time to wait in seconds
 * @returns {object} The final migration status
 */
function pollMigrationStatus(migrationId, timeoutSeconds) {
  const startTime = new Date().getTime();
  const timeoutMs = timeoutSeconds * 1000;
  let status;
  
  while (true) {
    // Get current time
    const currentTime = new Date().getTime();
    if (currentTime - startTime > timeoutMs) {
      karate.log('Migration polling timed out after', timeoutSeconds, 'seconds');
      break;
    }
    
    // Call status endpoint
    const result = karate.call('classpath:org/skidbladnir/utils/get-migration-status.feature', { migrationId: migrationId });
    status = result.status;
    
    karate.log('Migration status:', status.status);
    
    // Check if migration is completed or failed
    if (status.status === 'COMPLETED' || status.status === 'FAILED' || status.status === 'CANCELLED') {
      break;
    }
    
    // Wait before polling again
    java.lang.Thread.sleep(2000); // 2 seconds
  }
  
  return status;
}

/**
 * Cleans up TestRail test cases and project
 * 
 * @param {number} projectId - The TestRail project ID to clean up
 * @param {Array} testCaseMappings - The test case mappings with targetId property
 */
function cleanupTestRail(projectId, testCaseMappings) {
  karate.log('Cleaning up TestRail artifacts');
  
  // Delete each test case
  for (let i = 0; i < testCaseMappings.length; i++) {
    try {
      const caseId = testCaseMappings[i].targetId;
      karate.call('classpath:org/skidbladnir/utils/delete-testrail-testcase.feature', { caseId: caseId });
      karate.log('Deleted TestRail test case:', caseId);
    } catch (e) {
      karate.log('Warning: Failed to delete TestRail test case:', e);
    }
  }
  
  // Delete the project
  try {
    karate.call('classpath:org/skidbladnir/utils/delete-testrail-project.feature', { projectId: projectId });
    karate.log('Deleted TestRail project:', projectId);
  } catch (e) {
    karate.log('Warning: Failed to delete TestRail project:', e);
  }
}

/**
 * Cleans up Visure test cases and project
 * 
 * @param {string} projectId - The Visure project ID to clean up
 * @param {Array} testCaseIds - The Visure test case IDs to delete
 */
function cleanupVisure(projectId, testCaseIds) {
  karate.log('Cleaning up Visure artifacts');
  
  // Delete each test case
  for (let i = 0; i < testCaseIds.length; i++) {
    try {
      const caseId = testCaseIds[i];
      karate.call('classpath:org/skidbladnir/utils/delete-visure-testcase.feature', { projectId: projectId, testCaseId: caseId });
      karate.log('Deleted Visure test case:', caseId);
    } catch (e) {
      karate.log('Warning: Failed to delete Visure test case:', e);
    }
  }
  
  // Delete the project
  try {
    karate.call('classpath:org/skidbladnir/utils/delete-visure-project.feature', { projectId: projectId });
    karate.log('Deleted Visure project:', projectId);
  } catch (e) {
    karate.log('Warning: Failed to delete Visure project:', e);
  }
}

// Export the functions
module.exports = {
  pollMigrationStatus: pollMigrationStatus,
  cleanupTestRail: cleanupTestRail,
  cleanupVisure: cleanupVisure
};