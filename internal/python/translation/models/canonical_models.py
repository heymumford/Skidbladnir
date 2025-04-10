"""
Canonical data models for the translation layer.

These models provide a system-agnostic representation of test assets
that can be used for bidirectional conversion between different test
management systems.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Any, Union
from uuid import UUID


class TestCaseStatus(str, Enum):
    """Represents the lifecycle state of a test case."""
    DRAFT = 'DRAFT'
    READY = 'READY'
    APPROVED = 'APPROVED'
    DEPRECATED = 'DEPRECATED'
    ARCHIVED = 'ARCHIVED'


class ExecutionStatus(str, Enum):
    """Indicates the outcome of a test execution."""
    PASSED = 'PASSED'
    FAILED = 'FAILED'
    BLOCKED = 'BLOCKED'
    NOT_EXECUTED = 'NOT_EXECUTED'
    IN_PROGRESS = 'IN_PROGRESS'
    SKIPPED = 'SKIPPED'


class Priority(str, Enum):
    """Indicates the importance and urgency of a test case."""
    LOW = 'LOW'
    MEDIUM = 'MEDIUM'
    HIGH = 'HIGH'
    CRITICAL = 'CRITICAL'


@dataclass
class CanonicalAttachment:
    """Represents a file attached to a test case, step, or execution."""
    id: str
    file_name: str
    file_type: str
    size: int
    storage_location: str
    description: Optional[str] = None
    uploaded_by: Optional[str] = None
    uploaded_at: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    content: Optional[bytes] = None  # For in-memory processing


@dataclass
class CanonicalCustomField:
    """Represents a custom field with its value and metadata."""
    name: str
    value: Any
    field_type: str
    field_id: Optional[str] = None
    system_id: Optional[str] = None
    namespace: Optional[str] = None
    options: List[str] = field(default_factory=list)
    required: bool = False
    is_custom: bool = True


@dataclass
class CanonicalTestStep:
    """Defines a single step within a test case."""
    id: str
    order: int
    action: str
    expected_result: str
    data: Optional[str] = None
    is_data_driven: bool = False
    attachments: List[CanonicalAttachment] = field(default_factory=list)
    custom_fields: List[CanonicalCustomField] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CanonicalStepResult:
    """Records the outcome of executing a single test step."""
    step_id: str
    status: ExecutionStatus
    actual_result: Optional[str] = None
    notes: Optional[str] = None
    attachments: List[CanonicalAttachment] = field(default_factory=list)
    execution_time: Optional[float] = None  # In seconds
    defects: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CanonicalAutomation:
    """Information about test automation for a test case."""
    is_automated: bool = False
    script_path: Optional[str] = None
    language: Optional[str] = None
    framework: Optional[str] = None
    automation_id: Optional[str] = None
    repository: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CanonicalTag:
    """Represents a tag or label attached to a test case."""
    name: str
    color: Optional[str] = None
    category: Optional[str] = None
    system_id: Optional[str] = None


@dataclass
class CanonicalLink:
    """Represents a link to another entity, such as a requirement."""
    type: str  # e.g., "requirement", "defect", "test-case"
    target_id: str
    relationship: Optional[str] = None  # e.g., "verifies", "blocks", "relates-to"
    url: Optional[str] = None
    description: Optional[str] = None
    system_id: Optional[str] = None


@dataclass
class CanonicalUser:
    """Represents a user reference."""
    id: str
    username: Optional[str] = None
    email: Optional[str] = None
    display_name: Optional[str] = None
    system_id: Optional[str] = None


@dataclass
class CanonicalTestCase:
    """Standard system-agnostic representation of a test case."""
    id: str
    name: str
    objective: str
    status: TestCaseStatus
    priority: Priority
    
    # System identifiers
    source_system: Optional[str] = None
    external_id: Optional[str] = None
    system_id: Optional[str] = None
    
    # Core fields
    preconditions: Optional[str] = None
    description: Optional[str] = None
    test_steps: List[CanonicalTestStep] = field(default_factory=list)
    
    # Organization
    folder_path: Optional[str] = None
    suite_id: Optional[str] = None
    
    # Metadata
    created_at: Optional[datetime] = None
    created_by: Optional[CanonicalUser] = None
    updated_at: Optional[datetime] = None
    updated_by: Optional[CanonicalUser] = None
    
    # Attribution
    owner: Optional[CanonicalUser] = None
    assignee: Optional[CanonicalUser] = None
    
    # Related items
    attachments: List[CanonicalAttachment] = field(default_factory=list)
    tags: List[CanonicalTag] = field(default_factory=list)
    links: List[CanonicalLink] = field(default_factory=list)
    custom_fields: List[CanonicalCustomField] = field(default_factory=list)
    
    # Automation
    automation: Optional[CanonicalAutomation] = None
    
    # Versioning
    version: Optional[str] = None
    is_latest_version: bool = True
    
    # Migration tracking
    migration_id: Optional[UUID] = None
    migration_status: Optional[str] = None
    
    # Additional data
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CanonicalTestExecution:
    """Records the execution of a test case."""
    id: str
    test_case_id: str
    status: ExecutionStatus
    
    # System identifiers
    source_system: Optional[str] = None
    external_id: Optional[str] = None
    system_id: Optional[str] = None
    
    # Core execution data
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    environment: Optional[str] = None
    build_version: Optional[str] = None
    step_results: List[CanonicalStepResult] = field(default_factory=list)
    
    # Attribution
    executed_by: Optional[CanonicalUser] = None
    
    # Related items
    attachments: List[CanonicalAttachment] = field(default_factory=list)
    defects: List[str] = field(default_factory=list)
    comments: List[str] = field(default_factory=list)
    custom_fields: List[CanonicalCustomField] = field(default_factory=list)
    
    # Additional data
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CanonicalTestSuite:
    """Group of related test cases."""
    id: str
    name: str
    
    # System identifiers
    source_system: Optional[str] = None
    external_id: Optional[str] = None
    system_id: Optional[str] = None
    
    # Organization
    description: Optional[str] = None
    parent_id: Optional[str] = None
    path: Optional[str] = None
    
    # Content references
    test_case_ids: List[str] = field(default_factory=list)
    
    # Metadata
    created_at: Optional[datetime] = None
    created_by: Optional[CanonicalUser] = None
    updated_at: Optional[datetime] = None
    updated_by: Optional[CanonicalUser] = None
    
    # Additional data
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CanonicalTestCycle:
    """Represents a test execution cycle or test run."""
    id: str
    name: str
    status: str  # Open, Closed, In Progress
    
    # System identifiers
    source_system: Optional[str] = None
    external_id: Optional[str] = None
    system_id: Optional[str] = None
    
    # Core fields
    description: Optional[str] = None
    environment: Optional[str] = None
    build_version: Optional[str] = None
    
    # Time boundaries
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    
    # Content references
    test_case_ids: List[str] = field(default_factory=list)
    execution_ids: List[str] = field(default_factory=list)
    folder_path: Optional[str] = None
    
    # Attribution
    owner: Optional[CanonicalUser] = None
    
    # Additional data
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CanonicalRequirement:
    """Represents a requirement linked to test cases."""
    id: str
    name: str
    
    # System identifiers
    source_system: Optional[str] = None
    external_id: Optional[str] = None
    system_id: Optional[str] = None
    
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    
    # Organization
    parent_id: Optional[str] = None
    path: Optional[str] = None
    
    # References
    test_case_ids: List[str] = field(default_factory=list)
    
    # Additional data
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CanonicalDefect:
    """Represents a defect or issue linked to test executions."""
    id: str
    title: str
    
    # System identifiers
    source_system: Optional[str] = None
    external_id: Optional[str] = None
    system_id: Optional[str] = None
    
    description: Optional[str] = None
    severity: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    
    # Attribution
    reporter: Optional[CanonicalUser] = None
    assignee: Optional[CanonicalUser] = None
    
    # Dates
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    # References
    test_case_ids: List[str] = field(default_factory=list)
    execution_ids: List[str] = field(default_factory=list)
    
    # Additional data
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CanonicalTranslation:
    """Records a translation from one system to another."""
    source_system: str
    target_system: str
    entity_type: str  # test-case, test-step, etc.
    source_id: str
    target_id: str
    status: str  # success, error, partial
    timestamp: datetime = field(default_factory=datetime.now)
    source_data: Optional[Dict[str, Any]] = None
    target_data: Optional[Dict[str, Any]] = None
    messages: List[str] = field(default_factory=list)
    
    # Migration tracking
    migration_id: Optional[UUID] = None
    
    # Additional data
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TransformationContext:
    """Context for a transformation operation."""
    source_system: str
    target_system: str
    migration_id: Optional[UUID] = None
    user_id: Optional[str] = None
    field_mappings: Dict[str, str] = field(default_factory=dict)
    value_mappings: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    options: Dict[str, Any] = field(default_factory=dict)


@dataclass
class MigrationJob:
    """Represents a migration job with source and target configurations."""
    id: UUID
    name: str
    
    # System configuration
    source_system: str
    source_config: Dict[str, Any]
    target_system: str
    target_config: Dict[str, Any]
    
    # Scope
    entity_types: List[str]  # test-case, test-suite, etc.
    
    description: Optional[str] = None
    filters: Dict[str, Any] = field(default_factory=dict)
    
    # Configuration
    field_mappings: Dict[str, Dict[str, str]] = field(default_factory=dict)  # by entity type
    value_mappings: Dict[str, Dict[str, Dict[str, Any]]] = field(default_factory=dict)  # by entity type and field
    
    # Status tracking
    status: str = "CREATED"  # CREATED, RUNNING, COMPLETED, FAILED, PAUSED
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    
    # Progress tracking
    total_items: int = 0
    processed_items: int = 0
    success_count: int = 0
    error_count: int = 0
    warning_count: int = 0
    
    # Attribution
    created_by: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    
    # Additional data
    metadata: Dict[str, Any] = field(default_factory=dict)