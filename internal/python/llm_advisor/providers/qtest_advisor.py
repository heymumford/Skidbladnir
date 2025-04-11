"""
qTest API specialized LLM Advisor implementation.
"""

import json
import logging
from typing import Dict, Any, List, Optional

from ..services.llm_assistant import LLMAssistant
from ..models.error_models import ErrorAnalysis, RemediationStep, ErrorType
from ..models.workflow_models import ApiOperation, OperationSequence

logger = logging.getLogger(__name__)


class QTestApiAdvisor:
    """
    Specialized LLM advisor for qTest API integration.
    
    This advisor provides:
    - qTest-specific error analysis and remediation
    - Knowledge of common qTest API patterns
    - Optimized workflow suggestions for qTest operations
    """
    
    def __init__(self, llm_assistant: Optional[LLMAssistant] = None):
        """
        Initialize the qTest API advisor.
        
        Args:
            llm_assistant: The LLM assistant to use. If not provided, a new one
                          will be created.
        """
        self.llm_assistant = llm_assistant or LLMAssistant()
        self._load_qtest_knowledge()
        
    def _load_qtest_knowledge(self):
        """Load qTest API specific knowledge."""
        # In a real implementation, this would load specialized knowledge
        # about qTest API from a knowledge base.
        self.qtest_endpoints = {
            "test-cases": "/api/v3/projects/{projectId}/test-cases",
            "test-cycles": "/api/v3/projects/{projectId}/test-cycles",
            "test-runs": "/api/v3/projects/{projectId}/test-runs",
            "test-logs": "/api/v3/projects/{projectId}/test-logs",
            "attachments": "/api/v3/projects/{projectId}/attachments"
        }
        
        self.qtest_error_patterns = {
            "Token expired": ErrorType.AUTHENTICATION,
            "Invalid token": ErrorType.AUTHENTICATION,
            "Insufficient permissions": ErrorType.PERMISSION_DENIED,
            "Resource not found": ErrorType.RESOURCE_NOT_FOUND,
            "Rate limit exceeded": ErrorType.RATE_LIMITING
        }
    
    def analyze_qtest_error(self, error_data: Dict[str, Any]) -> ErrorAnalysis:
        """
        Analyze qTest API error and provide specialized diagnosis.
        
        Args:
            error_data: Error data from qTest API
            
        Returns:
            ErrorAnalysis: Specialized analysis for qTest errors
        """
        # Enhance error data with qTest context
        error_data["provider"] = "qtest"
        
        # Check for qTest-specific error codes or patterns
        error_message = error_data.get("message", "").lower()
        error_code = error_data.get("errorCode", "")
        
        if "token expired" in error_message:
            error_data["status_code"] = 401
            error_data["qtest_specific"] = "token_expired"
        elif "api rate limit" in error_message:
            error_data["status_code"] = 429
            error_data["qtest_specific"] = "rate_limited"
        elif "project not found" in error_message:
            error_data["status_code"] = 404
            error_data["qtest_specific"] = "project_not_found"
        elif "no permission" in error_message:
            error_data["status_code"] = 403
            error_data["qtest_specific"] = "permission_denied"
        
        # Use the base assistant for analysis
        analysis = self.llm_assistant.analyze_error(error_data)
        
        # Add qTest-specific context to the analysis
        if analysis.affected_component == "api_auth":
            analysis.root_cause = "qTest API token expired or invalid"
            
        return analysis
    
    def get_qtest_remediation_steps(self, error_analysis: ErrorAnalysis) -> List[RemediationStep]:
        """
        Get qTest-specific remediation steps.
        
        Args:
            error_analysis: Error analysis data
            
        Returns:
            List[RemediationStep]: qTest-specific remediation steps
        """
        # Get base remediation steps
        steps = self.llm_assistant.generate_remediation_steps(error_analysis)
        
        # Add qTest-specific steps if applicable
        if error_analysis.error_type == ErrorType.AUTHENTICATION:
            # Add qTest-specific token generation step
            steps.append(
                RemediationStep(
                    step="Generate qTest API token",
                    details="Create a new token in qTest User Settings page",
                    link="https://yourinstance.qtestnet.com/portal/#/user/profile",
                    priority=1  # High priority
                )
            )
            
        elif error_analysis.error_type == ErrorType.RESOURCE_NOT_FOUND:
            # Add qTest-specific project verification step
            steps.append(
                RemediationStep(
                    step="Verify qTest project ID",
                    details="Check that the project ID is valid and accessible",
                    code_example="// Check project ID\nconst projectId = 12345;\nconst url = `${baseUrl}/api/v3/projects/${projectId}`;",
                    priority=2
                )
            )
        
        # Sort by priority
        steps.sort(key=lambda step: step.priority)
        
        return steps
    
    def suggest_qtest_workflow_optimizations(self, workflow: Dict[str, Any]) -> Dict[str, Any]:
        """
        Suggest qTest-specific workflow optimizations.
        
        Args:
            workflow: Current workflow configuration
            
        Returns:
            Dict[str, Any]: qTest-specific optimization suggestions
        """
        # Enhance workflow with qTest context
        workflow["provider"] = "qtest"
        
        # Get base optimization suggestions
        suggestions = self.llm_assistant.suggest_api_workflow_improvements(workflow)
        
        # Add qTest-specific optimizations
        qtest_optimizations = []
        
        # Check for qTest batch operations if there are test cases
        operations = workflow.get("operations", [])
        test_case_operations = [
            op for op in operations 
            if isinstance(op, dict) and "test-case" in op.get("name", "").lower()
        ]
        
        if len(test_case_operations) > 1:
            qtest_optimizations.append({
                "type": "qtest_batch_api",
                "description": "Use qTest batch API for multiple test case operations",
                "operations": [op.get("id") for op in test_case_operations],
                "estimated_speedup": "45%"
            })
        
        # Add our qTest-specific optimizations
        if qtest_optimizations:
            suggestions["optimizations"].extend(qtest_optimizations)
            
        return suggestions