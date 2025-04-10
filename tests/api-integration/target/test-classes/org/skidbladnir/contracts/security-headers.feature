Feature: Security Headers Validation
  This feature validates security headers across services

  Background:
    * url apiBaseUrl
    * def orchestratorUrl = orchestratorBaseUrl
    * def binaryProcessorUrl = binaryProcessorBaseUrl
    
    # Required security headers
    * def requiredHeaders = ['X-Content-Type-Options', 'X-Frame-Options', 'X-XSS-Protection', 'Strict-Transport-Security']
    
    # Helper function to check security headers
    * def checkSecurityHeaders =
    """
    function(serviceUrl, path) {
      var result = { 
        url: serviceUrl, 
        path: path, 
        headers: {}, 
        missingHeaders: [],
        status: 'SUCCESS' 
      };
      
      try {
        var response = karate.call('classpath:org/skidbladnir/contracts/header-checker.feature', 
          { url: serviceUrl, path: path });
        
        if (response.status >= 200 && response.status < 500) {
          result.headers = response.headers;
          
          // Check which required headers are missing
          for (var i = 0; i < requiredHeaders.length; i++) {
            var header = requiredHeaders[i];
            if (!response.headers[header]) {
              result.missingHeaders.push(header);
            }
          }
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

  Scenario: Verify security headers on API service
    # Check security headers on different API service endpoints
    * def paths = ['/status', '/test-cases', '/providers']
    
    * def results = karate.map(paths, function(path) { 
        return checkSecurityHeaders(apiBaseUrl, path) 
      })
    
    # Verify each result
    * def failedChecks = karate.filter(results, function(x) { return x.missingHeaders.length > 0 })
    
    # If any checks failed, log the details
    * if (failedChecks.length > 0) karate.log('Missing security headers on API service:', failedChecks)
    
    # Assert no missing headers
    * assert failedChecks.length == 0
    
  Scenario: Verify security headers on Orchestrator service
    # Check security headers on different Orchestrator service endpoints
    * def paths = ['/status', '/workflows', '/test-cases']
    
    * def results = karate.map(paths, function(path) { 
        return checkSecurityHeaders(orchestratorBaseUrl, path) 
      })
    
    # Verify each result
    * def failedChecks = karate.filter(results, function(x) { return x.missingHeaders.length > 0 })
    
    # If any checks failed, log the details
    * if (failedChecks.length > 0) karate.log('Missing security headers on Orchestrator service:', failedChecks)
    
    # Assert no missing headers
    * assert failedChecks.length == 0
    
  Scenario: Verify security headers on Binary Processor service
    # Check security headers on different Binary Processor service endpoints
    * def paths = ['/status', '/attachments', '/process']
    
    * def results = karate.map(paths, function(path) { 
        return checkSecurityHeaders(binaryProcessorBaseUrl, path) 
      })
    
    # Verify each result
    * def failedChecks = karate.filter(results, function(x) { return x.missingHeaders.length > 0 })
    
    # If any checks failed, log the details
    * if (failedChecks.length > 0) karate.log('Missing security headers on Binary Processor service:', failedChecks)
    
    # Assert no missing headers
    * assert failedChecks.length == 0
    
  Scenario: Verify Content-Security-Policy consistency across services
    # Get CSP headers from all services
    * def apiResult = checkSecurityHeaders(apiBaseUrl, '/status')
    * def orchestratorResult = checkSecurityHeaders(orchestratorBaseUrl, '/status')
    * def binaryResult = checkSecurityHeaders(binaryProcessorBaseUrl, '/status')
    
    # Extract CSP headers
    * def apiCSP = apiResult.headers['Content-Security-Policy']
    * def orchestratorCSP = orchestratorResult.headers['Content-Security-Policy']
    * def binaryCSP = binaryResult.headers['Content-Security-Policy']
    
    # Verify all services have CSP headers
    * assert apiCSP != null
    * assert orchestratorCSP != null
    * assert binaryCSP != null
    
    # Verify CSP directives are consistent
    * def parseCSP =
    """
    function(cspHeader) {
      var directives = {};
      var parts = cspHeader.split(';').map(function(p) { return p.trim(); });
      
      parts.forEach(function(part) {
        var directive = part.split(/\s+/)[0];
        directives[directive] = true;
      });
      
      return directives;
    }
    """
    
    * def apiDirectives = parseCSP(apiCSP)
    * def orchestratorDirectives = parseCSP(orchestratorCSP)
    * def binaryDirectives = parseCSP(binaryCSP)
    
    # Core directives that should be present in all services
    * def coreDirectives = ['default-src', 'script-src', 'style-src', 'img-src', 'connect-src', 'frame-ancestors']
    
    # Check for core directives in all services
    * def checkCoreDirectives =
    """
    function(directives) {
      var missing = [];
      coreDirectives.forEach(function(directive) {
        if (!directives[directive]) {
          missing.push(directive);
        }
      });
      return missing;
    }
    """
    
    * def apiMissing = checkCoreDirectives(apiDirectives)
    * def orchestratorMissing = checkCoreDirectives(orchestratorDirectives)
    * def binaryMissing = checkCoreDirectives(binaryDirectives)
    
    # Verify all core directives are present
    * assert apiMissing.length == 0
    * assert orchestratorMissing.length == 0
    * assert binaryMissing.length == 0