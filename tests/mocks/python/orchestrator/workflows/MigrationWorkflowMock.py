"""
Mock implementation of the MigrationWorkflow
Used for TDD during build system implementation
"""
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Any, Optional
import uuid

# Mock workflow states
WORKFLOW_STATE_CREATED = 'CREATED'
WORKFLOW_STATE_RUNNING = 'RUNNING'
WORKFLOW_STATE_COMPLETED = 'COMPLETED'
WORKFLOW_STATE_FAILED = 'FAILED'

# Mock workflow types
WORKFLOW_TYPE_MIGRATION = 'MIGRATION'

@dataclass
class WorkflowStepMock:
    """Mock workflow step for testing"""
    id: str
    name: str
    status: str
    order: int
    startTime: Optional[datetime] = None
    endTime: Optional[datetime] = None
    error: Optional[str] = None
    result: Optional[Dict[str, Any]] = None

@dataclass
class WorkflowMock:
    """Mock workflow for testing"""
    id: str
    type: str
    state: str
    input: Dict[str, Any]
    steps: List[WorkflowStepMock]
    createdAt: datetime
    startedAt: Optional[datetime] = None
    completedAt: Optional[datetime] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class MigrationWorkflowMock:
    """Mock implementation of migration workflow for testing"""
    
    def __init__(self, workflow_id: str, input_data: Dict[str, Any]):
        """Initialize mock workflow"""
        self.workflow = WorkflowMock(
            id=workflow_id,
            type=WORKFLOW_TYPE_MIGRATION,
            state=WORKFLOW_STATE_CREATED,
            input=input_data,
            steps=self._create_workflow_steps(),
            createdAt=datetime.now()
        )
    
    def _create_workflow_steps(self) -> List[WorkflowStepMock]:
        """Create mock workflow steps"""
        return [
            WorkflowStepMock(
                id="step-1",
                name="Validate Input",
                status="PENDING",
                order=1
            ),
            WorkflowStepMock(
                id="step-2",
                name="Connect to Source System",
                status="PENDING",
                order=2
            ),
            WorkflowStepMock(
                id="step-3",
                name="Connect to Target System",
                status="PENDING",
                order=3
            ),
            WorkflowStepMock(
                id="step-4",
                name="Extract Test Cases",
                status="PENDING",
                order=4
            ),
            WorkflowStepMock(
                id="step-5",
                name="Transform Test Data",
                status="PENDING",
                order=5
            ),
            WorkflowStepMock(
                id="step-6",
                name="Load Test Cases",
                status="PENDING",
                order=6
            ),
            WorkflowStepMock(
                id="step-7",
                name="Verify Migration",
                status="PENDING",
                order=7
            )
        ]
    
    def start(self) -> WorkflowMock:
        """Start the mock workflow - simulates a successful workflow execution"""
        # Simulate workflow execution
        self.workflow.state = WORKFLOW_STATE_RUNNING
        self.workflow.startedAt = datetime.now()
        
        # Process all steps with success
        for step in self.workflow.steps:
            step.status = "RUNNING"
            step.startTime = datetime.now()
            
            # Mock successful step execution
            step.status = "COMPLETED"
            step.endTime = datetime.now()
            
            # For validation step
            if step.id == "step-1":
                step.result = {"valid": True}
            # For connection steps
            elif step.id in ["step-2", "step-3"]:
                step.result = {
                    "connected": True, 
                    "system": self.workflow.input.get("sourceSystem" if step.id == "step-2" else "targetSystem")
                }
            # For extraction step
            elif step.id == "step-4":
                step.result = {
                    "testCases": [
                        {
                            "id": "TC-1001",
                            "title": "Login Test",
                            "description": "Test user login functionality",
                            "status": "READY",
                            "priority": "HIGH"
                        },
                        {
                            "id": "TC-1002",
                            "title": "Logout Test",
                            "description": "Test user logout functionality",
                            "status": "READY",
                            "priority": "MEDIUM"
                        }
                    ],
                    "count": 2
                }
            # For transformation step
            elif step.id == "step-5":
                step.result = {
                    "testCases": [
                        {
                            "id": "TC-1001",
                            "title": "Login Test",
                            "description": "Test user login functionality",
                            "status": "READY",
                            "priority": "HIGH",
                            "transformed": True,
                            "targetFormat": self.workflow.input.get("targetSystem")
                        },
                        {
                            "id": "TC-1002",
                            "title": "Logout Test",
                            "description": "Test user logout functionality",
                            "status": "READY",
                            "priority": "MEDIUM",
                            "transformed": True,
                            "targetFormat": self.workflow.input.get("targetSystem")
                        }
                    ],
                    "count": 2
                }
            # For loading step
            elif step.id == "step-6":
                step.result = {
                    "testCases": [
                        {
                            "sourceId": "TC-1001",
                            "targetId": "NEW-TC-1001",
                            "title": "Login Test",
                            "status": "MIGRATED"
                        },
                        {
                            "sourceId": "TC-1002",
                            "targetId": "NEW-TC-1002",
                            "title": "Logout Test",
                            "status": "MIGRATED"
                        }
                    ],
                    "count": 2,
                    "success": True
                }
            # For verification step
            elif step.id == "step-7":
                step.result = {
                    "verified": True,
                    "count": 2,
                    "verificationDetails": {
                        "migrated": 2,
                        "failed": 0,
                        "warnings": 0
                    }
                }
        
        # Mark workflow as completed
        self.workflow.state = WORKFLOW_STATE_COMPLETED
        self.workflow.completedAt = datetime.now()
        self.workflow.result = {
            "sourceSystem": self.workflow.input["sourceSystem"],
            "targetSystem": self.workflow.input["targetSystem"],
            "projectKey": self.workflow.input["projectKey"],
            "migratedCount": 2,
            "success": True,
            "migratedTestCases": [
                {
                    "sourceId": "TC-1001",
                    "targetId": "NEW-TC-1001",
                    "title": "Login Test",
                    "status": "MIGRATED"
                },
                {
                    "sourceId": "TC-1002",
                    "targetId": "NEW-TC-1002",
                    "title": "Logout Test",
                    "status": "MIGRATED"
                }
            ]
        }
        
        return self.workflow
    
    def get_status(self) -> Dict[str, Any]:
        """Get the current workflow status"""
        return {
            "id": self.workflow.id,
            "type": self.workflow.type,
            "state": self.workflow.state,
            "createdAt": self.workflow.createdAt.isoformat(),
            "startedAt": self.workflow.startedAt.isoformat() if self.workflow.startedAt else None,
            "completedAt": self.workflow.completedAt.isoformat() if self.workflow.completedAt else None,
            "steps": [
                {
                    "id": step.id,
                    "name": step.name,
                    "status": step.status,
                    "order": step.order,
                    "startTime": step.startTime.isoformat() if step.startTime else None,
                    "endTime": step.endTime.isoformat() if step.endTime else None
                } for step in self.workflow.steps
            ],
            "result": self.workflow.result,
            "error": self.workflow.error
        }