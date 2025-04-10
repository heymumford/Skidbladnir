Feature: Verify Rate Limit Error Format
  A helper feature to verify rate limit error responses

  Scenario:
    # Input: rateLimited - a response object that was rate limited
    
    # Verify rate limit response format
    * match rateLimited.response.body == { error: '#string', message: '#string', status: 429, details: '#array', timestamp: '#string' }
    # Verify rate limit headers
    * match rateLimited.response.headers['X-RateLimit-Limit'] == '#string'
    * match rateLimited.response.headers['X-RateLimit-Remaining'] == '#string'
    * match rateLimited.response.headers['X-RateLimit-Reset'] == '#string'