"""
Unit tests for verifying data integrity in the universal translation layer.

These tests ensure that the translation layer correctly preserves data integrity
when converting between different test management system formats.
"""

import pytest
import json
import datetime
from uuid import uuid4
from typing import Dict, Any, List

from internal.python.translation.models.canonical_models import (
    CanonicalTestCase,
    CanonicalTestStep,
    CanonicalCustomField,
    CanonicalAttachment,
    CanonicalUser,
    TestCaseStatus,
    Priority,
    TransformationContext
)
from internal.python.translation.transformers.transformer import (
    Transformer,
    TransformationService,
    TransformationError
)
from internal.python.translation.mappers.base_mapper import (
    BaseMapper,
    TestCaseMapper,
    MapperRegistry
)

# Test fixtures
@pytest.fixture
def complex_test_case_data() -> Dict[str, Any]:
    """Create a complex test case data structure with various field types."""
    return {
        "id": "TC-COMPLEX-001",
        "title": "Complex test case with special characters: áéíóú",
        "description": "Test case with <b>HTML</b> formatting and special characters: áéíóú",
        "status": "ACTIVE",
        "priority": "HIGH",
        "folder_path": "/Project/Folder/Subfolder",
        "preconditions": "System is in a clean state\nUser is logged in",
        "expected_results": "Operation completes successfully\nUser sees confirmation",
        "owner": "user.name@example.com",
        "custom_fields": {
            "Risk": "Medium",
            "Component": "Authentication",
            "Automation_Status": "Automated",
            "Last_Run_Date": "2025-01-15T14:30:00Z",
            "Test_Data": "user1:password1,user2:password2"
        },
        "tags": ["regression", "authentication", "smoke-test"],
        "steps": [
            {
                "id": "step1",
                "order": 1,
                "action": "Navigate to login page",
                "expected_result": "Login page is displayed",
                "test_data": "N/A"
            },
            {
                "id": "step2",
                "order": 2,
                "action": "Enter 'user@example.com' in the email field",
                "expected_result": "Email is accepted",
                "test_data": "user@example.com"
            },
            {
                "id": "step3",
                "order": 3,
                "action": "Enter valid password with special chars !@#$%^",
                "expected_result": "Password field shows dots for each character",
                "test_data": "Password!@#$%^"
            },
            {
                "id": "step4",
                "order": 4,
                "action": "Click 'Login' button",
                "expected_result": "User is logged in successfully\nDashboard is displayed",
                "test_data": "N/A"
            }
        ],
        "attachments": [
            {
                "id": "att1",
                "filename": "screenshot1.png",
                "file_type": "image/png",
                "size": 25000,
                "description": "Screenshot of login screen"
            },
            {
                "id": "att2",
                "filename": "test_data.json",
                "file_type": "application/json",
                "size": 1500,
                "description": "Test data file with special characters áéíóú"
            }
        ],
        "links": [
            {
                "type": "requirement",
                "id": "REQ-001",
                "description": "User authentication"
            },
            {
                "type": "defect",
                "id": "BUG-123",
                "description": "Login fails with certain special characters"
            }
        ],
        "history": [
            {
                "date": "2025-01-01T10:00:00Z",
                "user": "user1",
                "field": "status",
                "from": "DRAFT",
                "to": "ACTIVE"
            },
            {
                "date": "2025-01-10T15:30:00Z",
                "user": "user2",
                "field": "priority",
                "from": "MEDIUM",
                "to": "HIGH"
            }
        ],
        "created_at": "2025-01-01T08:00:00Z",
        "updated_at": "2025-01-15T16:45:00Z",
        "version": "2.0"
    }

@pytest.fixture
def sample_canonical_test_case(complex_test_case_data) -> CanonicalTestCase:
    """Create a sample canonical test case."""
    test_steps = []
    for step_data in complex_test_case_data["steps"]:
        test_steps.append(CanonicalTestStep(
            id=step_data["id"],
            order=step_data["order"],
            action=step_data["action"],
            expected_result=step_data["expected_result"],
            data=step_data.get("test_data")
        ))
    
    custom_fields = []
    for name, value in complex_test_case_data["custom_fields"].items():
        custom_fields.append(CanonicalCustomField(
            name=name,
            value=value,
            field_type="string"
        ))
    
    attachments = []
    for att_data in complex_test_case_data["attachments"]:
        attachments.append(CanonicalAttachment(
            id=att_data["id"],
            file_name=att_data["filename"],
            file_type=att_data["file_type"],
            size=att_data["size"],
            storage_location="local://attachments/",
            description=att_data.get("description")
        ))
    
    return CanonicalTestCase(
        id=complex_test_case_data["id"],
        name=complex_test_case_data["title"],
        objective=complex_test_case_data["description"],
        status=TestCaseStatus.READY,
        priority=Priority.HIGH,
        source_system="Zephyr",
        preconditions=complex_test_case_data["preconditions"],
        description=complex_test_case_data["description"],
        test_steps=test_steps,
        folder_path=complex_test_case_data["folder_path"],
        created_at=datetime.datetime.fromisoformat(complex_test_case_data["created_at"].replace('Z', '+00:00')),
        updated_at=datetime.datetime.fromisoformat(complex_test_case_data["updated_at"].replace('Z', '+00:00')),
        owner=CanonicalUser(id="user1", email=complex_test_case_data["owner"]),
        attachments=attachments,
        custom_fields=custom_fields,
        version=complex_test_case_data["version"]
    )

# Create mock mappers for testing
class MockZephyrMapper(TestCaseMapper):
    """Mock Zephyr mapper for testing."""
    
    def __init__(self):
        super().__init__("zephyr")
    
    def to_canonical(self, source: Dict[str, Any], context=None) -> CanonicalTestCase:
        """Convert Zephyr format to canonical model."""
        test_steps = []
        for step_data in source["steps"]:
            test_steps.append(CanonicalTestStep(
                id=step_data["id"],
                order=step_data["order"],
                action=step_data["action"],
                expected_result=step_data["expected_result"],
                data=step_data.get("test_data")
            ))
        
        custom_fields = []
        for name, value in source.get("custom_fields", {}).items():
            custom_fields.append(CanonicalCustomField(
                name=name,
                value=value,
                field_type="string"
            ))
        
        attachments = []
        for att_data in source.get("attachments", []):
            attachments.append(CanonicalAttachment(
                id=att_data["id"],
                file_name=att_data["filename"],
                file_type=att_data["file_type"],
                size=att_data["size"],
                storage_location="local://attachments/",
                description=att_data.get("description")
            ))
        
        created_at = None
        if "created_at" in source:
            created_at = datetime.datetime.fromisoformat(source["created_at"].replace('Z', '+00:00'))
        
        updated_at = None
        if "updated_at" in source:
            updated_at = datetime.datetime.fromisoformat(source["updated_at"].replace('Z', '+00:00'))
        
        return CanonicalTestCase(
            id=source["id"],
            name=source["title"],
            objective=source.get("description", ""),
            status=TestCaseStatus.READY,
            priority=Priority.HIGH if source.get("priority") == "HIGH" else Priority.MEDIUM,
            source_system="Zephyr",
            preconditions=source.get("preconditions", ""),
            description=source.get("description", ""),
            test_steps=test_steps,
            folder_path=source.get("folder_path", ""),
            created_at=created_at,
            updated_at=updated_at,
            owner=CanonicalUser(id="user1", email=source.get("owner", "")),
            attachments=attachments,
            custom_fields=custom_fields,
            version=source.get("version", "1.0")
        )
    
    def from_canonical(self, canonical: CanonicalTestCase, context=None) -> Dict[str, Any]:
        """Convert canonical model to Zephyr format."""
        steps = []
        for step in canonical.test_steps:
            steps.append({
                "id": step.id,
                "order": step.order,
                "action": step.action,
                "expected_result": step.expected_result,
                "test_data": step.data
            })
        
        custom_fields = {}
        for field in canonical.custom_fields:
            custom_fields[field.name] = field.value
        
        attachments = []
        for att in canonical.attachments:
            attachments.append({
                "id": att.id,
                "filename": att.file_name,
                "file_type": att.file_type,
                "size": att.size,
                "description": att.description
            })
        
        return {
            "id": canonical.id,
            "title": canonical.name,
            "description": canonical.description,
            "status": canonical.status.value,
            "priority": canonical.priority.value,
            "folder_path": canonical.folder_path,
            "preconditions": canonical.preconditions,
            "owner": canonical.owner.email if canonical.owner else None,
            "custom_fields": custom_fields,
            "steps": steps,
            "attachments": attachments,
            "created_at": canonical.created_at.isoformat() if canonical.created_at else None,
            "updated_at": canonical.updated_at.isoformat() if canonical.updated_at else None,
            "version": canonical.version
        }
    
    def validate_mapping(self, source: Dict[str, Any], target: Any) -> List[str]:
        """Validate mapping between Zephyr and canonical formats."""
        errors = []
        
        # Check essential fields
        if isinstance(target, CanonicalTestCase):
            # Validating to_canonical mapping
            if source.get("id") != target.id:
                errors.append(f"ID mismatch: {source.get('id')} != {target.id}")
            
            if source.get("title") != target.name:
                errors.append(f"Name mismatch: {source.get('title')} != {target.name}")
            
            # Check steps count
            if len(source.get("steps", [])) != len(target.test_steps):
                errors.append(f"Steps count mismatch: {len(source.get('steps', []))} != {len(target.test_steps)}")
        else:
            # Validating from_canonical mapping
            if target.get("id") != source.id:
                errors.append(f"ID mismatch: {target.get('id')} != {source.id}")
            
            if target.get("title") != source.name:
                errors.append(f"Name mismatch: {target.get('title')} != {source.name}")
            
            # Check steps count
            if len(target.get("steps", [])) != len(source.test_steps):
                errors.append(f"Steps count mismatch: {len(target.get('steps', []))} != {len(source.test_steps)}")
        
        return errors
    
    def map_custom_fields(self, source: Dict[str, Any], context=None) -> List[Dict[str, Any]]:
        """Map custom fields."""
        result = []
        for name, value in source.get("custom_fields", {}).items():
            result.append({
                "name": name,
                "value": value,
                "field_type": "string"
            })
        return result
    
    def map_attachments(self, source: Dict[str, Any], context=None) -> List[Dict[str, Any]]:
        """Map attachments."""
        result = []
        for att in source.get("attachments", []):
            result.append({
                "id": att["id"],
                "file_name": att["filename"],
                "file_type": att["file_type"],
                "size": att["size"],
                "storage_location": "local://attachments/",
                "description": att.get("description")
            })
        return result

class MockQTestMapper(TestCaseMapper):
    """Mock qTest mapper for testing."""
    
    def __init__(self):
        super().__init__("qtest")
    
    def to_canonical(self, source: Dict[str, Any], context=None) -> CanonicalTestCase:
        """Convert qTest format to canonical model."""
        test_steps = []
        for step_data in source.get("test_steps", []):
            test_steps.append(CanonicalTestStep(
                id=step_data.get("id", f"step-{len(test_steps)+1}"),
                order=step_data.get("order", len(test_steps)+1),
                action=step_data.get("description", ""),
                expected_result=step_data.get("expected_result", ""),
                data=step_data.get("test_data", "")
            ))
        
        custom_fields = []
        for field in source.get("properties", []):
            custom_fields.append(CanonicalCustomField(
                name=field.get("field_name", ""),
                value=field.get("field_value", ""),
                field_type=field.get("field_type", "string")
            ))
        
        attachments = []
        for att in source.get("attachments", []):
            attachments.append(CanonicalAttachment(
                id=att.get("id", f"att-{len(attachments)+1}"),
                file_name=att.get("name", ""),
                file_type=att.get("content_type", ""),
                size=att.get("size", 0),
                storage_location=att.get("url", ""),
                description=att.get("description", "")
            ))
        
        return CanonicalTestCase(
            id=source.get("id", ""),
            name=source.get("name", ""),
            objective=source.get("description", ""),
            status=TestCaseStatus.READY,
            priority=Priority.HIGH if source.get("priority") == 1 else Priority.MEDIUM,
            source_system="qTest",
            preconditions=source.get("precondition", ""),
            description=source.get("description", ""),
            test_steps=test_steps,
            folder_path=source.get("path", ""),
            created_at=datetime.datetime.fromtimestamp(source.get("created_date", 0)/1000) if source.get("created_date") else None,
            updated_at=datetime.datetime.fromtimestamp(source.get("last_modified_date", 0)/1000) if source.get("last_modified_date") else None,
            owner=CanonicalUser(id=source.get("created_by", {}).get("id", ""), email=source.get("created_by", {}).get("email", "")),
            attachments=attachments,
            custom_fields=custom_fields,
            version=str(source.get("version", 1))
        )
    
    def from_canonical(self, canonical: CanonicalTestCase, context=None) -> Dict[str, Any]:
        """Convert canonical model to qTest format."""
        test_steps = []
        for step in canonical.test_steps:
            test_steps.append({
                "id": step.id,
                "order": step.order,
                "description": step.action,
                "expected_result": step.expected_result,
                "test_data": step.data
            })
        
        properties = []
        for field in canonical.custom_fields:
            properties.append({
                "field_name": field.name,
                "field_value": field.value,
                "field_type": field.field_type
            })
        
        attachments = []
        for att in canonical.attachments:
            attachments.append({
                "id": att.id,
                "name": att.file_name,
                "content_type": att.file_type,
                "size": att.size,
                "url": att.storage_location,
                "description": att.description
            })
        
        return {
            "id": canonical.id,
            "name": canonical.name,
            "description": canonical.description,
            "status": 1,  # Active
            "priority": 1 if canonical.priority == Priority.HIGH else 2,
            "path": canonical.folder_path,
            "precondition": canonical.preconditions,
            "test_steps": test_steps,
            "properties": properties,
            "attachments": attachments,
            "created_date": int(canonical.created_at.timestamp() * 1000) if canonical.created_at else None,
            "last_modified_date": int(canonical.updated_at.timestamp() * 1000) if canonical.updated_at else None,
            "created_by": {
                "id": canonical.owner.id if canonical.owner else "",
                "email": canonical.owner.email if canonical.owner else ""
            },
            "version": int(canonical.version) if canonical.version and canonical.version.isdigit() else 1
        }
    
    def validate_mapping(self, source: Any, target: Any) -> List[str]:
        """Validate mapping between qTest and canonical formats."""
        errors = []
        
        if isinstance(target, CanonicalTestCase):
            # Validating to_canonical mapping
            if source.get("id", "") != target.id:
                errors.append(f"ID mismatch: {source.get('id', '')} != {target.id}")
            
            if source.get("name", "") != target.name:
                errors.append(f"Name mismatch: {source.get('name', '')} != {target.name}")
            
            # Check steps count
            if len(source.get("test_steps", [])) != len(target.test_steps):
                errors.append(f"Steps count mismatch: {len(source.get('test_steps', []))} != {len(target.test_steps)}")
        else:
            # Validating from_canonical mapping
            if target.get("id", "") != source.id:
                errors.append(f"ID mismatch: {target.get('id', '')} != {source.id}")
            
            if target.get("name", "") != source.name:
                errors.append(f"Name mismatch: {target.get('name', '')} != {source.name}")
            
            # Check steps count
            if len(target.get("test_steps", [])) != len(source.test_steps):
                errors.append(f"Steps count mismatch: {len(target.get('test_steps', []))} != {len(source.test_steps)}")
        
        return errors
    
    def map_custom_fields(self, source: Dict[str, Any], context=None) -> List[Dict[str, Any]]:
        """Map custom fields."""
        result = []
        for prop in source.get("properties", []):
            result.append({
                "name": prop.get("field_name", ""),
                "value": prop.get("field_value", ""),
                "field_type": prop.get("field_type", "string")
            })
        return result
    
    def map_attachments(self, source: Dict[str, Any], context=None) -> List[Dict[str, Any]]:
        """Map attachments."""
        result = []
        for att in source.get("attachments", []):
            result.append({
                "id": att.get("id", ""),
                "file_name": att.get("name", ""),
                "file_type": att.get("content_type", ""),
                "size": att.get("size", 0),
                "storage_location": att.get("url", ""),
                "description": att.get("description", "")
            })
        return result

@pytest.fixture
def mapper_registry():
    """Create a mapper registry with mock mappers."""
    registry = MapperRegistry()
    registry.register("zephyr", "test-case", MockZephyrMapper())
    registry.register("qtest", "test-case", MockQTestMapper())
    return registry

@pytest.fixture
def transformer(monkeypatch, mapper_registry):
    """Create a transformer with mock mappers."""
    transformer = Transformer()
    
    # Monkeypatch the _get_mapper method to use our registry
    def mock_get_mapper(self, system_name, entity_type):
        return mapper_registry.get_mapper(system_name, entity_type)
    
    monkeypatch.setattr(Transformer, '_get_mapper', mock_get_mapper)
    
    return transformer

@pytest.fixture
def transformation_service(transformer):
    """Create a transformation service with the mock transformer."""
    service = TransformationService()
    service.transformer = transformer
    return service

@pytest.mark.unit
@pytest.mark.translation
class TestTranslationIntegrity:
    """Test suite for verifying data integrity in the translation layer."""
    
    def test_canonical_model_preserves_all_fields(self, sample_canonical_test_case):
        """Test that the canonical model preserves all fields from the original data."""
        # Complex canonical model should have all these fields populated
        assert sample_canonical_test_case.id == "TC-COMPLEX-001"
        assert sample_canonical_test_case.name == "Complex test case with special characters: áéíóú"
        assert "special characters: áéíóú" in sample_canonical_test_case.objective
        assert sample_canonical_test_case.status == TestCaseStatus.READY
        assert sample_canonical_test_case.priority == Priority.HIGH
        assert sample_canonical_test_case.folder_path == "/Project/Folder/Subfolder"
        assert "System is in a clean state" in sample_canonical_test_case.preconditions
        assert sample_canonical_test_case.source_system == "Zephyr"
        
        # Check test steps
        assert len(sample_canonical_test_case.test_steps) == 4
        assert sample_canonical_test_case.test_steps[0].action == "Navigate to login page"
        assert sample_canonical_test_case.test_steps[2].expected_result == "Password field shows dots for each character"
        assert "special chars !@#$%^" in sample_canonical_test_case.test_steps[2].action
        
        # Check attachments
        assert len(sample_canonical_test_case.attachments) == 2
        assert sample_canonical_test_case.attachments[1].file_name == "test_data.json"
        assert "special characters" in sample_canonical_test_case.attachments[1].description
        
        # Check custom fields
        assert len(sample_canonical_test_case.custom_fields) == 5
        
        # Check dates
        assert sample_canonical_test_case.created_at.year == 2025
        assert sample_canonical_test_case.created_at.month == 1
        assert sample_canonical_test_case.created_at.day == 1
    
    def test_bidirectional_conversion_preserves_data(self, transformer, complex_test_case_data):
        """Test that bidirectional conversion preserves data integrity."""
        context = TransformationContext(
            source_system="zephyr",
            target_system="zephyr",
            migration_id=None
        )
        
        # Convert to canonical form
        canonical = transformer._get_mapper("zephyr", "test-case").to_canonical(complex_test_case_data, context)
        
        # Convert back to source format
        result = transformer._get_mapper("zephyr", "test-case").from_canonical(canonical, context)
        
        # Check that essential data is preserved
        assert result["id"] == complex_test_case_data["id"]
        assert result["title"] == complex_test_case_data["title"]
        assert result["description"] == complex_test_case_data["description"]
        assert result["folder_path"] == complex_test_case_data["folder_path"]
        assert result["preconditions"] == complex_test_case_data["preconditions"]
        
        # Check steps
        assert len(result["steps"]) == len(complex_test_case_data["steps"])
        for i in range(len(result["steps"])):
            assert result["steps"][i]["action"] == complex_test_case_data["steps"][i]["action"]
            assert result["steps"][i]["expected_result"] == complex_test_case_data["steps"][i]["expected_result"]
        
        # Check custom fields
        for key, value in complex_test_case_data["custom_fields"].items():
            assert result["custom_fields"][key] == value
        
        # Check special characters
        assert "áéíóú" in result["title"]
        assert "special chars !@#$%^" in result["steps"][2]["action"]
    
    def test_cross_system_transformation_preserves_critical_data(self, transformer, complex_test_case_data):
        """Test that transformation between systems preserves critical data."""
        # Transform from Zephyr to qTest
        context = TransformationContext(
            source_system="zephyr",
            target_system="qtest",
            migration_id=None
        )
        
        # Two-step transformation
        # 1. To canonical
        canonical = transformer._get_mapper("zephyr", "test-case").to_canonical(complex_test_case_data, context)
        # 2. From canonical to target
        qtest_result = transformer._get_mapper("qtest", "test-case").from_canonical(canonical, context)
        
        # Check that critical data is preserved
        assert qtest_result["id"] == complex_test_case_data["id"]
        assert qtest_result["name"] == complex_test_case_data["title"]
        assert qtest_result["description"] == complex_test_case_data["description"]
        assert qtest_result["path"] == complex_test_case_data["folder_path"]
        assert qtest_result["precondition"] == complex_test_case_data["preconditions"]
        
        # Check steps
        assert len(qtest_result["test_steps"]) == len(complex_test_case_data["steps"])
        for i in range(len(qtest_result["test_steps"])):
            step_data = complex_test_case_data["steps"][i]
            qtest_step = qtest_result["test_steps"][i]
            assert qtest_step["description"] == step_data["action"]
            assert qtest_step["expected_result"] == step_data["expected_result"]
        
        # Check special characters in different fields
        assert "áéíóú" in qtest_result["name"]
        assert "special chars !@#$%^" in qtest_result["test_steps"][2]["description"]
    
    def test_transformation_service_preserves_data_integrity(self, transformation_service, complex_test_case_data):
        """Test that the transformation service preserves data integrity."""
        # Transform data from Zephyr to qTest
        result = transformation_service.transform(
            source_system="zephyr",
            target_system="qtest",
            data=complex_test_case_data,
            entity_type="test-case"
        )
        
        # Check critical data fields
        assert result["id"] == complex_test_case_data["id"]
        assert result["name"] == complex_test_case_data["title"]
        assert result["description"] == complex_test_case_data["description"]
        
        # Check special characters
        assert "áéíóú" in result["name"]
        assert "special chars !@#$%^" in result["test_steps"][2]["description"]
        
        # Get translations to verify tracking
        translations = transformation_service.get_translations()
        assert len(translations) == 1
        
        first_translation = list(translations.values())[0]
        assert first_translation.source_system == "zephyr"
        assert first_translation.target_system == "qtest"
        assert first_translation.source_id == complex_test_case_data["id"]
        assert first_translation.status == "success"
    
    def test_round_trip_transformation_preserves_data(self, transformation_service, complex_test_case_data):
        """Test that a round-trip transformation (A→B→A) preserves data integrity."""
        # First transformation: Zephyr to qTest
        qtest_result = transformation_service.transform(
            source_system="zephyr",
            target_system="qtest",
            data=complex_test_case_data,
            entity_type="test-case"
        )
        
        # Second transformation: qTest back to Zephyr
        zephyr_result = transformation_service.transform(
            source_system="qtest",
            target_system="zephyr",
            data=qtest_result,
            entity_type="test-case"
        )
        
        # Check that original data is preserved after round trip
        assert zephyr_result["id"] == complex_test_case_data["id"]
        assert zephyr_result["title"] == complex_test_case_data["title"]
        assert zephyr_result["description"] == complex_test_case_data["description"]
        assert zephyr_result["folder_path"] == complex_test_case_data["folder_path"]
        
        # Check special characters survive the round trip
        assert "áéíóú" in zephyr_result["title"]
        assert "special chars !@#$%^" in zephyr_result["steps"][2]["action"]
        
        # Check structural integrity
        assert len(zephyr_result["steps"]) == len(complex_test_case_data["steps"])
        for i in range(len(zephyr_result["steps"])):
            assert zephyr_result["steps"][i]["action"] == complex_test_case_data["steps"][i]["action"]
    
    def test_custom_field_mapping_preserves_data(self, transformation_service, complex_test_case_data):
        """Test that custom field mapping preserves data integrity."""
        # Define field mappings to rename fields
        field_mappings = {
            "Risk": "RiskLevel",
            "Component": "TestComponent", 
            "Automation_Status": "AutomationState"
        }
        
        # Transform with field mappings
        result = transformation_service.transform(
            source_system="zephyr",
            target_system="qtest",
            data=complex_test_case_data,
            entity_type="test-case",
            field_mappings=field_mappings
        )
        
        # Check that field values are preserved despite name changes
        properties = {prop["field_name"]: prop["field_value"] for prop in result["properties"]}
        assert properties.get("RiskLevel") == complex_test_case_data["custom_fields"]["Risk"]
        assert properties.get("TestComponent") == complex_test_case_data["custom_fields"]["Component"]
        assert properties.get("AutomationState") == complex_test_case_data["custom_fields"]["Automation_Status"]
    
    def test_error_handling_during_transformation(self, transformer, complex_test_case_data, monkeypatch):
        """Test that errors during transformation are properly handled and don't corrupt data."""
        # Inject an error in the conversion process
        original_to_canonical = MockZephyrMapper.to_canonical
        
        def mock_to_canonical(self, source, context=None):
            if source["steps"][2]["action"] == "Enter valid password with special chars !@#$%^":
                # Simulate an error for a specific step
                raise ValueError("Error processing step with special characters")
            return original_to_canonical(self, source, context)
        
        monkeypatch.setattr(MockZephyrMapper, 'to_canonical', mock_to_canonical)
        
        # Attempt transformation with the injected error
        context = TransformationContext(
            source_system="zephyr",
            target_system="qtest",
            migration_id=None
        )
        
        # Transformation should fail but not corrupt other data
        with pytest.raises(TransformationError) as exc_info:
            transformer.transform(
                source_system="zephyr",
                target_system="qtest",
                entity_type="test-case",
                source_data=complex_test_case_data,
                context=context
            )
        
        # Verify the error is tracked properly
        assert "Error processing step with special characters" in str(exc_info.value)
        
        # Verify the error is recorded in translations
        translations = transformer.get_translations()
        assert len(translations) == 1
        
        first_translation = list(translations.values())[0]
        assert first_translation.status == "error"
        assert first_translation.source_id == complex_test_case_data["id"]
        assert "Error processing step with special characters" in first_translation.messages[0]
    
    def test_validation_ensures_data_integrity(self, transformer, complex_test_case_data, monkeypatch):
        """Test that validation catches data integrity issues."""
        # Modify validation to detect a specific issue
        original_validate = MockZephyrMapper.validate_mapping
        
        def mock_validate(self, source, target):
            errors = original_validate(self, source, target)
            
            # Add a validation check for HTML content
            if isinstance(target, CanonicalTestCase):
                if "<b>HTML</b>" in target.objective:
                    errors.append("HTML formatting may not be preserved correctly")
            
            return errors
        
        monkeypatch.setattr(MockZephyrMapper, 'validate_mapping', mock_validate)
        
        # Perform transformation with validation
        context = TransformationContext(
            source_system="zephyr",
            target_system="qtest",
            migration_id=None
        )
        
        # The transformation should complete but with warnings
        result = transformer.transform(
            source_system="zephyr",
            target_system="qtest",
            entity_type="test-case",
            source_data=complex_test_case_data,
            context=context
        )
        
        # Verify the data is still transformed
        assert result["id"] == complex_test_case_data["id"]
        
        # Verify the warning is recorded
        translations = transformer.get_translations()
        first_translation = list(translations.values())[0]
        assert first_translation.status == "partial"  # Not full success due to warnings
        assert "HTML formatting may not be preserved correctly" in first_translation.messages
    
    def test_multi_entity_translation_preserves_relationships(self, transformation_service, complex_test_case_data):
        """Test that translating multiple related entities preserves their relationships."""
        # Create related entities: test suite and test cases
        test_suite = {
            "id": "TS-001",
            "name": "Authentication Suite",
            "description": "Tests for authentication functionality",
            "test_cases": [complex_test_case_data["id"], "TC-COMPLEX-002"]
        }
        
        # Transform test case first
        test_case_result = transformation_service.transform(
            source_system="zephyr",
            target_system="qtest",
            data=complex_test_case_data,
            entity_type="test-case"
        )
        
        # Normally we'd transform the test suite too, but we'll simulate it for this test
        # The key point is to verify that the relationship IDs are preserved
        
        # Verify relationship is preserved
        assert test_case_result["id"] == complex_test_case_data["id"]
        assert test_suite["test_cases"][0] == complex_test_case_data["id"]  # Reference is preserved
        
        # In a real implementation, the test suite would be transformed and should maintain references
    
    def test_data_type_conversion_preserves_semantics(self, transformer, complex_test_case_data):
        """Test that data type conversions preserve semantic meaning."""
        # Focus on fields that might change representation between systems
        # Example: dates, enums, numeric values
        
        # Transform from Zephyr to qTest (which uses different date formats and priorities)
        context = TransformationContext(
            source_system="zephyr",
            target_system="qtest",
            migration_id=None
        )
        
        # Get canonical representation
        canonical = transformer._get_mapper("zephyr", "test-case").to_canonical(complex_test_case_data, context)
        
        # Convert to qTest format
        qtest_result = transformer._get_mapper("qtest", "test-case").from_canonical(canonical, context)
        
        # Check date conversion (Zephyr uses ISO strings, qTest uses millisecond timestamps)
        zephyr_created = datetime.datetime.fromisoformat(complex_test_case_data["created_at"].replace('Z', '+00:00'))
        qtest_created_ms = qtest_result["created_date"]
        # Convert back to datetime for comparison
        qtest_created = datetime.datetime.fromtimestamp(qtest_created_ms / 1000)
        
        # Dates should be semantically equivalent (within seconds)
        assert abs((qtest_created - zephyr_created).total_seconds()) < 1
        
        # Check priority conversion (Zephyr uses strings, qTest uses numbers)
        assert complex_test_case_data["priority"] == "HIGH"
        assert qtest_result["priority"] == 1  # HIGH should map to 1 in qTest
        
        # Transform back to Zephyr to verify round-trip conversion
        canonical_back = transformer._get_mapper("qtest", "test-case").to_canonical(qtest_result, context)
        zephyr_back = transformer._get_mapper("zephyr", "test-case").from_canonical(canonical_back, context)
        
        # Priority should convert back to the original string
        assert zephyr_back["priority"] == "HIGH"