// GitHub Copilot Provider Generator Extension
// This extension generates provider adapter implementations from API specifications

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Provider Generator Extension for Copilot
 * 
 * This extension helps generate provider adapters based on API specifications.
 * It follows Clean Architecture principles and ensures consistent implementation
 * across all providers.
 */
class ProviderGenerator {
  constructor(options = {}) {
    this.options = {
      outputDir: options.outputDir || './internal/typescript/providers',
      templateDir: options.templateDir || './.github/copilot/extensions/templates',
      apiSchemaDir: options.apiSchemaDir || './docs/api',
      testOutputDir: options.testOutputDir || './tests/unit/providers',
      ...options
    };
  }

  /**
   * Entry point for the extension
   * @param {Object} context - Context provided by Copilot
   * @param {Object} params - Parameters provided by the user
   * @returns {Object} - Result of the provider generation
   */
  async execute(context, params) {
    try {
      const {
        providerName,
        apiSpec,
        language = 'typescript',
        generateTests = true
      } = params;

      if (!providerName || !apiSpec) {
        return {
          success: false,
          error: 'Missing required parameters: providerName or apiSpec'
        };
      }

      // Validate provider name format
      const validProviderName = this.formatProviderName(providerName);
      
      // Load API specification
      const apiSpecification = await this.loadApiSpec(apiSpec);
      
      // Generate provider code
      const generatedCode = await this.generateProviderCode(
        validProviderName,
        apiSpecification,
        language
      );
      
      // Save generated code
      const filePaths = await this.saveGeneratedCode(
        validProviderName,
        generatedCode,
        language
      );
      
      // Generate tests if requested
      let testFilePaths = [];
      if (generateTests) {
        const generatedTests = await this.generateTests(
          validProviderName,
          apiSpecification,
          language
        );
        
        testFilePaths = await this.saveGeneratedTests(
          validProviderName,
          generatedTests,
          language
        );
      }
      
      return {
        success: true,
        providerName: validProviderName,
        filePaths,
        testFilePaths,
        message: `Successfully generated ${language} provider adapter for ${validProviderName}`
      };
    } catch (error) {
      console.error('Provider generation failed:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred during provider generation'
      };
    }
  }

  /**
   * Format provider name to ensure consistency
   * @param {string} name - Raw provider name
   * @returns {string} - Formatted provider name
   */
  formatProviderName(name) {
    // Convert to kebab-case for directory, PascalCase for class name
    const kebabCase = name.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    
    return kebabCase;
  }

  /**
   * Load API specification from file or URL
   * @param {string} apiSpec - Path or URL to API spec
   * @returns {Object} - Parsed API specification
   */
  async loadApiSpec(apiSpec) {
    // Support both file paths and URLs
    if (apiSpec.startsWith('http')) {
      // Implement URL fetching logic
      throw new Error('URL-based API specs not implemented yet');
    } else {
      // Load from file system
      const specPath = apiSpec.startsWith('./') ? 
        apiSpec : 
        path.join(this.options.apiSchemaDir, apiSpec);
      
      if (!fs.existsSync(specPath)) {
        throw new Error(`API specification file not found: ${specPath}`);
      }
      
      const specContent = fs.readFileSync(specPath, 'utf8');
      
      // Parse based on file extension
      if (specPath.endsWith('.json')) {
        return JSON.parse(specContent);
      } else if (specPath.endsWith('.yaml') || specPath.endsWith('.yml')) {
        // Implement YAML parsing
        throw new Error('YAML parsing not implemented yet');
      } else {
        throw new Error(`Unsupported API spec format: ${path.extname(specPath)}`);
      }
    }
  }

  /**
   * Generate provider code based on API specification
   * @param {string} providerName - Formatted provider name
   * @param {Object} apiSpec - Parsed API specification
   * @param {string} language - Target language
   * @returns {Object} - Generated code files
   */
  async generateProviderCode(providerName, apiSpec, language) {
    // Load appropriate template based on language
    const templatePath = path.join(
      this.options.templateDir, 
      `${language}-provider-template.js`
    );
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found for language: ${language}`);
    }
    
    // For demonstration purposes, we're returning a simplified structure
    // In a real implementation, this would process the API spec and generate code
    return {
      providerAdapter: this.generateProviderAdapter(providerName, apiSpec, language),
      providerRepository: this.generateProviderRepository(providerName, apiSpec, language),
      providerMapper: this.generateProviderMapper(providerName, apiSpec, language),
      providerClient: this.generateProviderClient(providerName, apiSpec, language)
    };
  }

  /**
   * Generate provider adapter implementation
   * @param {string} providerName - Formatted provider name
   * @param {Object} apiSpec - Parsed API specification
   * @param {string} language - Target language
   * @returns {string} - Generated adapter code
   */
  generateProviderAdapter(providerName, apiSpec, language) {
    const pascalCase = providerName
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
      
    // This is a simplified template - in a real implementation,
    // this would analyze the API spec and generate appropriate code
    if (language === 'typescript') {
      return `// Generated by Skidbladnir Provider Generator
import { TestCaseRepository } from '../../../pkg/domain/repositories/TestCaseRepository';
import { TestCase } from '../../../pkg/domain/entities/TestCase';
import { ${pascalCase}Client } from './${providerName}-client';
import { ${pascalCase}Mapper } from './${providerName}-mapper';

/**
 * ${pascalCase} Provider Adapter
 * Implements the TestCaseRepository interface for ${pascalCase}
 */
export class ${pascalCase}Provider implements TestCaseRepository {
  private client: ${pascalCase}Client;
  private mapper: ${pascalCase}Mapper;

  constructor(
    client: ${pascalCase}Client = new ${pascalCase}Client(),
    mapper: ${pascalCase}Mapper = new ${pascalCase}Mapper()
  ) {
    this.client = client;
    this.mapper = mapper;
  }

  async findById(id: string): Promise<TestCase | null> {
    try {
      const externalTestCase = await this.client.getTestCase(id);
      if (!externalTestCase) {
        return null;
      }
      return this.mapper.toDomain(externalTestCase);
    } catch (error) {
      // Log error
      console.error(\`Failed to retrieve test case from ${pascalCase}: \${error}\`);
      return null;
    }
  }

  async findAll(): Promise<TestCase[]> {
    try {
      const externalTestCases = await this.client.getAllTestCases();
      return externalTestCases.map(testCase => this.mapper.toDomain(testCase));
    } catch (error) {
      // Log error
      console.error(\`Failed to retrieve test cases from ${pascalCase}: \${error}\`);
      return [];
    }
  }

  async create(testCase: TestCase): Promise<TestCase> {
    try {
      const externalTestCase = this.mapper.fromDomain(testCase);
      const createdTestCase = await this.client.createTestCase(externalTestCase);
      return this.mapper.toDomain(createdTestCase);
    } catch (error) {
      // Log error
      console.error(\`Failed to create test case in ${pascalCase}: \${error}\`);
      throw new Error(\`Failed to create test case in ${pascalCase}: \${error.message}\`);
    }
  }

  async update(testCase: TestCase): Promise<TestCase> {
    try {
      const externalTestCase = this.mapper.fromDomain(testCase);
      const updatedTestCase = await this.client.updateTestCase(externalTestCase);
      return this.mapper.toDomain(updatedTestCase);
    } catch (error) {
      // Log error
      console.error(\`Failed to update test case in ${pascalCase}: \${error}\`);
      throw new Error(\`Failed to update test case in ${pascalCase}: \${error.message}\`);
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.client.deleteTestCase(id);
      return true;
    } catch (error) {
      // Log error
      console.error(\`Failed to delete test case from ${pascalCase}: \${error}\`);
      return false;
    }
  }
}`;
    } else if (language === 'python') {
      // Python implementation
      return `# Generated by Skidbladnir Provider Generator
from typing import List, Optional
from pkg.domain.repositories.test_case_repository import TestCaseRepository
from pkg.domain.entities.test_case import TestCase
from .${providerName.replace(/-/g, '_')}_client import ${pascalCase}Client
from .${providerName.replace(/-/g, '_')}_mapper import ${pascalCase}Mapper

class ${pascalCase}Provider(TestCaseRepository):
    """
    ${pascalCase} Provider Adapter
    Implements the TestCaseRepository interface for ${pascalCase}
    """
    
    def __init__(
        self, 
        client: ${pascalCase}Client = None,
        mapper: ${pascalCase}Mapper = None
    ):
        self.client = client or ${pascalCase}Client()
        self.mapper = mapper or ${pascalCase}Mapper()
    
    async def find_by_id(self, id: str) -> Optional[TestCase]:
        try:
            external_test_case = await self.client.get_test_case(id)
            if not external_test_case:
                return None
            return self.mapper.to_domain(external_test_case)
        except Exception as error:
            # Log error
            print(f"Failed to retrieve test case from ${pascalCase}: {error}")
            return None
    
    async def find_all(self) -> List[TestCase]:
        try:
            external_test_cases = await self.client.get_all_test_cases()
            return [self.mapper.to_domain(tc) for tc in external_test_cases]
        except Exception as error:
            # Log error
            print(f"Failed to retrieve test cases from ${pascalCase}: {error}")
            return []
    
    async def create(self, test_case: TestCase) -> TestCase:
        try:
            external_test_case = self.mapper.from_domain(test_case)
            created_test_case = await self.client.create_test_case(external_test_case)
            return self.mapper.to_domain(created_test_case)
        except Exception as error:
            # Log error
            print(f"Failed to create test case in ${pascalCase}: {error}")
            raise Exception(f"Failed to create test case in ${pascalCase}: {str(error)}")
    
    async def update(self, test_case: TestCase) -> TestCase:
        try:
            external_test_case = self.mapper.from_domain(test_case)
            updated_test_case = await self.client.update_test_case(external_test_case)
            return self.mapper.to_domain(updated_test_case)
        except Exception as error:
            # Log error
            print(f"Failed to update test case in ${pascalCase}: {error}")
            raise Exception(f"Failed to update test case in ${pascalCase}: {str(error)}")
    
    async def delete(self, id: str) -> bool:
        try:
            await self.client.delete_test_case(id)
            return True
        except Exception as error:
            # Log error
            print(f"Failed to delete test case from ${pascalCase}: {error}")
            return False`;
    } else if (language === 'go') {
      // Go implementation
      return `// Generated by Skidbladnir Provider Generator
package ${providerName.replace(/-/g, "")}

import (
	"context"
	"errors"
	"fmt"
	"log"

	"github.com/heymumford/skidbladnir/pkg/domain/entities"
	"github.com/heymumford/skidbladnir/pkg/domain/repositories"
)

// ${pascalCase}Provider implements the TestCaseRepository interface for ${pascalCase}
type ${pascalCase}Provider struct {
	client *${pascalCase}Client
	mapper *${pascalCase}Mapper
}

// New${pascalCase}Provider creates a new instance of the ${pascalCase} provider
func New${pascalCase}Provider(client *${pascalCase}Client, mapper *${pascalCase}Mapper) *${pascalCase}Provider {
	if client == nil {
		client = NewDefault${pascalCase}Client()
	}
	if mapper == nil {
		mapper = New${pascalCase}Mapper()
	}
	return &${pascalCase}Provider{
		client: client,
		mapper: mapper,
	}
}

// FindByID retrieves a test case by its ID
func (p *${pascalCase}Provider) FindByID(ctx context.Context, id string) (*entities.TestCase, error) {
	externalTestCase, err := p.client.GetTestCase(ctx, id)
	if err != nil {
		log.Printf("Failed to retrieve test case from ${pascalCase}: %v", err)
		return nil, err
	}
	if externalTestCase == nil {
		return nil, nil
	}
	return p.mapper.ToDomain(externalTestCase), nil
}

// FindAll retrieves all test cases
func (p *${pascalCase}Provider) FindAll(ctx context.Context) ([]*entities.TestCase, error) {
	externalTestCases, err := p.client.GetAllTestCases(ctx)
	if err != nil {
		log.Printf("Failed to retrieve test cases from ${pascalCase}: %v", err)
		return nil, err
	}
	
	testCases := make([]*entities.TestCase, len(externalTestCases))
	for i, tc := range externalTestCases {
		testCases[i] = p.mapper.ToDomain(tc)
	}
	return testCases, nil
}

// Create creates a new test case
func (p *${pascalCase}Provider) Create(ctx context.Context, testCase *entities.TestCase) (*entities.TestCase, error) {
	externalTestCase := p.mapper.FromDomain(testCase)
	createdTestCase, err := p.client.CreateTestCase(ctx, externalTestCase)
	if err != nil {
		log.Printf("Failed to create test case in ${pascalCase}: %v", err)
		return nil, err
	}
	return p.mapper.ToDomain(createdTestCase), nil
}

// Update updates an existing test case
func (p *${pascalCase}Provider) Update(ctx context.Context, testCase *entities.TestCase) (*entities.TestCase, error) {
	externalTestCase := p.mapper.FromDomain(testCase)
	updatedTestCase, err := p.client.UpdateTestCase(ctx, externalTestCase)
	if err != nil {
		log.Printf("Failed to update test case in ${pascalCase}: %v", err)
		return nil, err
	}
	return p.mapper.ToDomain(updatedTestCase), nil
}

// Delete deletes a test case by its ID
func (p *${pascalCase}Provider) Delete(ctx context.Context, id string) (bool, error) {
	err := p.client.DeleteTestCase(ctx, id)
	if err != nil {
		log.Printf("Failed to delete test case from ${pascalCase}: %v", err)
		return false, err
	}
	return true, nil
}`;
    }
    
    throw new Error(`Unsupported language: ${language}`);
  }

  /**
   * Generate provider repository implementation
   * @param {string} providerName - Formatted provider name
   * @param {Object} apiSpec - Parsed API specification
   * @param {string} language - Target language
   * @returns {string} - Generated repository code
   */
  generateProviderRepository(providerName, apiSpec, language) {
    // Implement repository code generation logic
    return `// Repository implementation for ${providerName}`;
  }

  /**
   * Generate provider mapper implementation
   * @param {string} providerName - Formatted provider name
   * @param {Object} apiSpec - Parsed API specification
   * @param {string} language - Target language
   * @returns {string} - Generated mapper code
   */
  generateProviderMapper(providerName, apiSpec, language) {
    // Implement mapper code generation logic
    return `// Mapper implementation for ${providerName}`;
  }

  /**
   * Generate provider client implementation
   * @param {string} providerName - Formatted provider name
   * @param {Object} apiSpec - Parsed API specification
   * @param {string} language - Target language
   * @returns {string} - Generated client code
   */
  generateProviderClient(providerName, apiSpec, language) {
    // Implement client code generation logic
    return `// Client implementation for ${providerName}`;
  }

  /**
   * Save generated code to disk
   * @param {string} providerName - Formatted provider name
   * @param {Object} generatedCode - Generated code files
   * @param {string} language - Target language
   * @returns {Array<string>} - Paths to saved files
   */
  async saveGeneratedCode(providerName, generatedCode, language) {
    // Create output directory based on language
    let outputDir;
    if (language === 'typescript') {
      outputDir = path.join(this.options.outputDir, providerName);
    } else if (language === 'python') {
      outputDir = path.join(this.options.outputDir.replace('typescript', 'python'), providerName.replace(/-/g, '_'));
    } else if (language === 'go') {
      outputDir = path.join(this.options.outputDir.replace('typescript', 'go'), providerName.replace(/-/g, ''));
    } else {
      throw new Error(`Unsupported language: ${language}`);
    }
    
    // Ensure directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Determine file extension based on language
    const fileExt = language === 'typescript' ? '.ts' : 
                   language === 'python' ? '.py' :
                   language === 'go' ? '.go' : '';
    
    // Save files
    const filePaths = [];
    for (const [key, content] of Object.entries(generatedCode)) {
      let fileName;
      if (language === 'typescript') {
        fileName = `${providerName}-${key.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '')}.ts`;
      } else if (language === 'python') {
        fileName = `${providerName.replace(/-/g, '_')}_${key.toLowerCase()}.py`;
      } else if (language === 'go') {
        fileName = `${key.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')}.go`;
      }
      
      const filePath = path.join(outputDir, fileName);
      fs.writeFileSync(filePath, content);
      filePaths.push(filePath);
    }
    
    return filePaths;
  }

  /**
   * Generate tests for the provider
   * @param {string} providerName - Formatted provider name
   * @param {Object} apiSpec - Parsed API specification
   * @param {string} language - Target language
   * @returns {Object} - Generated test files
   */
  async generateTests(providerName, apiSpec, language) {
    // Implement test generation logic
    return {
      providerTest: `// Test implementation for ${providerName}`,
      clientTest: `// Client test implementation for ${providerName}`,
      mapperTest: `// Mapper test implementation for ${providerName}`
    };
  }

  /**
   * Save generated tests to disk
   * @param {string} providerName - Formatted provider name
   * @param {Object} generatedTests - Generated test files
   * @param {string} language - Target language
   * @returns {Array<string>} - Paths to saved test files
   */
  async saveGeneratedTests(providerName, generatedTests, language) {
    // Implement test saving logic
    return [`${providerName}-test.${language === 'typescript' ? 'ts' : language === 'python' ? 'py' : 'go'}`];
  }
}

module.exports = ProviderGenerator;