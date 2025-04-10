"""
Translation Layer for Skidbladnir

This package implements the Universal Translation Layer that serves as
an intermediary between different test management systems. It provides
a canonical data model, bidirectional mapping, and transformation services
to preserve data integrity during the migration process.

Key components:
- models: Canonical data models and shared type definitions
- mappers: System-specific adapters for bidirectional mapping
- transformers: Core transformation logic and services
- validators: Data integrity validation during transformation
"""

from .models import (
    # Re-export core models
    CanonicalTestCase,
    CanonicalTestExecution,
    CanonicalTestSuite,
    CanonicalTestCycle,
    CanonicalTranslation,
    TransformationContext,
    MigrationJob,
    
    # Re-export enums
    TestCaseStatus,
    ExecutionStatus,
    Priority
)

from .transformers import transformation_service

__all__ = [
    # Core models
    'CanonicalTestCase',
    'CanonicalTestExecution',
    'CanonicalTestSuite',
    'CanonicalTestCycle',
    'CanonicalTranslation',
    'TransformationContext',
    'MigrationJob',
    
    # Enums
    'TestCaseStatus',
    'ExecutionStatus',
    'Priority',
    
    # Services
    'transformation_service',
]

__version__ = '0.1.0'