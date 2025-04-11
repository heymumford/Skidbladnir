"""
Zephyr API specialized LLM Advisor implementation.
"""

import json
import logging
from typing import Dict, Any, List, Optional

from ..services.llm_assistant import LLMAssistant
from ..models.error_models import ErrorAnalysis, RemediationStep, ErrorType
from ..models.workflow_models import ApiOperation, OperationSequence

logger = logging.getLogger(__name__)


class ZephyrApiAdvisor:
    """
    Specialized LLM advisor for Zephyr API integration.
    
    This advisor provides:
    - Zephyr-specific error analysis and remediation
    - Knowledge of common Zephyr API patterns
    - Optimized workflow suggestions for Zephyr operations
    """
    
    def __init__(self, llm_assistant: Optional[LLMAssistant] = None):
        """
        Initialize the Zephyr API advisor.
        
        Args:
            llm_assistant: The LLM assistant to use. If not provided, a new one
                          will be created.
        """
        self.llm_assistant = llm_assistant or LLMAssistant()
        self._load_zephyr_knowledge()
        
    def _load_zephyr_knowledge(self):
        """Load Zephyr API specific knowledge."""
        # In a real implementation, this would load specialized knowledge
        # about Zephyr API from a knowledge base.
        self.zephyr_endpoints = {
            "testcases": "/api/v1/testcases",
            "folders": "/api/v1/folders",
            "executions": "/api/v1/testexecutions",
            "cycles": "/api/v1/cycles",
            "attachments": "/api/v1/attachments"
        }
        
        self.zephyr_error_patterns = {
            "JwtExpired": ErrorType.AUTHENTICATION,
            "InvalidToken": ErrorType.AUTHENTICATION,
            "InvalidScope": ErrorType.PERMISSION_DENIED,
            "ResourceNotFound": ErrorType.RESOURCE_NOT_FOUND,
            "RateLimitExceeded": ErrorType.RATE_LIMITING
        }
    
    def analyze_zephyr_error(self, error_data: Dict[str, Any]) -> ErrorAnalysis:
        """
        Analyze Zephyr API error and provide specialized diagnosis.
        
        Args:
            error_data: Error data from Zephyr API
            
        Returns:
            ErrorAnalysis: Specialized analysis for Zephyr errors
        """
        # Enhance error data with Zephyr context
        error_data["provider"] = "zephyr"
        
        # Check for Zephyr-specific error codes or patterns
        error_message = error_data.get("message", "").lower()
        error_code = error_data.get("errorCode", "")
        
        if "jwt expired" in error_message:
            error_data["status_code"] = 401
            error_data["zephyr_specific"] = "token_expired"
        elif "rate limit" in error_message:
            error_data["status_code"] = 429
            error_data["zephyr_specific"] = "rate_limited"
        elif "folder not found" in error_message:
            error_data["status_code"] = 404
            error_data["zephyr_specific"] = "folder_not_found"
        
        # Use the base assistant for analysis
        analysis = self.llm_assistant.analyze_error(error_data)
        
        # Add Zephyr-specific context to the analysis
        if analysis.affected_component == "api_auth":
            analysis.root_cause = "Zephyr API token expired or invalid"
            
        return analysis
    
    def get_zephyr_remediation_steps(self, error_analysis: ErrorAnalysis) -> List[RemediationStep]:
        """
        Get Zephyr-specific remediation steps.
        
        Args:
            error_analysis: Error analysis data
            
        Returns:
            List[RemediationStep]: Zephyr-specific remediation steps
        """
        # Get base remediation steps
        steps = self.llm_assistant.generate_remediation_steps(error_analysis)
        
        # Add Zephyr-specific steps if applicable
        if error_analysis.error_type == ErrorType.AUTHENTICATION:
            # Add Zephyr-specific token generation step
            steps.append(
                RemediationStep(
                    step="Generate Zephyr API token",
                    details="Create a new token in Zephyr Scale Admin interface",
                    link="https://zephyrscale.atlassian.net/admin/api-keys",
                    priority=1  # High priority
                )
            )
            
        elif error_analysis.error_type == ErrorType.RESOURCE_NOT_FOUND:
            # Add Zephyr-specific folder verification step
            steps.append(
                RemediationStep(
                    step="Verify Zephyr folder structure",
                    details="Check that the folder path follows Zephyr's hierarchical structure",
                    code_example="// Check folder path\nconst folderPath = '/Root/Project/TestFolder';",
                    priority=2
                )
            )
        
        # Sort by priority
        steps.sort(key=lambda step: step.priority)
        
        return steps
    
    def suggest_zephyr_workflow_optimizations(self, workflow: Dict[str, Any]) -> Dict[str, Any]:
        """
        Suggest Zephyr-specific workflow optimizations.
        
        Args:
            workflow: Current workflow configuration
            
        Returns:
            Dict[str, Any]: Zephyr-specific optimization suggestions
        """
        # Enhance workflow with Zephyr context
        workflow["provider"] = "zephyr"
        
        # Get base optimization suggestions
        suggestions = self.llm_assistant.suggest_api_workflow_improvements(workflow)
        
        # Add Zephyr-specific optimizations
        zephyr_optimizations = []
        
        # Check for Zephyr bulk operations if there are test cases
        operations = workflow.get("operations", [])
        test_case_operations = [
            op for op in operations 
            if isinstance(op, dict) and "test_case" in op.get("name", "").lower()
        ]
        
        if len(test_case_operations) > 1:
            zephyr_optimizations.append({
                "type": "zephyr_bulk_api",
                "description": "Use Zephyr bulk API for multiple test case operations",
                "operations": [op.get("id") for op in test_case_operations],
                "estimated_speedup": "50%"
            })
        
        # Add our Zephyr-specific optimizations
        if zephyr_optimizations:
            suggestions["optimizations"].extend(zephyr_optimizations)
            
        return suggestions