"""
API Error Analyzer for identifying root causes of API errors.
"""

import json
import logging
from typing import Dict, Any, List, Optional

from ..models.troubleshooting_models import (
    ErrorContext,
    ErrorAnalysis,
    ErrorType,
    Severity,
    Provider
)
from ..services.llm_service import LLMService
from ..services.knowledge_service import KnowledgeService

logger = logging.getLogger(__name__)


class APIErrorAnalyzer:
    """
    Specialized analyzer for API errors.
    
    This component analyzes API errors and identifies their
    root causes, affected components, and severity.
    """
    
    def __init__(self, llm_service: LLMService, knowledge_service: KnowledgeService):
        """
        Initialize the API Error Analyzer.
        
        Args:
            llm_service: The LLM service for error analysis
            knowledge_service: The knowledge service for error patterns
        """
        self.llm_service = llm_service
        self.knowledge_service = knowledge_service
        
    def analyze(self, error_context: ErrorContext) -> ErrorAnalysis:
        """
        Analyze an API error and identify its root cause.
        
        Args:
            error_context: Context information about the error
            
        Returns:
            ErrorAnalysis: Analysis of the error
        """
        # First try pattern-based analysis
        pattern_analysis = self._pattern_based_analysis(error_context)
        if pattern_analysis and pattern_analysis.confidence > 0.8:
            logger.debug(f"Used pattern-based analysis for {error_context.error_code}")
            return pattern_analysis
            
        # Fall back to LLM-based analysis
        llm_analysis = self._llm_based_analysis(error_context)
        
        # Combine the analyses if pattern analysis exists
        if pattern_analysis:
            # Use the higher confidence analysis as the base
            if pattern_analysis.confidence >= llm_analysis.confidence:
                base = pattern_analysis
                supplement = llm_analysis
            else:
                base = llm_analysis
                supplement = pattern_analysis
                
            # Combine potential causes and related errors
            combined_causes = list(set(base.potential_causes + supplement.potential_causes))
            combined_related = list(set(base.related_errors + supplement.related_errors))
            
            # Create combined analysis
            return ErrorAnalysis(
                error_type=base.error_type,
                root_cause=base.root_cause,
                severity=base.severity,
                confidence=max(base.confidence, supplement.confidence),
                affected_component=base.affected_component,
                provider=base.provider,
                common_pattern=base.common_pattern or supplement.common_pattern,
                related_errors=combined_related,
                potential_causes=combined_causes,
                impact=base.impact or supplement.impact,
                context=error_context
            )
        
        # If no pattern analysis, just return the LLM analysis
        return llm_analysis
    
    def _pattern_based_analysis(self, error_context: ErrorContext) -> Optional[ErrorAnalysis]:
        """
        Analyze an error based on known patterns.
        
        Args:
            error_context: Context information about the error
            
        Returns:
            Optional[ErrorAnalysis]: Analysis of the error, or None if no pattern matches
        """
        # Common patterns for different error types
        patterns = {
            # Authentication errors
            "authentication": [
                (r"authentication failed", 0.95),
                (r"invalid token", 0.95),
                (r"expired token", 0.95),
                (r"invalid api key", 0.95),
                (r"unauthorized", 0.9),
                (r"not authorized", 0.9),
                (r"invalid credentials", 0.95),
                (r"authentication required", 0.95)
            ],
            
            # Permission errors
            "permission": [
                (r"permission denied", 0.95),
                (r"access denied", 0.95),
                (r"not enough permissions", 0.95),
                (r"forbidden", 0.9),
                (r"insufficient privileges", 0.95),
                (r"insufficient permissions", 0.95)
            ],
            
            # Rate limit errors
            "rate_limit": [
                (r"rate limit", 0.95),
                (r"too many requests", 0.95),
                (r"request limit exceeded", 0.95),
                (r"throttled", 0.9),
                (r"quota exceeded", 0.95),
                (r"usage limit", 0.9)
            ],
            
            # Network errors
            "network": [
                (r"network error", 0.95),
                (r"connection refused", 0.95),
                (r"connection timeout", 0.95),
                (r"connection error", 0.95),
                (r"socket", 0.8),
                (r"dns", 0.8)
            ],
            
            # Resource not found
            "resource_not_found": [
                (r"not found", 0.9),
                (r"no such", 0.85),
                (r"does not exist", 0.9),
                (r"could not find", 0.9),
                (r"missing", 0.8)
            ],
            
            # Validation errors
            "validation": [
                (r"validation", 0.95),
                (r"invalid", 0.85),
                (r"malformed", 0.9),
                (r"bad request", 0.85),
                (r"required field", 0.9),
                (r"constraint", 0.85)
            ],
            
            # Server errors
            "server_error": [
                (r"internal server error", 0.95),
                (r"server error", 0.9),
                (r"service unavailable", 0.95),
                (r"maintenance", 0.85),
                (r"overloaded", 0.85),
                (r"temporary", 0.8)
            ]
        }
        
        # Check HTTP status code first
        http_status = error_context.http_status
        error_message = error_context.error_message.lower()
        
        if http_status == 401:
            error_type = ErrorType.AUTHENTICATION
            confidence = 0.95
        elif http_status == 403:
            error_type = ErrorType.PERMISSION
            confidence = 0.95
        elif http_status == 429:
            error_type = ErrorType.RATE_LIMIT
            confidence = 0.95
        elif http_status == 404:
            error_type = ErrorType.RESOURCE_NOT_FOUND
            confidence = 0.95
        elif http_status == 400:
            error_type = ErrorType.VALIDATION
            confidence = 0.9
        elif http_status and 500 <= http_status < 600:
            error_type = ErrorType.SERVER_ERROR
            confidence = 0.9
        else:
            # If no match by status code, check error message patterns
            best_match = None
            best_confidence = 0
            
            for error_key, pattern_list in patterns.items():
                for pattern, conf in pattern_list:
                    if pattern in error_message:
                        if conf > best_confidence:
                            best_match = error_key
                            best_confidence = conf
            
            if best_match and best_confidence > 0.8:
                error_type = ErrorType(best_match)
                confidence = best_confidence
            else:
                # No clear pattern match
                return None
        
        # Map error type to affected component
        component_map = {
            ErrorType.AUTHENTICATION: "authentication",
            ErrorType.PERMISSION: "authorization",
            ErrorType.RATE_LIMIT: "api_client",
            ErrorType.NETWORK: "network",
            ErrorType.RESOURCE_NOT_FOUND: "resource_access",
            ErrorType.VALIDATION: "input_validation",
            ErrorType.SERVER_ERROR: "api_server"
        }
        
        affected_component = component_map.get(error_type, "unknown")
        
        # Map error type to severity
        severity_map = {
            ErrorType.AUTHENTICATION: Severity.HIGH,
            ErrorType.PERMISSION: Severity.HIGH,
            ErrorType.RATE_LIMIT: Severity.MEDIUM,
            ErrorType.NETWORK: Severity.HIGH,
            ErrorType.RESOURCE_NOT_FOUND: Severity.MEDIUM,
            ErrorType.VALIDATION: Severity.MEDIUM,
            ErrorType.SERVER_ERROR: Severity.HIGH
        }
        
        severity = severity_map.get(error_type, Severity.MEDIUM)
        
        # Generate root cause based on error type and context
        if error_type == ErrorType.AUTHENTICATION:
            root_cause = "Invalid or expired API token"
        elif error_type == ErrorType.PERMISSION:
            root_cause = "Insufficient permissions to access the resource"
        elif error_type == ErrorType.RATE_LIMIT:
            root_cause = "Too many requests sent to the API in a short time"
        elif error_type == ErrorType.NETWORK:
            root_cause = "Network connection issue between client and server"
        elif error_type == ErrorType.RESOURCE_NOT_FOUND:
            root_cause = "Requested resource does not exist"
        elif error_type == ErrorType.VALIDATION:
            root_cause = "Invalid request parameters or payload"
        elif error_type == ErrorType.SERVER_ERROR:
            root_cause = "Internal server error on the API provider side"
        else:
            root_cause = "Unknown error"
        
        # Create the error analysis
        return ErrorAnalysis(
            error_type=error_type,
            root_cause=root_cause,
            severity=severity,
            confidence=confidence,
            affected_component=affected_component,
            provider=error_context.provider,
            common_pattern=True,
            related_errors=[],
            potential_causes=[],
            impact="",
            context=error_context
        )
    
    def _llm_based_analysis(self, error_context: ErrorContext) -> ErrorAnalysis:
        """
        Analyze an error using the LLM.
        
        Args:
            error_context: Context information about the error
            
        Returns:
            ErrorAnalysis: Analysis of the error
        """
        # Convert error context to a prompt for the LLM
        error_json = {
            "status_code": error_context.http_status,
            "provider": error_context.provider,
            "operation": error_context.operation,
            "message": error_context.error_message,
            "error_code": error_context.error_code,
            "endpoint": error_context.endpoint
        }
        
        prompt = (
            f"Analyze this API error and identify the root cause, error type, severity, "
            f"and affected component:\n\n{json.dumps(error_json, indent=2)}\n\n"
            f"Provide your analysis in JSON format with the following fields: "
            f"error_type, root_cause, severity, confidence, affected_component, "
            f"potential_causes (array), related_errors (array), and impact."
        )
        
        # Query the LLM
        response = self.llm_service.query(
            prompt=prompt,
            system_prompt=(
                "You are an expert API troubleshooter specialized in Zephyr Scale and qTest APIs. "
                "Analyze the error data provided and determine the most likely root cause and error type. "
                "Return your analysis in strict JSON format following the structure specified in the user prompt."
            ),
            temperature=0.3  # Lower temperature for more deterministic responses
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
                    response_json = self._default_analysis(error_context)
            else:
                # Fall back to default response
                response_json = self._default_analysis(error_context)
        
        # Map string values to enums
        try:
            error_type = ErrorType(response_json.get("error_type", "unknown"))
        except ValueError:
            error_type = ErrorType.UNKNOWN
            
        try:
            severity = Severity(response_json.get("severity", "medium"))
        except ValueError:
            severity = Severity.MEDIUM
        
        # Create the error analysis
        return ErrorAnalysis(
            error_type=error_type,
            root_cause=response_json.get("root_cause", "Unknown error"),
            severity=severity,
            confidence=float(response_json.get("confidence", 0.7)),
            affected_component=response_json.get("affected_component", "unknown"),
            provider=error_context.provider,
            common_pattern=False,
            related_errors=response_json.get("related_errors", []),
            potential_causes=response_json.get("potential_causes", []),
            impact=response_json.get("impact", ""),
            context=error_context
        )
    
    def _default_analysis(self, error_context: ErrorContext) -> Dict[str, Any]:
        """
        Generate a default analysis when other methods fail.
        
        Args:
            error_context: Context information about the error
            
        Returns:
            Dict[str, Any]: Default analysis values
        """
        # Default analysis based on HTTP status code
        http_status = error_context.http_status
        
        if http_status == 401:
            return {
                "error_type": "authentication",
                "root_cause": "Invalid or expired API token",
                "severity": "high",
                "confidence": 0.8,
                "affected_component": "authentication",
                "potential_causes": [
                    "Token has expired",
                    "Token is incorrectly copied",
                    "Token has been revoked"
                ],
                "related_errors": ["permission_denied"],
                "impact": "Unable to access API resources until authentication is resolved"
            }
        elif http_status == 403:
            return {
                "error_type": "permission",
                "root_cause": "Insufficient permissions to access the resource",
                "severity": "high",
                "confidence": 0.8,
                "affected_component": "authorization",
                "potential_causes": [
                    "User lacks required permissions",
                    "Token has limited scope",
                    "Resource requires special access"
                ],
                "related_errors": ["authentication_error"],
                "impact": "Unable to access specific resources until permissions are granted"
            }
        elif http_status == 429:
            return {
                "error_type": "rate_limit",
                "root_cause": "Too many requests sent to the API in a short time",
                "severity": "medium",
                "confidence": 0.8,
                "affected_component": "api_client",
                "potential_causes": [
                    "Concurrent requests exceed limits",
                    "No rate limiting implementation",
                    "API quotas exceeded"
                ],
                "related_errors": ["server_throttling"],
                "impact": "Temporary inability to make additional API requests"
            }
        elif http_status == 404:
            return {
                "error_type": "resource_not_found",
                "root_cause": "Requested resource does not exist",
                "severity": "medium",
                "confidence": 0.8,
                "affected_component": "resource_access",
                "potential_causes": [
                    "Resource ID is incorrect",
                    "Resource has been deleted",
                    "Resource path is malformed"
                ],
                "related_errors": ["invalid_identifier"],
                "impact": "Unable to access or modify the requested resource"
            }
        elif http_status == 400:
            return {
                "error_type": "validation",
                "root_cause": "Invalid request parameters or payload",
                "severity": "medium",
                "confidence": 0.8,
                "affected_component": "input_validation",
                "potential_causes": [
                    "Required fields missing",
                    "Invalid data format",
                    "Value constraints violated"
                ],
                "related_errors": ["schema_validation_error"],
                "impact": "Request rejected due to data quality issues"
            }
        elif http_status and 500 <= http_status < 600:
            return {
                "error_type": "server_error",
                "root_cause": "Internal server error on the API provider side",
                "severity": "high",
                "confidence": 0.8,
                "affected_component": "api_server",
                "potential_causes": [
                    "Server bug or exception",
                    "Infrastructure issue",
                    "Service overload"
                ],
                "related_errors": ["service_unavailable"],
                "impact": "API functionality impaired until server issue is resolved"
            }
        else:
            return {
                "error_type": "unknown",
                "root_cause": "Unknown error",
                "severity": "medium",
                "confidence": 0.5,
                "affected_component": "unknown",
                "potential_causes": [
                    "Insufficient error information",
                    "Uncommon error pattern",
                    "Multiple issues combined"
                ],
                "related_errors": [],
                "impact": "Undefined impact due to unknown error type"
            }