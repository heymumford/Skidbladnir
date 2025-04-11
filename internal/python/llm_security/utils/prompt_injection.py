"""
Prompt injection detection and prevention utilities for LLM Security.
"""

import re
from typing import Dict, List, Any, Optional, Tuple, Pattern, Set, Union
import json

from ..models.security_models import Threat, SecurityLevel, ThreatType, ValidationResult


class PromptInjectionDetector:
    """Detector for prompt injection attempts in LLM prompts."""
    
    def __init__(self, custom_patterns: Dict[str, str] = None):
        """
        Initialize with default and custom injection detection patterns.
        
        Args:
            custom_patterns: Additional patterns to detect
        """
        # Default prompt injection patterns
        self.injection_patterns: Dict[str, Pattern] = {
            # Classic override attempts
            "ignore_instructions": re.compile(
                r'(?i)(?:ignore|disregard)(?:\s+(?:all|previous|above|earlier))?\s+(?:instructions|prompt|context|guidelines)',
                re.IGNORECASE
            ),
            
            # Forget context
            "forget_context": re.compile(
                r'(?i)(?:forget|clear|reset|ignore)(?:\s+(?:all|your|previous))?\s+(?:context|memory|conversation|history)',
                re.IGNORECASE
            ),
            
            # System prompt override
            "system_override": re.compile(
                r'(?i)(?:new\s+system\s+prompt|as\s+an\s+AI\s+you\s+must|you\s+must\s+not\s+follow|override\s+system|you\s+are\s+now|from\s+now\s+on\s+you|your\s+new\s+instructions)',
                re.IGNORECASE
            ),
            
            # Security bypass attempts
            "security_bypass": re.compile(
                r'(?i)(?:bypass|circumvent|evade|avoid|defeat|get\s+around|hack|workaround|work\s+around)\s+(?:security|filters|restrictions|limitations|checks|constraints|guidelines|rules)',
                re.IGNORECASE
            ),
            
            # Data exfiltration
            "data_exfiltration": re.compile(
                r'(?i)(?:export|extract|leak|send|transmit|reveal|share|output)(?:\s+(?:all|sensitive|private|confidential))?\s+(?:data|information|details|files|content|secrets|credentials)',
                re.IGNORECASE
            ),
            
            # Code execution requests
            "code_execution": re.compile(
                r'(?i)(?:execute|run|perform|invoke|shell|system|os\.|subprocess\.|eval\(|exec\()',
                re.IGNORECASE
            ),
            
            # Authentication bypass
            "auth_bypass": re.compile(
                r'(?i)(?:password|credential|login|authentication|sudo|su\s+root|admin\s+access|root\s+access|privileged)',
                re.IGNORECASE
            ),
            
            # Dangerous commands
            "dangerous_commands": re.compile(
                r'(?i)(?:rm\s+-rf|format|delete\s+all|wipe|destroy|overwrite|uninstall|remove\s+system)',
                re.IGNORECASE
            ),
            
            # DAN (Do Anything Now) prompts
            "dan_prompt": re.compile(
                r'(?i)(?:DAN|Do\s+Anything\s+Now|ignore\s+your\s+ethical\s+guidelines|pretend\s+to\s+be\s+uncensored|act\s+as\s+if\s+you\s+have\s+no\s+restrictions)',
                re.IGNORECASE
            )
        }
        
        # Add custom patterns if provided
        if custom_patterns:
            for name, pattern in custom_patterns.items():
                self.injection_patterns[name] = re.compile(pattern, re.IGNORECASE)
    
    def detect_injections(self, text: str) -> List[Dict[str, Any]]:
        """
        Detect prompt injection attempts in text.
        
        Args:
            text: Text to check for prompt injection attempts
            
        Returns:
            List[Dict[str, Any]]: List of detected injection attempts
        """
        if not text:
            return []
            
        detections = []
        
        # Check each pattern
        for injection_type, pattern in self.injection_patterns.items():
            for match in pattern.finditer(text):
                # Get the matched injection attempt
                injection_text = match.group(0)
                
                # Get context around the match
                start = max(0, match.start() - 30)
                end = min(len(text), match.end() + 30)
                context = text[start:end]
                
                detections.append({
                    "type": injection_type,
                    "value": injection_text,
                    "start": match.start(),
                    "end": match.end(),
                    "context": context
                })
        
        return detections
    
    def sanitize_injections(self, text: str, replacement: str = "[BLOCKED:PROMPT_INJECTION]") -> Tuple[str, List[Dict[str, Any]]]:
        """
        Remove prompt injection attempts from text.
        
        Args:
            text: Text to sanitize
            replacement: String to replace injection attempts with
            
        Returns:
            Tuple[str, List[Dict[str, Any]]]: Sanitized text and list of sanitized injections
        """
        if not text:
            return text, []
            
        # Detect injection attempts
        detections = self.detect_injections(text)
        
        # Sort detections by start position in reverse order
        # This allows us to replace from end to beginning without changing indices
        detections_sorted = sorted(detections, key=lambda d: d["start"], reverse=True)
        
        # Apply sanitization
        sanitized_text = text
        for detection in detections_sorted:
            sanitized_text = (
                sanitized_text[:detection["start"]] + 
                replacement + 
                sanitized_text[detection["end"]:]
            )
        
        return sanitized_text, detections
    
    def create_threats_from_detections(self, detections: List[Dict[str, Any]]) -> List[Threat]:
        """
        Create threat objects from injection detections.
        
        Args:
            detections: Injection attempt detections
            
        Returns:
            List[Threat]: List of threat objects
        """
        threats = []
        
        # Severity levels for different injection types
        severity_map = {
            "ignore_instructions": SecurityLevel.HIGH,
            "forget_context": SecurityLevel.HIGH,
            "system_override": SecurityLevel.HIGH,
            "security_bypass": SecurityLevel.CRITICAL,
            "data_exfiltration": SecurityLevel.CRITICAL,
            "code_execution": SecurityLevel.CRITICAL,
            "auth_bypass": SecurityLevel.CRITICAL,
            "dangerous_commands": SecurityLevel.CRITICAL,
            "dan_prompt": SecurityLevel.HIGH
        }
        
        for detection in detections:
            # Determine severity
            severity = severity_map.get(detection["type"], SecurityLevel.HIGH)
            
            # Create threat object
            threat = Threat(
                type=ThreatType.PROMPT_INJECTION,
                severity=severity,
                description=f"Prompt injection attempt detected: {detection['type']}",
                metadata={
                    "injection_type": detection["type"],
                    "value": detection["value"],
                    "start": detection["start"],
                    "end": detection["end"],
                    "context": detection["context"]
                }
            )
            
            threats.append(threat)
        
        return threats
    
    def validate_prompt(self, text: str, block_critical: bool = True) -> ValidationResult:
        """
        Validate a prompt for prompt injection attempts.
        
        Args:
            text: Prompt text to validate
            block_critical: Whether to fail validation for critical severity threats
            
        Returns:
            ValidationResult: Result of validation
        """
        # Detect injection attempts
        detections = self.detect_injections(text)
        
        # If no detections, prompt is valid
        if not detections:
            return ValidationResult(
                valid=True,
                issues=[],
                severity=SecurityLevel.LOW,
                metadata={"detections": []}
            )
        
        # Convert detections to threats to determine severity
        threats = self.create_threats_from_detections(detections)
        
        # Find highest severity
        highest_severity = max([threat.severity for threat in threats], 
                              key=lambda s: list(SecurityLevel).index(s))
        
        # Determine if prompt is valid based on severity and block_critical setting
        valid = not (block_critical and highest_severity == SecurityLevel.CRITICAL)
        
        # Create issue messages
        issues = [
            f"Detected prompt injection attempt: {threat.metadata['injection_type']} " 
            f"({threat.severity.value} severity)"
            for threat in threats
        ]
        
        return ValidationResult(
            valid=valid,
            issues=issues,
            severity=highest_severity,
            metadata={
                "detections": [threat.to_dict() for threat in threats],
                "critical_blocked": block_critical and highest_severity == SecurityLevel.CRITICAL
            }
        )
    
    def sanitize_prompt(self, text: str, prefix: str = "", suffix: str = "") -> Tuple[str, ValidationResult]:
        """
        Sanitize a prompt and add security prefix/suffix.
        
        Args:
            text: Prompt text to sanitize
            prefix: Security prefix to add
            suffix: Security suffix to add
            
        Returns:
            Tuple[str, ValidationResult]: Sanitized prompt and validation result
        """
        # Validate the prompt first
        validation = self.validate_prompt(text)
        
        # If prompt is valid (or has only low/medium severity issues), sanitize it
        if validation.valid:
            # Remove any injection attempts
            sanitized, detections = self.sanitize_injections(text)
            
            # Add security prefix and suffix
            final_prompt = f"{prefix}{sanitized}{suffix}"
            
            # Update validation metadata
            validation.metadata["sanitized"] = True
            validation.metadata["sanitized_detections"] = detections
            
            return final_prompt, validation
        else:
            # Return original text if validation failed
            # (caller should handle the failure based on validation result)
            validation.metadata["sanitized"] = False
            
            return text, validation