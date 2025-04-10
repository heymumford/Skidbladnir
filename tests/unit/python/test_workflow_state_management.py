"""
Unit tests for workflow state management in the Orchestrator.

These tests focus on:
1. Proper state transitions
2. Error handling and state tracking
3. Workflow recovery mechanisms
4. Concurrent workflow execution
5. Event logging during state transitions
"""

import pytest
import uuid
import time
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta

from internal.python.orchestrator.workflows.MigrationWorkflow import (
    MigrationWorkflow,
    WORKFLOW_STATE_CREATED,
    WORKFLOW_STATE_RUNNING,
    WORKFLOW_STATE_COMPLETED,
    WORKFLOW_STATE_FAILED,
    WorkflowStep
)

@pytest.mark.unit
@pytest.mark.workflow
@pytest.mark.orchestrator
class TestWorkflowStateManagement:
    """Test suite for workflow state management."""

    def test_initial_state(self, sample_workflow_data):
        """Test the initial state of a workflow when created."""
        # Arrange
        workflow_id = str(uuid.uuid4())
        
        # Act
        workflow = MigrationWorkflow(workflow_id, sample_workflow_data)
        
        # Assert
        assert workflow.workflow.id == workflow_id
        assert workflow.workflow.state == WORKFLOW_STATE_CREATED
        assert workflow.workflow.startedAt is None
        assert workflow.workflow.completedAt is None
        assert workflow.workflow.error is None
        assert workflow.workflow.result is None
        
        # Verify all steps are in PENDING state
        for step in workflow.workflow.steps:
            assert step.status == "PENDING"
            assert step.startTime is None
            assert step.endTime is None
            assert step.error is None
            assert step.result is None

    def test_successful_state_transitions(self, sample_workflow_data):
        """Test state transitions during successful workflow execution."""
        # Arrange
        workflow_id = str(uuid.uuid4())
        workflow = MigrationWorkflow(workflow_id, sample_workflow_data)
        
        # Act - capture state before execution
        initial_state = workflow.workflow.state
        
        # Act - start workflow
        result = workflow.start()
        
        # Assert - check state transitions
        assert initial_state == WORKFLOW_STATE_CREATED
        assert result.state == WORKFLOW_STATE_COMPLETED
        assert result.startedAt is not None
        assert result.completedAt is not None
        assert result.error is None
        
        # Check step transitions - all steps should be COMPLETED
        for step in result.steps:
            assert step.status == "COMPLETED"
            assert step.startTime is not None
            assert step.endTime is not None
            assert step.error is None
            assert step.result is not None

    def test_failed_validation_state(self, sample_workflow_data):
        """Test state transitions when validation fails."""
        # Arrange
        workflow_id = str(uuid.uuid4())
        invalid_data = sample_workflow_data.copy()
        invalid_data.pop("sourceSystem")  # Make the input invalid by removing required field
        workflow = MigrationWorkflow(workflow_id, invalid_data)
        
        # Act
        result = workflow.start()
        
        # Assert
        assert result.state == WORKFLOW_STATE_FAILED
        assert result.startedAt is not None
        assert result.error is not None
        
        # Check step states
        validation_step = next(step for step in result.steps if step.id == "step-1")
        assert validation_step.status == "FAILED"
        assert validation_step.error is not None
        
        # Following steps should still be PENDING
        later_steps = [step for step in result.steps if step.order > 1]
        for step in later_steps:
            assert step.status == "PENDING"
            assert step.startTime is None

    @patch('internal.python.orchestrator.workflows.MigrationWorkflow.MigrationWorkflow._connect_to_source_system')
    def test_failed_connection_state(self, mock_connect, sample_workflow_data):
        """Test state transitions when connection fails."""
        # Arrange
        workflow_id = str(uuid.uuid4())
        workflow = MigrationWorkflow(workflow_id, sample_workflow_data)
        
        # Configure mock to raise an exception
        mock_connect.side_effect = ConnectionError("Failed to connect to source system")
        
        # Act
        result = workflow.start()
        
        # Assert
        assert result.state == WORKFLOW_STATE_FAILED
        assert "Failed to connect to source system" in result.error
        
        # Validate step states
        validation_step = next(step for step in result.steps if step.id == "step-1")
        assert validation_step.status == "COMPLETED"
        
        connection_step = next(step for step in result.steps if step.id == "step-2")
        assert connection_step.status == "FAILED"
        assert "Failed to connect" in connection_step.error
        
        # Later steps should remain PENDING
        later_steps = [step for step in result.steps if step.order > 2]
        for step in later_steps:
            assert step.status == "PENDING"

    @patch('internal.python.orchestrator.workflows.MigrationWorkflow.MigrationWorkflow._extract_test_cases')
    def test_mid_workflow_failure(self, mock_extract, sample_workflow_data):
        """Test state transitions when a mid-workflow step fails."""
        # Arrange
        workflow_id = str(uuid.uuid4())
        workflow = MigrationWorkflow(workflow_id, sample_workflow_data)
        
        # Configure mock to raise an exception
        mock_extract.side_effect = ValueError("Failed to extract test cases")
        
        # Act
        result = workflow.start()
        
        # Assert
        assert result.state == WORKFLOW_STATE_FAILED
        assert "Failed to extract test cases" in result.error
        
        # Verify progress up to failure point
        for step in result.steps:
            if step.order < 4:  # Steps before extraction
                assert step.status == "COMPLETED"
            elif step.order == 4:  # Extraction step
                assert step.status == "FAILED"
                assert step.error is not None
            else:  # Steps after extraction
                assert step.status == "PENDING"
                assert step.startTime is None

    def test_step_timing_tracking(self, sample_workflow_data):
        """Test that timing information is correctly tracked for steps."""
        # Arrange
        workflow_id = str(uuid.uuid4())
        workflow = MigrationWorkflow(workflow_id, sample_workflow_data)
        
        # Act
        result = workflow.start()
        
        # Assert
        for i, step in enumerate(result.steps):
            # Each step should have valid timing information
            assert step.startTime is not None
            assert step.endTime is not None
            assert step.endTime > step.startTime
            
            # Steps should be executed in sequence
            if i > 0:
                previous_step = result.steps[i-1]
                assert step.startTime >= previous_step.endTime

    def test_get_status_while_running(self, sample_workflow_data):
        """Test that get_status works correctly while workflow is running."""
        # Arrange
        workflow_id = str(uuid.uuid4())
        workflow = MigrationWorkflow(workflow_id, sample_workflow_data)
        
        # Use patching to make execution slow enough to check status
        with patch('internal.python.orchestrator.workflows.MigrationWorkflow.MigrationWorkflow._execute_step') as mock_exec:
            def slow_execution(step):
                step.status = "RUNNING"
                step.startTime = datetime.now()
                time.sleep(0.1)  # Short delay to allow status check
                step.status = "COMPLETED"
                step.endTime = datetime.now()
                step.result = {"test": "data"}
            
            mock_exec.side_effect = slow_execution
            
            # Act - start workflow in a way that we can check status before completion
            workflow.workflow.state = WORKFLOW_STATE_RUNNING
            workflow.workflow.startedAt = datetime.now()
            
            # Execute first step manually
            workflow._execute_step(workflow.workflow.steps[0])
            
            # Get status during execution
            status = workflow.get_status()
            
            # Assert
            assert status["state"] == WORKFLOW_STATE_RUNNING
            assert status["startedAt"] is not None
            assert status["completedAt"] is None
            
            # First step should be completed
            assert status["steps"][0]["status"] == "COMPLETED"
            # Remaining steps should be pending
            for step_status in status["steps"][1:]:
                assert step_status["status"] == "PENDING"

    @patch('datetime.datetime')
    def test_timing_information(self, mock_datetime, sample_workflow_data):
        """Test that timing information is correctly recorded."""
        # Arrange
        workflow_id = str(uuid.uuid4())
        
        # Create timestamps for mocking
        now = datetime.now()
        timestamps = [
            now,                         # creation time
            now + timedelta(seconds=1),  # start time
            now + timedelta(seconds=2),  # step 1 start
            now + timedelta(seconds=3),  # step 1 end, step 2 start
            now + timedelta(seconds=4),  # step 2 end
            now + timedelta(seconds=5),  # completion time
        ]
        
        # Configure datetime mock
        mock_datetime.now.side_effect = timestamps
        
        # Create workflow with mocked timing
        with patch('internal.python.orchestrator.workflows.MigrationWorkflow.datetime') as mock_dt:
            mock_dt.now.side_effect = timestamps
            workflow = MigrationWorkflow(workflow_id, sample_workflow_data)
            
            # Override _execute_step to control timing
            def mock_execute_step(step):
                step.status = "RUNNING"
                step.startTime = datetime.now()
                step.status = "COMPLETED"
                step.endTime = datetime.now()
                step.result = {"test": "data"}
            
            workflow._execute_step = mock_execute_step
            
            # Act - only execute first two steps for this test
            workflow.workflow.state = WORKFLOW_STATE_RUNNING
            workflow.workflow.startedAt = datetime.now()
            workflow._execute_step(workflow.workflow.steps[0])
            workflow._execute_step(workflow.workflow.steps[1])
            workflow.workflow.state = WORKFLOW_STATE_COMPLETED
            workflow.workflow.completedAt = datetime.now()
            
            # Get status with timing info
            status = workflow.get_status()
            
            # Assert timing information
            assert status["createdAt"] == timestamps[0].isoformat()
            assert status["startedAt"] == timestamps[1].isoformat()
            assert status["steps"][0]["startTime"] == timestamps[2].isoformat()
            assert status["steps"][0]["endTime"] == timestamps[3].isoformat()
            assert status["steps"][1]["startTime"] == timestamps[3].isoformat()
            assert status["steps"][1]["endTime"] == timestamps[4].isoformat()
            assert status["completedAt"] == timestamps[5].isoformat()
            
    def test_result_collection(self, sample_workflow_data):
        """Test that results are correctly collected from steps."""
        # Arrange
        workflow_id = str(uuid.uuid4())
        workflow = MigrationWorkflow(workflow_id, sample_workflow_data)
        
        # Act
        result = workflow.start()
        
        # Assert
        assert result.result is not None
        assert "migratedCount" in result.result
        assert "sourceSystem" in result.result
        assert "targetSystem" in result.result
        assert "migratedTestCases" in result.result
        
        # Verify result contains information from steps
        verify_step = next(step for step in result.steps if step.id == "step-7")
        assert result.result["migratedCount"] == verify_step.result["count"]
        
        # Check that test cases were carried through the workflow
        extract_step = next(step for step in result.steps if step.id == "step-4")
        transform_step = next(step for step in result.steps if step.id == "step-5")
        load_step = next(step for step in result.steps if step.id == "step-6")
        
        # Number of test cases should be consistent throughout the workflow
        assert extract_step.result["count"] == transform_step.result["count"] == load_step.result["count"]

    @patch('logging.Logger.error')
    def test_error_logging(self, mock_error_log, sample_workflow_data):
        """Test that errors are properly logged."""
        # Arrange
        workflow_id = str(uuid.uuid4())
        invalid_data = sample_workflow_data.copy()
        invalid_data.pop("sourceSystem")  # Make the input invalid
        workflow = MigrationWorkflow(workflow_id, invalid_data)
        
        # Act
        result = workflow.start()
        
        # Assert
        assert result.state == WORKFLOW_STATE_FAILED
        assert result.error is not None
        mock_error_log.assert_called()  # Verify error was logged

    def test_invalid_workflow_id(self, sample_workflow_data):
        """Test validation of the workflow ID."""
        # Arrange
        invalid_id = ""  # Empty ID
        
        # Act & Assert
        with pytest.raises(ValueError) as e:
            MigrationWorkflow(invalid_id, sample_workflow_data)
        assert "workflow_id" in str(e.value).lower()


@pytest.mark.unit
@pytest.mark.workflow
@pytest.mark.orchestrator
class TestWorkflowRecoveryMechanisms:
    """Test suite for workflow recovery mechanisms."""
    
    @patch('internal.python.orchestrator.workflows.MigrationWorkflow.MigrationWorkflow._extract_test_cases')
    def test_workflow_can_restart_from_failure(self, mock_extract, sample_workflow_data):
        """Test that a workflow can be restarted after failure."""
        # Arrange - create workflow that will fail during extraction
        workflow_id = str(uuid.uuid4())
        workflow = MigrationWorkflow(workflow_id, sample_workflow_data)
        mock_extract.side_effect = ConnectionError("Temporary connection error")
        
        # Act - first execution (failure)
        result = workflow.start()
        assert result.state == WORKFLOW_STATE_FAILED
        
        # Reset for retry
        extraction_step = next(step for step in workflow.workflow.steps if step.id == "step-4")
        extraction_step.status = "PENDING"
        extraction_step.error = None
        workflow.workflow.state = WORKFLOW_STATE_CREATED
        workflow.workflow.error = None
        
        # Fix the mock for successful retry
        mock_extract.side_effect = None
        mock_extract.return_value = {
            "testCases": [
                {
                    "id": "TC-1001",
                    "title": "Recovery Test",
                    "description": "Test workflow recovery",
                    "status": "READY",
                    "priority": "HIGH"
                }
            ],
            "count": 1
        }
        
        # Act - second execution (success after recovery)
        result = workflow.start()
        
        # Assert
        assert result.state == WORKFLOW_STATE_COMPLETED
        assert result.error is None
        assert "migratedTestCases" in result.result
        assert len(result.result["migratedTestCases"]) > 0
        
        # Verify the extraction step succeeded on retry
        extraction_step = next(step for step in result.steps if step.id == "step-4")
        assert extraction_step.status == "COMPLETED"
        assert extraction_step.error is None

    def test_resume_from_checkpoint(self, sample_workflow_data):
        """Test that a workflow can resume from a checkpoint."""
        # Arrange
        workflow_id = str(uuid.uuid4())
        workflow = MigrationWorkflow(workflow_id, sample_workflow_data)
        
        # Manually set up a workflow that has completed some steps
        workflow.workflow.state = WORKFLOW_STATE_RUNNING
        workflow.workflow.startedAt = datetime.now()
        
        # Complete the first 3 steps
        for i in range(3):
            step = workflow.workflow.steps[i]
            step.status = "COMPLETED"
            step.startTime = datetime.now()
            step.endTime = datetime.now()
            
            if step.id == "step-1":
                step.result = {"valid": True}
            elif step.id == "step-2":
                step.result = {"connected": True, "system": sample_workflow_data["sourceSystem"]}
            elif step.id == "step-3":
                step.result = {"connected": True, "system": sample_workflow_data["targetSystem"]}
        
        # Define a modified _execute_step to only process PENDING steps
        original_execute_step = workflow._execute_step
        
        def execute_only_pending(step):
            if step.status != "PENDING":
                return  # Skip already completed steps
            original_execute_step(step)
        
        workflow._execute_step = execute_only_pending
        
        # Act - resume workflow
        with patch.object(workflow, '_execute_step', wraps=execute_only_pending) as mock_execute:
            result = workflow.start()
        
        # Assert
        assert result.state == WORKFLOW_STATE_COMPLETED
        assert result.error is None
        
        # Verify the previously completed steps weren't re-executed
        assert mock_execute.call_count == 4  # Only called for the 4 remaining steps
        
        # Verify all steps are completed
        for step in result.steps:
            assert step.status == "COMPLETED"
            assert step.result is not None

    def test_retry_failed_step(self, sample_workflow_data):
        """Test that a failed step can be retried without restarting the entire workflow."""
        # Arrange
        workflow_id = str(uuid.uuid4())
        workflow = MigrationWorkflow(workflow_id, sample_workflow_data)
        
        # Set up a workflow with a failed step
        workflow.workflow.state = WORKFLOW_STATE_FAILED
        workflow.workflow.startedAt = datetime.now()
        workflow.workflow.error = "Step 4 failed"
        
        # Complete steps 1-3
        for i in range(3):
            step = workflow.workflow.steps[i]
            step.status = "COMPLETED"
            step.startTime = datetime.now()
            step.endTime = datetime.now()
            
            if step.id == "step-1":
                step.result = {"valid": True}
            elif step.id == "step-2":
                step.result = {"connected": True, "system": sample_workflow_data["sourceSystem"]}
            elif step.id == "step-3":
                step.result = {"connected": True, "system": sample_workflow_data["targetSystem"]}
        
        # Set step 4 as failed
        extract_step = workflow.workflow.steps[3]  # step-4
        extract_step.status = "FAILED"
        extract_step.error = "Data extraction failed"
        extract_step.startTime = datetime.now()
        extract_step.endTime = datetime.now()
        
        # Reset the failed step for retry
        extract_step.status = "PENDING"
        extract_step.error = None
        extract_step.startTime = None
        extract_step.endTime = None
        extract_step.result = None
        
        # Reset workflow state
        workflow.workflow.state = WORKFLOW_STATE_RUNNING
        workflow.workflow.error = None
        
        # Define a custom _execute_step to track which steps are executed
        executed_steps = []
        original_execute_step = workflow._execute_step
        
        def tracked_execute_step(step):
            if step.status != "COMPLETED":  # Skip already completed steps
                executed_steps.append(step.id)
                original_execute_step(step)
        
        workflow._execute_step = tracked_execute_step
        
        # Act - resume workflow
        result = workflow.start()
        
        # Assert
        assert result.state == WORKFLOW_STATE_COMPLETED
        assert result.error is None
        
        # Verify only the necessary steps were executed
        assert "step-1" not in executed_steps  # Already completed
        assert "step-2" not in executed_steps  # Already completed
        assert "step-3" not in executed_steps  # Already completed
        assert "step-4" in executed_steps      # Retried
        assert "step-5" in executed_steps      # Needed to be executed
        assert "step-6" in executed_steps      # Needed to be executed
        assert "step-7" in executed_steps      # Needed to be executed