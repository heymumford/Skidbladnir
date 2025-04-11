"""
Remediation Generator for creating step-by-step troubleshooting instructions.
"""

import json
import logging
from typing import Dict, Any, List, Optional

from ..models.troubleshooting_models import (
    ErrorAnalysis,
    RemediationSuggestion,
    RemediationAction,
    TechnicalLevel
)
from ..models.knowledge_models import (
    KnowledgeType
)
from ..services.llm_service import LLMService
from ..services.knowledge_service import KnowledgeService

logger = logging.getLogger(__name__)


class RemediationGenerator:
    """
    Generator for error remediation suggestions.
    
    This component generates step-by-step instructions
    for resolving API errors based on error analysis.
    """
    
    def __init__(self, llm_service: LLMService, knowledge_service: KnowledgeService):
        """
        Initialize the Remediation Generator.
        
        Args:
            llm_service: The LLM service for generating remediation steps
            knowledge_service: The knowledge service for troubleshooting guides
        """
        self.llm_service = llm_service
        self.knowledge_service = knowledge_service
        
    def generate(self, error_analysis: ErrorAnalysis, 
                technical_level: TechnicalLevel = TechnicalLevel.INTERMEDIATE) -> RemediationSuggestion:
        """
        Generate remediation steps for an error.
        
        Args:
            error_analysis: Analysis of the error
            technical_level: The technical level of the user
            
        Returns:
            RemediationSuggestion: Suggested remediation with ordered steps
        """
        # Try pattern-based remediation first
        pattern_remediation = self._pattern_based_remediation(error_analysis, technical_level)
        
        # If pattern-based remediation exists and has more than 3 steps, use it
        if pattern_remediation and len(pattern_remediation.steps) >= 3:
            logger.debug(f"Used pattern-based remediation for {error_analysis.error_type}")
            return pattern_remediation
        
        # Otherwise, use LLM-based remediation
        llm_remediation = self._llm_based_remediation(error_analysis, technical_level)
        
        # If pattern-based remediation exists, combine the two
        if pattern_remediation:
            # Get unique steps from both remediations
            all_steps = []
            step_texts = set()
            
            # Start with pattern-based remediation steps
            for step in pattern_remediation.steps:
                all_steps.append(step)
                step_texts.add(step.action)
            
            # Add LLM steps if they're not duplicates
            for step in llm_remediation.steps:
                if step.action not in step_texts:
                    all_steps.append(step)
                    step_texts.add(step.action)
            
            # Sort by priority
            all_steps.sort(key=lambda s: s.priority)
            
            # Create combined remediation
            return RemediationSuggestion(
                error_analysis=error_analysis,
                steps=all_steps,
                user_level=technical_level,
                success_probability=max(
                    pattern_remediation.success_probability,
                    llm_remediation.success_probability
                ),
                estimated_time=pattern_remediation.estimated_time or llm_remediation.estimated_time,
                side_effects=list(set(pattern_remediation.side_effects + llm_remediation.side_effects)),
                alternative_approaches=list(set(
                    pattern_remediation.alternative_approaches + llm_remediation.alternative_approaches
                )),
                references=list(set(pattern_remediation.references + llm_remediation.references))
            )
        
        # If no pattern-based remediation, just return the LLM remediation
        return llm_remediation
    
    def _pattern_based_remediation(self, error_analysis: ErrorAnalysis,
                                 technical_level: TechnicalLevel) -> Optional[RemediationSuggestion]:
        """
        Generate remediation steps based on known patterns.
        
        Args:
            error_analysis: Analysis of the error
            technical_level: The technical level of the user
            
        Returns:
            Optional[RemediationSuggestion]: Suggested remediation, or None if no pattern matches
        """
        # Get remediation steps based on error type
        if error_analysis.error_type == "authentication":
            steps = self._authentication_remediation(error_analysis, technical_level)
            success_probability = 0.9
            estimated_time = "5-10 minutes"
            side_effects = ["Will need to update API token in all applications using it"]
            alternative_approaches = ["Use OAuth flow instead of API tokens if available"]
            references = ["API authentication documentation"]
        elif error_analysis.error_type == "rate_limit":
            steps = self._rate_limit_remediation(error_analysis, technical_level)
            success_probability = 0.85
            estimated_time = "15-30 minutes"
            side_effects = ["Slower initial response time due to backoff"]
            alternative_approaches = ["Consider a more premium API tier with higher limits"]
            references = ["API rate limiting documentation", "Client implementation guidelines"]
        elif error_analysis.error_type == "permission":
            steps = self._permission_remediation(error_analysis, technical_level)
            success_probability = 0.8
            estimated_time = "10-20 minutes"
            side_effects = ["May need administrator approval", "Could expose additional resources"]
            alternative_approaches = ["Use a more privileged account", "Request specific resource access"]
            references = ["Permission management documentation"]
        elif error_analysis.error_type == "resource_not_found":
            steps = self._not_found_remediation(error_analysis, technical_level)
            success_probability = 0.85
            estimated_time = "5-15 minutes"
            side_effects = []
            alternative_approaches = ["Create the resource if it doesn't exist"]
            references = ["Resource management documentation"]
        elif error_analysis.error_type == "validation":
            steps = self._validation_remediation(error_analysis, technical_level)
            success_probability = 0.9
            estimated_time = "10-30 minutes"
            side_effects = []
            alternative_approaches = ["Use a schema validator before sending requests"]
            references = ["API schema documentation", "Data validation best practices"]
        else:
            # No specific pattern for this error type
            return None
        
        # If no steps were generated, return None
        if not steps:
            return None
        
        # Create remediation suggestion
        return RemediationSuggestion(
            error_analysis=error_analysis,
            steps=steps,
            user_level=technical_level,
            success_probability=success_probability,
            estimated_time=estimated_time,
            side_effects=side_effects,
            alternative_approaches=alternative_approaches,
            references=references
        )
    
    def _authentication_remediation(self, error_analysis: ErrorAnalysis,
                                  technical_level: TechnicalLevel) -> List[RemediationAction]:
        """
        Generate remediation steps for authentication errors.
        
        Args:
            error_analysis: Analysis of the error
            technical_level: The technical level of the user
            
        Returns:
            List[RemediationAction]: Remediation steps
        """
        # Collect code samples and documentation links
        code_samples = self.knowledge_service.get_code_samples(["authentication", "auth", "token", "401"])
        code_snippet = code_samples[0].content if code_samples else None
        
        # Basic steps for all technical levels
        basic_steps = [
            RemediationAction(
                action="Verify API token is correct",
                details="Check that the API token is valid and has not expired",
                priority=1,
                estimated_success_probability=0.4,
                code_snippet=None,
                documentation_link=None,
                requires_admin=False,
                requires_restart=False
            ),
            RemediationAction(
                action="Regenerate API token",
                details=(
                    f"Generate a new API token in the {error_analysis.provider} admin interface "
                    f"and update your configuration to use the new token"
                ),
                priority=2,
                estimated_success_probability=0.8,
                code_snippet=None,
                documentation_link=f"https://docs.example.com/{error_analysis.provider.lower()}/tokens",
                requires_admin=True,
                requires_restart=False
            )
        ]
        
        # Add technical-level specific steps
        if technical_level == TechnicalLevel.BASIC:
            basic_steps.append(
                RemediationAction(
                    action="Contact support team",
                    details="If the above steps don't resolve the issue, contact your IT support team",
                    priority=3,
                    estimated_success_probability=0.95,
                    code_snippet=None,
                    documentation_link=None,
                    requires_admin=False,
                    requires_restart=False
                )
            )
        elif technical_level == TechnicalLevel.INTERMEDIATE:
            basic_steps.extend([
                RemediationAction(
                    action="Check permissions",
                    details="Ensure the API token has the required permissions for this operation",
                    priority=3,
                    estimated_success_probability=0.5,
                    code_snippet=None,
                    documentation_link=None,
                    requires_admin=True,
                    requires_restart=False
                ),
                RemediationAction(
                    action="Verify request headers",
                    details="Ensure the API token is correctly included in the Authorization header",
                    priority=4,
                    estimated_success_probability=0.6,
                    code_snippet="Authorization: Bearer YOUR_API_TOKEN",
                    documentation_link=None,
                    requires_admin=False,
                    requires_restart=False
                )
            ])
        elif technical_level == TechnicalLevel.ADVANCED:
            basic_steps.extend([
                RemediationAction(
                    action="Implement token refresh logic",
                    details="Add logic to automatically refresh expired tokens",
                    priority=3,
                    estimated_success_probability=0.7,
                    code_snippet=code_snippet,
                    documentation_link=None,
                    requires_admin=False,
                    requires_restart=False
                ),
                RemediationAction(
                    action="Check token scope and permissions",
                    details="Verify the token has the correct scope and permissions for this operation",
                    priority=4,
                    estimated_success_probability=0.5,
                    code_snippet=None,
                    documentation_link=None,
                    requires_admin=True,
                    requires_restart=False
                ),
                RemediationAction(
                    action="Investigate token storage and security",
                    details="Ensure tokens are securely stored and not exposed in logs or code",
                    priority=5,
                    estimated_success_probability=0.3,
                    code_snippet=None,
                    documentation_link=None,
                    requires_admin=False,
                    requires_restart=False
                )
            ])
        
        return basic_steps
    
    def _rate_limit_remediation(self, error_analysis: ErrorAnalysis,
                              technical_level: TechnicalLevel) -> List[RemediationAction]:
        """
        Generate remediation steps for rate limit errors.
        
        Args:
            error_analysis: Analysis of the error
            technical_level: The technical level of the user
            
        Returns:
            List[RemediationAction]: Remediation steps
        """
        # Collect code samples and documentation links
        code_samples = self.knowledge_service.get_code_samples(["rate-limit", "backoff", "throttle", "429"])
        code_snippet = code_samples[0].content if code_samples else None
        
        # Basic steps for all technical levels
        basic_steps = [
            RemediationAction(
                action="Reduce request frequency",
                details="Make fewer requests to the API in a short time period",
                priority=1,
                estimated_success_probability=0.6,
                code_snippet=None,
                documentation_link=None,
                requires_admin=False,
                requires_restart=False
            )
        ]
        
        # Add technical-level specific steps
        if technical_level == TechnicalLevel.BASIC:
            basic_steps.extend([
                RemediationAction(
                    action="Wait and try again",
                    details="Wait a few minutes before trying again",
                    priority=2,
                    estimated_success_probability=0.5,
                    code_snippet=None,
                    documentation_link=None,
                    requires_admin=False,
                    requires_restart=False
                ),
                RemediationAction(
                    action="Contact support team",
                    details="If the issue persists, contact your IT support team",
                    priority=3,
                    estimated_success_probability=0.95,
                    code_snippet=None,
                    documentation_link=None,
                    requires_admin=False,
                    requires_restart=False
                )
            ])
        elif technical_level == TechnicalLevel.INTERMEDIATE:
            basic_steps.extend([
                RemediationAction(
                    action="Add delay between requests",
                    details="Implement a delay between consecutive API requests",
                    priority=2,
                    estimated_success_probability=0.7,
                    code_snippet="// Add delay between requests\nawait new Promise(resolve => setTimeout(resolve, 1000));",
                    documentation_link=None,
                    requires_admin=False,
                    requires_restart=False
                ),
                RemediationAction(
                    action="Check rate limit documentation",
                    details=f"Review {error_analysis.provider} documentation for rate limit specifications",
                    priority=3,
                    estimated_success_probability=0.5,
                    code_snippet=None,
                    documentation_link=f"https://docs.example.com/{error_analysis.provider.lower()}/rate-limits",
                    requires_admin=False,
                    requires_restart=False
                ),
                RemediationAction(
                    action="Reduce concurrency",
                    details="Lower the number of concurrent requests to the API",
                    priority=4,
                    estimated_success_probability=0.8,
                    code_snippet=None,
                    documentation_link=None,
                    requires_admin=False,
                    requires_restart=False
                )
            ])
        elif technical_level == TechnicalLevel.ADVANCED:
            basic_steps.extend([
                RemediationAction(
                    action="Implement exponential backoff",
                    details="Add delay between requests that increases after each failure",
                    priority=2,
                    estimated_success_probability=0.9,
                    code_snippet=code_snippet,
                    documentation_link=None,
                    requires_admin=False,
                    requires_restart=False
                ),
                RemediationAction(
                    action="Implement rate limiting in client",
                    details="Add client-side rate limiting to prevent exceeding API limits",
                    priority=3,
                    estimated_success_probability=0.8,
                    code_snippet=None,
                    documentation_link=None,
                    requires_admin=False,
                    requires_restart=False
                ),
                RemediationAction(
                    action="Use pagination and batching",
                    details="Break large requests into smaller batches and use pagination",
                    priority=4,
                    estimated_success_probability=0.7,
                    code_snippet=None,
                    documentation_link=None,
                    requires_admin=False,
                    requires_restart=False
                ),
                RemediationAction(
                    action="Implement request queuing",
                    details="Queue requests and process them at a controlled rate",
                    priority=5,
                    estimated_success_probability=0.8,
                    code_snippet=None,
                    documentation_link=None,
                    requires_admin=False,
                    requires_restart=False
                ),
                RemediationAction(
                    action="Consider upgrading API tier",
                    details="If available, upgrade to a higher API tier with higher rate limits",
                    priority=6,
                    estimated_success_probability=0.9,
                    code_snippet=None,
                    documentation_link=None,
                    requires_admin=True,
                    requires_restart=False
                )
            ])
        
        return basic_steps
    
    def _permission_remediation(self, error_analysis: ErrorAnalysis,
                              technical_level: TechnicalLevel) -> List[RemediationAction]:
        """
        Generate remediation steps for permission errors.
        
        Args:
            error_analysis: Analysis of the error
            technical_level: The technical level of the user
            
        Returns:
            List[RemediationAction]: Remediation steps
        """
        basic_steps = [
            RemediationAction(
                action="Verify user permissions",
                details=f"Check that the user has the necessary permissions in {error_analysis.provider}",
                priority=1,
                estimated_success_probability=0.7,
                code_snippet=None,
                documentation_link=None,
                requires_admin=True,
                requires_restart=False
            )
        ]
        
        if technical_level == TechnicalLevel.BASIC:
            basic_steps.extend([
                RemediationAction(
                    action="Contact administrator",
                    details="Contact your system administrator to request the necessary permissions",
                    priority=2,
                    estimated_success_probability=0.9,
                    code_snippet=None,
                    documentation_link=None,
                    requires_admin=True,
                    requires_restart=False
                )
            ])
        elif technical_level == TechnicalLevel.INTERMEDIATE:
            basic_steps.extend([
                RemediationAction(
                    action="Check role assignments",
                    details="Verify that the user is assigned to the correct roles",
                    priority=2,
                    estimated_success_probability=0.6,
                    code_snippet=None,
                    documentation_link=None,
                    requires_admin=True,
                    requires_restart=False
                ),
                RemediationAction(
                    action="Check resource access",
                    details="Verify that the user has access to the specific resource being accessed",
                    priority=3,
                    estimated_success_probability=0.7,
                    code_snippet=None,
                    documentation_link=None,
                    requires_admin=True,
                    requires_restart=False
                )
            ])
        elif technical_level == TechnicalLevel.ADVANCED:
            basic_steps.extend([
                RemediationAction(
                    action="Check API token scope",
                    details="Verify that the API token has the necessary scope for this operation",
                    priority=2,
                    estimated_success_probability=0.7,
                    code_snippet=None,
                    documentation_link=None,
                    requires_admin=True,
                    requires_restart=False
                ),
                RemediationAction(
                    action="Audit permission logs",
                    details="Check permission logs to identify the specific permission that's missing",
                    priority=3,
                    estimated_success_probability=0.8,
                    code_snippet=None,
                    documentation_link=None,
                    requires_admin=True,
                    requires_restart=False
                ),
                RemediationAction(
                    action="Create custom role",
                    details="Create a custom role with the specific permissions needed",
                    priority=4,
                    estimated_success_probability=0.9,
                    code_snippet=None,
                    documentation_link=None,
                    requires_admin=True,
                    requires_restart=False
                )
            ])
        
        return basic_steps
    
    def _not_found_remediation(self, error_analysis: ErrorAnalysis,
                             technical_level: TechnicalLevel) -> List[RemediationAction]:
        """
        Generate remediation steps for resource not found errors.
        
        Args:
            error_analysis: Analysis of the error
            technical_level: The technical level of the user
            
        Returns:
            List[RemediationAction]: Remediation steps
        """
        basic_steps = [
            RemediationAction(
                action="Verify resource ID",
                details="Check that the resource ID exists and is correctly formatted",
                priority=1,
                estimated_success_probability=0.7,
                code_snippet=None,
                documentation_link=None,
                requires_admin=False,
                requires_restart=False
            )
        ]
        
        if technical_level == TechnicalLevel.BASIC:
            basic_steps.extend([
                RemediationAction(
                    action="Check resource exists",
                    details="Verify that the resource exists in the system",
                    priority=2,
                    estimated_success_probability=0.8,
                    code_snippet=None,
                    documentation_link=None,
                    requires_admin=False,
                    requires_restart=False
                ),
                RemediationAction(
                    action="Contact support",
                    details="If you believe the resource should exist, contact support for assistance",
                    priority=3,
                    estimated_success_probability=0.5,
                    code_snippet=None,
                    documentation_link=None,
                    requires_admin=False,
                    requires_restart=False
                )
            ])
        elif technical_level == TechnicalLevel.INTERMEDIATE:
            basic_steps.extend([
                RemediationAction(
                    action="Check resource path",
                    details="Ensure the API endpoint path is correct",
                    priority=2,
                    estimated_success_probability=0.6,
                    code_snippet=f"const url = `${{baseUrl}}/api/resources/${{resourceId}}`;",
                    documentation_link=None,
                    requires_admin=False,
                    requires_restart=False
                ),
                RemediationAction(
                    action="Verify access permissions",
                    details="Confirm you have access to the resource",
                    priority=3,
                    estimated_success_probability=0.5,
                    code_snippet=None,
                    documentation_link=None,
                    requires_admin=False,
                    requires_restart=False
                ),
                RemediationAction(
                    action="Check if resource was deleted",
                    details="Verify if the resource was recently deleted",
                    priority=4,
                    estimated_success_probability=0.4,
                    code_snippet=None,
                    documentation_link=None,
                    requires_admin=False,
                    requires_restart=False
                )
            ])
        elif technical_level == TechnicalLevel.ADVANCED:
            basic_steps.extend([
                RemediationAction(
                    action="Check resource path and formatting",
                    details="Ensure the API endpoint path is correct and properly encoded",
                    priority=2,
                    estimated_success_probability=0.6,
                    code_snippet="const url = `${baseUrl}/api/resources/${encodeURIComponent(resourceId)}`;",
                    documentation_link=None,
                    requires_admin=False,
                    requires_restart=False
                ),
                RemediationAction(
                    action="Implement resource existence check",
                    details="Add logic to check if a resource exists before attempting to access it",
                    priority=3,
                    estimated_success_probability=0.7,
                    code_snippet=None,
                    documentation_link=None,
                    requires_admin=False,
                    requires_restart=False
                ),
                RemediationAction(
                    action="Create resource if not exists",
                    details="Implement create-if-not-exists logic to handle missing resources",
                    priority=4,
                    estimated_success_probability=0.8,
                    code_snippet=None,
                    documentation_link=None,
                    requires_admin=False,
                    requires_restart=False
                ),
                RemediationAction(
                    action="Check resource archiving policy",
                    details="Verify if resources might be archived rather than deleted",
                    priority=5,
                    estimated_success_probability=0.4,
                    code_snippet=None,
                    documentation_link=None,
                    requires_admin=False,
                    requires_restart=False
                )
            ])
        
        return basic_steps
    
    def _validation_remediation(self, error_analysis: ErrorAnalysis,
                              technical_level: TechnicalLevel) -> List[RemediationAction]:
        """
        Generate remediation steps for validation errors.
        
        Args:
            error_analysis: Analysis of the error
            technical_level: The technical level of the user
            
        Returns:
            List[RemediationAction]: Remediation steps
        """
        basic_steps = [
            RemediationAction(
                action="Check request format",
                details="Verify that the request data is correctly formatted",
                priority=1,
                estimated_success_probability=0.7,
                code_snippet=None,
                documentation_link=None,
                requires_admin=False,
                requires_restart=False
            )
        ]
        
        if technical_level == TechnicalLevel.BASIC:
            basic_steps.extend([
                RemediationAction(
                    action="Review error message",
                    details="Carefully read the error message for clues about what's wrong",
                    priority=2,
                    estimated_success_probability=0.5,
                    code_snippet=None,
                    documentation_link=None,
                    requires_admin=False,
                    requires_restart=False
                ),
                RemediationAction(
                    action="Check required fields",
                    details="Make sure all required fields are included in your request",
                    priority=3,
                    estimated_success_probability=0.6,
                    code_snippet=None,
                    documentation_link=None,
                    requires_admin=False,
                    requires_restart=False
                )
            ])
        elif technical_level == TechnicalLevel.INTERMEDIATE:
            basic_steps.extend([
                RemediationAction(
                    action="Check required fields",
                    details="Ensure all required fields are included and properly formatted",
                    priority=2,
                    estimated_success_probability=0.7,
                    code_snippet=None,
                    documentation_link=None,
                    requires_admin=False,
                    requires_restart=False
                ),
                RemediationAction(
                    action="Review API documentation",
                    details=f"Check the {error_analysis.provider} API documentation for field requirements",
                    priority=3,
                    estimated_success_probability=0.6,
                    code_snippet=None,
                    documentation_link=f"https://docs.example.com/{error_analysis.provider.lower()}/api-reference",
                    requires_admin=False,
                    requires_restart=False
                ),
                RemediationAction(
                    action="Validate data types",
                    details="Ensure all fields have the correct data types",
                    priority=4,
                    estimated_success_probability=0.8,
                    code_snippet=None,
                    documentation_link=None,
                    requires_admin=False,
                    requires_restart=False
                )
            ])
        elif technical_level == TechnicalLevel.ADVANCED:
            basic_steps.extend([
                RemediationAction(
                    action="Implement request validation",
                    details="Add client-side validation to catch issues before sending requests",
                    priority=2,
                    estimated_success_probability=0.8,
                    code_snippet=None,
                    documentation_link=None,
                    requires_admin=False,
                    requires_restart=False
                ),
                RemediationAction(
                    action="Use schema validation",
                    details="Validate requests against the API schema before sending",
                    priority=3,
                    estimated_success_probability=0.9,
                    code_snippet=None,
                    documentation_link=None,
                    requires_admin=False,
                    requires_restart=False
                ),
                RemediationAction(
                    action="Check for nested validation errors",
                    details="Look for validation errors in nested objects or arrays",
                    priority=4,
                    estimated_success_probability=0.7,
                    code_snippet=None,
                    documentation_link=None,
                    requires_admin=False,
                    requires_restart=False
                ),
                RemediationAction(
                    action="Implement request logging",
                    details="Log all API requests for debugging validation issues",
                    priority=5,
                    estimated_success_probability=0.6,
                    code_snippet=None,
                    documentation_link=None,
                    requires_admin=False,
                    requires_restart=False
                )
            ])
        
        return basic_steps
    
    def _llm_based_remediation(self, error_analysis: ErrorAnalysis,
                             technical_level: TechnicalLevel) -> RemediationSuggestion:
        """
        Generate remediation steps using the LLM.
        
        Args:
            error_analysis: Analysis of the error
            technical_level: The technical level of the user
            
        Returns:
            RemediationSuggestion: Suggested remediation with ordered steps
        """
        # Create prompt for the LLM
        error_json = error_analysis.to_dict()
        
        prompt = (
            f"Generate step-by-step remediation instructions for this API error:\n\n"
            f"{json.dumps(error_json, indent=2)}\n\n"
            f"The instructions should be tailored for a user with {technical_level} technical knowledge.\n\n"
            f"Provide your suggestions in JSON format with the following structure:\n"
            f"{{\"steps\": [{{\n"
            f"  \"action\": \"Brief action title\",\n"
            f"  \"details\": \"Detailed instructions\",\n"
            f"  \"priority\": 1, // Lower number = higher priority\n"
            f"  \"code_snippet\": \"Optional code example\",\n"
            f"  \"documentation_link\": \"Optional link to documentation\",\n"
            f"  \"requires_admin\": false, // Does this require admin privileges?\n"
            f"  \"requires_restart\": false // Does this require restarting the application?\n"
            f"}}],\n"
            f"\"success_probability\": 0.8, // 0.0 to 1.0\n"
            f"\"estimated_time\": \"Estimated time to resolve\",\n"
            f"\"side_effects\": [\"Possible side effects\"],\n"
            f"\"alternative_approaches\": [\"Alternative solutions\"]}}"
        )
        
        # Query the LLM
        response = self.llm_service.query(
            prompt=prompt,
            system_prompt=(
                f"You are an expert API troubleshooter specialized in {error_analysis.provider} API integration. "
                f"Generate practical, effective steps to resolve the error, appropriate for a user with {technical_level} "
                f"technical knowledge. Return your suggestions in strict JSON format following the structure specified "
                f"in the user prompt."
            ),
            temperature=0.3
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
                    return self._default_remediation(error_analysis, technical_level)
            else:
                # Fall back to default response
                return self._default_remediation(error_analysis, technical_level)
        
        # Process the steps
        steps = []
        for step_data in response_json.get("steps", []):
            steps.append(
                RemediationAction(
                    action=step_data.get("action", "Unknown action"),
                    details=step_data.get("details", "No details provided"),
                    priority=step_data.get("priority", 99),
                    estimated_success_probability=0.7,  # Default
                    code_snippet=step_data.get("code_snippet"),
                    documentation_link=step_data.get("documentation_link"),
                    requires_admin=step_data.get("requires_admin", False),
                    requires_restart=step_data.get("requires_restart", False),
                    automated=step_data.get("automated", False),
                    estimated_time=step_data.get("estimated_time")
                )
            )
        
        # Sort steps by priority
        steps.sort(key=lambda s: s.priority)
        
        # Create remediation suggestion
        return RemediationSuggestion(
            error_analysis=error_analysis,
            steps=steps,
            user_level=technical_level,
            success_probability=float(response_json.get("success_probability", 0.7)),
            estimated_time=response_json.get("estimated_time", "unknown"),
            side_effects=response_json.get("side_effects", []),
            alternative_approaches=response_json.get("alternative_approaches", []),
            references=[]
        )
    
    def _default_remediation(self, error_analysis: ErrorAnalysis,
                           technical_level: TechnicalLevel) -> RemediationSuggestion:
        """
        Generate a default remediation when other methods fail.
        
        Args:
            error_analysis: Analysis of the error
            technical_level: The technical level of the user
            
        Returns:
            RemediationSuggestion: Default remediation suggestion
        """
        # Default steps for different error types
        if error_analysis.error_type == ErrorType.AUTHENTICATION:
            steps = [
                RemediationAction(
                    action="Check API token",
                    details="Verify that your API token is valid and has not expired",
                    priority=1,
                    estimated_success_probability=0.7,
                    code_snippet=None,
                    documentation_link=None,
                    requires_admin=False,
                    requires_restart=False
                ),
                RemediationAction(
                    action="Regenerate token",
                    details=f"Generate a new API token in the {error_analysis.provider} admin interface",
                    priority=2,
                    estimated_success_probability=0.8,
                    code_snippet=None,
                    documentation_link=None,
                    requires_admin=True,
                    requires_restart=False
                ),
                RemediationAction(
                    action="Check authentication method",
                    details="Ensure you're using the correct authentication method for the API",
                    priority=3,
                    estimated_success_probability=0.6,
                    code_snippet=None,
                    documentation_link=None,
                    requires_admin=False,
                    requires_restart=False
                )
            ]
            success_probability = 0.8
            estimated_time = "5-10 minutes"
        elif error_analysis.error_type == ErrorType.RATE_LIMIT:
            steps = [
                RemediationAction(
                    action="Wait and retry",
                    details="Wait a few minutes and try your request again",
                    priority=1,
                    estimated_success_probability=0.6,
                    code_snippet=None,
                    documentation_link=None,
                    requires_admin=False,
                    requires_restart=False
                ),
                RemediationAction(
                    action="Reduce request frequency",
                    details="Make fewer requests to the API in a short time period",
                    priority=2,
                    estimated_success_probability=0.7,
                    code_snippet=None,
                    documentation_link=None,
                    requires_admin=False,
                    requires_restart=False
                ),
                RemediationAction(
                    action="Implement backoff",
                    details="Add increasing delays between requests after failures",
                    priority=3,
                    estimated_success_probability=0.8,
                    code_snippet=None,
                    documentation_link=None,
                    requires_admin=False,
                    requires_restart=False
                )
            ]
            success_probability = 0.7
            estimated_time = "10-30 minutes"
        else:
            steps = [
                RemediationAction(
                    action="Check error details",
                    details="Review the complete error message for specific guidance",
                    priority=1,
                    estimated_success_probability=0.5,
                    code_snippet=None,
                    documentation_link=None,
                    requires_admin=False,
                    requires_restart=False
                ),
                RemediationAction(
                    action="Consult documentation",
                    details=f"Check the {error_analysis.provider} API documentation for this error type",
                    priority=2,
                    estimated_success_probability=0.6,
                    code_snippet=None,
                    documentation_link=None,
                    requires_admin=False,
                    requires_restart=False
                ),
                RemediationAction(
                    action="Contact support",
                    details="If the issue persists, contact the support team with the error details",
                    priority=3,
                    estimated_success_probability=0.8,
                    code_snippet=None,
                    documentation_link=None,
                    requires_admin=False,
                    requires_restart=False
                )
            ]
            success_probability = 0.6
            estimated_time = "Varies"
        
        return RemediationSuggestion(
            error_analysis=error_analysis,
            steps=steps,
            user_level=technical_level,
            success_probability=success_probability,
            estimated_time=estimated_time,
            side_effects=[],
            alternative_approaches=[],
            references=[]
        )