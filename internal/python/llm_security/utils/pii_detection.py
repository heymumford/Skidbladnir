"""
PII detection and redaction utilities for LLM Security.
"""

import re
from typing import Dict, List, Any, Optional, Tuple, Pattern, Set, Union
import json

from ..models.security_models import Threat, SecurityLevel, ThreatType


class PIIDetector:
    """Detector for Personally Identifiable Information (PII) and sensitive data."""
    
    def __init__(self, custom_patterns: Dict[str, str] = None):
        """
        Initialize with default and custom PII detection patterns.
        
        Args:
            custom_patterns: Additional patterns to detect
        """
        # Default PII patterns
        self.pii_patterns: Dict[str, Pattern] = {
            # Email addresses
            "email": re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
            
            # API keys (generic pattern for alphanumeric strings of 32+ chars)
            "api_key": re.compile(r'\b[A-Za-z0-9_\-]{32,}\b'),
            
            # Phone numbers (various formats)
            "phone": re.compile(r'\b(\+?\d{1,3}[\s\-]?)?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{4}\b'),
            
            # Social Security Numbers (US)
            "ssn": re.compile(r'\b\d{3}[\s\-]?\d{2}[\s\-]?\d{4}\b'),
            
            # Credit card numbers (major card formats)
            "credit_card": re.compile(
                r'\b(?:\d{4}[\s\-]?){3}\d{4}\b|\b\d{13,16}\b'
            ),
            
            # Passwords in URL parameters or assignments
            "password": re.compile(
                r'(?:password|passwd|pwd)[\s\=\:][\"\']?([^\"\'\&\s]{4,})'
            ),
            
            # Authentication tokens
            "auth_token": re.compile(
                r'(?:auth[^\s]*token|token|bearer|jwt)[\s\=\:]+[\"\']?([^\"\'\&\s]{8,})'
            ),
            
            # IP addresses
            "ip_address": re.compile(
                r'\b(?:\d{1,3}\.){3}\d{1,3}\b'
            ),
            
            # AWS access keys
            "aws_key": re.compile(
                r'\b(?:AKIA|ASIA)[0-9A-Z]{16}\b'
            ),
            
            # Private keys
            "private_key": re.compile(
                r'\-{5}BEGIN (?:RSA|OPENSSH|DSA|EC|PGP) PRIVATE KEY\-{5}'
            )
        }
        
        # Add custom patterns if provided
        if custom_patterns:
            for name, pattern in custom_patterns.items():
                self.pii_patterns[name] = re.compile(pattern)
    
    def detect_pii(self, text: str) -> List[Dict[str, Any]]:
        """
        Detect PII in text.
        
        Args:
            text: Text to check for PII
            
        Returns:
            List[Dict[str, Any]]: List of detected PII instances
        """
        if not text:
            return []
            
        detections = []
        
        # Check each pattern
        for pii_type, pattern in self.pii_patterns.items():
            for match in pattern.finditer(text):
                # Get the matched PII
                pii_value = match.group(0)
                
                # Get context around the match
                start = max(0, match.start() - 20)
                end = min(len(text), match.end() + 20)
                context = text[start:end]
                
                detections.append({
                    "type": pii_type,
                    "value": pii_value,
                    "start": match.start(),
                    "end": match.end(),
                    "context": context
                })
        
        return detections
    
    def redact_pii(self, text: str, replacement_format: str = "[REDACTED:{type}]") -> Tuple[str, List[Dict[str, Any]]]:
        """
        Redact PII from text.
        
        Args:
            text: Text to redact
            replacement_format: Format for replacement string
            
        Returns:
            Tuple[str, List[Dict[str, Any]]]: Redacted text and list of redactions
        """
        if not text:
            return text, []
            
        # Detect PII
        detections = self.detect_pii(text)
        
        # Sort detections by start position in reverse order
        # This allows us to replace from end to beginning without changing indices
        detections_sorted = sorted(detections, key=lambda d: d["start"], reverse=True)
        
        # Apply redactions
        redacted_text = text
        for detection in detections_sorted:
            replacement = replacement_format.format(type=detection["type"])
            redacted_text = (
                redacted_text[:detection["start"]] + 
                replacement + 
                redacted_text[detection["end"]:]
            )
        
        return redacted_text, detections
    
    def create_threats_from_detections(self, detections: List[Dict[str, Any]], 
                                       in_prompt: bool = True) -> List[Threat]:
        """
        Create threat objects from PII detections.
        
        Args:
            detections: PII detections
            in_prompt: Whether detections are in prompt (True) or output (False)
            
        Returns:
            List[Threat]: List of threat objects
        """
        threats = []
        
        # Set threat type and severity based on context
        threat_type = ThreatType.PII_DETECTED if in_prompt else ThreatType.PII_LEAKED
        default_severity = SecurityLevel.MEDIUM if in_prompt else SecurityLevel.HIGH
        
        # Severity levels for different PII types
        severity_map = {
            "email": SecurityLevel.MEDIUM,
            "phone": SecurityLevel.MEDIUM,
            "ip_address": SecurityLevel.MEDIUM,
            "password": SecurityLevel.HIGH,
            "auth_token": SecurityLevel.HIGH,
            "api_key": SecurityLevel.HIGH,
            "credit_card": SecurityLevel.HIGH,
            "ssn": SecurityLevel.HIGH,
            "aws_key": SecurityLevel.HIGH,
            "private_key": SecurityLevel.CRITICAL
        }
        
        for detection in detections:
            # Determine severity
            severity = severity_map.get(detection["type"], default_severity)
            
            # Create threat object
            threat = Threat(
                type=threat_type,
                severity=severity,
                description=f"{detection['type']} detected in {'prompt' if in_prompt else 'output'}",
                metadata={
                    "pii_type": detection["type"],
                    "start": detection["start"],
                    "end": detection["end"],
                    "context": detection["context"],
                    "in_prompt": in_prompt
                }
            )
            
            threats.append(threat)
        
        return threats
    
    def detect_pii_in_structure(self, data: Any) -> List[Dict[str, Any]]:
        """
        Recursively detect PII in structured data.
        
        Args:
            data: Structured data to check
            
        Returns:
            List[Dict[str, Any]]: List of detected PII instances
        """
        detections = []
        
        if isinstance(data, str):
            # String values - direct PII check
            return self.detect_pii(data)
            
        elif isinstance(data, dict):
            # Check each key and value in dictionary
            for key, value in data.items():
                # Check key (if string)
                if isinstance(key, str):
                    key_detections = self.detect_pii(key)
                    for detection in key_detections:
                        detection["path"] = key
                        detections.append(detection)
                
                # Recursively check value
                value_detections = self.detect_pii_in_structure(value)
                for detection in value_detections:
                    detection["path"] = f"{key}.{detection.get('path', '')}" if "path" in detection else key
                    detections.append(detection)
                    
        elif isinstance(data, list):
            # Check each item in list
            for i, item in enumerate(data):
                item_detections = self.detect_pii_in_structure(item)
                for detection in item_detections:
                    detection["path"] = f"[{i}].{detection.get('path', '')}" if "path" in detection else f"[{i}]"
                    detections.append(detection)
        
        # Other types don't contain PII
        return detections
    
    def redact_pii_in_structure(self, data: Any, replacement_format: str = "[REDACTED:{type}]") -> Tuple[Any, List[Dict[str, Any]]]:
        """
        Recursively redact PII in structured data.
        
        Args:
            data: Structured data to redact
            replacement_format: Format for replacement string
            
        Returns:
            Tuple[Any, List[Dict[str, Any]]]: Redacted data and list of redactions
        """
        all_redactions = []
        
        # Handle different data types
        if isinstance(data, str):
            # String values - direct redaction
            redacted, redactions = self.redact_pii(data, replacement_format)
            return redacted, redactions
            
        elif isinstance(data, dict):
            # Redact dictionary
            redacted_dict = {}
            
            for key, value in data.items():
                # Redact value
                redacted_value, value_redactions = self.redact_pii_in_structure(value, replacement_format)
                
                # Add path information to redactions
                for redaction in value_redactions:
                    redaction["path"] = f"{key}.{redaction.get('path', '')}" if "path" in redaction else key
                
                all_redactions.extend(value_redactions)
                redacted_dict[key] = redacted_value
            
            return redacted_dict, all_redactions
            
        elif isinstance(data, list):
            # Redact list
            redacted_list = []
            
            for i, item in enumerate(data):
                redacted_item, item_redactions = self.redact_pii_in_structure(item, replacement_format)
                
                # Add path information to redactions
                for redaction in item_redactions:
                    redaction["path"] = f"[{i}].{redaction.get('path', '')}" if "path" in redaction else f"[{i}]"
                
                all_redactions.extend(item_redactions)
                redacted_list.append(redacted_item)
            
            return redacted_list, all_redactions
            
        else:
            # Other types - return as is
            return data, []
    
    def redact_sensitive_keys(self, data: Any, sensitive_keys: Set[str], 
                              replacement: str = "[REDACTED]") -> Tuple[Any, List[Dict[str, Any]]]:
        """
        Redact values of sensitive keys in structured data.
        
        Args:
            data: Structured data to redact
            sensitive_keys: Set of sensitive key names
            replacement: Replacement string
            
        Returns:
            Tuple[Any, List[Dict[str, Any]]]: Redacted data and list of redactions
        """
        redactions = []
        
        if not data or not sensitive_keys:
            return data, redactions
        
        if isinstance(data, dict):
            # Redact dictionary
            redacted_dict = {}
            
            for key, value in data.items():
                # Check if this key is sensitive
                key_lower = key.lower() if isinstance(key, str) else ""
                is_sensitive = any(sensitive_key in key_lower for sensitive_key in sensitive_keys)
                
                if is_sensitive and value:
                    # Redact value
                    redacted_dict[key] = replacement
                    redactions.append({
                        "type": "sensitive_key",
                        "key": key,
                        "path": key
                    })
                else:
                    # Recursively redact value
                    redacted_value, value_redactions = self.redact_sensitive_keys(
                        value, sensitive_keys, replacement
                    )
                    
                    # Add path information to redactions
                    for redaction in value_redactions:
                        redaction["path"] = f"{key}.{redaction.get('path', '')}" if "path" in redaction else key
                    
                    redactions.extend(value_redactions)
                    redacted_dict[key] = redacted_value
            
            return redacted_dict, redactions
            
        elif isinstance(data, list):
            # Redact list
            redacted_list = []
            
            for i, item in enumerate(data):
                redacted_item, item_redactions = self.redact_sensitive_keys(
                    item, sensitive_keys, replacement
                )
                
                # Add path information to redactions
                for redaction in item_redactions:
                    redaction["path"] = f"[{i}].{redaction.get('path', '')}" if "path" in redaction else f"[{i}]"
                
                redactions.extend(item_redactions)
                redacted_list.append(redacted_item)
            
            return redacted_list, redactions
            
        else:
            # Other types - return as is
            return data, []