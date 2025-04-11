Feature: Monitor Binary Processor

  Scenario: Monitor binary processor events for a migration
    * url binaryProcessorBaseUrl
    * header Accept = 'application/json'
    * header Content-Type = 'application/json'
    * def migrationId = migrationId
    * def timeoutSeconds = timeoutSeconds
    
    # Wait for events to appear for a maximum of specified seconds
    * def startTime = new Date().getTime()
    * def endTime = startTime + (timeoutSeconds * 1000)
    * def events = []
    
    # Poll until timeout or events found
    * def poll = 
    """
    function() {
      var currentTime = new Date().getTime();
      if (currentTime > endTime) {
        karate.log('Binary processor monitoring timed out after', timeoutSeconds, 'seconds');
        return events;
      }
      
      var response = karate.call('classpath:org/skidbladnir/utils/get-binary-processor-events.feature', 
        { migrationId: migrationId });
        
      if (response && response.events && response.events.length > 0) {
        events = response.events.map(function(e) { return e.type; });
        return events;
      }
      
      // Sleep before polling again
      java.lang.Thread.sleep(2000); // 2 seconds
      return poll();
    }
    """
    
    * def events = poll()
    * def result = { events: events }