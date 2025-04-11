"""
Security models for the LLM Security module.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, Any, List, Optional
import time


class SecurityLevel(str, Enum):
    """Security severity levels."""
    
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ThreatType(str, Enum):
    """Types of security threats."""
    
    PROMPT_INJECTION = "prompt_injection"
    PII_DETECTED = "pii_detected"
    PII_LEAKED = "pii_leaked"
    DATA_LEAKAGE = "data_leakage"
    SENSITIVE_FIELD_LEAK = "sensitive_field_leak"
    SCHEMA_VIOLATION = "schema_violation"
    SANDBOX_ESCAPE = "sandbox_escape"
    UNAUTHORIZED_ACTION = "unauthorized_action"


@dataclass
class Threat:
    """
    Represents a detected security threat.
    """
    
    type: ThreatType
    severity: SecurityLevel
    description: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    timestamp: float = field(default_factory=time.time)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "type": self.type,
            "severity": self.severity,
            "description": self.description,
            "metadata": self.metadata,
            "timestamp": self.timestamp
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Threat':
        """Create from dictionary."""
        return cls(
            type=data["type"],
            severity=data["severity"],
            description=data["description"],
            metadata=data.get("metadata", {}),
            timestamp=data.get("timestamp", time.time())
        )


@dataclass
class AuditLogEntry:
    """
    Entry in the security audit log.
    """
    
    action: str
    details: str
    user_id: Optional[str] = None
    resource_id: Optional[str] = None
    operation_id: Optional[str] = None
    timestamp: float = field(default_factory=time.time)
    source_ip: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "action": self.action,
            "details": self.details,
            "user_id": self.user_id,
            "resource_id": self.resource_id,
            "operation_id": self.operation_id,
            "timestamp": self.timestamp,
            "source_ip": self.source_ip,
            "metadata": self.metadata
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'AuditLogEntry':
        """Create from dictionary."""
        return cls(
            action=data["action"],
            details=data["details"],
            user_id=data.get("user_id"),
            resource_id=data.get("resource_id"),
            operation_id=data.get("operation_id"),
            timestamp=data.get("timestamp", time.time()),
            source_ip=data.get("source_ip"),
            metadata=data.get("metadata", {})
        )


@dataclass
class SecurityContext:
    """
    Security context for LLM operations.
    """
    
    user_id: Optional[str] = None
    operation_id: Optional[str] = None
    permissions: List[str] = field(default_factory=list)
    quotas: Dict[str, Any] = field(default_factory=dict)
    source_ip: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def has_permission(self, permission: str) -> bool:
        """Check if context has a specific permission."""
        return permission in self.permissions or "*" in self.permissions
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "user_id": self.user_id,
            "operation_id": self.operation_id,
            "permissions": self.permissions,
            "quotas": self.quotas,
            "source_ip": self.source_ip,
            "metadata": self.metadata
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'SecurityContext':
        """Create from dictionary."""
        return cls(
            user_id=data.get("user_id"),
            operation_id=data.get("operation_id"),
            permissions=data.get("permissions", []),
            quotas=data.get("quotas", {}),
            source_ip=data.get("source_ip"),
            metadata=data.get("metadata", {})
        )


@dataclass
class ValidationResult:
    """
    Result of a security validation check.
    """
    
    valid: bool
    issues: List[str] = field(default_factory=list)
    severity: SecurityLevel = SecurityLevel.LOW
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "valid": self.valid,
            "issues": self.issues,
            "severity": self.severity,
            "metadata": self.metadata
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ValidationResult':
        """Create from dictionary."""
        return cls(
            valid=data["valid"],
            issues=data.get("issues", []),
            severity=data.get("severity", SecurityLevel.LOW),
            metadata=data.get("metadata", {})
        )