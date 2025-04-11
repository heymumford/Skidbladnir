"""
Error and recovery models for the LLM Advisor.
"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum


class ErrorType(str, Enum):
    AUTHENTICATION = "authentication"
    RATE_LIMITING = "rate_limiting"
    RESOURCE_NOT_FOUND = "resource_not_found"
    PERMISSION_DENIED = "permission_denied"
    VALIDATION_ERROR = "validation_error"
    TIMEOUT = "timeout"
    SERVER_ERROR = "server_error"
    UNKNOWN = "unknown"


class SeverityLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class ErrorAnalysis:
    """Analysis of an API error, including root cause and metadata."""
    error_type: ErrorType
    root_cause: str
    severity: SeverityLevel
    confidence: float  # 0.0 to 1.0
    affected_component: str
    context: Optional[Dict[str, Any]] = None
    raw_error: Optional[Dict[str, Any]] = None


@dataclass
class RemediationStep:
    """A single step in a recovery strategy."""
    step: str
    details: str
    priority: int
    code_example: Optional[str] = None
    link: Optional[str] = None


@dataclass
class RecoveryStrategy:
    """A strategy for recovering from an API error."""
    error_analysis: ErrorAnalysis
    steps: List[RemediationStep]
    estimated_success_probability: float  # 0.0 to 1.0
    plain_language_explanation: str


@dataclass
class CodeExample:
    """Code example for handling a specific error scenario."""
    language: str
    code: str
    explanation: str
    error_type: ErrorType
    scenario: str