"""
Models for the LLM Troubleshooting Assistant.
"""

from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional
from enum import Enum
from datetime import datetime


class ErrorType(str, Enum):
    AUTHENTICATION = "authentication"
    PERMISSION = "permission"
    RATE_LIMIT = "rate_limit"
    NETWORK = "network"
    TIMEOUT = "timeout"
    RESOURCE_NOT_FOUND = "resource_not_found"
    VALIDATION = "validation"
    DATA_FORMAT = "data_format"
    TRANSFORMATION = "transformation"
    CONCURRENCY = "concurrency"
    CONFIGURATION = "configuration"
    SERVER_ERROR = "server_error"
    DATABASE = "database"
    MEMORY = "memory"
    UNKNOWN = "unknown"


class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class Provider(str, Enum):
    ZEPHYR = "zephyr"
    QTEST = "qtest"
    MIGRATION_TOOL = "migration_tool"
    SYSTEM = "system"
    UNKNOWN = "unknown"


class TechnicalLevel(str, Enum):
    BASIC = "basic"         # For non-technical users
    INTERMEDIATE = "intermediate"  # For somewhat technical users
    ADVANCED = "advanced"   # For developers or IT professionals


@dataclass
class ErrorContext:
    """Context information about an error that occurred."""
    timestamp: datetime = field(default_factory=datetime.now)
    provider: Provider = Provider.UNKNOWN
    operation: str = ""
    http_status: Optional[int] = None
    error_message: str = ""
    error_code: Optional[str] = None
    request_data: Optional[Dict[str, Any]] = None
    response_data: Optional[Dict[str, Any]] = None
    user_id: Optional[str] = None
    endpoint: Optional[str] = None
    raw_data: Optional[Dict[str, Any]] = None
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ErrorContext':
        """Create an ErrorContext instance from a dictionary."""
        # Extract provider
        provider_str = data.get("provider", "unknown").lower()
        if "zephyr" in provider_str:
            provider = Provider.ZEPHYR
        elif "qtest" in provider_str:
            provider = Provider.QTEST
        elif "migration" in provider_str:
            provider = Provider.MIGRATION_TOOL
        elif "system" in provider_str:
            provider = Provider.SYSTEM
        else:
            provider = Provider.UNKNOWN
            
        # Extract http status
        http_status = None
        if "status_code" in data:
            http_status = data.get("status_code")
        elif "status" in data:
            http_status = data.get("status")
            
        # Create instance
        return cls(
            timestamp=datetime.fromisoformat(data.get("timestamp", datetime.now().isoformat())),
            provider=provider,
            operation=data.get("operation", ""),
            http_status=http_status,
            error_message=data.get("message", data.get("error_message", "")),
            error_code=data.get("error_code", data.get("code", None)),
            request_data=data.get("request_data", None),
            response_data=data.get("response_data", None),
            user_id=data.get("user_id", None),
            endpoint=data.get("endpoint", None),
            raw_data=data
        )


@dataclass
class ErrorAnalysis:
    """Analysis of an error, including classification and root cause identification."""
    error_type: ErrorType
    root_cause: str
    severity: Severity
    confidence: float  # 0.0 to 1.0
    affected_component: str
    provider: Provider = Provider.UNKNOWN
    common_pattern: bool = False
    related_errors: List[str] = field(default_factory=list)
    potential_causes: List[str] = field(default_factory=list)
    impact: str = ""
    context: Optional[ErrorContext] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "error_type": self.error_type,
            "root_cause": self.root_cause,
            "severity": self.severity,
            "confidence": self.confidence,
            "affected_component": self.affected_component,
            "provider": self.provider,
            "common_pattern": self.common_pattern,
            "related_errors": self.related_errors,
            "potential_causes": self.potential_causes,
            "impact": self.impact
        }


@dataclass
class RemediationAction:
    """A specific action to take as part of a remediation."""
    action: str
    details: str
    priority: int  # Lower number = higher priority
    estimated_success_probability: float = 0.0  # 0.0 to 1.0
    code_snippet: Optional[str] = None
    documentation_link: Optional[str] = None
    requires_admin: bool = False
    requires_restart: bool = False
    automated: bool = False
    estimated_time: Optional[str] = None  # e.g., "5 minutes"


@dataclass
class RemediationSuggestion:
    """A complete remediation suggestion for an error."""
    error_analysis: ErrorAnalysis
    steps: List[RemediationAction]
    user_level: TechnicalLevel = TechnicalLevel.INTERMEDIATE
    success_probability: float = 0.0  # 0.0 to 1.0
    estimated_time: str = "unknown"  # e.g., "5-10 minutes"
    side_effects: List[str] = field(default_factory=list)
    alternative_approaches: List[str] = field(default_factory=list)
    references: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "error_analysis": self.error_analysis.to_dict(),
            "steps": [
                {
                    "action": step.action,
                    "details": step.details,
                    "priority": step.priority,
                    "code_snippet": step.code_snippet,
                    "documentation_link": step.documentation_link,
                    "requires_admin": step.requires_admin,
                    "requires_restart": step.requires_restart,
                    "automated": step.automated,
                    "estimated_time": step.estimated_time
                }
                for step in self.steps
            ],
            "user_level": self.user_level,
            "success_probability": self.success_probability,
            "estimated_time": self.estimated_time,
            "side_effects": self.side_effects,
            "alternative_approaches": self.alternative_approaches,
            "references": self.references
        }


@dataclass
class ErrorExplanation:
    """User-friendly explanation of an error in plain language."""
    error_analysis: ErrorAnalysis
    explanation: str
    technical_level: TechnicalLevel
    analogy: Optional[str] = None
    common_mistake: bool = False
    prevention_tips: List[str] = field(default_factory=list)
    related_concepts: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "error_analysis": self.error_analysis.to_dict(),
            "explanation": self.explanation,
            "technical_level": self.technical_level,
            "analogy": self.analogy,
            "common_mistake": self.common_mistake,
            "prevention_tips": self.prevention_tips,
            "related_concepts": self.related_concepts
        }


@dataclass
class CodeExample:
    """Code example for handling a specific error type."""
    language: str
    error_type: ErrorType
    code: str
    explanation: str
    imports: List[str] = field(default_factory=list)
    dependencies: List[str] = field(default_factory=list)
    context: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "language": self.language,
            "error_type": self.error_type,
            "code": self.code,
            "explanation": self.explanation,
            "imports": self.imports,
            "dependencies": self.dependencies
        }