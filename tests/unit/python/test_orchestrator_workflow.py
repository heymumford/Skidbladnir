"""
Unit tests for the orchestration workflow components.
"""

import pytest
import uuid
from datetime import datetime
from tests.mocks.python.orchestrator.workflows.MigrationWorkflowMock import (
    MigrationWorkflowMock,
    WORKFLOW_STATE_CREATED,
    WORKFLOW_STATE_RUNNING,
    WORKFLOW_STATE_COMPLETED
)

@pytest.mark.unit
@pytest.mark.workflow
@pytest.mark.orchestrator
class TestOrchestratorWorkflow:
    """Test suite for orchestrator workflow functionality."""
    
    def test_workflow_initialization(self, sample_workflow_data):
        """Test that a workflow can be properly initialized."""
        # Arrange
        workflow_id = str(uuid.uuid4())
        
        # Act
        workflow = MigrationWorkflowMock(workflow_id, sample_workflow_data)
        
        # Assert
        assert workflow.workflow.id == workflow_id
        assert workflow.workflow.state == WORKFLOW_STATE_CREATED
        assert len(workflow.workflow.steps) == 7
        assert workflow.workflow.input == sample_workflow_data
        
    def test_workflow_execution(self, sample_workflow_data):
        """Test that a workflow can be executed."""
        # Arrange
        workflow_id = str(uuid.uuid4())
        workflow = MigrationWorkflowMock(workflow_id, sample_workflow_data)
        
        # Act
        result = workflow.start()
        
        # Assert
        assert result.state == WORKFLOW_STATE_COMPLETED
        assert result.startedAt is not None
        assert result.completedAt is not None
        assert result.result is not None
        assert result.result["success"] is True
        assert result.result["migratedCount"] == 2
        
    def test_workflow_steps(self, sample_workflow_data):
        """Test that workflow steps are executed in the correct order."""
        # Arrange
        workflow_id = str(uuid.uuid4())
        workflow = MigrationWorkflowMock(workflow_id, sample_workflow_data)
        
        # Act
        result = workflow.start()
        
        # Assert
        step_names = [step.name for step in result.steps]
        expected_steps = [
            "Validate Input",
            "Connect to Source System",
            "Connect to Target System",
            "Extract Test Cases", 
            "Transform Test Data",
            "Load Test Cases",
            "Verify Migration"
        ]
        
        assert step_names == expected_steps
        
        # Verify all steps are completed
        for step in result.steps:
            assert step.status == "COMPLETED"
            assert step.startTime is not None
            assert step.endTime is not None
            
    def test_workflow_status(self, sample_workflow_data):
        """Test that workflow status can be retrieved."""
        # Arrange
        workflow_id = str(uuid.uuid4())
        workflow = MigrationWorkflowMock(workflow_id, sample_workflow_data)
        
        # Act
        workflow.start()
        status = workflow.get_status()
        
        # Assert
        assert status["id"] == workflow_id
        assert status["state"] == WORKFLOW_STATE_COMPLETED
        assert status["steps"] is not None
        assert len(status["steps"]) == 7
        assert status["result"]["migratedCount"] == 2
        
    def test_error_handling(self, mock_orchestrator_service):
        """Test that errors are properly handled."""
        # Arrange - Use the mock service directly
        workflow_id = mock_orchestrator_service.create_workflow(
            "MIGRATION", 
            {"sourceSystem": "Invalid", "targetSystem": "Invalid"}
        )
        
        # Act & Assert - GetWorkflow with invalid ID should raise exception
        with pytest.raises(ValueError):
            mock_orchestrator_service.get_workflow("invalid-id")
            
        # Act - Valid workflow ID should return the workflow
        workflow = mock_orchestrator_service.get_workflow(workflow_id)
        
        # Assert
        assert workflow["id"] == workflow_id
        assert workflow["state"] == "CREATED"