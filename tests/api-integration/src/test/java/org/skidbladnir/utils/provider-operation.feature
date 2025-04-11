Feature: Provider Operation Execution
  Generic feature to execute a provider operation

  Scenario: Execute provider operation
    * def apiBaseUrl = karate.properties['apiBaseUrl'] || 'http://localhost:8080'
    * url apiBaseUrl

    # Provider operations are mapped to API endpoints
    # This mapping defines how to call each operation for different providers
    * def operationMap = {
      'zephyr': {
        'getTestCase': {
          method: 'GET',
          path: '/providers/zephyr/test-cases/{id}',
          pathParams: ['id']
        },
        'listTestCases': {
          method: 'GET',
          path: '/providers/zephyr/test-cases',
          queryParams: ['limit', 'offset', 'folderId']
        },
        'createTestCase': {
          method: 'POST',
          path: '/providers/zephyr/test-cases',
          body: true
        },
        'updateTestCase': {
          method: 'PUT',
          path: '/providers/zephyr/test-cases/{id}',
          pathParams: ['id'],
          body: true
        },
        'deleteTestCase': {
          method: 'DELETE',
          path: '/providers/zephyr/test-cases/{id}',
          pathParams: ['id']
        }
      },
      'qtest': {
        'getTestCase': {
          method: 'GET',
          path: '/providers/qtest/test-cases/{id}',
          pathParams: ['id']
        },
        'listTestCases': {
          method: 'GET',
          path: '/providers/qtest/test-cases',
          queryParams: ['limit', 'offset', 'folderId']
        },
        'createTestCase': {
          method: 'POST',
          path: '/providers/qtest/test-cases',
          body: true
        },
        'updateTestCase': {
          method: 'PUT',
          path: '/providers/qtest/test-cases/{id}',
          pathParams: ['id'],
          body: true
        },
        'deleteTestCase': {
          method: 'DELETE',
          path: '/providers/qtest/test-cases/{id}',
          pathParams: ['id']
        }
      },
      'testrail': {
        'getTestCase': {
          method: 'GET',
          path: '/providers/testrail/test-cases/{id}',
          pathParams: ['id']
        },
        'listTestCases': {
          method: 'GET',
          path: '/providers/testrail/test-cases',
          queryParams: ['limit', 'offset', 'sectionId']
        },
        'createTestCase': {
          method: 'POST',
          path: '/providers/testrail/test-cases',
          body: true
        },
        'updateTestCase': {
          method: 'PUT',
          path: '/providers/testrail/test-cases/{id}',
          pathParams: ['id'],
          body: true
        },
        'deleteTestCase': {
          method: 'DELETE',
          path: '/providers/testrail/test-cases/{id}',
          pathParams: ['id']
        }
      },
      'microfocus': {
        'getTestCase': {
          method: 'GET',
          path: '/providers/microfocus/test-cases/{id}',
          pathParams: ['id']
        },
        'listTestCases': {
          method: 'GET',
          path: '/providers/microfocus/test-cases',
          queryParams: ['limit', 'offset', 'folderId']
        },
        'createTestCase': {
          method: 'POST',
          path: '/providers/microfocus/test-cases',
          body: true
        },
        'updateTestCase': {
          method: 'PUT',
          path: '/providers/microfocus/test-cases/{id}',
          pathParams: ['id'],
          body: true
        },
        'deleteTestCase': {
          method: 'DELETE',
          path: '/providers/microfocus/test-cases/{id}',
          pathParams: ['id']
        }
      },
      'jama': {
        'getTestCase': {
          method: 'GET',
          path: '/providers/jama/test-cases/{id}',
          pathParams: ['id']
        },
        'listTestCases': {
          method: 'GET',
          path: '/providers/jama/test-cases',
          queryParams: ['limit', 'offset', 'projectId']
        },
        'createTestCase': {
          method: 'POST',
          path: '/providers/jama/test-cases',
          body: true
        },
        'updateTestCase': {
          method: 'PUT',
          path: '/providers/jama/test-cases/{id}',
          pathParams: ['id'],
          body: true
        },
        'deleteTestCase': {
          method: 'DELETE',
          path: '/providers/jama/test-cases/{id}',
          pathParams: ['id']
        }
      },
      'azure': {
        'getTestCase': {
          method: 'GET',
          path: '/providers/azure/test-cases/{id}',
          pathParams: ['id']
        },
        'listTestCases': {
          method: 'GET',
          path: '/providers/azure/test-cases',
          queryParams: ['limit', 'offset', 'projectId']
        },
        'createTestCase': {
          method: 'POST',
          path: '/providers/azure/test-cases',
          body: true
        },
        'updateTestCase': {
          method: 'PUT',
          path: '/providers/azure/test-cases/{id}',
          pathParams: ['id'],
          body: true
        },
        'deleteTestCase': {
          method: 'DELETE',
          path: '/providers/azure/test-cases/{id}',
          pathParams: ['id']
        }
      }
    }

    # Get operation details for the provider
    * def providerOps = operationMap[provider]
    * def operation = providerOps[operation]
    * def method = operation.method
    
    # Replace path parameters
    * def path = operation.path
    * if (operation.pathParams) {
        for (var i = 0; i < operation.pathParams.length; i++) {
          var param = operation.pathParams[i];
          if (params[param]) {
            path = path.replace('{' + param + '}', params[param]);
          }
        }
      }
    
    # Set up the request
    * path path
    
    # Add query parameters
    * if (operation.queryParams) {
        var queryParams = {};
        for (var i = 0; i < operation.queryParams.length; i++) {
          var param = operation.queryParams[i];
          if (params[param]) {
            queryParams[param] = params[param];
          }
        }
        param queryParams;
      }
    
    # Add request body if needed
    * if (operation.body && params.body) request params.body
    
    # Add provider config in headers
    * header X-Provider-Config = config
    
    # Execute the request
    * method method
    
    # Return the result
    * def result = { status: responseStatus, body: response }
    * return result