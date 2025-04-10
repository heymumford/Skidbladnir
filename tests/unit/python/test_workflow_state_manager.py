"""
Unit tests for the WorkflowStateManager.

These tests focus on:
1. State transitions handling
2. Workflow step management
3. Recovery mechanisms
4. Persistence
"""

import pytest
import uuid
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

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

@pytest.fixture
def sample_steps():
    """Fixture for sample workflow steps."""
    return [
        {"id": "validate", "name": "Validate Input"},
        {"id": "connect-source", "name": "Connect to Source System"},
        {"id": "connect-target", "name": "Connect to Target System"},
        {"id": "extract", "name": "Extract Test Cases"},
        {"id": "transform", "name": "Transform Test Data"},
        {"id": "load", "name": "Load Test Cases"},
        {"id": "verify", "name": "Verify Migration"}
    ]

@pytest.fixture
def mock_storage_provider():
    """Fixture for a mock storage provider."""
    mock_provider = MagicMock()
    mock_provider.get_workflow.return_value = None  # Default to not found
    mock_provider.list_workflows.return_value = []
    return mock_provider

@pytest.fixture
def state_manager(mock_storage_provider):
    """Fixture for a WorkflowStateManager with a mock storage provider."""
    return WorkflowStateManager(mock_storage_provider)

@pytest.fixture
def state_manager_with_memory():
    """Fixture for a WorkflowStateManager with in-memory storage only."""
    return WorkflowStateManager()

@pytest.mark.unit
@pytest.mark.workflow
@pytest.mark.orchestrator
class TestWorkflowStateManagerBasics:
    """Test basic workflow state management functionality."""
    
    def test_create_workflow(self, state_manager, sample_workflow_data, sample_steps):
        """Test creating a new workflow."""
        # Act
        workflow_id = state_manager.create_workflow("MIGRATION", sample_workflow_data, sample_steps)
        
        # Assert
        assert workflow_id is not None
        assert isinstance(workflow_id, str)
        
        # Verify workflow was persisted
        state_manager.storage_provider.save_workflow.assert_called_once()
        
        # Check in-memory storage
        assert workflow_id in state_manager.in_memory_workflows
        workflow = state_manager.in_memory_workflows[workflow_id]
        assert workflow["state"] == WORKFLOW_STATE_CREATED
        assert workflow["data"] == sample_workflow_data
        assert len(workflow["steps"]) == len(sample_steps)
        
    def test_get_workflow(self, state_manager_with_memory, sample_workflow_data, sample_steps):
        """Test retrieving a workflow."""
        # Arrange
        workflow_id = state_manager_with_memory.create_workflow(
            "MIGRATION", sample_workflow_data, sample_steps
        )
        
        # Act
        workflow = state_manager_with_memory.get_workflow(workflow_id)
        
        # Assert
        assert workflow["id"] == workflow_id
        assert workflow["state"] == WORKFLOW_STATE_CREATED
        assert workflow["data"] == sample_workflow_data
        
    def test_get_nonexistent_workflow(self, state_manager):
        """Test retrieving a non-existent workflow."""
        # Act & Assert
        with pytest.raises(ValueError) as e:
            state_manager.get_workflow("nonexistent-id")
        assert "not found" in str(e.value)
        
    def test_start_workflow(self, state_manager_with_memory, sample_workflow_data, sample_steps):
        """Test starting a workflow."""
        # Arrange
        workflow_id = state_manager_with_memory.create_workflow(
            "MIGRATION", sample_workflow_data, sample_steps
        )
        
        # Act
        workflow = state_manager_with_memory.start_workflow(workflow_id)
        
        # Assert
        assert workflow["state"] == WORKFLOW_STATE_RUNNING
        assert workflow["startedAt"] is not None
        
    def test_complete_workflow(self, state_manager_with_memory, sample_workflow_data, sample_steps):
        """Test completing a workflow."""
        # Arrange
        workflow_id = state_manager_with_memory.create_workflow(
            "MIGRATION", sample_workflow_data, sample_steps
        )
        state_manager_with_memory.start_workflow(workflow_id)
        
        # Act
        result = {"success": True, "count": 5}
        workflow = state_manager_with_memory.complete_workflow(workflow_id, result)
        
        # Assert
        assert workflow["state"] == WORKFLOW_STATE_COMPLETED
        assert workflow["completedAt"] is not None
        assert workflow["result"] == result
        assert workflow["metadata"]["totalExecutionTime"] > 0
        
    def test_fail_workflow(self, state_manager_with_memory, sample_workflow_data, sample_steps):
        """Test failing a workflow."""
        # Arrange
        workflow_id = state_manager_with_memory.create_workflow(
            "MIGRATION", sample_workflow_data, sample_steps
        )
        state_manager_with_memory.start_workflow(workflow_id)
        
        # Act
        error_msg = "Connection failed"
        error_details = {"cause": "Network timeout"}
        workflow = state_manager_with_memory.fail_workflow(workflow_id, error_msg, error_details)
        
        # Assert
        assert workflow["state"] == WORKFLOW_STATE_FAILED
        assert workflow["error"]["message"] == error_msg
        assert workflow["error"]["details"] == error_details
        
    def test_start_completed_workflow(self, state_manager_with_memory, sample_workflow_data, sample_steps):
        """Test attempting to start a completed workflow."""
        # Arrange
        workflow_id = state_manager_with_memory.create_workflow(
            "MIGRATION", sample_workflow_data, sample_steps
        )
        state_manager_with_memory.start_workflow(workflow_id)
        state_manager_with_memory.complete_workflow(workflow_id, {"success": True})
        
        # Act & Assert
        with pytest.raises(ValueError) as e:
            state_manager_with_memory.start_workflow(workflow_id)
        assert "already completed" in str(e.value)
        
    def test_list_workflows(self, state_manager_with_memory, sample_workflow_data, sample_steps):
        """Test listing workflows."""
        # Arrange - create multiple workflows in different states
        w1 = state_manager_with_memory.create_workflow("MIGRATION", sample_workflow_data, sample_steps)
        
        w2 = state_manager_with_memory.create_workflow("MIGRATION", sample_workflow_data, sample_steps)
        state_manager_with_memory.start_workflow(w2)
        
        w3 = state_manager_with_memory.create_workflow("MIGRATION", sample_workflow_data, sample_steps)
        state_manager_with_memory.start_workflow(w3)
        state_manager_with_memory.complete_workflow(w3, {"success": True})
        
        # Act
        all_workflows = state_manager_with_memory.list_workflows()
        running_workflows = state_manager_with_memory.list_workflows(WORKFLOW_STATE_RUNNING)
        completed_workflows = state_manager_with_memory.list_workflows(WORKFLOW_STATE_COMPLETED)
        
        # Assert
        assert len(all_workflows) == 3
        assert len(running_workflows) == 1
        assert running_workflows[0]["id"] == w2
        assert len(completed_workflows) == 1
        assert completed_workflows[0]["id"] == w3
        
    def test_pagination(self, state_manager_with_memory, sample_workflow_data, sample_steps):
        """Test workflow listing pagination."""
        # Arrange - create multiple workflows
        for _ in range(5):
            state_manager_with_memory.create_workflow("MIGRATION", sample_workflow_data, sample_steps)
            
        # Act
        page1 = state_manager_with_memory.list_workflows(limit=2, offset=0)
        page2 = state_manager_with_memory.list_workflows(limit=2, offset=2)
        page3 = state_manager_with_memory.list_workflows(limit=2, offset=4)
        
        # Assert
        assert len(page1) == 2
        assert len(page2) == 2
        assert len(page3) == 1
        
        # Verify different pages have different workflows
        page1_ids = {w["id"] for w in page1}
        page2_ids = {w["id"] for w in page2}
        assert not page1_ids.intersection(page2_ids)


@pytest.mark.unit
@pytest.mark.workflow
@pytest.mark.orchestrator
class TestWorkflowStepManagement:
    """Test workflow step management functionality."""
    
    def test_start_step(self, state_manager_with_memory, sample_workflow_data, sample_steps):
        """Test starting a workflow step."""
        # Arrange
        workflow_id = state_manager_with_memory.create_workflow(
            "MIGRATION", sample_workflow_data, sample_steps
        )
        state_manager_with_memory.start_workflow(workflow_id)
        
        # Act
        workflow, step = state_manager_with_memory.start_step(workflow_id, 0)
        
        # Assert
        assert workflow["currentStepIndex"] == 0
        assert step["status"] == STEP_STATE_RUNNING
        assert step["startTime"] is not None
        assert step["endTime"] is None
        
    def test_complete_step(self, state_manager_with_memory, sample_workflow_data, sample_steps):
        """Test completing a workflow step."""
        # Arrange
        workflow_id = state_manager_with_memory.create_workflow(
            "MIGRATION", sample_workflow_data, sample_steps
        )
        state_manager_with_memory.start_workflow(workflow_id)
        state_manager_with_memory.start_step(workflow_id, 0)
        
        # Act
        step_result = {"success": True, "data": {"valid": True}}
        workflow, step = state_manager_with_memory.complete_step(workflow_id, 0, step_result)
        
        # Assert
        assert step["status"] == STEP_STATE_COMPLETED
        assert step["endTime"] is not None
        assert step["result"] == step_result
        assert step["metadata"]["executionTime"] > 0
        assert workflow["currentStepIndex"] is None
        
    def test_fail_step(self, state_manager_with_memory, sample_workflow_data, sample_steps):
        """Test failing a workflow step."""
        # Arrange
        workflow_id = state_manager_with_memory.create_workflow(
            "MIGRATION", sample_workflow_data, sample_steps
        )
        state_manager_with_memory.start_workflow(workflow_id)
        state_manager_with_memory.start_step(workflow_id, 0)
        
        # Act
        error_message = "Validation failed"
        error_details = {"field": "sourceSystem", "error": "Required field missing"}
        workflow, step = state_manager_with_memory.fail_step(workflow_id, 0, error_message, error_details)
        
        # Assert
        assert step["status"] == STEP_STATE_FAILED
        assert step["endTime"] is not None
        assert step["error"]["message"] == error_message
        assert step["error"]["details"] == error_details
        assert workflow["currentStepIndex"] is None
        
        # Failing a step doesn't automatically fail the workflow
        assert workflow["state"] == WORKFLOW_STATE_RUNNING
        
    def test_retry_step(self, state_manager_with_memory, sample_workflow_data, sample_steps):
        """Test retrying a failed workflow step."""
        # Arrange
        workflow_id = state_manager_with_memory.create_workflow(
            "MIGRATION", sample_workflow_data, sample_steps
        )
        state_manager_with_memory.start_workflow(workflow_id)
        state_manager_with_memory.start_step(workflow_id, 0)
        state_manager_with_memory.fail_step(workflow_id, 0, "Validation failed")
        
        # Act
        workflow, step = state_manager_with_memory.retry_step(workflow_id, 0)
        
        # Assert
        assert step["status"] == STEP_STATE_PENDING
        assert step["error"] is None
        assert step["metadata"]["retryCount"] == 1
        
    def test_skip_step(self, state_manager_with_memory, sample_workflow_data, sample_steps):
        """Test skipping a workflow step."""
        # Arrange
        workflow_id = state_manager_with_memory.create_workflow(
            "MIGRATION", sample_workflow_data, sample_steps
        )
        state_manager_with_memory.start_workflow(workflow_id)
        
        # Act
        workflow, step = state_manager_with_memory.skip_step(workflow_id, 0)
        
        # Assert
        assert step["status"] == STEP_STATE_SKIPPED
        assert step["endTime"] is not None
        
    def test_invalid_step_index(self, state_manager_with_memory, sample_workflow_data, sample_steps):
        """Test operations with an invalid step index."""
        # Arrange
        workflow_id = state_manager_with_memory.create_workflow(
            "MIGRATION", sample_workflow_data, sample_steps
        )
        state_manager_with_memory.start_workflow(workflow_id)
        
        # Act & Assert - Try operations with invalid indices
        with pytest.raises(ValueError):
            state_manager_with_memory.start_step(workflow_id, -1)
            
        with pytest.raises(ValueError):
            state_manager_with_memory.start_step(workflow_id, 100)
            
    def test_get_step(self, state_manager_with_memory, sample_workflow_data, sample_steps):
        """Test retrieving a specific step by ID."""
        # Arrange
        workflow_id = state_manager_with_memory.create_workflow(
            "MIGRATION", sample_workflow_data, sample_steps
        )
        
        # Act
        step = state_manager_with_memory.get_step(workflow_id, "extract")
        
        # Assert
        assert step["id"] == "extract"
        assert step["name"] == "Extract Test Cases"
        
    def test_get_nonexistent_step(self, state_manager_with_memory, sample_workflow_data, sample_steps):
        """Test retrieving a non-existent step."""
        # Arrange
        workflow_id = state_manager_with_memory.create_workflow(
            "MIGRATION", sample_workflow_data, sample_steps
        )
        
        # Act & Assert
        with pytest.raises(ValueError) as e:
            state_manager_with_memory.get_step(workflow_id, "nonexistent-step")
        assert "not found" in str(e.value)


@pytest.mark.unit
@pytest.mark.workflow
@pytest.mark.orchestrator
class TestWorkflowPauseResume:
    """Test workflow pause and resume functionality."""
    
    def test_pause_workflow(self, state_manager_with_memory, sample_workflow_data, sample_steps):
        """Test pausing a running workflow."""
        # Arrange
        workflow_id = state_manager_with_memory.create_workflow(
            "MIGRATION", sample_workflow_data, sample_steps
        )
        state_manager_with_memory.start_workflow(workflow_id)
        state_manager_with_memory.start_step(workflow_id, 0)
        
        # Act
        workflow = state_manager_with_memory.pause_workflow(workflow_id)
        
        # Assert
        assert workflow["state"] == WORKFLOW_STATE_PAUSED
        assert workflow["metadata"]["pauseCount"] == 1
        
        # The running step should be reset to pending
        step = workflow["steps"][0]
        assert step["status"] == STEP_STATE_PENDING
        
    def test_pause_non_running_workflow(self, state_manager_with_memory, sample_workflow_data, sample_steps):
        """Test attempting to pause a workflow that isn't running."""
        # Arrange
        workflow_id = state_manager_with_memory.create_workflow(
            "MIGRATION", sample_workflow_data, sample_steps
        )
        
        # Act & Assert
        with pytest.raises(ValueError) as e:
            state_manager_with_memory.pause_workflow(workflow_id)
        assert "Cannot pause" in str(e.value)
        
    def test_resume_paused_workflow(self, state_manager_with_memory, sample_workflow_data, sample_steps):
        """Test resuming a paused workflow."""
        # Arrange
        workflow_id = state_manager_with_memory.create_workflow(
            "MIGRATION", sample_workflow_data, sample_steps
        )
        state_manager_with_memory.start_workflow(workflow_id)
        state_manager_with_memory.pause_workflow(workflow_id)
        
        # Act
        workflow = state_manager_with_memory.start_workflow(workflow_id)
        
        # Assert
        assert workflow["state"] == WORKFLOW_STATE_RUNNING


@pytest.mark.unit
@pytest.mark.workflow
@pytest.mark.orchestrator
class TestWorkflowRecovery:
    """Test workflow recovery functionality."""
    
    def test_retry_failed_workflow(self, state_manager_with_memory, sample_workflow_data, sample_steps):
        """Test retrying a failed workflow."""
        # Arrange
        workflow_id = state_manager_with_memory.create_workflow(
            "MIGRATION", sample_workflow_data, sample_steps
        )
        state_manager_with_memory.start_workflow(workflow_id)
        state_manager_with_memory.fail_workflow(workflow_id, "Something went wrong")
        
        # Act
        workflow = state_manager_with_memory.start_workflow(workflow_id)
        
        # Assert
        assert workflow["state"] == WORKFLOW_STATE_RUNNING
        assert workflow["error"] is None
        assert workflow["metadata"]["retryCount"] == 1
        
    def test_retry_failed_step_sequence(self, state_manager_with_memory, sample_workflow_data, sample_steps):
        """Test a sequence of operations in a retry scenario."""
        # Arrange
        workflow_id = state_manager_with_memory.create_workflow(
            "MIGRATION", sample_workflow_data, sample_steps
        )
        state_manager_with_memory.start_workflow(workflow_id)
        
        # Step 1 succeeds
        state_manager_with_memory.start_step(workflow_id, 0)
        state_manager_with_memory.complete_step(workflow_id, 0, {"valid": True})
        
        # Step 2 fails
        state_manager_with_memory.start_step(workflow_id, 1)
        state_manager_with_memory.fail_step(workflow_id, 1, "Connection failed")
        
        # Act - retry the failed step
        workflow, step = state_manager_with_memory.retry_step(workflow_id, 1)
        state_manager_with_memory.start_step(workflow_id, 1)
        state_manager_with_memory.complete_step(workflow_id, 1, {"connected": True})
        
        # Continue with step 3
        state_manager_with_memory.start_step(workflow_id, 2)
        state_manager_with_memory.complete_step(workflow_id, 2, {"connected": True})
        
        # Complete the workflow
        state_manager_with_memory.complete_workflow(workflow_id, {"success": True})
        
        # Assert
        final_workflow = state_manager_with_memory.get_workflow(workflow_id)
        assert final_workflow["state"] == WORKFLOW_STATE_COMPLETED
        
        # Check step statuses
        step_statuses = [step["status"] for step in final_workflow["steps"]]
        assert step_statuses[:3] == [STEP_STATE_COMPLETED, STEP_STATE_COMPLETED, STEP_STATE_COMPLETED]
        
        # The retried step should show a retry count
        assert final_workflow["steps"][1]["metadata"]["retryCount"] == 1