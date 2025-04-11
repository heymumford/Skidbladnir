"""
Base LLM Service for the Troubleshooting Assistant.
"""

import os
import logging
import time
import json
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


class LLMService:
    """
    Service for interacting with the local LLM model.
    
    This is a base implementation that serves as a framework
    for interfacing with a locally running LLM. In production,
    this would connect to a locally running inference server.
    """
    
    def __init__(self, model_name: str = "llama3-8b-q4", model_path: Optional[str] = None):
        """
        Initialize the LLM service.
        
        Args:
            model_name: Name of the model to use
            model_path: Path to the model files (defaults to ~/.skidbladnir/models)
        """
        self.model_name = model_name
        self.model_path = model_path or os.path.join(
            os.path.expanduser("~"),
            ".skidbladnir",
            "models"
        )
        self.loaded = False
        self.queries = []
        self.max_context_length = 8192
        self.last_query_time = 0
        
    def load_model(self) -> bool:
        """
        Load the language model.
        
        Returns:
            bool: True if the model was loaded successfully
        """
        logger.info(f"Loading model {self.model_name}")
        try:
            # In a real implementation, this would load the model
            # For example, using llama-cpp-python, transformers, etc.
            
            # Simulate loading time
            time.sleep(0.1)
            self.loaded = True
            logger.info(f"Model {self.model_name} loaded successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to load model: {str(e)}")
            self.loaded = False
            return False
            
    def is_loaded(self) -> bool:
        """
        Check if the model is loaded.
        
        Returns:
            bool: True if the model is loaded
        """
        return self.loaded
        
    def unload_model(self) -> bool:
        """
        Unload the model to free resources.
        
        Returns:
            bool: True if the model was unloaded successfully
        """
        logger.info(f"Unloading model {self.model_name}")
        try:
            # In a real implementation, this would unload the model
            # For example: del self.model
            
            # Simulate unloading
            self.loaded = False
            return True
        except Exception as e:
            logger.error(f"Failed to unload model: {str(e)}")
            return False
    
    def query(self, prompt: str, 
              system_prompt: Optional[str] = None,
              temperature: float = 0.7,
              max_tokens: int = 1000) -> str:
        """
        Query the model with a prompt.
        
        Args:
            prompt: The user prompt to send to the model
            system_prompt: Optional system prompt for controlling the model's behavior
            temperature: Controls randomness (0.0 to 1.0)
            max_tokens: Maximum number of tokens to generate
            
        Returns:
            str: The model's response
            
        Raises:
            RuntimeError: If the model is not loaded
        """
        if not self.is_loaded():
            raise RuntimeError("Model not loaded. Call load_model() first.")
            
        # Record the query
        self.queries.append({
            "prompt": prompt,
            "system_prompt": system_prompt,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "timestamp": time.time()
        })
        self.last_query_time = time.time()
        
        logger.debug(f"Querying model with prompt: {prompt[:50]}...")
        
        # In a real implementation, this would query the model
        # For this demonstration, provide mock responses
        
        if "troubleshoot" in prompt.lower() or "error" in prompt.lower():
            return self._generate_error_response(prompt)
        elif "code example" in prompt.lower() or "code snippet" in prompt.lower():
            return self._generate_code_example_response(prompt)
        elif "explain" in prompt.lower() or "what is" in prompt.lower():
            return self._generate_explanation_response(prompt)
        else:
            return f"I analyzed your query about: '{prompt[:30]}...' and here's my response. This is a simulated response from the LLM service."
    
    def _generate_error_response(self, prompt: str) -> str:
        """Generate an error analysis response."""
        if "authentication" in prompt.lower() or "401" in prompt:
            return json.dumps({
                "error_type": "authentication",
                "root_cause": "The API token provided is invalid or has expired",
                "severity": "high",
                "confidence": 0.95,
                "affected_component": "authentication",
                "remediation_steps": [
                    "Check that the API token is correctly entered",
                    "Generate a new API token in the provider's admin interface",
                    "Ensure the user account has the required permissions"
                ]
            }, indent=2)
        elif "rate limit" in prompt.lower() or "429" in prompt:
            return json.dumps({
                "error_type": "rate_limit",
                "root_cause": "Too many requests were sent to the API in a short time",
                "severity": "medium",
                "confidence": 0.9,
                "affected_component": "api_client",
                "remediation_steps": [
                    "Implement exponential backoff between requests",
                    "Reduce concurrency settings",
                    "Check the API documentation for rate limit specifications"
                ]
            }, indent=2)
        else:
            return json.dumps({
                "error_type": "unknown",
                "root_cause": "Unable to determine root cause from the provided information",
                "severity": "medium",
                "confidence": 0.6,
                "affected_component": "unknown",
                "remediation_steps": [
                    "Check application logs for more detailed error information",
                    "Verify network connectivity to the API endpoint",
                    "Contact support with a detailed description of the issue"
                ]
            }, indent=2)
    
    def _generate_code_example_response(self, prompt: str) -> str:
        """Generate a code example response."""
        if "authentication" in prompt.lower():
            return (
                "```javascript\n"
                "// Authentication with retry logic for handling token expiration\n"
                "async function authenticateWithRetry(credentials, maxRetries = 3) {\n"
                "  let retries = 0;\n"
                "  \n"
                "  while (retries < maxRetries) {\n"
                "    try {\n"
                "      const response = await api.authenticate(credentials);\n"
                "      return response.token;\n"
                "    } catch (error) {\n"
                "      retries++;\n"
                "      if (error.status === 401) {\n"
                "        console.log(`Authentication failed, attempt ${retries} of ${maxRetries}`);\n"
                "        if (retries >= maxRetries) {\n"
                "          throw new Error('Authentication failed after maximum retry attempts');\n"
                "        }\n"
                "        // Slight delay before retrying\n"
                "        await new Promise(resolve => setTimeout(resolve, 1000));\n"
                "      } else {\n"
                "        throw error; // Rethrow if it's not an auth error\n"
                "      }\n"
                "    }\n"
                "  }\n"
                "}\n"
                "```"
            )
        elif "rate limit" in prompt.lower():
            return (
                "```javascript\n"
                "// API client with exponential backoff for rate limiting\n"
                "class RateLimitedApiClient {\n"
                "  constructor(baseUrl, options = {}) {\n"
                "    this.baseUrl = baseUrl;\n"
                "    this.maxRetries = options.maxRetries || 5;\n"
                "    this.baseDelay = options.baseDelay || 1000;\n"
                "    this.maxDelay = options.maxDelay || 30000;\n"
                "  }\n"
                "  \n"
                "  async request(endpoint, options = {}) {\n"
                "    let retries = 0;\n"
                "    \n"
                "    while (true) {\n"
                "      try {\n"
                "        const response = await fetch(`${this.baseUrl}/${endpoint}`, options);\n"
                "        \n"
                "        if (response.status === 429) {\n"
                "          retries++;\n"
                "          if (retries > this.maxRetries) {\n"
                "            throw new Error('Rate limit exceeded maximum retries');\n"
                "          }\n"
                "          \n"
                "          // Exponential backoff\n"
                "          const delay = Math.min(\n"
                "            Math.pow(2, retries) * this.baseDelay, \n"
                "            this.maxDelay\n"
                "          );\n"
                "          \n"
                "          console.log(`Rate limited, retrying in ${delay}ms`);\n"
                "          await new Promise(resolve => setTimeout(resolve, delay));\n"
                "          continue;\n"
                "        }\n"
                "        \n"
                "        return response;\n"
                "      } catch (error) {\n"
                "        if (retries >= this.maxRetries) {\n"
                "          throw error;\n"
                "        }\n"
                "        retries++;\n"
                "      }\n"
                "    }\n"
                "  }\n"
                "}\n"
                "```"
            )
        else:
            return (
                "```javascript\n"
                "// Generic error handling example\n"
                "async function handleApiRequest(endpoint, options = {}) {\n"
                "  try {\n"
                "    const response = await fetch(endpoint, options);\n"
                "    \n"
                "    if (!response.ok) {\n"
                "      const errorData = await response.json().catch(() => ({}));\n"
                "      \n"
                "      // Handle different error types\n"
                "      switch (response.status) {\n"
                "        case 401:\n"
                "          throw new Error('Authentication failed. Please check your API token.');\n"
                "        case 403:\n"
                "          throw new Error('Permission denied. You don\\'t have access to this resource.');\n"
                "        case 404:\n"
                "          throw new Error('Resource not found. Please check the ID or path.');\n"
                "        case 429:\n"
                "          throw new Error('Rate limit exceeded. Please try again later.');\n"
                "        default:\n"
                "          throw new Error(`API error: ${errorData.message || response.statusText}`);\n"
                "      }\n"
                "    }\n"
                "    \n"
                "    return await response.json();\n"
                "  } catch (error) {\n"
                "    console.error('API request failed:', error);\n"
                "    throw error;\n"
                "  }\n"
                "}\n"
                "```"
            )
    
    def _generate_explanation_response(self, prompt: str) -> str:
        """Generate an explanation response."""
        if "authentication" in prompt.lower():
            return (
                "Authentication errors (usually HTTP 401) occur when the system can't verify your identity. "
                "This is typically because your API token is invalid, expired, or missing. "
                "\n\n"
                "Think of it like trying to enter a building with an expired access card. The system recognizes "
                "that you're trying to identify yourself, but it can't confirm you're authorized to access the resource. "
                "\n\n"
                "To fix this issue, you'll need to generate a new valid token in the provider's admin interface and "
                "update your configuration to use this new token."
            )
        elif "rate limit" in prompt.lower():
            return (
                "Rate limiting errors (usually HTTP 429) occur when you've sent too many requests to the API in a short period. "
                "APIs implement rate limits to ensure fair usage and server stability. "
                "\n\n"
                "It's like calling someone repeatedly - eventually, they'll stop picking up because you're calling too frequently. "
                "The API is telling you to slow down your requests. "
                "\n\n"
                "To fix this issue, you should: "
                "1. Implement exponential backoff (progressively longer delays between retries) "
                "2. Reduce the concurrency settings in your application "
                "3. Check the API documentation for specific rate limit guidelines"
            )
        else:
            return (
                "I've analyzed your question and here's what I can tell you: "
                "\n\n"
                "API errors generally fall into several categories: authentication issues, permission problems, "
                "rate limiting, resource not found errors, validation errors, and server-side issues. "
                "\n\n"
                "Each type of error requires a different troubleshooting approach. The most important first step "
                "is to carefully read the error message and check the HTTP status code, which provides valuable "
                "clues about what went wrong. "
                "\n\n"
                "For more specific guidance, please provide details about the error you're encountering, "
                "including the error message, status code, and the context in which it occurs."
            )