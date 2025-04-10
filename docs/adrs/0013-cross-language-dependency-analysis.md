# ADR 0013: Cross-Language Dependency Analysis

## Status

Accepted

## Date

2025-04-10

## Context

Skidbladnir is a polyglot application with components written in TypeScript, Python, and Go. These components communicate with each other through well-defined APIs, but we have observed several challenges:

1. **Invisible Dependencies**: Service dependencies are not always explicitly declared
2. **Hidden API Usage**: It's difficult to track which services are using which APIs
3. **Dependency Validation**: We need to verify that services only depend on APIs that are actually provided
4. **Cross-Language Architectural Drift**: Services developed in different languages may drift apart architecturally
5. **Circular Dependencies**: Detecting circular dependencies across service boundaries is challenging
6. **Documentation Gap**: Service interaction patterns are not well documented

While our existing architecture validation tools ensure clean architecture within each language, they don't address cross-service dependencies. This gap in our validation suite has led to several issues:

- Services using APIs that other services don't document as public
- Circular dependencies between services
- Difficulty tracking the impact of API changes
- Challenges in visualizing and understanding the overall system architecture

## Decision

We will implement a Cross-Language Dependency Analyzer that analyzes, validates, and visualizes dependencies between services implemented in different languages. The analyzer will:

1. **Identify Service Boundaries**: Map services to their respective directories and languages
2. **Detect API Usage**: Identify HTTP client calls and API endpoint usage
3. **Validate Dependencies**: Ensure that services only depend on APIs that are explicitly provided
4. **Detect Circular Dependencies**: Identify circular dependencies between services
5. **Generate Visualizations**: Create Mermaid diagrams showing service dependencies

The analyzer will be implemented as part of our architecture validation suite and will be integrated into our existing CLI tool. It will:

- Allow for both manual and automated validation of cross-language dependencies
- Generate comprehensive reports of service dependencies
- Create visualizations to aid in understanding system architecture
- Be run as part of the CI/CD pipeline

We will define a service configuration model that explicitly declares:
- Service name and port
- Implementing language
- Expected dependencies
- Provided APIs
- Consumed APIs
- Directory patterns

This model will serve as the "ground truth" for validating actual code patterns against intended architecture.

## Implementation

The implementation will consist of:

1. **Service Mapping**: Define service boundaries, provided and consumed APIs, and directory patterns
2. **API Usage Detection**: Implement language-specific parsers to detect API calls
3. **Dependency Validation**: Validate that services only depend on APIs that are provided
4. **Circular Dependency Detection**: Detect circular dependencies between services
5. **Visualization Generation**: Generate Mermaid diagrams showing service dependencies
6. **CLI Integration**: Integrate with the existing architecture validation CLI

The analyzer will be implemented in TypeScript and will be designed to analyze code in all three languages used in the project.

## Consequences

### Positive

- **Improved Architecture Integrity**: Ensures that service dependencies are explicitly declared and valid
- **Better Documentation**: Provides clear visualization of service dependencies
- **Reduced Architecture Drift**: Prevents services from becoming entangled in unexpected ways
- **Easier Refactoring**: Makes it safer to change service APIs
- **Enhanced Understanding**: Helps developers understand the system's service boundaries
- **Proactive Issue Detection**: Identifies potential problems before they cause runtime issues
- **Visualization**: Makes the service architecture more accessible to new team members

### Negative

- **Additional Maintenance**: Requires keeping service definitions up-to-date
- **False Positives**: May flag legitimate API uses that don't match our pattern detection
- **Added Complexity**: Introduces another validation layer
- **Implementation Effort**: Requires significant upfront investment in the analyzer

### Neutral

- **Development Workflow Changes**: Developers will need to explicitly declare service dependencies
- **Documentation Requirements**: Service definitions will need to be maintained alongside implementation

## Implementation Details

### Service Definition Model

```typescript
type ServiceMapping = {
  name: string;
  port: number;
  language: 'typescript' | 'python' | 'go';
  dependencies: {
    service: string;
    type: 'required' | 'optional';
  }[];
  providedApis: string[];
  consumedApis: string[];
  sourcePattern: RegExp;
};
```

### API Detection Patterns

The analyzer will detect API interactions using:

1. **URL Pattern Matching**: Detect URLs that match service patterns
2. **HTTP Client Detection**: Identify HTTP client calls in each language:
   - TypeScript/JavaScript: `fetch()`, `axios`, etc.
   - Python: `requests`, `httpx`, etc.
   - Go: `http.Get()`, `client.Do()`, etc.
3. **Endpoint Pattern Matching**: Identify API endpoints based on path patterns

### Integration with Existing Validators

The cross-language dependency analyzer will complement our existing validators:
- `ArchitectureValidator`: Ensures clean architecture within TypeScript
- `CircularDependencyValidator`: Detects circular dependencies within a language
- `PolyglotArchitectureValidator`: Ensures clean architecture across languages

### CLI Usage

```bash
# Check cross-language dependencies
npm run check:architecture -- --cross-language

# Generate dependency diagram
npm run check:architecture -- --cross-language --diagram

# Save diagram to file
npm run check:architecture -- --cross-language --diagram --diagram-output diagram.md
```

## Adoption Strategy

1. **Define Core Services**: Start with definitions for core services (API, Orchestrator, Binary Processor)
2. **Run Initial Analysis**: Analyze current codebase and document existing patterns
3. **Fix Issues**: Address any existing issues in service dependencies
4. **CI Integration**: Add cross-language dependency checks to CI pipeline
5. **Documentation**: Update development guidelines to include service dependency declarations

## References

- [Clean Architecture Principles](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [C4 Model for Software Architecture](https://c4model.com/)
- [Mermaid Diagram Syntax](https://mermaid-js.github.io/mermaid/)