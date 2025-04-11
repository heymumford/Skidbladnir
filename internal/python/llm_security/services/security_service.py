"""
Main LLM Security service for coordinating security components.
"""

import os
import json
import re
from typing import Dict, List, Any, Optional, Union, Tuple, Set, Callable

from ..models.security_models import SecurityContext, ValidationResult, Threat, SecurityLevel
from ..models.schemas import SchemaValidator, OutputSchema
from ..utils.pii_detection import PIIDetector
from ..utils.prompt_injection import PromptInjectionDetector
from ..utils.data_leakage import DataLeakageDetector
from ..utils.prompt_templates import SecurePromptTemplate, TemplateRegistry
from .audit_service import AuditService


class LLMSecurityService:
    """Main service for LLM security measures."""
    
    def __init__(self, 
                log_dir: str = None,
                audit_service: AuditService = None,
                security_config: Dict[str, Any] = None):
        """
        Initialize LLM Security Service.
        
        Args:
            log_dir: Directory for security logs
            audit_service: Custom audit service instance
            security_config: Configuration options
        """
        # Initialize default configuration
        self.config = {
            "sanitize_input_prompts": True,
            "sanitize_output": True,
            "validate_schemas": True,
            "block_prompt_injections": True,
            "check_data_leakage": True,
            "security_prefix": "",
            "security_suffix": "",
            "similarity_threshold": 0.85,
            "pii_replacement_format": "[REDACTED:{type}]",
            "injection_replacement": "[BLOCKED:PROMPT_INJECTION]",
            "log_level": "INFO",
            "audit_log_console": True,
            "structured_audit_logs": True
        }
        
        # Update with provided configuration
        if security_config:
            self.config.update(security_config)
        
        # Set up logging directory
        if log_dir:
            os.makedirs(log_dir, exist_ok=True)
            self.log_dir = log_dir
        else:
            self.log_dir = os.path.join(os.getcwd(), "logs", "llm_security")
            os.makedirs(self.log_dir, exist_ok=True)
        
        # Initialize audit service
        if audit_service:
            self.audit_service = audit_service
        else:
            text_log_file = os.path.join(self.log_dir, "llm_security.log")
            structured_log_file = os.path.join(self.log_dir, "llm_security_structured.jsonl")
            
            self.audit_service = AuditService(
                log_file=text_log_file,
                console_logging=self.config["audit_log_console"],
                structured_log_file=structured_log_file if self.config["structured_audit_logs"] else None
            )
        
        # Initialize security components
        self.pii_detector = PIIDetector()
        self.injection_detector = PromptInjectionDetector()
        self.data_leakage_detector = DataLeakageDetector(
            similarity_threshold=self.config["similarity_threshold"]
        )
        self.template_registry = TemplateRegistry()
        
        # Log initialization
        self.audit_service.log_security_event(
            action="SERVICE_INIT",
            details="LLM Security Service initialized with configuration",
            metadata={"config": self.config}
        )
    
    def sanitize_input(self, prompt: str, security_context: SecurityContext = None) -> str:
        """
        Sanitize an input prompt for security.
        
        Args:
            prompt: Input prompt to sanitize
            security_context: Security context
            
        Returns:
            str: Sanitized prompt
        """
        # Skip if sanitization disabled
        if not self.config["sanitize_input_prompts"]:
            return prompt
        
        # Sanitize PII
        sanitized_prompt, pii_detections = self.pii_detector.redact_pii(
            prompt, self.config["pii_replacement_format"]
        )
        
        # Log PII sanitization if any
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
        
        # Handle prompt injection if enabled
        if self.config["block_prompt_injections"]:
            # Check for injection attempts
            injection_validation = self.injection_detector.validate_prompt(sanitized_prompt)
            
            if not injection_validation.valid:
                # Prompt has critical injection attempts
                # Replace with blocked message
                sanitized_prompt, injection_detections = self.injection_detector.sanitize_injections(
                    sanitized_prompt, self.config["injection_replacement"]
                )
                
                # Log injection threats
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
        
        # Add security prefix/suffix if configured
        if self.config.get("security_prefix"):
            sanitized_prompt = f"{self.config['security_prefix']}{sanitized_prompt}"
            
        if self.config.get("security_suffix"):
            sanitized_prompt = f"{sanitized_prompt}{self.config['security_suffix']}"
        
        # Log the sanitization event
        self.audit_service.log_security_event(
            action="INPUT_SANITIZED",
            details="Input prompt sanitized",
            security_context=security_context,
            metadata={
                "original_length": len(prompt),
                "sanitized_length": len(sanitized_prompt)
            }
        )
        
        return sanitized_prompt
    
    def sanitize_output(self, prompt: str, output: str, 
                       security_context: SecurityContext = None,
                       structured_input: Dict[str, Any] = None) -> str:
        """
        Sanitize LLM output for security.
        
        Args:
            prompt: Original input prompt
            output: LLM output to sanitize
            security_context: Security context
            structured_input: Optional structured input data
            
        Returns:
            str: Sanitized output
        """
        # Skip if sanitization disabled
        if not self.config["sanitize_output"]:
            return output
        
        # Check for PII in output
        sanitized_output, pii_detections = self.pii_detector.redact_pii(
            output, self.config["pii_replacement_format"]
        )
        
        # Log PII detections if any
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
        
        # Check for data leakage if enabled
        if self.config["check_data_leakage"]:
            # Check for data leakage between prompt and output
            leakage_detections = self.data_leakage_detector.detect_data_leakage(prompt, sanitized_output)
            
            # Check structured data if provided
            field_leakage = []
            if structured_input:
                field_leakage = self.data_leakage_detector.detect_sensitive_field_leakage(
                    structured_input, sanitized_output
                )
            
            # Log leakage detections if any
            if leakage_detections or field_leakage:
                threats = self.data_leakage_detector.create_threats_from_detections(
                    leakage_detections + field_leakage
                )
                for threat in threats:
                    self.audit_service.log_threat(
                        threat=threat,
                        security_context=security_context,
                        action_taken="DATA_LEAKAGE_DETECTED"
                    )
        
        # Log the sanitization event
        self.audit_service.log_security_event(
            action="OUTPUT_SANITIZED",
            details="Output sanitized",
            security_context=security_context,
            metadata={
                "original_length": len(output),
                "sanitized_length": len(sanitized_output)
            }
        )
        
        return sanitized_output
    
    def validate_prompt(self, prompt: str, 
                       security_context: SecurityContext = None) -> ValidationResult:
        """
        Validate a prompt for security issues.
        
        Args:
            prompt: Prompt to validate
            security_context: Security context
            
        Returns:
            ValidationResult: Result of validation
        """
        # Check for PII
        pii_detections = self.pii_detector.detect_pii(prompt)
        
        # Check for prompt injection
        injection_validation = self.injection_detector.validate_prompt(prompt)
        
        # Combine issues
        pii_issues = [f"PII detected: {detection['type']}" for detection in pii_detections]
        issues = injection_validation.issues + pii_issues
        
        # Determine highest severity
        severity = injection_validation.severity
        if pii_detections and severity == SecurityLevel.LOW:
            severity = SecurityLevel.MEDIUM
        
        # Create combined validation result
        validation_result = ValidationResult(
            valid=injection_validation.valid and not pii_detections,
            issues=issues,
            severity=severity,
            metadata={
                "pii_detections": len(pii_detections),
                "injection_detections": len(injection_validation.issues),
                "injection_validation": injection_validation.metadata
            }
        )
        
        # Log validation result
        self.audit_service.log_validation(
            validation_type="PROMPT",
            valid=validation_result.valid,
            issues=validation_result.issues,
            security_context=security_context
        )
        
        return validation_result
    
    def validate_output(self, prompt: str, output: str, schema: OutputSchema = None,
                       security_context: SecurityContext = None,
                       structured_input: Dict[str, Any] = None) -> ValidationResult:
        """
        Validate output for security and schema compliance.
        
        Args:
            prompt: Original input prompt
            output: Output to validate
            schema: Schema for validation
            security_context: Security context
            structured_input: Optional structured input data
            
        Returns:
            ValidationResult: Result of validation
        """
        issues = []
        schema_valid = True
        
        # Schema validation if provided and enabled
        if schema and self.config["validate_schemas"]:
            try:
                # Try to parse as JSON if schema validation requested
                try:
                    output_data = json.loads(output)
                except json.JSONDecodeError:
                    # Not valid JSON, try to extract JSON from text
                    json_match = re.search(r'```json\s*(.*?)\s*```|{.*}', output, re.DOTALL)
                    if json_match:
                        try:
                            output_data = json.loads(json_match.group(1))
                        except json.JSONDecodeError:
                            output_data = None
                            issues.append("Invalid JSON format")
                            schema_valid = False
                    else:
                        output_data = None
                        issues.append("Output is not in required JSON format")
                        schema_valid = False
                
                # Validate against schema if we got valid JSON
                if output_data:
                    validator = SchemaValidator(schema=schema)
                    schema_result = validator.validate(output_data)
                    
                    if not schema_result["valid"]:
                        issues.extend(schema_result["issues"])
                        schema_valid = False
            except Exception as e:
                issues.append(f"Schema validation error: {str(e)}")
                schema_valid = False
        
        # Data leakage validation
        data_leakage_valid = True
        if self.config["check_data_leakage"]:
            leakage_validation = self.data_leakage_detector.validate_output(
                prompt, output, structured_input
            )
            
            if not leakage_validation.valid:
                issues.extend(leakage_validation.issues)
                data_leakage_valid = False
        
        # PII check in output
        pii_detections = self.pii_detector.detect_pii(output)
        pii_issues = [f"PII detected in output: {detection['type']}" for detection in pii_detections]
        issues.extend(pii_issues)
        
        # Determine overall validation result
        valid = schema_valid and data_leakage_valid and not pii_detections
        
        # Determine highest severity
        if not valid:
            if not schema_valid:
                severity = SecurityLevel.MEDIUM
            elif not data_leakage_valid:
                severity = SecurityLevel.HIGH
            elif pii_detections:
                severity = SecurityLevel.MEDIUM
            else:
                severity = SecurityLevel.LOW
        else:
            severity = SecurityLevel.LOW
        
        # Create validation result
        validation_result = ValidationResult(
            valid=valid,
            issues=issues,
            severity=severity,
            metadata={
                "schema_valid": schema_valid,
                "data_leakage_valid": data_leakage_valid,
                "pii_detections": len(pii_detections)
            }
        )
        
        # Log validation result
        self.audit_service.log_validation(
            validation_type="OUTPUT",
            valid=validation_result.valid,
            issues=validation_result.issues,
            security_context=security_context
        )
        
        return validation_result
    
    def secure_prompt_with_template(self, template_name: str, 
                                   variables: Dict[str, Any],
                                   security_context: SecurityContext = None) -> str:
        """
        Create a secure prompt using a registered template.
        
        Args:
            template_name: Name of template to use
            variables: Variables for template formatting
            security_context: Security context
            
        Returns:
            str: Formatted secure prompt
        """
        # Get template from registry
        template = self.template_registry.get_template(template_name)
        if not template:
            raise ValueError(f"Template '{template_name}' not found")
        
        try:
            # Format template with variables
            formatted_prompt = template.format(**variables)
            
            # Log template usage
            self.audit_service.log_security_event(
                action="TEMPLATE_USED",
                details=f"Template '{template_name}' used",
                security_context=security_context,
                metadata={
                    "template": template_name,
                    "variables": list(variables.keys())
                }
            )
            
            return formatted_prompt
            
        except Exception as e:
            # Log template error
            self.audit_service.log_security_event(
                action="TEMPLATE_ERROR",
                details=f"Error using template '{template_name}': {str(e)}",
                security_context=security_context,
                metadata={"error": str(e)}
            )
            raise
    
    def detect_data_leakage(self, input_data: Union[str, Dict[str, Any]], 
                           output: str,
                           security_context: SecurityContext = None) -> List[Threat]:
        """
        Detect data leakage between input and output.
        
        Args:
            input_data: Input data (prompt or structured data)
            output: Generated output
            security_context: Security context
            
        Returns:
            List[Threat]: Detected threats
        """
        if isinstance(input_data, str):
            # Text input
            leakage_detections = self.data_leakage_detector.detect_data_leakage(input_data, output)
            field_leakage = []
        else:
            # Structured input
            leakage_detections = []
            field_leakage = self.data_leakage_detector.detect_sensitive_field_leakage(input_data, output)
        
        # Convert detections to threats
        threats = self.data_leakage_detector.create_threats_from_detections(
            leakage_detections + field_leakage
        )
        
        # Log threats
        for threat in threats:
            self.audit_service.log_threat(
                threat=threat,
                security_context=security_context,
                action_taken="DETECTION_LOGGED"
            )
        
        return threats
    
    def create_secure_context(self, user_id: str = None, 
                            operation_id: str = None,
                            source_ip: str = None,
                            permissions: List[str] = None,
                            metadata: Dict[str, Any] = None) -> SecurityContext:
        """
        Create a security context for LLM operations.
        
        Args:
            user_id: User identifier
            operation_id: Operation identifier
            source_ip: Source IP address
            permissions: Permission list
            metadata: Additional metadata
            
        Returns:
            SecurityContext: Security context
        """
        return SecurityContext(
            user_id=user_id,
            operation_id=operation_id,
            permissions=permissions or [],
            source_ip=source_ip,
            metadata=metadata or {}
        )
    
    def get_threat_summary(self, time_window_hours: int = 24) -> Dict[str, Any]:
        """
        Get summary of recent security threats.
        
        Args:
            time_window_hours: Time window in hours
            
        Returns:
            Dict[str, Any]: Threat summary
        """
        return self.audit_service.get_threat_summary(time_window_hours)
    
    def safe_llm_query(self, prompt: str, 
                      llm_function: Callable[[str], str],
                      security_context: SecurityContext = None,
                      structured_input: Dict[str, Any] = None,
                      output_schema: OutputSchema = None) -> Dict[str, Any]:
        """
        Safely query an LLM with security measures.
        
        Args:
            prompt: Input prompt
            llm_function: Function that takes prompt and returns response
            security_context: Security context
            structured_input: Optional structured input data
            output_schema: Schema for output validation
            
        Returns:
            Dict[str, Any]: Result with response and security info
        """
        # Initialize security context if not provided
        if not security_context:
            security_context = self.create_secure_context()
        
        try:
            # Step 1: Validate prompt
            prompt_validation = self.validate_prompt(prompt, security_context)
            
            # Step 2: Sanitize prompt
            sanitized_prompt = self.sanitize_input(prompt, security_context)
            
            # Step 3: Call LLM function
            raw_response = llm_function(sanitized_prompt)
            
            # Step 4: Validate output
            output_validation = self.validate_output(
                prompt, raw_response, output_schema, security_context, structured_input
            )
            
            # Step 5: Sanitize output
            sanitized_response = self.sanitize_output(
                prompt, raw_response, security_context, structured_input
            )
            
            # Log successful query
            self.audit_service.log_security_event(
                action="LLM_QUERY_SUCCESS",
                details="LLM query completed successfully",
                security_context=security_context,
                metadata={
                    "prompt_length": len(prompt),
                    "response_length": len(raw_response),
                    "prompt_valid": prompt_validation.valid,
                    "output_valid": output_validation.valid
                }
            )
            
            # Return result with security info
            return {
                "success": True,
                "response": sanitized_response,
                "raw_response": raw_response,
                "prompt_validation": prompt_validation.to_dict(),
                "output_validation": output_validation.to_dict(),
                "sanitized_prompt": sanitized_prompt,
                "security_applied": True
            }
            
        except Exception as e:
            # Log error
            self.audit_service.log_security_event(
                action="LLM_QUERY_ERROR",
                details=f"Error in LLM query: {str(e)}",
                security_context=security_context,
                metadata={"error": str(e)}
            )
            
            # Return error result
            return {
                "success": False,
                "error": str(e),
                "security_applied": True
            }