"""
LLM Assistant for API troubleshooting and workflow optimization.
"""

import json
import logging
from typing import Dict, Any, List, Optional

from ..models.error_models import (
    ErrorAnalysis, RecoveryStrategy, RemediationStep, 
    ErrorType, SeverityLevel, CodeExample
)
from ..models.workflow_models import (
    ApiOperation, OperationSequence, OptimizationSuggestions,
    OptimizationSuggestion, ReorderingSuggestion, WorkflowExplanation
)
from .llm_service import LLMService

logger = logging.getLogger(__name__)


class LLMAssistant:
    """
    AI assistant for API troubleshooting and workflow optimization.
    
    This assistant specializes in:
    1. API error analysis and remediation
    2. Workflow optimization for API integrations
    3. Plain language explanations of technical issues
    4. Code example generation for error handling
    """
    
    def __init__(self, llm_service: Optional[LLMService] = None):
        """
        Initialize the LLM Assistant.
        
        Args:
            llm_service: The LLM service to use. If not provided, a new one
                        will be created.
        """
        self.llm_service = llm_service or LLMService()
        self.queries = []
        self.loaded = False
        self.remediation_suggestions = {}
        
    def load_model(self) -> bool:
        """
        Load the language model.
        
        Returns:
            bool: True if the model was loaded successfully
        """
        success = self.llm_service.load_model()
        self.loaded = success
        return success
        
    def is_loaded(self) -> bool:
        """
        Check if the model is loaded.
        
        Returns:
            bool: True if the model is loaded
        """
        return self.loaded
        
    def analyze_error(self, error_data: Dict[str, Any]) -> ErrorAnalysis:
        """
        Analyze error data and identify root cause.
        
        Args:
            error_data: Error data including status code, message, etc.
            
        Returns:
            ErrorAnalysis: Analysis of the error
        """
        self.queries.append({"type": "error_analysis", "data": error_data})
        
        if not self.is_loaded():
            self.load_model()
        
        # Extract status code or default to 500
        status_code = error_data.get("status_code", 500)
        
        # In a production implementation, we would use the LLM to analyze the error
        # Here we use a rule-based approach for the prototype
        
        if status_code == 401:
            return ErrorAnalysis(
                error_type=ErrorType.AUTHENTICATION,
                root_cause="Invalid or expired API token",
                severity=SeverityLevel.HIGH,
                confidence=0.95,
                affected_component="api_auth",
                context=error_data,
                raw_error=error_data
            )
        elif status_code == 429:
            return ErrorAnalysis(
                error_type=ErrorType.RATE_LIMITING,
                root_cause="Too many requests to API",
                severity=SeverityLevel.MEDIUM,
                confidence=0.9,
                affected_component="api_client",
                context=error_data,
                raw_error=error_data
            )
        elif status_code == 404:
            return ErrorAnalysis(
                error_type=ErrorType.RESOURCE_NOT_FOUND,
                root_cause="Requested resource does not exist",
                severity=SeverityLevel.MEDIUM,
                confidence=0.85,
                affected_component="api_resource",
                context=error_data,
                raw_error=error_data
            )
        elif status_code == 403:
            return ErrorAnalysis(
                error_type=ErrorType.PERMISSION_DENIED,
                root_cause="Insufficient permissions to access resource",
                severity=SeverityLevel.HIGH,
                confidence=0.92,
                affected_component="api_auth",
                context=error_data,
                raw_error=error_data
            )
        elif status_code == 400:
            return ErrorAnalysis(
                error_type=ErrorType.VALIDATION_ERROR,
                root_cause="Invalid request parameters or payload",
                severity=SeverityLevel.MEDIUM,
                confidence=0.85,
                affected_component="api_validation",
                context=error_data,
                raw_error=error_data
            )
        elif status_code == 408:
            return ErrorAnalysis(
                error_type=ErrorType.TIMEOUT,
                root_cause="Request timeout - server took too long to respond",
                severity=SeverityLevel.MEDIUM,
                confidence=0.8,
                affected_component="api_server",
                context=error_data,
                raw_error=error_data
            )
        elif status_code >= 500:
            return ErrorAnalysis(
                error_type=ErrorType.SERVER_ERROR,
                root_cause="Server-side error",
                severity=SeverityLevel.HIGH,
                confidence=0.75,
                affected_component="api_server",
                context=error_data,
                raw_error=error_data
            )
        else:
            return ErrorAnalysis(
                error_type=ErrorType.UNKNOWN,
                root_cause="Generic server error",
                severity=SeverityLevel.MEDIUM, 
                confidence=0.7,
                affected_component="api_server",
                context=error_data,
                raw_error=error_data
            )
    
    def generate_remediation_steps(self, error_analysis: ErrorAnalysis) -> List[RemediationStep]:
        """
        Generate remediation steps based on error analysis.
        
        Args:
            error_analysis: Analysis of the error
            
        Returns:
            List[RemediationStep]: List of steps to remediate the error
        """
        self.queries.append({"type": "remediation", "data": error_analysis})
        
        if not self.is_loaded():
            self.load_model()
        
        # In production, we would use the LLM to generate remediation steps
        # Here we use a rule-based approach for the prototype
        
        error_type = error_analysis.error_type
        
        if error_type == ErrorType.AUTHENTICATION:
            return [
                RemediationStep(
                    step="Verify API token is correct",
                    details="Check that the API token is valid and has not expired",
                    code_example="console.log('Current token:', apiToken);",
                    priority=1
                ),
                RemediationStep(
                    step="Regenerate API token",
                    details="Generate a new API token in the provider's admin interface",
                    link="https://admin.provider.com/tokens",
                    priority=2
                ),
                RemediationStep(
                    step="Check permissions",
                    details="Ensure the token has the required permissions",
                    priority=3
                )
            ]
        elif error_type == ErrorType.RATE_LIMITING:
            return [
                RemediationStep(
                    step="Implement exponential backoff",
                    details="Add delay between requests that increases after each failure",
                    code_example="const delay = Math.min(Math.pow(2, retryCount) * 100, maxDelay);",
                    priority=1
                ),
                RemediationStep(
                    step="Reduce concurrency",
                    details="Lower the number of concurrent requests to the API",
                    priority=2
                ),
                RemediationStep(
                    step="Check rate limits documentation",
                    details="Review provider's documentation for rate limit specifications",
                    link="https://docs.provider.com/rate-limits",
                    priority=3
                )
            ]
        elif error_type == ErrorType.RESOURCE_NOT_FOUND:
            return [
                RemediationStep(
                    step="Verify resource ID",
                    details="Check that the resource ID exists and is correctly formatted",
                    priority=1
                ),
                RemediationStep(
                    step="Check resource path",
                    details="Ensure the API endpoint path is correct",
                    code_example="const url = `${baseUrl}/api/resources/${resourceId}`;",
                    priority=2
                ),
                RemediationStep(
                    step="Verify access permissions",
                    details="Confirm you have access to the resource",
                    priority=3
                )
            ]
        elif error_type == ErrorType.PERMISSION_DENIED:
            return [
                RemediationStep(
                    step="Check user permissions",
                    details="Verify the user has permissions to perform this operation",
                    priority=1
                ),
                RemediationStep(
                    step="Check API token scope",
                    details="Ensure the API token has the required scope for this operation",
                    code_example="console.log('Token scopes:', token.scopes);",
                    priority=2
                ),
                RemediationStep(
                    step="Contact administrator",
                    details="Request necessary permissions from your system administrator",
                    priority=3
                )
            ]
        elif error_type == ErrorType.VALIDATION_ERROR:
            return [
                RemediationStep(
                    step="Check request payload",
                    details="Verify the request payload matches the API specification",
                    code_example="console.log('Request payload:', JSON.stringify(payload, null, 2));",
                    priority=1
                ),
                RemediationStep(
                    step="Validate required fields",
                    details="Ensure all required fields are included and properly formatted",
                    priority=2
                ),
                RemediationStep(
                    step="Check documentation",
                    details="Review API documentation for correct parameter formats",
                    link="https://docs.provider.com/api-reference",
                    priority=3
                )
            ]
        else:
            return [
                RemediationStep(
                    step="Check server status",
                    details="Verify if the API service is experiencing issues",
                    priority=1
                ),
                RemediationStep(
                    step="Review request payload",
                    details="Ensure the request data is properly formatted",
                    priority=2
                ),
                RemediationStep(
                    step="Contact support",
                    details="Reach out to the provider's support team",
                    priority=3
                )
            ]
    
    def explain_error_in_plain_language(self, error_analysis: ErrorAnalysis) -> str:
        """
        Generate user-friendly explanation of the error.
        
        Args:
            error_analysis: Analysis of the error
            
        Returns:
            str: Plain language explanation of the error
        """
        self.queries.append({"type": "explanation", "data": error_analysis})
        
        if not self.is_loaded():
            self.load_model()
        
        error_type = error_analysis.error_type
        root_cause = error_analysis.root_cause
        
        # In production, we would use the LLM to generate explanations
        # Here we use pre-written templates for the prototype
        
        if error_type == ErrorType.AUTHENTICATION:
            return (
                "The system couldn't authenticate your request because the API token appears to be "
                "invalid or expired. This is similar to trying to enter a building with an expired "
                "access card. You'll need to get a new valid token to continue."
            )
        elif error_type == ErrorType.RATE_LIMITING:
            return (
                "Your requests are being blocked because you're sending too many too quickly. "
                "Think of this like calling someone repeatedly - eventually they'll stop picking up. "
                "You need to space out your requests to stay within the provider's limits."
            )
        elif error_type == ErrorType.RESOURCE_NOT_FOUND:
            return (
                "The system couldn't find what you're looking for. This is like trying to visit "
                "a web page that doesn't exist. Double-check that the resource ID is correct and "
                "that you have permission to access it."
            )
        elif error_type == ErrorType.PERMISSION_DENIED:
            return (
                "You don't have permission to access this resource or perform this action. "
                "This is like trying to enter a restricted area without proper clearance. "
                "You'll need to request access from an administrator to proceed."
            )
        elif error_type == ErrorType.VALIDATION_ERROR:
            return (
                "The system rejected your request because some of the information you provided "
                "doesn't match what it expects. This is like filling out a form incorrectly. "
                "Check the API documentation to ensure your request follows the required format."
            )
        elif error_type == ErrorType.TIMEOUT:
            return (
                "The server took too long to respond to your request. This could be due to "
                "heavy load on the server, a complex operation, or network issues. "
                "Try again later, or consider breaking up large requests into smaller ones."
            )
        elif error_type == ErrorType.SERVER_ERROR:
            return (
                "There's a problem on the server side that's preventing your request from being "
                "processed properly. This is like calling a store and finding their phone system "
                "is down. The issue is on their end, so you may need to wait for them to fix it "
                "or contact their support team."
            )
        else:
            return (
                f"There was a problem with the server: {root_cause}. This is typically an issue "
                "on the provider's side rather than with your request. You may want to try again "
                "later or contact their support team if the problem persists."
            )
    
    def generate_code_example(self, language: str, error_type: str, 
                             context: Optional[Dict[str, Any]] = None) -> str:
        """
        Generate code example to handle specific error type.
        
        Args:
            language: Programming language (javascript, python, etc.)
            error_type: Type of error to handle
            context: Additional context for code generation
            
        Returns:
            str: Code example for handling the error
        """
        context = context or {}
        self.queries.append({
            "type": "code_example", 
            "language": language, 
            "error_type": error_type, 
            "context": context
        })
        
        if not self.is_loaded():
            self.load_model()
        
        # In production, we would use the LLM to generate code examples
        # Here we use pre-written examples for the prototype
        
        if language == "javascript" and error_type == ErrorType.AUTHENTICATION:
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
        elif language == "javascript" and error_type == ErrorType.RATE_LIMITING:
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
        elif language == "python" and error_type == ErrorType.AUTHENTICATION:
            return """
            import time
            import requests
            from typing import Dict, Any
            
            def authenticate_with_retry(credentials: Dict[str, Any], max_retries: int = 3) -> str:
                # Authenticate with retry logic for handling auth failures
                retries = 0
                
                while retries < max_retries:
                    try:
                        response = requests.post("https://api.provider.com/auth", json=credentials)
                        response.raise_for_status()
                        return response.json()["token"]
                    except requests.exceptions.HTTPError as e:
                        retries += 1
                        if e.response.status_code == 401:
                            print(f"Authentication failed, attempt {retries} of {max_retries}")
                            if retries >= max_retries:
                                raise Exception("Authentication failed after maximum retry attempts")
                            # Slight delay before retrying
                            time.sleep(1)
                        else:
                            raise  # Rethrow if it's not an auth error
            """
        elif language == "python" and error_type == ErrorType.RATE_LIMITING:
            return """
            import time
            import math
            import requests
            from typing import Dict, Any, Optional
            
            class RateLimitedApiClient:
                # API client with built-in rate limiting handling
                
                def __init__(self, base_url: str, **options):
                    self.base_url = base_url
                    self.max_retries = options.get("max_retries", 5)
                    self.base_delay = options.get("base_delay", 1.0)
                    self.max_delay = options.get("max_delay", 30.0)
                    self.session = requests.Session()
                    
                def request(self, method: str, endpoint: str, 
                           params: Optional[Dict[str, Any]] = None,
                           json: Optional[Dict[str, Any]] = None,
                           **kwargs) -> requests.Response:
                    # Make a request with rate limit handling
                    retries = 0
                    url = f"{self.base_url}/{endpoint}"
                    
                    while True:
                        try:
                            response = self.session.request(
                                method, url, params=params, json=json, **kwargs
                            )
                            
                            if response.status_code == 429:
                                retries += 1
                                if retries > self.max_retries:
                                    raise Exception("Rate limit exceeded maximum retries")
                                
                                # Exponential backoff
                                delay = min(
                                    math.pow(2, retries) * self.base_delay,
                                    self.max_delay
                                )
                                
                                print(f"Rate limited, retrying in {delay}s")
                                time.sleep(delay)
                                continue
                                
                            response.raise_for_status()
                            return response
                        except requests.exceptions.RequestException as e:
                            if retries >= self.max_retries:
                                raise
                            retries += 1
            """
        else:
            return f"// Example for handling {error_type} errors in {language}\n// Not implemented yet"
    
    def suggest_api_workflow_improvements(self, current_workflow: Dict[str, Any]) -> Dict[str, Any]:
        """
        Suggest improvements to API workflow.
        
        Args:
            current_workflow: Current workflow configuration
            
        Returns:
            Dict[str, Any]: Suggested optimizations and reordering
        """
        self.queries.append({"type": "workflow_improvement", "data": current_workflow})
        
        if not self.is_loaded():
            self.load_model()
        
        # In production, we would use the LLM to analyze the workflow
        # Here we use a simplified logic for the prototype
        
        optimizations = []
        reordering = []
        
        # Parse operations and find optimization opportunities
        operations = current_workflow.get("operations", [])
        operation_ids = [op.get("id") for op in operations if isinstance(op, dict)]
        
        # Check for parallel execution candidates
        parallel_candidates = current_workflow.get("parallel_candidates", [])
        if parallel_candidates:
            optimizations.append({
                "type": "parallel_execution",
                "description": "These operations can be executed in parallel",
                "operations": parallel_candidates,
                "estimated_speedup": "40%"
            })
            
        # Check for cacheable operations
        cacheable_operations = current_workflow.get("cacheable_operations", [])
        if cacheable_operations:
            optimizations.append({
                "type": "caching",
                "description": "These responses can be cached to reduce API calls",
                "operations": cacheable_operations,
                "estimated_speedup": "25%"
            })
            
        # Check for batch candidates
        batch_candidates = current_workflow.get("batch_candidates", [])
        if batch_candidates:
            optimizations.append({
                "type": "batching",
                "description": "These operations can be batched into a single request",
                "operations": batch_candidates,
                "estimated_speedup": "30%"
            })
            
        # Generate reordering suggestions
        for idx, op in enumerate(operations):
            if isinstance(op, dict) and idx > 0 and idx % 2 == 0:
                reordering.append({
                    "operation": op.get("id"),
                    "current_position": idx,
                    "suggested_position": max(0, idx - 1),
                    "rationale": "Moving this earlier reduces dependency wait time"
                })
        
        return {
            "optimizations": optimizations,
            "reordering": reordering
        }

    def get_recovery_strategy(self, error_data: Dict[str, Any]) -> RecoveryStrategy:
        """
        Generate a complete recovery strategy for an error.
        
        Args:
            error_data: Error data including status code, message, etc.
            
        Returns:
            RecoveryStrategy: Complete strategy for recovering from the error
        """
        # First analyze the error
        analysis = self.analyze_error(error_data)
        
        # Generate remediation steps
        steps = self.generate_remediation_steps(analysis)
        
        # Generate plain language explanation
        explanation = self.explain_error_in_plain_language(analysis)
        
        # Estimate success probability based on confidence
        success_probability = min(0.95, analysis.confidence + 0.1)
        
        # Create and return the complete strategy
        return RecoveryStrategy(
            error_analysis=analysis,
            steps=steps,
            estimated_success_probability=success_probability,
            plain_language_explanation=explanation
        )