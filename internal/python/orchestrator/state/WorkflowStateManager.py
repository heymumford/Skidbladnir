"""
Workflow State Manager for the Orchestrator.

This module handles the workflow state management, persistence, 
and recovery mechanisms for orchestrated workflows.
"""
import os
import json
import logging
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
import uuid

# State constants
WORKFLOW_STATE_CREATED = 'CREATED'
WORKFLOW_STATE_RUNNING = 'RUNNING'
WORKFLOW_STATE_PAUSED = 'PAUSED'
WORKFLOW_STATE_COMPLETED = 'COMPLETED'
WORKFLOW_STATE_FAILED = 'FAILED'

# Step state constants
STEP_STATE_PENDING = 'PENDING'
STEP_STATE_RUNNING = 'RUNNING'
STEP_STATE_COMPLETED = 'COMPLETED'
STEP_STATE_FAILED = 'FAILED'
STEP_STATE_SKIPPED = 'SKIPPED'

class WorkflowStateManager:
    """
    Manages the state of workflows in the orchestration system.
    
    Responsibilities:
    - Track workflow state transitions
    - Persist workflow state to storage
    - Provide recovery mechanisms for failed workflows
    - Support pausing and resuming workflows
    - Provide detailed state information
    """
    
    def __init__(self, storage_provider=None):
        """
        Initialize the workflow state manager.
        
        Args:
            storage_provider: Provider for persisting workflow state.
                             If None, uses in-memory storage.
        """
        self.logger = logging.getLogger(__name__)
        self.storage_provider = storage_provider
        self.in_memory_workflows = {}  # Fallback storage if no provider
        
    def create_workflow(self, 
                       workflow_type: str, 
                       workflow_data: Dict[str, Any],
                       steps: List[Dict[str, Any]]) -> str:
        """
        Create a new workflow with initial state.
        
        Args:
            workflow_type: Type of workflow (e.g., 'MIGRATION')
            workflow_data: Input data for the workflow
            steps: List of workflow steps to be executed
            
        Returns:
            workflow_id: Unique identifier for the created workflow
        """
        workflow_id = str(uuid.uuid4())
        
        workflow_state = {
            "id": workflow_id,
            "type": workflow_type,
            "state": WORKFLOW_STATE_CREATED,
            "createdAt": datetime.now().isoformat(),
            "updatedAt": datetime.now().isoformat(),
            "startedAt": None,
            "completedAt": None,
            "data": workflow_data,
            "steps": self._initialize_steps(steps),
            "currentStepIndex": None,
            "result": None,
            "error": None,
            "metadata": {
                "retryCount": 0,
                "pauseCount": 0,
                "totalExecutionTime": 0
            }
        }
        
        # Persist the initial state
        self._persist_workflow_state(workflow_id, workflow_state)
        
        self.logger.info(f"Created workflow {workflow_id} of type {workflow_type}")
        return workflow_id
    
    def _initialize_steps(self, steps: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Initialize the workflow steps with proper state tracking.
        
        Args:
            steps: List of step definitions
            
        Returns:
            Initialized steps with state information
        """
        initialized_steps = []
        for i, step in enumerate(steps):
            initialized_step = {
                "id": step.get("id", f"step-{i+1}"),
                "name": step.get("name", f"Step {i+1}"),
                "order": i + 1,
                "status": STEP_STATE_PENDING,
                "startTime": None,
                "endTime": None,
                "error": None,
                "result": None,
                "metadata": {
                    "retryCount": 0,
                    "executionTime": 0
                }
            }
            initialized_steps.append(initialized_step)
        
        return initialized_steps
    
    def start_workflow(self, workflow_id: str) -> Dict[str, Any]:
        """
        Start a workflow or resume it if already started.
        
        Args:
            workflow_id: ID of the workflow to start
            
        Returns:
            Current workflow state
            
        Raises:
            ValueError: If workflow not found or already completed
        """
        workflow = self.get_workflow(workflow_id)
        
        if workflow["state"] == WORKFLOW_STATE_COMPLETED:
            raise ValueError(f"Workflow {workflow_id} is already completed")
        
        if workflow["state"] == WORKFLOW_STATE_FAILED:
            self.logger.info(f"Retrying failed workflow {workflow_id}")
            workflow["metadata"]["retryCount"] += 1
            # Clear the error when retrying a failed workflow
            workflow["error"] = None
        
        # Update workflow state
        if workflow["state"] != WORKFLOW_STATE_PAUSED:
            workflow["startedAt"] = datetime.now().isoformat()
        
        workflow["state"] = WORKFLOW_STATE_RUNNING
        workflow["updatedAt"] = datetime.now().isoformat()
        
        # Persist updated state
        self._persist_workflow_state(workflow_id, workflow)
        
        self.logger.info(f"Started workflow {workflow_id}")
        return workflow
    
    def pause_workflow(self, workflow_id: str) -> Dict[str, Any]:
        """
        Pause a running workflow.
        
        Args:
            workflow_id: ID of the workflow to pause
            
        Returns:
            Updated workflow state
            
        Raises:
            ValueError: If workflow not found or not in running state
        """
        workflow = self.get_workflow(workflow_id)
        
        if workflow["state"] != WORKFLOW_STATE_RUNNING:
            raise ValueError(f"Cannot pause workflow {workflow_id} in state {workflow['state']}")
        
        # Update workflow state
        workflow["state"] = WORKFLOW_STATE_PAUSED
        workflow["updatedAt"] = datetime.now().isoformat()
        workflow["metadata"]["pauseCount"] += 1
        
        # If a step is currently running, mark its state
        if workflow["currentStepIndex"] is not None:
            current_step = workflow["steps"][workflow["currentStepIndex"]]
            if current_step["status"] == STEP_STATE_RUNNING:
                current_step["status"] = STEP_STATE_PENDING  # Will be restarted
        
        # Persist updated state
        self._persist_workflow_state(workflow_id, workflow)
        
        self.logger.info(f"Paused workflow {workflow_id}")
        return workflow
    
    def complete_workflow(self, 
                         workflow_id: str, 
                         result: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Mark a workflow as completed.
        
        Args:
            workflow_id: ID of the workflow to complete
            result: Optional result data for the workflow
            
        Returns:
            Updated workflow state
        """
        workflow = self.get_workflow(workflow_id)
        
        # Update workflow state
        workflow["state"] = WORKFLOW_STATE_COMPLETED
        workflow["completedAt"] = datetime.now().isoformat()
        workflow["updatedAt"] = datetime.now().isoformat()
        workflow["result"] = result
        
        # Calculate total execution time
        if workflow["startedAt"]:
            start_time = datetime.fromisoformat(workflow["startedAt"])
            end_time = datetime.fromisoformat(workflow["completedAt"])
            workflow["metadata"]["totalExecutionTime"] = (end_time - start_time).total_seconds()
        
        # Persist updated state
        self._persist_workflow_state(workflow_id, workflow)
        
        self.logger.info(f"Completed workflow {workflow_id}")
        return workflow
    
    def fail_workflow(self, 
                     workflow_id: str, 
                     error: str,
                     error_details: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Mark a workflow as failed.
        
        Args:
            workflow_id: ID of the workflow to fail
            error: Error message
            error_details: Additional error details
            
        Returns:
            Updated workflow state
        """
        workflow = self.get_workflow(workflow_id)
        
        # Update workflow state
        workflow["state"] = WORKFLOW_STATE_FAILED
        workflow["updatedAt"] = datetime.now().isoformat()
        workflow["error"] = {
            "message": error,
            "timestamp": datetime.now().isoformat(),
            "details": error_details
        }
        
        # If a step is currently running, mark it as failed
        if workflow["currentStepIndex"] is not None:
            current_step = workflow["steps"][workflow["currentStepIndex"]]
            if current_step["status"] == STEP_STATE_RUNNING:
                current_step["status"] = STEP_STATE_FAILED
                current_step["error"] = error
                current_step["endTime"] = datetime.now().isoformat()
        
        # Persist updated state
        self._persist_workflow_state(workflow_id, workflow)
        
        self.logger.error(f"Workflow {workflow_id} failed: {error}")
        return workflow
    
    def start_step(self, 
                  workflow_id: str, 
                  step_index: int) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """
        Start execution of a specific workflow step.
        
        Args:
            workflow_id: ID of the workflow
            step_index: Index of the step to start
            
        Returns:
            Tuple of (workflow state, step state)
        """
        workflow = self.get_workflow(workflow_id)
        
        if workflow["state"] != WORKFLOW_STATE_RUNNING:
            raise ValueError(f"Cannot start step in workflow {workflow_id} with state {workflow['state']}")
        
        if step_index < 0 or step_index >= len(workflow["steps"]):
            raise ValueError(f"Invalid step index {step_index} for workflow {workflow_id}")
        
        step = workflow["steps"][step_index]
        
        # Update step state
        step["status"] = STEP_STATE_RUNNING
        step["startTime"] = datetime.now().isoformat()
        step["endTime"] = None
        step["error"] = None
        
        # Update workflow tracking
        workflow["currentStepIndex"] = step_index
        workflow["updatedAt"] = datetime.now().isoformat()
        
        # Persist updated state
        self._persist_workflow_state(workflow_id, workflow)
        
        self.logger.info(f"Started step {step['id']} in workflow {workflow_id}")
        return workflow, step
    
    def complete_step(self, 
                     workflow_id: str, 
                     step_index: int,
                     result: Optional[Dict[str, Any]] = None) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """
        Mark a workflow step as completed.
        
        Args:
            workflow_id: ID of the workflow
            step_index: Index of the completed step
            result: Optional result data for the step
            
        Returns:
            Tuple of (workflow state, step state)
        """
        workflow = self.get_workflow(workflow_id)
        
        if step_index < 0 or step_index >= len(workflow["steps"]):
            raise ValueError(f"Invalid step index {step_index} for workflow {workflow_id}")
        
        step = workflow["steps"][step_index]
        
        # Check if step can be completed
        if step["status"] != STEP_STATE_RUNNING:
            raise ValueError(f"Step {step['id']} in workflow {workflow_id} is not running")
        
        # Update step state
        step["status"] = STEP_STATE_COMPLETED
        step["endTime"] = datetime.now().isoformat()
        step["result"] = result
        
        # Calculate execution time
        if step["startTime"]:
            start_time = datetime.fromisoformat(step["startTime"])
            end_time = datetime.fromisoformat(step["endTime"])
            step["metadata"]["executionTime"] = (end_time - start_time).total_seconds()
        
        # Update workflow state
        workflow["updatedAt"] = datetime.now().isoformat()
        
        # Clear current step if this was it
        if workflow["currentStepIndex"] == step_index:
            workflow["currentStepIndex"] = None
            
        # Persist updated state
        self._persist_workflow_state(workflow_id, workflow)
        
        self.logger.info(f"Completed step {step['id']} in workflow {workflow_id}")
        return workflow, step
    
    def fail_step(self, 
                 workflow_id: str, 
                 step_index: int,
                 error: str,
                 error_details: Optional[Dict[str, Any]] = None) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """
        Mark a workflow step as failed.
        
        Args:
            workflow_id: ID of the workflow
            step_index: Index of the failed step
            error: Error message
            error_details: Additional error details
            
        Returns:
            Tuple of (workflow state, step state)
        """
        workflow = self.get_workflow(workflow_id)
        
        if step_index < 0 or step_index >= len(workflow["steps"]):
            raise ValueError(f"Invalid step index {step_index} for workflow {workflow_id}")
        
        step = workflow["steps"][step_index]
        
        # Update step state
        step["status"] = STEP_STATE_FAILED
        step["endTime"] = datetime.now().isoformat()
        step["error"] = {
            "message": error,
            "timestamp": datetime.now().isoformat(),
            "details": error_details
        }
        
        # Calculate execution time even though it failed
        if step["startTime"]:
            start_time = datetime.fromisoformat(step["startTime"])
            end_time = datetime.fromisoformat(step["endTime"])
            step["metadata"]["executionTime"] = (end_time - start_time).total_seconds()
        
        # Update workflow state - don't automatically fail the workflow
        workflow["updatedAt"] = datetime.now().isoformat()
        
        # Clear current step if this was it
        if workflow["currentStepIndex"] == step_index:
            workflow["currentStepIndex"] = None
            
        # Persist updated state
        self._persist_workflow_state(workflow_id, workflow)
        
        self.logger.error(f"Step {step['id']} in workflow {workflow_id} failed: {error}")
        return workflow, step
    
    def retry_step(self, 
                  workflow_id: str, 
                  step_index: int) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """
        Retry a failed workflow step.
        
        Args:
            workflow_id: ID of the workflow
            step_index: Index of the step to retry
            
        Returns:
            Tuple of (workflow state, step state)
        """
        workflow = self.get_workflow(workflow_id)
        
        if step_index < 0 or step_index >= len(workflow["steps"]):
            raise ValueError(f"Invalid step index {step_index} for workflow {workflow_id}")
        
        step = workflow["steps"][step_index]
        
        # Only failed steps can be retried
        if step["status"] != STEP_STATE_FAILED:
            raise ValueError(f"Step {step['id']} in workflow {workflow_id} is not in a failed state")
        
        # Update step state for retry
        step["status"] = STEP_STATE_PENDING
        step["startTime"] = None
        step["endTime"] = None
        step["error"] = None
        step["metadata"]["retryCount"] += 1
        
        # Update workflow state
        if workflow["state"] == WORKFLOW_STATE_FAILED:
            workflow["state"] = WORKFLOW_STATE_RUNNING
            workflow["error"] = None
        
        workflow["updatedAt"] = datetime.now().isoformat()
        
        # Persist updated state
        self._persist_workflow_state(workflow_id, workflow)
        
        self.logger.info(f"Retrying step {step['id']} in workflow {workflow_id}")
        return workflow, step
    
    def skip_step(self, 
                 workflow_id: str, 
                 step_index: int) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """
        Skip a pending workflow step.
        
        Args:
            workflow_id: ID of the workflow
            step_index: Index of the step to skip
            
        Returns:
            Tuple of (workflow state, step state)
        """
        workflow = self.get_workflow(workflow_id)
        
        if step_index < 0 or step_index >= len(workflow["steps"]):
            raise ValueError(f"Invalid step index {step_index} for workflow {workflow_id}")
        
        step = workflow["steps"][step_index]
        
        # Only pending or failed steps can be skipped
        if step["status"] not in [STEP_STATE_PENDING, STEP_STATE_FAILED]:
            raise ValueError(f"Step {step['id']} in workflow {workflow_id} cannot be skipped")
        
        # Update step state
        step["status"] = STEP_STATE_SKIPPED
        step["endTime"] = datetime.now().isoformat()
        
        # Update workflow state
        workflow["updatedAt"] = datetime.now().isoformat()
        
        # Persist updated state
        self._persist_workflow_state(workflow_id, workflow)
        
        self.logger.info(f"Skipped step {step['id']} in workflow {workflow_id}")
        return workflow, step
    
    def get_workflow(self, workflow_id: str) -> Dict[str, Any]:
        """
        Get the current state of a workflow.
        
        Args:
            workflow_id: ID of the workflow
            
        Returns:
            Current workflow state
            
        Raises:
            ValueError: If workflow not found
        """
        # Try to get from storage provider first
        if self.storage_provider:
            try:
                workflow = self.storage_provider.get_workflow(workflow_id)
                if workflow:
                    return workflow
            except Exception as e:
                self.logger.error(f"Error retrieving workflow {workflow_id} from storage: {str(e)}")
        
        # Fall back to in-memory storage
        if workflow_id in self.in_memory_workflows:
            return self.in_memory_workflows[workflow_id]
            
        raise ValueError(f"Workflow {workflow_id} not found")
    
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
        workflows = []
        
        # Try storage provider first
        if self.storage_provider:
            try:
                return self.storage_provider.list_workflows(state_filter, limit, offset)
            except Exception as e:
                self.logger.error(f"Error listing workflows from storage: {str(e)}")
        
        # Fall back to in-memory collection
        filtered_workflows = []
        for workflow_id, workflow in self.in_memory_workflows.items():
            if state_filter and workflow["state"] != state_filter:
                continue
                
            # Create a summary with essential fields
            summary = {
                "id": workflow["id"],
                "type": workflow["type"],
                "state": workflow["state"],
                "createdAt": workflow["createdAt"],
                "updatedAt": workflow["updatedAt"],
                "startedAt": workflow["startedAt"],
                "completedAt": workflow["completedAt"],
                "progress": self._calculate_progress(workflow),
                "stepCount": len(workflow["steps"])
            }
            filtered_workflows.append(summary)
            
        # Apply pagination
        paginated = filtered_workflows[offset:offset+limit]
        return paginated
    
    def get_step(self, 
                workflow_id: str, 
                step_id: str) -> Dict[str, Any]:
        """
        Get a specific step by ID.
        
        Args:
            workflow_id: ID of the workflow
            step_id: ID of the step
            
        Returns:
            Step state
            
        Raises:
            ValueError: If workflow or step not found
        """
        workflow = self.get_workflow(workflow_id)
        
        for step in workflow["steps"]:
            if step["id"] == step_id:
                return step
                
        raise ValueError(f"Step {step_id} not found in workflow {workflow_id}")
    
    def get_workflow_history(self, workflow_id: str) -> List[Dict[str, Any]]:
        """
        Get the state transition history for a workflow.
        
        Args:
            workflow_id: ID of the workflow
            
        Returns:
            List of historical state transitions
        """
        # This would normally be stored in a database
        # For now, we'll return a placeholder
        return [
            {
                "timestamp": datetime.now().isoformat(),
                "event": "VIEW_HISTORY",
                "message": "Workflow history is not implemented in this version"
            }
        ]
    
    def _persist_workflow_state(self, workflow_id: str, workflow_state: Dict[str, Any]) -> None:
        """
        Persist workflow state to storage.
        
        Args:
            workflow_id: ID of the workflow
            workflow_state: Current workflow state
        """
        # Store in memory (always do this as fallback)
        self.in_memory_workflows[workflow_id] = workflow_state
        
        # Persist to storage provider if available
        if self.storage_provider:
            try:
                self.storage_provider.save_workflow(workflow_id, workflow_state)
            except Exception as e:
                self.logger.error(f"Error persisting workflow {workflow_id} to storage: {str(e)}")
    
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
        
        return (completed_steps / total_steps) * 100.0