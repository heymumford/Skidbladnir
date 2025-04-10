"""
Resilient Workflow Executor for the Orchestrator.

This module provides resilient execution capability for workflows,
handling state management, recovery, and error handling.
"""
import logging
import time
import uuid
from typing import Dict, List, Any, Optional, Callable, Union, Type
from datetime import datetime

from internal.python.orchestrator.state.WorkflowStateManager import (
    WorkflowStateManager,
    WORKFLOW_STATE_CREATED,
    WORKFLOW_STATE_RUNNING,
    WORKFLOW_STATE_PAUSED,
    WORKFLOW_STATE_COMPLETED,
    WORKFLOW_STATE_FAILED,
    STEP_STATE_PENDING,
    STEP_STATE_RUNNING,
    STEP_STATE_COMPLETED,
    STEP_STATE_FAILED,
    STEP_STATE_SKIPPED
)

class ResilientWorkflowExecutor:
    """
    Executor for resilient workflow processing.
    
    This class combines the workflow logic with state management to provide
    resilient execution including recovery from failures, pausing/resuming,
    and detailed status tracking.
    """
    
    def __init__(self, state_manager: WorkflowStateManager = None):
        """
        Initialize the resilient workflow executor.
        
        Args:
            state_manager: The state manager to use for persistence.
                          If None, creates a new in-memory state manager.
        """
        self.logger = logging.getLogger(__name__)
        self.state_manager = state_manager or WorkflowStateManager()
        self.step_handlers = {}
        
    def register_step_handler(self, step_id: str, handler: Callable):
        """
        Register a handler function for a specific workflow step.
        
        Args:
            step_id: The ID of the step
            handler: The function to handle this step execution
        """
        self.step_handlers[step_id] = handler
    
    def create_workflow(self, 
                       workflow_type: str, 
                       workflow_data: Dict[str, Any],
                       steps: List[Dict[str, Any]]) -> str:
        """
        Create a new workflow ready for execution.
        
        Args:
            workflow_type: Type of workflow (e.g., 'MIGRATION')
            workflow_data: Input data for the workflow
            steps: List of workflow steps definitions
            
        Returns:
            ID of the created workflow
        """
        return self.state_manager.create_workflow(workflow_type, workflow_data, steps)
    
    def execute_workflow(self, 
                        workflow_id: str, 
                        auto_retry: bool = False,
                        max_retries: int = 3,
                        retry_delay: int = 5) -> Dict[str, Any]:
        """
        Execute a workflow with resilient processing.
        
        Args:
            workflow_id: ID of the workflow to execute
            auto_retry: Whether to automatically retry failed steps
            max_retries: Maximum number of retries per step
            retry_delay: Delay between retries in seconds
            
        Returns:
            The final workflow state
        """
        try:
            # Start the workflow
            workflow = self.state_manager.start_workflow(workflow_id)
            
            # Get the steps
            steps = workflow["steps"]
            
            # Execute each step in order
            for step_index, step in enumerate(steps):
                step_id = step["id"]
                
                # Check if step should be executed (not already completed or skipped)
                if step["status"] in [STEP_STATE_COMPLETED, STEP_STATE_SKIPPED]:
                    self.logger.info(f"Skipping step {step_id} as it is already in state {step['status']}")
                    continue
                
                # Find the handler for this step
                handler = self.step_handlers.get(step_id)
                if not handler:
                    self.logger.error(f"No handler registered for step {step_id}")
                    self.state_manager.fail_step(
                        workflow_id, 
                        step_index, 
                        f"No handler registered for step {step_id}"
                    )
                    self.state_manager.fail_workflow(
                        workflow_id, 
                        f"Failed to execute step {step_id}: No handler registered"
                    )
                    return self.state_manager.get_workflow(workflow_id)
                
                # Execute the step with resilience
                retry_count = 0
                while True:
                    # Mark step as running
                    self.state_manager.start_step(workflow_id, step_index)
                    
                    try:
                        # Execute the step handler
                        self.logger.info(f"Executing step {step_id}")
                        result = handler(workflow["data"])
                        
                        # Mark step as completed
                        self.state_manager.complete_step(workflow_id, step_index, result)
                        break  # Step succeeded, exit retry loop
                    except Exception as e:
                        self.logger.error(f"Error executing step {step_id}: {str(e)}", exc_info=True)
                        # Mark step as failed
                        self.state_manager.fail_step(
                            workflow_id,
                            step_index,
                            f"Error executing step: {str(e)}",
                            {"exception": str(e)}
                        )
                        
                        # Handle retries
                        retry_count += 1
                        if auto_retry and retry_count <= max_retries:
                            self.logger.info(f"Retrying step {step_id} (attempt {retry_count} of {max_retries})")
                            # Prepare for retry
                            self.state_manager.retry_step(workflow_id, step_index)
                            time.sleep(retry_delay)
                            continue
                        
                        # If we get here, we've failed and can't/won't retry
                        self.state_manager.fail_workflow(
                            workflow_id,
                            f"Failed to execute step {step_id}: {str(e)}"
                        )
                        return self.state_manager.get_workflow(workflow_id)
                
                # Check if the workflow is still running (could have been paused externally)
                workflow = self.state_manager.get_workflow(workflow_id)
                if workflow["state"] != WORKFLOW_STATE_RUNNING:
                    self.logger.info(f"Workflow {workflow_id} is no longer running (state: {workflow['state']})")
                    return workflow
            
            # All steps completed successfully
            self.logger.info(f"Workflow {workflow_id} executed successfully")
            
            # Generate the final result from the step results
            final_result = self._generate_result(workflow)
            
            # Mark workflow as completed
            return self.state_manager.complete_workflow(workflow_id, final_result)
            
        except Exception as e:
            self.logger.error(f"Error executing workflow {workflow_id}: {str(e)}", exc_info=True)
            # Mark workflow as failed
            return self.state_manager.fail_workflow(
                workflow_id,
                f"Error executing workflow: {str(e)}"
            )
    
    def _generate_result(self, workflow: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate the final workflow result from step results.
        
        Args:
            workflow: The current workflow state
            
        Returns:
            Aggregated workflow result
        """
        # Collect results from all completed steps
        step_results = {}
        for step in workflow["steps"]:
            if step["status"] == STEP_STATE_COMPLETED and step["result"]:
                step_results[step["id"]] = step["result"]
                
        # Create a comprehensive result
        result = {
            "success": True,
            "stepResults": step_results,
            "timestamp": datetime.now().isoformat()
        }
        
        # Add workflow data for context
        result["source"] = workflow["data"].get("sourceSystem")
        result["target"] = workflow["data"].get("targetSystem")
        
        return result
    
    def pause_workflow(self, workflow_id: str) -> Dict[str, Any]:
        """
        Pause a running workflow.
        
        Args:
            workflow_id: ID of the workflow to pause
            
        Returns:
            Updated workflow state
        """
        return self.state_manager.pause_workflow(workflow_id)
    
    def resume_workflow(self, workflow_id: str) -> Dict[str, Any]:
        """
        Resume a paused workflow.
        
        Args:
            workflow_id: ID of the workflow to resume
            
        Returns:
            Updated workflow state
        """
        return self.state_manager.start_workflow(workflow_id)
    
    def get_workflow_status(self, workflow_id: str) -> Dict[str, Any]:
        """
        Get the current status of a workflow.
        
        Args:
            workflow_id: ID of the workflow
            
        Returns:
            Current workflow status
        """
        workflow = self.state_manager.get_workflow(workflow_id)
        
        # Create a simplified status view
        status = {
            "id": workflow["id"],
            "type": workflow["type"],
            "state": workflow["state"],
            "createdAt": workflow["createdAt"],
            "startedAt": workflow["startedAt"],
            "completedAt": workflow["completedAt"],
            "currentStep": None,
            "progress": self._calculate_progress(workflow),
            "steps": [
                {
                    "id": step["id"],
                    "name": step["name"],
                    "status": step["status"],
                    "order": step["order"]
                } for step in workflow["steps"]
            ],
            "error": workflow["error"]
        }
        
        # Add the current step if there is one
        if workflow["currentStepIndex"] is not None:
            current_step = workflow["steps"][workflow["currentStepIndex"]]
            status["currentStep"] = {
                "id": current_step["id"],
                "name": current_step["name"],
                "order": current_step["order"]
            }
            
        return status
    
    def _calculate_progress(self, workflow: Dict[str, Any]) -> float:
        """
        Calculate the progress percentage of a workflow.
        
        Args:
            workflow: Workflow state
            
        Returns:
            Progress as a percentage (0-100)
        """
        if workflow["state"] == WORKFLOW_STATE_COMPLETED:
            return 100.0
            
        if workflow["state"] == WORKFLOW_STATE_CREATED:
            return 0.0
            
        total_steps = len(workflow["steps"])
        if total_steps == 0:
            return 0.0
            
        completed_steps = sum(1 for step in workflow["steps"] 
                            if step["status"] in [STEP_STATE_COMPLETED, STEP_STATE_SKIPPED])
        
        # Add partial credit for the running step
        running_steps = sum(0.5 for step in workflow["steps"] 
                          if step["status"] == STEP_STATE_RUNNING)
        
        return ((completed_steps + running_steps) / total_steps) * 100.0
    
    def list_workflows(self, 
                      state_filter: Optional[str] = None,
                      limit: int = 100,
                      offset: int = 0) -> List[Dict[str, Any]]:
        """
        List workflows with optional filtering.
        
        Args:
            state_filter: Optional filter by workflow state
            limit: Maximum number of workflows to return
            offset: Offset for pagination
            
        Returns:
            List of workflow summary objects
        """
        return self.state_manager.list_workflows(state_filter, limit, offset)


class MigrationWorkflowExecutor(ResilientWorkflowExecutor):
    """
    Specialized workflow executor for migration workflows.
    
    Registers the standard handlers for migration workflow steps.
    """
    
    def __init__(self, state_manager: WorkflowStateManager = None):
        """Initialize the migration workflow executor."""
        super().__init__(state_manager)
        
        # Register standard migration step handlers
        self.register_step_handler("validate", self._validate_input)
        self.register_step_handler("connect-source", self._connect_to_source_system)
        self.register_step_handler("connect-target", self._connect_to_target_system)
        self.register_step_handler("extract", self._extract_test_cases)
        self.register_step_handler("transform", self._transform_test_data)
        self.register_step_handler("load", self._load_test_cases)
        self.register_step_handler("verify", self._verify_migration)
    
    def create_migration_workflow(self, workflow_data: Dict[str, Any]) -> str:
        """
        Create a new migration workflow with standard steps.
        
        Args:
            workflow_data: Migration workflow input data
            
        Returns:
            ID of the created workflow
        """
        # Define standard migration steps
        steps = [
            {"id": "validate", "name": "Validate Input"},
            {"id": "connect-source", "name": "Connect to Source System"},
            {"id": "connect-target", "name": "Connect to Target System"},
            {"id": "extract", "name": "Extract Test Cases"},
            {"id": "transform", "name": "Transform Test Data"},
            {"id": "load", "name": "Load Test Cases"},
            {"id": "verify", "name": "Verify Migration"}
        ]
        
        return self.create_workflow("MIGRATION", workflow_data, steps)
    
    def _validate_input(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate migration workflow input data."""
        # Check required fields
        required_fields = ['sourceSystem', 'targetSystem', 'projectKey']
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            raise ValueError(f"Missing required fields: {', '.join(missing_fields)}")
        
        # Validate source and target systems
        valid_systems = ['zephyr', 'qtest', 'azure-devops', 'rally', 'hp-alm', 'excel']
        
        source_system = data['sourceSystem'].lower()
        if source_system not in valid_systems:
            raise ValueError(f"Invalid source system: {data['sourceSystem']}")
        
        target_system = data['targetSystem'].lower()
        if target_system not in valid_systems:
            raise ValueError(f"Invalid target system: {data['targetSystem']}")
        
        if source_system == target_system:
            raise ValueError("Source and target systems cannot be the same")
        
        return {"valid": True}
    
    def _connect_to_source_system(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Connect to the source test management system."""
        source_system = data['sourceSystem']
        self.logger.info(f"Connecting to source system: {source_system}")
        
        # In a real implementation, this would create a connection to the source system
        # For demonstration, we'll just return success
        return {"connected": True, "system": source_system}
    
    def _connect_to_target_system(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Connect to the target test management system."""
        target_system = data['targetSystem']
        self.logger.info(f"Connecting to target system: {target_system}")
        
        # In a real implementation, this would create a connection to the target system
        # For demonstration, we'll just return success
        return {"connected": True, "system": target_system}
    
    def _extract_test_cases(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract test cases from the source system."""
        source_system = data['sourceSystem']
        project_key = data['projectKey']
        
        self.logger.info(f"Extracting test cases from {source_system} project {project_key}")
        
        # In a real implementation, this would fetch test cases from the source system
        # For demonstration, we'll create mock test cases
        test_cases = [
            {
                "id": "TC-1001",
                "title": "Verify user login",
                "description": "Test user login functionality",
                "status": "READY",
                "priority": "HIGH"
            },
            {
                "id": "TC-1002",
                "title": "Verify user logout",
                "description": "Test user logout functionality",
                "status": "READY",
                "priority": "MEDIUM"
            },
            {
                "id": "TC-1003",
                "title": "Verify password reset",
                "description": "Test password reset functionality",
                "status": "DRAFT",
                "priority": "LOW"
            }
        ]
        
        return {"testCases": test_cases, "count": len(test_cases)}
    
    def _transform_test_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Transform test case data between formats."""
        source_system = data['sourceSystem']
        target_system = data['targetSystem']
        extract_result = self._get_step_result("extract", data)
        
        self.logger.info(f"Transforming test cases from {source_system} format to {target_system} format")
        
        # Get the extracted test cases 
        test_cases = extract_result["testCases"]
        
        # In a real implementation, this would transform the test cases
        # For demonstration, we'll just add a transformation flag
        transformed_test_cases = []
        for tc in test_cases:
            transformed_tc = tc.copy()
            transformed_tc["transformed"] = True
            transformed_tc["targetFormat"] = target_system
            transformed_test_cases.append(transformed_tc)
        
        return {"testCases": transformed_test_cases, "count": len(transformed_test_cases)}
    
    def _load_test_cases(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Load test cases into the target system."""
        target_system = data['targetSystem']
        project_key = data['projectKey']
        transform_result = self._get_step_result("transform", data)
        
        self.logger.info(f"Loading test cases into {target_system} project {project_key}")
        
        # Get the transformed test cases
        test_cases = transform_result["testCases"]
        
        # In a real implementation, this would create test cases in the target system
        # For demonstration, we'll just simulate the result
        loaded_test_cases = []
        for tc in test_cases:
            loaded_tc = {
                "sourceId": tc["id"],
                "targetId": f"NEW-{tc['id']}",
                "title": tc["title"],
                "status": "MIGRATED"
            }
            loaded_test_cases.append(loaded_tc)
        
        return {
            "testCases": loaded_test_cases,
            "count": len(loaded_test_cases),
            "success": True
        }
    
    def _verify_migration(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Verify the migrated test cases."""
        self.logger.info("Verifying migration results")
        load_result = self._get_step_result("load", data)
        
        # Get the loaded test cases
        test_cases = load_result["testCases"]
        
        # In a real implementation, this would verify the migrated test cases
        # For demonstration, we'll assume all test cases were migrated successfully
        return {
            "verified": True,
            "count": len(test_cases),
            "verificationDetails": {
                "migrated": len(test_cases),
                "failed": 0,
                "warnings": 0
            }
        }
    
    def _get_step_result(self, step_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Helper to access the result of a previous step.
        
        In a real implementation, this would access the stored step results.
        For this example, we'll execute the step logic directly. 
        """
        # This approach isn't ideal as it duplicates execution, but it simplifies our example
        if step_id == "extract":
            return self._extract_test_cases(data)
        elif step_id == "transform":
            return self._transform_test_data(data)
        elif step_id == "load":
            return self._load_test_cases(data)
        else:
            raise ValueError(f"Unknown step ID: {step_id}")