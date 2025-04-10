"""
Models package for the translation layer.

This package contains the core data models used in the translation process,
including the canonical models that serve as a system-agnostic representation
of test assets.
"""

from .canonical_models import (
    # Enums
    TestCaseStatus,
    ExecutionStatus,
    Priority,
    
    # Core models
    CanonicalTestCase,
    CanonicalTestStep,
    CanonicalTestExecution,
    CanonicalStepResult,
    CanonicalTestSuite,
    CanonicalTestCycle,
    
    # Supporting models
    CanonicalAttachment,
    CanonicalCustomField,
    CanonicalAutomation,
    CanonicalTag,
    CanonicalLink,
    CanonicalUser,
    CanonicalRequirement,
    CanonicalDefect,
    
    # Translation tracking
    CanonicalTranslation,
    TransformationContext,
    MigrationJob,
)

__all__ = [
    # Enums
    'TestCaseStatus',
    'ExecutionStatus',
    'Priority',
    
    # Core models
    'CanonicalTestCase',
    'CanonicalTestStep',
    'CanonicalTestExecution',
    'CanonicalStepResult',
    'CanonicalTestSuite',
    'CanonicalTestCycle',
    
    # Supporting models
    'CanonicalAttachment',
    'CanonicalCustomField',
    'CanonicalAutomation',
    'CanonicalTag',
    'CanonicalLink',
    'CanonicalUser',
    'CanonicalRequirement',
    'CanonicalDefect',
    
    # Translation tracking
    'CanonicalTranslation',
    'TransformationContext',
    'MigrationJob',
]