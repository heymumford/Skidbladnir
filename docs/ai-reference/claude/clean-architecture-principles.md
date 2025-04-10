# Clean Architecture Principles for Skidbladnir

## Core Principles

1. **Independence of Frameworks**: The architecture does not depend on the existence of some library of feature-laden software. This allows you to use frameworks as tools, rather than forcing you to cram your system into the framework's constraints.

2. **Testability**: The business rules can be tested without the UI, database, web server, or any other external element.

3. **Independence of UI**: The UI can change easily, without changing the rest of the system. A web UI could be replaced with a console UI, for example, without changing the business rules.

4. **Independence of Database**: You can swap out Oracle or SQL Server for MongoDB, BigTable, CouchDB, or something else. Your business rules are not bound to the database.

5. **Independence of any External Agency**: In fact, your business rules don't know anything at all about the interfaces to the outside world.

## Layer Structure

Our architecture is organized in these concentric layers (from inner to outer):

### 1. Domain Layer (Entities)

- Contains enterprise-wide business rules and entities
- Has no dependencies on outer layers or external libraries
- Consists of pure TypeScript/Python/Go with minimal dependencies
- All domain objects must be immutable
- Domain logic must be free of side effects
- Core business rules live here
- No frameworks, no UI, no databases

### 2. Use Case Layer

- Contains application-specific business rules
- Orchestrates the flow of data to and from entities
- Contains the business logic specific to a use case
- Depends only on the domain layer
- No dependencies on outer layers
- May contain interfaces that outer layers must implement

### 3. Interface Adapters Layer

- Converts data from the format most convenient for use cases and entities
- Includes presenters, controllers, and gateways
- May depend on use case and domain layers
- Contains all necessary adapters for use cases to interact with external interfaces
- Translates between the domain model and external representations
- No direct domain logic or business rules

### 4. Infrastructure Layer

- Contains frameworks, tools, and drivers
- Implements interfaces defined in inner layers
- Includes databases, web frameworks, devices, etc.
- May depend on all inner layers
- No business logic in this layer
- Adapts external interfaces to the needs of the application

## Cross-Cutting Rules

1. **Dependency Rule**: Source code dependencies must point only inward, toward higher-level policies. Nothing in an inner circle can know anything about something in an outer circle.

2. **Boundary Crossing**: When crossing boundaries between layers, data must be in the form most convenient for the inner layer.

3. **Interface Segregation**: Interfaces should be tailored to the needs of the client, not the implementer.

4. **Interface Ownership**: Interfaces belong to the clients, not to the implementations. The client owns the abstract interface.

5. **Humble Objects**: Keep objects responsible for hard-to-test functionality humble by moving as much logic as possible into separate, easily testable objects.

## Language-Specific Guidelines

### TypeScript

- Use interfaces for all boundary crossings
- Use readonly modifiers for immutability
- Use dependency injection for infrastructure dependencies
- Error handling with custom domain error types

### Python

- Use abstract base classes for interfaces
- Use dataclasses for immutable domain objects
- Use dependency injection (constructor injection)
- Error handling with custom exception hierarchies

### Go

- Use interfaces for boundary crossing
- Use structs for domain objects
- Use dependency injection pattern
- Error handling with proper error types

## Cross-Language Consistency Rules

1. Use the same naming conventions for domain concepts across languages
2. Maintain the same error handling patterns
3. Ensure consistent validation rules
4. Use equivalent immutability patterns
5. Maintain consistent serialization/deserialization approaches