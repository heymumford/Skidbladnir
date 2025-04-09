# Karate Test Syntax Guide

## Overview

This guide provides a concise reference for Karate syntax and conventions used in the Skidbladnir project. It covers essential syntax elements, commands, and best practices for writing effective Karate tests.

## Basic Structure

Karate tests are written in `.feature` files using Gherkin syntax:

```gherkin
Feature: Feature name and description

  Background:
    # Setup steps that run before each scenario
    * def baseUrl = 'http://localhost:8080/api'

  Scenario: Test a specific functionality
    Given url baseUrl
    And path '/test-cases'
    When method GET
    Then status 200
    And match response == '#array'
```

## Key Syntax Elements

### Asterisk (`*`) Prefix

The asterisk prefix is a generic step that can be used for any operation:

```gherkin
* def testId = 'TC-1234'
* print 'Working with test case:', testId
* url baseUrl
```

### Variable Definition and Usage

```gherkin
* def testCase = { id: 'TC-1234', name: 'Test Login' }
* def timestamp = function(){ return new Date().toISOString() }
* path '/test-cases/' + testCase.id
```

### HTTP Methods

```gherkin
Given url baseUrl
And path '/test-cases'
And request { name: 'New Test Case', priority: 'High' }
When method POST
Then status 201
```

### JSON Path Expressions

```gherkin
* def firstTestCase = response[0]
* def testCaseId = response.id
* def allNames = $response[*].name
```

### Assertions with `match`

```gherkin
# Equality matching
And match response == { id: '#string', name: '#notnull' }

# Contains matching
And match response contains { status: 'SUCCESS' }

# Array matching
And match response == '#[3]'  # Array with 3 elements
And match response[*].id contains 'TC-1234'

# Schema validation
And match each response == { id: '#string', status: '#? _ == "ACTIVE" || _ == "INACTIVE"' }
```

### Schema Validation Markers

| Marker | Description |
|--------|-------------|
| `#string` | Validates value is a string |
| `#number` | Validates value is a number |
| `#boolean` | Validates value is a boolean |
| `#array` | Validates value is an array |
| `#object` | Validates value is an object |
| `#notnull` | Validates value is not null |
| `#null` | Validates value is null |
| `#regex` | Validates against a regular expression |
| `#uuid` | Validates value is a UUID |
| `#? _` | Expression for custom validation logic |

## Control Flow

### Conditionals

```gherkin
* if (response.status == 'FAILED') karate.fail('Test case failed')

* def result = responseStatus == 404 ? 'NOT_FOUND' : 'OK'
```

### Loops

```gherkin
* def items = [1, 2, 3]
* def sum = 0
* def addToSum = function(i){ sum = sum + i }
* karate.forEach(items, addToSum)

# Map operation
* def doubles = karate.map(items, function(i){ return i * 2 })
```

## Reusable Blocks

### JavaScript Functions

```gherkin
* def createTestCase = 
  """
  function(name, priority) {
    return {
      name: name,
      priority: priority || 'Medium',
      createdAt: new Date().toISOString()
    }
  }
  """

* def newTestCase = createTestCase('Login Test', 'High')
```

### Calling Other Feature Files

```gherkin
# Call and use response
* def result = call read('classpath:org/skidbladnir/common/create-test-case.feature') { name: 'Authentication Test' }
* def testCaseId = result.response.id

# Call without passing back result
* call read('classpath:org/skidbladnir/common/login.feature')
```

## Setting Up Preconditions

### Background Section

The `Background` section runs before each scenario and is ideal for setup:

```gherkin
Background:
  # Set up global configuration
  * def baseUrl = 'http://localhost:8080/api'
  
  # Load test data
  * def testData = read('classpath:test-data/test-cases.json')
  
  # Set up authentication
  * def auth = call read('classpath:org/skidbladnir/common/auth.feature')
  * def authToken = auth.token
  
  # Initialize helpers
  * def uuid = function() { return java.util.UUID.randomUUID() + '' }
```

### Configuration File (`karate-config.js`)

For global configuration, use `karate-config.js`:

```javascript
function fn() {
  var env = karate.env || 'dev';
  var config = {
    baseUrl: 'http://localhost:8080/api',
    mockPort: 8090,
    testData: {}
  };
  
  // Environment-specific configuration
  if (env === 'dev') {
    // development settings
  } else if (env === 'qa') {
    config.baseUrl = 'https://qa.example.com/api';
  }
  
  // Add authentication helper
  config.getAuthToken = function() {
    // Implementation
  };
  
  return config;
}
```

## Best Practices

### Tagging

```gherkin
@integration
Feature: Test API Integration

  @smoke
  Scenario: Verify API is accessible
    # Quick test to verify API is up

  @contract
  Scenario: Verify API contract
    # Test to verify API conforms to contract

  @performance @slow
  Scenario: Measure API response time under load
    # Performance test
```

**Best Practices for Tags:**

1. Use `@smoke` for critical path tests that verify core functionality
2. Use `@regression` for more comprehensive tests
3. Use `@ignore` to temporarily disable tests
4. Use `@parallel=false` for tests that shouldn't run in parallel
5. Use functional tags like `@auth`, `@migration`, `@contract` to categorize tests
6. Use `@env=dev` or `@env=qa` for environment-specific tests

### Data-Driven Testing

```gherkin
Scenario Outline: Test with multiple data sets
  Given url baseUrl
  And path '/test-cases'
  And request { name: '<name>', priority: '<priority>' }
  When method POST
  Then status 201
  And match response.id == '#string'

  Examples:
    | name           | priority |
    | Login Test     | High     |
    | Register Test  | Medium   |
    | Profile Test   | Low      |
```

## Mock Server Usage

```gherkin
Scenario: Test with mock server
  # Start a mock server
  * def mockServer = karate.start({ mock: 'zephyr-api-mock.feature', port: 8090 })
  
  # Make requests to the mock
  * url 'http://localhost:8090/api'
  * path '/test-cases'
  * method GET
  * status 200
  
  # Stop the mock when done
  * mockServer.stop()
```

## Build Integration

### Maven Configuration

```xml
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-surefire-plugin</artifactId>
  <version>2.22.2</version>
  <configuration>
    <includes>
      <include>**/*Tests.java</include>
    </includes>
    <systemProperties>
      <karate.env>dev</karate.env>
    </systemProperties>
  </configuration>
</plugin>
```

### NPM Scripts Integration

```json
{
  "scripts": {
    "test:api": "mvn test -f tests/api-integration/pom.xml",
    "test:api:contracts": "mvn test -f tests/api-integration/pom.xml -Dtest=ContractTests",
    "test:api:smoke": "mvn test -f tests/api-integration/pom.xml -Dtags=@smoke"
  }
}
```

### CI/CD Integration

```yaml
# Example GitHub Action
jobs:
  karate-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up JDK 11
        uses: actions/setup-java@v2
        with:
          java-version: '11'
          distribution: 'adopt'
      - name: Run API Tests
        run: mvn test -f tests/api-integration/pom.xml
      - name: Store Test Results
        if: always()
        uses: actions/upload-artifact@v2
        with:
          name: karate-reports
          path: tests/api-integration/target/karate-reports
```

## Resources

- [Official Karate Documentation](https://github.com/karatelabs/karate)
- [Karate Examples](https://github.com/karatelabs/karate/tree/master/karate-demo)
- [Skidbladnir Karate Test Examples](/tests/api-integration/src/test/java/org/skidbladnir/)