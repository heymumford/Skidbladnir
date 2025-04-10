/**
 * Mock implementation of fast-xml-parser and jsdom for XML validation testing
 * 
 * This is a compatibility layer that adapts our new pure JS implementation
 * to work with existing tests that were written against libxmljs2.
 */

// This mock is no longer needed with the new implementation.
// It's kept as a stub for compatibility with any imports that might still exist in tests.

console.warn('libxmljs2 mock is deprecated. Use fast-xml-parser and jsdom directly.');

module.exports = {
  parseXml: () => {
    throw new Error('libxmljs2 is deprecated. Use fast-xml-parser and jsdom directly.');
  }
};