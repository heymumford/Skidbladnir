"""
Base mapper interface for the translation layer.

This module defines the base mapper interface and abstract classes that
provide the foundation for bidirectional mapping between different
test management system formats and the canonical model.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, Generic, List, Optional, Type, TypeVar, Union

from ..models import (
    CanonicalTestCase,
    CanonicalTestExecution,
    CanonicalTestSuite,
    CanonicalTestCycle,
    TransformationContext
)

T = TypeVar('T')  # Generic type for system-specific data
C = TypeVar('C')  # Generic type for canonical model


class BaseMapper(Generic[T, C], ABC):
    """
    Base mapper interface for bidirectional mapping between a specific system format
    and the canonical model.
    """

    def __init__(self, system_name: str):
        """
        Initialize the mapper.
        
        Args:
            system_name: The name of the system this mapper handles
        """
        self.system_name = system_name
    
    @abstractmethod
    def to_canonical(self, source: T, context: Optional[TransformationContext] = None) -> C:
        """
        Convert from system-specific format to canonical model.
        
        Args:
            source: The source data in system-specific format
            context: Optional transformation context with mapping rules
            
        Returns:
            The canonical representation of the data
        """
        pass
    
    @abstractmethod
    def from_canonical(self, canonical: C, context: Optional[TransformationContext] = None) -> T:
        """
        Convert from canonical model to system-specific format.
        
        Args:
            canonical: The canonical data to convert
            context: Optional transformation context with mapping rules
            
        Returns:
            The system-specific representation of the data
        """
        pass
    
    @abstractmethod
    def validate_mapping(self, source: T, target: C) -> List[str]:
        """
        Validate that the mapping between source and target is correct.
        
        Args:
            source: The source data
            target: The target data
            
        Returns:
            List of validation messages (empty if valid)
        """
        pass


class TestCaseMapper(BaseMapper[Any, CanonicalTestCase], ABC):
    """Base mapper for test case entities."""
    
    @abstractmethod
    def map_custom_fields(self, source: Dict[str, Any], context: Optional[TransformationContext] = None) -> List[Dict[str, Any]]:
        """
        Map custom fields from the source system.
        
        Args:
            source: The source data
            context: Optional transformation context
            
        Returns:
            List of mapped custom fields
        """
        pass
    
    @abstractmethod
    def map_attachments(self, source: Dict[str, Any], context: Optional[TransformationContext] = None) -> List[Dict[str, Any]]:
        """
        Map attachments from the source system.
        
        Args:
            source: The source data
            context: Optional transformation context
            
        Returns:
            List of mapped attachments
        """
        pass


class TestExecutionMapper(BaseMapper[Any, CanonicalTestExecution], ABC):
    """Base mapper for test execution entities."""
    
    @abstractmethod
    def map_step_results(self, source: Dict[str, Any], context: Optional[TransformationContext] = None) -> List[Dict[str, Any]]:
        """
        Map step results from the source system.
        
        Args:
            source: The source data
            context: Optional transformation context
            
        Returns:
            List of mapped step results
        """
        pass


class TestSuiteMapper(BaseMapper[Any, CanonicalTestSuite], ABC):
    """Base mapper for test suite entities."""
    
    @abstractmethod
    def map_test_cases(self, source: Dict[str, Any], context: Optional[TransformationContext] = None) -> List[str]:
        """
        Map test case references from the source system.
        
        Args:
            source: The source data
            context: Optional transformation context
            
        Returns:
            List of mapped test case IDs
        """
        pass


class TestCycleMapper(BaseMapper[Any, CanonicalTestCycle], ABC):
    """Base mapper for test cycle entities."""
    
    @abstractmethod
    def map_test_executions(self, source: Dict[str, Any], context: Optional[TransformationContext] = None) -> List[str]:
        """
        Map test execution references from the source system.
        
        Args:
            source: The source data
            context: Optional transformation context
            
        Returns:
            List of mapped test execution IDs
        """
        pass


class MapperRegistry:
    """Registry for mappers to handle different systems and entity types."""
    
    def __init__(self):
        """Initialize an empty registry."""
        self._mappers: Dict[str, Dict[str, BaseMapper]] = {}
    
    def register(self, system_name: str, entity_type: str, mapper: BaseMapper) -> None:
        """
        Register a mapper for a specific system and entity type.
        
        Args:
            system_name: The system name (e.g., "zephyr", "qtest")
            entity_type: The entity type (e.g., "test-case", "test-execution")
            mapper: The mapper instance
        """
        if system_name not in self._mappers:
            self._mappers[system_name] = {}
        
        self._mappers[system_name][entity_type] = mapper
    
    def get_mapper(self, system_name: str, entity_type: str) -> Optional[BaseMapper]:
        """
        Get a mapper for a specific system and entity type.
        
        Args:
            system_name: The system name
            entity_type: The entity type
            
        Returns:
            The mapper or None if not found
        """
        if system_name not in self._mappers:
            return None
        
        return self._mappers[system_name].get(entity_type)
    
    def get_all_mappers(self) -> Dict[str, Dict[str, BaseMapper]]:
        """
        Get all registered mappers.
        
        Returns:
            Dictionary of all mappers by system and entity type
        """
        return self._mappers