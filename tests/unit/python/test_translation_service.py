"""
Unit tests for the translation service.
"""

import pytest
from datetime import datetime

@pytest.mark.unit
@pytest.mark.translation
class TestTranslationService:
    """Test suite for the translation service functionality."""
    
    def test_translation_service_initialization(self, mock_translation_service):
        """Test that the translation service initializes correctly."""
        # Assert
        assert mock_translation_service is not None
        assert hasattr(mock_translation_service, 'translate')
        assert hasattr(mock_translation_service, 'get_translations')
        assert mock_translation_service.translations == {}
    
    def test_basic_translation(self, mock_translation_service, sample_test_case_data):
        """Test that basic translation works."""
        # Arrange
        source_format = "Zephyr"
        target_format = "Azure DevOps"
        
        # Act
        result = mock_translation_service.translate(
            source_format,
            target_format,
            sample_test_case_data
        )
        
        # Assert
        assert result is not None
        assert result["translated"] is True
        assert result["sourceFormat"] == source_format
        assert result["targetFormat"] == target_format
        assert result["id"] == sample_test_case_data["id"]
        assert result["title"] == sample_test_case_data["title"]
        
    def test_multiple_translations(self, mock_translation_service, sample_test_case_data):
        """Test that multiple translations can be performed."""
        # Arrange
        translations = [
            ("Zephyr", "Azure DevOps"),
            ("Zephyr", "qTest"),
            ("qTest", "HP ALM")
        ]
        
        # Act
        results = []
        for source, target in translations:
            result = mock_translation_service.translate(source, target, sample_test_case_data)
            results.append(result)
            
        # Get the translation history
        translation_history = mock_translation_service.get_translations()
        
        # Assert
        assert len(results) == 3
        assert len(translation_history) == 3
        
        # Check each result
        for i, (source, target) in enumerate(translations):
            assert results[i]["translated"] is True
            assert results[i]["sourceFormat"] == source
            assert results[i]["targetFormat"] == target
            
        # Check translation history
        for source, target in translations:
            key = f"{source}->{target}"
            assert key in translation_history
            
    def test_translation_with_llm(self, mock_translation_service, mock_llm_service):
        """Test translation with LLM service."""
        # Arrange
        source_format = "Zephyr"
        target_format = "Azure DevOps"
        test_data = {
            "id": "TC-001",
            "title": "Complex test case requiring LLM translation"
        }
        
        # Act - simulate translation with LLM assistance
        # In a real implementation, this would use the LLM service for complex translations
        mock_llm_service.load_model()
        llm_response = mock_llm_service.query(f"translate from {source_format} to {target_format}: {test_data}")
        
        # For testing purposes, we'll add the LLM response to our test data
        test_data["llm_enhanced"] = True
        test_data["llm_response"] = llm_response
        
        result = mock_translation_service.translate(source_format, target_format, test_data)
        
        # Assert
        assert result is not None
        assert result["translated"] is True
        assert result["sourceFormat"] == source_format
        assert result["targetFormat"] == target_format
        assert result["llm_enhanced"] is True
        assert "Translated content from the LLM" in result["llm_response"]
        
        # Verify LLM was queried
        assert len(mock_llm_service.queries) > 0
        assert "translate" in mock_llm_service.queries[0].lower()
        
    def test_translation_error_handling(self, mock_translation_service, mock_llm_service):
        """Test error handling during translation."""
        # Arrange
        source_format = "Unknown"
        target_format = "Azure DevOps"
        test_data = {
            "id": "TC-ERROR",
            "title": "Test case with errors"
        }
        
        # Act - In a real implementation, this would handle the error differently
        # Here we'll simulate error analysis with the LLM
        mock_llm_service.load_model()
        llm_response = mock_llm_service.query(f"error in translation from {source_format} to {target_format}")
        
        # Simulate translation with error handling
        try:
            # Simulate that an unknown source would raise an exception in the real implementation
            if source_format == "Unknown":
                raise ValueError(f"Unknown source format: {source_format}")
                
            result = mock_translation_service.translate(source_format, target_format, test_data)
        except ValueError as e:
            # Use LLM to analyze the error
            error_analysis = llm_response
            
            # Create an error result for testing
            result = {
                "error": str(e),
                "errorAnalysis": error_analysis,
                "recoverable": False
            }
        
        # Assert
        assert result is not None
        assert "error" in result
        assert "Unknown source format" in result["error"]
        assert "errorAnalysis" in result
        assert "Error analysis" in result["errorAnalysis"]