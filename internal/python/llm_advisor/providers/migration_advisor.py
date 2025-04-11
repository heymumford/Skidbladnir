"""
Specialized LLM Advisor for Zephyr to qTest migration.
"""

import json
import logging
from typing import Dict, Any, List, Optional, Tuple

from ..services.llm_assistant import LLMAssistant
from ..providers.zephyr_advisor import ZephyrApiAdvisor
from ..providers.qtest_advisor import QTestApiAdvisor
from ..models.error_models import ErrorAnalysis, RemediationStep, ErrorType
from ..models.workflow_models import ApiOperation, OperationSequence

logger = logging.getLogger(__name__)


class MigrationAdvisor:
    """
    Specialized LLM advisor for Zephyr to qTest migration.
    
    This advisor combines knowledge from both Zephyr and qTest
    to provide tailored assistance during migration workflows.
    """
    
    def __init__(self, 
                llm_assistant: Optional[LLMAssistant] = None,
                zephyr_advisor: Optional[ZephyrApiAdvisor] = None,
                qtest_advisor: Optional[QTestApiAdvisor] = None):
        """
        Initialize the Migration advisor.
        
        Args:
            llm_assistant: The LLM assistant to use. If not provided, a new one
                          will be created.
            zephyr_advisor: Specialized Zephyr advisor
            qtest_advisor: Specialized qTest advisor
        """
        self.llm_assistant = llm_assistant or LLMAssistant()
        self.zephyr_advisor = zephyr_advisor or ZephyrApiAdvisor(self.llm_assistant)
        self.qtest_advisor = qtest_advisor or QTestApiAdvisor(self.llm_assistant)
        self._load_migration_knowledge()
        
    def _load_migration_knowledge(self):
        """Load migration-specific knowledge."""
        # Field mapping between Zephyr and qTest
        self.field_mappings = {
            "name": "name",
            "description": "description",
            "priority": "priority",
            "status": "status",
            "precondition": "precondition",
            "objective": "objective",
            "labels": "tags",
            "component": "module",
            "folder": "test-suite",
            "steps": {
                "description": "description",
                "expected_result": "expected",
                "step_data": "test_data"
            }
        }
        
        # Common migration errors and solutions
        self.migration_error_patterns = {
            "missing_field_mapping": {
                "description": "Required field mapping is missing",
                "solution": "Define field mapping for the required field"
            },
            "invalid_field_value": {
                "description": "Field value doesn't match target format",
                "solution": "Transform field value to match target format"
            },
            "attachment_too_large": {
                "description": "Attachment exceeds size limit",
                "solution": "Compress or split large attachments"
            }
        }
    
    def analyze_migration_error(self, error_data: Dict[str, Any]) -> Tuple[ErrorAnalysis, str]:
        """
        Analyze migration-specific error and diagnose the source.
        
        Args:
            error_data: Error data from migration process
            
        Returns:
            Tuple[ErrorAnalysis, str]: Error analysis and source system
        """
        # Determine which system generated the error
        source_system = "unknown"
        if "source" in error_data:
            source_system = error_data.get("source", "").lower()
        else:
            # Try to deduce the source from the error details
            if "zephyr" in json.dumps(error_data).lower():
                source_system = "zephyr"
            elif "qtest" in json.dumps(error_data).lower():
                source_system = "qtest"
        
        # Route to appropriate specialized advisor
        if source_system == "zephyr":
            analysis = self.zephyr_advisor.analyze_zephyr_error(error_data)
        elif source_system == "qtest":
            analysis = self.qtest_advisor.analyze_qtest_error(error_data)
        else:
            # Use base analysis for unknown sources
            analysis = self.llm_assistant.analyze_error(error_data)
            
            # Check for migration-specific patterns
            error_message = json.dumps(error_data).lower()
            if "field mapping" in error_message:
                analysis.error_type = ErrorType.VALIDATION_ERROR
                analysis.root_cause = "Missing or invalid field mapping"
                analysis.affected_component = "migration_mapper"
            elif "transformation" in error_message:
                analysis.error_type = ErrorType.VALIDATION_ERROR
                analysis.root_cause = "Data transformation error"
                analysis.affected_component = "transformation_engine"
        
        return analysis, source_system
    
    def get_migration_remediation_steps(self, 
                                       error_analysis: ErrorAnalysis, 
                                       source_system: str) -> List[RemediationStep]:
        """
        Get migration-specific remediation steps.
        
        Args:
            error_analysis: Error analysis data
            source_system: Source of the error (zephyr, qtest, etc.)
            
        Returns:
            List[RemediationStep]: Migration-specific remediation steps
        """
        # Get system-specific steps first
        if source_system == "zephyr":
            steps = self.zephyr_advisor.get_zephyr_remediation_steps(error_analysis)
        elif source_system == "qtest":
            steps = self.qtest_advisor.get_qtest_remediation_steps(error_analysis)
        else:
            steps = self.llm_assistant.generate_remediation_steps(error_analysis)
        
        # Add migration-specific steps
        if error_analysis.affected_component == "migration_mapper":
            steps.append(
                RemediationStep(
                    step="Check field mapping configuration",
                    details="Verify that all required fields have valid mappings",
                    code_example="""// Example field mapping
const fieldMapping = {
  name: "name",
  description: "description",
  priority: {
    source: "priority",
    transformer: (value) => mapPriority(value)
  }
};""",
                    priority=1
                )
            )
        elif error_analysis.affected_component == "transformation_engine":
            steps.append(
                RemediationStep(
                    step="Define custom field transformer",
                    details="Create a custom transformer for the field that's failing",
                    code_example="""// Example custom transformer
function mapPriority(zephyrPriority) {
  const priorityMap = {
    "Critical": "P0",
    "High": "P1", 
    "Medium": "P2",
    "Low": "P3"
  };
  return priorityMap[zephyrPriority] || "P2"; // Default to Medium
}""",
                    priority=1
                )
            )
        
        # Sort by priority
        steps.sort(key=lambda step: step.priority)
        
        return steps
    
    def generate_field_mapping_recommendation(self, 
                                           source_fields: List[str], 
                                           target_fields: List[str]) -> Dict[str, Any]:
        """
        Generate recommended field mappings for migration.
        
        Args:
            source_fields: List of field names from source system
            target_fields: List of field names from target system
            
        Returns:
            Dict[str, Any]: Recommended field mappings
        """
        # In a production implementation, this would use the LLM to generate mappings
        # Here we use our pre-defined mappings and fuzzy matching
        
        recommended_mappings = {}
        
        for source_field in source_fields:
            source_field_norm = source_field.lower().replace("_", "").replace("-", "")
            
            # Direct mapping from our knowledge base
            if source_field in self.field_mappings:
                recommended_mappings[source_field] = {
                    "target_field": self.field_mappings[source_field],
                    "confidence": 1.0,
                    "requires_transformation": False
                }
                continue
            
            # Fuzzy match
            best_match = None
            best_match_score = 0
            
            for target_field in target_fields:
                target_field_norm = target_field.lower().replace("_", "").replace("-", "")
                
                # Simple character overlap score (would use more sophisticated methods in production)
                common_chars = set(source_field_norm).intersection(set(target_field_norm))
                score = len(common_chars) / max(len(source_field_norm), len(target_field_norm))
                
                if score > 0.5 and score > best_match_score:
                    best_match = target_field
                    best_match_score = score
            
            if best_match:
                recommended_mappings[source_field] = {
                    "target_field": best_match,
                    "confidence": best_match_score,
                    "requires_transformation": best_match_score < 0.8
                }
            else:
                recommended_mappings[source_field] = {
                    "target_field": None,
                    "confidence": 0,
                    "requires_transformation": True,
                    "note": "No matching field found in target system"
                }
        
        return recommended_mappings
    
    def suggest_migration_workflow(self, migration_config: Dict[str, Any]) -> OperationSequence:
        """
        Suggest an optimized migration workflow.
        
        Args:
            migration_config: Configuration for the migration
            
        Returns:
            OperationSequence: Recommended sequence of operations
        """
        # In a production implementation, this would use the LLM to design the workflow
        # Here we create a basic workflow based on common migration patterns
        
        operations = []
        
        # Add authentication operations
        operations.append(
            ApiOperation(
                id="auth_zephyr",
                name="authenticate_zephyr",
                endpoint="/api/v1/authenticate",
                method="POST",
                description="Authenticate with Zephyr API",
                dependencies=[],
                requires_auth=False
            )
        )
        
        operations.append(
            ApiOperation(
                id="auth_qtest",
                name="authenticate_qtest",
                endpoint="/oauth/token",
                method="POST",
                description="Authenticate with qTest API",
                dependencies=[],
                requires_auth=False
            )
        )
        
        # Add source data retrieval operations
        operations.append(
            ApiOperation(
                id="get_zephyr_projects",
                name="get_zephyr_projects",
                endpoint="/api/v1/projects",
                method="GET",
                description="Get list of projects from Zephyr",
                dependencies=["auth_zephyr"]
            )
        )
        
        operations.append(
            ApiOperation(
                id="get_zephyr_folders",
                name="get_zephyr_folders",
                endpoint="/api/v1/folders",
                method="GET",
                description="Get folder structure from Zephyr",
                dependencies=["get_zephyr_projects"]
            )
        )
        
        operations.append(
            ApiOperation(
                id="get_zephyr_testcases",
                name="get_zephyr_testcases",
                endpoint="/api/v1/testcases",
                method="GET",
                description="Get test cases from Zephyr",
                dependencies=["get_zephyr_folders"]
            )
        )
        
        # Add target preparation operations
        operations.append(
            ApiOperation(
                id="get_qtest_projects",
                name="get_qtest_projects",
                endpoint="/api/v3/projects",
                method="GET",
                description="Get projects from qTest",
                dependencies=["auth_qtest"]
            )
        )
        
        operations.append(
            ApiOperation(
                id="create_qtest_hierarchy",
                name="create_qtest_hierarchy",
                endpoint="/api/v3/projects/{projectId}/test-suites",
                method="POST",
                description="Create test hierarchy in qTest",
                dependencies=["get_qtest_projects", "get_zephyr_folders"]
            )
        )
        
        # Add migration operations
        operations.append(
            ApiOperation(
                id="transform_testcases",
                name="transform_testcases",
                endpoint="internal://transform",
                method="POST",
                description="Transform test cases from Zephyr to qTest format",
                dependencies=["get_zephyr_testcases"]
            )
        )
        
        operations.append(
            ApiOperation(
                id="create_qtest_testcases",
                name="create_qtest_testcases",
                endpoint="/api/v3/projects/{projectId}/test-cases",
                method="POST",
                description="Create test cases in qTest",
                dependencies=["transform_testcases", "create_qtest_hierarchy"]
            )
        )
        
        # Add verification operations
        operations.append(
            ApiOperation(
                id="verify_migration",
                name="verify_migration",
                endpoint="internal://verify",
                method="POST",
                description="Verify migration results",
                dependencies=["create_qtest_testcases"]
            )
        )
        
        return OperationSequence(
            operations=operations,
            name="Zephyr to qTest Migration",
            description="Migrate test cases from Zephyr Scale to qTest Manager",
            goal="Complete test asset migration with validation",
            estimated_execution_time=300.0  # 5 minutes
        )
        
    def generate_migration_progress_update(self, 
                                        progress_data: Dict[str, Any], 
                                        user_friendly: bool = True) -> str:
        """
        Generate a user-friendly update on migration progress.
        
        Args:
            progress_data: Migration progress data
            user_friendly: Whether to generate a user-friendly message
            
        Returns:
            str: Progress update message
        """
        # Extract progress information
        total = progress_data.get("total", 0)
        processed = progress_data.get("processed", 0)
        successful = progress_data.get("successful", 0)
        failed = progress_data.get("failed", 0)
        current_stage = progress_data.get("current_stage", "")
        
        # Calculate percentages
        percent_complete = (processed / total) * 100 if total > 0 else 0
        success_rate = (successful / processed) * 100 if processed > 0 else 0
        
        if user_friendly:
            # Generate user-friendly message
            message = f"Migration Progress: {percent_complete:.1f}% complete\n"
            
            # Add current stage info
            if current_stage:
                message += f"Currently processing: {current_stage}\n"
                
            # Add item counts
            message += f"Items: {processed} of {total} processed"
            
            # Add success/failure info if there are processed items
            if processed > 0:
                message += f" ({successful} successful, {failed} failed, {success_rate:.1f}% success rate)"
                
            # Add estimated time if available
            if "estimated_time_remaining" in progress_data:
                time_remaining = progress_data["estimated_time_remaining"]
                if time_remaining < 60:
                    message += f"\nEstimated time remaining: {time_remaining} seconds"
                else:
                    minutes = time_remaining // 60
                    seconds = time_remaining % 60
                    message += f"\nEstimated time remaining: {minutes} minutes, {seconds} seconds"
        else:
            # Generate technical message
            message = {
                "percent_complete": round(percent_complete, 1),
                "stage": current_stage,
                "processed": processed,
                "total": total,
                "successful": successful, 
                "failed": failed,
                "success_rate": round(success_rate, 1)
            }
            
            message = json.dumps(message)
            
        return message