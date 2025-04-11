/**
 * Utility functions for migration testing
 */

/**
 * Polls migration status until completion or timeout is reached
 * 
 * @param {string} migrationId - The ID of the migration to poll
 * @param {number} timeoutSeconds - Maximum time to wait in seconds
 * @returns {object} The final migration status
 */
function pollMigrationStatusUntilComplete(migrationId, timeoutSeconds) {
  const startTime = new Date().getTime();
  const timeoutMs = timeoutSeconds * 1000;
  let status;
  
  while (true) {
    // Get current time
    const currentTime = new Date().getTime();
    if (currentTime - startTime > timeoutMs) {
      karate.log('Completion polling timed out after', timeoutSeconds, 'seconds');
      break;
    }
    
    // Call status endpoint
    const result = karate.call('classpath:org/skidbladnir/utils/get-migration-status.feature', { migrationId: migrationId });
    status = result.status;
    
    karate.log('Migration status:', status.status, 'Progress:', status.progress ? status.progress + '%' : 'unknown');
    
    // Check if migration is completed or failed
    if (status.status === 'COMPLETED' || status.status === 'COMPLETED_WITH_ERRORS' || status.status === 'FAILED') {
      break;
    }
    
    // Wait before polling again
    java.lang.Thread.sleep(2000); // 2 seconds
  }
  
  return status;
}

/**
 * Creates a migration with the specified parameters
 * 
 * @param {object} params - Migration parameters
 * @returns {object} The created migration
 */
function createMigration(params) {
  const result = karate.call('classpath:org/skidbladnir/utils/create-migration.feature', params);
  return result.migration;
}

/**
 * Starts a migration and waits for it to complete
 * 
 * @param {string} migrationId - The ID of the migration to start
 * @param {number} timeoutSeconds - Maximum time to wait in seconds
 * @returns {object} The final migration status
 */
function startAndWaitForMigration(migrationId, timeoutSeconds) {
  // Start migration
  const startResult = karate.call('classpath:org/skidbladnir/utils/start-migration.feature', { migrationId: migrationId });
  
  // Wait for completion
  return pollMigrationStatusUntilComplete(migrationId, timeoutSeconds);
}

/**
 * Gets detailed results for a completed migration
 * 
 * @param {string} migrationId - The ID of the migration
 * @returns {object} Migration results
 */
function getMigrationResults(migrationId) {
  const result = karate.call('classpath:org/skidbladnir/utils/get-migration-results.feature', { migrationId: migrationId });
  return result.results;
}

/**
 * Gets attachment statistics for a migration
 * 
 * @param {string} migrationId - The ID of the migration
 * @returns {object} Attachment statistics
 */
function getAttachmentStats(migrationId) {
  const result = karate.call('classpath:org/skidbladnir/utils/get-attachment-stats.feature', { migrationId: migrationId });
  return result.stats;
}

/**
 * Cleanup a migration and its resources
 * 
 * @param {string} migrationId - The ID of the migration to clean up
 */
function cleanupMigration(migrationId) {
  karate.call('classpath:org/skidbladnir/utils/cleanup-migration.feature', { migrationId: migrationId });
}

// Export the functions
module.exports = {
  pollMigrationStatusUntilComplete: pollMigrationStatusUntilComplete,
  createMigration: createMigration,
  startAndWaitForMigration: startAndWaitForMigration,
  getMigrationResults: getMigrationResults,
  getAttachmentStats: getAttachmentStats,
  cleanupMigration: cleanupMigration
};