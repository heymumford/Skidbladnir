Feature: Cross-Service Schema Validation
  This feature validates that schema definitions are consistent across services

  Background:
    * url apiBaseUrl
    * def orchestratorUrl = orchestratorBaseUrl
    * def binaryProcessorUrl = binaryProcessorBaseUrl
    
    # Helper function to fetch schema definitions from services
    * def getSchema =
    """
    function(serviceUrl, schemaPath) {
      var result = { url: serviceUrl, path: schemaPath, schema: null, error: null };
      try {
        var response = karate.call('classpath:org/skidbladnir/contracts/schema-fetcher.feature', 
          { url: serviceUrl, path: schemaPath });
        
        if (response.status == 200) {
          result.schema = response.schema;
          result.status = 'SUCCESS';
        } else {
          result.error = 'HTTP ' + response.status;
          result.status = 'ERROR';
        }
      } catch (e) {
        result.error = e.message;
        result.status = 'EXCEPTION';
      }
      return result;
    }
    """
    
    # Helper function to compare schemas
    * def compareSchemas =
    """
    function(schema1, schema2) {
      var result = { match: true, differences: [] };
      
      // Check top-level fields
      var allFields = new Set();
      Object.keys(schema1).forEach(k => allFields.add(k));
      Object.keys(schema2).forEach(k => allFields.add(k));
      
      allFields.forEach(function(field) {
        var inSchema1 = schema1.hasOwnProperty(field);
        var inSchema2 = schema2.hasOwnProperty(field);
        
        if (!inSchema1 || !inSchema2) {
          result.match = false;
          result.differences.push({
            field: field,
            inFirst: inSchema1,
            inSecond: inSchema2
          });
          return;
        }
        
        // Compare types
        var type1 = typeof schema1[field] === 'object' ? (Array.isArray(schema1[field]) ? 'array' : 'object') : typeof schema1[field];
        var type2 = typeof schema2[field] === 'object' ? (Array.isArray(schema2[field]) ? 'array' : 'object') : typeof schema2[field];
        
        if (type1 !== type2) {
          result.match = false;
          result.differences.push({
            field: field,
            typeInFirst: type1,
            typeInSecond: type2
          });
        }
      });
      
      return result;
    }
    """

  Scenario: Validate test case schema across services
    # Get test case schema from API service
    * def apiSchemaResult = getSchema(apiBaseUrl, '/schemas/test-case')
    * match apiSchemaResult.status == 'SUCCESS'
    
    # Get test case schema from Orchestrator service
    * def orchestratorSchemaResult = getSchema(orchestratorBaseUrl, '/schemas/test-case')
    * match orchestratorSchemaResult.status == 'SUCCESS'
    
    # Compare the schemas
    * def comparison = compareSchemas(apiSchemaResult.schema, orchestratorSchemaResult.schema)
    * match comparison.match == true
    
  Scenario: Validate workflow schema across services
    # Get workflow schema from API service
    * def apiSchemaResult = getSchema(apiBaseUrl, '/schemas/workflow')
    * match apiSchemaResult.status == 'SUCCESS'
    
    # Get workflow schema from Orchestrator service
    * def orchestratorSchemaResult = getSchema(orchestratorBaseUrl, '/schemas/workflow')
    * match orchestratorSchemaResult.status == 'SUCCESS'
    
    # Compare the schemas
    * def comparison = compareSchemas(apiSchemaResult.schema, orchestratorSchemaResult.schema)
    * match comparison.match == true
    
  Scenario: Validate attachment schema across services
    # Get attachment schema from Orchestrator service
    * def orchestratorSchemaResult = getSchema(orchestratorBaseUrl, '/schemas/attachment')
    * match orchestratorSchemaResult.status == 'SUCCESS'
    
    # Get attachment schema from Binary Processor service
    * def binarySchemaResult = getSchema(binaryProcessorBaseUrl, '/schemas/attachment')
    * match binarySchemaResult.status == 'SUCCESS'
    
    # Compare the schemas
    * def comparison = compareSchemas(orchestratorSchemaResult.schema, binarySchemaResult.schema)
    * match comparison.match == true
    
  Scenario: Validate error schema across all services
    # Get error schema from all services
    * def apiSchemaResult = getSchema(apiBaseUrl, '/schemas/error')
    * match apiSchemaResult.status == 'SUCCESS'
    
    * def orchestratorSchemaResult = getSchema(orchestratorBaseUrl, '/schemas/error')
    * match orchestratorSchemaResult.status == 'SUCCESS'
    
    * def binarySchemaResult = getSchema(binaryProcessorBaseUrl, '/schemas/error')
    * match binarySchemaResult.status == 'SUCCESS'
    
    # Compare API and Orchestrator schemas
    * def comparison1 = compareSchemas(apiSchemaResult.schema, orchestratorSchemaResult.schema)
    * match comparison1.match == true
    
    # Compare Orchestrator and Binary Processor schemas
    * def comparison2 = compareSchemas(orchestratorSchemaResult.schema, binarySchemaResult.schema)
    * match comparison2.match == true