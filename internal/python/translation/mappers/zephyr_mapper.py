"""
Zephyr Scale mapper for the translation layer.

This module provides the mapper implementation for converting between
Zephyr Scale specific formats and the canonical data model.
"""

from typing import Any, Dict, List, Optional, Union, cast

from ..models import (
    CanonicalTestCase,
    CanonicalTestStep,
    CanonicalTestExecution,
    CanonicalTestSuite,
    CanonicalTestCycle,
    CanonicalAttachment,
    CanonicalCustomField,
    CanonicalTag,
    CanonicalLink,
    CanonicalUser,
    TestCaseStatus,
    ExecutionStatus,
    Priority,
    TransformationContext
)

from .base_mapper import TestCaseMapper, TestExecutionMapper, TestSuiteMapper, TestCycleMapper


class ZephyrTestCaseMapper(TestCaseMapper):
    """Mapper for Zephyr Scale test cases."""
    
    def __init__(self):
        """Initialize the mapper."""
        super().__init__("zephyr")
    
    def to_canonical(self, source: Dict[str, Any], context: Optional[TransformationContext] = None) -> CanonicalTestCase:
        """
        Convert from Zephyr Scale format to canonical model.
        
        Args:
            source: Source data in Zephyr Scale format
            context: Optional transformation context
            
        Returns:
            Canonical test case
        """
        # Map status from Zephyr to canonical
        status = self._map_status_to_canonical(source.get('status', 'DRAFT'))
        
        # Map priority from Zephyr to canonical
        priority = self._map_priority_to_canonical(source.get('priority', 'MEDIUM'))
        
        # Create the canonical test case
        test_case = CanonicalTestCase(
            id=source.get('id', ''),
            name=source.get('name', ''),
            objective=source.get('objective', ''),
            status=status,
            priority=priority,
            description=source.get('description', ''),
            preconditions=source.get('precondition', ''),
            folder_path=source.get('folderPath', ''),
            external_id=source.get('key', ''),
            source_system="zephyr"
        )
        
        # Map test steps
        if 'steps' in source and isinstance(source['steps'], list):
            test_case.test_steps = self._map_steps_to_canonical(source['steps'])
        
        # Map user information
        if 'owner' in source:
            test_case.owner = CanonicalUser(
                id=source.get('owner', ''),
                username=source.get('owner', '')
            )
        
        if 'createdBy' in source:
            test_case.created_by = CanonicalUser(
                id=source.get('createdBy', ''),
                username=source.get('createdBy', '')
            )
        
        # Map timestamps
        if 'createdOn' in source:
            # Note: In a real implementation, we'd properly parse the date
            test_case.created_at = source['createdOn']
        
        if 'updatedOn' in source:
            test_case.updated_at = source['updatedOn']
        
        # Map tags/labels
        if 'labels' in source and isinstance(source['labels'], list):
            test_case.tags = [
                CanonicalTag(name=label) 
                for label in source['labels']
            ]
        
        # Map attachments
        if 'attachments' in source and isinstance(source['attachments'], list):
            test_case.attachments = self.map_attachments(source, context)
        
        # Map custom fields
        if 'customFields' in source and isinstance(source['customFields'], dict):
            test_case.custom_fields = self.map_custom_fields(source, context)
        
        return test_case
    
    def from_canonical(self, canonical: CanonicalTestCase, context: Optional[TransformationContext] = None) -> Dict[str, Any]:
        """
        Convert from canonical model to Zephyr Scale format.
        
        Args:
            canonical: Canonical test case
            context: Optional transformation context
            
        Returns:
            Zephyr Scale test case data
        """
        # Create the Zephyr Scale test case
        zephyr_test = {
            'name': canonical.name,
            'description': canonical.description or '',
            'objective': canonical.objective or '',
            'precondition': canonical.preconditions or '',
            'status': self._map_status_from_canonical(canonical.status),
            'priority': self._map_priority_from_canonical(canonical.priority),
        }
        
        # Map folder path
        if canonical.folder_path:
            zephyr_test['folderPath'] = canonical.folder_path
        
        # Map test steps
        if canonical.test_steps:
            zephyr_test['steps'] = self._map_steps_from_canonical(canonical.test_steps)
        
        # Map labels from tags
        if canonical.tags:
            zephyr_test['labels'] = [tag.name for tag in canonical.tags]
        
        # Map custom fields
        if canonical.custom_fields:
            zephyr_test['customFields'] = {}
            for field in canonical.custom_fields:
                zephyr_test['customFields'][field.name] = field.value
        
        return zephyr_test
    
    def validate_mapping(self, source: Dict[str, Any], target: CanonicalTestCase) -> List[str]:
        """
        Validate the mapping between Zephyr Scale and canonical model.
        
        Args:
            source: Source data in Zephyr Scale format
            target: Canonical test case
            
        Returns:
            List of validation messages (empty if valid)
        """
        messages = []
        
        # Check required fields
        if not target.id and 'id' in source:
            messages.append("ID was not properly mapped")
        
        if not target.name and 'name' in source:
            messages.append("Name was not properly mapped")
        
        # Check steps mapping
        if 'steps' in source and isinstance(source['steps'], list):
            if len(source['steps']) != len(target.test_steps):
                messages.append(f"Step count mismatch: {len(source['steps'])} in source, {len(target.test_steps)} in target")
        
        return messages
    
    def map_custom_fields(self, source: Dict[str, Any], context: Optional[TransformationContext] = None) -> List[CanonicalCustomField]:
        """
        Map custom fields from Zephyr Scale format.
        
        Args:
            source: Source data in Zephyr Scale format
            context: Optional transformation context
            
        Returns:
            List of canonical custom fields
        """
        custom_fields = []
        
        if 'customFields' in source and isinstance(source['customFields'], dict):
            for name, value in source['customFields'].items():
                field_type = self._determine_field_type(value)
                
                custom_field = CanonicalCustomField(
                    name=name,
                    value=value,
                    field_type=field_type
                )
                
                custom_fields.append(custom_field)
        
        return custom_fields
    
    def map_attachments(self, source: Dict[str, Any], context: Optional[TransformationContext] = None) -> List[CanonicalAttachment]:
        """
        Map attachments from Zephyr Scale format.
        
        Args:
            source: Source data in Zephyr Scale format
            context: Optional transformation context
            
        Returns:
            List of canonical attachments
        """
        attachments = []
        
        if 'attachments' in source and isinstance(source['attachments'], list):
            for attachment in source['attachments']:
                canonical_attachment = CanonicalAttachment(
                    id=str(attachment.get('id', '')),
                    file_name=attachment.get('filename', ''),
                    file_type=attachment.get('contentType', 'application/octet-stream'),
                    size=attachment.get('fileSize', 0),
                    storage_location='',  # This would be set by the storage service
                    description=attachment.get('comment', '')
                )
                
                if 'createdBy' in attachment:
                    canonical_attachment.uploaded_by = attachment['createdBy']
                
                if 'createdOn' in attachment:
                    canonical_attachment.uploaded_at = attachment['createdOn']
                
                attachments.append(canonical_attachment)
        
        return attachments
    
    def _map_steps_to_canonical(self, zephyr_steps: List[Dict[str, Any]]) -> List[CanonicalTestStep]:
        """Map Zephyr Scale steps to canonical test steps."""
        steps = []
        
        for i, step in enumerate(zephyr_steps):
            canonical_step = CanonicalTestStep(
                id=str(step.get('id', f"step-{i+1}")),
                order=step.get('index', i+1),
                action=step.get('description', ''),
                expected_result=step.get('expectedResult', ''),
                data=step.get('testData', ''),
                is_data_driven=bool(step.get('testData'))
            )
            
            # Map attachments if present
            if 'attachments' in step and isinstance(step['attachments'], list):
                for attachment in step['attachments']:
                    canonical_attachment = CanonicalAttachment(
                        id=str(attachment.get('id', '')),
                        file_name=attachment.get('filename', ''),
                        file_type=attachment.get('contentType', 'application/octet-stream'),
                        size=attachment.get('fileSize', 0),
                        storage_location='',  # This would be set by the storage service
                        description=attachment.get('comment', '')
                    )
                    
                    canonical_step.attachments.append(canonical_attachment)
            
            steps.append(canonical_step)
        
        return steps
    
    def _map_steps_from_canonical(self, canonical_steps: List[CanonicalTestStep]) -> List[Dict[str, Any]]:
        """Map canonical test steps to Zephyr Scale steps."""
        zephyr_steps = []
        
        for step in canonical_steps:
            zephyr_step = {
                'index': step.order,
                'description': step.action,
                'expectedResult': step.expected_result or '',
                'testData': step.data or ''
            }
            
            # Include ID if available
            if step.id:
                zephyr_step['id'] = step.id
            
            zephyr_steps.append(zephyr_step)
        
        return zephyr_steps
    
    def _map_status_to_canonical(self, zephyr_status: str) -> TestCaseStatus:
        """Map Zephyr Scale status to canonical status."""
        status_map = {
            'DRAFT': TestCaseStatus.DRAFT,
            'READY': TestCaseStatus.READY,
            'APPROVED': TestCaseStatus.APPROVED,
            'DEPRECATED': TestCaseStatus.DEPRECATED,
            'OBSOLETE': TestCaseStatus.DEPRECATED,
            'ARCHIVED': TestCaseStatus.ARCHIVED
        }
        
        return status_map.get(zephyr_status.upper(), TestCaseStatus.DRAFT)
    
    def _map_status_from_canonical(self, canonical_status: TestCaseStatus) -> str:
        """Map canonical status to Zephyr Scale status."""
        status_map = {
            TestCaseStatus.DRAFT: 'DRAFT',
            TestCaseStatus.READY: 'READY',
            TestCaseStatus.APPROVED: 'APPROVED',
            TestCaseStatus.DEPRECATED: 'DEPRECATED',
            TestCaseStatus.ARCHIVED: 'ARCHIVED'
        }
        
        return status_map.get(canonical_status, 'DRAFT')
    
    def _map_priority_to_canonical(self, zephyr_priority: str) -> Priority:
        """Map Zephyr Scale priority to canonical priority."""
        priority_map = {
            'LOW': Priority.LOW,
            'MEDIUM': Priority.MEDIUM,
            'HIGH': Priority.HIGH,
            'CRITICAL': Priority.CRITICAL,
            'HIGHEST': Priority.CRITICAL
        }
        
        return priority_map.get(zephyr_priority.upper(), Priority.MEDIUM)
    
    def _map_priority_from_canonical(self, canonical_priority: Priority) -> str:
        """Map canonical priority to Zephyr Scale priority."""
        priority_map = {
            Priority.LOW: 'LOW',
            Priority.MEDIUM: 'MEDIUM',
            Priority.HIGH: 'HIGH',
            Priority.CRITICAL: 'CRITICAL'
        }
        
        return priority_map.get(canonical_priority, 'MEDIUM')
    
    def _determine_field_type(self, value: Any) -> str:
        """Determine the field type based on the value."""
        if isinstance(value, bool):
            return 'BOOLEAN'
        elif isinstance(value, int):
            return 'INTEGER'
        elif isinstance(value, float):
            return 'FLOAT'
        elif isinstance(value, list):
            return 'MULTISELECT'
        elif isinstance(value, dict):
            return 'OBJECT'
        else:
            return 'STRING'


class ZephyrTestExecutionMapper(TestExecutionMapper):
    """Mapper for Zephyr Scale test executions."""
    
    def __init__(self):
        """Initialize the mapper."""
        super().__init__("zephyr")
    
    def to_canonical(self, source: Dict[str, Any], context: Optional[TransformationContext] = None) -> CanonicalTestExecution:
        """
        Convert from Zephyr Scale format to canonical model.
        
        Args:
            source: Source data in Zephyr Scale format
            context: Optional transformation context
            
        Returns:
            Canonical test execution
        """
        # Map status from Zephyr to canonical
        status = self._map_execution_status_to_canonical(source.get('status', 'NOT_EXECUTED'))
        
        # Create the canonical test execution
        execution = CanonicalTestExecution(
            id=source.get('id', ''),
            test_case_id=source.get('testId', ''),
            status=status
        )
        
        # Map core execution data
        execution.description = source.get('comment', '')
        execution.environment = source.get('environment', '')
        
        # Map timestamps
        if 'executedOn' in source:
            execution.start_time = source['executedOn']
        
        # Map executed by
        if 'executedBy' in source:
            execution.executed_by = CanonicalUser(
                id=source.get('executedBy', ''),
                username=source.get('executedBy', '')
            )
        
        # Map test cycle ID
        if 'cycleId' in source:
            execution.test_cycle_id = source['cycleId']
        
        # Map duration
        if 'timeSpentInSeconds' in source:
            execution.execution_time = source['timeSpentInSeconds']
        
        # Map step results
        if 'stepResults' in source and isinstance(source['stepResults'], list):
            execution.step_results = self.map_step_results(source, context)
        
        # Map attachments
        if 'attachments' in source and isinstance(source['attachments'], list):
            for attachment in source['attachments']:
                canonical_attachment = CanonicalAttachment(
                    id=str(attachment.get('id', '')),
                    file_name=attachment.get('filename', ''),
                    file_type=attachment.get('contentType', 'application/octet-stream'),
                    size=attachment.get('fileSize', 0),
                    storage_location='',  # This would be set by the storage service
                    description=attachment.get('comment', '')
                )
                
                if 'createdBy' in attachment:
                    canonical_attachment.uploaded_by = attachment['createdBy']
                
                if 'createdOn' in attachment:
                    canonical_attachment.uploaded_at = attachment['createdOn']
                
                execution.attachments.append(canonical_attachment)
        
        # Map defects
        if 'defects' in source and isinstance(source['defects'], list):
            for defect in source['defects']:
                execution.defects.append(defect.get('id', ''))
        
        return execution
    
    def from_canonical(self, canonical: CanonicalTestExecution, context: Optional[TransformationContext] = None) -> Dict[str, Any]:
        """
        Convert from canonical model to Zephyr Scale format.
        
        Args:
            canonical: Canonical test execution
            context: Optional transformation context
            
        Returns:
            Zephyr Scale test execution data
        """
        # Create the Zephyr Scale test execution
        zephyr_execution = {
            'testId': canonical.test_case_id,
            'status': self._map_execution_status_from_canonical(canonical.status),
            'comment': canonical.description or ''
        }
        
        # Map environment
        if canonical.environment:
            zephyr_execution['environment'] = canonical.environment
        
        # Map cycle ID
        if canonical.test_cycle_id:
            zephyr_execution['cycleId'] = canonical.test_cycle_id
        
        # Map executed by
        if canonical.executed_by:
            zephyr_execution['executedBy'] = canonical.executed_by.id or canonical.executed_by.username
        
        # Map execution time
        if canonical.start_time:
            zephyr_execution['executedOn'] = canonical.start_time
        
        # Map duration
        if canonical.execution_time:
            zephyr_execution['timeSpentInSeconds'] = canonical.execution_time
        
        # Map step results
        if canonical.step_results:
            zephyr_execution['stepResults'] = []
            for result in canonical.step_results:
                zephyr_result = {
                    'stepId': result.step_id,
                    'index': result.sequence,
                    'status': self._map_execution_status_from_canonical(result.status),
                    'actualResult': result.actual_result or '',
                    'comment': result.comment or ''
                }
                zephyr_execution['stepResults'].append(zephyr_result)
        
        return zephyr_execution
    
    def validate_mapping(self, source: Dict[str, Any], target: CanonicalTestExecution) -> List[str]:
        """
        Validate the mapping between Zephyr Scale and canonical model.
        
        Args:
            source: Source data in Zephyr Scale format
            target: Canonical test execution
            
        Returns:
            List of validation messages (empty if valid)
        """
        messages = []
        
        # Check required fields
        if not target.id and 'id' in source:
            messages.append("ID was not properly mapped")
        
        if not target.test_case_id and 'testId' in source:
            messages.append("Test case ID was not properly mapped")
        
        # Check step results mapping
        if 'stepResults' in source and isinstance(source['stepResults'], list):
            if len(source['stepResults']) != len(target.step_results):
                messages.append(f"Step result count mismatch: {len(source['stepResults'])} in source, {len(target.step_results)} in target")
        
        return messages
    
    def map_step_results(self, source: Dict[str, Any], context: Optional[TransformationContext] = None) -> List[Dict[str, Any]]:
        """
        Map step results from Zephyr Scale format.
        
        Args:
            source: Source data in Zephyr Scale format
            context: Optional transformation context
            
        Returns:
            List of canonical step results
        """
        step_results = []
        
        if 'stepResults' in source and isinstance(source['stepResults'], list):
            for result in source['stepResults']:
                step_result = {
                    'step_id': result.get('stepId', ''),
                    'sequence': result.get('index', 0),
                    'status': self._map_execution_status_to_canonical(result.get('status', 'NOT_EXECUTED')),
                    'actual_result': result.get('actualResult', ''),
                    'comment': result.get('comment', '')
                }
                
                # Map attachments if present
                if 'attachments' in result and isinstance(result['attachments'], list):
                    step_result['attachments'] = []
                    for attachment in result['attachments']:
                        canonical_attachment = {
                            'id': str(attachment.get('id', '')),
                            'file_name': attachment.get('filename', ''),
                            'file_type': attachment.get('contentType', 'application/octet-stream'),
                            'size': attachment.get('fileSize', 0),
                            'storage_location': '',  # This would be set by the storage service
                            'description': attachment.get('comment', '')
                        }
                        step_result['attachments'].append(canonical_attachment)
                
                step_results.append(step_result)
        
        return step_results
    
    def _map_execution_status_to_canonical(self, zephyr_status: str) -> ExecutionStatus:
        """Map Zephyr Scale execution status to canonical execution status."""
        status_map = {
            'PASS': ExecutionStatus.PASSED,
            'PASSED': ExecutionStatus.PASSED,
            'FAIL': ExecutionStatus.FAILED,
            'FAILED': ExecutionStatus.FAILED,
            'BLOCK': ExecutionStatus.BLOCKED,
            'BLOCKED': ExecutionStatus.BLOCKED,
            'NOT_EXECUTED': ExecutionStatus.NOT_EXECUTED,
            'UNEXECUTED': ExecutionStatus.NOT_EXECUTED,
            'IN_PROGRESS': ExecutionStatus.IN_PROGRESS,
            'SKIP': ExecutionStatus.SKIPPED,
            'SKIPPED': ExecutionStatus.SKIPPED
        }
        
        return status_map.get(zephyr_status.upper(), ExecutionStatus.NOT_EXECUTED)
    
    def _map_execution_status_from_canonical(self, canonical_status: ExecutionStatus) -> str:
        """Map canonical execution status to Zephyr Scale execution status."""
        status_map = {
            ExecutionStatus.PASSED: 'PASSED',
            ExecutionStatus.FAILED: 'FAILED',
            ExecutionStatus.BLOCKED: 'BLOCKED',
            ExecutionStatus.NOT_EXECUTED: 'NOT_EXECUTED',
            ExecutionStatus.IN_PROGRESS: 'IN_PROGRESS',
            ExecutionStatus.SKIPPED: 'SKIPPED'
        }
        
        return status_map.get(canonical_status, 'NOT_EXECUTED')


# Register the Zephyr Scale mappers
def register_mappers():
    """Register Zephyr Scale mappers with the registry."""
    from ..mappers import mapper_registry
    
    mapper_registry.register("zephyr", "test-case", ZephyrTestCaseMapper())
    mapper_registry.register("zephyr", "test-execution", ZephyrTestExecutionMapper())
    # Additional mappers would be registered here