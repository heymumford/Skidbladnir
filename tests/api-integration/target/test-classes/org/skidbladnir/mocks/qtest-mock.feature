Feature: qTest Mock API

  Background:
    # Initialize storage for mock data
    * def testCases = {}
    * def testCycles = {}
    * def testRuns = {}
    * def attachments = {}
    * def projects = {}
    * def modules = {}
    * def requirements = {}
    * def releases = {}
    
    # Data generation helpers
    * def nextId = { testCase: 5000, testRun: 1000, testCycle: 2000, project: 100, module: 300, requirement: 400, release: 500, attachment: 600 }
    * def generateId = function(type) { return 'QT-' + type.substring(0, 2).toUpperCase() + '-' + nextId[type]++; }
    
    # Default data
    * def defaultTestCase =
    """
    {
      "id": "QT-TC-5000",
      "name": "Login Authentication Test",
      "description": "Verify that users can log in with valid credentials",
      "precondition": "User account exists in the system",
      "priority": "High",
      "status": "Ready",
      "automationStatus": "Not Automated",
      "moduleId": "QT-MO-300",
      "projectId": "QT-PR-100",
      "createdBy": "admin",
      "createdAt": "2025-01-01T10:00:00Z",
      "updatedAt": "2025-01-02T14:30:00Z",
      "steps": [
        {
          "id": "QT-ST-1",
          "order": 1,
          "description": "Navigate to login page",
          "expectedResult": "Login form is displayed"
        },
        {
          "id": "QT-ST-2",
          "order": 2,
          "description": "Enter valid username and password",
          "expectedResult": "Credentials are accepted"
        },
        {
          "id": "QT-ST-3",
          "order": 3,
          "description": "Click login button",
          "expectedResult": "User is authenticated and redirected to dashboard"
        }
      ],
      "properties": [
        { "name": "Component", "value": "Authentication" },
        { "name": "Feature", "value": "User Access" }
      ],
      "tags": ["login", "security", "smoke-test"],
      "attachments": []
    }
    """
    
    # Default project
    * def defaultProject =
    """
    {
      "id": "QT-PR-100",
      "name": "Skidbladnir Testing Project",
      "description": "Project for testing Skidbladnir integration with qTest",
      "startDate": "2025-01-01T00:00:00Z",
      "endDate": "2025-12-31T23:59:59Z",
      "status": "Active"
    }
    """
    
    # Default module
    * def defaultModule =
    """
    {
      "id": "QT-MO-300",
      "name": "Authentication Module",
      "description": "Test cases for authentication functionality",
      "projectId": "QT-PR-100",
      "parentId": null,
      "path": "/Authentication Module"
    }
    """
    
    # Default test cycle
    * def defaultTestCycle =
    """
    {
      "id": "QT-CY-2000",
      "name": "Sprint 1 Regression",
      "description": "Regression test cycle for Sprint 1",
      "projectId": "QT-PR-100",
      "startDate": "2025-01-10T00:00:00Z",
      "endDate": "2025-01-20T23:59:59Z",
      "status": "Active"
    }
    """
    
    # Initialize with default data
    * eval testCases['QT-TC-5000'] = defaultTestCase
    * eval projects['QT-PR-100'] = defaultProject
    * eval modules['QT-MO-300'] = defaultModule
    * eval testCycles['QT-CY-2000'] = defaultTestCycle

  # Status endpoint
  Scenario: pathMatches('/api/qtest/status') && methodIs('get')
    * def response = { status: 'UP', name: 'qTest Mock API', version: '1.0.0' }
    * def responseStatus = 200
    * def responseHeaders = { 'Content-Type': 'application/json' }

  # ===================== TEST CASES API =====================

  # Get all test cases
  Scenario: pathMatches('/api/qtest/test-cases') && methodIs('get')
    * def queryParams = request.params || {}
    * def page = queryParams.page || 1
    * def pageSize = queryParams.pageSize || 20
    * def allTestCases = Object.values(testCases)
    
    # Apply filters if provided
    * def filteredTestCases = allTestCases
    * if (queryParams.projectId) filteredTestCases = allTestCases.filter(function(tc) { return tc.projectId === queryParams.projectId })
    * if (queryParams.moduleId) filteredTestCases = filteredTestCases.filter(function(tc) { return tc.moduleId === queryParams.moduleId })
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
          page: parseInt(page),
          pageSize: parseInt(pageSize)
        }
      }
    * def responseStatus = 200
    * def responseHeaders = { 'Content-Type': 'application/json' }

  # Get a specific test case
  Scenario: pathMatches('/api/qtest/test-cases/(.+)') && methodIs('get')
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
  Scenario: pathMatches('/api/qtest/test-cases') && methodIs('post')
    * def testCase = request
    
    # Generate ID if not provided
    * if (!testCase.id) testCase.id = generateId('testCase')
    
    # Set default values
    * testCase.createdAt = testCase.createdAt || new Date().toISOString()
    * testCase.updatedAt = testCase.updatedAt || testCase.createdAt
    * testCase.steps = testCase.steps || []
    * testCase.properties = testCase.properties || []
    * testCase.tags = testCase.tags || []
    * testCase.attachments = testCase.attachments || []
    
    # Store the test case
    * eval testCases[testCase.id] = testCase
    
    * def response = testCase
    * def responseStatus = 201
    * def responseHeaders = { 'Content-Type': 'application/json', 'Location': '/api/qtest/test-cases/' + testCase.id }

  # Update a test case
  Scenario: pathMatches('/api/qtest/test-cases/(.+)') && methodIs('put')
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
  Scenario: pathMatches('/api/qtest/test-cases/(.+)') && methodIs('delete')
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

  # ===================== TEST RUNS API =====================

  # Get test runs for a test case
  Scenario: pathMatches('/api/qtest/test-cases/(.+)/runs') && methodIs('get')
    * def testCaseId = pathParams[0]
    * def testCase = testCases[testCaseId]
    
    * if (testCase) {
        def filteredRuns = Object.values(testRuns).filter(function(run) { return run.testCaseId === testCaseId })
        response = filteredRuns;
        responseStatus = 200;
      } else {
        response = { error: 'Test case not found', code: 'NOT_FOUND' };
        responseStatus = 404;
      }
    * def responseHeaders = { 'Content-Type': 'application/json' }

  # Create a test run for a test case
  Scenario: pathMatches('/api/qtest/test-cases/(.+)/runs') && methodIs('post')
    * def testCaseId = pathParams[0]
    * def testCase = testCases[testCaseId]
    
    * if (testCase) {
        def testRun = request
        testRun.id = testRun.id || generateId('testRun')
        testRun.testCaseId = testCaseId
        testRun.createdAt = testRun.createdAt || new Date().toISOString()
        testRun.status = testRun.status || 'Not Executed'
        testRuns[testRun.id] = testRun
        response = testRun
        responseStatus = 201
      } else {
        response = { error: 'Test case not found', code: 'NOT_FOUND' };
        responseStatus = 404;
      }
    * def responseHeaders = { 'Content-Type': 'application/json' }

  # Get a specific test run
  Scenario: pathMatches('/api/qtest/runs/(.+)') && methodIs('get')
    * def id = pathParams[0]
    * def testRun = testRuns[id]
    
    * if (testRun) {
        response = testRun;
        responseStatus = 200;
      } else {
        response = { error: 'Test run not found', code: 'NOT_FOUND' };
        responseStatus = 404;
      }
    * def responseHeaders = { 'Content-Type': 'application/json' }

  # Update a test run
  Scenario: pathMatches('/api/qtest/runs/(.+)') && methodIs('put')
    * def id = pathParams[0]
    * def existingRun = testRuns[id]
    * def updatedRun = request
    
    * if (existingRun) {
        updatedRun.id = id; // Ensure ID doesn't change
        updatedRun.testCaseId = existingRun.testCaseId; // Preserve test case relationship
        updatedRun.updatedAt = new Date().toISOString(); // Update modification time
        testRuns[id] = updatedRun;
        response = updatedRun;
        responseStatus = 200;
      } else {
        response = { error: 'Test run not found', code: 'NOT_FOUND' };
        responseStatus = 404;
      }
    * def responseHeaders = { 'Content-Type': 'application/json' }

  # ===================== TEST CYCLES API =====================

  # Get all test cycles
  Scenario: pathMatches('/api/qtest/cycles') && methodIs('get')
    * def queryParams = request.params || {}
    * def allCycles = Object.values(testCycles)
    
    # Apply filters if provided
    * def filteredCycles = allCycles
    * if (queryParams.projectId) filteredCycles = allCycles.filter(function(cycle) { return cycle.projectId === queryParams.projectId })
    
    * def response = { cycles: filteredCycles, total: filteredCycles.length }
    * def responseStatus = 200
    * def responseHeaders = { 'Content-Type': 'application/json' }

  # Get a specific test cycle
  Scenario: pathMatches('/api/qtest/cycles/(.+)') && methodIs('get')
    * def id = pathParams[0]
    * def cycle = testCycles[id]
    
    * if (cycle) {
        response = cycle;
        responseStatus = 200;
      } else {
        response = { error: 'Test cycle not found', code: 'NOT_FOUND' };
        responseStatus = 404;
      }
    * def responseHeaders = { 'Content-Type': 'application/json' }

  # Create a test cycle
  Scenario: pathMatches('/api/qtest/cycles') && methodIs('post')
    * def cycle = request
    
    # Generate ID if not provided
    * if (!cycle.id) cycle.id = generateId('testCycle')
    
    # Set default values
    * cycle.createdAt = cycle.createdAt || new Date().toISOString()
    * cycle.updatedAt = cycle.updatedAt || cycle.createdAt
    
    # Store the test cycle
    * eval testCycles[cycle.id] = cycle
    
    * def response = cycle
    * def responseStatus = 201
    * def responseHeaders = { 'Content-Type': 'application/json' }

  # Add test case to test cycle
  Scenario: pathMatches('/api/qtest/cycles/(.+)/test-cases') && methodIs('post')
    * def cycleId = pathParams[0]
    * def cycle = testCycles[cycleId]
    * def testCaseId = request.testCaseId
    * def testCase = testCases[testCaseId]
    
    * if (!cycle) {
        response = { error: 'Test cycle not found', code: 'NOT_FOUND' };
        responseStatus = 404;
      } else if (!testCase) {
        response = { error: 'Test case not found', code: 'NOT_FOUND' };
        responseStatus = 404;
      } else {
        def testRun = { 
          id: generateId('testRun'),
          testCaseId: testCaseId,
          cycleId: cycleId,
          status: 'Not Executed',
          createdAt: new Date().toISOString()
        }
        testRuns[testRun.id] = testRun
        response = testRun;
        responseStatus = 201;
      }
    * def responseHeaders = { 'Content-Type': 'application/json' }

  # ===================== MODULES API =====================

  # Get all modules
  Scenario: pathMatches('/api/qtest/modules') && methodIs('get')
    * def queryParams = request.params || {}
    * def allModules = Object.values(modules)
    
    # Apply filters if provided
    * def filteredModules = allModules
    * if (queryParams.projectId) filteredModules = allModules.filter(function(module) { return module.projectId === queryParams.projectId })
    
    * def response = { modules: filteredModules, total: filteredModules.length }
    * def responseStatus = 200
    * def responseHeaders = { 'Content-Type': 'application/json' }

  # Get a specific module
  Scenario: pathMatches('/api/qtest/modules/(.+)') && methodIs('get')
    * def id = pathParams[0]
    * def module = modules[id]
    
    * if (module) {
        response = module;
        responseStatus = 200;
      } else {
        response = { error: 'Module not found', code: 'NOT_FOUND' };
        responseStatus = 404;
      }
    * def responseHeaders = { 'Content-Type': 'application/json' }

  # Create a module
  Scenario: pathMatches('/api/qtest/modules') && methodIs('post')
    * def module = request
    
    # Generate ID if not provided
    * if (!module.id) module.id = generateId('module')
    
    # Store the module
    * eval modules[module.id] = module
    
    * def response = module
    * def responseStatus = 201
    * def responseHeaders = { 'Content-Type': 'application/json' }

  # ===================== ATTACHMENTS API =====================

  # Get attachments for a test case
  Scenario: pathMatches('/api/qtest/test-cases/(.+)/attachments') && methodIs('get')
    * def id = pathParams[0]
    * def testCase = testCases[id]
    * def responseStatus = testCase ? 200 : 404
    * def response = testCase ? (testCase.attachments || []) : { error: 'Test case not found', code: 'NOT_FOUND' }
    * def responseHeaders = { 'Content-Type': 'application/json' }

  # Add attachment to a test case
  Scenario: pathMatches('/api/qtest/test-cases/(.+)/attachments') && methodIs('post')
    * def id = pathParams[0]
    * def testCase = testCases[id]
    
    * if (testCase) {
        if (!testCase.attachments) testCase.attachments = [];
        def attachment = request
        attachment.id = attachment.id || generateId('attachment')
        attachment.uploadedAt = attachment.uploadedAt || new Date().toISOString()
        testCase.attachments.push(attachment);
        attachments[attachment.id] = attachment;
        response = attachment;
        responseStatus = 201;
      } else {
        response = { error: 'Test case not found', code: 'NOT_FOUND' };
        responseStatus = 404;
      }
    * def responseHeaders = { 'Content-Type': 'application/json' }

  # Get attachment content
  Scenario: pathMatches('/api/qtest/attachments/(.+)/content') && methodIs('get')
    * def id = pathParams[0]
    * def attachment = attachments[id]
    
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
  Scenario: pathMatches('/api/qtest/projects') && methodIs('get')
    * def allProjects = Object.values(projects)
    * def response = { projects: allProjects, total: allProjects.length }
    * def responseStatus = 200
    * def responseHeaders = { 'Content-Type': 'application/json' }

  # Get a specific project
  Scenario: pathMatches('/api/qtest/projects/(.+)') && methodIs('get')
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