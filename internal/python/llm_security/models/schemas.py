"""
Schema models for validation of LLM inputs and outputs.
"""

from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Union, Callable
import json
import re


@dataclass
class SchemaField:
    """
    Schema field definition for validating structured data.
    """
    
    name: str
    field_type: str
    required: bool = True
    description: Optional[str] = None
    pattern: Optional[str] = None
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    min_value: Optional[Union[int, float]] = None
    max_value: Optional[Union[int, float]] = None
    enum_values: List[Any] = field(default_factory=list)
    nested_schema: Optional[List['SchemaField']] = None
    
    def validate(self, value: Any) -> Dict[str, Any]:
        """
        Validate a value against this field schema.
        
        Args:
            value: Value to validate
            
        Returns:
            Dict[str, Any]: Validation result
        """
        # Check if field is present
        if value is None:
            if self.required:
                return {
                    "valid": False,
                    "issues": [f"Required field '{self.name}' is missing"]
                }
            return {"valid": True}
        
        # Type validation
        if self.field_type == "string":
            if not isinstance(value, str):
                return {
                    "valid": False,
                    "issues": [f"Field '{self.name}' should be a string"]
                }
            
            # String-specific validation
            if self.pattern and not re.search(self.pattern, value):
                return {
                    "valid": False,
                    "issues": [f"Field '{self.name}' does not match required pattern"]
                }
                
            if self.min_length is not None and len(value) < self.min_length:
                return {
                    "valid": False,
                    "issues": [f"Field '{self.name}' is too short (min {self.min_length} chars)"]
                }
                
            if self.max_length is not None and len(value) > self.max_length:
                return {
                    "valid": False,
                    "issues": [f"Field '{self.name}' is too long (max {self.max_length} chars)"]
                }
                
        elif self.field_type == "number":
            if not isinstance(value, (int, float)):
                return {
                    "valid": False,
                    "issues": [f"Field '{self.name}' should be a number"]
                }
                
            # Number-specific validation
            if self.min_value is not None and value < self.min_value:
                return {
                    "valid": False,
                    "issues": [f"Field '{self.name}' is below minimum value {self.min_value}"]
                }
                
            if self.max_value is not None and value > self.max_value:
                return {
                    "valid": False,
                    "issues": [f"Field '{self.name}' exceeds maximum value {self.max_value}"]
                }
                
        elif self.field_type == "boolean":
            if not isinstance(value, bool):
                return {
                    "valid": False,
                    "issues": [f"Field '{self.name}' should be a boolean"]
                }
                
        elif self.field_type == "array":
            if not isinstance(value, list):
                return {
                    "valid": False,
                    "issues": [f"Field '{self.name}' should be an array"]
                }
                
            # Array item validation if nested schema provided
            if self.nested_schema:
                item_validator = SchemaValidator(self.nested_schema)
                for i, item in enumerate(value):
                    item_result = item_validator.validate(item)
                    if not item_result["valid"]:
                        return {
                            "valid": False,
                            "issues": [f"Item {i} in '{self.name}' has issues: " + 
                                      "; ".join(item_result["issues"])]
                        }
                        
        elif self.field_type == "object":
            if not isinstance(value, dict):
                return {
                    "valid": False,
                    "issues": [f"Field '{self.name}' should be an object"]
                }
                
            # Object property validation if nested schema provided
            if self.nested_schema:
                obj_validator = SchemaValidator(self.nested_schema)
                obj_result = obj_validator.validate(value)
                if not obj_result["valid"]:
                    return {
                        "valid": False,
                        "issues": [f"Object '{self.name}' has issues: " + 
                                  "; ".join(obj_result["issues"])]
                    }
        
        # Enum validation
        if self.enum_values and value not in self.enum_values:
            return {
                "valid": False,
                "issues": [f"Field '{self.name}' must be one of: {', '.join(map(str, self.enum_values))}"]
            }
            
        return {"valid": True}
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        result = {
            "name": self.name,
            "type": self.field_type,
            "required": self.required
        }
        
        if self.description:
            result["description"] = self.description
            
        if self.pattern:
            result["pattern"] = self.pattern
            
        if self.min_length is not None:
            result["minLength"] = self.min_length
            
        if self.max_length is not None:
            result["maxLength"] = self.max_length
            
        if self.min_value is not None:
            result["minimum"] = self.min_value
            
        if self.max_value is not None:
            result["maximum"] = self.max_value
            
        if self.enum_values:
            result["enum"] = self.enum_values
            
        if self.nested_schema:
            if self.field_type == "array":
                result["items"] = {
                    "type": "object",
                    "properties": {
                        field.name: field.to_dict() for field in self.nested_schema
                    }
                }
            else:
                result["properties"] = {
                    field.name: field.to_dict() for field in self.nested_schema
                }
                
        return result
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'SchemaField':
        """Create from dictionary."""
        nested_schema = None
        
        if data.get("type") == "array" and "items" in data:
            if "properties" in data["items"]:
                nested_schema = [
                    cls.from_dict({**prop, "name": name})
                    for name, prop in data["items"]["properties"].items()
                ]
        elif data.get("type") == "object" and "properties" in data:
            nested_schema = [
                cls.from_dict({**prop, "name": name})
                for name, prop in data["properties"].items()
            ]
            
        return cls(
            name=data["name"],
            field_type=data["type"],
            required=data.get("required", True),
            description=data.get("description"),
            pattern=data.get("pattern"),
            min_length=data.get("minLength"),
            max_length=data.get("maxLength"),
            min_value=data.get("minimum"),
            max_value=data.get("maximum"),
            enum_values=data.get("enum", []),
            nested_schema=nested_schema
        )


@dataclass
class OutputSchema:
    """
    Schema definition for LLM output validation.
    """
    
    name: str
    description: str
    fields: List[SchemaField]
    version: str = "1.0"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "name": self.name,
            "description": self.description,
            "version": self.version,
            "fields": [field.to_dict() for field in self.fields]
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'OutputSchema':
        """Create from dictionary."""
        return cls(
            name=data["name"],
            description=data["description"],
            version=data.get("version", "1.0"),
            fields=[SchemaField.from_dict({**field, "name": field.get("name", f"field_{i}")}) 
                   for i, field in enumerate(data["fields"])]
        )
    
    @classmethod
    def error_analysis_schema(cls) -> 'OutputSchema':
        """Create a schema for error analysis output."""
        return cls(
            name="error_analysis",
            description="Schema for error analysis output",
            fields=[
                SchemaField(
                    name="error_type",
                    field_type="string",
                    required=True,
                    description="Type of error"
                ),
                SchemaField(
                    name="root_cause",
                    field_type="string",
                    required=True,
                    description="Root cause of the error"
                ),
                SchemaField(
                    name="severity",
                    field_type="string",
                    required=True,
                    description="Severity of the error",
                    enum_values=["low", "medium", "high", "critical"]
                ),
                SchemaField(
                    name="confidence",
                    field_type="number",
                    required=False,
                    description="Confidence in the analysis",
                    min_value=0.0,
                    max_value=1.0
                ),
                SchemaField(
                    name="affected_component",
                    field_type="string",
                    required=False,
                    description="Component affected by the error"
                )
            ]
        )
    
    @classmethod
    def remediation_schema(cls) -> 'OutputSchema':
        """Create a schema for remediation steps output."""
        return cls(
            name="remediation_steps",
            description="Schema for remediation steps output",
            fields=[
                SchemaField(
                    name="steps",
                    field_type="array",
                    required=True,
                    description="List of remediation steps",
                    nested_schema=[
                        SchemaField(
                            name="step",
                            field_type="string",
                            required=True,
                            description="Step title"
                        ),
                        SchemaField(
                            name="details",
                            field_type="string",
                            required=True,
                            description="Step details"
                        ),
                        SchemaField(
                            name="priority",
                            field_type="number",
                            required=True,
                            description="Step priority",
                            min_value=1,
                            max_value=10
                        ),
                        SchemaField(
                            name="code_example",
                            field_type="string",
                            required=False,
                            description="Example code for this step"
                        ),
                        SchemaField(
                            name="link",
                            field_type="string",
                            required=False,
                            description="Reference link"
                        )
                    ]
                )
            ]
        )


class SchemaValidator:
    """Validator for checking data against a schema."""
    
    def __init__(self, schema_fields: List[SchemaField] = None, schema: OutputSchema = None):
        """
        Initialize with schema fields or a complete schema.
        
        Args:
            schema_fields: List of schema fields
            schema: Complete output schema
        """
        if schema:
            self.schema_fields = schema.fields
        else:
            self.schema_fields = schema_fields or []
        
    def validate(self, data: Any) -> Dict[str, Any]:
        """
        Validate data against the schema.
        
        Args:
            data: Data to validate
            
        Returns:
            Dict[str, Any]: Validation result
        """
        issues = []
        
        # Handle non-object data
        if not isinstance(data, dict):
            return {
                "valid": False,
                "issues": ["Data must be an object"],
                "sanitized_output": {}
            }
        
        # Validate each field
        sanitized_output = {}
        for field in self.schema_fields:
            field_value = data.get(field.name)
            
            # Validate field
            field_result = field.validate(field_value)
            if not field_result["valid"]:
                issues.extend(field_result["issues"])
                continue
            
            # Include valid field in sanitized output
            if field_value is not None:
                sanitized_output[field.name] = field_value
        
        return {
            "valid": len(issues) == 0,
            "issues": issues,
            "sanitized_output": sanitized_output
        }
    
    def sanitize_according_to_schema(self, data: Any) -> Any:
        """
        Sanitize data to match the schema, removing non-schema fields.
        
        Args:
            data: Data to sanitize
            
        Returns:
            Any: Sanitized data
        """
        if not isinstance(data, dict):
            return data
        
        # Create sanitized object with only schema-defined fields
        sanitized = {}
        field_names = [field.name for field in self.schema_fields]
        
        for key, value in data.items():
            if key in field_names:
                # For nested objects, recursively sanitize
                field = next((f for f in self.schema_fields if f.name == key), None)
                
                if field and field.field_type == "object" and field.nested_schema:
                    # Recursively sanitize nested object
                    nested_validator = SchemaValidator(field.nested_schema)
                    sanitized[key] = nested_validator.sanitize_according_to_schema(value)
                elif field and field.field_type == "array" and field.nested_schema:
                    # Sanitize each item in the array
                    if isinstance(value, list):
                        nested_validator = SchemaValidator(field.nested_schema)
                        sanitized[key] = [
                            nested_validator.sanitize_according_to_schema(item)
                            for item in value
                        ]
                    else:
                        sanitized[key] = value
                else:
                    sanitized[key] = value
        
        return sanitized