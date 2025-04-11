/**
 * Utility functions for error propagation testing
 */

/**
 * Polls migration status until an error occurs or timeout is reached
 * 
 * @param {string} migrationId - The ID of the migration to poll
 * @param {number} timeoutSeconds - Maximum time to wait in seconds
 * @returns {object} The final migration status with error
 */
function pollMigrationStatusUntilError(migrationId, timeoutSeconds) {
  const startTime = new Date().getTime();
  const timeoutMs = timeoutSeconds * 1000;
  let status;
  
  while (true) {
    // Get current time
    const currentTime = new Date().getTime();
    if (currentTime - startTime > timeoutMs) {
      karate.log('Error polling timed out after', timeoutSeconds, 'seconds');
      break;
    }
    
    // Call status endpoint
    const result = karate.call('classpath:org/skidbladnir/utils/get-migration-status.feature', { migrationId: migrationId });
    status = result.status;
    
    karate.log('Migration status:', status.status, status.error ? 'Error: ' + status.error.message : '');
    
    // Check if migration has failed
    if (status.status === 'FAILED' || status.error) {
      break;
    }
    
    // Wait before polling again
    java.lang.Thread.sleep(2000); // 2 seconds
  }
  
  return status;
}

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
    if (status.status === 'COMPLETED' || status.status === 'FAILED') {
      break;
    }
    
    // Wait before polling again
    java.lang.Thread.sleep(2000); // 2 seconds
  }
  
  return status;
}

/**
 * Polls migration status until partial completion (with errors) or timeout
 * 
 * @param {string} migrationId - The ID of the migration to poll
 * @param {number} timeoutSeconds - Maximum time to wait in seconds
 * @returns {object} The final migration status
 */
function pollMigrationStatusUntilPartialComplete(migrationId, timeoutSeconds) {
  const startTime = new Date().getTime();
  const timeoutMs = timeoutSeconds * 1000;
  let status;
  
  while (true) {
    // Get current time
    const currentTime = new Date().getTime();
    if (currentTime - startTime > timeoutMs) {
      karate.log('Partial completion polling timed out after', timeoutSeconds, 'seconds');
      break;
    }
    
    // Call status endpoint
    const result = karate.call('classpath:org/skidbladnir/utils/get-migration-status.feature', { migrationId: migrationId });
    status = result.status;
    
    karate.log('Migration status:', status.status, 'Errors:', status.errorCount || 0);
    
    // Check if migration is completed with errors or fully completed
    if (status.status === 'COMPLETED_WITH_ERRORS' || status.status === 'COMPLETED' || status.status === 'FAILED') {
      break;
    }
    
    // Wait before polling again
    java.lang.Thread.sleep(2000); // 2 seconds
  }
  
  return status;
}

/**
 * Waits a fixed amount of time and then returns the migration status
 * 
 * @param {string} migrationId - The ID of the migration to check
 * @param {number} waitSeconds - Time to wait in seconds
 * @returns {object} The migration status
 */
function waitForMigrationStatus(migrationId, waitSeconds) {
  // Wait for the specified time
  java.lang.Thread.sleep(waitSeconds * 1000);
  
  // Get and return current status
  const result = karate.call('classpath:org/skidbladnir/utils/get-migration-status.feature', { migrationId: migrationId });
  
  return result.status;
}

/**
 * Categorizes errors from a migration
 * 
 * @param {string} migrationId - The migration ID
 * @returns {object} Categorized error information
 */
function categorizeErrors(migrationId) {
  const result = karate.call('classpath:org/skidbladnir/utils/get-migration-errors.feature', { migrationId: migrationId });
  const errors = result.errors || [];
  
  // Count by category
  const categoryCounts = {};
  errors.forEach(error => {
    if (!categoryCounts[error.category]) {
      categoryCounts[error.category] = 0;
    }
    categoryCounts[error.category]++;
  });
  
  // Count by origin
  const originCounts = {};
  errors.forEach(error => {
    if (!originCounts[error.origin]) {
      originCounts[error.origin] = 0;
    }
    originCounts[error.origin]++;
  });
  
  return {
    totalErrors: errors.length,
    byCategory: categoryCounts,
    byOrigin: originCounts,
    errors: errors
  };
}

// Export the functions
module.exports = {
  pollMigrationStatusUntilError: pollMigrationStatusUntilError,
  pollMigrationStatusUntilComplete: pollMigrationStatusUntilComplete,
  pollMigrationStatusUntilPartialComplete: pollMigrationStatusUntilPartialComplete,
  waitForMigrationStatus: waitForMigrationStatus,
  categorizeErrors: categorizeErrors
};