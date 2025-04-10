"""
Mappers package for the translation layer.

This package contains the mappers responsible for bidirectional conversion
between system-specific formats and the canonical model.
"""

from .base_mapper import (
    BaseMapper,
    TestCaseMapper,
    TestExecutionMapper,
    TestSuiteMapper,
    TestCycleMapper,
    MapperRegistry
)

# Create a global mapper registry instance
mapper_registry = MapperRegistry()

# Import and register all mappers
from .zephyr_mapper import register_mappers as register_zephyr_mappers
from .qtest_mapper import register_mappers as register_qtest_mappers

# Register all mappers
register_zephyr_mappers()
register_qtest_mappers()

__all__ = [
    'BaseMapper',
    'TestCaseMapper',
    'TestExecutionMapper',
    'TestSuiteMapper',
    'TestCycleMapper',
    'MapperRegistry',
    'mapper_registry',
]