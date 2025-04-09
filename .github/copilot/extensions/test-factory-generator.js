// GitHub Copilot Test Factory Generator Extension
// This extension generates test data factories for domain entities

const fs = require('fs');
const path = require('path');

/**
 * Test Factory Generator Extension for Copilot
 * 
 * This extension helps generate test data factories for domain entities.
 * It analyzes entity structure and creates appropriate factory classes
 * that follow the project's test data generation patterns.
 */
class TestFactoryGenerator {
  constructor(options = {}) {
    this.options = {
      outputDir: options.outputDir || './tests/unit/domain/factories',
      templateDir: options.templateDir || './.github/copilot/extensions/templates',
      entitiesDir: options.entitiesDir || './pkg/domain/entities',
      ...options
    };
  }

  /**
   * Entry point for the extension
   * @param {Object} context - Context provided by Copilot
   * @param {Object} params - Parameters provided by the user
   * @returns {Object} - Result of the factory generation
   */
  async execute(context, params) {
    try {
      const {
        entityName,
        entityPath,
        language = 'typescript',
        withFixtures = true,
        withBuilder = true
      } = params;

      if (!entityName && !entityPath) {
        return {
          success: false,
          error: 'Missing required parameters: entityName or entityPath'
        };
      }

      // Determine the entity path
      const finalEntityPath = entityPath || this.findEntityPath(entityName);
      
      // Parse the entity structure
      const entityStructure = await this.parseEntityStructure(finalEntityPath, language);
      
      // Generate factory code
      const generatedFactory = await this.generateFactoryCode(
        entityStructure,
        language,
        withFixtures,
        withBuilder
      );
      
      // Save generated factory
      const factoryPath = await this.saveGeneratedFactory(
        entityStructure.name,
        generatedFactory,
        language
      );
      
      return {
        success: true,
        entityName: entityStructure.name,
        factoryPath,
        message: `Successfully generated ${language} test factory for ${entityStructure.name}`
      };
    } catch (error) {
      console.error('Test factory generation failed:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred during factory generation'
      };
    }
  }

  /**
   * Find the path to an entity by name
   * @param {string} entityName - Name of the entity
   * @returns {string} - Path to the entity file
   */
  findEntityPath(entityName) {
    // Normalize entity name
    const normalizedName = entityName.endsWith('.ts') ? 
      entityName : 
      `${entityName}.ts`;
    
    const standardPath = path.join(this.options.entitiesDir, normalizedName);
    
    if (fs.existsSync(standardPath)) {
      return standardPath;
    }
    
    throw new Error(`Entity not found: ${entityName}`);
  }

  /**
   * Parse the structure of an entity from its file
   * @param {string} entityPath - Path to the entity file
   * @param {string} language - Language of the entity
   * @returns {Object} - Structure of the entity
   */
  async parseEntityStructure(entityPath, language) {
    if (!fs.existsSync(entityPath)) {
      throw new Error(`Entity file not found: ${entityPath}`);
    }
    
    const fileContent = fs.readFileSync(entityPath, 'utf8');
    
    if (language === 'typescript') {
      return this.parseTypeScriptEntity(fileContent, path.basename(entityPath, '.ts'));
    } else if (language === 'python') {
      return this.parsePythonEntity(fileContent, path.basename(entityPath, '.py'));
    } else if (language === 'go') {
      return this.parseGoEntity(fileContent, path.basename(entityPath, '.go'));
    }
    
    throw new Error(`Unsupported language: ${language}`);
  }

  /**
   * Parse a TypeScript entity
   * @param {string} content - Content of the entity file
   * @param {string} fileName - Name of the file
   * @returns {Object} - Structure of the entity
   */
  parseTypeScriptEntity(content, fileName) {
    // This is a simplified parser for demonstration
    // In a real implementation, we would use a proper TypeScript parser
    
    // Extract the class or interface name
    const classMatch = content.match(/export\s+class\s+(\w+)/);
    const interfaceMatch = content.match(/export\s+interface\s+(\w+)/);
    const typeMatch = content.match(/export\s+type\s+(\w+)/);
    
    const name = (classMatch && classMatch[1]) || 
                (interfaceMatch && interfaceMatch[1]) || 
                (typeMatch && typeMatch[1]) || 
                fileName;
    
    // Extract properties
    const properties = [];
    
    // Look for class properties
    const classPropsRegex = /(?:private|protected|public|readonly)\s+(\w+)\s*:\s*([^;]+)/g;
    let match;
    while ((match = classPropsRegex.exec(content)) !== null) {
      properties.push({
        name: match[1],
        type: match[2].trim(),
        required: !match[0].includes('?:')
      });
    }
    
    // Look for interface properties
    const interfacePropsRegex = /(\w+)(\??)\s*:\s*([^;]+)/g;
    while ((match = interfacePropsRegex.exec(content)) !== null) {
      // Skip if it's a method definition
      if (match[0].includes('(')) continue;
      
      properties.push({
        name: match[1],
        type: match[3].trim(),
        required: match[2] !== '?'
      });
    }
    
    // Extract constructor parameters for classes
    const constructorParams = [];
    const constructorMatch = content.match(/constructor\s*\(([^)]*)\)/);
    
    if (constructorMatch) {
      const params = constructorMatch[1].split(',');
      
      params.forEach(param => {
        const paramMatch = param.trim().match(/(?:private|protected|public|readonly)?\s*(\w+)\s*:\s*([^=]+)(?:=.*)?$/);
        if (paramMatch) {
          constructorParams.push({
            name: paramMatch[1],
            type: paramMatch[2].trim(),
            required: !param.includes('?:') && !param.includes('=')
          });
        }
      });
    }
    
    return {
      name,
      isClass: !!classMatch,
      isInterface: !!interfaceMatch,
      isType: !!typeMatch,
      properties,
      constructorParams,
      imports: this.extractImports(content)
    };
  }

  /**
   * Parse a Python entity
   * @param {string} content - Content of the entity file
   * @param {string} fileName - Name of the file
   * @returns {Object} - Structure of the entity
   */
  parsePythonEntity(content, fileName) {
    // Implement Python entity parsing
    return {
      name: fileName,
      properties: []
    };
  }

  /**
   * Parse a Go entity
   * @param {string} content - Content of the entity file
   * @param {string} fileName - Name of the file
   * @returns {Object} - Structure of the entity
   */
  parseGoEntity(content, fileName) {
    // Implement Go entity parsing
    return {
      name: fileName,
      properties: []
    };
  }

  /**
   * Extract imports from entity file
   * @param {string} content - Content of the entity file 
   * @returns {Array<Object>} - List of imports
   */
  extractImports(content) {
    const imports = [];
    const importRegex = /import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g;
    
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const items = match[1].split(',').map(item => item.trim());
      
      items.forEach(item => {
        if (item) {
          imports.push({
            name: item,
            path: match[2]
          });
        }
      });
    }
    
    return imports;
  }

  /**
   * Generate factory code for an entity
   * @param {Object} entityStructure - Structure of the entity
   * @param {string} language - Target language
   * @param {boolean} withFixtures - Whether to include fixture data
   * @param {boolean} withBuilder - Whether to include a builder pattern
   * @returns {string} - Generated factory code
   */
  async generateFactoryCode(entityStructure, language, withFixtures, withBuilder) {
    if (language === 'typescript') {
      return this.generateTypeScriptFactory(entityStructure, withFixtures, withBuilder);
    } else if (language === 'python') {
      return this.generatePythonFactory(entityStructure, withFixtures, withBuilder);
    } else if (language === 'go') {
      return this.generateGoFactory(entityStructure, withFixtures, withBuilder);
    }
    
    throw new Error(`Unsupported language: ${language}`);
  }

  /**
   * Generate a TypeScript factory
   * @param {Object} entityStructure - Structure of the entity
   * @param {boolean} withFixtures - Whether to include fixture data
   * @param {boolean} withBuilder - Whether to include a builder pattern
   * @returns {string} - Generated factory code
   */
  generateTypeScriptFactory(entityStructure, withFixtures, withBuilder) {
    const { name, properties, constructorParams, imports, isClass, isInterface } = entityStructure;
    
    // Generate imports
    let importCode = `import { ${name} } from '../../../pkg/domain/entities/${name}';\n`;
    
    // Add imports for dependencies
    const uniqueImports = new Set();
    imports.forEach(imp => {
      if (imp.path.includes('/domain/') && !imp.path.includes(`/${name}`)) {
        uniqueImports.add(`import { ${imp.name} } from '${imp.path}';`);
      }
    });
    
    importCode += Array.from(uniqueImports).join('\n') + '\n\n';
    
    // Generate fixture data
    let fixtureCode = '';
    if (withFixtures) {
      fixtureCode = `/**
 * Standard test fixtures for ${name}
 */
export const ${name}Fixtures = {
  valid: {\n`;
      
      // Add fixture properties
      properties.forEach(prop => {
        const defaultValue = this.getDefaultValueForType(prop.type);
        fixtureCode += `    ${prop.name}: ${defaultValue},\n`;
      });
      
      fixtureCode += `  },
  
  invalid: {
    missingRequired: {\n`;
      
      // Add invalid fixture with missing required fields
      properties.filter(p => !p.required).forEach(prop => {
        const defaultValue = this.getDefaultValueForType(prop.type);
        fixtureCode += `      ${prop.name}: ${defaultValue},\n`;
      });
      
      fixtureCode += `    },
    invalidTypes: {\n`;
      
      // Add invalid fixture with wrong types
      properties.forEach(prop => {
        const invalidValue = this.getInvalidValueForType(prop.type);
        fixtureCode += `      ${prop.name}: ${invalidValue},\n`;
      });
      
      fixtureCode += `    }
  }
};\n\n`;
    }
    
    // Generate factory code
    let factoryCode = `/**
 * Factory for creating ${name} instances in tests
 */
export class ${name}Factory {
  /**
   * Create a valid ${name} instance
   * @param overrides - Properties to override in the default valid fixture
   * @returns A valid ${name} instance
   */
  static create(overrides = {}): ${name} {\n`;
    
    if (isClass) {
      factoryCode += `    const props = { ...${withFixtures ? `${name}Fixtures.valid` : '{}'}, ...overrides };\n`;
      
      if (constructorParams.length > 0) {
        factoryCode += `    return new ${name}(\n`;
        
        constructorParams.forEach((param, index) => {
          factoryCode += `      props.${param.name}${index < constructorParams.length - 1 ? ',' : ''}\n`;
        });
        
        factoryCode += `    );\n`;
      } else {
        factoryCode += `    return new ${name}();\n`;
      }
    } else {
      factoryCode += `    return { ...${withFixtures ? `${name}Fixtures.valid` : '{}'}, ...overrides } as ${name};\n`;
    }
    
    factoryCode += `  }\n\n`;
    
    // Add methods for creating collections
    factoryCode += `  /**
   * Create multiple ${name} instances
   * @param count - Number of instances to create
   * @param overrides - Properties to override in the default valid fixture
   * @returns Array of ${name} instances
   */
  static createMany(count: number, overrides = {}): ${name}[] {
    return Array.from({ length: count }, (_, index) => 
      this.create({ ...overrides, id: \`test-\${index + 1}\` })
    );
  }\n`;
    
    // Add builder pattern if requested
    if (withBuilder) {
      factoryCode += `\n  /**
   * Start building a ${name} with the builder pattern
   * @returns A ${name} builder
   */
  static builder(): ${name}Builder {
    return new ${name}Builder();
  }\n`;
      
      // Add builder class
      factoryCode += `}\n\n/**
 * Builder class for creating ${name} instances
 * Allows for fluent, type-safe building of entities
 */
export class ${name}Builder {
  private props: Partial<${name}> = ${withFixtures ? `{ ...${name}Fixtures.valid }` : '{}'};

`;
      
      // Add builder methods for each property
      properties.forEach(prop => {
        factoryCode += `  /**
   * Set the ${prop.name} property
   */
  with${prop.name.charAt(0).toUpperCase() + prop.name.slice(1)}(${prop.name}: ${prop.type}): ${name}Builder {
    this.props.${prop.name} = ${prop.name};
    return this;
  }

`;
      });
      
      // Add build method
      factoryCode += `  /**
   * Build the ${name} instance
   */
  build(): ${name} {
    return ${name}Factory.create(this.props);
  }
}`;
    } else {
      factoryCode += `}`;
    }
    
    return importCode + fixtureCode + factoryCode;
  }

  /**
   * Generate a Python factory
   * @param {Object} entityStructure - Structure of the entity
   * @param {boolean} withFixtures - Whether to include fixture data
   * @param {boolean} withBuilder - Whether to include a builder pattern
   * @returns {string} - Generated factory code
   */
  generatePythonFactory(entityStructure, withFixtures, withBuilder) {
    // Implement Python factory generation
    return `# Factory for ${entityStructure.name}`;
  }

  /**
   * Generate a Go factory
   * @param {Object} entityStructure - Structure of the entity
   * @param {boolean} withFixtures - Whether to include fixture data
   * @param {boolean} withBuilder - Whether to include a builder pattern
   * @returns {string} - Generated factory code
   */
  generateGoFactory(entityStructure, withFixtures, withBuilder) {
    // Implement Go factory generation
    return `// Factory for ${entityStructure.name}`;
  }

  /**
   * Get a default value for a TypeScript type
   * @param {string} type - TypeScript type
   * @returns {string} - Default value code
   */
  getDefaultValueForType(type) {
    if (type.includes('string')) return '"test-value"';
    if (type.includes('number')) return '42';
    if (type.includes('boolean')) return 'true';
    if (type.includes('Date')) return 'new Date()';
    if (type.includes('[]') || type.includes('Array')) return '[]';
    if (type.includes('{}') || type.includes('Object')) return '{}';
    if (type.includes('|')) {
      // Union type - use the first option
      const firstOption = type.split('|')[0].trim();
      return this.getDefaultValueForType(firstOption);
    }
    
    // For custom types, return null or undefined
    return 'null';
  }

  /**
   * Get an invalid value for a TypeScript type
   * @param {string} type - TypeScript type
   * @returns {string} - Invalid value code
   */
  getInvalidValueForType(type) {
    if (type.includes('string')) return '42';
    if (type.includes('number')) return '"not-a-number"';
    if (type.includes('boolean')) return '"not-a-boolean"';
    if (type.includes('Date')) return '"not-a-date"';
    if (type.includes('[]') || type.includes('Array')) return '{}';
    if (type.includes('{}') || type.includes('Object')) return '[]';
    
    // For custom types, return an empty object
    return '{}';
  }

  /**
   * Save generated factory code to disk
   * @param {string} entityName - Name of the entity
   * @param {string} factoryCode - Generated factory code
   * @param {string} language - Target language
   * @returns {string} - Path to the saved factory file
   */
  async saveGeneratedFactory(entityName, factoryCode, language) {
    // Create output directory if it doesn't exist
    const outputDir = this.options.outputDir;
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Determine file name based on language
    let fileName;
    if (language === 'typescript') {
      fileName = `${entityName}Factory.ts`;
    } else if (language === 'python') {
      fileName = `${entityName.toLowerCase()}_factory.py`;
    } else if (language === 'go') {
      fileName = `${entityName.toLowerCase()}_factory.go`;
    } else {
      throw new Error(`Unsupported language: ${language}`);
    }
    
    const filePath = path.join(outputDir, fileName);
    
    // Write factory code to file
    fs.writeFileSync(filePath, factoryCode);
    
    return filePath;
  }
}

module.exports = TestFactoryGenerator;