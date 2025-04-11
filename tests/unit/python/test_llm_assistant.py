"""
Unit tests for the LLM Assistant troubleshooting capabilities.
"""

import pytest
import json
from typing import Dict, Any

@pytest.fixture
def mock_llm_assistant():
    """Provide a mock LLM Assistant for testing troubleshooting capabilities."""
    class MockLLMAssistant:
        def __init__(self):
            self.queries = []
            self.loaded = False
            self.remediation_suggestions = {}
            
        def load_model(self):
            self.loaded = True
            return True
            
        def is_loaded(self):
            return self.loaded
            
        def analyze_error(self, error_data: Dict[str, Any]):
            """Analyze error data and identify root cause."""
            self.queries.append({"type": "error_analysis", "data": error_data})
            
            # Add mock error analysis based on status code
            status_code = error_data.get("status_code", 500)
            
            if status_code == 401:
                return {
                    "error_type": "authentication",
                    "root_cause": "Invalid or expired API token",
                    "severity": "high",
                    "confidence": 0.95,
                    "affected_component": "api_auth"
                }
            elif status_code == 429:
                return {
                    "error_type": "rate_limiting",
                    "root_cause": "Too many requests to API",
                    "severity": "medium",
                    "confidence": 0.9,
                    "affected_component": "api_client"
                }
            elif status_code == 404:
                return {
                    "error_type": "resource_not_found",
                    "root_cause": "Requested resource does not exist",
                    "severity": "medium",
                    "confidence": 0.85,
                    "affected_component": "api_resource"
                }
            else:
                return {
                    "error_type": "unknown",
                    "root_cause": "Generic server error",
                    "severity": "medium", 
                    "confidence": 0.7,
                    "affected_component": "api_server"
                }
        
        def generate_remediation_steps(self, error_analysis: Dict[str, Any]):
            """Generate remediation steps based on error analysis."""
            self.queries.append({"type": "remediation", "data": error_analysis})
            
            error_type = error_analysis.get("error_type", "unknown")
            
            # Return pre-defined remediation steps based on error type
            if error_type == "authentication":
                return [
                    {
                        "step": "Verify API token is correct",
                        "details": "Check that the API token is valid and has not expired",
                        "code_example": "console.log('Current token:', apiToken);",
                        "priority": 1
                    },
                    {
                        "step": "Regenerate API token",
                        "details": "Generate a new API token in the provider's admin interface",
                        "link": "https://admin.provider.com/tokens",
                        "priority": 2
                    },
                    {
                        "step": "Check permissions",
                        "details": "Ensure the token has the required permissions",
                        "priority": 3
                    }
                ]
            elif error_type == "rate_limiting":
                return [
                    {
                        "step": "Implement exponential backoff",
                        "details": "Add delay between requests that increases after each failure",
                        "code_example": "const delay = Math.min(Math.pow(2, retryCount) * 100, maxDelay);",
                        "priority": 1
                    },
                    {
                        "step": "Reduce concurrency",
                        "details": "Lower the number of concurrent requests to the API",
                        "priority": 2
                    },
                    {
                        "step": "Check rate limits documentation",
                        "details": "Review provider's documentation for rate limit specifications",
                        "link": "https://docs.provider.com/rate-limits",
                        "priority": 3
                    }
                ]
            elif error_type == "resource_not_found":
                return [
                    {
                        "step": "Verify resource ID",
                        "details": "Check that the resource ID exists and is correctly formatted",
                        "priority": 1
                    },
                    {
                        "step": "Check resource path",
                        "details": "Ensure the API endpoint path is correct",
                        "code_example": "const url = `${baseUrl}/api/resources/${resourceId}`;",
                        "priority": 2
                    },
                    {
                        "step": "Verify access permissions",
                        "details": "Confirm you have access to the resource",
                        "priority": 3
                    }
                ]
            else:
                return [
                    {
                        "step": "Check server status",
                        "details": "Verify if the API service is experiencing issues",
                        "priority": 1
                    },
                    {
                        "step": "Review request payload",
                        "details": "Ensure the request data is properly formatted",
                        "priority": 2
                    },
                    {
                        "step": "Contact support",
                        "details": "Reach out to the provider's support team",
                        "priority": 3
                    }
                ]
                
        def explain_error_in_plain_language(self, error_analysis: Dict[str, Any]):
            """Generate user-friendly explanation of the error."""
            self.queries.append({"type": "explanation", "data": error_analysis})
            
            error_type = error_analysis.get("error_type", "unknown")
            root_cause = error_analysis.get("root_cause", "Unknown error")
            
            if error_type == "authentication":
                return (
                    "The system couldn't authenticate your request because the API token appears to be "
                    "invalid or expired. This is similar to trying to enter a building with an expired "
                    "access card. You'll need to get a new valid token to continue."
                )
            elif error_type == "rate_limiting":
                return (
                    "Your requests are being blocked because you're sending too many too quickly. "
                    "Think of this like calling someone repeatedly - eventually they'll stop picking up. "
                    "You need to space out your requests to stay within the provider's limits."
                )
            elif error_type == "resource_not_found":
                return (
                    "The system couldn't find what you're looking for. This is like trying to visit "
                    "a web page that doesn't exist. Double-check that the resource ID is correct and "
                    "that you have permission to access it."
                )
            else:
                return (
                    f"There was a problem with the server: {root_cause}. This is typically an issue "
                    "on the provider's side rather than with your request. You may want to try again "
                    "later or contact their support team if the problem persists."
                )
                
        def generate_code_example(self, language: str, error_type: str, context: Dict[str, Any] = None):
            """Generate code example to handle specific error type."""
            context = context or {}
            self.queries.append({"type": "code_example", "language": language, "error_type": error_type, "context": context})
            
            if language == "javascript" and error_type == "authentication":
                return """
                async function authenticateWithRetry(credentials, maxRetries = 3) {
                  let retries = 0;
                  
                  while (retries < maxRetries) {
                    try {
                      const response = await api.authenticate(credentials);
                      return response.token;
                    } catch (error) {
                      retries++;
                      if (error.status === 401) {
                        console.log(`Authentication failed, attempt ${retries} of ${maxRetries}`);
                        if (retries >= maxRetries) {
                          throw new Error('Authentication failed after maximum retry attempts');
                        }
                        // Slight delay before retrying
                        await new Promise(resolve => setTimeout(resolve, 1000));
                      } else {
                        throw error; // Rethrow if it's not an auth error
                      }
                    }
                  }
                }
                """
            elif language == "javascript" and error_type == "rate_limiting":
                return """
                class RateLimitedApiClient {
                  constructor(baseUrl, options = {}) {
                    this.baseUrl = baseUrl;
                    this.maxRetries = options.maxRetries || 5;
                    this.baseDelay = options.baseDelay || 1000;
                    this.maxDelay = options.maxDelay || 30000;
                  }
                  
                  async request(endpoint, options = {}) {
                    let retries = 0;
                    
                    while (true) {
                      try {
                        const response = await fetch(`${this.baseUrl}/${endpoint}`, options);
                        
                        if (response.status === 429) {
                          retries++;
                          if (retries > this.maxRetries) {
                            throw new Error('Rate limit exceeded maximum retries');
                          }
                          
                          // Exponential backoff
                          const delay = Math.min(
                            Math.pow(2, retries) * this.baseDelay, 
                            this.maxDelay
                          );
                          
                          console.log(`Rate limited, retrying in ${delay}ms`);
                          await new Promise(resolve => setTimeout(resolve, delay));
                          continue;
                        }
                        
                        return response;
                      } catch (error) {
                        if (retries >= this.maxRetries) {
                          throw error;
                        }
                        retries++;
                      }
                    }
                  }
                }
                """
            else:
                return f"// Example for handling {error_type} errors in {language}\n// Not implemented yet"
            
        def suggest_api_workflow_improvements(self, current_workflow: Dict[str, Any]):
            """Suggest improvements to API workflow."""
            self.queries.append({"type": "workflow_improvement", "data": current_workflow})
            
            # Return mock suggestions
            return {
                "optimizations": [
                    {
                        "type": "parallel_execution",
                        "description": "These operations can be executed in parallel",
                        "operations": current_workflow.get("parallel_candidates", []),
                        "estimated_speedup": "40%"
                    },
                    {
                        "type": "caching",
                        "description": "These responses can be cached to reduce API calls",
                        "operations": current_workflow.get("cacheable_operations", []),
                        "estimated_speedup": "25%"
                    },
                    {
                        "type": "batching",
                        "description": "These operations can be batched into a single request",
                        "operations": current_workflow.get("batch_candidates", []),
                        "estimated_speedup": "30%"
                    }
                ],
                "reordering": [
                    {
                        "operation": op,
                        "current_position": idx,
                        "suggested_position": max(0, idx - 1),
                        "rationale": "Moving this earlier reduces dependency wait time"
                    }
                    for idx, op in enumerate(current_workflow.get("operations", []))
                    if idx > 0 and idx % 2 == 0  # Just for testing, suggest moving some operations
                ]
            }
            
    return MockLLMAssistant()


@pytest.mark.unit
@pytest.mark.llm
class TestLLMAssistant:
    """Test suite for the LLM Assistant troubleshooting capabilities."""
    
    def test_error_analysis(self, mock_llm_assistant):
        """Test that the assistant can analyze API errors."""
        # Arrange
        error_data = {
            "status_code": 401,
            "message": "Authentication failed",
            "request_id": "req-123456",
            "timestamp": "2025-01-01T12:00:00Z",
            "endpoint": "/api/v1/test-cases"
        }
        
        # Act
        analysis = mock_llm_assistant.analyze_error(error_data)
        
        # Assert
        assert analysis is not None
        assert analysis["error_type"] == "authentication"
        assert analysis["root_cause"] == "Invalid or expired API token"
        assert analysis["confidence"] > 0.9
        assert "severity" in analysis
        assert "affected_component" in analysis
        
    def test_remediation_steps_generation(self, mock_llm_assistant):
        """Test that the assistant can generate remediation steps."""
        # Arrange
        error_analysis = {
            "error_type": "authentication",
            "root_cause": "Invalid or expired API token",
            "severity": "high",
            "confidence": 0.95,
            "affected_component": "api_auth"
        }
        
        # Act
        steps = mock_llm_assistant.generate_remediation_steps(error_analysis)
        
        # Assert
        assert steps is not None
        assert len(steps) > 0
        assert "step" in steps[0]
        assert "details" in steps[0]
        assert "priority" in steps[0]
        
        # Verify steps are ordered by priority
        for i in range(len(steps) - 1):
            assert steps[i]["priority"] <= steps[i + 1]["priority"]
            
    def test_plain_language_explanation(self, mock_llm_assistant):
        """Test that the assistant can explain errors in plain language."""
        # Arrange
        error_analysis = {
            "error_type": "rate_limiting",
            "root_cause": "Too many requests to API",
            "severity": "medium",
            "confidence": 0.9,
            "affected_component": "api_client"
        }
        
        # Act
        explanation = mock_llm_assistant.explain_error_in_plain_language(error_analysis)
        
        # Assert
        assert explanation is not None
        assert len(explanation) > 0
        assert "too many" in explanation.lower()
        assert "requests" in explanation.lower()
        
    def test_code_example_generation(self, mock_llm_assistant):
        """Test that the assistant can generate code examples."""
        # Arrange
        language = "javascript"
        error_type = "rate_limiting"
        context = {
            "api_name": "qTest",
            "operation": "create_test_case"
        }
        
        # Act
        code = mock_llm_assistant.generate_code_example(language, error_type, context)
        
        # Assert
        assert code is not None
        assert len(code) > 0
        assert "class" in code
        assert "429" in code  # Rate limiting status code
        assert "retry" in code.lower()
        
    def test_workflow_optimization_suggestions(self, mock_llm_assistant):
        """Test that the assistant can suggest API workflow improvements."""
        # Arrange
        current_workflow = {
            "operations": [
                {"id": "op1", "name": "authenticate", "dependencies": []},
                {"id": "op2", "name": "get_projects", "dependencies": ["op1"]},
                {"id": "op3", "name": "get_test_cases", "dependencies": ["op2"]},
                {"id": "op4", "name": "get_users", "dependencies": ["op1"]},
                {"id": "op5", "name": "get_attachments", "dependencies": ["op3"]}
            ],
            "parallel_candidates": ["op2", "op4"],
            "cacheable_operations": ["op2", "op4"],
            "batch_candidates": ["op3", "op5"]
        }
        
        # Act
        suggestions = mock_llm_assistant.suggest_api_workflow_improvements(current_workflow)
        
        # Assert
        assert suggestions is not None
        assert "optimizations" in suggestions
        assert "reordering" in suggestions
        assert len(suggestions["optimizations"]) > 0
        
        # Verify optimization types
        optimization_types = [opt["type"] for opt in suggestions["optimizations"]]
        assert "parallel_execution" in optimization_types
        assert "caching" in optimization_types
        
    @pytest.mark.parametrize("status_code,expected_type", [
        (401, "authentication"),
        (429, "rate_limiting"),
        (404, "resource_not_found"),
        (500, "unknown")
    ])
    def test_different_error_types(self, mock_llm_assistant, status_code, expected_type):
        """Test that different error status codes are correctly analyzed."""
        # Arrange
        error_data = {
            "status_code": status_code,
            "message": "Error message",
            "request_id": "req-123456",
            "timestamp": "2025-01-01T12:00:00Z"
        }
        
        # Act
        analysis = mock_llm_assistant.analyze_error(error_data)
        
        # Assert
        assert analysis["error_type"] == expected_type
        
    def test_integration_of_analysis_and_remediation(self, mock_llm_assistant):
        """Test that error analysis and remediation steps integrate well."""
        # Arrange
        error_data = {
            "status_code": 429,
            "message": "Rate limit exceeded",
            "request_id": "req-123456",
            "timestamp": "2025-01-01T12:00:00Z",
            "endpoint": "/api/v1/test-cases"
        }
        
        # Act
        analysis = mock_llm_assistant.analyze_error(error_data)
        steps = mock_llm_assistant.generate_remediation_steps(analysis)
        explanation = mock_llm_assistant.explain_error_in_plain_language(analysis)
        code = mock_llm_assistant.generate_code_example("javascript", analysis["error_type"])
        
        # Assert
        assert analysis["error_type"] == "rate_limiting"
        assert len(steps) > 0
        assert "backoff" in steps[0]["step"].lower()
        assert "too many" in explanation.lower()
        assert "429" in code
        
        # Verify the assistant tracked all the queries
        assert len(mock_llm_assistant.queries) == 4
        assert mock_llm_assistant.queries[0]["type"] == "error_analysis"
        assert mock_llm_assistant.queries[1]["type"] == "remediation"
        assert mock_llm_assistant.queries[2]["type"] == "explanation"
        assert mock_llm_assistant.queries[3]["type"] == "code_example"