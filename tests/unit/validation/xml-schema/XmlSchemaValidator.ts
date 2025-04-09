/**
 * XML Schema Validator
 * 
 * Validates XML documents against XSD schemas to ensure structural
 * correctness and adherence to specified formats.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as libxmljs from 'libxmljs2';

export class XmlSchemaValidator {
  /**
   * Validates an XML string against an XSD schema string
   * 
   * @param xmlString - The XML content to validate
   * @param xsdString - The XSD schema to validate against
   * @returns Validation result with success flag and any error messages
   */
  public static validateXmlString(
    xmlString: string,
    xsdString: string
  ): { valid: boolean; errors: string[] } {
    try {
      // Parse the XSD and XML
      const xsdDoc = libxmljs.parseXml(xsdString);
      const xmlDoc = libxmljs.parseXml(xmlString);
      
      // Validate XML against the schema
      const isValid = xmlDoc.validate(xsdDoc);
      
      if (isValid) {
        return { valid: true, errors: [] };
      } else {
        return {
          valid: false,
          errors: xmlDoc.validationErrors.map(error => error.message)
        };
      }
    } catch (error) {
      return {
        valid: false,
        errors: [(error as Error).message]
      };
    }
  }

  /**
   * Validates an XML file against an XSD schema file
   * 
   * @param xmlFilePath - Path to the XML file
   * @param xsdFilePath - Path to the XSD schema file
   * @returns Validation result with success flag and any error messages
   */
  public static validateXmlFile(
    xmlFilePath: string,
    xsdFilePath: string
  ): { valid: boolean; errors: string[] } {
    try {
      if (!fs.existsSync(xmlFilePath)) {
        return { valid: false, errors: [`XML file not found: ${xmlFilePath}`] };
      }
      
      if (!fs.existsSync(xsdFilePath)) {
        return { valid: false, errors: [`XSD file not found: ${xsdFilePath}`] };
      }
      
      const xmlString = fs.readFileSync(xmlFilePath, 'utf-8');
      const xsdString = fs.readFileSync(xsdFilePath, 'utf-8');
      
      return this.validateXmlString(xmlString, xsdString);
    } catch (error) {
      return {
        valid: false,
        errors: [(error as Error).message]
      };
    }
  }

  /**
   * Validates an XML file against a schema determined from the XML's namespace
   * 
   * @param xmlFilePath - Path to the XML file
   * @param schemasDir - Directory containing schema files to search
   * @returns Validation result with success flag and any error messages
   */
  public static validateXmlFileWithAutoSchema(
    xmlFilePath: string,
    schemasDir: string
  ): { valid: boolean; errors: string[]; usedSchema?: string } {
    try {
      if (!fs.existsSync(xmlFilePath)) {
        return { valid: false, errors: [`XML file not found: ${xmlFilePath}`] };
      }
      
      const xmlString = fs.readFileSync(xmlFilePath, 'utf-8');
      const xmlDoc = libxmljs.parseXml(xmlString);
      
      // Extract the namespace from the document
      const namespaces = xmlDoc.namespaces();
      
      if (namespaces.length === 0) {
        return { 
          valid: false, 
          errors: ['No namespace found in XML document'] 
        };
      }
      
      // Try to find a matching schema in the schemas directory
      for (const ns of namespaces) {
        const uri = ns.href();
        const schemaFiles = fs.readdirSync(schemasDir)
          .filter(file => file.endsWith('.xsd'));
        
        for (const schemaFile of schemaFiles) {
          const schemaPath = path.join(schemasDir, schemaFile);
          const xsdString = fs.readFileSync(schemaPath, 'utf-8');
          const xsdDoc = libxmljs.parseXml(xsdString);
          
          const xsdNamespace = xsdDoc.root()?.namespace()?.href();
          
          if (xsdNamespace === uri) {
            const result = this.validateXmlString(xmlString, xsdString);
            return {
              ...result,
              usedSchema: schemaPath
            };
          }
        }
      }
      
      return { 
        valid: false, 
        errors: ['No matching schema found for XML namespace'] 
      };
    } catch (error) {
      return {
        valid: false,
        errors: [(error as Error).message]
      };
    }
  }

  /**
   * Validates all XML files in a directory against corresponding schemas
   * 
   * @param xmlDir - Directory containing XML files
   * @param schemaDir - Directory containing XSD schema files
   * @param pattern - Optional glob pattern to filter XML files
   * @returns Validation results for each file
   */
  public static validateDirectory(
    xmlDir: string,
    schemaDir: string,
    pattern: string = '**/*.xml'
  ): { 
    filePath: string; 
    valid: boolean; 
    errors: string[]; 
    usedSchema?: string 
  }[] {
    const glob = require('glob');
    const results = [];
    
    const xmlFiles = glob.sync(pattern, { cwd: xmlDir, absolute: true });
    
    for (const xmlFile of xmlFiles) {
      const result = this.validateXmlFileWithAutoSchema(
        xmlFile, 
        schemaDir
      );
      
      results.push({
        filePath: xmlFile,
        valid: result.valid,
        errors: result.errors,
        usedSchema: result.usedSchema
      });
    }
    
    return results;
  }
}