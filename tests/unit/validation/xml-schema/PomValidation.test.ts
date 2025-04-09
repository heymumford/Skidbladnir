/**
 * POM Validation Test
 * 
 * This test validates that POM files in the project adhere to the Maven POM schema.
 */

import * as fs from 'fs';
import * as path from 'path';
import { XmlSchemaValidator } from './XmlSchemaValidator';

describe('Maven POM Validation', () => {
  const projectRoot = path.resolve(__dirname, '../../../../');
  const schemaDir = path.join(projectRoot, 'schemas');
  const pomSchemaPath = path.join(schemaDir, 'maven-4.0.0.xsd');
  
  beforeAll(() => {
    // Ensure Maven schema exists
    if (!fs.existsSync(pomSchemaPath)) {
      throw new Error(
        `Maven POM schema not found at ${pomSchemaPath}. ` +
        'Run scripts/util/xml-validator.sh download to download schemas.'
      );
    }
  });
  
  it('should validate all POM files against the Maven schema', () => {
    // Find all POM files in the project
    const results = XmlSchemaValidator.validateDirectory(
      projectRoot,
      schemaDir,
      '**/pom.xml'
    );
    
    // Log the results for debugging
    console.log(`Found ${results.length} POM files`);
    
    // Group results by validity
    const validFiles = results.filter(r => r.valid);
    const invalidFiles = results.filter(r => !r.valid);
    
    console.log(`Valid: ${validFiles.length}`);
    console.log(`Invalid: ${invalidFiles.length}`);
    
    // List invalid files with errors
    if (invalidFiles.length > 0) {
      console.log('Invalid POM files:');
      for (const result of invalidFiles) {
        const relativePath = path.relative(projectRoot, result.filePath);
        console.log(`- ${relativePath}`);
        for (const error of result.errors) {
          console.log(`  • ${error}`);
        }
      }
    }
    
    // Expect all files to be valid
    for (const result of invalidFiles) {
      const relativePath = path.relative(projectRoot, result.filePath);
      expect(result.valid).withContext(`POM file ${relativePath} should be valid`).toBe(true);
    }
  });
  
  it('should validate the API integration POM file', () => {
    const apiIntegrationPom = path.join(projectRoot, 'tests/api-integration/pom.xml');
    
    // Ensure the file exists
    expect(fs.existsSync(apiIntegrationPom)).toBe(true);
    
    // Validate the file
    const result = XmlSchemaValidator.validateXmlFile(apiIntegrationPom, pomSchemaPath);
    
    // If validation fails, show errors
    if (!result.valid) {
      console.log('Validation errors:');
      for (const error of result.errors) {
        console.log(`- ${error}`);
      }
    }
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});