# API Token Generation Guide

This guide provides detailed instructions for generating API tokens for both Zephyr Scale and qTest Manager, which are required for the migration process.

## Zephyr Scale API Token Generation

### Prerequisites

- Jira Cloud administrator access or appropriate permissions
- Zephyr Scale app installed in your Jira Cloud instance

### Steps to Generate a Zephyr Scale API Token

1. **Log in to Jira Cloud**
   - Navigate to your Jira Cloud instance (e.g., `https://yourcompany.atlassian.net`)
   - Log in with an account that has appropriate permissions

2. **Access Zephyr Scale Administration**
   - Click on the "Apps" dropdown in the top navigation bar
   - Select "Zephyr Scale" from the dropdown menu
   - In Zephyr Scale, click on the "Administration" option in the sidebar

3. **Navigate to API Keys**
   - In the Administration section, click on "API Keys" in the left sidebar
   - This will display the API Keys management page

4. **Create a New API Key**
   - Click the "Create API Key" button
   - Enter a descriptive name for the API key (e.g., "Skidbladnir Migration")
   - Optionally, set an expiration date if required by your security policies
   - Click "Create" to generate the API key

5. **Copy and Secure the API Key**
   - The API key will be displayed only once
   - Copy the key to a secure location or directly into the Skidbladnir application
   - **Important**: The API key cannot be viewed again after you leave this page

6. **Verify Permissions**
   - Ensure the account associated with the API key has appropriate permissions:
     - View projects
     - Browse tests
     - View test cases
     - View test executions
     - View attachments

### API Key Format and Validation

Zephyr Scale API keys typically follow this format:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

To validate your API key:
1. In Skidbladnir, navigate to the "Configuration" tab
2. Enter your Jira URL and the API key
3. Click "Test Connection"
4. The application will verify if the API key is valid and has appropriate permissions

## qTest Manager API Token Generation

### Prerequisites

- qTest Manager account with administrator privileges or appropriate permissions
- Access to the target project in qTest Manager

### Steps to Generate a qTest API Token

1. **Log in to qTest Manager**
   - Navigate to your qTest Manager instance (e.g., `https://yourcompany.qtestnet.com`)
   - Log in with your credentials

2. **Access Your Profile**
   - Click on your profile icon in the top-right corner
   - Select "API Settings" from the dropdown menu

3. **Generate a New Token**
   - In the API Settings page, click on the "Add" button
   - Enter a descriptive name for the token (e.g., "Skidbladnir Migration")
   - Select an expiration period based on your security requirements
   - Choose the appropriate permissions:
     - Read/Write Projects
     - Read/Write Test Cases
     - Read/Write Test Cycles
     - Read/Write Attachments
     - Read/Write Requirements (if migrating linked requirements)
     - Read/Write Defects (if migrating linked defects)
   - Click "Create" to generate the token

4. **Copy and Secure the API Token**
   - The API token will be displayed
   - Copy the token to a secure location or directly into the Skidbladnir application
   - **Note**: Unlike Zephyr, you can view your qTest tokens again later if needed

5. **Verify Project Access**
   - Ensure the account associated with the token has access to the target project
   - Verify the account has appropriate project permissions for test case creation

### API Token Format and Validation

qTest API tokens typically follow this format:
```
b1d63a8f-62c4-41c6-af90-98fdf86e7f49
```

To validate your API token:
1. In Skidbladnir, navigate to the "Configuration" tab
2. Enter your qTest URL, project ID, and the API token
3. Click "Test Connection"
4. The application will verify if the token is valid and has appropriate permissions

## Security Considerations

### API Token Best Practices

1. **Use dedicated tokens**: Create specific tokens for migration rather than using general-purpose tokens
2. **Set appropriate expiration**: Choose an expiration date that gives you enough time to complete the migration but not unnecessarily long
3. **Limit permissions**: Only grant the permissions required for migration
4. **Revoke after use**: Revoke tokens after migration is complete
5. **Use secure storage**: Store tokens securely during the migration process
6. **Avoid sharing tokens**: Don't share tokens across teams or individuals
7. **Monitor usage**: Check token activity logs during migration

### Token Storage in Skidbladnir

Skidbladnir secures your API tokens using the following methods:

- **Encryption**: Tokens are encrypted at rest using industry-standard encryption
- **Memory-only option**: Tokens can be used without being stored on disk
- **Credential Manager integration**: On supported systems, tokens can be stored in the system credential manager
- **Automatic clearing**: Tokens can be automatically cleared after migration completes

## Troubleshooting

### Common Zephyr Scale Token Issues

| Issue | Possible Cause | Solution |
|-------|---------------|----------|
| "Invalid API Key" | Incorrect key entered | Verify and re-enter the API key |
| "Unauthorized" | Insufficient permissions | Check account permissions in Jira |
| "Rate Limit Exceeded" | Too many API calls | Reduce concurrency or wait and try again |
| "Project Not Found" | Incorrect project key | Verify project key is correct |
| "Token Expired" | API key has expired | Generate a new API key |

### Common qTest Token Issues

| Issue | Possible Cause | Solution |
|-------|---------------|----------|
| "Invalid Authentication Token" | Incorrect token entered | Verify and re-enter the token |
| "Access Denied" | Insufficient permissions | Check account permissions in qTest |
| "Project Access Denied" | No access to project | Grant project access to the account |
| "Unauthorized Action" | Missing specific permission | Check and update permissions |
| "Token Expired" | API token has expired | Generate a new token |

## Additional Resources

- [Zephyr Scale API Documentation](https://support.smartbear.com/zephyr-scale-cloud/api-docs/)
- [qTest API Documentation](https://api.qasymphony.com/)
- [Skidbladnir Security Guide](security-guide.md)
- [Troubleshooting Connection Issues](troubleshooting-connections.md)