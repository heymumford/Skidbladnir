"""
qTest mapper for the translation layer.

This module provides the mapper implementation for converting between
qTest specific formats and the canonical data model.
"""

from typing import Any, Dict, List, Optional

from ..models import (
    CanonicalTestCase,
    CanonicalTestStep,
    CanonicalTestExecution,
    CanonicalAttachment,
    CanonicalCustomField,
    CanonicalTag,
    CanonicalUser,
    CanonicalStepResult,
    TestCaseStatus,
    ExecutionStatus,
    Priority,
    TransformationContext
)

from .base_mapper import TestCaseMapper, TestExecutionMapper


class QTestTestCaseMapper(TestCaseMapper):
    """Mapper for qTest test cases."""
    
    def __init__(self) -> None:
        """Initialize the mapper."""
        super().__init__("qtest")
    
    def to_canonical(self, source: Dict[str, Any], context: Optional[TransformationContext] = None) -> CanonicalTestCase:
        """
        Convert from qTest format to canonical model.
        
        Args:
            source: Source data in qTest format
            context: Optional transformation context
            
        Returns:
            Canonical test case
        """
        # Map status from qTest to canonical
        status = self._map_status_to_canonical(source)
        
        # Map priority from qTest to canonical
        priority = self._map_priority_to_canonical(source)
        
        # Create the canonical test case
        test_case = CanonicalTestCase(
            id=str(source.get('id', '')),
            name=source.get('name', ''),
            objective=self._get_property_value(source, 'objective', ''),
            status=status,
            priority=priority,
            description=source.get('description', ''),
            preconditions=self._get_property_value(source, 'precondition', ''),
            folder_path=str(source.get('parent_id', '')) if source.get('parent_id') else '',
            external_id=str(source.get('pid', '')) if source.get('pid') else '',
            source_system="qtest"
        )
        
        # Map test steps
        if 'test_steps' in source and isinstance(source['test_steps'], list):
            test_case.test_steps = self._map_steps_to_canonical(source['test_steps'])
        
        # Map user information
        if 'created_by' in source:
            test_case.created_by = CanonicalUser(
                id=source.get('created_by', ''),
                username=source.get('created_by', '')
            )
        
        if 'last_modified_by' in source:
            test_case.updated_by = CanonicalUser(
                id=source.get('last_modified_by', ''),
                username=source.get('last_modified_by', '')
            )
        
        # Map timestamps
        if 'created_date' in source:
            # Note: In a real implementation, we'd properly parse the date
            test_case.created_at = source['created_date']
        
        if 'last_modified_date' in source:
            test_case.updated_at = source['last_modified_date']
        
        # Map tags/labels
        if 'tags' in source and isinstance(source['tags'], list):
            test_case.tags = [
                CanonicalTag(name=tag) 
                for tag in source['tags']
            ]
        
        # Map attachments
        if 'attachments' in source and isinstance(source['attachments'], list):
            test_case.attachments = self.map_attachments(source, context)
        
        # Map custom fields
        if 'properties' in source and isinstance(source['properties'], list):
            test_case.custom_fields = self.map_custom_fields(source, context)
        
        return test_case
    
    def from_canonical(self, canonical: CanonicalTestCase, context: Optional[TransformationContext] = None) -> Dict[str, Any]:
        """
        Convert from canonical model to qTest format.
        
        Args:
            canonical: Canonical test case
            context: Optional transformation context
            
        Returns:
            qTest test case data
        """
        # Create the qTest test case
        qtest_case = {
            'name': canonical.name,
            'description': canonical.description or '',
            'properties': []
        }
        
        # Add parent ID if folder is specified
        if canonical.folder_path:
            try:
                qtest_case['parent_id'] = int(canonical.folder_path)
            except ValueError:
                # If it's not a number, we might need to handle folder paths differently
                pass
        
        # Add objective as property
        if canonical.objective:
            qtest_case['properties'].append({
                'field_name': 'Objective',
                'field_value': canonical.objective
            })
        
        # Add precondition as property
        if canonical.preconditions:
            qtest_case['properties'].append({
                'field_name': 'Precondition',
                'field_value': canonical.preconditions
            })
        
        # Add priority as property
        qtest_case['properties'].append({
            'field_name': 'Priority',
            'field_value': self._map_priority_from_canonical(canonical.priority)
        })
        
        # Add status as property
        qtest_case['properties'].append({
            'field_name': 'Status',
            'field_value': self._map_status_from_canonical(canonical.status)
        })
        
        # Map test steps
        if canonical.test_steps:
            qtest_case['test_steps'] = self._map_steps_from_canonical(canonical.test_steps)
        
        # Map labels from tags
        if canonical.tags:
            qtest_case['tags'] = [tag.name for tag in canonical.tags]
        
        # Map custom fields
        if canonical.custom_fields:
            for field in canonical.custom_fields:
                # Skip fields that are handled specifically
                if field.name.lower() in ['priority', 'status', 'objective', 'precondition']:
                    continue
                
                qtest_case['properties'].append({
                    'field_name': field.name,
                    'field_value': field.value
                })
        
        return qtest_case
    
    def validate_mapping(self, source: Dict[str, Any], target: CanonicalTestCase) -> List[str]:
        """
        Validate the mapping between qTest and canonical model.
        
        Args:
            source: Source data in qTest format
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
        if 'test_steps' in source and isinstance(source['test_steps'], list):
            if len(source['test_steps']) != len(target.test_steps):
                messages.append(f"Step count mismatch: {len(source['test_steps'])} in source, {len(target.test_steps)} in target")
        
        return messages
    
    def map_custom_fields(self, source: Dict[str, Any], context: Optional[TransformationContext] = None) -> List[CanonicalCustomField]:
        """
        Map custom fields from qTest format.
        
        Args:
            source: Source data in qTest format
            context: Optional transformation context
            
        Returns:
            List of canonical custom fields
        """
        custom_fields = []
        
        if 'properties' in source and isinstance(source['properties'], list):
            for prop in source['properties']:
                # Skip fields that are handled specifically
                if prop.get('field_name', '').lower() in ['priority', 'status', 'objective', 'precondition']:
                    continue
                
                field_type = self._determine_field_type(prop.get('field_value'))
                
                custom_field = CanonicalCustomField(
                    name=prop.get('field_name', ''),
                    value=prop.get('field_value'),
                    field_type=field_type,
                    field_id=str(prop.get('field_id', '')) if prop.get('field_id') else None
                )
                
                custom_fields.append(custom_field)
        
        return custom_fields
    
    def map_attachments(self, source: Dict[str, Any], context: Optional[TransformationContext] = None) -> List[CanonicalAttachment]:
        """
        Map attachments from qTest format.
        
        Args:
            source: Source data in qTest format
            context: Optional transformation context
            
        Returns:
            List of canonical attachments
        """
        attachments = []
        
        if 'attachments' in source and isinstance(source['attachments'], list):
            for attachment in source['attachments']:
                canonical_attachment = CanonicalAttachment(
                    id=str(attachment.get('id', '')),
                    file_name=attachment.get('name', ''),
                    file_type=attachment.get('content_type', 'application/octet-stream'),
                    size=attachment.get('size', 0),
                    storage_location='',  # This would be set by the storage service
                    description=attachment.get('description', '')
                )
                
                if 'created_by' in attachment:
                    canonical_attachment.uploaded_by = attachment['created_by']
                
                if 'created_date' in attachment:
                    canonical_attachment.uploaded_at = attachment['created_date']
                
                attachments.append(canonical_attachment)
        
        return attachments
    
    def _map_steps_to_canonical(self, qtest_steps: List[Dict[str, Any]]) -> List[CanonicalTestStep]:
        """Map qTest steps to canonical test steps."""
        steps = []
        
        for i, step in enumerate(qtest_steps):
            canonical_step = CanonicalTestStep(
                id=str(step.get('id', f"step-{i+1}")),
                order=step.get('order', i+1),
                action=step.get('description', ''),
                expected_result=step.get('expected_result', ''),
                data=step.get('test_data', ''),
                is_data_driven=bool(step.get('test_data'))
            )
            
            # Map attachments if present
            if 'attachments' in step and isinstance(step['attachments'], list):
                for attachment in step['attachments']:
                    canonical_attachment = CanonicalAttachment(
                        id=str(attachment.get('id', '')),
                        file_name=attachment.get('name', ''),
                        file_type=attachment.get('content_type', 'application/octet-stream'),
                        size=attachment.get('size', 0),
                        storage_location='',  # This would be set by the storage service
                        description=attachment.get('description', '')
                    )
                    
                    canonical_step.attachments.append(canonical_attachment)
            
            steps.append(canonical_step)
        
        return steps
    
    def _map_steps_from_canonical(self, canonical_steps: List[CanonicalTestStep]) -> List[Dict[str, Any]]:
        """Map canonical test steps to qTest steps."""
        qtest_steps = []
        
        for step in canonical_steps:
            qtest_step = {
                'order': step.order,
                'description': step.action,
                'expected_result': step.expected_result or '',
                'test_data': step.data or ''
            }
            
            # Include ID if available
            if step.id:
                qtest_step['id'] = step.id
            
            qtest_steps.append(qtest_step)
        
        return qtest_steps
    
    def _map_status_to_canonical(self, qtest_case: Dict[str, Any]) -> TestCaseStatus:
        """Map qTest status to canonical status."""
        if 'properties' not in qtest_case:
            return TestCaseStatus.DRAFT
        
        status_prop = next((p for p in qtest_case.get('properties', []) 
                          if p.get('field_name') in ['Status', 'status']), None)
        
        if not status_prop or not status_prop.get('field_value'):
            return TestCaseStatus.DRAFT
        
        status_value = str(status_prop.get('field_value', '')).lower()
        
        status_map = {
            '1': TestCaseStatus.DRAFT,
            '2': TestCaseStatus.READY,
            '3': TestCaseStatus.APPROVED,
            '4': TestCaseStatus.DRAFT,  # NEEDS_WORK
            '5': TestCaseStatus.READY,
            '6': TestCaseStatus.DEPRECATED,
            'approved': TestCaseStatus.APPROVED,
            'unapproved': TestCaseStatus.DRAFT,
            'draft': TestCaseStatus.DRAFT,
            'ready to review': TestCaseStatus.READY,
            'ready for review': TestCaseStatus.READY,
            'ready': TestCaseStatus.READY,
            'needs work': TestCaseStatus.DRAFT,  # NEEDS_WORK
            'needs update': TestCaseStatus.DRAFT,  # NEEDS_WORK
            'deprecated': TestCaseStatus.DEPRECATED,
            'obsolete': TestCaseStatus.DEPRECATED
        }
        
        return status_map.get(status_value, TestCaseStatus.DRAFT)
    
    def _map_status_from_canonical(self, canonical_status: TestCaseStatus) -> str:
        """Map canonical status to qTest status."""
        status_map = {
            TestCaseStatus.DRAFT: '1',
            TestCaseStatus.READY: '5',
            TestCaseStatus.APPROVED: '3',
            TestCaseStatus.DEPRECATED: '6',
            TestCaseStatus.ARCHIVED: '6'  # Map ARCHIVED to DEPRECATED in qTest
        }
        
        return status_map.get(canonical_status, '1')
    
    def _map_priority_to_canonical(self, qtest_case: Dict[str, Any]) -> Priority:
        """Map qTest priority to canonical priority."""
        if 'properties' not in qtest_case:
            return Priority.MEDIUM
        
        priority_prop = next((p for p in qtest_case.get('properties', []) 
                            if p.get('field_name') in ['Priority', 'priority']), None)
        
        if not priority_prop or not priority_prop.get('field_value'):
            return Priority.MEDIUM
        
        priority_value = str(priority_prop.get('field_value', '')).lower()
        
        priority_map = {
            '1': Priority.CRITICAL,
            '2': Priority.HIGH,
            '3': Priority.MEDIUM,
            '4': Priority.LOW,
            'critical': Priority.CRITICAL,
            'high': Priority.HIGH,
            'medium': Priority.MEDIUM,
            'low': Priority.LOW
        }
        
        return priority_map.get(priority_value, Priority.MEDIUM)
    
    def _map_priority_from_canonical(self, canonical_priority: Priority) -> str:
        """Map canonical priority to qTest priority."""
        priority_map = {
            Priority.LOW: '4',
            Priority.MEDIUM: '3',
            Priority.HIGH: '2',
            Priority.CRITICAL: '1'
        }
        
        return priority_map.get(canonical_priority, '3')
    
    def _get_property_value(self, qtest_case: Dict[str, Any], property_name: str, default_value: str = '') -> str:
        """Get a property value from the qTest test case."""
        if 'properties' not in qtest_case:
            return default_value
        
        prop = next((p for p in qtest_case.get('properties', []) 
                   if p.get('field_name', '').lower() == property_name.lower()), None)
        
        return str(prop.get('field_value', default_value)) if prop else default_value
    
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


class QTestTestExecutionMapper(TestExecutionMapper):
    """Mapper for qTest test executions."""
    
    def __init__(self) -> None:
        """Initialize the mapper."""
        super().__init__("qtest")
    
    def to_canonical(self, source: Dict[str, Any], context: Optional[TransformationContext] = None) -> CanonicalTestExecution:
        """
        Convert from qTest format to canonical model.
        
        Args:
            source: Source data in qTest format
            context: Optional transformation context
            
        Returns:
            Canonical test execution
        """
        # In qTest, an execution is a combination of a test run and its logs
        test_run = source.get('test_run', source)
        test_log = source.get('test_log', test_run.get('latest_test_log', {}))
        
        # Map status from qTest to canonical
        status = self._map_execution_status_to_canonical(test_log.get('status', {}).get('name', 'NOT_EXECUTED'))
        
        # Create the canonical test execution
        execution = CanonicalTestExecution(
            id=str(test_log.get('id', test_run.get('id', ''))),
            test_case_id=str(test_run.get('test_case', {}).get('id', '')) if test_run.get('test_case') else '',
            status=status
        )
        
        # Map core execution data
        execution.description = test_log.get('note', '')
        execution.environment = self._get_property_value(test_log, 'environment', '')
        
        # Map test cycle ID
        if test_run.get('test_cycle'):
            execution.test_cycle_id = str(test_run['test_cycle']['id'])
        
        # Map timestamps
        if 'execution_date' in test_log:
            execution.start_time = test_log['execution_date']
        
        # Map executed by
        if 'executed_by' in test_log:
            execution.executed_by = CanonicalUser(
                id=test_log.get('executed_by', ''),
                username=test_log.get('executed_by', '')
            )
        
        # Map duration
        if 'execution_time_seconds' in test_log:
            execution.execution_time = test_log['execution_time_seconds']
        
        # Map step results
        if 'test_step_logs' in test_log and isinstance(test_log['test_step_logs'], list):
            execution.step_results = self.map_step_results(test_log, context)
        
        # Map attachments
        if 'attachments' in test_log and isinstance(test_log['attachments'], list):
            for attachment in test_log['attachments']:
                canonical_attachment = CanonicalAttachment(
                    id=str(attachment.get('id', '')),
                    file_name=attachment.get('name', ''),
                    file_type=attachment.get('content_type', 'application/octet-stream'),
                    size=attachment.get('size', 0),
                    storage_location='',  # This would be set by the storage service
                    description=attachment.get('description', '')
                )
                
                if 'created_by' in attachment:
                    canonical_attachment.uploaded_by = attachment['created_by']
                
                if 'created_date' in attachment:
                    canonical_attachment.uploaded_at = attachment['created_date']
                
                execution.attachments.append(canonical_attachment)
        
        # Map defects
        if 'defects' in test_log and isinstance(test_log['defects'], list):
            for defect in test_log['defects']:
                execution.defects.append(str(defect.get('id', '')))
        
        return execution
    
    def from_canonical(self, canonical: CanonicalTestExecution, context: Optional[TransformationContext] = None) -> Dict[str, Any]:
        """
        Convert from canonical model to qTest format.
        
        Args:
            canonical: Canonical test execution
            context: Optional transformation context
            
        Returns:
            qTest test execution data
        """
        # For qTest, we typically create a test log
        qtest_log = {
            'status': {
                'name': self._map_execution_status_from_canonical(canonical.status)
            },
            'note': canonical.description or '',
            'properties': []
        }
        
        # Map test case ID
        if canonical.test_case_id:
            qtest_log['test_case_id'] = canonical.test_case_id
        
        # Map environment
        if canonical.environment:
            qtest_log['properties'].append({
                'field_name': 'Environment',
                'field_value': canonical.environment
            })
        
        # Map execution timestamp
        if canonical.start_time:
            qtest_log['execution_date'] = canonical.start_time
        
        # Map executed by
        if canonical.executed_by:
            qtest_log['executed_by'] = canonical.executed_by.id or canonical.executed_by.username
        
        # Map execution time
        if hasattr(canonical, 'execution_time') and canonical.execution_time:
            qtest_log['execution_time_seconds'] = canonical.execution_time
        
        # Map step results
        if canonical.step_results:
            qtest_log['test_step_logs'] = []
            for result in canonical.step_results:
                qtest_step_log = {
                    'test_step_id': result.step_id,
                    'order': result.metadata.get('sequence', 0),
                    'status': {
                        'name': self._map_execution_status_from_canonical(result.status)
                    },
                    'actual_result': result.actual_result or '',
                    'note': result.notes or ''
                }
                qtest_log['test_step_logs'].append(qtest_step_log)
        
        # Map defects
        if canonical.defects:
            qtest_log['defects'] = [{'id': defect_id} for defect_id in canonical.defects]
        
        return qtest_log
    
    def validate_mapping(self, source: Dict[str, Any], target: CanonicalTestExecution) -> List[str]:
        """
        Validate the mapping between qTest and canonical model.
        
        Args:
            source: Source data in qTest format
            target: Canonical test execution
            
        Returns:
            List of validation messages (empty if valid)
        """
        messages = []
        test_log = source.get('test_log', source.get('latest_test_log', source))
        test_run = source.get('test_run', source)
        
        # Check required fields
        if not target.id and ('id' in test_log or 'id' in test_run):
            messages.append("ID was not properly mapped")
        
        if not target.test_case_id and 'test_case' in test_run:
            messages.append("Test case ID was not properly mapped")
        
        # Check step results mapping
        if 'test_step_logs' in test_log and isinstance(test_log['test_step_logs'], list):
            if len(test_log['test_step_logs']) != len(target.step_results):
                messages.append(f"Step result count mismatch: {len(test_log['test_step_logs'])} in source, {len(target.step_results)} in target")
        
        return messages
    
    def map_step_results(self, source: Dict[str, Any], context: Optional[TransformationContext] = None) -> List[CanonicalStepResult]:
        """
        Map step results from qTest format.
        
        Args:
            source: Source data in qTest format
            context: Optional transformation context
            
        Returns:
            List of canonical step results
        """
        step_results = []
        
        if 'test_step_logs' in source and isinstance(source['test_step_logs'], list):
            for log in source['test_step_logs']:
                status_name = log.get('status', {}).get('name', 'NOT_EXECUTED')
                
                step_result = CanonicalStepResult(
                    step_id=str(log.get('test_step_id', '')),
                    status=self._map_execution_status_to_canonical(status_name),
                    actual_result=log.get('actual_result', ''),
                    notes=log.get('note', '')
                )
                
                # Store the sequence in metadata
                step_result.metadata['sequence'] = log.get('order', 0)
                
                # Map attachments if present
                if 'attachments' in log and isinstance(log['attachments'], list):
                    for attachment in log['attachments']:
                        canonical_attachment = CanonicalAttachment(
                            id=str(attachment.get('id', '')),
                            file_name=attachment.get('name', ''),
                            file_type=attachment.get('content_type', 'application/octet-stream'),
                            size=attachment.get('size', 0),
                            storage_location='',  # This would be set by the storage service
                            description=attachment.get('description', '')
                        )
                        step_result.attachments.append(canonical_attachment)
                
                step_results.append(step_result)
        
        return step_results
    
    def _map_execution_status_to_canonical(self, qtest_status: str) -> ExecutionStatus:
        """Map qTest execution status to canonical execution status."""
        status_map = {
            'PASS': ExecutionStatus.PASSED,
            'PASSED': ExecutionStatus.PASSED,
            'FAIL': ExecutionStatus.FAILED,
            'FAILED': ExecutionStatus.FAILED,
            'BLOCK': ExecutionStatus.BLOCKED,
            'BLOCKED': ExecutionStatus.BLOCKED,
            'NOT_EXECUTED': ExecutionStatus.NOT_EXECUTED,
            'UNEXECUTED': ExecutionStatus.NOT_EXECUTED,
            'INCOMPLETE': ExecutionStatus.IN_PROGRESS,
            'IN_PROGRESS': ExecutionStatus.IN_PROGRESS,
            'SKIP': ExecutionStatus.SKIPPED,
            'SKIPPED': ExecutionStatus.SKIPPED
        }
        
        return status_map.get(qtest_status.upper(), ExecutionStatus.NOT_EXECUTED)
    
    def _map_execution_status_from_canonical(self, canonical_status: ExecutionStatus) -> str:
        """Map canonical execution status to qTest execution status."""
        status_map = {
            ExecutionStatus.PASSED: 'PASSED',
            ExecutionStatus.FAILED: 'FAILED',
            ExecutionStatus.BLOCKED: 'BLOCKED',
            ExecutionStatus.NOT_EXECUTED: 'NOT_EXECUTED',
            ExecutionStatus.IN_PROGRESS: 'INCOMPLETE',
            ExecutionStatus.SKIPPED: 'SKIPPED'
        }
        
        return status_map.get(canonical_status, 'NOT_EXECUTED')
    
    def _get_property_value(self, qtest_object: Dict[str, Any], property_name: str, default_value: str = '') -> str:
        """Get a property value from the qTest object."""
        if 'properties' not in qtest_object:
            return default_value
        
        prop = next((p for p in qtest_object.get('properties', []) 
                   if p.get('field_name', '').lower() == property_name.lower()), None)
        
        return str(prop.get('field_value', default_value)) if prop else default_value


# Register the qTest mappers
def register_mappers() -> None:
    """Register qTest mappers with the registry."""
    from .. import mappers  # Import at top level to avoid circular imports
    
    mappers.mapper_registry.register("qtest", "test-case", QTestTestCaseMapper())
    mappers.mapper_registry.register("qtest", "test-execution", QTestTestExecutionMapper())
    # Additional mappers would be registered here
