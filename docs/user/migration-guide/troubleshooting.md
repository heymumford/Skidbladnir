# Troubleshooting Guide

This guide provides solutions for common issues that may arise during the migration process from Zephyr Scale to qTest.

## Connection Issues

### Zephyr Scale Connection Failures

| Issue | Symptoms | Solution |
|-------|----------|----------|
| **Invalid API Token** | "Authentication failed" or "Invalid API token" error | Verify your API token and regenerate if necessary following the [API Token Guide](api-token-guide.md) |
| **Network Connectivity** | "Connection timed out" or "Could not connect to server" | Check your network connectivity and ensure your firewall allows outbound connections to the Zephyr API endpoints |
| **Proxy Configuration** | Connection failures in corporate environments | Configure the proxy settings in the application's network configuration |
| **API Rate Limiting** | "Rate limit exceeded" or "Too many requests" | Reduce the concurrency settings or implement a delay between requests |
| **Invalid Jira URL** | "Invalid URL" or "Could not find instance" | Verify the Jira Cloud URL format (typically `https://yourcompany.atlassian.net`) |
| **Permission Issues** | "Unauthorized" or "Insufficient permissions" | Ensure the API token has appropriate permissions to access test cases |

### qTest Connection Failures

| Issue | Symptoms | Solution |
|-------|----------|----------|
| **Invalid API Token** | "401 Unauthorized" or "Invalid authentication" | Verify your qTest API token and regenerate if necessary |
| **Incorrect qTest URL** | "Cannot find server" or "Invalid URL" | Check the qTest URL format (typically `https://yourcompany.qtestnet.com`) |
| **Project Access** | "Access denied to project" or "Project not found" | Ensure the account has access to the target qTest project |
| **Environment Restrictions** | Connection failures from specific networks | Check if your qTest instance has IP restrictions and request exceptions if needed |
| **Token Expiration** | Previously working tokens suddenly fail | Check token expiration date and regenerate if expired |
| **API Version Mismatch** | "Unsupported API version" | Verify the qTest version is compatible with the migration tool |

## Migration Process Issues

### Pre-Migration Validation Failures

| Issue | Symptoms | Solution |
|-------|----------|----------|
| **Field Mapping Errors** | "Invalid field mapping" or field validation errors | Review the field mapping configuration and correct any inconsistencies |
| **Test Case Limits** | "Too many test cases selected" | Break down the migration into smaller batches |
| **Missing Required Fields** | "Required field not mapped" | Ensure all required qTest fields have a mapping |
| **Incompatible Field Types** | "Field type mismatch" | Review field type compatibility and apply appropriate transformations |
| **Folder Structure Issues** | "Invalid folder structure" | Simplify complex folder hierarchies or adjust the structure mapping |
| **Custom Field Configuration** | "Custom field not found in target" | Create matching custom fields in qTest before migration |

### During Migration Issues

| Issue | Symptoms | Solution |
|-------|----------|----------|
| **Migration Stalls** | Progress stops at a certain percentage | Check the logs for specific errors, verify network stability, and resume the migration |
| **Memory Errors** | "Out of memory" or application crashes | Reduce batch size or increase allocated memory |
| **Database Errors** | "Database operation failed" | Check available disk space and database permissions |
| **Slow Performance** | Migration progresses very slowly | Adjust concurrency settings, optimize network connectivity, or reduce batch sizes |
| **API Quota Issues** | "API quota exceeded" | Reduce concurrency or implement delays between requests |
| **Unexpected Errors** | Random failures or unexpected behaviors | Check the logs for detailed error messages and contact support if needed |

### Post-Migration Issues

| Issue | Symptoms | Solution |
|-------|----------|----------|
| **Missing Test Cases** | Fewer test cases migrated than expected | Check the migration logs for skipped items and migration criteria |
| **Attachment Missing** | Attachments not appearing in qTest | Check attachment size limits and verify permissions |
| **Malformed Content** | Test case content appears incorrectly formatted | Adjust HTML/rich text transformations and retry migration |
| **Broken Relationships** | Test case relationships not preserved | Verify relationship mapping and ensure all related test cases were migrated |
| **Missing Custom Field Values** | Custom fields empty or incorrect | Check field mapping and transformations for custom fields |
| **Duplicate Test Cases** | Same test case appears multiple times | Check for multiple migration attempts and clean up duplicates |

## Specific Error Messages

### Zephyr Scale Errors

| Error Message | Cause | Solution |
|---------------|-------|----------|
| `"Authentication failed. Please check your API token"` | Invalid or expired API token | Generate a new API token in Zephyr Scale |
| `"Could not find folder with ID: [id]"` | The specified folder does not exist | Verify folder IDs or use folder paths instead |
| `"Forbidden: User does not have permission"` | Insufficient permissions | Grant necessary permissions to the API token user |
| `"Rate limit exceeded"` | Too many API calls in a short time | Reduce concurrency settings or add delays |
| `"Could not find test case with key: [key]"` | Test case does not exist | Verify test case keys or check if test case has been deleted |
| `"Internal server error (500)"` | Server-side issue in Zephyr | Wait and retry; contact Zephyr support if persistent |

### qTest Errors

| Error Message | Cause | Solution |
|---------------|-------|----------|
| `"401 Unauthorized"` | Invalid API token | Check and regenerate your qTest API token |
| `"403 Forbidden - Insufficient permissions"` | Missing permissions in qTest | Ensure the user has appropriate project permissions |
| `"Project with ID [id] not found"` | Invalid project ID | Verify the project ID in qTest |
| `"Field [name] is required"` | Missing required field in mapping | Map a source field to this required qTest field |
| `"Cannot create test case with duplicate name"` | Duplicate test case name | Enable unique naming option or adjust test case names |
| `"Attachment too large"` | Attachment exceeds size limits | Split large attachments or increase qTest file size limits |

## Performance Issues

### Slow Migration Performance

| Issue | Solution |
|-------|----------|
| **Large Test Case Count** | Break migration into smaller batches of 500-1000 test cases |
| **Many Attachments** | Consider migrating attachments separately after test cases are migrated |
| **Network Latency** | Run the migration tool closer to your Zephyr/qTest servers |
| **Resource Constraints** | Increase memory allocation to the application |
| **Database Performance** | Ensure the local database has sufficient resources |
| **Concurrency Settings** | Adjust concurrency based on your network capabilities |

### Recommended Performance Settings

| Scenario | Recommended Settings |
|----------|---------------------|
| **Small Migration (<500 cases)** | Concurrency: 4, Batch Size: 50 |
| **Medium Migration (500-2000 cases)** | Concurrency: 2, Batch Size: 100 |
| **Large Migration (>2000 cases)** | Concurrency: 1, Batch Size: 200, Split into multiple migrations |
| **Slow Network** | Concurrency: 1, Batch Size: 50, Timeout: 120s |
| **Fast Network / Local Instance** | Concurrency: 8, Batch Size: 100 |

## Application Issues

### Installation Problems

| Issue | Solution |
|-------|----------|
| **Missing Dependencies** | Run the dependency check script: `./scripts/check-dependencies.sh` |
| **Permission Errors** | Ensure you have appropriate permissions to install and run the application |
| **Conflicting Software** | Check for other applications using the same ports |
| **Environment Variables** | Verify required environment variables are set correctly |
| **Platform-Specific Issues** | Refer to platform-specific installation guides |

### UI Issues

| Issue | Solution |
|-------|----------|
| **UI Not Rendering Correctly** | Clear browser cache or try a different browser |
| **Components Not Loading** | Check console for JavaScript errors |
| **Slow UI Responses** | Reduce the number of displayed items or apply filters |
| **Error Dialogs** | Check application logs for detailed error information |
| **Form Submission Failures** | Verify all required fields are completed |

## Log Analysis

The application generates detailed logs that can be helpful for troubleshooting:

### Finding Log Files

- **Linux/macOS**: `/home/[username]/.skidbladnir/logs/`
- **Windows**: `C:\Users\[username]\.skidbladnir\logs\`

### Common Log Patterns

| Log Entry | Meaning | Action |
|-----------|---------|--------|
| `ERROR [ZephyrClient] Authentication failed` | Zephyr API token issue | Check and renew your API token |
| `WARN [MigrationExecutor] Rate limit detected, backing off` | API rate limiting | Normal behavior, but reduce concurrency if occurs frequently |
| `ERROR [TestCaseTransformer] Failed to transform field` | Transformation error | Check field mapping and transformations |
| `ERROR [qTestClient] Field validation failed` | qTest field validation issue | Check field mapping and required fields |
| `INFO [MigrationJobManager] Resuming migration from checkpoint` | Migration resumed | Normal behavior for resumed migrations |
| `ERROR [AttachmentProcessor] Failed to process attachment` | Attachment handling error | Check attachment size and format |

### Enabling Debug Logs

For more detailed logging:

1. Go to "Settings" > "Advanced"
2. Change "Log Level" to "Debug"
3. Restart the application
4. Reproduce the issue
5. Check logs for detailed information

## Common Fixes

### Resetting the Application

If the application becomes unresponsive or behaves unexpectedly:

1. Close the application
2. Delete temporary files in: `[user_home]/.skidbladnir/temp/`
3. Restart the application

### Repairing Database Issues

If you encounter database errors:

1. Export your configuration settings if needed
2. Close the application
3. Delete the database file: `[user_home]/.skidbladnir/db/migration.db`
4. Restart the application and import your settings

### Clearing Token Cache

To clear stored API tokens:

1. Go to "Settings" > "Security"
2. Click "Clear Token Cache"
3. Verify with "Yes"
4. Re-enter your tokens when prompted

### Rebuilding Field Mappings

If field mapping becomes inconsistent:

1. Export your field mapping if needed
2. Go to "Field Mapping" tab
3. Click "Reset to Default"
4. Re-configure or import your mappings

## Getting Additional Help

If you continue to experience issues after trying the solutions in this guide:

1. **Export Diagnostic Information**:
   - Go to "Help" > "Export Diagnostics"
   - Save the diagnostic file

2. **Contact Support**:
   - Email: support@skidbladnir.example.com
   - Include the diagnostic file
   - Describe your issue in detail
   - Include steps to reproduce the problem

3. **Check for Updates**:
   - Go to "Help" > "Check for Updates"
   - Install any available updates

4. **Community Resources**:
   - Visit the Skidbladnir community forum: https://community.skidbladnir.example.com
   - Search for similar issues
   - Post your question if no solution is found