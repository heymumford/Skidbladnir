"""
Audit service for security logging.
"""

import json
import time
import logging
import os
from typing import Dict, List, Any, Optional, Union, Callable
from datetime import datetime

from ..models.security_models import AuditLogEntry, Threat, SecurityContext, SecurityLevel


class AuditService:
    """Service for security audit logging."""
    
    def __init__(self, log_file: str = None, console_logging: bool = True, 
                structured_log_file: str = None):
        """
        Initialize audit service.
        
        Args:
            log_file: Path to log file for text logs
            console_logging: Whether to log to console
            structured_log_file: Path to log file for structured JSON logs
        """
        self.log_file = log_file
        self.console_logging = console_logging
        self.structured_log_file = structured_log_file
        
        # Setup logging
        self.logger = logging.getLogger("llm_security_audit")
        self.logger.setLevel(logging.INFO)
        
        # Clear existing handlers
        for handler in self.logger.handlers[:]:
            self.logger.removeHandler(handler)
        
        # Add console handler if requested
        if console_logging:
            console_handler = logging.StreamHandler()
            console_handler.setFormatter(logging.Formatter(
                '%(asctime)s [%(levelname)s] %(message)s'
            ))
            self.logger.addHandler(console_handler)
        
        # Add file handler if log file specified
        if log_file:
            os.makedirs(os.path.dirname(log_file), exist_ok=True)
            file_handler = logging.FileHandler(log_file)
            file_handler.setFormatter(logging.Formatter(
                '%(asctime)s [%(levelname)s] %(message)s'
            ))
            self.logger.addHandler(file_handler)
    
    def log_security_event(self, action: str, details: str, 
                          security_context: SecurityContext = None,
                          metadata: Dict[str, Any] = None) -> AuditLogEntry:
        """
        Log a security event.
        
        Args:
            action: Action being performed
            details: Details of the action
            security_context: Security context for the action
            metadata: Additional metadata
            
        Returns:
            AuditLogEntry: Created audit log entry
        """
        # Create audit log entry
        entry = AuditLogEntry(
            action=action,
            details=details,
            user_id=security_context.user_id if security_context else None,
            resource_id=None,
            operation_id=security_context.operation_id if security_context else None,
            timestamp=time.time(),
            source_ip=security_context.source_ip if security_context else None,
            metadata=metadata or {}
        )
        
        # Log to text log
        self.logger.info(f"SECURITY EVENT: {entry.action} - {entry.details}")
        
        # Log structured JSON if structured log file specified
        if self.structured_log_file:
            self._append_structured_log(entry.to_dict())
        
        return entry
    
    def log_threat(self, threat: Threat, 
                  security_context: SecurityContext = None,
                  action_taken: str = None) -> AuditLogEntry:
        """
        Log a detected security threat.
        
        Args:
            threat: Detected threat
            security_context: Security context for the threat
            action_taken: Action taken in response to the threat
            
        Returns:
            AuditLogEntry: Created audit log entry
        """
        # Determine severity level for logger
        log_level = logging.WARNING
        if threat.severity == SecurityLevel.HIGH:
            log_level = logging.ERROR
        elif threat.severity == SecurityLevel.CRITICAL:
            log_level = logging.CRITICAL
        
        # Create audit log entry details
        details = f"Detected {threat.type} threat: {threat.description}"
        if action_taken:
            details += f" - Action taken: {action_taken}"
        
        # Create audit log entry
        entry = AuditLogEntry(
            action=f"THREAT_{threat.type}",
            details=details,
            user_id=security_context.user_id if security_context else None,
            resource_id=None,
            operation_id=security_context.operation_id if security_context else None,
            timestamp=time.time(),
            source_ip=security_context.source_ip if security_context else None,
            metadata={
                "threat": threat.to_dict(),
                "action_taken": action_taken
            }
        )
        
        # Log to text log
        self.logger.log(log_level, f"SECURITY THREAT: {entry.details} [{threat.severity}]")
        
        # Log structured JSON if structured log file specified
        if self.structured_log_file:
            self._append_structured_log(entry.to_dict())
        
        return entry
    
    def log_validation(self, validation_type: str, valid: bool, issues: List[str],
                      security_context: SecurityContext = None) -> AuditLogEntry:
        """
        Log a validation result.
        
        Args:
            validation_type: Type of validation performed
            valid: Whether validation was successful
            issues: List of validation issues
            security_context: Security context for the validation
            
        Returns:
            AuditLogEntry: Created audit log entry
        """
        # Determine severity level for logger
        log_level = logging.INFO if valid else logging.WARNING
        
        # Create audit log entry details
        if valid:
            details = f"Validation successful: {validation_type}"
        else:
            details = f"Validation failed: {validation_type} - Issues: {', '.join(issues)}"
        
        # Create audit log entry
        entry = AuditLogEntry(
            action=f"VALIDATION_{validation_type.upper()}",
            details=details,
            user_id=security_context.user_id if security_context else None,
            resource_id=None,
            operation_id=security_context.operation_id if security_context else None,
            timestamp=time.time(),
            source_ip=security_context.source_ip if security_context else None,
            metadata={
                "validation_type": validation_type,
                "valid": valid,
                "issues": issues
            }
        )
        
        # Log to text log
        self.logger.log(log_level, f"VALIDATION: {entry.details}")
        
        # Log structured JSON if structured log file specified
        if self.structured_log_file:
            self._append_structured_log(entry.to_dict())
        
        return entry
    
    def log_sanitization(self, sanitization_type: str, num_items_sanitized: int,
                        security_context: SecurityContext = None) -> AuditLogEntry:
        """
        Log a sanitization action.
        
        Args:
            sanitization_type: Type of sanitization performed
            num_items_sanitized: Number of items sanitized
            security_context: Security context for the sanitization
            
        Returns:
            AuditLogEntry: Created audit log entry
        """
        # Create audit log entry details
        details = f"Sanitized {num_items_sanitized} items of type {sanitization_type}"
        
        # Create audit log entry
        entry = AuditLogEntry(
            action=f"SANITIZATION_{sanitization_type.upper()}",
            details=details,
            user_id=security_context.user_id if security_context else None,
            resource_id=None,
            operation_id=security_context.operation_id if security_context else None,
            timestamp=time.time(),
            source_ip=security_context.source_ip if security_context else None,
            metadata={
                "sanitization_type": sanitization_type,
                "num_items_sanitized": num_items_sanitized
            }
        )
        
        # Log to text log
        self.logger.info(f"SANITIZATION: {entry.details}")
        
        # Log structured JSON if structured log file specified
        if self.structured_log_file:
            self._append_structured_log(entry.to_dict())
        
        return entry
    
    def get_recent_events(self, limit: int = 100, 
                         filter_action: str = None) -> List[Dict[str, Any]]:
        """
        Get recent events from structured log file.
        
        Args:
            limit: Maximum number of events to return
            filter_action: Filter by action type
            
        Returns:
            List[Dict[str, Any]]: List of recent events
        """
        if not self.structured_log_file or not os.path.exists(self.structured_log_file):
            return []
        
        try:
            with open(self.structured_log_file, 'r') as f:
                # Read all lines and parse JSON
                events = [json.loads(line) for line in f if line.strip()]
            
            # Filter by action if requested
            if filter_action:
                events = [e for e in events if e.get('action', '').startswith(filter_action)]
            
            # Sort by timestamp (descending) and limit
            events.sort(key=lambda e: e.get('timestamp', 0), reverse=True)
            return events[:limit]
            
        except Exception as e:
            self.logger.error(f"Error reading structured log: {str(e)}")
            return []
    
    def get_threat_summary(self, time_window_hours: int = 24) -> Dict[str, Any]:
        """
        Get summary of recent threats.
        
        Args:
            time_window_hours: Time window in hours
            
        Returns:
            Dict[str, Any]: Threat summary
        """
        # Get all events
        all_events = self.get_recent_events()
        
        # Current timestamp and cutoff
        current_time = time.time()
        cutoff_time = current_time - (time_window_hours * 3600)
        
        # Filter threat events in time window
        threats = [
            e for e in all_events 
            if e.get('action', '').startswith('THREAT_') and e.get('timestamp', 0) >= cutoff_time
        ]
        
        # Count by type and severity
        threat_types = {}
        severity_counts = {
            SecurityLevel.LOW.value: 0,
            SecurityLevel.MEDIUM.value: 0,
            SecurityLevel.HIGH.value: 0,
            SecurityLevel.CRITICAL.value: 0
        }
        
        for threat in threats:
            # Extract threat type
            threat_type = threat.get('action', '').replace('THREAT_', '')
            threat_types[threat_type] = threat_types.get(threat_type, 0) + 1
            
            # Extract severity
            threat_data = threat.get('metadata', {}).get('threat', {})
            severity = threat_data.get('severity', SecurityLevel.LOW.value)
            severity_counts[severity] = severity_counts.get(severity, 0) + 1
        
        return {
            'total_threats': len(threats),
            'time_window_hours': time_window_hours,
            'by_type': threat_types,
            'by_severity': severity_counts,
            'most_recent': threats[:5] if threats else []
        }
    
    def _append_structured_log(self, entry: Dict[str, Any]) -> None:
        """
        Append entry to structured log file.
        
        Args:
            entry: Entry to append
        """
        try:
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(self.structured_log_file), exist_ok=True)
            
            # Append to log file
            with open(self.structured_log_file, 'a') as f:
                f.write(json.dumps(entry) + "\n")
                
        except Exception as e:
            self.logger.error(f"Error writing to structured log: {str(e)}")