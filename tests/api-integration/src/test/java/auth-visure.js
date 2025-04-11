/**
 * Authentication function for Visure Solutions API
 * Returns a Basic Authentication header value for Visure API calls
 */

function fn() {
  // Get credentials from environment or use defaults for test environment
  var username = karate.properties['visure.username'] || 'visureuser';
  var password = karate.properties['visure.password'] || 'visurepass';
  
  // Create the Base64 encoded credentials
  var auth = username + ':' + password;
  var Base64 = Java.type('java.util.Base64');
  var encoded = Base64.getEncoder().encodeToString(auth.getBytes());
  
  return 'Basic ' + encoded;
}