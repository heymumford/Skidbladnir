/**
 * Documentation structure validation tests
 * 
 * These tests ensure that our documentation follows proper organization
 * and prevents duplication of content.
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Simple test runner
function runTests() {
  const rootDir = path.resolve(__dirname, '../../');
  const docsDir = path.join(rootDir, 'docs');
  let passCount = 0;
  let failCount = 0;
  
  console.log('Running Documentation Structure Tests...\n');
  
  // Test 1: Only README.md in root directory
  try {
    const files = fs.readdirSync(rootDir);
    const mdFiles = files.filter(file => 
      file.endsWith('.md') && file !== 'README.md' && !fs.statSync(path.join(rootDir, file)).isDirectory()
    );
    
    assert.strictEqual(mdFiles.length, 0, 'No markdown files other than README.md should exist in root');
    console.log('✓ PASS: Only README.md exists in root directory');
    passCount++;
  } catch (err) {
    console.error(`✗ FAIL: Root directory test failed: ${err.message}`);
    if (err.actual) {
      console.error(`  Found: ${err.actual} markdown files in root (expected: ${err.expected})`);
    }
    failCount++;
  }
  
  // Test 2: No duplicate documentation files
  try {
    const docMap = new Map();
    
    // Recursive function to collect all markdown files
    const collectMarkdownFiles = (dir) => {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const fullPath = path.join(dir, file);
        
        if (fs.statSync(fullPath).isDirectory()) {
          // Skip node_modules and similar directories
          if (!file.startsWith('.') && file !== 'node_modules') {
            collectMarkdownFiles(fullPath);
          }
        } else if (file.endsWith('.md') && file !== 'README.md') {
          const baseName = file.toLowerCase();
          
          if (!docMap.has(baseName)) {
            docMap.set(baseName, []);
          }
          
          docMap.get(baseName).push(fullPath);
        }
      }
    };
    
    collectMarkdownFiles(docsDir);
    
    // Check for duplicates
    const duplicates = Array.from(docMap.entries())
      .filter(([_, paths]) => paths.length > 1)
      .map(([name, paths]) => ({ name, paths }));
    
    assert.strictEqual(duplicates.length, 0, 'No duplicate documentation files should exist');
    console.log('✓ PASS: No duplicate documentation files found');
    passCount++;
  } catch (err) {
    console.error(`✗ FAIL: Duplicate files test failed: ${err.message}`);
    failCount++;
  }
  
  // Test 3: Key documentation is in proper directories
  try {
    // Define expected documentation organization
    const expectedDocs = {
      'architecture': [
        'folder-structure.md',
        'api-bridge-architecture.md',
        'c4-diagrams.md',
        'clean-architecture-guide.md',
        'local-llm-assistant.md'
      ],
      'project': [
        'about.md',
        'kanban.md',
        'strategy.md',
        'tdd-approach.md'
      ],
      'api': [
        'api-comparison.md',
        'provider-interface.md'
      ],
      'user': [
        'ui-requirements.md',
        'ui-implementation-summary.md',
        'ui-test-plan.md'
      ]
    };
    
    // Verify expected directory structure
    for (const [subdir, expectedFiles] of Object.entries(expectedDocs)) {
      const subdirPath = path.join(docsDir, subdir);
      
      assert.strictEqual(fs.existsSync(subdirPath), true, `${subdir} directory should exist`);
      
      for (const file of expectedFiles) {
        const filePath = path.join(subdirPath, file);
        assert.strictEqual(fs.existsSync(filePath), true, `${subdir}/${file} should exist`);
      }
    }
    
    console.log('✓ PASS: All key documentation is in proper directories');
    passCount++;
  } catch (err) {
    console.error(`✗ FAIL: Documentation organization test failed: ${err.message}`);
    failCount++;
  }
  
  // Print summary
  console.log(`\nTest Results: ${passCount} passed, ${failCount} failed`);
  
  return failCount === 0;
}

// Run tests if this script is executed directly
if (require.main === module) {
  const success = runTests();
  process.exit(success ? 0 : 1);
}

module.exports = { runTests };