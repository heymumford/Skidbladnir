"""
Example usage of the LLM Advisor for Zephyr and qTest APIs.
"""

import os
import sys
import json
import logging
from typing import Dict, Any

# Ensure parent directory is in path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from llm_advisor.services.llm_assistant import LLMAssistant
from llm_advisor.providers.zephyr_advisor import ZephyrApiAdvisor
from llm_advisor.providers.qtest_advisor import QTestApiAdvisor
from llm_advisor.providers.migration_advisor import MigrationAdvisor


def setup_logging():
    """Set up logging configuration."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )


def demonstrate_error_analysis():
    """Demonstrate error analysis functionality."""
    print("\n=== Error Analysis Demonstration ===\n")
    
    # Initialize the assistant
    assistant = LLMAssistant()
    assistant.load_model()
    
    # Example error data
    error_data = {
        "status_code": 401,
        "message": "Authentication failed",
        "request_id": "req-123456",
        "timestamp": "2025-01-01T12:00:00Z",
        "endpoint": "/api/v1/test-cases"
    }
    
    # Analyze the error
    analysis = assistant.analyze_error(error_data)
    
    print(f"Error Type: {analysis.error_type}")
    print(f"Root Cause: {analysis.root_cause}")
    print(f"Severity: {analysis.severity}")
    print(f"Confidence: {analysis.confidence}")
    print(f"Affected Component: {analysis.affected_component}")
    
    # Generate remediation steps
    steps = assistant.generate_remediation_steps(analysis)
    
    print("\nRemediation Steps:")
    for i, step in enumerate(steps, 1):
        print(f"{i}. {step.step} (Priority: {step.priority})")
        print(f"   Details: {step.details}")
        if step.code_example:
            print(f"   Code Example: {step.code_example.split()[0]}...")
    
    # Generate plain language explanation
    explanation = assistant.explain_error_in_plain_language(analysis)
    print(f"\nPlain Language Explanation:\n{explanation}")


def demonstrate_provider_specific_advisors():
    """Demonstrate provider-specific advisors."""
    print("\n=== Provider-Specific Advisors Demonstration ===\n")
    
    # Initialize provider-specific advisors
    llm_assistant = LLMAssistant()
    llm_assistant.load_model()
    
    zephyr_advisor = ZephyrApiAdvisor(llm_assistant)
    qtest_advisor = QTestApiAdvisor(llm_assistant)
    
    # Example Zephyr error
    zephyr_error = {
        "status_code": 401,
        "message": "JWT expired at 2025-01-01T00:00:00Z",
        "error_id": "auth-001",
        "context": {
            "endpoint": "/api/v1/testcases",
            "project": "ZEPHYR-123"
        }
    }
    
    # Example qTest error
    qtest_error = {
        "status_code": 404,
        "message": "Project not found",
        "error_code": "qTest-404",
        "context": {
            "endpoint": "/api/v3/projects/999999/test-cases",
            "project_id": 999999
        }
    }
    
    # Analyze Zephyr error
    print("Zephyr Error Analysis:")
    zephyr_analysis = zephyr_advisor.analyze_zephyr_error(zephyr_error)
    print(f"Error Type: {zephyr_analysis.error_type}")
    print(f"Root Cause: {zephyr_analysis.root_cause}")
    
    zephyr_steps = zephyr_advisor.get_zephyr_remediation_steps(zephyr_analysis)
    print("\nZephyr Remediation Steps:")
    for i, step in enumerate(zephyr_steps, 1):
        print(f"{i}. {step.step}")
    
    # Analyze qTest error
    print("\nqTest Error Analysis:")
    qtest_analysis = qtest_advisor.analyze_qtest_error(qtest_error)
    print(f"Error Type: {qtest_analysis.error_type}")
    print(f"Root Cause: {qtest_analysis.root_cause}")
    
    qtest_steps = qtest_advisor.get_qtest_remediation_steps(qtest_analysis)
    print("\nqTest Remediation Steps:")
    for i, step in enumerate(qtest_steps, 1):
        print(f"{i}. {step.step}")


def demonstrate_migration_advisor():
    """Demonstrate migration advisor functionality."""
    print("\n=== Migration Advisor Demonstration ===\n")
    
    # Initialize migration advisor
    migration_advisor = MigrationAdvisor()
    
    # Example migration error
    migration_error = {
        "status_code": 400,
        "message": "Field mapping error: Priority field has invalid value",
        "source": "transformation",
        "context": {
            "source_field": "priority",
            "target_field": "Priority",
            "source_value": "Critical",
            "expected_format": "P0, P1, P2, P3"
        }
    }
    
    # Analyze migration error
    analysis, source = migration_advisor.analyze_migration_error(migration_error)
    
    print(f"Error Analysis:")
    print(f"Error Type: {analysis.error_type}")
    print(f"Root Cause: {analysis.root_cause}")
    print(f"Source System: {source}")
    
    # Generate remediation steps
    steps = migration_advisor.get_migration_remediation_steps(analysis, source)
    
    print("\nRemediation Steps:")
    for i, step in enumerate(steps, 1):
        print(f"{i}. {step.step}")
        print(f"   Details: {step.details}")
    
    # Example source and target fields for mapping recommendation
    source_fields = ["name", "description", "priority", "component", "status", "steps", "labels"]
    target_fields = ["name", "description", "Priority", "module", "status", "test-steps", "tags"]
    
    # Generate field mapping recommendation
    mapping = migration_advisor.generate_field_mapping_recommendation(source_fields, target_fields)
    
    print("\nField Mapping Recommendations:")
    for source_field, recommendation in mapping.items():
        target = recommendation.get("target_field") or "NO MATCH"
        confidence = recommendation.get("confidence", 0) * 100
        print(f"{source_field} -> {target} (Confidence: {confidence:.1f}%)")
    
    # Example migration progress data
    progress_data = {
        "total": 500,
        "processed": 250,
        "successful": 235,
        "failed": 15,
        "current_stage": "Migrating test cases with attachments",
        "estimated_time_remaining": 180
    }
    
    # Generate progress update
    update = migration_advisor.generate_migration_progress_update(progress_data)
    print(f"\nMigration Progress Update:\n{update}")


def demonstrate_workflow_optimization():
    """Demonstrate workflow optimization functionality."""
    print("\n=== Workflow Optimization Demonstration ===\n")
    
    # Initialize the assistant
    assistant = LLMAssistant()
    assistant.load_model()
    
    # Example workflow configuration
    workflow = {
        "operations": [
            {"id": "op1", "name": "authenticate", "dependencies": []},
            {"id": "op2", "name": "get_projects", "dependencies": ["op1"]},
            {"id": "op3", "name": "get_test_cases", "dependencies": ["op2"]},
            {"id": "op4", "name": "get_users", "dependencies": ["op1"]},
            {"id": "op5", "name": "get_attachments", "dependencies": ["op3"]}
        ],
        "parallel_candidates": ["op2", "op4"],
        "cacheable_operations": ["op2", "op4"],
        "batch_candidates": ["op3", "op5"]
    }
    
    # Get optimization suggestions
    suggestions = assistant.suggest_api_workflow_improvements(workflow)
    
    print("Workflow Optimization Suggestions:")
    
    print("\nOptimizations:")
    for i, opt in enumerate(suggestions["optimizations"], 1):
        print(f"{i}. {opt['type']}: {opt['description']}")
        print(f"   Operations: {', '.join(opt['operations'])}")
        print(f"   Estimated Speedup: {opt['estimated_speedup']}")
    
    print("\nReordering Suggestions:")
    for i, reorder in enumerate(suggestions["reordering"], 1):
        print(f"{i}. Move operation {reorder['operation']} " 
              f"from position {reorder['current_position']} " 
              f"to position {reorder['suggested_position']}")
        print(f"   Rationale: {reorder['rationale']}")
    
    # Demonstrate provider-specific workflow optimization
    print("\n=== Provider-Specific Workflow Optimization ===\n")
    
    zephyr_advisor = ZephyrApiAdvisor(assistant)
    qtest_advisor = QTestApiAdvisor(assistant)
    
    # Add test case operations to workflow
    workflow["operations"].extend([
        {"id": "op6", "name": "create_test_case", "dependencies": ["op2"]},
        {"id": "op7", "name": "update_test_case", "dependencies": ["op6"]},
        {"id": "op8", "name": "delete_test_case", "dependencies": ["op7"]}
    ])
    
    # Get Zephyr-specific suggestions
    zephyr_suggestions = zephyr_advisor.suggest_zephyr_workflow_optimizations(workflow)
    
    print("Zephyr-Specific Optimizations:")
    for opt in zephyr_suggestions["optimizations"]:
        if opt["type"].startswith("zephyr_"):
            print(f"- {opt['type']}: {opt['description']}")
            print(f"  Operations: {', '.join(opt['operations'])}")
            print(f"  Estimated Speedup: {opt['estimated_speedup']}")
    
    # Get qTest-specific suggestions
    qtest_suggestions = qtest_advisor.suggest_qtest_workflow_optimizations(workflow)
    
    print("\nqTest-Specific Optimizations:")
    for opt in qtest_suggestions["optimizations"]:
        if opt["type"].startswith("qtest_"):
            print(f"- {opt['type']}: {opt['description']}")
            print(f"  Operations: {', '.join(opt['operations'])}")
            print(f"  Estimated Speedup: {opt['estimated_speedup']}")


def main():
    """Main function to demonstrate the LLM Advisor."""
    setup_logging()
    
    print("=" * 50)
    print("  LLM Advisor for Zephyr and qTest APIs")
    print("=" * 50)
    
    demonstrate_error_analysis()
    demonstrate_provider_specific_advisors()
    demonstrate_migration_advisor()
    demonstrate_workflow_optimization()


if __name__ == "__main__":
    main()