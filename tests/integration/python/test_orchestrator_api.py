"""
Integration tests for the Orchestrator API.
"""

import pytest
import uuid
import asyncio
import httpx
from datetime import datetime, timedelta

@pytest.mark.integration
@pytest.mark.orchestrator
@pytest.mark.asyncio
class TestOrchestratorAPI:
    """Test suite for the Orchestrator API."""
    
    async def test_health_endpoint(self, orchestrator_client):
        """Test that the health endpoint returns 200 OK."""
        # Act
        response = await orchestrator_client.get("/health")
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "timestamp" in data
        assert data["service"] == "orchestrator"
        
    async def test_root_endpoint(self, orchestrator_client):
        """Test that the root endpoint returns basic service info."""
        # Act
        response = await orchestrator_client.get("/")
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "Skidbladnir Orchestrator"
        assert "version" in data
        assert data["status"] == "operational"
        
    @pytest.mark.skip(reason="API implementation not yet complete")
    async def test_create_workflow(self, orchestrator_client, sample_workflow_data, cleanup_workflows):
        """Test creating a workflow via the API."""
        # Arrange
        # Add a unique identifier to prevent test collisions
        workflow_data = {**sample_workflow_data, "testId": str(uuid.uuid4())}
        
        # Act
        response = await orchestrator_client.post("/workflows", json=workflow_data)
        
        # Assert
        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        assert data["state"] == "CREATED"
        
        # Add to cleanup list
        cleanup_workflows.append(data["id"])
        
        # Verify workflow was created
        workflow_id = data["id"]
        get_response = await orchestrator_client.get(f"/workflows/{workflow_id}")
        assert get_response.status_code == 200
        assert get_response.json()["id"] == workflow_id
        
    @pytest.mark.skip(reason="API implementation not yet complete")
    async def test_start_workflow(self, orchestrator_client, sample_workflow_data, cleanup_workflows):
        """Test starting a workflow via the API."""
        # Arrange - Create a workflow first
        workflow_data = {**sample_workflow_data, "testId": str(uuid.uuid4())}
        create_response = await orchestrator_client.post("/workflows", json=workflow_data)
        assert create_response.status_code == 201
        workflow_id = create_response.json()["id"]
        cleanup_workflows.append(workflow_id)
        
        # Act - Start the workflow
        start_response = await orchestrator_client.post(f"/workflows/{workflow_id}/start")
        
        # Assert
        assert start_response.status_code == 200
        data = start_response.json()
        assert data["id"] == workflow_id
        assert data["state"] in ["RUNNING", "COMPLETED"]  # Might complete quickly
        
        # Poll for completion (with timeout)
        max_wait = timedelta(seconds=30)
        start_time = datetime.now()
        completed = False
        
        while not completed and (datetime.now() - start_time < max_wait):
            status_response = await orchestrator_client.get(f"/workflows/{workflow_id}")
            status_data = status_response.json()
            
            if status_data["state"] == "COMPLETED":
                completed = True
                break
                
            # Wait a bit before polling again
            await asyncio.sleep(1)
            
        # Verify workflow completed
        assert completed, "Workflow did not complete within the expected time"
        
        # Get final status
        final_response = await orchestrator_client.get(f"/workflows/{workflow_id}")
        final_data = final_response.json()
        
        assert final_data["state"] == "COMPLETED"
        assert "result" in final_data
        assert final_data["result"]["success"] is True