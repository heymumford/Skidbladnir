# XML Schema Validation

This document describes the XML Schema validation framework implemented in Skidbladnir. The framework ensures that XML files in the project adhere to their respective schemas, maintaining consistency and correctness.

## Overview

XML Schema validation is a critical part of ensuring data integrity in a system that processes XML files. Skidbladnir uses a TypeScript-based validation framework that:

1. Validates XML files against XSD schemas
2. Automatically detects and uses appropriate schemas based on XML namespaces
3. Provides detailed error reporting for invalid XML
4. Can be integrated into CI/CD pipelines

## XML Schema Validator

The XML Schema Validator is implemented in TypeScript and uses the `libxmljs2` library for XML parsing and validation. The validator provides several capabilities:

- Validating XML strings against schema strings
- Validating XML files against schema files
- Automatic schema detection based on XML namespaces
- Batch validation of multiple XML files
- Detailed error reporting

### Core Components

The validation framework consists of the following components:

1. **XmlSchemaValidator** - The main validation class that implements the validation logic
2. **CLI Tool** - A command-line interface for validating XML files
3. **XML Schema Repository** - A collection of XSD schemas used for validation
4. **Integration Tests** - Tests that validate real-world XML files in the project

## Usage

### Command-Line Interface

The XML Schema validation tool can be run from the command line using:

```bash
# Validate all XML files in the project
npm run test:xml

# Validate only POM files with verbose output
npm run test:xml:pom

# Run as part of linting
npm run lint:xml
```

### API Usage

You can use the XML Schema Validator programmatically in your code:

```typescript
import { XmlSchemaValidator } from './tests/unit/validation/xml-schema/XmlSchemaValidator';

// Validate a single XML file against a schema
const result = XmlSchemaValidator.validateXmlFile('path/to/file.xml', 'path/to/schema.xsd');

if (result.valid) {
  console.log('XML is valid!');
} else {
  console.error('XML validation errors:', result.errors);
}

// Validate all XML files in a directory
const results = XmlSchemaValidator.validateDirectory(
  'src/main',
  'schemas',
  '**/*.xml'
);

// Process results
for (const result of results) {
  if (!result.valid) {
    console.error(`Invalid XML: ${result.filePath}`);
    console.error('Errors:', result.errors);
  }
}
```

### Programmatic Methods

The validator provides the following methods:

- `validateXmlString(xmlString, xsdString)` - Validates XML content against an XSD schema
- `validateXmlFile(xmlFilePath, xsdFilePath)` - Validates an XML file against an XSD schema file
- `validateXmlFileWithAutoSchema(xmlFilePath, schemasDir)` - Automatically finds and uses the correct schema
- `validateDirectory(xmlDir, schemaDir, pattern)` - Validates all XML files in a directory

## Schema Repository

Skidbladnir maintains a repository of common XML schemas in the `schemas/` directory. These schemas are used for validation:

- `maven-4.0.0.xsd` - Schema for Maven POM files
- (Additional schemas as needed)

To download schemas, use the provided script:

```bash
./scripts/util/xml-validator.sh download
```

## Integration with CI/CD

XML Schema validation is integrated into the CI/CD pipeline:

1. **Linting Stage**: XML validation runs as part of the `npm run lint` command
2. **Pre-commit Hooks**: Validation can be configured to run before commits
3. **CI Pipeline**: Validation failures cause the build to fail

## Troubleshooting XML Validation Issues

If XML validation fails, follow these steps:

1. Run the validation with verbose output:
   ```bash
   npm run test:xml -- --verbose
   ```

2. Check for common issues:
   - Missing or incorrect namespace declarations
   - Structural errors in the XML
   - Missing required elements or attributes
   - Type mismatches (e.g., using a string where a number is expected)

3. Use the schema browser in an IDE to understand schema requirements.

4. For POM files, use Maven's validation:
   ```bash
   mvn validate -f path/to/pom.xml
   ```

## Best Practices

1. **Always validate modified XML files** before committing changes
2. **Update schemas** when new versions are available
3. **Keep XML files simple** and follow standard formatting
4. **Use namespace declarations** correctly
5. **Document custom XML formats** with XSD schemas

## Extending the Validator

To add support for a new XML format:

1. Add the XSD schema to the `schemas/` directory
2. Create a test case that validates files against the schema
3. Update the documentation to mention the new schema
4. If necessary, extend the validator with format-specific logic