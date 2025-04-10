"""
Unit tests for the ResilientWorkflowExecutor.

These tests focus on:
1. Workflow execution with resilience
2. Step handler registration and execution
3. Error handling and recovery
4. Status monitoring
"""

import pytest
import uuid
from unittest.mock import patch, MagicMock, call

from internal.python.orchestrator.state.WorkflowStateManager import (
    WorkflowStateManager,
    WORKFLOW_STATE_CREATED,
    WORKFLOW_STATE_RUNNING,
    WORKFLOW_STATE_PAUSED,
    WORKFLOW_STATE_COMPLETED,
    WORKFLOW_STATE_FAILED
)

from internal.python.orchestrator.workflows.ResilientWorkflowExecutor import (
    ResilientWorkflowExecutor,
    MigrationWorkflowExecutor
)

@pytest.fixture
def mock_state_manager():
    """Fixture for a mock state manager."""
    manager = MagicMock(spec=WorkflowStateManager)
    
    # Configure default return values
    manager.create_workflow.return_value = str(uuid.uuid4())
    manager.get_workflow.return_value = {
        "id": "test-workflow-id",
        "type": "TEST",
        "state": WORKFLOW_STATE_CREATED,
        "data": {},
        "steps": [],
        "createdAt": "2025-01-01T00:00:00Z",
        "startedAt": None,
        "completedAt": None,
        "currentStepIndex": None,
        "error": None,
        "metadata": {}
    }
    
    return manager

@pytest.fixture
def mock_handlers():
    """Fixture for mock step handlers."""
    handlers = {
        "step1": MagicMock(return_value={"result": "Step 1 result"}),
        "step2": MagicMock(return_value={"result": "Step 2 result"}),
        "step3": MagicMock(return_value={"result": "Step 3 result"}),
    }
    return handlers

@pytest.fixture
def executor(mock_state_manager):
    """Fixture for a ResilientWorkflowExecutor with a mock state manager."""
    return ResilientWorkflowExecutor(mock_state_manager)

@pytest.fixture
def configured_executor(executor, mock_handlers):
    """Fixture for an executor with registered step handlers."""
    for step_id, handler in mock_handlers.items():
        executor.register_step_handler(step_id, handler)
    return executor

@pytest.fixture
def migration_executor(mock_state_manager):
    """Fixture for a MigrationWorkflowExecutor with a mock state manager."""
    return MigrationWorkflowExecutor(mock_state_manager)

@pytest.fixture
def sample_workflow_steps():
    """Fixture for sample workflow steps."""
    return [
        {"id": "step1", "name": "Step 1"},
        {"id": "step2", "name": "Step 2"},
        {"id": "step3", "name": "Step 3"}
    ]

@pytest.mark.unit
@pytest.mark.workflow
@pytest.mark.orchestrator
class TestResilientWorkflowExecutorBasics:
    """Test basic functionality of the ResilientWorkflowExecutor."""
    
    def test_create_workflow(self, executor, sample_workflow_steps):
        """Test creating a workflow."""
        # Arrange
        workflow_data = {"key": "value"}
        
        # Act
        workflow_id = executor.create_workflow("TEST", workflow_data, sample_workflow_steps)
        
        # Assert
        assert workflow_id is not None
        executor.state_manager.create_workflow.assert_called_once_with(
            "TEST", workflow_data, sample_workflow_steps
        )
    
    def test_register_step_handler(self, executor):
        """Test registering a step handler."""
        # Arrange
        handler = MagicMock()
        
        # Act
        executor.register_step_handler("test-step", handler)
        
        # Assert
        assert "test-step" in executor.step_handlers
        assert executor.step_handlers["test-step"] == handler
        
    def test_get_workflow_status(self, executor):
        """Test getting workflow status."""
        # Arrange
        workflow_id = "test-workflow-id"
        workflow = {
            "id": workflow_id,
            "type": "TEST",
            "state": WORKFLOW_STATE_RUNNING,
            "data": {"key": "value"},
            "steps": [
                {
                    "id": "step1",
                    "name": "Step 1",
                    "order": 1,
                    "status": "COMPLETED"
                },
                {
                    "id": "step2",
                    "name": "Step 2",
                    "order": 2,
                    "status": "RUNNING"
                }
            ],
            "createdAt": "2025-01-01T00:00:00Z",
            "startedAt": "2025-01-01T00:01:00Z",
            "completedAt": None,
            "currentStepIndex": 1,
            "error": None,
            "metadata": {}
        }
        executor.state_manager.get_workflow.return_value = workflow
        
        # Act
        status = executor.get_workflow_status(workflow_id)
        
        # Assert
        assert status["id"] == workflow_id
        assert status["state"] == WORKFLOW_STATE_RUNNING
        assert status["currentStep"]["id"] == "step2"
        assert len(status["steps"]) == 2
        assert "progress" in status
        
    def test_list_workflows(self, executor):
        """Test listing workflows."""
        # Act
        workflows = executor.list_workflows(state_filter="RUNNING", limit=10, offset=0)
        
        # Assert
        executor.state_manager.list_workflows.assert_called_once_with("RUNNING", 10, 0)


@pytest.mark.unit
@pytest.mark.workflow
@pytest.mark.orchestrator
class TestWorkflowExecution:
    """Test workflow execution functionality."""
    
    def test_successful_execution(self, configured_executor, mock_handlers, sample_workflow_steps):
        """Test successful workflow execution."""
        # Arrange
        workflow_id = "test-workflow-id"
        workflow_data = {"key": "value"}
        
        # Configure mock state manager
        configured_executor.state_manager.start_workflow.return_value = {
            "id": workflow_id,
            "type": "TEST",
            "state": WORKFLOW_STATE_RUNNING,
            "data": workflow_data,
            "steps": [
                {
                    "id": "step1",
                    "name": "Step 1",
                    "order": 1,
                    "status": "PENDING"
                },
                {
                    "id": "step2",
                    "name": "Step 2",
                    "order": 2,
                    "status": "PENDING"
                },
                {
                    "id": "step3",
                    "name": "Step 3",
                    "order": 3,
                    "status": "PENDING"
                }
            ],
            "createdAt": "2025-01-01T00:00:00Z",
            "startedAt": "2025-01-01T00:01:00Z",
            "completedAt": None,
            "currentStepIndex": None,
            "error": None,
            "metadata": {}
        }
        
        # Act
        result = configured_executor.execute_workflow(workflow_id)
        
        # Assert
        configured_executor.state_manager.start_workflow.assert_called_once_with(workflow_id)
        
        # Each step should have been executed
        for step_id, handler in mock_handlers.items():
            handler.assert_called_once_with(workflow_data)
        
        # Each step should have been managed through the state manager
        assert configured_executor.state_manager.start_step.call_count == 3
        assert configured_executor.state_manager.complete_step.call_count == 3
        
        # Should have completed the workflow
        configured_executor.state_manager.complete_workflow.assert_called_once()
        
    def test_execution_with_step_failure(self, configured_executor, mock_handlers, sample_workflow_steps):
        """Test workflow execution with a step failure."""
        # Arrange
        workflow_id = "test-workflow-id"
        workflow_data = {"key": "value"}
        
        # Configure mock state manager
        configured_executor.state_manager.start_workflow.return_value = {
            "id": workflow_id,
            "type": "TEST",
            "state": WORKFLOW_STATE_RUNNING,
            "data": workflow_data,
            "steps": [
                {
                    "id": "step1",
                    "name": "Step 1",
                    "order": 1,
                    "status": "PENDING"
                },
                {
                    "id": "step2",
                    "name": "Step 2",
                    "order": 2,
                    "status": "PENDING"
                },
                {
                    "id": "step3",
                    "name": "Step 3",
                    "order": 3,
                    "status": "PENDING"
                }
            ],
            "createdAt": "2025-01-01T00:00:00Z",
            "startedAt": "2025-01-01T00:01:00Z",
            "completedAt": None,
            "currentStepIndex": None,
            "error": None,
            "metadata": {}
        }
        
        # Make step2 handler raise an exception
        mock_handlers["step2"].side_effect = ValueError("Step 2 failed")
        
        # Act
        result = configured_executor.execute_workflow(workflow_id)
        
        # Assert
        configured_executor.state_manager.start_workflow.assert_called_once_with(workflow_id)
        
        # First handler should be called, second should fail, third should not be called
        mock_handlers["step1"].assert_called_once_with(workflow_data)
        mock_handlers["step2"].assert_called_once_with(workflow_data)
        mock_handlers["step3"].assert_not_called()
        
        # Should have failed the step and workflow
        configured_executor.state_manager.fail_step.assert_called_once()
        configured_executor.state_manager.fail_workflow.assert_called_once()
        
        # Should not have completed the workflow
        configured_executor.state_manager.complete_workflow.assert_not_called()
        
    def test_execution_with_retries(self, configured_executor, mock_handlers, sample_workflow_steps):
        """Test workflow execution with automatic retries."""
        # Arrange
        workflow_id = "test-workflow-id"
        workflow_data = {"key": "value"}
        
        # Configure mock state manager
        configured_executor.state_manager.start_workflow.return_value = {
            "id": workflow_id,
            "type": "TEST",
            "state": WORKFLOW_STATE_RUNNING,
            "data": workflow_data,
            "steps": [
                {
                    "id": "step1",
                    "name": "Step 1",
                    "order": 1,
                    "status": "PENDING"
                },
                {
                    "id": "step2",
                    "name": "Step 2",
                    "order": 2,
                    "status": "PENDING"
                },
                {
                    "id": "step3",
                    "name": "Step 3",
                    "order": 3,
                    "status": "PENDING"
                }
            ],
            "createdAt": "2025-01-01T00:00:00Z",
            "startedAt": "2025-01-01T00:01:00Z",
            "completedAt": None,
            "currentStepIndex": None,
            "error": None,
            "metadata": {}
        }
        
        # Make step2 handler fail twice, then succeed
        side_effects = [
            ValueError("First failure"),
            ValueError("Second failure"),
            {"result": "Step 2 succeeded after retries"}
        ]
        mock_handlers["step2"].side_effect = side_effects
        
        # Patch time.sleep to avoid delays in the test
        with patch('time.sleep'):
            # Act
            result = configured_executor.execute_workflow(workflow_id, auto_retry=True, max_retries=3, retry_delay=1)
        
        # Assert
        # First step should be called once
        mock_handlers["step1"].assert_called_once_with(workflow_data)
        
        # Second step should be called three times (failing twice, succeeding on third try)
        assert mock_handlers["step2"].call_count == 3
        
        # Third step should be called once after successful retry
        mock_handlers["step3"].assert_called_once_with(workflow_data)
        
        # Should have retried the step twice
        assert configured_executor.state_manager.retry_step.call_count == 2
        
        # Should have completed the workflow
        configured_executor.state_manager.complete_workflow.assert_called_once()
        
    def test_execution_with_resume(self, configured_executor, mock_handlers, sample_workflow_steps):
        """Test resuming workflow execution with completed steps."""
        # Arrange
        workflow_id = "test-workflow-id"
        workflow_data = {"key": "value"}
        
        # Configure mock state manager to show step1 as already completed
        configured_executor.state_manager.start_workflow.return_value = {
            "id": workflow_id,
            "type": "TEST",
            "state": WORKFLOW_STATE_RUNNING,
            "data": workflow_data,
            "steps": [
                {
                    "id": "step1",
                    "name": "Step 1",
                    "order": 1,
                    "status": "COMPLETED",
                    "result": {"result": "Already completed"}
                },
                {
                    "id": "step2",
                    "name": "Step 2",
                    "order": 2,
                    "status": "PENDING"
                },
                {
                    "id": "step3",
                    "name": "Step 3",
                    "order": 3,
                    "status": "PENDING"
                }
            ],
            "createdAt": "2025-01-01T00:00:00Z",
            "startedAt": "2025-01-01T00:01:00Z",
            "completedAt": None,
            "currentStepIndex": None,
            "error": None,
            "metadata": {}
        }
        
        # Act
        result = configured_executor.execute_workflow(workflow_id)
        
        # Assert
        # First step should not be called
        mock_handlers["step1"].assert_not_called()
        
        # Second and third steps should be called
        mock_handlers["step2"].assert_called_once_with(workflow_data)
        mock_handlers["step3"].assert_called_once_with(workflow_data)
        
        # Should have completed the workflow
        configured_executor.state_manager.complete_workflow.assert_called_once()


@pytest.mark.unit
@pytest.mark.workflow
@pytest.mark.orchestrator
class TestMigrationWorkflowExecutor:
    """Test specialized migration workflow executor."""
    
    def test_create_migration_workflow(self, migration_executor, sample_workflow_data):
        """Test creating a specialized migration workflow."""
        # Act
        workflow_id = migration_executor.create_migration_workflow(sample_workflow_data)
        
        # Assert
        assert workflow_id is not None
        
        # Should call the base create_workflow with the right arguments
        create_call = migration_executor.state_manager.create_workflow.call_args
        assert create_call is not None
        
        args, _ = create_call
        assert args[0] == "MIGRATION"  # workflow type
        assert args[1] == sample_workflow_data  # workflow data
        assert len(args[2]) == 7  # 7 standard migration steps
        
    def test_migration_step_validation(self, migration_executor, sample_workflow_data):
        """Test validation of migration input data."""
        # Act
        validation_result = migration_executor._validate_input(sample_workflow_data)
        
        # Assert
        assert validation_result["valid"] is True
        
    def test_migration_validate_missing_fields(self, migration_executor):
        """Test validation of migration input with missing fields."""
        # Arrange
        invalid_data = {"sourceSystem": "zephyr"}  # Missing targetSystem and projectKey
        
        # Act & Assert
        with pytest.raises(ValueError) as e:
            migration_executor._validate_input(invalid_data)
        assert "Missing required fields" in str(e.value)
        
    def test_migration_validate_invalid_system(self, migration_executor):
        """Test validation with invalid system names."""
        # Arrange
        invalid_data = {
            "sourceSystem": "invalid-system",
            "targetSystem": "qtest",
            "projectKey": "TEST"
        }
        
        # Act & Assert
        with pytest.raises(ValueError) as e:
            migration_executor._validate_input(invalid_data)
        assert "Invalid source system" in str(e.value)
        
    def test_migration_validate_same_systems(self, migration_executor):
        """Test validation with same source and target systems."""
        # Arrange
        invalid_data = {
            "sourceSystem": "qtest",
            "targetSystem": "qtest",
            "projectKey": "TEST"
        }
        
        # Act & Assert
        with pytest.raises(ValueError) as e:
            migration_executor._validate_input(invalid_data)
        assert "cannot be the same" in str(e.value)
        
    def test_migration_step_execution(self, migration_executor, sample_workflow_data):
        """Test execution of migration steps."""
        # Act - Execute each step
        validate_result = migration_executor._validate_input(sample_workflow_data)
        source_result = migration_executor._connect_to_source_system(sample_workflow_data)
        target_result = migration_executor._connect_to_target_system(sample_workflow_data)
        extract_result = migration_executor._extract_test_cases(sample_workflow_data)
        
        # For transform and load, we need to mock _get_step_result
        with patch.object(migration_executor, '_get_step_result') as mock_get_result:
            mock_get_result.return_value = extract_result
            transform_result = migration_executor._transform_test_data(sample_workflow_data)
            mock_get_result.return_value = transform_result
            load_result = migration_executor._load_test_cases(sample_workflow_data)
            mock_get_result.return_value = load_result
            verify_result = migration_executor._verify_migration(sample_workflow_data)
        
        # Assert - Each step should return valid results
        assert validate_result["valid"] is True
        assert source_result["connected"] is True
        assert target_result["connected"] is True
        assert "testCases" in extract_result
        assert len(extract_result["testCases"]) > 0
        assert "testCases" in transform_result
        assert transform_result["testCases"][0]["transformed"] is True
        assert "testCases" in load_result
        assert "verified" in verify_result
        assert verify_result["verified"] is True