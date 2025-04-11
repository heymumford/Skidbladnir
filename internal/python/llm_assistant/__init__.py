"""
LLM Assistant module for troubleshooting and guided solutions.

This module provides AI-powered assistance for troubleshooting and resolving
issues during migration processes, particularly for Zephyr and qTest integration.
"""

from .services.llm_service import LLMService
from .services.troubleshooter import LLMTroubleshooter
from .services.knowledge_service import KnowledgeService
from .models.troubleshooting_models import (
    ErrorContext,
    ErrorAnalysis, 
    RemediationSuggestion,
    CodeExample,
    ErrorExplanation
)
from .models.knowledge_models import KnowledgeReference
from .troubleshooting.api_error_analyzer import APIErrorAnalyzer
from .troubleshooting.remediation_generator import RemediationGenerator
from .troubleshooting.error_explainer import ErrorExplainer
from .troubleshooting.code_generator import CodeExampleGenerator

__all__ = [
    'LLMService',
    'LLMTroubleshooter',
    'KnowledgeService',
    'ErrorContext',
    'ErrorAnalysis',
    'RemediationSuggestion',
    'CodeExample',
    'ErrorExplanation',
    'KnowledgeReference',
    'APIErrorAnalyzer',
    'RemediationGenerator',
    'ErrorExplainer',
    'CodeExampleGenerator'
]