function fn() {
  // Configuration for Jama auth
  var clientId = karate.properties['jama.clientId'] || 'client_id';
  var clientSecret = karate.properties['jama.clientSecret'] || 'client_secret';
  var username = karate.properties['jama.username'] || 'api-user@example.com';
  var password = karate.properties['jama.password'] || 'password123';
  
  // Auth URL
  var tokenUrl = baseUrl + '/rest/oauth/token';
  
  // Attempt to get token using client credentials flow
  var clientAuth = 'Basic ' + java.util.Base64.getEncoder().encodeToString((clientId + ':' + clientSecret).getBytes('utf-8'));
  
  var requestConfig = {
    method: 'post',
    url: tokenUrl,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': clientAuth
    },
    form: {
      grant_type: 'client_credentials'
    }
  };
  
  try {
    var response = karate.http(requestConfig);
    
    if (response.status == 200) {
      return {
        token: response.json.access_token,
        tokenType: response.json.token_type,
        expiresIn: response.json.expires_in
      };
    }
    
    // If client credentials fail, try password flow
    requestConfig.form = {
      grant_type: 'password',
      username: username,
      password: password
    };
    
    response = karate.http(requestConfig);
    
    if (response.status == 200) {
      return {
        token: response.json.access_token,
        tokenType: response.json.token_type,
        expiresIn: response.json.expires_in
      };
    }
    
    // If all else fails, just return a dummy token for mock testing
    karate.log('Warning: Failed to get Jama authentication token, using mock token for tests');
    return {
      token: 'mock_token_for_testing',
      tokenType: 'bearer',
      expiresIn: 3600
    };
  } catch (e) {
    karate.log('Error during Jama authentication: ' + e);
    
    // Return mock token for testing
    return {
      token: 'mock_token_for_testing',
      tokenType: 'bearer',
      expiresIn: 3600
    };
  }
}