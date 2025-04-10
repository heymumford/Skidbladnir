Feature: API Version Compatibility
  This feature validates API version compatibility across services

  Background:
    * url apiBaseUrl
    * def orchestratorUrl = orchestratorBaseUrl
    * def binaryProcessorUrl = binaryProcessorBaseUrl
    
    # Helper function to get service versions
    * def getServiceVersion =
    """
    function(serviceUrl) {
      var result = { url: serviceUrl, version: null, error: null };
      try {
        var response = karate.call('classpath:org/skidbladnir/contracts/version-fetcher.feature', 
          { url: serviceUrl });
        
        if (response.status == 200) {
          result.version = response.version;
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
    
    # Helper function to check version compatibility
    * def checkVersionCompatibility =
    """
    function(version1, version2) {
      if (!version1 || !version2) return false;
      
      // Parse versions
      var parts1 = version1.split('.');
      var parts2 = version2.split('.');
      
      // Get major and minor versions
      var major1 = parseInt(parts1[0]);
      var minor1 = parseInt(parts1[1]);
      var major2 = parseInt(parts2[0]);
      var minor2 = parseInt(parts2[1]);
      
      // Major versions must match for compatibility
      if (major1 !== major2) return false;
      
      // Minor versions should be within 1 version of each other
      return Math.abs(minor1 - minor2) <= 1;
    }
    """

  Scenario: Verify API and Orchestrator version compatibility
    # Get API service version
    * def apiResult = getServiceVersion(apiBaseUrl)
    * match apiResult.status == 'SUCCESS'
    
    # Get Orchestrator service version
    * def orchestratorResult = getServiceVersion(orchestratorBaseUrl)
    * match orchestratorResult.status == 'SUCCESS'
    
    # Compare versions
    * def compatible = checkVersionCompatibility(apiResult.version, orchestratorResult.version)
    * assert compatible == true
    
    # Log the versions
    * karate.log('API version:', apiResult.version)
    * karate.log('Orchestrator version:', orchestratorResult.version)
    
  Scenario: Verify Orchestrator and Binary Processor version compatibility
    # Get Orchestrator service version
    * def orchestratorResult = getServiceVersion(orchestratorBaseUrl)
    * match orchestratorResult.status == 'SUCCESS'
    
    # Get Binary Processor service version
    * def binaryResult = getServiceVersion(binaryProcessorBaseUrl)
    * match binaryResult.status == 'SUCCESS'
    
    # Compare versions
    * def compatible = checkVersionCompatibility(orchestratorResult.version, binaryResult.version)
    * assert compatible == true
    
    # Log the versions
    * karate.log('Orchestrator version:', orchestratorResult.version)
    * karate.log('Binary Processor version:', binaryResult.version)
    
  Scenario: Verify all services support compatible API versions
    # Get versions from all services
    * def apiResult = getServiceVersion(apiBaseUrl)
    * match apiResult.status == 'SUCCESS'
    
    * def orchestratorResult = getServiceVersion(orchestratorBaseUrl)
    * match orchestratorResult.status == 'SUCCESS'
    
    * def binaryResult = getServiceVersion(binaryProcessorBaseUrl)
    * match binaryResult.status == 'SUCCESS'
    
    # Get supported API versions from all services
    * def apiVersions = karate.call('classpath:org/skidbladnir/contracts/api-versions-fetcher.feature', { url: apiBaseUrl }).versions
    * def orchestratorVersions = karate.call('classpath:org/skidbladnir/contracts/api-versions-fetcher.feature', { url: orchestratorBaseUrl }).versions
    * def binaryVersions = karate.call('classpath:org/skidbladnir/contracts/api-versions-fetcher.feature', { url: binaryProcessorBaseUrl }).versions
    
    # Find common supported versions
    * def findCommonVersions =
    """
    function(versions1, versions2) {
      return versions1.filter(function(v) {
        return versions2.includes(v);
      });
    }
    """
    
    * def commonApiOrchestrator = findCommonVersions(apiVersions, orchestratorVersions)
    * def commonOrchestratorBinary = findCommonVersions(orchestratorVersions, binaryVersions)
    * def commonAllServices = findCommonVersions(commonApiOrchestrator, binaryVersions)
    
    # Verify we have at least one common version
    * assert commonAllServices.length > 0
    
    # Log common versions
    * karate.log('Common API versions across all services:', commonAllServices)