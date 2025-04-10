/**
 * Mock implementation of libxmljs2
 * 
 * This mock provides test-friendly implementations of key libxmljs2 functions
 * to avoid native code dependency issues.
 */

// Mock Document
class XmlDocument {
  constructor(content) {
    this.content = content;
    this.validationErrors = [];
    this.namespaceList = [];
  }

  // Mock validation method
  validate(schema) {
    // Always return valid for tests unless overridden
    return true;
  }

  // Mock namespace method  
  namespaces() {
    return this.namespaceList;
  }

  // Mock root method
  root() {
    return {
      namespace: () => {
        return { href: () => 'http://maven.apache.org/POM/4.0.0' };
      }
    };
  }

  // Set validation result for testing
  setValidationResult(isValid, errors = []) {
    if (!isValid) {
      this.validationErrors = errors.map(msg => ({ message: msg }));
    } else {
      this.validationErrors = [];
    }
    return this;
  }

  // Set namespaces for testing
  setNamespaces(namespaces) {
    this.namespaceList = namespaces.map(uri => ({
      href: () => uri
    }));
    return this;
  }
}

// Main mock methods
const libxmljs = {
  // Mock document parser
  parseXml: (content) => {
    return new XmlDocument(content);
  },

  // Mock for test control
  __setNextValidationResult: (isValid, errors = []) => {
    libxmljs.__nextValidationResult = { isValid, errors };
  },

  // Test state
  __nextValidationResult: { isValid: true, errors: [] }
};

module.exports = libxmljs;