"""
Example usage of the LLM Troubleshooting Assistant.
"""

import os
import sys
import json
import logging
from typing import Dict, Any

# Ensure parent directory is in path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from llm_assistant.services.llm_service import LLMService
from llm_assistant.services.knowledge_service import KnowledgeService
from llm_assistant.services.troubleshooter import LLMTroubleshooter
from llm_assistant.models.troubleshooting_models import TechnicalLevel, ErrorType, Provider


def setup_logging():
    """Set up logging configuration."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )


def demonstrate_error_analysis():
    """Demonstrate error analysis functionality."""
    print("\n=== Error Analysis Demonstration ===\n")
    
    # Initialize the troubleshooter
    troubleshooter = LLMTroubleshooter()
    troubleshooter.load_model()
    
    # Example error data
    error_data = {
        "status_code": 401,
        "message": "Authentication failed",
        "provider": "zephyr",
        "operation": "get_test_cases",
        "request_id": "req-123456",
        "timestamp": "2025-01-01T12:00:00Z",
        "endpoint": "/api/v1/test-cases"
    }
    
    # Analyze the error
    analysis = troubleshooter.analyze_error(error_data)
    
    print(f"Error Type: {analysis.error_type}")
    print(f"Root Cause: {analysis.root_cause}")
    print(f"Severity: {analysis.severity}")
    print(f"Confidence: {analysis.confidence}")
    print(f"Affected Component: {analysis.affected_component}")


def demonstrate_remediation_generation():
    """Demonstrate remediation generation functionality."""
    print("\n=== Remediation Generation Demonstration ===\n")
    
    # Initialize the troubleshooter
    troubleshooter = LLMTroubleshooter()
    troubleshooter.load_model()
    
    # Example error data
    error_data = {
        "status_code": 429,
        "message": "Rate limit exceeded",
        "provider": "qtest",
        "operation": "create_test_case",
        "request_id": "req-123456",
        "timestamp": "2025-01-01T12:00:00Z",
        "endpoint": "/api/v3/projects/12345/test-cases"
    }
    
    # Analyze the error
    analysis = troubleshooter.analyze_error(error_data)
    
    # Generate remediation steps for different technical levels
    for level in [TechnicalLevel.BASIC, TechnicalLevel.INTERMEDIATE, TechnicalLevel.ADVANCED]:
        print(f"\nRemediation Steps for {level.value} level:")
        remediation = troubleshooter.generate_remediation(analysis, level)
        
        for i, step in enumerate(remediation.steps, 1):
            print(f"{i}. {step.action} (Priority: {step.priority})")
            print(f"   Details: {step.details}")
            if step.code_snippet:
                print(f"   Code Snippet: {step.code_snippet[:50]}...")
            if step.documentation_link:
                print(f"   Documentation: {step.documentation_link}")
        
        print(f"\nSuccess Probability: {remediation.success_probability}")
        print(f"Estimated Time: {remediation.estimated_time}")
        
        if remediation.side_effects:
            print("\nPotential Side Effects:")
            for effect in remediation.side_effects:
                print(f"- {effect}")
        
        if remediation.alternative_approaches:
            print("\nAlternative Approaches:")
            for alt in remediation.alternative_approaches:
                print(f"- {alt}")


def demonstrate_error_explanation():
    """Demonstrate error explanation functionality."""
    print("\n=== Error Explanation Demonstration ===\n")
    
    # Initialize the troubleshooter
    troubleshooter = LLMTroubleshooter()
    troubleshooter.load_model()
    
    # Example error data
    error_data = {
        "status_code": 404,
        "message": "Resource not found",
        "provider": "zephyr",
        "operation": "get_test_case",
        "request_id": "req-123456",
        "timestamp": "2025-01-01T12:00:00Z",
        "endpoint": "/api/v1/test-cases/TC-123"
    }
    
    # Analyze the error
    analysis = troubleshooter.analyze_error(error_data)
    
    # Generate explanations for different technical levels
    for level in [TechnicalLevel.BASIC, TechnicalLevel.INTERMEDIATE, TechnicalLevel.ADVANCED]:
        print(f"\nExplanation for {level.value} level:")
        explanation = troubleshooter.explain_error(analysis, level)
        
        print(f"Explanation: {explanation.explanation}")
        if explanation.analogy:
            print(f"Analogy: {explanation.analogy}")
        
        if explanation.prevention_tips:
            print("\nPrevention Tips:")
            for tip in explanation.prevention_tips:
                print(f"- {tip}")
        
        if explanation.related_concepts:
            print("\nRelated Concepts:")
            for concept in explanation.related_concepts:
                print(f"- {concept}")


def demonstrate_code_example_generation():
    """Demonstrate code example generation functionality."""
    print("\n=== Code Example Generation Demonstration ===\n")
    
    # Initialize the troubleshooter
    troubleshooter = LLMTroubleshooter()
    troubleshooter.load_model()
    
    # Generate code examples for different languages and error types
    languages = ["javascript", "typescript", "python"]
    error_types = [ErrorType.AUTHENTICATION, ErrorType.RATE_LIMIT, ErrorType.RESOURCE_NOT_FOUND]
    
    for language in languages:
        for error_type in error_types:
            print(f"\nCode Example for {error_type} in {language}:")
            context = {
                "provider": "qTest",
                "operation": "create_test_case",
                "base_url": "https://yourcompany.qtestnet.com/api/v3"
            }
            
            code_example = troubleshooter.generate_code_example(language, error_type, context)
            
            print(f"Explanation: {code_example.explanation}")
            
            if code_example.imports:
                print("\nImports:")
                for imp in code_example.imports:
                    print(f"- {imp}")
            
            if code_example.dependencies:
                print("\nDependencies:")
                for dep in code_example.dependencies:
                    print(f"- {dep}")
            
            print("\nCode:")
            # Print first 10 lines of code
            code_lines = code_example.code.split("\n")
            for i, line in enumerate(code_lines[:10]):
                print(f"{i+1}: {line}")
            if len(code_lines) > 10:
                print("... (truncated)")


def demonstrate_complete_troubleshooting_guide():
    """Demonstrate complete troubleshooting guide generation."""
    print("\n=== Complete Troubleshooting Guide Demonstration ===\n")
    
    # Initialize the troubleshooter
    troubleshooter = LLMTroubleshooter()
    troubleshooter.load_model()
    
    # Example error data
    error_data = {
        "status_code": 401,
        "message": "Authentication failed: Invalid token",
        "provider": "zephyr",
        "operation": "get_test_cases",
        "request_id": "req-123456",
        "timestamp": "2025-01-01T12:00:00Z",
        "endpoint": "/api/v1/test-cases"
    }
    
    # Generate a complete troubleshooting guide
    guide = troubleshooter.get_complete_troubleshooting_guide(
        error_data, 
        TechnicalLevel.INTERMEDIATE
    )
    
    print("=== Error Analysis ===")
    print(f"Error Type: {guide['error_analysis']['error_type']}")
    print(f"Root Cause: {guide['error_analysis']['root_cause']}")
    print(f"Severity: {guide['error_analysis']['severity']}")
    print(f"Confidence: {guide['error_analysis']['confidence']}")
    
    print("\n=== Remediation Steps ===")
    for i, step in enumerate(guide['remediation']['steps'], 1):
        print(f"{i}. {step['action']} (Priority: {step['priority']})")
        print(f"   Details: {step['details']}")
    
    print("\n=== Plain Language Explanation ===")
    print(guide['explanation']['explanation'])
    if 'analogy' in guide['explanation'] and guide['explanation']['analogy']:
        print(f"Analogy: {guide['explanation']['analogy']}")
    
    print("\n=== Code Example ===")
    print(f"Language: {guide['code_example']['language']}")
    print(f"Explanation: {guide['code_example']['explanation']}")
    
    # Print first 5 lines of code
    code_lines = guide['code_example']['code'].split("\n")
    for i, line in enumerate(code_lines[:5]):
        print(f"{i+1}: {line}")
    if len(code_lines) > 5:
        print("... (truncated)")
    
    print("\n=== Knowledge References ===")
    for i, ref in enumerate(guide['knowledge_references'], 1):
        print(f"{i}. {ref['title']} (Relevance: {ref['relevance_score']:.2f})")
        print(f"   Type: {ref['type']}, Provider: {ref['provider']}")


def demonstrate_knowledge_search():
    """Demonstrate knowledge base search functionality."""
    print("\n=== Knowledge Base Search Demonstration ===\n")
    
    # Initialize the troubleshooter
    troubleshooter = LLMTroubleshooter()
    
    # Search the knowledge base
    query = "how to handle rate limiting in Zephyr API"
    results = troubleshooter.search_knowledge_base(query)
    
    print(f"Search Results for '{query}':")
    for i, result in enumerate(results, 1):
        print(f"{i}. {result['title']} (Relevance: {result['relevance_score']:.2f})")
        print(f"   Type: {result['type']}, Provider: {result['provider']}")
        if i < 3:  # Show content excerpt for top results
            excerpt = result['content'][:100] + ("..." if len(result['content']) > 100 else "")
            print(f"   Excerpt: {excerpt}")
        print()


def demonstrate_provider_status_check():
    """Demonstrate provider status check functionality."""
    print("\n=== Provider Status Check Demonstration ===\n")
    
    # Initialize the troubleshooter
    troubleshooter = LLMTroubleshooter()
    
    # Check provider status
    for provider in [Provider.ZEPHYR, Provider.QTEST]:
        status = troubleshooter.check_provider_status(provider)
        
        print(f"{provider.value} API Status:")
        print(f"Status: {status['status']}")
        print(f"Response Time: {status['response_time']}")
        print(f"Last Checked: {status['last_checked']}")
        if 'rate_limit_remaining' in status:
            print(f"Rate Limit Remaining: {status['rate_limit_remaining']}")
        if 'known_issues' in status and status['known_issues']:
            print("Known Issues:")
            for issue in status['known_issues']:
                print(f"- {issue}")
        print()


def main():
    """Main function to demonstrate the LLM Troubleshooting Assistant."""
    setup_logging()
    
    print("=" * 50)
    print("  LLM Troubleshooting Assistant Demonstration")
    print("=" * 50)
    
    demonstrate_error_analysis()
    demonstrate_remediation_generation()
    demonstrate_error_explanation()
    demonstrate_code_example_generation()
    demonstrate_complete_troubleshooting_guide()
    demonstrate_knowledge_search()
    demonstrate_provider_status_check()


if __name__ == "__main__":
    main()