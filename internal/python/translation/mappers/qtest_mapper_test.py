"""
Tests for the qTest mapper implementation.

This module contains tests to verify that the qTest mapper correctly
converts between qTest formats and the canonical data model.
"""

import unittest
from typing import Dict, Any, List, Optional

from ..models import (
    CanonicalTestCase,
    CanonicalTestStep,
    CanonicalTestExecution,
    CanonicalAttachment,
    CanonicalUser,
    CanonicalTag,
    CanonicalStepResult,
    TestCaseStatus,
    ExecutionStatus,
    Priority
)

from .qtest_mapper import QTestTestCaseMapper, QTestTestExecutionMapper


class QTestTestCaseMapperTests(unittest.TestCase):
    """Tests for the QTestTestCaseMapper."""
    
    def setUp(self) -> None:
        """Set up the test case."""
        self.mapper = QTestTestCaseMapper()
        
        # Sample qTest test case data
        self.qtest_case: Dict[str, Any] = {
            'id': 12345,
            'name': 'Login Validation Test',
            'description': 'This test case validates the login functionality',
            'parent_id': 100,
            'pid': 'TC-123',
            'created_by': 'john.doe',
            'created_date': '2023-05-15T10:30:00Z',
            'last_modified_by': 'jane.smith',
            'last_modified_date': '2023-05-20T14:45:00Z',
            'tags': ['login', 'authentication', 'critical'],
            'properties': [
                {
                    'field_id': 1,
                    'field_name': 'Priority',
                    'field_value': '1'  # Critical
                },
                {
                    'field_id': 2,
                    'field_name': 'Status',
                    'field_value': '3'  # Approved
                },
                {
                    'field_id': 3,
                    'field_name': 'Objective',
                    'field_value': 'Verify user can log in with valid credentials'
                },
                {
                    'field_id': 4,
                    'field_name': 'Precondition',
                    'field_value': 'User account exists in the system'
                },
                {
                    'field_id': 5,
                    'field_name': 'Custom Field 1',
                    'field_value': 'Custom Value 1'
                }
            ],
            'test_steps': [
                {
                    'id': 1001,
                    'order': 1,
                    'description': 'Navigate to the login page',
                    'expected_result': 'Login page is displayed',
                    'test_data': ''
                },
                {
                    'id': 1002,
                    'order': 2,
                    'description': 'Enter valid username and password',
                    'expected_result': 'Credentials are accepted',
                    'test_data': 'username: validuser, password: validpassword'
                },
                {
                    'id': 1003,
                    'order': 3,
                    'description': 'Click the Login button',
                    'expected_result': 'User is successfully logged in and redirected to dashboard',
                    'test_data': ''
                }
            ],
            'attachments': [
                {
                    'id': 2001,
                    'name': 'screenshot.png',
                    'content_type': 'image/png',
                    'size': 12345,
                    'description': 'Screenshot of login page',
                    'created_by': 'john.doe',
                    'created_date': '2023-05-15T10:35:00Z'
                }
            ]
        }
    
    def test_to_canonical(self) -> None:
        """Test conversion from qTest to canonical model."""
        canonical = self.mapper.to_canonical(self.qtest_case)
        
        # Check basic fields
        self.assertEqual('12345', canonical.id)
        self.assertEqual('Login Validation Test', canonical.name)
        self.assertEqual('This test case validates the login functionality', canonical.description)
        self.assertEqual('Verify user can log in with valid credentials', canonical.objective)
        self.assertEqual('User account exists in the system', canonical.preconditions)
        self.assertEqual('100', canonical.folder_path)
        self.assertEqual('TC-123', canonical.external_id)
        self.assertEqual('qtest', canonical.source_system)
        
        # Check status and priority
        self.assertEqual(TestCaseStatus.APPROVED, canonical.status)
        self.assertEqual(Priority.CRITICAL, canonical.priority)
        
        # Check steps
        self.assertEqual(3, len(canonical.test_steps))
        self.assertEqual('1001', canonical.test_steps[0].id)
        self.assertEqual(1, canonical.test_steps[0].order)
        self.assertEqual('Navigate to the login page', canonical.test_steps[0].action)
        self.assertEqual('Login page is displayed', canonical.test_steps[0].expected_result)
        
        self.assertEqual('1002', canonical.test_steps[1].id)
        self.assertEqual(2, canonical.test_steps[1].order)
        self.assertEqual('Enter valid username and password', canonical.test_steps[1].action)
        self.assertEqual('Credentials are accepted', canonical.test_steps[1].expected_result)
        self.assertEqual('username: validuser, password: validpassword', canonical.test_steps[1].data)
        self.assertTrue(canonical.test_steps[1].is_data_driven)
        
        # Check tags
        self.assertEqual(3, len(canonical.tags))
        self.assertEqual('login', canonical.tags[0].name)
        self.assertEqual('authentication', canonical.tags[1].name)
        self.assertEqual('critical', canonical.tags[2].name)
        
        # Check custom fields
        custom_fields = {field.name: field.value for field in canonical.custom_fields}
        self.assertEqual('Custom Value 1', custom_fields.get('Custom Field 1'))
        
        # Check attachments
        self.assertEqual(1, len(canonical.attachments))
        self.assertEqual('2001', canonical.attachments[0].id)
        self.assertEqual('screenshot.png', canonical.attachments[0].file_name)
        self.assertEqual('image/png', canonical.attachments[0].file_type)
        self.assertEqual(12345, canonical.attachments[0].size)
        self.assertEqual('Screenshot of login page', canonical.attachments[0].description)
        self.assertEqual('john.doe', canonical.attachments[0].uploaded_by)
        
        # Check user information
        self.assertEqual('john.doe', canonical.created_by.id)
        self.assertEqual('john.doe', canonical.created_by.username)
        self.assertEqual('jane.smith', canonical.updated_by.id)
        self.assertEqual('jane.smith', canonical.updated_by.username)
        
    def test_from_canonical(self) -> None:
        """Test conversion from canonical model to qTest."""
        # Create a canonical test case
        canonical = CanonicalTestCase(
            id='12345',
            name='Login Validation Test',
            objective='Verify user can log in with valid credentials',
            status=TestCaseStatus.APPROVED,
            priority=Priority.CRITICAL,
            description='This test case validates the login functionality',
            preconditions='User account exists in the system',
            folder_path='100',
            external_id='TC-123',
            source_system='qtest'
        )
        
        # Add steps
        canonical.test_steps = [
            CanonicalTestStep(
                id='1001',
                order=1,
                action='Navigate to the login page',
                expected_result='Login page is displayed',
                data='',
                is_data_driven=False
            ),
            CanonicalTestStep(
                id='1002',
                order=2,
                action='Enter valid username and password',
                expected_result='Credentials are accepted',
                data='username: validuser, password: validpassword',
                is_data_driven=True
            )
        ]
        
        # Add tags
        canonical.tags = [
            CanonicalTag(name='login'),
            CanonicalTag(name='authentication')
        ]
        
        # Convert to qTest format
        qtest_case = self.mapper.from_canonical(canonical)
        
        # Check basic fields
        self.assertEqual('Login Validation Test', qtest_case['name'])
        self.assertEqual('This test case validates the login functionality', qtest_case['description'])
        self.assertEqual(100, qtest_case['parent_id'])
        
        # Check properties
        properties = {prop['field_name']: prop['field_value'] for prop in qtest_case['properties']}
        self.assertEqual('Verify user can log in with valid credentials', properties['Objective'])
        self.assertEqual('User account exists in the system', properties['Precondition'])
        self.assertEqual('1', properties['Priority'])  # CRITICAL
        self.assertEqual('3', properties['Status'])    # APPROVED
        
        # Check steps
        self.assertEqual(2, len(qtest_case['test_steps']))
        self.assertEqual(1, qtest_case['test_steps'][0]['order'])
        self.assertEqual('Navigate to the login page', qtest_case['test_steps'][0]['description'])
        self.assertEqual('Login page is displayed', qtest_case['test_steps'][0]['expected_result'])
        
        self.assertEqual(2, qtest_case['test_steps'][1]['order'])
        self.assertEqual('Enter valid username and password', qtest_case['test_steps'][1]['description'])
        self.assertEqual('Credentials are accepted', qtest_case['test_steps'][1]['expected_result'])
        self.assertEqual('username: validuser, password: validpassword', qtest_case['test_steps'][1]['test_data'])
        
        # Check tags
        self.assertEqual(['login', 'authentication'], qtest_case['tags'])


class QTestTestExecutionMapperTests(unittest.TestCase):
    """Tests for the QTestTestExecutionMapper."""
    
    def setUp(self) -> None:
        """Set up the test case."""
        self.mapper = QTestTestExecutionMapper()
        
        # Sample qTest test execution data
        self.qtest_execution: Dict[str, Any] = {
            'test_run': {
                'id': 5000,
                'name': 'Login Test Run',
                'test_case': {
                    'id': 12345
                },
                'test_cycle': {
                    'id': 500
                }
            },
            'test_log': {
                'id': 6000,
                'status': {
                    'name': 'PASSED'
                },
                'note': 'Test executed successfully',
                'execution_date': '2023-05-25T09:15:00Z',
                'executed_by': 'jane.smith',
                'execution_time_seconds': 120,
                'properties': [
                    {
                        'field_name': 'Environment',
                        'field_value': 'Production'
                    }
                ],
                'test_step_logs': [
                    {
                        'test_step_id': 1001,
                        'order': 1,
                        'status': {
                            'name': 'PASSED'
                        },
                        'actual_result': 'Login page loaded correctly',
                        'note': 'Step executed without issues'
                    },
                    {
                        'test_step_id': 1002,
                        'order': 2,
                        'status': {
                            'name': 'PASSED'
                        },
                        'actual_result': 'Credentials accepted',
                        'note': 'Entered test credentials'
                    }
                ],
                'defects': [
                    {
                        'id': 8001,
                        'summary': 'Minor UI issue'
                    }
                ]
            }
        }
    
    def test_to_canonical(self) -> None:
        """Test conversion from qTest to canonical model."""
        canonical = self.mapper.to_canonical(self.qtest_execution)
        
        # Check basic fields
        self.assertEqual('6000', canonical.id)
        self.assertEqual('12345', canonical.test_case_id)
        self.assertEqual(ExecutionStatus.PASSED, canonical.status)
        self.assertEqual('Test executed successfully', canonical.description)
        self.assertEqual('Production', canonical.environment)
        self.assertEqual('500', canonical.test_cycle_id)
        self.assertEqual(120, canonical.execution_time)
        
        # Check execution metadata
        self.assertEqual('jane.smith', canonical.executed_by.id)
        self.assertEqual('jane.smith', canonical.executed_by.username)
        
        # Check step results
        self.assertEqual(2, len(canonical.step_results))
        self.assertEqual('1001', canonical.step_results[0].step_id)
        self.assertEqual(ExecutionStatus.PASSED, canonical.step_results[0].status)
        self.assertEqual('Login page loaded correctly', canonical.step_results[0].actual_result)
        
        # Check defects
        self.assertEqual(1, len(canonical.defects))
        self.assertEqual('8001', canonical.defects[0])
        
    def test_from_canonical(self) -> None:
        """Test conversion from canonical model to qTest."""
        # Create a canonical test execution
        canonical = CanonicalTestExecution(
            id='6000',
            test_case_id='12345',
            status=ExecutionStatus.PASSED
        )
        
        # Set additional fields
        canonical.environment = 'Production'
        canonical.test_cycle_id = '500'
        canonical.execution_time = 120
        canonical.description = 'Test executed successfully'
        
        # Add executed by
        canonical.executed_by = CanonicalUser(
            id='jane.smith',
            username='jane.smith'
        )
        
        # Add step results
        step1 = CanonicalStepResult(
            step_id='1001',
            status=ExecutionStatus.PASSED,
            actual_result='Login page loaded correctly',
            notes='Step executed without issues'
        )
        step1.metadata['sequence'] = 1
        
        step2 = CanonicalStepResult(
            step_id='1002',
            status=ExecutionStatus.PASSED,
            actual_result='Credentials accepted',
            notes='Entered test credentials'
        )
        step2.metadata['sequence'] = 2
        
        canonical.step_results = [step1, step2]
        
        # Add defects
        canonical.defects = ['8001']
        
        # Convert to qTest format
        qtest_log = self.mapper.from_canonical(canonical)
        
        # Check basic fields
        self.assertEqual('PASSED', qtest_log['status']['name'])
        self.assertEqual('Test executed successfully', qtest_log['note'])
        self.assertEqual('12345', qtest_log['test_case_id'])
        
        # Check properties
        properties = {prop['field_name']: prop['field_value'] for prop in qtest_log['properties']}
        self.assertEqual('Production', properties['Environment'])
        
        # Check execution metadata
        self.assertEqual('jane.smith', qtest_log['executed_by'])
        self.assertEqual(120, qtest_log['execution_time_seconds'])
        
        # Check step results
        self.assertEqual(2, len(qtest_log['test_step_logs']))
        self.assertEqual('1001', qtest_log['test_step_logs'][0]['test_step_id'])
        self.assertEqual(1, qtest_log['test_step_logs'][0]['order'])
        self.assertEqual('PASSED', qtest_log['test_step_logs'][0]['status']['name'])
        self.assertEqual('Login page loaded correctly', qtest_log['test_step_logs'][0]['actual_result'])
        
        # Check defects
        self.assertEqual(1, len(qtest_log['defects']))
        self.assertEqual('8001', qtest_log['defects'][0]['id'])


if __name__ == '__main__':
    unittest.main()