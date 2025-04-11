"""
Unit test configuration for Python components.
"""

import os
import sys
import pytest
from typing import Dict, Any, Generator, List, Optional

# Add path to the internal directory for imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../')))

# Conditionally import the llm_advisor module if it exists
try:
    from internal.python.llm_advisor.services.llm_assistant import LLMAssistant
    from internal.python.llm_advisor.models.error_models import ErrorType, SeverityLevel
    from internal.python.llm_advisor.providers.zephyr_advisor import ZephyrApiAdvisor
    from internal.python.llm_advisor.providers.qtest_advisor import QTestApiAdvisor
    LLM_ADVISOR_AVAILABLE = True
except ImportError:
    LLM_ADVISOR_AVAILABLE = False

# Add specific fixtures for unit tests
@pytest.fixture(scope="function")
def mock_orchestrator_service():
    """Provide a mock orchestrator service for unit tests."""
    class MockOrchestratorService:
        def __init__(self):
            self.workflows = {}
            self.workflow_counter = 0
        
        def create_workflow(self, workflow_type, input_data):
            self.workflow_counter += 1
            workflow_id = f"wf-{self.workflow_counter}"
            self.workflows[workflow_id] = {
                "id": workflow_id,
                "type": workflow_type,
                "input": input_data,
                "state": "CREATED",
                "createdAt": "2025-01-01T00:00:00Z"
            }
            return workflow_id
        
        def start_workflow(self, workflow_id):
            if workflow_id not in self.workflows:
                raise ValueError(f"Workflow {workflow_id} not found")
            
            self.workflows[workflow_id]["state"] = "RUNNING"
            self.workflows[workflow_id]["startedAt"] = "2025-01-01T00:01:00Z"
            return self.workflows[workflow_id]
        
        def get_workflow(self, workflow_id):
            if workflow_id not in self.workflows:
                raise ValueError(f"Workflow {workflow_id} not found")
            
            return self.workflows[workflow_id]
    
    return MockOrchestratorService()

@pytest.fixture(scope="function")
def mock_translation_service():
    """Provide a mock translation service for unit tests."""
    class MockTranslationService:
        def __init__(self):
            self.translations = {}
        
        def translate(self, source_format, target_format, data):
            key = f"{source_format}->{target_format}"
            self.translations[key] = data
            
            # Use canonical model in the translation process
            canonical_data = self.get_canonical_form(source_format, data)
            target_data = self.from_canonical_form(target_format, canonical_data)
            
            # Just return the data with a translation marker for testing
            return {
                **target_data,
                "translated": True,
                "sourceFormat": source_format,
                "targetFormat": target_format
            }
        
        def get_translations(self):
            return self.translations
            
        def get_canonical_form(self, source_format, data):
            # Mock method to convert source data to canonical form
            return data
            
        def from_canonical_form(self, target_format, canonical_data):
            # Mock method to convert canonical form to target format
            return canonical_data
    
    return MockTranslationService()

@pytest.fixture(scope="function")
def mock_llm_service():
    """Provide a mock LLM service for unit tests."""
    class MockLLMService:
        def __init__(self):
            self.queries = []
            self.loaded = False
        
        def load_model(self):
            self.loaded = True
            return True
        
        def is_loaded(self):
            return self.loaded
        
        def unload_model(self):
            self.loaded = False
            return True
        
        def query(self, prompt, max_tokens=100):
            self.queries.append(prompt)
            # Simple responses based on prompt content
            if "translate" in prompt.lower():
                return "Translated content from the LLM"
            elif "error" in prompt.lower():
                return "Error analysis: This appears to be an authentication issue"
            else:
                return "Generic LLM response for: " + prompt[:20] + "..."
    
    return MockLLMService()

@pytest.fixture(scope="function")
def mock_llm_assistant():
    """Provide a mock LLM Assistant for testing troubleshooting capabilities."""
    # Use the actual implementation if available
    if LLM_ADVISOR_AVAILABLE:
        return LLMAssistant()
        
    # Otherwise, provide a compatible mock implementation
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

@pytest.fixture(scope="function")
def mock_zephyr_advisor(mock_llm_assistant):
    """Provide a mock Zephyr advisor for testing."""
    if LLM_ADVISOR_AVAILABLE:
        return ZephyrApiAdvisor(mock_llm_assistant)
        
    # Simple mock implementation if the actual code isn't available
    class MockZephyrAdvisor:
        def __init__(self, llm_assistant):
            self.llm_assistant = llm_assistant
            
        def analyze_zephyr_error(self, error_data):
            error_data["provider"] = "zephyr"
            return self.llm_assistant.analyze_error(error_data)
            
        def get_zephyr_remediation_steps(self, error_analysis):
            steps = self.llm_assistant.generate_remediation_steps(error_analysis)
            # Add a Zephyr-specific step
            if isinstance(steps, list) and len(steps) > 0:
                steps.insert(0, {
                    "step": "Check Zephyr API documentation",
                    "details": "Refer to Zephyr Scale API documentation",
                    "priority": 1
                })
            return steps
            
        def suggest_zephyr_workflow_optimizations(self, workflow):
            workflow["provider"] = "zephyr"
            return self.llm_assistant.suggest_api_workflow_improvements(workflow)
    
    return MockZephyrAdvisor(mock_llm_assistant)

@pytest.fixture(scope="function")
def mock_qtest_advisor(mock_llm_assistant):
    """Provide a mock qTest advisor for testing."""
    if LLM_ADVISOR_AVAILABLE:
        return QTestApiAdvisor(mock_llm_assistant)
        
    # Simple mock implementation if the actual code isn't available
    class MockQTestAdvisor:
        def __init__(self, llm_assistant):
            self.llm_assistant = llm_assistant
            
        def analyze_qtest_error(self, error_data):
            error_data["provider"] = "qtest"
            return self.llm_assistant.analyze_error(error_data)
            
        def get_qtest_remediation_steps(self, error_analysis):
            steps = self.llm_assistant.generate_remediation_steps(error_analysis)
            # Add a qTest-specific step
            if isinstance(steps, list) and len(steps) > 0:
                steps.insert(0, {
                    "step": "Check qTest API documentation",
                    "details": "Refer to qTest API documentation",
                    "priority": 1
                })
            return steps
            
        def suggest_qtest_workflow_optimizations(self, workflow):
            workflow["provider"] = "qtest"
            return self.llm_assistant.suggest_api_workflow_improvements(workflow)
    
    return MockQTestAdvisor(mock_llm_assistant)