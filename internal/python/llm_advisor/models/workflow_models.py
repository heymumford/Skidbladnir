"""
Workflow optimization models for the LLM Advisor.
"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass


@dataclass
class ApiOperation:
    """An API operation that can be executed."""
    id: str
    name: str
    endpoint: str
    method: str
    description: str
    dependencies: List[str] = None
    parameters: Dict[str, Any] = None
    requires_auth: bool = True
    
    def __post_init__(self):
        if self.dependencies is None:
            self.dependencies = []
        if self.parameters is None:
            self.parameters = {}


@dataclass
class OperationSequence:
    """A sequence of API operations forming a workflow."""
    operations: List[ApiOperation]
    name: str
    description: str
    goal: str
    estimated_execution_time: float = 0.0
    
    def add_operation(self, operation: ApiOperation) -> None:
        """Add an operation to the sequence."""
        self.operations.append(operation)


@dataclass
class OptimizationSuggestion:
    """A suggestion for optimizing a workflow."""
    type: str  # parallel_execution, caching, batching, etc.
    description: str
    operations: List[str]  # Operation IDs
    estimated_speedup: str


@dataclass
class ReorderingSuggestion:
    """A suggestion for reordering operations in a workflow."""
    operation: str  # Operation ID
    current_position: int
    suggested_position: int
    rationale: str


@dataclass
class OptimizationSuggestions:
    """Collection of optimization suggestions for a workflow."""
    optimizations: List[OptimizationSuggestion]
    reordering: List[ReorderingSuggestion]
    overall_impact: str


@dataclass
class WorkflowExplanation:
    """Explanation of a workflow's steps and rationale."""
    overview: str
    steps: List[Dict[str, str]]
    data_flow: Dict[str, List[str]]
    potential_issues: List[str]