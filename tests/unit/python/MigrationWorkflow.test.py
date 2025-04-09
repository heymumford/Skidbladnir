"""
Copyright (C) 2025 Eric C. Mumford (@heymumford)

This file is part of Skidbladnir.

Skidbladnir is free software: you can redistribute it and/or modify
it under the terms of the MIT License as published in the LICENSE file.
"""

import unittest
import uuid
from datetime import datetime

from tests.mocks.python.orchestrator.workflows.MigrationWorkflowMock import (
    MigrationWorkflowMock,
    WORKFLOW_STATE_CREATED,
    WORKFLOW_STATE_RUNNING,
    WORKFLOW_STATE_COMPLETED
)

class TestMigrationWorkflow(unittest.TestCase):
    """Test case for the MigrationWorkflow class"""

    def setUp(self):
        """Set up test fixtures"""
        self.workflow_id = str(uuid.uuid4())
        self.input_data = {
            "sourceSystem": "Zephyr",
            "targetSystem": "Azure DevOps",
            "projectKey": "TEST-PROJECT",
            "options": {
                "includeTags": True,
                "includeAttachments": True
            }
        }
        self.workflow = MigrationWorkflowMock(self.workflow_id, self.input_data)

    def test_init(self):
        """Test workflow initialization"""
        self.assertEqual(self.workflow.workflow.id, self.workflow_id)
        self.assertEqual(self.workflow.workflow.state, WORKFLOW_STATE_CREATED)
        self.assertEqual(self.workflow.workflow.input, self.input_data)
        self.assertEqual(len(self.workflow.workflow.steps), 7)  # 7 steps created
        self.assertIsInstance(self.workflow.workflow.createdAt, datetime)

    def test_start(self):
        """Test workflow execution"""
        # Start the workflow
        result = self.workflow.start()
        
        # Verify workflow state changes
        self.assertEqual(result.state, WORKFLOW_STATE_COMPLETED)
        self.assertIsNotNone(result.startedAt)
        self.assertIsNotNone(result.completedAt)
        
        # Check steps
        for step in result.steps:
            self.assertEqual(step.status, "COMPLETED")
            self.assertIsNotNone(step.startTime)
            self.assertIsNotNone(step.endTime)
        
        # Check result
        self.assertIsNotNone(result.result)
        self.assertEqual(result.result["sourceSystem"], self.input_data["sourceSystem"])
        self.assertEqual(result.result["targetSystem"], self.input_data["targetSystem"])
        self.assertEqual(result.result["migratedCount"], 2)
        self.assertTrue(result.result["success"])

    def test_get_status(self):
        """Test getting workflow status"""
        # Start the workflow first
        self.workflow.start()
        
        # Get status
        status = self.workflow.get_status()
        
        # Verify status structure
        self.assertEqual(status["id"], self.workflow_id)
        self.assertEqual(status["state"], WORKFLOW_STATE_COMPLETED)
        self.assertIsNotNone(status["createdAt"])
        self.assertIsNotNone(status["startedAt"])
        self.assertIsNotNone(status["completedAt"])
        
        # Check steps in status
        self.assertEqual(len(status["steps"]), 7)
        for step in status["steps"]:
            self.assertIn("id", step)
            self.assertIn("name", step)
            self.assertIn("status", step)
            self.assertEqual(step["status"], "COMPLETED")

    def test_workflow_steps(self):
        """Test workflow step sequence"""
        # Start the workflow
        result = self.workflow.start()
        
        # Extract step names in order
        step_names = [step.name for step in result.steps]
        
        # Verify expected sequence
        expected_steps = [
            "Validate Input",
            "Connect to Source System",
            "Connect to Target System", 
            "Extract Test Cases",
            "Transform Test Data",
            "Load Test Cases",
            "Verify Migration"
        ]
        
        self.assertEqual(step_names, expected_steps)

if __name__ == '__main__':
    unittest.main()