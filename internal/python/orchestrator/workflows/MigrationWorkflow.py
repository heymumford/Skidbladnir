from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import json
import logging
from datetime import datetime

# Workflow state definitions
WORKFLOW_STATE_CREATED = 'CREATED'
WORKFLOW_STATE_RUNNING = 'RUNNING'
WORKFLOW_STATE_COMPLETED = 'COMPLETED'
WORKFLOW_STATE_FAILED = 'FAILED'

# Workflow types
WORKFLOW_TYPE_MIGRATION = 'MIGRATION'

@dataclass
class WorkflowStep:
    """Represents a step within a workflow"""
    id: str
    name: str
    status: str
    order: int
    startTime: Optional[datetime] = None
    endTime: Optional[datetime] = None
    error: Optional[str] = None
    result: Optional[Dict[str, Any]] = None

@dataclass
class Workflow:
    """Represents a workflow for test asset migration"""
    id: str
    type: str
    state: str
    input: Dict[str, Any]
    steps: List[WorkflowStep]
    createdAt: datetime
    startedAt: Optional[datetime] = None
    completedAt: Optional[datetime] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class MigrationWorkflow:
    """Test case migration workflow implementation"""
    
    def __init__(self, workflow_id: str, input_data: Dict[str, Any]):
        """Initialize a new migration workflow"""
        self.logger = logging.getLogger(__name__)
        self.workflow = Workflow(
            id=workflow_id,
            type=WORKFLOW_TYPE_MIGRATION,
            state=WORKFLOW_STATE_CREATED,
            input=input_data,
            steps=self._create_workflow_steps(),
            createdAt=datetime.now()
        )
    
    def _create_workflow_steps(self) -> List[WorkflowStep]:
        """Create the steps for this workflow"""
        return [
            WorkflowStep(
                id="step-1",
                name="Validate Input",
                status="PENDING",
                order=1
            ),
            WorkflowStep(
                id="step-2",
                name="Connect to Source System",
                status="PENDING",
                order=2
            ),
            WorkflowStep(
                id="step-3",
                name="Connect to Target System",
                status="PENDING",
                order=3
            ),
            WorkflowStep(
                id="step-4",
                name="Extract Test Cases",
                status="PENDING",
                order=4
            ),
            WorkflowStep(
                id="step-5",
                name="Transform Test Data",
                status="PENDING",
                order=5
            ),
            WorkflowStep(
                id="step-6",
                name="Load Test Cases",
                status="PENDING",
                order=6
            ),
            WorkflowStep(
                id="step-7",
                name="Verify Migration",
                status="PENDING",
                order=7
            )
        ]
    
    def start(self) -> Workflow:
        """Start the workflow execution"""
        try:
            self.logger.info(f"Starting migration workflow {self.workflow.id}")
            self.workflow.state = WORKFLOW_STATE_RUNNING
            self.workflow.startedAt = datetime.now()
            
            # Execute each step in order
            for step in self.workflow.steps:
                self._execute_step(step)
                if step.status == 'FAILED':
                    self.workflow.state = WORKFLOW_STATE_FAILED
                    self.workflow.error = step.error
                    break
            
            # If all steps passed
            if self.workflow.state == WORKFLOW_STATE_RUNNING:
                self.workflow.state = WORKFLOW_STATE_COMPLETED
                self.workflow.completedAt = datetime.now()
                self.workflow.result = self._generate_result()
                self.logger.info(f"Migration workflow {self.workflow.id} completed successfully")
            
            return self.workflow
            
        except Exception as e:
            self.logger.error(f"Error in migration workflow: {str(e)}", exc_info=True)
            self.workflow.state = WORKFLOW_STATE_FAILED
            self.workflow.error = str(e)
            return self.workflow
    
    def _execute_step(self, step: WorkflowStep) -> None:
        """Execute a single workflow step"""
        step.status = 'RUNNING'
        step.startTime = datetime.now()
        
        try:
            self.logger.info(f"Executing step {step.id}: {step.name}")
            
            # Execute step based on ID
            if step.id == "step-1":
                step.result = self._validate_input()
            elif step.id == "step-2":
                step.result = self._connect_to_source_system()
            elif step.id == "step-3":
                step.result = self._connect_to_target_system()
            elif step.id == "step-4":
                step.result = self._extract_test_cases()
            elif step.id == "step-5":
                step.result = self._transform_test_data()
            elif step.id == "step-6":
                step.result = self._load_test_cases()
            elif step.id == "step-7":
                step.result = self._verify_migration()
            
            step.status = 'COMPLETED'
            
        except Exception as e:
            self.logger.error(f"Error in step {step.id}: {str(e)}", exc_info=True)
            step.status = 'FAILED'
            step.error = str(e)
        
        step.endTime = datetime.now()
    
    def _validate_input(self) -> Dict[str, Any]:
        """Validate the workflow input data"""
        input_data = self.workflow.input
        
        # Check required fields
        required_fields = ['sourceSystem', 'targetSystem', 'projectKey']
        missing_fields = [field for field in required_fields if field not in input_data]
        
        if missing_fields:
            raise ValueError(f"Missing required fields: {', '.join(missing_fields)}")
        
        # Validate source and target systems
        valid_systems = ['zephyr', 'qtest', 'azure-devops', 'rally', 'hp-alm', 'excel']
        
        if input_data['sourceSystem'] not in valid_systems:
            raise ValueError(f"Invalid source system: {input_data['sourceSystem']}")
        
        if input_data['targetSystem'] not in valid_systems:
            raise ValueError(f"Invalid target system: {input_data['targetSystem']}")
        
        if input_data['sourceSystem'] == input_data['targetSystem']:
            raise ValueError("Source and target systems cannot be the same")
        
        return {"valid": True}
    
    def _connect_to_source_system(self) -> Dict[str, Any]:
        """Connect to the source test management system"""
        source_system = self.workflow.input['sourceSystem']
        self.logger.info(f"Connecting to source system: {source_system}")
        
        # In a real implementation, this would create a connection to the source system
        # For demonstration, we'll just return success
        return {"connected": True, "system": source_system}
    
    def _connect_to_target_system(self) -> Dict[str, Any]:
        """Connect to the target test management system"""
        target_system = self.workflow.input['targetSystem']
        self.logger.info(f"Connecting to target system: {target_system}")
        
        # In a real implementation, this would create a connection to the target system
        # For demonstration, we'll just return success
        return {"connected": True, "system": target_system}
    
    def _extract_test_cases(self) -> Dict[str, Any]:
        """Extract test cases from the source system"""
        source_system = self.workflow.input['sourceSystem']
        project_key = self.workflow.input['projectKey']
        
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
    
    def _transform_test_data(self) -> Dict[str, Any]:
        """Transform test case data between formats"""
        source_system = self.workflow.input['sourceSystem']
        target_system = self.workflow.input['targetSystem']
        
        self.logger.info(f"Transforming test cases from {source_system} format to {target_system} format")
        
        # Get the extracted test cases from the previous step
        previous_step = next(step for step in self.workflow.steps if step.id == "step-4")
        test_cases = previous_step.result["testCases"]
        
        # In a real implementation, this would transform the test cases
        # For demonstration, we'll just add a transformation flag
        transformed_test_cases = []
        for tc in test_cases:
            transformed_tc = tc.copy()
            transformed_tc["transformed"] = True
            transformed_tc["targetFormat"] = target_system
            transformed_test_cases.append(transformed_tc)
        
        return {"testCases": transformed_test_cases, "count": len(transformed_test_cases)}
    
    def _load_test_cases(self) -> Dict[str, Any]:
        """Load test cases into the target system"""
        target_system = self.workflow.input['targetSystem']
        project_key = self.workflow.input['projectKey']
        
        self.logger.info(f"Loading test cases into {target_system} project {project_key}")
        
        # Get the transformed test cases from the previous step
        previous_step = next(step for step in self.workflow.steps if step.id == "step-5")
        test_cases = previous_step.result["testCases"]
        
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
    
    def _verify_migration(self) -> Dict[str, Any]:
        """Verify the migrated test cases"""
        self.logger.info("Verifying migration results")
        
        # Get the loaded test cases from the previous step
        previous_step = next(step for step in self.workflow.steps if step.id == "step-6")
        test_cases = previous_step.result["testCases"]
        
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
    
    def _generate_result(self) -> Dict[str, Any]:
        """Generate the final workflow result"""
        # Get the verification results
        verify_step = next(step for step in self.workflow.steps if step.id == "step-7")
        verification = verify_step.result
        
        # Get the loaded test cases
        load_step = next(step for step in self.workflow.steps if step.id == "step-6")
        migrated_test_cases = load_step.result["testCases"]
        
        return {
            "sourceSystem": self.workflow.input["sourceSystem"],
            "targetSystem": self.workflow.input["targetSystem"],
            "projectKey": self.workflow.input["projectKey"],
            "migratedCount": verification["count"],
            "success": verification["verified"],
            "migratedTestCases": migrated_test_cases
        }
    
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
