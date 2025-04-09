"""
Common pytest fixtures and configuration for Skidbladnir tests.

This file contains fixtures that are available to all tests,
both unit and integration.
"""

import os
import sys
import pytest
from typing import Dict, Any, Generator

# Add project root to path so imports work consistently
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Environment configuration
@pytest.fixture(scope="session")
def env_config() -> Dict[str, Any]:
    """Provide environment configuration for tests."""
    return {
        "USE_MOCKS": os.environ.get("USE_MOCKS", "true").lower() == "true",
        "TEST_ENV": os.environ.get("TEST_ENV", "test"),
        "RESOURCE_CONSTRAINED": os.environ.get("RESOURCE_CONSTRAINED", "false").lower() == "true",
    }

# Database fixtures
@pytest.fixture(scope="function")
def test_db() -> Generator[Dict[str, Any], None, None]:
    """Provide a test database that is reset after each test."""
    # For tests, we use an in-memory database
    db = {
        "connection": "in-memory",
        "test_cases": [],
        "test_suites": [],
        "workflows": [],
    }
    yield db
    # Reset after test
    db["test_cases"] = []
    db["test_suites"] = []
    db["workflows"] = []

# Mock fixtures
@pytest.fixture(scope="function")
def mock_migration_workflow(env_config):
    """Provide a mock migration workflow for tests."""
    from tests.mocks.python.orchestrator.workflows.MigrationWorkflowMock import MigrationWorkflowMock
    
    def _create_workflow(workflow_id, input_data):
        return MigrationWorkflowMock(workflow_id, input_data)
    
    return _create_workflow

# Test data fixtures
@pytest.fixture(scope="session")
def sample_test_case_data():
    """Provide sample test case data for tests."""
    return {
        "id": "TC-001",
        "title": "Login Test",
        "description": "Test user login functionality",
        "status": "READY",
        "priority": "HIGH",
        "steps": [
            {"order": 1, "description": "Navigate to login page", "expectedResult": "Login page is displayed"},
            {"order": 2, "description": "Enter credentials", "expectedResult": "User is logged in"}
        ],
        "tags": ["login", "authentication"],
    }

@pytest.fixture(scope="session")
def sample_workflow_data():
    """Provide sample workflow data for tests."""
    return {
        "id": "WF-001",
        "sourceSystem": "Zephyr",
        "targetSystem": "Azure DevOps",
        "projectKey": "TEST",
        "options": {
            "includeTags": True,
            "includeAttachments": True
        }
    }

# Skip markers based on environment
def pytest_configure(config):
    """Configure pytest with custom markers."""
    config.addinivalue_line("markers", 
                           "resource_intensive: mark test as resource intensive")
    config.addinivalue_line("markers", 
                           "llm: mark test as requiring LLM models")

def pytest_collection_modifyitems(config, items):
    """Skip tests based on markers and environment conditions."""
    # Check if we're in a resource-constrained environment
    resource_constrained = os.environ.get("RESOURCE_CONSTRAINED", "false").lower() == "true"
    
    skip_resource_intensive = pytest.mark.skip(reason="Resource intensive test skipped in constrained environment")
    skip_llm = pytest.mark.skip(reason="LLM test skipped in constrained environment")
    
    for item in items:
        # Skip resource intensive tests in constrained environments
        if resource_constrained and ("resource_intensive" in item.keywords or "llm" in item.keywords):
            item.add_marker(skip_resource_intensive)
        
        # Skip LLM tests if specifically requested
        if os.environ.get("SKIP_LLM_TESTS", "false").lower() == "true" and "llm" in item.keywords:
            item.add_marker(skip_llm)