// GitHub Copilot Refactoring Scripts
// These scripts provide automation for common refactoring tasks
// They can be referenced or used with Copilot Agent Mode

/**
 * Extract Interface script - Creates an interface from a class implementation
 * Usage: Highlight a class, then ask Copilot to "Extract an interface using the script"
 * 
 * @param {string} classImplementation - The class to extract interface from 
 * @param {string} classNamePattern - Optional regex to extract class name
 * @returns {string} The extracted interface declaration
 */
function extractInterface(classImplementation, classNamePattern = /class\s+(\w+)/) {
  // Extract class name
  const classMatch = classImplementation.match(classNamePattern);
  if (!classMatch || !classMatch[1]) {
    return "Error: Could not extract class name";
  }
  
  const className = classMatch[1];
  const interfaceName = `I${className}`;
  
  // Extract public methods
  const methodRegex = /public\s+(\w+)\s*\(([^)]*)\)\s*:\s*([^{]+)/g;
  let methodMatch;
  let methods = [];
  
  while ((methodMatch = methodRegex.exec(classImplementation)) !== null) {
    const methodName = methodMatch[1];
    const params = methodMatch[2].trim();
    const returnType = methodMatch[3].trim();
    
    methods.push(`  ${methodName}(${params}): ${returnType};`);
  }
  
  // Generate interface
  return `interface ${interfaceName} {
${methods.join('\n')}
}`;
}

/**
 * Extract Method analyzer - Identifies potential method extractions
 * Usage: Highlight a long method, then ask Copilot to "Analyze for method extraction"
 * 
 * @param {string} methodImplementation - The method to analyze 
 * @returns {Object[]} Suggested extractions with line numbers and names
 */
function analyzeMethodExtractions(methodImplementation) {
  const lines = methodImplementation.split('\n');
  const suggestions = [];
  
  // Simple heuristic: Look for comment blocks or logical groupings
  let currentBlock = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for comment lines - potential indicators of logical blocks
    if (line.trim().startsWith('//') || line.trim().startsWith('/*')) {
      // If we were tracking a block, close it
      if (currentBlock) {
        currentBlock.endLine = i - 1;
        suggestions.push(currentBlock);
        currentBlock = null;
      }
      
      // Start new block with comment as name
      const commentText = line.trim().replace(/\/\/|\/\*|\*\//g, '').trim();
      if (commentText) {
        currentBlock = {
          name: generateMethodName(commentText),
          startLine: i + 1,
          endLine: null,
          comment: commentText
        };
      }
    }
    
    // Look for logical separators like blank lines after substantial code
    if (line.trim() === '' && i > 0 && lines[i-1].trim() !== '' && currentBlock) {
      currentBlock.endLine = i - 1;
      suggestions.push(currentBlock);
      currentBlock = null;
    }
  }
  
  // Close final block if needed
  if (currentBlock) {
    currentBlock.endLine = lines.length - 1;
    suggestions.push(currentBlock);
  }
  
  return suggestions;
}

/**
 * Generates a valid method name from comment text
 */
function generateMethodName(commentText) {
  // Take first 5 words, camelCase them
  const words = commentText.split(/\s+/).slice(0, 5);
  return words
    .map((word, index) => {
      const sanitized = word.replace(/[^\w]/g, '');
      return index === 0 
        ? sanitized.toLowerCase() 
        : sanitized.charAt(0).toUpperCase() + sanitized.slice(1).toLowerCase();
    })
    .join('');
}

/**
 * Dependency Inversion Helper - Refactors direct dependencies to use interfaces
 * Usage: Highlight a class with direct dependencies, ask Copilot to apply dependency inversion
 * 
 * @param {string} classImplementation - The class to refactor 
 * @returns {string} The refactored class with dependency injection
 */
function applyDependencyInversion(classImplementation) {
  // This is a simplified example - real implementation would be more complex
  // Extract direct instantiations
  const newRegex = /new\s+(\w+)\(/g;
  let match;
  const dependencies = new Set();
  
  while ((match = newRegex.exec(classImplementation)) !== null) {
    dependencies.add(match[1]);
  }
  
  // Generate refactored class
  let refactored = classImplementation;
  
  // For each dependency, create interface and inject it
  for (const dep of dependencies) {
    const interfaceName = `I${dep}`;
    
    // Replace direct instantiation with injected dependency
    const instantiationRegex = new RegExp(`(\\w+)\\s*=\\s*new ${dep}\\(([^)]*)\\)`, 'g');
    refactored = refactored.replace(instantiationRegex, `$1 = this.${dep.toLowerCase()}`);
    
    // Add constructor parameter
    // Note: This is simplified and would need more logic for real-world cases
    const constructorRegex = /constructor\s*\(([^)]*)\)/;
    const constructorMatch = refactored.match(constructorRegex);
    
    if (constructorMatch) {
      const params = constructorMatch[1];
      const newParams = params 
        ? `${params}, private readonly ${dep.toLowerCase()}: ${interfaceName}`
        : `private readonly ${dep.toLowerCase()}: ${interfaceName}`;
      
      refactored = refactored.replace(constructorRegex, `constructor(${newParams})`);
    } else {
      // Add constructor if none exists
      const classStartRegex = /class\s+(\w+)([^{]*){/;
      refactored = refactored.replace(
        classStartRegex, 
        `class $1$2{\n  constructor(private readonly ${dep.toLowerCase()}: ${interfaceName}) {}\n`
      );
    }
  }
  
  return refactored;
}

/**
 * Clean Architecture Analyzer - Checks for Clean Architecture violations
 * Usage: Analyze files for Clean Architecture compliance
 * 
 * @param {Object} fileContents - Map of filenames to contents
 * @returns {Object} Analysis of violations and suggested fixes
 */
function analyzeCleanArchitecture(fileContents) {
  const violations = [];
  const layers = {
    domain: [],
    usecases: [],
    interfaces: [],
    infrastructure: []
  };
  
  // Categorize files by layer
  for (const [file, content] of Object.entries(fileContents)) {
    if (file.includes('/domain/')) {
      layers.domain.push(file);
    } else if (file.includes('/usecases/')) {
      layers.usecases.push(file);
    } else if (file.includes('/interfaces/')) {
      layers.interfaces.push(file);
    } else if (file.includes('/infrastructure/')) {
      layers.infrastructure.push(file);
    }
  }
  
  // Check domain layer for imports from other layers
  for (const file of layers.domain) {
    const content = fileContents[file];
    for (const layer of ['usecases', 'interfaces', 'infrastructure']) {
      if (content.includes(`from '../../${layer}`) || 
          content.includes(`from '../${layer}`) ||
          content.includes(`import "${layer}`)) {
        violations.push({
          file,
          violation: `Domain layer importing from ${layer} layer`,
          fix: "Extract interface and move to domain layer"
        });
      }
    }
  }
  
  // Check use cases for imports from interfaces and infrastructure
  for (const file of layers.usecases) {
    const content = fileContents[file];
    for (const layer of ['interfaces', 'infrastructure']) {
      if (content.includes(`from '../../${layer}`) || 
          content.includes(`from '../${layer}`) ||
          content.includes(`import "${layer}`)) {
        violations.push({
          file,
          violation: `Use case layer importing from ${layer} layer`,
          fix: "Use dependency inversion and inject abstractions"
        });
      }
    }
  }
  
  return {
    violations,
    summary: `Found ${violations.length} Clean Architecture violations`,
    recommendations: violations.map(v => `Fix in ${v.file}: ${v.fix}`)
  };
}

// Export functions for use by Copilot Agent
module.exports = {
  extractInterface,
  analyzeMethodExtractions,
  applyDependencyInversion,
  analyzeCleanArchitecture
};