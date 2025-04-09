/**
 * Tests for XmlSchemaValidator
 */

import * as fs from 'fs';
import * as path from 'path';
import { XmlSchemaValidator } from './XmlSchemaValidator';

// Create test directory and mock files
const TEST_DIR = path.join(__dirname, 'test-files');
const SCHEMAS_DIR = path.join(TEST_DIR, 'schemas');

describe('XmlSchemaValidator', () => {
  beforeAll(() => {
    // Create test directories if they don't exist
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
    
    if (!fs.existsSync(SCHEMAS_DIR)) {
      fs.mkdirSync(SCHEMAS_DIR, { recursive: true });
    }
    
    // Create a simple XSD schema for testing
    const testSchema = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" 
           targetNamespace="http://test.skidbladnir.org/schema/test" 
           xmlns="http://test.skidbladnir.org/schema/test" 
           elementFormDefault="qualified">
  <xs:element name="testRoot">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="testElement" type="xs:string" minOccurs="1" maxOccurs="1"/>
        <xs:element name="optionalElement" type="xs:string" minOccurs="0" maxOccurs="1"/>
        <xs:element name="numberElement" type="xs:integer" minOccurs="1" maxOccurs="1"/>
      </xs:sequence>
      <xs:attribute name="testAttr" type="xs:string" use="required"/>
    </xs:complexType>
  </xs:element>
</xs:schema>`;
    
    // Write test schema to file
    fs.writeFileSync(path.join(SCHEMAS_DIR, 'test-schema.xsd'), testSchema);
    
    // Create a valid XML document
    const validXml = `<?xml version="1.0" encoding="UTF-8"?>
<testRoot xmlns="http://test.skidbladnir.org/schema/test" testAttr="test">
  <testElement>Test content</testElement>
  <optionalElement>Optional content</optionalElement>
  <numberElement>42</numberElement>
</testRoot>`;
    
    // Write valid XML to file
    fs.writeFileSync(path.join(TEST_DIR, 'valid.xml'), validXml);
    
    // Create an invalid XML document (missing required element)
    const invalidXml = `<?xml version="1.0" encoding="UTF-8"?>
<testRoot xmlns="http://test.skidbladnir.org/schema/test" testAttr="test">
  <optionalElement>Optional content</optionalElement>
  <numberElement>42</numberElement>
</testRoot>`;
    
    // Write invalid XML to file
    fs.writeFileSync(path.join(TEST_DIR, 'invalid-missing-element.xml'), invalidXml);
    
    // Create an invalid XML document (wrong type)
    const invalidTypeXml = `<?xml version="1.0" encoding="UTF-8"?>
<testRoot xmlns="http://test.skidbladnir.org/schema/test" testAttr="test">
  <testElement>Test content</testElement>
  <optionalElement>Optional content</optionalElement>
  <numberElement>not a number</numberElement>
</testRoot>`;
    
    // Write invalid XML to file
    fs.writeFileSync(path.join(TEST_DIR, 'invalid-wrong-type.xml'), invalidTypeXml);
    
    // Create an XML document with no schema reference
    const noSchemaXml = `<?xml version="1.0" encoding="UTF-8"?>
<root>
  <element>Content</element>
</root>`;
    
    // Write no schema XML to file
    fs.writeFileSync(path.join(TEST_DIR, 'no-schema.xml'), noSchemaXml);
    
    // Create a Maven POM schema for testing
    const pomSchema = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" 
           targetNamespace="http://maven.apache.org/POM/4.0.0" 
           xmlns="http://maven.apache.org/POM/4.0.0" 
           elementFormDefault="qualified">
  <xs:element name="project">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="modelVersion" type="xs:string" minOccurs="1" maxOccurs="1"/>
        <xs:element name="groupId" type="xs:string" minOccurs="1" maxOccurs="1"/>
        <xs:element name="artifactId" type="xs:string" minOccurs="1" maxOccurs="1"/>
        <xs:element name="version" type="xs:string" minOccurs="1" maxOccurs="1"/>
        <!-- Simplified schema for testing -->
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>`;
    
    // Write Maven POM schema to file
    fs.writeFileSync(path.join(SCHEMAS_DIR, 'maven-pom.xsd'), pomSchema);
    
    // Create a valid POM file
    const validPom = `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>org.test</groupId>
  <artifactId>test-project</artifactId>
  <version>1.0.0</version>
</project>`;
    
    // Write valid POM to file
    fs.writeFileSync(path.join(TEST_DIR, 'valid-pom.xml'), validPom);
    
    // Create an invalid POM file
    const invalidPom = `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>org.test</groupId>
  <!-- Missing artifactId -->
  <version>1.0.0</version>
</project>`;
    
    // Write invalid POM to file
    fs.writeFileSync(path.join(TEST_DIR, 'invalid-pom.xml'), invalidPom);
  });
  
  afterAll(() => {
    // Clean up test files
    try {
      if (fs.existsSync(TEST_DIR)) {
        const deleteDir = (dirPath: string) => {
          if (fs.existsSync(dirPath)) {
            fs.readdirSync(dirPath).forEach((file) => {
              const curPath = path.join(dirPath, file);
              if (fs.lstatSync(curPath).isDirectory()) {
                deleteDir(curPath);
              } else {
                fs.unlinkSync(curPath);
              }
            });
            fs.rmdirSync(dirPath);
          }
        };
        
        deleteDir(TEST_DIR);
      }
    } catch (error) {
      console.error('Error cleaning up test files:', error);
    }
  });
  
  describe('validateXmlString', () => {
    it('should validate a valid XML string against schema', () => {
      const validXml = fs.readFileSync(path.join(TEST_DIR, 'valid.xml'), 'utf-8');
      const schema = fs.readFileSync(path.join(SCHEMAS_DIR, 'test-schema.xsd'), 'utf-8');
      
      const result = XmlSchemaValidator.validateXmlString(validXml, schema);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should return errors for an invalid XML string (missing element)', () => {
      const invalidXml = fs.readFileSync(path.join(TEST_DIR, 'invalid-missing-element.xml'), 'utf-8');
      const schema = fs.readFileSync(path.join(SCHEMAS_DIR, 'test-schema.xsd'), 'utf-8');
      
      const result = XmlSchemaValidator.validateXmlString(invalidXml, schema);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
    
    it('should return errors for an invalid XML string (wrong type)', () => {
      const invalidXml = fs.readFileSync(path.join(TEST_DIR, 'invalid-wrong-type.xml'), 'utf-8');
      const schema = fs.readFileSync(path.join(SCHEMAS_DIR, 'test-schema.xsd'), 'utf-8');
      
      const result = XmlSchemaValidator.validateXmlString(invalidXml, schema);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
    
    it('should handle malformed XML', () => {
      const malformedXml = '<root>This is not valid XML';
      const schema = fs.readFileSync(path.join(SCHEMAS_DIR, 'test-schema.xsd'), 'utf-8');
      
      const result = XmlSchemaValidator.validateXmlString(malformedXml, schema);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
    
    it('should handle malformed XSD', () => {
      const validXml = fs.readFileSync(path.join(TEST_DIR, 'valid.xml'), 'utf-8');
      const malformedSchema = '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">';
      
      const result = XmlSchemaValidator.validateXmlString(validXml, malformedSchema);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
  
  describe('validateXmlFile', () => {
    it('should validate a valid XML file against schema file', () => {
      const validXmlPath = path.join(TEST_DIR, 'valid.xml');
      const schemaPath = path.join(SCHEMAS_DIR, 'test-schema.xsd');
      
      const result = XmlSchemaValidator.validateXmlFile(validXmlPath, schemaPath);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should return errors for an invalid XML file', () => {
      const invalidXmlPath = path.join(TEST_DIR, 'invalid-missing-element.xml');
      const schemaPath = path.join(SCHEMAS_DIR, 'test-schema.xsd');
      
      const result = XmlSchemaValidator.validateXmlFile(invalidXmlPath, schemaPath);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
    
    it('should handle non-existent XML file', () => {
      const nonExistentPath = path.join(TEST_DIR, 'does-not-exist.xml');
      const schemaPath = path.join(SCHEMAS_DIR, 'test-schema.xsd');
      
      const result = XmlSchemaValidator.validateXmlFile(nonExistentPath, schemaPath);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(`XML file not found: ${nonExistentPath}`);
    });
    
    it('should handle non-existent schema file', () => {
      const validXmlPath = path.join(TEST_DIR, 'valid.xml');
      const nonExistentPath = path.join(SCHEMAS_DIR, 'does-not-exist.xsd');
      
      const result = XmlSchemaValidator.validateXmlFile(validXmlPath, nonExistentPath);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(`XSD file not found: ${nonExistentPath}`);
    });
  });
  
  describe('validateXmlFileWithAutoSchema', () => {
    it('should automatically find and use the correct schema', () => {
      const validXmlPath = path.join(TEST_DIR, 'valid.xml');
      
      const result = XmlSchemaValidator.validateXmlFileWithAutoSchema(
        validXmlPath,
        SCHEMAS_DIR
      );
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.usedSchema).toContain('test-schema.xsd');
    });
    
    it('should handle XML without a namespace', () => {
      const noSchemaPath = path.join(TEST_DIR, 'no-schema.xml');
      
      const result = XmlSchemaValidator.validateXmlFileWithAutoSchema(
        noSchemaPath,
        SCHEMAS_DIR
      );
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('No namespace found in XML document');
    });
    
    it('should handle Maven POM files', () => {
      const pomPath = path.join(TEST_DIR, 'valid-pom.xml');
      
      const result = XmlSchemaValidator.validateXmlFileWithAutoSchema(
        pomPath,
        SCHEMAS_DIR
      );
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.usedSchema).toContain('maven-pom.xsd');
    });
    
    it('should detect errors in invalid POM files', () => {
      const invalidPomPath = path.join(TEST_DIR, 'invalid-pom.xml');
      
      const result = XmlSchemaValidator.validateXmlFileWithAutoSchema(
        invalidPomPath,
        SCHEMAS_DIR
      );
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.usedSchema).toContain('maven-pom.xsd');
    });
  });
  
  describe('validateDirectory', () => {
    it('should validate all XML files in a directory', () => {
      const results = XmlSchemaValidator.validateDirectory(
        TEST_DIR,
        SCHEMAS_DIR
      );
      
      // We should have 5 XML files in the test directory
      expect(results).toHaveLength(5);
      
      // Check specific files
      const validResults = results.filter(r => r.filePath.includes('valid.xml'));
      expect(validResults).toHaveLength(1);
      expect(validResults[0].valid).toBe(true);
      
      const invalidResults = results.filter(r => r.filePath.includes('invalid-missing-element.xml'));
      expect(invalidResults).toHaveLength(1);
      expect(invalidResults[0].valid).toBe(false);
    });
    
    it('should support filtering by pattern', () => {
      const results = XmlSchemaValidator.validateDirectory(
        TEST_DIR,
        SCHEMAS_DIR,
        '*pom.xml'
      );
      
      // We should have 2 POM files matching the pattern
      expect(results).toHaveLength(2);
      
      // Check valid and invalid POMs
      const validPomResults = results.filter(r => r.filePath.includes('valid-pom.xml'));
      expect(validPomResults).toHaveLength(1);
      expect(validPomResults[0].valid).toBe(true);
      
      const invalidPomResults = results.filter(r => r.filePath.includes('invalid-pom.xml'));
      expect(invalidPomResults).toHaveLength(1);
      expect(invalidPomResults[0].valid).toBe(false);
    });
  });
});