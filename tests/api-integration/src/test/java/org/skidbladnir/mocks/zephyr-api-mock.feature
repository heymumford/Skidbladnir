Feature: Zephyr API Mock Server

  Background:
    # Initialize storage for mock data
    * def testCases = {}
    * def testCycles = {}
    * def testExecutions = {}
    * def attachments = {}
    * def users = {}
    * def projects = {}
    
    # Data generation helpers
    * def nextId = { testCase: 1, testCycle: 1, testExecution: 1, attachment: 1 }
    * def generateId = function(type) { return type.toUpperCase() + '-' + nextId[type]++; }
    
    # Default data
    * def defaultTestCase =
    """
    {
      "id": "TC-1234",
      "key": "TC-1234",
      "name": "Verify login functionality",
      "description": "Tests that user can successfully log in to the application",
      "priority": "High",
      "status": "Ready",
      "version": "1.0",
      "projectId": "PROJ-1",
      "createdBy": "user1",
      "createdAt": "2025-01-01T12:00:00Z",
      "updatedAt": "2025-01-02T12:00:00Z",
      "steps": [
        {
          "id": "STEP-1",
          "order": 1,
          "description": "Navigate to login page",
          "expectedResult": "Login page is displayed"
        },
        {
          "id": "STEP-2",
          "order": 2,
          "description": "Enter valid credentials",
          "expectedResult": "User is logged in successfully"
        }
      ],
      "labels": ["login", "authentication", "smoke"],
      "components": ["UI", "Authentication"],
      "attachments": []
    }
    """
    
    # Initialize with default data
    * eval testCases['TC-1234'] = defaultTestCase
    
    # Default project
    * def defaultProject =
    """
    {
      "id": "PROJ-1",
      "key": "SKIDBLADNIR",
      "name": "Skidbladnir Test Project",
      "description": "Project for testing Skidbladnir integration"
    }
    """
    
    * eval projects['PROJ-1'] = defaultProject
    
    # Default user
    * def defaultUser =
    """
    {
      "id": "user1",
      "username": "testuser",
      "email": "testuser@example.com",
      "displayName": "Test User"
    }
    """
    
    * eval users['user1'] = defaultUser

  # Status endpoint
  Scenario: pathMatches('/api/status') && methodIs('get')
    * def response = { status: 'UP', version: '5.2.3', name: 'Zephyr Mock API' }
    * def responseStatus = 200
    * def responseHeaders = { 'Content-Type': 'application/json' }

  # ===================== TEST CASES API =====================

  # Get all test cases
  Scenario: pathMatches('/api/test-cases') && methodIs('get')
    * def queryParams = request.params || {}
    * def page = queryParams.page || 1
    * def pageSize = queryParams.pageSize || 20
    * def allTestCases = Object.values(testCases)
    
    # Apply filters if provided
    * def filteredTestCases = allTestCases
    * if (queryParams.projectId) filteredTestCases = allTestCases.filter(function(tc) { return tc.projectId === queryParams.projectId })
    * if (queryParams.status) filteredTestCases = filteredTestCases.filter(function(tc) { return tc.status === queryParams.status })
    * if (queryParams.priority) filteredTestCases = filteredTestCases.filter(function(tc) { return tc.priority === queryParams.priority })
    
    # Apply pagination
    * def startIndex = (page - 1) * pageSize
    * def endIndex = Math.min(startIndex + pageSize, filteredTestCases.length)
    * def paginatedTests = filteredTestCases.slice(startIndex, endIndex)
    
    * def response = {
        testCases: paginatedTests,
        pagination: {
          total: filteredTestCases.length,
          page: page * 1, // Convert to number
          pageSize: pageSize * 1 // Convert to number
        }
      }
    * def responseStatus = 200
    * def responseHeaders = { 'Content-Type': 'application/json' }

  # Get a specific test case
  Scenario: pathMatches('/api/test-cases/(.+)') && methodIs('get')
    * def id = pathParams[0]
    * def testCase = testCases[id]
    
    * if (testCase) {
        response = testCase;
        responseStatus = 200;
      } else {
        response = { error: 'Test case not found', code: 'NOT_FOUND' };
        responseStatus = 404;
      }
    * def responseHeaders = { 'Content-Type': 'application/json' }

  # Create a test case
  Scenario: pathMatches('/api/test-cases') && methodIs('post')
    * def testCase = request
    
    # Generate ID if not provided
    * if (!testCase.id) testCase.id = generateId('testCase')
    
    # Set default values
    * testCase.createdAt = testCase.createdAt || new Date().toISOString()
    * testCase.updatedAt = testCase.updatedAt || testCase.createdAt
    * testCase.steps = testCase.steps || []
    * testCase.labels = testCase.labels || []
    * testCase.components = testCase.components || []
    * testCase.attachments = testCase.attachments || []
    
    # Store the test case
    * eval testCases[testCase.id] = testCase
    
    * def response = testCase
    * def responseStatus = 201
    * def responseHeaders = { 'Content-Type': 'application/json', 'Location': '/api/test-cases/' + testCase.id }

  # Update a test case
  Scenario: pathMatches('/api/test-cases/(.+)') && methodIs('put')
    * def id = pathParams[0]
    * def existingTestCase = testCases[id]
    * def updatedTestCase = request
    
    * if (existingTestCase) {
        updatedTestCase.id = id; // Ensure ID doesn't change
        updatedTestCase.createdAt = existingTestCase.createdAt; // Preserve creation time
        updatedTestCase.updatedAt = new Date().toISOString(); // Update modification time
        testCases[id] = updatedTestCase;
        response = updatedTestCase;
        responseStatus = 200;
      } else {
        response = { error: 'Test case not found', code: 'NOT_FOUND' };
        responseStatus = 404;
      }
    * def responseHeaders = { 'Content-Type': 'application/json' }

  # Delete a test case
  Scenario: pathMatches('/api/test-cases/(.+)') && methodIs('delete')
    * def id = pathParams[0]
    * def exists = testCases[id] != null
    
    * if (exists) {
        delete testCases[id];
        response = { message: 'Test case deleted successfully' };
        responseStatus = 200;
      } else {
        response = { error: 'Test case not found', code: 'NOT_FOUND' };
        responseStatus = 404;
      }
    * def responseHeaders = { 'Content-Type': 'application/json' }

  # ===================== ATTACHMENTS API =====================

  # Get attachments for a test case
  Scenario: pathMatches('/api/test-cases/(.+)/attachments') && methodIs('get')
    * def testCaseId = pathParams[0]
    * def testCase = testCases[testCaseId]
    
    * if (testCase) {
        response = testCase.attachments || [];
        responseStatus = 200;
      } else {
        response = { error: 'Test case not found', code: 'NOT_FOUND' };
        responseStatus = 404;
      }
    * def responseHeaders = { 'Content-Type': 'application/json' }

  # Add attachment to a test case
  Scenario: pathMatches('/api/test-cases/(.+)/attachments') && methodIs('post')
    * def testCaseId = pathParams[0]
    * def testCase = testCases[testCaseId]
    * def attachmentData = request
    
    * if (testCase) {
        if (!attachmentData.id) attachmentData.id = generateId('attachment');
        if (!attachmentData.uploadedAt) attachmentData.uploadedAt = new Date().toISOString();
        if (!testCase.attachments) testCase.attachments = [];
        testCase.attachments.push(attachmentData);
        attachments[attachmentData.id] = attachmentData;
        response = attachmentData;
        responseStatus = 201;
      } else {
        response = { error: 'Test case not found', code: 'NOT_FOUND' };
        responseStatus = 404;
      }
    * def responseHeaders = { 'Content-Type': 'application/json' }

  # Get attachment content
  Scenario: pathMatches('/api/attachments/(.+)/content') && methodIs('get')
    * def attachmentId = pathParams[0]
    * def attachment = attachments[attachmentId]
    
    * if (attachment) {
        response = attachment.content || 'Mock attachment content';
        responseStatus = 200;
        responseHeaders = { 'Content-Type': attachment.contentType || 'application/octet-stream' };
      } else {
        response = { error: 'Attachment not found', code: 'NOT_FOUND' };
        responseStatus = 404;
        responseHeaders = { 'Content-Type': 'application/json' };
      }

  # ===================== PROJECT API =====================

  # Get all projects
  Scenario: pathMatches('/api/projects') && methodIs('get')
    * def allProjects = Object.values(projects)
    * def response = { projects: allProjects, total: allProjects.length }
    * def responseStatus = 200
    * def responseHeaders = { 'Content-Type': 'application/json' }

  # Get a specific project
  Scenario: pathMatches('/api/projects/(.+)') && methodIs('get')
    * def id = pathParams[0]
    * def project = projects[id]
    
    * if (project) {
        response = project;
        responseStatus = 200;
      } else {
        response = { error: 'Project not found', code: 'NOT_FOUND' };
        responseStatus = 404;
      }
    * def responseHeaders = { 'Content-Type': 'application/json' }

  # ===================== ERROR HANDLING =====================

  # Handle 404 for undefined paths
  Scenario:
    * def responseStatus = 404
    * def response = { error: 'Resource not found', code: 'NOT_FOUND', path: request.path }
    * def responseHeaders = { 'Content-Type': 'application/json' }