/**
 * Documentation validation tests
 */
const fs = require('fs');
const path = require('path');
const { expect } = require('chai');

describe('Documentation Structure', () => {
  const rootDir = path.resolve(__dirname, '../../');
  
  it('should not have markdown files in root directory except README.md', () => {
    const files = fs.readdirSync(rootDir);
    const markdownFiles = files.filter(file => 
      file.endsWith('.md') && file !== 'README.md' && !fs.statSync(path.join(rootDir, file)).isDirectory()
    );
    
    if (markdownFiles.length > 0) {
      console.error('Markdown files found in root directory:', markdownFiles);
    }
    
    expect(markdownFiles).to.be.empty;
  });
  
  it('should have key documentation files in proper docs subdirectories', () => {
    const requiredDocs = [
      'docs/architecture/folder-structure.md',
      'docs/project/about.md',
      'docs/architecture.md',
      'docs/development-guide.md',
      'docs/build-system.md',
      'docs/containerization.md'
    ];
    
    for (const docPath of requiredDocs) {
      const fullPath = path.join(rootDir, docPath);
      const exists = fs.existsSync(fullPath);
      
      if (!exists) {
        console.error(`Required documentation file is missing: ${docPath}`);
      }
      
      expect(exists, `${docPath} should exist`).to.be.true;
    }
  });
  
  it('should have README.md with clear goal, problems, and definition sections', () => {
    const readmePath = path.join(rootDir, 'README.md');
    const readmeContent = fs.readFileSync(readmePath, 'utf8');
    
    expect(readmeContent.includes('**GOAL**:')).to.be.true;
    expect(readmeContent.includes('**PROBLEMS SOLVED**:')).to.be.true;
    expect(readmeContent.includes('**WHAT IT IS**:')).to.be.true;
  });
  
  it('should not have duplicate content across documentation files', () => {
    const docsDir = path.join(rootDir, 'docs');
    const allDocContents = new Map();
    
    function scanDirectory(dir) {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const fullPath = path.join(dir, file);
        
        if (fs.statSync(fullPath).isDirectory()) {
          scanDirectory(fullPath);
        } else if (file.endsWith('.md')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          allDocContents.set(fullPath, content);
        }
      }
    }
    
    scanDirectory(docsDir);
    
    // Check for substantial content duplication
    const duplications = [];
    const entries = Array.from(allDocContents.entries());
    
    for (let i = 0; i < entries.length; i++) {
      const [file1, content1] = entries[i];
      
      for (let j = i + 1; j < entries.length; j++) {
        const [file2, content2] = entries[j];
        
        // Simple heuristic: if more than 200 characters are identical between paragraphs
        const paragraphs1 = content1.split('\n\n');
        const paragraphs2 = content2.split('\n\n');
        
        for (const p1 of paragraphs1) {
          if (p1.length < 100) continue; // Skip short paragraphs
          
          for (const p2 of paragraphs2) {
            if (p2.length < 100) continue;
            
            if (p1 === p2 && p1.length > 200) {
              duplications.push({
                file1: path.relative(rootDir, file1),
                file2: path.relative(rootDir, file2),
                duplicateContent: p1.substring(0, 100) + '...'
              });
            }
          }
        }
      }
    }
    
    if (duplications.length > 0) {
      console.error('Content duplication found:', JSON.stringify(duplications, null, 2));
    }
    
    expect(duplications).to.be.empty;
  });
});