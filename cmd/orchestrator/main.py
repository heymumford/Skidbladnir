from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
import uuid
import logging
import os
from datetime import datetime

from internal.python.orchestrator.workflows.MigrationWorkflow import MigrationWorkflow

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="Skidbladnir Orchestrator", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory workflow storage (replace with database in production)
workflows = {}

# Request and response models
class MigrationRequest(BaseModel):
    sourceSystem: str
    targetSystem: str
    projectKey: str
    options: Optional[Dict[str, Any]] = {}

class WorkflowResponse(BaseModel):
    id: str
    type: str
    state: str
    createdAt: str
    startedAt: Optional[str] = None
    completedAt: Optional[str] = None
    steps: List[Dict[str, Any]]
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

@app.post("/api/workflows/migration", response_model=WorkflowResponse)
def create_migration_workflow(request: MigrationRequest):
    """Create and start a new migration workflow"""
    try:
        # Generate a workflow ID
        workflow_id = str(uuid.uuid4())
        
        # Create input data
        input_data = {
            "sourceSystem": request.sourceSystem,
            "targetSystem": request.targetSystem,
            "projectKey": request.projectKey,
            "options": request.options
        }
        
        # Create and start workflow
        workflow = MigrationWorkflow(workflow_id, input_data)
        result = workflow.start()
        
        # Store workflow
        workflows[workflow_id] = workflow
        
        # Return workflow status
        return workflow.get_status()
        
    except Exception as e:
        logger.error(f"Error creating migration workflow: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/workflows/{workflow_id}", response_model=WorkflowResponse)
def get_workflow(workflow_id: str):
    """Get workflow status by ID"""
    workflow = workflows.get(workflow_id)
    
    if not workflow:
        raise HTTPException(status_code=404, detail=f"Workflow {workflow_id} not found")
    
    return workflow.get_status()

@app.get("/api/workflows")
def list_workflows():
    """List all workflows"""
    return {
        "workflows": [
            {
                "id": workflow_id,
                "type": workflow.workflow.type,
                "state": workflow.workflow.state,
                "createdAt": workflow.workflow.createdAt.isoformat()
            }
            for workflow_id, workflow in workflows.items()
        ]
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    
    # For development only - use a proper ASGI server in production
    uvicorn.run(app, host="0.0.0.0", port=port)