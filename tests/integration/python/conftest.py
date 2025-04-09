"""
Integration test configuration for Python components.
"""

import os
import sys
import pytest
import asyncio
import httpx
from typing import Dict, Any, Generator

# Add fixtures specific to integration tests

@pytest.fixture(scope="session")
async def orchestrator_client():
    """HTTP client for the orchestrator service."""
    orchestrator_url = os.environ.get("ORCHESTRATOR_URL", "http://localhost:8000")
    
    async with httpx.AsyncClient(base_url=orchestrator_url, timeout=30.0) as client:
        # Check if service is available
        try:
            response = await client.get("/health")
            if response.status_code != 200:
                pytest.skip(f"Orchestrator service not available at {orchestrator_url}")
        except httpx.RequestError:
            pytest.skip(f"Orchestrator service not available at {orchestrator_url}")
        
        yield client

@pytest.fixture(scope="function")
async def cleanup_workflows(orchestrator_client):
    """Cleanup workflows after each test."""
    # Track workflows created during the test
    created_workflows = []
    
    yield created_workflows
    
    # Cleanup after the test
    for workflow_id in created_workflows:
        try:
            await orchestrator_client.delete(f"/workflows/{workflow_id}")
        except httpx.RequestError:
            pass  # Best effort cleanup

@pytest.fixture(scope="function")
def integration_db():
    """
    Test database for integration tests.
    This could be a real database connection in a test environment.
    """
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    
    # Use an in-memory SQLite database for tests
    engine = create_engine("sqlite:///:memory:")
    
    # Create tables (this would normally import your models)
    # Base.metadata.create_all(engine)
    
    # Create session factory
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # Create and yield a session
    db = SessionLocal()
    yield db
    
    # Cleanup
    db.close()

@pytest.fixture(scope="session")
def api_client():
    """HTTP client for API tests."""
    api_url = os.environ.get("API_URL", "http://localhost:8080")
    
    with httpx.Client(base_url=api_url, timeout=10.0) as client:
        # Check if service is available
        try:
            response = client.get("/health")
            if response.status_code != 200:
                pytest.skip(f"API service not available at {api_url}")
        except httpx.RequestError:
            pytest.skip(f"API service not available at {api_url}")
        
        yield client

@pytest.fixture(scope="session")
def binary_processor_client():
    """HTTP client for binary processor tests."""
    binary_url = os.environ.get("BINARY_PROCESSOR_URL", "http://localhost:8090")
    
    with httpx.Client(base_url=binary_url, timeout=10.0) as client:
        # Check if service is available
        try:
            response = client.get("/health")
            if response.status_code != 200:
                pytest.skip(f"Binary processor service not available at {binary_url}")
        except httpx.RequestError:
            pytest.skip(f"Binary processor service not available at {binary_url}")
        
        yield client