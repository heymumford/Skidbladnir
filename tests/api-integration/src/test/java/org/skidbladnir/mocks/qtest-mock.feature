Feature: qTest Mock API

  Background:
    * def testCases = {}
    * def nextId = 5000
    
    * def generateId = function(){ return 'QT-' + (nextId++); }

  Scenario: pathMatches('/api/qtest/status') && methodIs('get')
    * def response = { status: 'UP', name: 'qTest Mock API', version: '1.0.0' }

  Scenario: pathMatches('/api/qtest/test-cases') && methodIs('get')
    * def testCaseList = []
    * eval for(var key in testCases) testCaseList.push(testCases[key])
    * def response = { testCases: testCaseList, pagination: { total: testCaseList.length, page: 1, pageSize: 10 } }

  Scenario: pathMatches('/api/qtest/test-cases/(.+)') && methodIs('get')
    * def id = pathParams[0]
    * def testCase = testCases[id]
    * def responseStatus = testCase ? 200 : 404
    * def response = testCase ? testCase : { error: 'Test case not found' }

  Scenario: pathMatches('/api/qtest/test-cases') && methodIs('post')
    * def testCase = request
    * def id = testCase.id || generateId()
    * testCase.id = id
    * testCase.createdAt = new Date().toISOString()
    * testCase.updatedAt = testCase.createdAt
    * eval testCases[id] = testCase
    * def responseStatus = 201
    * def response = testCase

  Scenario: pathMatches('/api/qtest/test-cases/(.+)') && methodIs('put')
    * def id = pathParams[0]
    * def exists = testCases[id] != null
    * def responseStatus = exists ? 200 : 404
    
    * if (exists) {
        var existing = testCases[id];
        for (var key in request) {
          existing[key] = request[key];
        }
        existing.updatedAt = new Date().toISOString();
        testCases[id] = existing;
        response = existing;
      } else {
        response = { error: 'Test case not found' };
      }

  Scenario: pathMatches('/api/qtest/test-cases/(.+)/attachments') && methodIs('get')
    * def id = pathParams[0]
    * def testCase = testCases[id]
    * def responseStatus = testCase ? 200 : 404
    * def response = testCase ? (testCase.attachments || []) : { error: 'Test case not found' }

  Scenario: pathMatches('/api/qtest/test-cases/(.+)/attachments') && methodIs('post')
    * def id = pathParams[0]
    * def testCase = testCases[id]
    * def responseStatus = testCase ? 201 : 404
    
    * if (testCase) {
        if (!testCase.attachments) testCase.attachments = [];
        request.id = 'qt-attach-' + Date.now();
        testCase.attachments.push(request);
        response = request;
      } else {
        response = { error: 'Test case not found' };
      }