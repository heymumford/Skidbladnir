"""
Unit tests for the LLM Advisor component.
"""

import pytest
import json

@pytest.mark.unit
@pytest.mark.llm
class TestLLMAdvisor:
    """Test suite for the LLM Advisor functionality."""
    
    def test_llm_service_initialization(self, mock_llm_service):
        """Test that the LLM service initializes correctly."""
        # Assert
        assert mock_llm_service is not None
        assert hasattr(mock_llm_service, 'load_model')
        assert hasattr(mock_llm_service, 'query')
        assert mock_llm_service.is_loaded() is False
        
    def test_model_loading(self, mock_llm_service):
        """Test model loading functionality."""
        # Act
        loaded = mock_llm_service.load_model()
        
        # Assert
        assert loaded is True
        assert mock_llm_service.is_loaded() is True
        
        # Cleanup
        mock_llm_service.unload_model()
        assert mock_llm_service.is_loaded() is False
        
    def test_basic_query(self, mock_llm_service):
        """Test basic query functionality."""
        # Arrange
        mock_llm_service.load_model()
        prompt = "What is the capital of France?"
        
        # Act
        response = mock_llm_service.query(prompt)
        
        # Assert
        assert response is not None
        assert isinstance(response, str)
        assert len(response) > 0
        assert "Generic LLM response" in response
        
        # Verify query was recorded
        assert prompt in mock_llm_service.queries
        
    @pytest.mark.parametrize("query_type,expected_content", [
        ("translate this test case", "Translated content"),
        ("error in API connection", "Error analysis"),
        ("general question", "Generic LLM response"),
    ])
    def test_specialized_queries(self, mock_llm_service, query_type, expected_content):
        """Test that different query types produce appropriate responses."""
        # Arrange
        mock_llm_service.load_model()
        
        # Act
        response = mock_llm_service.query(query_type)
        
        # Assert
        assert expected_content in response
        
    @pytest.mark.resource_intensive
    def test_api_schema_analysis(self, mock_llm_service):
        """Test the LLM's ability to analyze API schemas."""
        # Arrange
        mock_llm_service.load_model()
        
        # Example API schema that would be analyzed
        api_schema = {
            "openapi": "3.0.0",
            "info": {"title": "Test API", "version": "1.0.0"},
            "paths": {
                "/test-cases": {
                    "get": {
                        "summary": "List test cases",
                        "parameters": [
                            {"name": "status", "in": "query", "schema": {"type": "string"}},
                            {"name": "page", "in": "query", "schema": {"type": "integer"}}
                        ],
                        "responses": {
                            "200": {
                                "description": "Success",
                                "content": {
                                    "application/json": {
                                        "schema": {"$ref": "#/components/schemas/TestCaseList"}
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        
        prompt = f"Analyze this API schema and suggest the correct query for listing test cases: {json.dumps(api_schema)}"
        
        # Act
        response = mock_llm_service.query(prompt)
        
        # Assert
        assert response is not None
        assert "Generic LLM response" in response
        
        # In a real test with a real LLM, we would expect more specific analysis
        # For this mock, we just verify the query was made
        assert len(prompt) > 20
        assert prompt[:20] in mock_llm_service.queries[0]
        
    @pytest.mark.resource_intensive
    def test_error_recovery_suggestions(self, mock_llm_service):
        """Test LLM's ability to suggest error recovery."""
        # Arrange
        mock_llm_service.load_model()
        
        # Example error that would be analyzed
        error_details = {
            "status": 401,
            "error": "Unauthorized",
            "message": "Invalid authentication token",
            "path": "/api/v1/test-cases",
            "timestamp": "2025-01-01T12:00:00Z"
        }
        
        prompt = f"Analyze this API error and suggest recovery steps: {json.dumps(error_details)}"
        
        # Act
        response = mock_llm_service.query(prompt)
        
        # Assert
        assert response is not None
        assert "Error analysis" in response
        
        # In a real test with a real LLM, we would expect more specific analysis
        # For this mock, we just verify the query was made
        assert len(prompt) > 20
        assert prompt[:20] in mock_llm_service.queries[0]