"""
Transformers package for the translation layer.

This package contains the transformation components that convert data
between different test management systems using the canonical model
as an intermediary representation.
"""

from .transformer import (
    TransformationError,
    Transformer,
    TransformationService
)

# Create a global transformation service instance
transformation_service = TransformationService()

__all__ = [
    'TransformationError',
    'Transformer',
    'TransformationService',
    'transformation_service',
]