"""
Unit test configuration for Python components.
"""

import os
import sys
import pytest
from typing import Dict, Any, Generator

# Add specific fixtures for unit tests
@pytest.fixture(scope="function")
def mock_orchestrator_service():
    """Provide a mock orchestrator service for unit tests."""
    class MockOrchestratorService:
        def __init__(self):
            self.workflows = {}
            self.workflow_counter = 0
        
        def create_workflow(self, workflow_type, input_data):
            self.workflow_counter += 1
            workflow_id = f"wf-{self.workflow_counter}"
            self.workflows[workflow_id] = {
                "id": workflow_id,
                "type": workflow_type,
                "input": input_data,
                "state": "CREATED",
                "createdAt": "2025-01-01T00:00:00Z"
            }
            return workflow_id
        
        def start_workflow(self, workflow_id):
            if workflow_id not in self.workflows:
                raise ValueError(f"Workflow {workflow_id} not found")
            
            self.workflows[workflow_id]["state"] = "RUNNING"
            self.workflows[workflow_id]["startedAt"] = "2025-01-01T00:01:00Z"
            return self.workflows[workflow_id]
        
        def get_workflow(self, workflow_id):
            if workflow_id not in self.workflows:
                raise ValueError(f"Workflow {workflow_id} not found")
            
            return self.workflows[workflow_id]
    
    return MockOrchestratorService()

@pytest.fixture(scope="function")
def mock_translation_service():
    """Provide a mock translation service for unit tests."""
    class MockTranslationService:
        def __init__(self):
            self.translations = {}
        
        def translate(self, source_format, target_format, data):
            key = f"{source_format}->{target_format}"
            self.translations[key] = data
            
            # Use canonical model in the translation process
            canonical_data = self.get_canonical_form(source_format, data)
            target_data = self.from_canonical_form(target_format, canonical_data)
            
            # Just return the data with a translation marker for testing
            return {
                **target_data,
                "translated": True,
                "sourceFormat": source_format,
                "targetFormat": target_format
            }
        
        def get_translations(self):
            return self.translations
            
        def get_canonical_form(self, source_format, data):
            # Mock method to convert source data to canonical form
            return data
            
        def from_canonical_form(self, target_format, canonical_data):
            # Mock method to convert canonical form to target format
            return canonical_data
    
    return MockTranslationService()

@pytest.fixture(scope="function")
def mock_llm_service():
    """Provide a mock LLM service for unit tests."""
    class MockLLMService:
        def __init__(self):
            self.queries = []
            self.loaded = False
        
        def load_model(self):
            self.loaded = True
            return True
        
        def is_loaded(self):
            return self.loaded
        
        def unload_model(self):
            self.loaded = False
            return True
        
        def query(self, prompt, max_tokens=100):
            self.queries.append(prompt)
            # Simple responses based on prompt content
            if "translate" in prompt.lower():
                return "Translated content from the LLM"
            elif "error" in prompt.lower():
                return "Error analysis: This appears to be an authentication issue"
            else:
                return "Generic LLM response for: " + prompt[:20] + "..."
    
    return MockLLMService()