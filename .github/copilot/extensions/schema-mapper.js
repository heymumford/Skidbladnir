// GitHub Copilot Schema Mapper Extension
// This extension maps between different provider schemas

const fs = require('fs');
const path = require('path');

/**
 * Schema Mapper Extension for Copilot
 * 
 * This extension helps generate mapping code between different providers' schemas.
 * It analyzes API specifications and creates bidirectional mappings based on
 * field similarities and configured rules.
 */
class SchemaMapper {
  constructor(options = {}) {
    this.options = {
      outputDir: options.outputDir || './internal/typescript/translation/mappers',
      templateDir: options.templateDir || './.github/copilot/extensions/templates',
      apiSchemaDir: options.apiSchemaDir || './docs/api',
      ...options
    };
  }

  /**
   * Entry point for the extension
   * @param {Object} context - Context provided by Copilot
   * @param {Object} params - Parameters provided by the user
   * @returns {Object} - Result of the schema mapping
   */
  async execute(context, params) {
    try {
      const {
        sourceSchema,
        targetSchema,
        language = 'typescript',
        includeTests = true,
        bidirectional = true
      } = params;

      if (!sourceSchema || !targetSchema) {
        return {
          success: false,
          error: 'Missing required parameters: sourceSchema or targetSchema'
        };
      }

      // Load source schema
      const source = await this.loadSchema(sourceSchema);
      
      // Load target schema
      const target = await this.loadSchema(targetSchema);
      
      // Analyze field mappings
      const fieldMappings = this.analyzeFieldMappings(source, target);
      
      // Generate mapper code
      const mapperCode = await this.generateMapperCode(
        source,
        target,
        fieldMappings,
        language,
        bidirectional
      );
      
      // Save generated mapper
      const mapperPath = await this.saveGeneratedMapper(
        source.name,
        target.name,
        mapperCode,
        language
      );
      
      // Generate tests if requested
      let testPath = null;
      if (includeTests) {
        const testCode = await this.generateTestCode(
          source,
          target,
          fieldMappings,
          language,
          bidirectional
        );
        
        testPath = await this.saveGeneratedTest(
          source.name,
          target.name,
          testCode,
          language
        );
      }
      
      return {
        success: true,
        sourceSchema: source.name,
        targetSchema: target.name,
        mapperPath,
        testPath,
        fieldMappings: fieldMappings.length,
        bidirectional,
        message: `Successfully generated ${language} schema mapper from ${source.name} to ${target.name}`
      };
    } catch (error) {
      console.error('Schema mapping failed:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred during schema mapping'
      };
    }
  }

  /**
   * Load a schema from file or API spec
   * @param {string} schemaId - Schema identifier (file path or provider name)
   * @returns {Object} - Parsed schema
   */
  async loadSchema(schemaId) {
    // Handle different schema sources
    if (schemaId.endsWith('.json') || schemaId.endsWith('.yaml') || schemaId.endsWith('.yml')) {
      // Load from file
      return this.loadSchemaFromFile(schemaId);
    } else {
      // Infer from provider name
      return this.loadSchemaForProvider(schemaId);
    }
  }

  /**
   * Load schema from a file
   * @param {string} filePath - Path to schema file
   * @returns {Object} - Parsed schema
   */
  async loadSchemaFromFile(filePath) {
    const resolvedPath = filePath.startsWith('./') ? 
      filePath : 
      path.join(this.options.apiSchemaDir, filePath);
    
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Schema file not found: ${resolvedPath}`);
    }
    
    const content = fs.readFileSync(resolvedPath, 'utf8');
    
    // Parse based on file extension
    if (resolvedPath.endsWith('.json')) {
      const schema = JSON.parse(content);
      return {
        name: this.extractSchemaName(schema, path.basename(resolvedPath, '.json')),
        fields: this.extractSchemaFields(schema),
        schema
      };
    } else if (resolvedPath.endsWith('.yaml') || resolvedPath.endsWith('.yml')) {
      throw new Error('YAML parsing not implemented yet');
    } else {
      throw new Error(`Unsupported schema format: ${path.extname(resolvedPath)}`);
    }
  }

  /**
   * Load schema for a provider by name
   * @param {string} providerName - Name of the provider
   * @returns {Object} - Parsed schema
   */
  async loadSchemaForProvider(providerName) {
    // Look for provider schema in standard locations
    const possiblePaths = [
      path.join(this.options.apiSchemaDir, `${providerName}.json`),
      path.join(this.options.apiSchemaDir, `${providerName}-schema.json`),
      path.join(this.options.apiSchemaDir, `${providerName}-api.json`),
      path.join(this.options.apiSchemaDir, `${providerName}/schema.json`),
      path.join(this.options.apiSchemaDir, `providers/${providerName}.json`)
    ];
    
    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        return this.loadSchemaFromFile(filePath);
      }
    }
    
    // If not found, generate a simplified schema based on name
    return {
      name: providerName,
      fields: [],
      schema: { name: providerName }
    };
  }

  /**
   * Extract schema name from schema object
   * @param {Object} schema - Schema object
   * @param {string} fallback - Fallback name
   * @returns {string} - Schema name
   */
  extractSchemaName(schema, fallback) {
    return schema.title || schema.name || schema['x-name'] || 
           (schema.info && schema.info.title) || fallback;
  }

  /**
   * Extract fields from schema object
   * @param {Object} schema - Schema object
   * @returns {Array<Object>} - List of fields
   */
  extractSchemaFields(schema) {
    const fields = [];
    
    // Handle different schema formats
    
    // OpenAPI/Swagger schema
    if (schema.definitions || schema.components) {
      const definitions = schema.definitions || (schema.components && schema.components.schemas);
      
      if (definitions) {
        // Find the main model (often the schema name or 'TestCase')
        const mainModelName = this.findMainModelName(definitions);
        const mainModel = definitions[mainModelName];
        
        if (mainModel && mainModel.properties) {
          Object.keys(mainModel.properties).forEach(propName => {
            const prop = mainModel.properties[propName];
            fields.push({
              name: propName,
              type: prop.type || 'object',
              description: prop.description || '',
              required: (mainModel.required || []).includes(propName),
              enum: prop.enum,
              format: prop.format
            });
          });
        }
      }
    } 
    // JSON Schema
    else if (schema.properties) {
      Object.keys(schema.properties).forEach(propName => {
        const prop = schema.properties[propName];
        fields.push({
          name: propName,
          type: prop.type || 'object',
          description: prop.description || '',
          required: (schema.required || []).includes(propName),
          enum: prop.enum,
          format: prop.format
        });
      });
    }
    
    return fields;
  }

  /**
   * Find the main model name in a definitions object
   * @param {Object} definitions - Definitions object
   * @returns {string} - Main model name
   */
  findMainModelName(definitions) {
    // Look for TestCase or similar model
    const priorityNames = ['TestCase', 'Test', 'TestSuite', 'TestExecution'];
    
    for (const name of priorityNames) {
      if (definitions[name]) {
        return name;
      }
    }
    
    // Fall back to first definition
    return Object.keys(definitions)[0];
  }

  /**
   * Analyze and create mappings between source and target fields
   * @param {Object} source - Source schema
   * @param {Object} target - Target schema
   * @returns {Array<Object>} - Field mappings
   */
  analyzeFieldMappings(source, target) {
    const mappings = [];
    
    // Create mappings for each source field
    source.fields.forEach(sourceField => {
      // Try to find matching target field
      const matchingTargetField = this.findMatchingField(sourceField, target.fields);
      
      if (matchingTargetField) {
        mappings.push({
          source: sourceField,
          target: matchingTargetField,
          confidence: this.calculateMappingConfidence(sourceField, matchingTargetField),
          transformation: this.determineTransformation(sourceField, matchingTargetField)
        });
      } else {
        // No direct match found, create a mapping with a placeholder
        mappings.push({
          source: sourceField,
          target: null,
          confidence: 0,
          transformation: 'unknown'
        });
      }
    });
    
    // Find target fields that don't have a mapping yet
    target.fields.forEach(targetField => {
      const hasMapping = mappings.some(m => m.target && m.target.name === targetField.name);
      
      if (!hasMapping) {
        // No matching source field, create a mapping with a placeholder
        mappings.push({
          source: null,
          target: targetField,
          confidence: 0,
          transformation: 'unknown'
        });
      }
    });
    
    return mappings;
  }

  /**
   * Find a matching field in target fields
   * @param {Object} sourceField - Source field
   * @param {Array<Object>} targetFields - Target fields
   * @returns {Object|null} - Matching target field
   */
  findMatchingField(sourceField, targetFields) {
    // Define field name transformations to check
    const nameVariations = this.generateFieldNameVariations(sourceField.name);
    
    // Look for exact match
    for (const name of nameVariations) {
      const exactMatch = targetFields.find(f => f.name.toLowerCase() === name.toLowerCase());
      if (exactMatch) {
        return exactMatch;
      }
    }
    
    // Look for partial match
    for (const name of nameVariations) {
      const partialMatches = targetFields.filter(f => 
        f.name.toLowerCase().includes(name.toLowerCase()) || 
        name.toLowerCase().includes(f.name.toLowerCase())
      );
      
      if (partialMatches.length === 1) {
        return partialMatches[0];
      } else if (partialMatches.length > 1) {
        // Multiple matches, find best one
        return this.findBestMatch(sourceField, partialMatches);
      }
    }
    
    // Look for type-based match (same type, similar role)
    const typeMatches = targetFields.filter(f => f.type === sourceField.type);
    if (typeMatches.length === 1) {
      return typeMatches[0];
    } else if (typeMatches.length > 1) {
      // Multiple matches, find best one
      return this.findBestMatch(sourceField, typeMatches);
    }
    
    return null;
  }

  /**
   * Generate variations of a field name for matching
   * @param {string} name - Field name
   * @returns {Array<string>} - Variations of the name
   */
  generateFieldNameVariations(name) {
    const variations = [name];
    
    // Camel case / snake case conversions
    if (name.includes('_')) {
      // Convert snake_case to camelCase
      const camelCase = name.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      variations.push(camelCase);
    } else if (/[a-z][A-Z]/.test(name)) {
      // Convert camelCase to snake_case
      const snakeCase = name.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
      variations.push(snakeCase);
    }
    
    // Common prefixes/suffixes to try removing
    const prefixes = ['test', 'case', 'execution', 'suite'];
    for (const prefix of prefixes) {
      if (name.toLowerCase().startsWith(prefix)) {
        variations.push(name.slice(prefix.length));
      }
      if (name.toLowerCase().endsWith(prefix)) {
        variations.push(name.slice(0, -prefix.length));
      }
    }
    
    // Common field name synonyms
    const synonyms = {
      'id': ['identifier', 'key', 'uuid', 'guid'],
      'name': ['title', 'label'],
      'description': ['desc', 'summary', 'details'],
      'status': ['state', 'condition'],
      'priority': ['severity', 'importance'],
      'created': ['createdAt', 'createDate', 'dateCreated'],
      'updated': ['updatedAt', 'updateDate', 'dateUpdated', 'modified', 'modifiedAt']
    };
    
    for (const [term, alternatives] of Object.entries(synonyms)) {
      if (name.toLowerCase() === term) {
        variations.push(...alternatives);
      }
      if (alternatives.includes(name.toLowerCase())) {
        variations.push(term);
      }
    }
    
    return variations;
  }

  /**
   * Find the best match among multiple candidates
   * @param {Object} sourceField - Source field
   * @param {Array<Object>} candidates - Candidate fields
   * @returns {Object} - Best matching field
   */
  findBestMatch(sourceField, candidates) {
    // Score each candidate
    const scoredCandidates = candidates.map(candidate => {
      let score = 0;
      
      // Name similarity
      const sourceNameLower = sourceField.name.toLowerCase();
      const candidateNameLower = candidate.name.toLowerCase();
      
      if (sourceNameLower === candidateNameLower) {
        score += 10;
      } else if (sourceNameLower.includes(candidateNameLower) || candidateNameLower.includes(sourceNameLower)) {
        score += 5;
      }
      
      // Type match
      if (sourceField.type === candidate.type) {
        score += 3;
      }
      
      // Required match
      if (sourceField.required === candidate.required) {
        score += 2;
      }
      
      return { candidate, score };
    });
    
    // Sort by score and return best match
    scoredCandidates.sort((a, b) => b.score - a.score);
    return scoredCandidates[0].candidate;
  }

  /**
   * Calculate confidence score for a mapping
   * @param {Object} sourceField - Source field
   * @param {Object} targetField - Target field
   * @returns {number} - Confidence score (0-1)
   */
  calculateMappingConfidence(sourceField, targetField) {
    if (!sourceField || !targetField) {
      return 0;
    }
    
    let score = 0;
    
    // Name match
    if (sourceField.name.toLowerCase() === targetField.name.toLowerCase()) {
      score += 0.5;
    } else if (sourceField.name.toLowerCase().includes(targetField.name.toLowerCase()) || 
               targetField.name.toLowerCase().includes(sourceField.name.toLowerCase())) {
      score += 0.3;
    }
    
    // Type match
    if (sourceField.type === targetField.type) {
      score += 0.3;
    }
    
    // Required match
    if (sourceField.required === targetField.required) {
      score += 0.1;
    }
    
    // Format match
    if (sourceField.format === targetField.format) {
      score += 0.1;
    }
    
    return Math.min(1, score);
  }

  /**
   * Determine transformation needed for the mapping
   * @param {Object} sourceField - Source field
   * @param {Object} targetField - Target field
   * @returns {string} - Transformation type
   */
  determineTransformation(sourceField, targetField) {
    if (!sourceField || !targetField) {
      return 'unknown';
    }
    
    // Direct mapping
    if (sourceField.type === targetField.type) {
      return 'direct';
    }
    
    // Type conversions
    if (sourceField.type === 'string' && targetField.type === 'number') {
      return 'string_to_number';
    }
    
    if (sourceField.type === 'number' && targetField.type === 'string') {
      return 'number_to_string';
    }
    
    if (sourceField.type === 'string' && targetField.type === 'boolean') {
      return 'string_to_boolean';
    }
    
    if (sourceField.type === 'boolean' && targetField.type === 'string') {
      return 'boolean_to_string';
    }
    
    if (sourceField.type === 'string' && targetField.type === 'date') {
      return 'string_to_date';
    }
    
    if (sourceField.type === 'date' && targetField.type === 'string') {
      return 'date_to_string';
    }
    
    // Enum mapping
    if (sourceField.enum && targetField.enum) {
      return 'enum_mapping';
    }
    
    // Object mapping
    if (sourceField.type === 'object' && targetField.type === 'object') {
      return 'object_mapping';
    }
    
    // Array mapping
    if (sourceField.type === 'array' && targetField.type === 'array') {
      return 'array_mapping';
    }
    
    return 'custom';
  }

  /**
   * Generate mapper code
   * @param {Object} source - Source schema
   * @param {Object} target - Target schema
   * @param {Array<Object>} mappings - Field mappings
   * @param {string} language - Target language
   * @param {boolean} bidirectional - Whether to include reverse mapping
   * @returns {string} - Generated mapper code
   */
  async generateMapperCode(source, target, mappings, language, bidirectional) {
    if (language === 'typescript') {
      return this.generateTypeScriptMapper(source, target, mappings, bidirectional);
    } else if (language === 'python') {
      return this.generatePythonMapper(source, target, mappings, bidirectional);
    } else if (language === 'go') {
      return this.generateGoMapper(source, target, mappings, bidirectional);
    }
    
    throw new Error(`Unsupported language: ${language}`);
  }

  /**
   * Generate a TypeScript mapper
   * @param {Object} source - Source schema
   * @param {Object} target - Target schema
   * @param {Array<Object>} mappings - Field mappings
   * @param {boolean} bidirectional - Whether to include reverse mapping
   * @returns {string} - Generated mapper code
   */
  generateTypeScriptMapper(source, target, mappings, bidirectional) {
    const sourceType = `${source.name}TestCase`;
    const targetType = `${target.name}TestCase`;
    
    // Generate imports
    let code = `// Generated by Skidbladnir Schema Mapper
import { ${sourceType} } from '../models/${source.name.toLowerCase()}';
import { ${targetType} } from '../models/${target.name.toLowerCase()}';

/**
 * Maps between ${source.name} and ${target.name} test case schemas
 */
export class ${source.name}To${target.name}Mapper {
  /**
   * Map from ${source.name} to ${target.name} schema
   * @param source - Source test case in ${source.name} format
   * @returns Test case in ${target.name} format
   */
  public map${source.name}To${target.name}(source: ${sourceType}): ${targetType} {
    if (!source) {
      return null;
    }

    const target: ${targetType} = {
`;
    
    // Generate forward mapping code
    mappings.forEach(mapping => {
      if (mapping.target) {
        const targetName = mapping.target.name;
        
        if (mapping.source) {
          const sourceName = mapping.source.name;
          const transformation = this.getTransformationCode(
            `source.${sourceName}`, 
            mapping.source, 
            mapping.target, 
            mapping.transformation
          );
          
          code += `      ${targetName}: ${transformation},\n`;
        } else {
          // Target field with no source - use default value
          code += `      ${targetName}: ${this.getDefaultValueForType(mapping.target.type)},\n`;
        }
      }
    });
    
    code += `    };

    return target;
  }\n`;
    
    // Generate reverse mapping if needed
    if (bidirectional) {
      code += `
  /**
   * Map from ${target.name} to ${source.name} schema
   * @param target - Target test case in ${target.name} format
   * @returns Test case in ${source.name} format
   */
  public map${target.name}To${source.name}(target: ${targetType}): ${sourceType} {
    if (!target) {
      return null;
    }

    const source: ${sourceType} = {
`;
      
      // Generate reverse mapping code
      mappings.forEach(mapping => {
        if (mapping.source) {
          const sourceName = mapping.source.name;
          
          if (mapping.target) {
            const targetName = mapping.target.name;
            const transformation = this.getReverseTransformationCode(
              `target.${targetName}`, 
              mapping.target, 
              mapping.source, 
              mapping.transformation
            );
            
            code += `      ${sourceName}: ${transformation},\n`;
          } else {
            // Source field with no target - use default value
            code += `      ${sourceName}: ${this.getDefaultValueForType(mapping.source.type)},\n`;
          }
        }
      });
      
      code += `    };

    return source;
  }\n`;
    }
    
    code += `}`;
    
    return code;
  }

  /**
   * Generate a Python mapper
   * @param {Object} source - Source schema
   * @param {Object} target - Target schema
   * @param {Array<Object>} mappings - Field mappings
   * @param {boolean} bidirectional - Whether to include reverse mapping
   * @returns {string} - Generated mapper code
   */
  generatePythonMapper(source, target, mappings, bidirectional) {
    // Implement Python mapper generation
    return `# Mapper for ${source.name} to ${target.name}`;
  }

  /**
   * Generate a Go mapper
   * @param {Object} source - Source schema
   * @param {Object} target - Target schema
   * @param {Array<Object>} mappings - Field mappings
   * @param {boolean} bidirectional - Whether to include reverse mapping
   * @returns {string} - Generated mapper code
   */
  generateGoMapper(source, target, mappings, bidirectional) {
    // Implement Go mapper generation
    return `// Mapper for ${source.name} to ${target.name}`;
  }

  /**
   * Get transformation code for a mapping
   * @param {string} sourcePath - Source field access path
   * @param {Object} sourceField - Source field
   * @param {Object} targetField - Target field
   * @param {string} transformation - Transformation type
   * @returns {string} - Transformation code
   */
  getTransformationCode(sourcePath, sourceField, targetField, transformation) {
    switch (transformation) {
      case 'direct':
        return sourcePath;
        
      case 'string_to_number':
        return `Number(${sourcePath})`;
        
      case 'number_to_string':
        return `String(${sourcePath})`;
        
      case 'string_to_boolean':
        return `Boolean(${sourcePath})`;
        
      case 'boolean_to_string':
        return `${sourcePath} ? 'true' : 'false'`;
        
      case 'string_to_date':
        return `new Date(${sourcePath})`;
        
      case 'date_to_string':
        return `${sourcePath}.toISOString()`;
        
      case 'enum_mapping':
        if (sourceField.enum && targetField.enum) {
          return `this.map${sourceField.name}Enum(${sourcePath})`;
        }
        return sourcePath;
        
      case 'array_mapping':
        return `${sourcePath} ? ${sourcePath}.map(item => item) : []`;
        
      case 'object_mapping':
        return `${sourcePath} ? { ...${sourcePath} } : {}`;
        
      case 'custom':
        return `this.custom${sourceField.name}To${targetField.name}(${sourcePath})`;
        
      case 'unknown':
      default:
        return `null /* TODO: Implement ${sourceField.name} to ${targetField.name} mapping */`;
    }
  }

  /**
   * Get reverse transformation code for a mapping
   * @param {string} targetPath - Target field access path
   * @param {Object} targetField - Target field
   * @param {Object} sourceField - Source field
   * @param {string} transformation - Transformation type
   * @returns {string} - Reverse transformation code
   */
  getReverseTransformationCode(targetPath, targetField, sourceField, transformation) {
    switch (transformation) {
      case 'direct':
        return targetPath;
        
      case 'string_to_number':
        return `String(${targetPath})`;
        
      case 'number_to_string':
        return `Number(${targetPath})`;
        
      case 'string_to_boolean':
        return `String(${targetPath})`;
        
      case 'boolean_to_string':
        return `${targetPath} === 'true'`;
        
      case 'string_to_date':
        return `${targetPath}.toISOString()`;
        
      case 'date_to_string':
        return `new Date(${targetPath})`;
        
      case 'enum_mapping':
        if (sourceField.enum && targetField.enum) {
          return `this.map${targetField.name}EnumReverse(${targetPath})`;
        }
        return targetPath;
        
      case 'array_mapping':
        return `${targetPath} ? ${targetPath}.map(item => item) : []`;
        
      case 'object_mapping':
        return `${targetPath} ? { ...${targetPath} } : {}`;
        
      case 'custom':
        return `this.custom${targetField.name}To${sourceField.name}(${targetPath})`;
        
      case 'unknown':
      default:
        return `null /* TODO: Implement ${targetField.name} to ${sourceField.name} mapping */`;
    }
  }

  /**
   * Get default value for a type
   * @param {string} type - Field type
   * @returns {string} - Default value code
   */
  getDefaultValueForType(type) {
    switch (type) {
      case 'string':
        return "''";
      case 'number':
        return '0';
      case 'boolean':
        return 'false';
      case 'date':
        return 'new Date()';
      case 'array':
        return '[]';
      case 'object':
        return '{}';
      default:
        return 'null';
    }
  }

  /**
   * Generate test code for a mapper
   * @param {Object} source - Source schema
   * @param {Object} target - Target schema
   * @param {Array<Object>} mappings - Field mappings
   * @param {string} language - Target language
   * @param {boolean} bidirectional - Whether to include reverse mapping tests
   * @returns {string} - Generated test code
   */
  async generateTestCode(source, target, mappings, language, bidirectional) {
    if (language === 'typescript') {
      return this.generateTypeScriptMapperTest(source, target, mappings, bidirectional);
    } else if (language === 'python') {
      return this.generatePythonMapperTest(source, target, mappings, bidirectional);
    } else if (language === 'go') {
      return this.generateGoMapperTest(source, target, mappings, bidirectional);
    }
    
    throw new Error(`Unsupported language: ${language}`);
  }

  /**
   * Generate a TypeScript mapper test
   * @param {Object} source - Source schema
   * @param {Object} target - Target schema
   * @param {Array<Object>} mappings - Field mappings
   * @param {boolean} bidirectional - Whether to include reverse mapping tests
   * @returns {string} - Generated test code
   */
  generateTypeScriptMapperTest(source, target, mappings, bidirectional) {
    const sourceType = `${source.name}TestCase`;
    const targetType = `${target.name}TestCase`;
    const mapperClass = `${source.name}To${target.name}Mapper`;
    
    let code = `// Generated by Skidbladnir Schema Mapper
import { ${mapperClass} } from '../../../src/translation/mappers/${source.name.toLowerCase()}-to-${target.name.toLowerCase()}-mapper';
import { ${sourceType} } from '../../../src/translation/models/${source.name.toLowerCase()}';
import { ${targetType} } from '../../../src/translation/models/${target.name.toLowerCase()}';

describe('${mapperClass}', () => {
  let mapper: ${mapperClass};
  
  beforeEach(() => {
    mapper = new ${mapperClass}();
  });
  
  describe('map${source.name}To${target.name}', () => {
    it('should return null when source is null', () => {
      expect(mapper.map${source.name}To${target.name}(null)).toBeNull();
    });
    
    it('should map all fields correctly', () => {
      // Arrange
      const source: ${sourceType} = {
`;
    
    // Add sample source data
    mappings.forEach(mapping => {
      if (mapping.source) {
        const sourceName = mapping.source.name;
        const sampleValue = this.getSampleValueForType(mapping.source.type);
        code += `        ${sourceName}: ${sampleValue},\n`;
      }
    });
    
    code += `      };
      
      // Act
      const result = mapper.map${source.name}To${target.name}(source);
      
      // Assert
`;
    
    // Add assertions for each mapping
    mappings.forEach(mapping => {
      if (mapping.target && mapping.source) {
        let assertion;
        
        if (mapping.transformation === 'direct') {
          assertion = `expect(result.${mapping.target.name}).toEqual(source.${mapping.source.name})`;
        } else {
          assertion = `expect(result.${mapping.target.name}).toBeDefined()`;
        }
        
        code += `      ${assertion};\n`;
      }
    });
    
    code += `    });
  });\n`;
    
    // Add bidirectional test if needed
    if (bidirectional) {
      code += `  
  describe('map${target.name}To${source.name}', () => {
    it('should return null when target is null', () => {
      expect(mapper.map${target.name}To${source.name}(null)).toBeNull();
    });
    
    it('should map all fields correctly', () => {
      // Arrange
      const target: ${targetType} = {
`;
      
      // Add sample target data
      mappings.forEach(mapping => {
        if (mapping.target) {
          const targetName = mapping.target.name;
          const sampleValue = this.getSampleValueForType(mapping.target.type);
          code += `        ${targetName}: ${sampleValue},\n`;
        }
      });
      
      code += `      };
      
      // Act
      const result = mapper.map${target.name}To${source.name}(target);
      
      // Assert
`;
      
      // Add assertions for each mapping
      mappings.forEach(mapping => {
        if (mapping.source && mapping.target) {
          let assertion;
          
          if (mapping.transformation === 'direct') {
            assertion = `expect(result.${mapping.source.name}).toEqual(target.${mapping.target.name})`;
          } else {
            assertion = `expect(result.${mapping.source.name}).toBeDefined()`;
          }
          
          code += `      ${assertion};\n`;
        }
      });
      
      code += `    });
  });\n`;
    }
    
    code += `});`;
    
    return code;
  }

  /**
   * Generate a Python mapper test
   * @param {Object} source - Source schema
   * @param {Object} target - Target schema
   * @param {Array<Object>} mappings - Field mappings
   * @param {boolean} bidirectional - Whether to include reverse mapping tests
   * @returns {string} - Generated test code
   */
  generatePythonMapperTest(source, target, mappings, bidirectional) {
    // Implement Python test generation
    return `# Tests for ${source.name} to ${target.name} mapper`;
  }

  /**
   * Generate a Go mapper test
   * @param {Object} source - Source schema
   * @param {Object} target - Target schema
   * @param {Array<Object>} mappings - Field mappings
   * @param {boolean} bidirectional - Whether to include reverse mapping tests
   * @returns {string} - Generated test code
   */
  generateGoMapperTest(source, target, mappings, bidirectional) {
    // Implement Go test generation
    return `// Tests for ${source.name} to ${target.name} mapper`;
  }

  /**
   * Get sample value for a type (for tests)
   * @param {string} type - Field type
   * @returns {string} - Sample value code
   */
  getSampleValueForType(type) {
    switch (type) {
      case 'string':
        return "'sample-value'";
      case 'number':
        return '42';
      case 'boolean':
        return 'true';
      case 'date':
        return 'new Date(2023, 5, 15)';
      case 'array':
        return "['item1', 'item2']";
      case 'object':
        return "{ key: 'value' }";
      default:
        return "'sample'";
    }
  }

  /**
   * Save generated mapper code to disk
   * @param {string} sourceName - Source schema name
   * @param {string} targetName - Target schema name
   * @param {string} mapperCode - Generated mapper code
   * @param {string} language - Target language
   * @returns {string} - Path to the saved mapper file
   */
  async saveGeneratedMapper(sourceName, targetName, mapperCode, language) {
    // Create output directory if it doesn't exist
    const outputDir = this.options.outputDir;
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Determine file name based on language
    let fileName;
    if (language === 'typescript') {
      fileName = `${sourceName.toLowerCase()}-to-${targetName.toLowerCase()}-mapper.ts`;
    } else if (language === 'python') {
      fileName = `${sourceName.toLowerCase()}_to_${targetName.toLowerCase()}_mapper.py`;
    } else if (language === 'go') {
      fileName = `${sourceName.toLowerCase()}_to_${targetName.toLowerCase()}_mapper.go`;
    } else {
      throw new Error(`Unsupported language: ${language}`);
    }
    
    const filePath = path.join(outputDir, fileName);
    
    // Write mapper code to file
    fs.writeFileSync(filePath, mapperCode);
    
    return filePath;
  }

  /**
   * Save generated test code to disk
   * @param {string} sourceName - Source schema name
   * @param {string} targetName - Target schema name
   * @param {string} testCode - Generated test code
   * @param {string} language - Target language
   * @returns {string} - Path to the saved test file
   */
  async saveGeneratedTest(sourceName, targetName, testCode, language) {
    // Create test output directory
    const testDir = path.join('tests/unit/translation/mappers');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    // Determine file name based on language
    let fileName;
    if (language === 'typescript') {
      fileName = `${sourceName.toLowerCase()}-to-${targetName.toLowerCase()}-mapper.test.ts`;
    } else if (language === 'python') {
      fileName = `test_${sourceName.toLowerCase()}_to_${targetName.toLowerCase()}_mapper.py`;
    } else if (language === 'go') {
      fileName = `${sourceName.toLowerCase()}_to_${targetName.toLowerCase()}_mapper_test.go`;
    } else {
      throw new Error(`Unsupported language: ${language}`);
    }
    
    const filePath = path.join(testDir, fileName);
    
    // Write test code to file
    fs.writeFileSync(filePath, testCode);
    
    return filePath;
  }
}

module.exports = SchemaMapper;