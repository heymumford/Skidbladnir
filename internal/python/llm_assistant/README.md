# LLM Assistant for API Troubleshooting

## Overview

The LLM Assistant provides intelligent troubleshooting assistance for API integration challenges, particularly focused on Zephyr Scale and qTest APIs. It uses a local LLM to analyze errors, suggest remediation steps, explain issues in plain language, and generate code examples.

## Key Components

- **LLM Service**: Handles interactions with the local language model
- **Knowledge Service**: Manages a database of API documentation, error patterns, and code examples
- **Troubleshooter**: Coordinates error analysis and remediation
- **API Error Analyzer**: Identifies root causes of API errors
- **Remediation Generator**: Creates step-by-step troubleshooting instructions
- **Error Explainer**: Generates user-friendly explanations of technical errors
- **Code Example Generator**: Provides language-specific code examples for error handling

## Features

### Error Analysis

- Identifies root causes of API errors
- Classifies errors by type and severity
- Determines affected components
- Provides confidence scores for analyses

### Remediation Suggestions

- Generates step-by-step remediation instructions
- Adapts to different technical skill levels
- Includes code snippets and documentation links
- Prioritizes steps by effectiveness
- Suggests alternative approaches

### Plain Language Explanations

- Translates technical errors into plain language
- Provides real-world analogies for complex concepts
- Adapts explanations to user technical level
- Includes prevention tips and related concepts

### Code Examples

- Generates language-specific error handling code
- Supports JavaScript, TypeScript, Python, and more
- Includes best practices like exponential backoff
- Provides clear explanations and comments

## Usage

### Basic Usage

```python
from llm_assistant.services.troubleshooter import LLMTroubleshooter
from llm_assistant.models.troubleshooting_models import TechnicalLevel

# Initialize and load the model
troubleshooter = LLMTroubleshooter()
troubleshooter.load_model()

# Analyze an API error
error_data = {
    "status_code": 401,
    "message": "Authentication failed",
    "provider": "zephyr",
    "operation": "get_test_cases",
    "endpoint": "/api/v1/test-cases"
}
analysis = troubleshooter.analyze_error(error_data)
print(f"Error Type: {analysis.error_type}")
print(f"Root Cause: {analysis.root_cause}")

# Generate remediation steps
remediation = troubleshooter.generate_remediation(
    analysis, 
    TechnicalLevel.INTERMEDIATE
)
for step in remediation.steps:
    print(f"- {step.action}: {step.details}")

# Get a plain language explanation
explanation = troubleshooter.explain_error(
    analysis, 
    TechnicalLevel.INTERMEDIATE
)
print(explanation.explanation)

# Generate a code example
code_example = troubleshooter.generate_code_example(
    "javascript", 
    analysis.error_type
)
print(code_example.code)
```

### Complete Troubleshooting Guide

```python
# Generate a complete troubleshooting guide
guide = troubleshooter.get_complete_troubleshooting_guide(
    error_data, 
    TechnicalLevel.INTERMEDIATE
)

# The guide contains analysis, remediation, explanation, code example, and knowledge references
print(guide["error_analysis"])
print(guide["remediation"]["steps"])
print(guide["explanation"]["explanation"])
print(guide["code_example"]["code"])
```

### Knowledge Base Search

```python
# Search the knowledge base
results = troubleshooter.search_knowledge_base("rate limiting in Zephyr API")
for result in results:
    print(f"{result['title']} (Relevance: {result['relevance_score']})")
```

## Example Use Cases

1. **Interactive Troubleshooting**: When a user encounters an API error, provide instant analysis and step-by-step remediation instructions.

2. **Documentation Generation**: Automatically generate user-friendly troubleshooting guides for common error scenarios.

3. **Developer Assistance**: Help developers implement proper error handling with code examples and best practices.

4. **Training and Education**: Explain complex API concepts in plain language for users with varying technical backgrounds.

## Model Deployment

The LLM Assistant supports multiple deployment options:

1. **Embedded Mode**: Runs directly within the application
2. **Dedicated Container**: Runs in a separate container with dedicated resources 
3. **Clustered Mode**: Distributes model across multiple containers for higher throughput

## Requirements

- Python 3.8+
- Recommended: 16GB RAM, 8 CPU cores
- Optional: CUDA-compatible GPU for faster inference

## Examples

See the `examples` directory for complete usage examples:

- `assistant_example.py`: Demonstrates all key troubleshooting functionality