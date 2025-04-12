/**
 * React 19 migration transform script for TypeScript files
 * This script uses ts-morph to handle TypeScript syntax
 */

const { Project } = require('ts-morph');
const fs = require('fs');
const path = require('path');

// Initialize a new TypeScript project
const project = new Project({
  // Use the project's tsconfig.json
  tsConfigFilePath: path.join(__dirname, '../config/tsconfig.json'),
  skipAddingFilesFromTsConfig: true,
});

// Directories to search for React components
const directoriesToSearch = [
  path.join(__dirname, '../packages/ui/src')
];

// Add files to the project
directoriesToSearch.forEach(dir => {
  if (fs.existsSync(dir)) {
    project.addSourceFilesAtPaths([
      `${dir}/**/*.ts`,
      `${dir}/**/*.tsx`,
    ]);
  }
});

console.log(`Found ${project.getSourceFiles().length} TypeScript files to process`);

// Process ReactDOM.render() calls
function processReactDomRender(sourceFile) {
  let modified = false;
  
  // Find import declarations for react-dom
  const reactDomImports = sourceFile.getImportDeclarations()
    .filter(importDecl => importDecl.getModuleSpecifierValue() === 'react-dom');
  
  if (reactDomImports.length === 0) {
    return false; // No react-dom imports, nothing to do
  }
  
  // Find calls to ReactDOM.render()
  const callExpressions = sourceFile.getDescendantsOfKind(project.SyntaxKind.CallExpression);
  
  for (const callExpr of callExpressions) {
    // Check if the call is ReactDOM.render
    const expression = callExpr.getExpression();
    if (expression.getKind() !== project.SyntaxKind.PropertyAccessExpression) {
      continue;
    }
    
    const propAccess = expression;
    const object = propAccess.getExpression();
    const property = propAccess.getName();
    
    if (object.getText() === 'ReactDOM' && property === 'render') {
      modified = true;
      console.log(`Found ReactDOM.render in ${sourceFile.getFilePath()}`);
      
      // Get the arguments: ReactDOM.render(element, container, callback?)
      const args = callExpr.getArguments();
      if (args.length < 2) {
        console.warn('  ReactDOM.render call has fewer than 2 arguments, skipping');
        continue;
      }
      
      const element = args[0];
      const container = args[1];
      if (args.length > 2) {
        console.warn('  ReactDOM.render call has a callback which is not supported in React 19');
      }
      
      // Replace the call with ReactDOM.createRoot(container).render(element)
      const newCode = `ReactDOM.createRoot(${container.getText()}).render(${element.getText()})`;
      callExpr.replaceWithText(newCode);
      
      // Add import for createRoot if it doesn't exist
      let hasCreateRootImport = sourceFile.getImportDeclarations()
        .some(importDecl => importDecl.getModuleSpecifierValue() === 'react-dom/client');
      
      if (!hasCreateRootImport) {
        sourceFile.addImportDeclaration({
          moduleSpecifier: 'react-dom/client',
          namedImports: ['createRoot']
        });
      }
    }
  }
  
  return modified;
}

// Process string refs
function processStringRefs(sourceFile) {
  let modified = false;
  
  // Find JSX attributes that are string refs
  const jsxAttributes = sourceFile.getDescendantsOfKind(project.SyntaxKind.JsxAttribute);
  
  for (const attribute of jsxAttributes) {
    if (attribute.getName() !== 'ref') {
      continue;
    }
    
    const initializer = attribute.getInitializer();
    if (!initializer || initializer.getKind() !== project.SyntaxKind.StringLiteral) {
      continue;
    }
    
    modified = true;
    console.log(`Found string ref in ${sourceFile.getFilePath()}`);
    
    const refName = initializer.getLiteralValue();
    
    // Check if we're in a class component or function component
    let currentNode = attribute.getParent();
    let isClassComponent = false;
    
    while (currentNode && !isClassComponent) {
      if (currentNode.getKind() === project.SyntaxKind.ClassDeclaration) {
        isClassComponent = true;
        break;
      }
      currentNode = currentNode.getParent();
    }
    
    if (isClassComponent) {
      // For class components, replace string ref with this.refName
      attribute.setInitializer(`{this.${refName}}`);
      
      // Add a class property with React.createRef()
      const classDecl = currentNode;
      if (!classDecl.getProperty(refName)) {
        classDecl.addProperty({
          name: refName,
          initializer: 'React.createRef()',
        });
      }
    } else {
      // For function components, replace string ref with refVariable
      attribute.setInitializer(`{${refName}}`);
      
      // Try to find the function component
      currentNode = attribute.getParent();
      while (currentNode) {
        if (currentNode.getKind() === project.SyntaxKind.FunctionDeclaration ||
            currentNode.getKind() === project.SyntaxKind.ArrowFunction ||
            currentNode.getKind() === project.SyntaxKind.FunctionExpression) {
          break;
        }
        currentNode = currentNode.getParent();
      }
      
      if (currentNode) {
        // Add a useRef declaration at the beginning of the function body
        const body = currentNode.getBody();
        if (body) {
          const statements = body.getStatements();
          body.insertStatements(0, `const ${refName} = useRef(null);`);
        }
        
        // Ensure useRef is imported
        const reactImports = sourceFile.getImportDeclarations()
          .filter(importDecl => importDecl.getModuleSpecifierValue() === 'react');
        
        if (reactImports.length > 0) {
          const reactImport = reactImports[0];
          const namedImports = reactImport.getNamedImports();
          
          // Check if useRef is already imported
          const hasUseRefImport = namedImports.some(namedImport => 
            namedImport.getName() === 'useRef'
          );
          
          if (!hasUseRefImport) {
            reactImport.addNamedImport('useRef');
          }
        }
      }
    }
  }
  
  return modified;
}

// Process act imports
function processActImports(sourceFile) {
  let modified = false;
  
  // Find import declarations for react-dom/test-utils
  const actImports = sourceFile.getImportDeclarations()
    .filter(importDecl => importDecl.getModuleSpecifierValue() === 'react-dom/test-utils');
  
  for (const actImport of actImports) {
    const namedImports = actImport.getNamedImports();
    
    // Check if 'act' is imported
    const actNamedImport = namedImports.find(namedImport => 
      namedImport.getName() === 'act'
    );
    
    if (actNamedImport) {
      modified = true;
      console.log(`Found act import in ${sourceFile.getFilePath()}`);
      
      // If there are other imports from test-utils, keep them
      if (namedImports.length > 1) {
        // Remove 'act' from react-dom/test-utils imports
        actNamedImport.remove();
        
        // Add a new import for act from react-dom/client
        sourceFile.addImportDeclaration({
          moduleSpecifier: 'react-dom/client',
          namedImports: ['act']
        });
      } else {
        // Replace the entire import declaration
        actImport.setModuleSpecifier('react-dom/client');
      }
    }
  }
  
  return modified;
}

// Main function to process all files
function processFiles() {
  const sourceFiles = project.getSourceFiles();
  let totalModified = 0;
  
  for (const sourceFile of sourceFiles) {
    let fileModified = false;
    
    try {
      // Process ReactDOM.render() calls
      fileModified = processReactDomRender(sourceFile) || fileModified;
      
      // Process string refs
      fileModified = processStringRefs(sourceFile) || fileModified;
      
      // Process act imports
      fileModified = processActImports(sourceFile) || fileModified;
      
      // Save the file if modified
      if (fileModified) {
        sourceFile.saveSync();
        totalModified++;
      }
    } catch (error) {
      console.error(`Error processing ${sourceFile.getFilePath()}: ${error.message}`);
    }
  }
  
  console.log(`Modified ${totalModified} files out of ${sourceFiles.length}`);
}

// Run the transformation
processFiles();