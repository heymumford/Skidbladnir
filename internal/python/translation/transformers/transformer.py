"""
Transformer implementation for the translation layer.

This module provides the core transformation logic for converting test assets
between different test management systems using the canonical model as an
intermediary representation.
"""

import logging
from typing import Any, Dict, List, Optional, Tuple, Type, TypeVar, Union
from uuid import UUID, uuid4

from ..models import (
    CanonicalTestCase,
    CanonicalTestExecution,
    CanonicalTestSuite,
    CanonicalTestCycle,
    CanonicalTranslation,
    TransformationContext,
    MigrationJob
)
from ..mappers import mapper_registry, BaseMapper

logger = logging.getLogger(__name__)

T = TypeVar('T')  # Generic type for canonical model


class TransformationError(Exception):
    """Exception raised when transformation fails."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        """
        Initialize a transformation error.
        
        Args:
            message: Error message
            details: Optional error details
        """
        super().__init__(message)
        self.details = details or {}


class Transformer:
    """
    Transforms test assets between different systems using the canonical model.
    """
    
    def __init__(self):
        """Initialize the transformer."""
        self.translations: Dict[str, CanonicalTranslation] = {}
    
    def transform(
        self,
        source_system: str,
        target_system: str,
        entity_type: str,
        source_data: Dict[str, Any],
        context: Optional[TransformationContext] = None
    ) -> Dict[str, Any]:
        """
        Transform data from source system to target system.
        
        Args:
            source_system: The source system name
            target_system: The target system name
            entity_type: The entity type (e.g., "test-case")
            source_data: The source data to transform
            context: Optional transformation context
            
        Returns:
            The transformed data in target system format
            
        Raises:
            TransformationError: If transformation fails
        """
        # Create transformation context if not provided
        if context is None:
            context = TransformationContext(
                source_system=source_system,
                target_system=target_system,
                migration_id=None
            )
        
        try:
            # Get mappers for source and target systems
            source_mapper = self._get_mapper(source_system, entity_type)
            target_mapper = self._get_mapper(target_system, entity_type)
            
            if source_mapper is None:
                raise TransformationError(f"No mapper found for {source_system}/{entity_type}")
            
            if target_mapper is None:
                raise TransformationError(f"No mapper found for {target_system}/{entity_type}")
            
            # Transform from source to canonical
            canonical_data = source_mapper.to_canonical(source_data, context)
            
            # Transform from canonical to target
            target_data = target_mapper.from_canonical(canonical_data, context)
            
            # Validate the transformation
            validation_messages = self._validate_transformation(
                source_mapper, target_mapper, source_data, canonical_data, target_data
            )
            
            if validation_messages:
                logger.warning(
                    f"Validation issues during transformation: {validation_messages}"
                )
            
            # Record the translation
            translation_id = f"{source_system}:{target_system}:{entity_type}:{source_data.get('id', 'unknown')}"
            
            self.translations[translation_id] = CanonicalTranslation(
                source_system=source_system,
                target_system=target_system,
                entity_type=entity_type,
                source_id=source_data.get('id', 'unknown'),
                target_id=target_data.get('id', 'unknown'),
                status='success' if not validation_messages else 'partial',
                source_data=source_data,
                target_data=target_data,
                messages=validation_messages,
                migration_id=context.migration_id
            )
            
            return target_data
            
        except Exception as e:
            logger.exception(f"Transformation error: {str(e)}")
            
            # Record failed translation
            translation_id = f"{source_system}:{target_system}:{entity_type}:{source_data.get('id', 'unknown')}"
            
            self.translations[translation_id] = CanonicalTranslation(
                source_system=source_system,
                target_system=target_system,
                entity_type=entity_type,
                source_id=source_data.get('id', 'unknown'),
                target_id='failed',
                status='error',
                source_data=source_data,
                messages=[str(e)],
                migration_id=context.migration_id
            )
            
            raise TransformationError(
                f"Failed to transform {entity_type} from {source_system} to {target_system}",
                details={"error": str(e), "source_id": source_data.get('id', 'unknown')}
            )
    
    def get_canonical_form(
        self,
        system_name: str,
        entity_type: str,
        data: Dict[str, Any],
        context: Optional[TransformationContext] = None
    ) -> Union[CanonicalTestCase, CanonicalTestExecution, CanonicalTestSuite, CanonicalTestCycle]:
        """
        Get the canonical form of data from a specific system.
        
        Args:
            system_name: The system name
            entity_type: The entity type
            data: The data to convert
            context: Optional transformation context
            
        Returns:
            The canonical form of the data
            
        Raises:
            TransformationError: If conversion fails
        """
        mapper = self._get_mapper(system_name, entity_type)
        
        if mapper is None:
            raise TransformationError(f"No mapper found for {system_name}/{entity_type}")
        
        if context is None:
            context = TransformationContext(
                source_system=system_name,
                target_system="canonical",
                migration_id=None
            )
        
        try:
            return mapper.to_canonical(data, context)
        except Exception as e:
            logger.exception(f"Error converting to canonical form: {str(e)}")
            raise TransformationError(
                f"Failed to convert {entity_type} from {system_name} to canonical form",
                details={"error": str(e), "source_id": data.get('id', 'unknown')}
            )
    
    def from_canonical_form(
        self,
        system_name: str,
        entity_type: str,
        canonical_data: Union[CanonicalTestCase, CanonicalTestExecution, CanonicalTestSuite, CanonicalTestCycle],
        context: Optional[TransformationContext] = None
    ) -> Dict[str, Any]:
        """
        Convert canonical data to a specific system format.
        
        Args:
            system_name: The target system name
            entity_type: The entity type
            canonical_data: The canonical data to convert
            context: Optional transformation context
            
        Returns:
            The system-specific representation of the data
            
        Raises:
            TransformationError: If conversion fails
        """
        mapper = self._get_mapper(system_name, entity_type)
        
        if mapper is None:
            raise TransformationError(f"No mapper found for {system_name}/{entity_type}")
        
        if context is None:
            context = TransformationContext(
                source_system="canonical",
                target_system=system_name,
                migration_id=None
            )
        
        try:
            return mapper.from_canonical(canonical_data, context)
        except Exception as e:
            logger.exception(f"Error converting from canonical form: {str(e)}")
            raise TransformationError(
                f"Failed to convert {entity_type} from canonical form to {system_name}",
                details={"error": str(e), "canonical_id": getattr(canonical_data, 'id', 'unknown')}
            )
    
    def get_translations(self) -> Dict[str, CanonicalTranslation]:
        """
        Get all recorded translations.
        
        Returns:
            Dictionary of translations by ID
        """
        return self.translations
    
    def clear_translations(self) -> None:
        """Clear all recorded translations."""
        self.translations.clear()
    
    def _get_mapper(self, system_name: str, entity_type: str) -> Optional[BaseMapper]:
        """
        Get a mapper for a specific system and entity type.
        
        Args:
            system_name: The system name
            entity_type: The entity type
            
        Returns:
            The mapper or None if not found
        """
        return mapper_registry.get_mapper(system_name, entity_type)
    
    def _validate_transformation(
        self,
        source_mapper: BaseMapper,
        target_mapper: BaseMapper,
        source_data: Dict[str, Any],
        canonical_data: Any,
        target_data: Dict[str, Any]
    ) -> List[str]:
        """
        Validate a transformation chain.
        
        Args:
            source_mapper: The source mapper
            target_mapper: The target mapper
            source_data: The original source data
            canonical_data: The intermediate canonical data
            target_data: The transformed target data
            
        Returns:
            List of validation messages (empty if valid)
        """
        # Validate source to canonical
        source_validation = source_mapper.validate_mapping(source_data, canonical_data)
        
        # Validate canonical to target
        target_validation = target_mapper.validate_mapping(canonical_data, target_data)
        
        # Return combined validation messages
        return source_validation + target_validation


class TransformationService:
    """
    Service for coordinating transformations between systems.
    """
    
    def __init__(self):
        """Initialize the transformation service."""
        self.transformer = Transformer()
        self.migration_jobs: Dict[UUID, MigrationJob] = {}
    
    def transform(
        self,
        source_system: str,
        target_system: str,
        data: Dict[str, Any],
        entity_type: str = "test-case",
        migration_id: Optional[UUID] = None,
        field_mappings: Optional[Dict[str, str]] = None,
        value_mappings: Optional[Dict[str, Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Transform data from one system to another.
        
        Args:
            source_system: The source system name
            target_system: The target system name
            data: The data to transform
            entity_type: The entity type (default: "test-case")
            migration_id: Optional migration ID
            field_mappings: Optional field mappings
            value_mappings: Optional value mappings
            
        Returns:
            The transformed data
        """
        context = TransformationContext(
            source_system=source_system,
            target_system=target_system,
            migration_id=migration_id,
            field_mappings=field_mappings or {},
            value_mappings=value_mappings or {}
        )
        
        return self.transformer.transform(
            source_system=source_system,
            target_system=target_system,
            entity_type=entity_type,
            source_data=data,
            context=context
        )
    
    def create_migration_job(
        self,
        name: str,
        source_system: str,
        source_config: Dict[str, Any],
        target_system: str,
        target_config: Dict[str, Any],
        entity_types: List[str],
        description: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None,
        field_mappings: Optional[Dict[str, Dict[str, str]]] = None,
        value_mappings: Optional[Dict[str, Dict[str, Dict[str, Any]]]] = None,
        user_id: Optional[str] = None
    ) -> UUID:
        """
        Create a new migration job.
        
        Args:
            name: Job name
            source_system: Source system name
            source_config: Source system configuration
            target_system: Target system name
            target_config: Target system configuration
            entity_types: Entity types to migrate
            description: Optional job description
            filters: Optional filters to apply
            field_mappings: Optional field mappings
            value_mappings: Optional value mappings
            user_id: Optional user ID
            
        Returns:
            The migration job ID
        """
        job_id = uuid4()
        
        self.migration_jobs[job_id] = MigrationJob(
            id=job_id,
            name=name,
            description=description,
            source_system=source_system,
            source_config=source_config,
            target_system=target_system,
            target_config=target_config,
            entity_types=entity_types,
            filters=filters or {},
            field_mappings=field_mappings or {},
            value_mappings=value_mappings or {},
            created_by=user_id
        )
        
        return job_id
    
    def get_migration_job(self, job_id: UUID) -> Optional[MigrationJob]:
        """
        Get a migration job by ID.
        
        Args:
            job_id: The migration job ID
            
        Returns:
            The migration job or None if not found
        """
        return self.migration_jobs.get(job_id)
    
    def get_translations(self) -> Dict[str, CanonicalTranslation]:
        """
        Get all recorded translations.
        
        Returns:
            Dictionary of translations by ID
        """
        return self.transformer.get_translations()
    
    def clear_translations(self) -> None:
        """Clear all recorded translations."""
        self.transformer.clear_translations()