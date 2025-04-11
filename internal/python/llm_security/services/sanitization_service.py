"""
Sanitization service for cleaning inputs and outputs.
"""

import re
import json
from typing import Dict, List, Any, Optional, Union, Tuple, Set

from ..models.security_models import SecurityContext, ValidationResult, Threat, SecurityLevel
from ..models.schemas import OutputSchema, SchemaValidator
from ..utils.pii_detection import PIIDetector
from ..utils.prompt_injection import PromptInjectionDetector
from ..utils.data_leakage import DataLeakageDetector
from .audit_service import AuditService


class SanitizationService:
    """Service for sanitizing inputs and outputs."""
    
    def __init__(self, audit_service: AuditService = None):
        """
        Initialize sanitization service.
        
        Args:
            audit_service: Audit service for logging
        """
        self.audit_service = audit_service or AuditService()
        self.pii_detector = PIIDetector()
        self.injection_detector = PromptInjectionDetector()
        self.data_leakage_detector = DataLeakageDetector()
    
    def sanitize_input(self, text: str, 
                     security_context: SecurityContext = None, 
                     pii_replacement: str = "[REDACTED:{type}]",
                     injection_replacement: str = "[BLOCKED:PROMPT_INJECTION]") -> str:
        """
        Sanitize input text by removing PII and blocking prompt injections.
        
        Args:
            text: Input text to sanitize
            security_context: Security context
            pii_replacement: Format for PII replacement
            injection_replacement: Format for injection replacement
            
        Returns:
            str: Sanitized text
        """
        # Sanitize PII
        sanitized_text, pii_detections = self.pii_detector.redact_pii(
            text, pii_replacement
        )
        
        # Log PII sanitization
        if pii_detections:
            threats = self.pii_detector.create_threats_from_detections(pii_detections, in_prompt=True)
            for threat in threats:
                self.audit_service.log_threat(
                    threat=threat,
                    security_context=security_context,
                    action_taken="PII_REDACTED"
                )
                
            self.audit_service.log_sanitization(
                sanitization_type="PII",
                num_items_sanitized=len(pii_detections),
                security_context=security_context
            )
        
        # Handle prompt injection
        injection_validation = self.injection_detector.validate_prompt(sanitized_text)
        if not injection_validation.valid:
            sanitized_text, injection_detections = self.injection_detector.sanitize_injections(
                sanitized_text, injection_replacement
            )
            
            # Log injection sanitization
            if injection_detections:
                threats = self.injection_detector.create_threats_from_detections(injection_detections)
                for threat in threats:
                    self.audit_service.log_threat(
                        threat=threat,
                        security_context=security_context,
                        action_taken="INJECTION_BLOCKED"
                    )
                    
                self.audit_service.log_sanitization(
                    sanitization_type="PROMPT_INJECTION",
                    num_items_sanitized=len(injection_detections),
                    security_context=security_context
                )
        
        return sanitized_text
    
    def sanitize_output(self, output: str, input_text: str = None, 
                       security_context: SecurityContext = None,
                       structured_input: Dict[str, Any] = None,
                       schema: OutputSchema = None) -> str:
        """
        Sanitize output text by removing PII and validating against schema.
        
        Args:
            output: Output text to sanitize
            input_text: Original input for data leakage detection
            security_context: Security context
            structured_input: Structured input data for field leakage detection
            schema: Schema for validation
            
        Returns:
            str: Sanitized output
        """
        # Sanitize PII
        sanitized_output, pii_detections = self.pii_detector.redact_pii(output)
        
        # Log PII sanitization
        if pii_detections:
            threats = self.pii_detector.create_threats_from_detections(pii_detections, in_prompt=False)
            for threat in threats:
                self.audit_service.log_threat(
                    threat=threat,
                    security_context=security_context,
                    action_taken="PII_REDACTED_FROM_OUTPUT"
                )
                
            self.audit_service.log_sanitization(
                sanitization_type="OUTPUT_PII",
                num_items_sanitized=len(pii_detections),
                security_context=security_context
            )
        
        # Check for data leakage
        if input_text:
            leakage_detections = self.data_leakage_detector.detect_data_leakage(input_text, sanitized_output)
            if leakage_detections:
                leakage_threats = self.data_leakage_detector.create_threats_from_detections(leakage_detections)
                for threat in leakage_threats:
                    self.audit_service.log_threat(
                        threat=threat,
                        security_context=security_context,
                        action_taken="DATA_LEAKAGE_DETECTED"
                    )
        
        # Check structured input for sensitive field leakage
        if structured_input:
            field_leakage = self.data_leakage_detector.detect_sensitive_field_leakage(
                structured_input, sanitized_output
            )
            if field_leakage:
                field_threats = self.data_leakage_detector.create_threats_from_detections(field_leakage)
                for threat in field_threats:
                    self.audit_service.log_threat(
                        threat=threat,
                        security_context=security_context,
                        action_taken="SENSITIVE_FIELD_LEAK_DETECTED"
                    )
        
        # Validate and sanitize against schema if provided
        if schema:
            try:
                # Try to parse as JSON
                try:
                    output_data = json.loads(sanitized_output)
                except json.JSONDecodeError:
                    # Not valid JSON, try to extract JSON
                    json_match = re.search(r'```json\s*(.*?)\s*```|{.*}', sanitized_output, re.DOTALL)
                    if json_match:
                        try:
                            output_data = json.loads(json_match.group(1))
                        except json.JSONDecodeError:
                            output_data = None
                    else:
                        output_data = None
                
                if output_data:
                    # Validate and sanitize against schema
                    validator = SchemaValidator(schema=schema)
                    result = validator.validate(output_data)
                    
                    # If validation succeeded, return sanitized JSON
                    if result["valid"]:
                        sanitized_data = validator.sanitize_according_to_schema(output_data)
                        sanitized_output = json.dumps(sanitized_data, indent=2)
                    
                    # Log validation result
                    self.audit_service.log_validation(
                        validation_type="SCHEMA",
                        valid=result["valid"],
                        issues=result.get("issues", []),
                        security_context=security_context
                    )
            except Exception as e:
                # Log schema validation error
                self.audit_service.log_security_event(
                    action="SCHEMA_ERROR",
                    details=f"Schema validation error: {str(e)}",
                    security_context=security_context,
                    metadata={"error": str(e)}
                )
        
        return sanitized_output
    
    def sanitize_structured_data(self, data: Dict[str, Any],
                               security_context: SecurityContext = None) -> Dict[str, Any]:
        """
        Sanitize structured data by recursively removing PII.
        
        Args:
            data: Structured data to sanitize
            security_context: Security context
            
        Returns:
            Dict[str, Any]: Sanitized data
        """
        # Sanitize structured data
        sanitized_data, detections = self.pii_detector.redact_pii_in_structure(data)
        
        # Log sanitization
        if detections:
            # Log each detection
            for detection in detections:
                path = detection.get("path", "unknown")
                pii_type = detection.get("type", "unknown")
                
                self.audit_service.log_security_event(
                    action="PII_REDACTED_FROM_STRUCTURE",
                    details=f"Redacted {pii_type} from path {path}",
                    security_context=security_context,
                    metadata=detection
                )
            
            # Log overall sanitization
            self.audit_service.log_sanitization(
                sanitization_type="STRUCTURED_PII",
                num_items_sanitized=len(detections),
                security_context=security_context
            )
        
        return sanitized_data
    
    def sanitize_sensitive_fields(self, data: Dict[str, Any], 
                                sensitive_fields: Set[str] = None,
                                security_context: SecurityContext = None) -> Dict[str, Any]:
        """
        Sanitize specific sensitive fields in structured data.
        
        Args:
            data: Structured data to sanitize
            sensitive_fields: Set of sensitive field names
            security_context: Security context
            
        Returns:
            Dict[str, Any]: Sanitized data
        """
        if not sensitive_fields:
            sensitive_fields = {
                "password", "api_key", "token", "secret", "credential", "auth", 
                "key", "private", "certificate", "access_key", "access_token"
            }
        
        # Sanitize sensitive fields
        sanitized_data, redactions = self.pii_detector.redact_sensitive_keys(
            data, sensitive_fields
        )
        
        # Log sanitization
        if redactions:
            self.audit_service.log_sanitization(
                sanitization_type="SENSITIVE_FIELDS",
                num_items_sanitized=len(redactions),
                security_context=security_context
            )
        
        return sanitized_data