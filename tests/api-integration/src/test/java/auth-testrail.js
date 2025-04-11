function fn() {
  // TestRail uses basic auth with username and API key
  var username = karate.properties['testrail.username'] || 'api-user@example.com';
  var apiKey = karate.properties['testrail.apikey'] || 'testApiKey123';

  // Encode the credentials for basic auth
  var temp = username + ':' + apiKey;
  var Base64 = Java.type('java.util.Base64');
  var encoded = Base64.getEncoder().encodeToString(temp.getBytes('utf-8'));
  return 'Basic ' + encoded;
}