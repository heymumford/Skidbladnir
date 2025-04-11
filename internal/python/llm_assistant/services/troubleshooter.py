"""
Main LLM Troubleshooter service that coordinates error analysis and remediation.
"""

import json
import logging
import time
from typing import Dict, Any, List, Optional, Tuple

from .llm_service import LLMService
from .knowledge_service import KnowledgeService
from ..models.troubleshooting_models import (
    ErrorContext, 
    ErrorAnalysis, 
    ErrorType,
    Severity,
    Provider,
    RemediationSuggestion,
    RemediationAction,
    ErrorExplanation,
    CodeExample,
    TechnicalLevel
)
from ..models.knowledge_models import (
    KnowledgeType,
    KnowledgeProvider,
    KnowledgeReference
)
from ..troubleshooting.api_error_analyzer import APIErrorAnalyzer
from ..troubleshooting.remediation_generator import RemediationGenerator
from ..troubleshooting.error_explainer import ErrorExplainer
from ..troubleshooting.code_generator import CodeExampleGenerator

logger = logging.getLogger(__name__)


class LLMTroubleshooter:
    """
    LLM-powered API troubleshooter for migration workflows.
    
    This service analyzes errors, suggests remediation steps,
    explains issues in plain language, and generates code examples.
    """
    
    def __init__(self, 
                 llm_service: Optional[LLMService] = None,
                 knowledge_service: Optional[KnowledgeService] = None):
        """
        Initialize the LLM Troubleshooter.
        
        Args:
            llm_service: The LLM service to use, or None to create a new one
            knowledge_service: The knowledge service to use, or None to create a new one
        """
        self.llm_service = llm_service or LLMService()
        self.knowledge_service = knowledge_service or KnowledgeService()
        self.error_analyzer = APIErrorAnalyzer(self.llm_service, self.knowledge_service)
        self.remediation_generator = RemediationGenerator(self.llm_service, self.knowledge_service)
        self.error_explainer = ErrorExplainer(self.llm_service, self.knowledge_service)
        self.code_generator = CodeExampleGenerator(self.llm_service, self.knowledge_service)
        
        self.queries = []
        self.cached_results = {}
        
    def load_model(self) -> bool:
        """
        Load the language model.
        
        Returns:
            bool: True if the model was loaded successfully
        """
        return self.llm_service.load_model()
        
    def is_loaded(self) -> bool:
        """
        Check if the model is loaded.
        
        Returns:
            bool: True if the model is loaded
        """
        return self.llm_service.is_loaded()
        
    def analyze_error(self, error_data: Dict[str, Any]) -> ErrorAnalysis:
        """
        Analyze error data and identify root cause.
        
        Args:
            error_data: Error data including status code, message, etc.
            
        Returns:
            ErrorAnalysis: Analysis of the error
        """
        # Track the query
        self.queries.append({"type": "error_analysis", "data": error_data})
        
        # Ensure model is loaded
        if not self.is_loaded():
            self.load_model()
            
        # Create error context
        error_context = ErrorContext.from_dict(error_data)
        
        # Check cache
        cache_key = f"analyze_{hash(json.dumps(error_data, sort_keys=True))}"
        if cache_key in self.cached_results:
            logger.debug(f"Using cached result for {cache_key}")
            return self.cached_results[cache_key]
            
        # Analyze error
        analysis = self.error_analyzer.analyze(error_context)
        
        # Cache result
        self.cached_results[cache_key] = analysis
        
        return analysis
        
    def generate_remediation(self, error_analysis: ErrorAnalysis,
                          technical_level: TechnicalLevel = TechnicalLevel.INTERMEDIATE) -> RemediationSuggestion:
        """
        Generate remediation steps based on error analysis.
        
        Args:
            error_analysis: Analysis of the error
            technical_level: The technical level of the user
            
        Returns:
            RemediationSuggestion: Suggested remediation with ordered steps
        """
        # Track the query
        self.queries.append({
            "type": "remediation",
            "data": error_analysis.to_dict(),
            "technical_level": technical_level
        })
        
        # Ensure model is loaded
        if not self.is_loaded():
            self.load_model()
            
        # Check cache
        cache_key = f"remediation_{hash(json.dumps(error_analysis.to_dict(), sort_keys=True))}_{technical_level}"
        if cache_key in self.cached_results:
            logger.debug(f"Using cached result for {cache_key}")
            return self.cached_results[cache_key]
            
        # Generate remediation
        remediation = self.remediation_generator.generate(error_analysis, technical_level)
        
        # Cache result
        self.cached_results[cache_key] = remediation
        
        return remediation
        
    def explain_error(self, error_analysis: ErrorAnalysis,
                     technical_level: TechnicalLevel = TechnicalLevel.INTERMEDIATE) -> ErrorExplanation:
        """
        Generate user-friendly explanation of the error.
        
        Args:
            error_analysis: Analysis of the error
            technical_level: The technical level of the user
            
        Returns:
            ErrorExplanation: User-friendly explanation of the error
        """
        # Track the query
        self.queries.append({
            "type": "explanation",
            "data": error_analysis.to_dict(),
            "technical_level": technical_level
        })
        
        # Ensure model is loaded
        if not self.is_loaded():
            self.load_model()
            
        # Check cache
        cache_key = f"explain_{hash(json.dumps(error_analysis.to_dict(), sort_keys=True))}_{technical_level}"
        if cache_key in self.cached_results:
            logger.debug(f"Using cached result for {cache_key}")
            return self.cached_results[cache_key]
            
        # Generate explanation
        explanation = self.error_explainer.explain(error_analysis, technical_level)
        
        # Cache result
        self.cached_results[cache_key] = explanation
        
        return explanation
        
    def generate_code_example(self, language: str, error_type: ErrorType,
                            context: Optional[Dict[str, Any]] = None) -> CodeExample:
        """
        Generate code example to handle a specific error type.
        
        Args:
            language: Programming language (javascript, python, etc.)
            error_type: Type of error to handle
            context: Additional context for code generation
            
        Returns:
            CodeExample: Code example for handling the error
        """
        # Track the query
        context = context or {}
        self.queries.append({
            "type": "code_example",
            "language": language,
            "error_type": error_type,
            "context": context
        })
        
        # Ensure model is loaded
        if not self.is_loaded():
            self.load_model()
            
        # Check cache
        cache_key = f"code_{language}_{error_type}_{hash(json.dumps(context, sort_keys=True))}"
        if cache_key in self.cached_results:
            logger.debug(f"Using cached result for {cache_key}")
            return self.cached_results[cache_key]
            
        # Generate code example
        code_example = self.code_generator.generate(language, error_type, context)
        
        # Cache result
        self.cached_results[cache_key] = code_example
        
        return code_example
        
    def get_complete_troubleshooting_guide(self, error_data: Dict[str, Any],
                                        technical_level: TechnicalLevel = TechnicalLevel.INTERMEDIATE) -> Dict[str, Any]:
        """
        Generate a complete troubleshooting guide for an error.
        
        Args:
            error_data: Error data including status code, message, etc.
            technical_level: The technical level of the user
            
        Returns:
            Dict[str, Any]: Complete troubleshooting guide with analysis, 
                            remediation, explanation, and code examples
        """
        # Track the query
        self.queries.append({
            "type": "troubleshooting_guide",
            "data": error_data,
            "technical_level": technical_level
        })
        
        # Ensure model is loaded
        if not self.is_loaded():
            self.load_model()
            
        # Step 1: Analyze error
        analysis = self.analyze_error(error_data)
        
        # Step 2: Generate remediation steps
        remediation = self.generate_remediation(analysis, technical_level)
        
        # Step 3: Generate explanation
        explanation = self.explain_error(analysis, technical_level)
        
        # Step 4: Generate code example (in JavaScript by default)
        code_example = self.generate_code_example("javascript", analysis.error_type)
        
        # Step 5: Find relevant knowledge references
        knowledge_references = self.knowledge_service.get_by_error_type(str(analysis.error_type))
        
        # Compile complete guide
        guide = {
            "error_analysis": analysis.to_dict(),
            "remediation": remediation.to_dict(),
            "explanation": explanation.to_dict(),
            "code_example": code_example.to_dict(),
            "knowledge_references": [ref.to_dict() for ref in knowledge_references[:3]],
            "technical_level": technical_level
        }
        
        return guide
        
    def check_provider_status(self, provider: Provider) -> Dict[str, Any]:
        """
        Check the status of a provider's API.
        
        Args:
            provider: The provider to check
            
        Returns:
            Dict[str, Any]: Status information
        """
        # This would typically involve making actual API calls to check status
        # For this demonstration, we'll return mock data
        
        if provider == Provider.ZEPHYR:
            return {
                "status": "operational",
                "response_time": "120ms",
                "last_checked": time.strftime("%Y-%m-%d %H:%M:%S"),
                "rate_limit_remaining": 4850,
                "rate_limit_reset": "in 1 hour",
                "known_issues": []
            }
        elif provider == Provider.QTEST:
            return {
                "status": "operational",
                "response_time": "150ms",
                "last_checked": time.strftime("%Y-%m-%d %H:%M:%S"),
                "rate_limit_remaining": 9500,
                "rate_limit_reset": "in 1 hour",
                "known_issues": []
            }
        else:
            return {
                "status": "unknown",
                "last_checked": time.strftime("%Y-%m-%d %H:%M:%S"),
                "message": f"Provider {provider} status check not implemented"
            }
            
    def search_knowledge_base(self, query: str) -> List[Dict[str, Any]]:
        """
        Search the knowledge base for relevant information.
        
        Args:
            query: The search query
            
        Returns:
            List[Dict[str, Any]]: Search results
        """
        results = self.knowledge_service.search(query)
        return [ref.to_dict() for ref in results]
        
    def get_provider_documentation(self, provider: Provider) -> List[Dict[str, Any]]:
        """
        Get documentation for a specific provider.
        
        Args:
            provider: The provider
            
        Returns:
            List[Dict[str, Any]]: Documentation items
        """
        provider_map = {
            Provider.ZEPHYR: KnowledgeProvider.ZEPHYR,
            Provider.QTEST: KnowledgeProvider.QTEST,
            Provider.MIGRATION_TOOL: KnowledgeProvider.INTERNAL,
            Provider.SYSTEM: KnowledgeProvider.GENERAL,
            Provider.UNKNOWN: KnowledgeProvider.GENERAL
        }
        
        knowledge_provider = provider_map.get(provider, KnowledgeProvider.GENERAL)
        results = self.knowledge_service.get_provider_documentation(knowledge_provider)
        return [ref.to_dict() for ref in results]