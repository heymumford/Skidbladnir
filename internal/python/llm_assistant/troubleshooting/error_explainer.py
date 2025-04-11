"""
Error Explainer for generating user-friendly explanations of technical errors.
"""

import json
import logging
from typing import Dict, Any, List, Optional

from ..models.troubleshooting_models import (
    ErrorAnalysis,
    ErrorExplanation,
    TechnicalLevel
)
from ..services.llm_service import LLMService
from ..services.knowledge_service import KnowledgeService

logger = logging.getLogger(__name__)


class ErrorExplainer:
    """
    Generator for user-friendly error explanations.
    
    This component explains technical errors in plain language,
    making them understandable to users with varying technical backgrounds.
    """
    
    def __init__(self, llm_service: LLMService, knowledge_service: KnowledgeService):
        """
        Initialize the Error Explainer.
        
        Args:
            llm_service: The LLM service for generating explanations
            knowledge_service: The knowledge service for error patterns
        """
        self.llm_service = llm_service
        self.knowledge_service = knowledge_service
        
    def explain(self, error_analysis: ErrorAnalysis, 
               technical_level: TechnicalLevel = TechnicalLevel.INTERMEDIATE) -> ErrorExplanation:
        """
        Generate a user-friendly explanation of an error.
        
        Args:
            error_analysis: Analysis of the error
            technical_level: The technical level of the user
            
        Returns:
            ErrorExplanation: User-friendly explanation of the error
        """
        # Try pattern-based explanation first
        pattern_explanation = self._pattern_based_explanation(error_analysis, technical_level)
        
        # If pattern-based explanation exists, use it
        if pattern_explanation:
            logger.debug(f"Used pattern-based explanation for {error_analysis.error_type}")
            return pattern_explanation
        
        # Otherwise, use LLM-based explanation
        return self._llm_based_explanation(error_analysis, technical_level)
    
    def _pattern_based_explanation(self, error_analysis: ErrorAnalysis,
                                 technical_level: TechnicalLevel) -> Optional[ErrorExplanation]:
        """
        Generate explanation based on known patterns.
        
        Args:
            error_analysis: Analysis of the error
            technical_level: The technical level of the user
            
        Returns:
            Optional[ErrorExplanation]: Explanation of the error, or None if no pattern matches
        """
        # Get explanation based on error type and technical level
        if error_analysis.error_type == "authentication":
            if technical_level == TechnicalLevel.BASIC:
                explanation = (
                    "The system couldn't recognize you because your digital ID (called an API token) "
                    "is either incorrect or has expired. Think of it like trying to enter a building "
                    "with an expired access card. You'll need to get a new valid ID to continue."
                )
                analogy = "It's like trying to use an expired password to log into a website."
                prevention_tips = [
                    "Regularly update your API tokens before they expire",
                    "Store your tokens in a secure location"
                ]
                related_concepts = ["API Keys", "Authentication", "Authorization"]
            elif technical_level == TechnicalLevel.INTERMEDIATE:
                explanation = (
                    "The system couldn't authenticate your request because the API token appears to be "
                    "invalid or expired. This is similar to trying to enter a building with an expired "
                    "access card. You'll need to get a new valid token to continue."
                )
                analogy = "It's like trying to use an expired credit card for a purchase."
                prevention_tips = [
                    "Implement token rotation before expiration",
                    "Store tokens securely using environment variables or a secrets manager",
                    "Set up alerts for token expiration"
                ]
                related_concepts = ["OAuth", "JWT", "Token-based Authentication"]
            else:  # Technical level is ADVANCED
                explanation = (
                    "The authentication mechanism rejected the provided credentials, likely due to "
                    "an invalid or expired API token. This 401 Unauthorized response indicates that "
                    "the request lacks valid authentication credentials for the target resource. "
                    "You need to regenerate a valid token with the appropriate scopes and permissions."
                )
                analogy = "It's equivalent to a certificate validation failure in TLS."
                prevention_tips = [
                    "Implement automatic token refresh logic",
                    "Use a token manager to handle rotation and expiration",
                    "Set up monitoring for authentication failures",
                    "Consider using a more robust authentication method like OAuth with refresh tokens"
                ]
                related_concepts = ["JWT Claims", "Token Scopes", "Credential Management", "RBAC"]
            
            return ErrorExplanation(
                error_analysis=error_analysis,
                explanation=explanation,
                technical_level=technical_level,
                analogy=analogy,
                common_mistake=True,
                prevention_tips=prevention_tips,
                related_concepts=related_concepts
            )
            
        elif error_analysis.error_type == "rate_limit":
            if technical_level == TechnicalLevel.BASIC:
                explanation = (
                    "The system is telling you that you're making too many requests too quickly. "
                    "It's like calling someone repeatedly - eventually they'll stop answering "
                    "until you give them a break. You need to wait a little while and try again more slowly."
                )
                analogy = "It's like being asked to wait in line because the store is too crowded."
                prevention_tips = [
                    "Spread out your requests over a longer period",
                    "Try again after waiting a few minutes"
                ]
                related_concepts = ["Request Limits", "Waiting Time"]
            elif technical_level == TechnicalLevel.INTERMEDIATE:
                explanation = (
                    "Your requests are being blocked because you're sending too many too quickly. "
                    "APIs implement rate limits to ensure fair usage and server stability. "
                    "You need to space out your requests to stay within the provider's limits, "
                    "or implement a backoff strategy that automatically slows down when needed."
                )
                analogy = "It's like traffic congestion control on a highway - when too many cars try to enter at once, some are made to wait."
                prevention_tips = [
                    "Add delays between API requests",
                    "Implement simple retry logic with increasing delays",
                    "Reduce the number of concurrent requests",
                    "Check the API documentation for rate limit specifications"
                ]
                related_concepts = ["Throttling", "Concurrency Control", "Backoff Strategy"]
            else:  # Technical level is ADVANCED
                explanation = (
                    "The API is enforcing rate limits due to excessive request frequency. This 429 Too Many Requests "
                    "response indicates you've exceeded the allowed request quota. To resolve this, implement an "
                    "exponential backoff strategy with jitter for retries, and consider client-side rate limiting "
                    "to prevent hitting server limits. You might also want to investigate batching operations or "
                    "caching responses to reduce the total number of API calls needed."
                )
                analogy = "It's comparable to TCP's congestion control algorithms that dynamically adjust transmission rates based on network capacity."
                prevention_tips = [
                    "Implement exponential backoff with jitter",
                    "Use a token bucket algorithm for client-side rate limiting",
                    "Implement request batching to reduce total API calls",
                    "Set up caching for frequently accessed resources",
                    "Consider upgrading API tier if available"
                ]
                related_concepts = ["Exponential Backoff", "Token Bucket Algorithm", "Request Coalescing", "Circuit Breaker Pattern", "Bulkhead Pattern"]
            
            return ErrorExplanation(
                error_analysis=error_analysis,
                explanation=explanation,
                technical_level=technical_level,
                analogy=analogy,
                common_mistake=True,
                prevention_tips=prevention_tips,
                related_concepts=related_concepts
            )
            
        elif error_analysis.error_type == "resource_not_found":
            if technical_level == TechnicalLevel.BASIC:
                explanation = (
                    "The system couldn't find what you're looking for. It's like trying to visit "
                    "a web page that doesn't exist. Double-check that you're looking for the right "
                    "thing and that you've spelled its name or ID correctly."
                )
                analogy = "It's like trying to call a phone number that is no longer in service."
                prevention_tips = [
                    "Check that the resource ID is correct",
                    "Verify that the resource hasn't been deleted"
                ]
                related_concepts = ["Resources", "Identifiers"]
            elif technical_level == TechnicalLevel.INTERMEDIATE:
                explanation = (
                    "The system couldn't find the resource you requested. This usually happens when "
                    "the resource ID is incorrect, the resource has been deleted, or you don't have "
                    "permission to see it. Check that the ID is correct and that the resource still exists."
                )
                analogy = "It's like looking for a book in a library using the wrong reference number."
                prevention_tips = [
                    "Verify resource IDs before using them",
                    "Implement error handling for missing resources",
                    "Check if the resource exists before attempting to access it"
                ]
                related_concepts = ["REST Resources", "CRUD Operations", "Resource Identifiers"]
            else:  # Technical level is ADVANCED
                explanation = (
                    "The API returned a 404 Not Found response, indicating that the requested resource "
                    "doesn't exist at the specified location. This could be due to an invalid identifier, "
                    "a resource that has been deleted, a misformatted URL path, or insufficient permissions "
                    "causing the server to mask the resource's existence. Consider implementing existence "
                    "checks before operations and having a fallback strategy for missing resources."
                )
                analogy = "It's analogous to a DNS resolution failure where the record doesn't exist."
                prevention_tips = [
                    "Implement HEAD requests to check existence before performing operations",
                    "Use defensive programming with proper error handling for missing resources",
                    "Consider implementing a create-if-not-exists pattern when appropriate",
                    "Validate resource IDs against a schema before sending requests",
                    "Log and monitor 404 errors to detect patterns"
                ]
                related_concepts = ["Idempotent Operations", "Resource Lifecycle", "Optimistic Concurrency", "Eventual Consistency"]
            
            return ErrorExplanation(
                error_analysis=error_analysis,
                explanation=explanation,
                technical_level=technical_level,
                analogy=analogy,
                common_mistake=True,
                prevention_tips=prevention_tips,
                related_concepts=related_concepts
            )
        
        # No pattern match for this error type
        return None
    
    def _llm_based_explanation(self, error_analysis: ErrorAnalysis,
                             technical_level: TechnicalLevel) -> ErrorExplanation:
        """
        Generate explanation using the LLM.
        
        Args:
            error_analysis: Analysis of the error
            technical_level: The technical level of the user
            
        Returns:
            ErrorExplanation: Explanation of the error
        """
        # Create prompt for the LLM
        error_json = error_analysis.to_dict()
        
        prompt = (
            f"Explain this API error in plain language for a user with {technical_level} technical knowledge:\n\n"
            f"{json.dumps(error_json, indent=2)}\n\n"
            f"Include:\n"
            f"1. A clear explanation of what the error means\n"
            f"2. A real-world analogy to help understand the concept\n"
            f"3. Tips to prevent this error in the future\n"
            f"4. Related technical concepts\n\n"
            f"Provide your explanation in JSON format with the following structure:\n"
            f"{{\"explanation\": \"Plain language explanation\",\n"
            f"\"analogy\": \"Real-world analogy\",\n"
            f"\"common_mistake\": true/false,\n"
            f"\"prevention_tips\": [\"Tip 1\", \"Tip 2\"],\n"
            f"\"related_concepts\": [\"Concept 1\", \"Concept 2\"]}}"
        )
        
        # Query the LLM
        response = self.llm_service.query(
            prompt=prompt,
            system_prompt=(
                f"You are an expert API educator who explains technical concepts in clear, understandable language. "
                f"Your audience has {technical_level} technical knowledge. Use appropriate analogies and plain language "
                f"to help them understand API errors. Return your explanation in strict JSON format as specified in the prompt."
            ),
            temperature=0.4
        )
        
        # Parse the response
        try:
            response_json = json.loads(response)
        except json.JSONDecodeError:
            # If parsing fails, extract JSON from the text response
            logger.warning(f"Failed to parse JSON response: {response[:100]}...")
            
            # Attempt to extract JSON from the response
            json_start = response.find("{")
            json_end = response.rfind("}") + 1
            
            if json_start >= 0 and json_end > json_start:
                json_str = response[json_start:json_end]
                try:
                    response_json = json.loads(json_str)
                except json.JSONDecodeError:
                    # Fall back to default response
                    return self._default_explanation(error_analysis, technical_level)
            else:
                # Fall back to default response
                return self._default_explanation(error_analysis, technical_level)
        
        # Create the explanation
        return ErrorExplanation(
            error_analysis=error_analysis,
            explanation=response_json.get("explanation", "No explanation provided"),
            technical_level=technical_level,
            analogy=response_json.get("analogy"),
            common_mistake=response_json.get("common_mistake", False),
            prevention_tips=response_json.get("prevention_tips", []),
            related_concepts=response_json.get("related_concepts", [])
        )
    
    def _default_explanation(self, error_analysis: ErrorAnalysis,
                           technical_level: TechnicalLevel) -> ErrorExplanation:
        """
        Generate a default explanation when other methods fail.
        
        Args:
            error_analysis: Analysis of the error
            technical_level: The technical level of the user
            
        Returns:
            ErrorExplanation: Default explanation of the error
        """
        # Default explanations for different error types
        if error_analysis.error_type == "authentication":
            explanation = (
                "The system couldn't verify your identity. This usually happens when your API token "
                "is incorrect or has expired. You'll need to get a new valid token to continue."
            )
            analogy = "It's like trying to enter a building with an expired access card."
            prevention_tips = ["Regularly update your API tokens", "Store tokens securely"]
            related_concepts = ["API Keys", "Authentication", "Authorization"]
        elif error_analysis.error_type == "rate_limit":
            explanation = (
                "You're sending too many requests too quickly, and the system is asking you to slow down. "
                "Try spacing out your requests or implementing a delay between them."
            )
            analogy = "It's like being asked to wait in line because too many people are trying to enter at once."
            prevention_tips = ["Add delays between requests", "Implement retry logic with backoff"]
            related_concepts = ["Throttling", "Backoff Strategy", "Concurrency"]
        elif error_analysis.error_type == "resource_not_found":
            explanation = (
                "The system couldn't find what you're looking for. Check that the ID or path is correct "
                "and that the resource hasn't been deleted."
            )
            analogy = "It's like trying to visit a web page that doesn't exist."
            prevention_tips = ["Verify resource IDs", "Check if resources exist before accessing them"]
            related_concepts = ["Resource IDs", "REST Resources", "CRUD Operations"]
        elif error_analysis.error_type == "permission":
            explanation = (
                "You don't have permission to perform this action. Contact your administrator to "
                "request the necessary permissions."
            )
            analogy = "It's like being stopped at a door that requires a higher security clearance."
            prevention_tips = ["Check permissions before attempting operations", "Request necessary permissions in advance"]
            related_concepts = ["Access Control", "RBAC", "Permissions"]
        elif error_analysis.error_type == "validation":
            explanation = (
                "The data you submitted doesn't meet the requirements. Check that all required fields "
                "are present and formatted correctly."
            )
            analogy = "It's like filling out a form incorrectly and having it rejected."
            prevention_tips = ["Validate data before submitting", "Check the API documentation for field requirements"]
            related_concepts = ["Data Validation", "Schema", "Required Fields"]
        elif error_analysis.error_type == "server_error":
            explanation = (
                "There's a problem on the server side that's preventing your request from being processed. "
                "This isn't your fault, and you may want to try again later or contact support."
            )
            analogy = "It's like calling a store and finding their phone system is down."
            prevention_tips = ["Implement retry logic for temporary failures", "Contact support if the issue persists"]
            related_concepts = ["Server Reliability", "Fault Tolerance", "Error Handling"]
        else:
            explanation = (
                f"An error occurred: {error_analysis.root_cause}. This might require investigating the specific "
                f"details of the error to determine the exact cause."
            )
            analogy = "It's like encountering an unexpected obstacle on your path."
            prevention_tips = ["Check the complete error message for details", "Consult the API documentation"]
            related_concepts = ["Error Handling", "Debugging", "Logging"]
        
        return ErrorExplanation(
            error_analysis=error_analysis,
            explanation=explanation,
            technical_level=technical_level,
            analogy=analogy,
            common_mistake=False,
            prevention_tips=prevention_tips,
            related_concepts=related_concepts
        )