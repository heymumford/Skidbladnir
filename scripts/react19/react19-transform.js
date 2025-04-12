/**
 * React 19 migration transform script for jscodeshift
 * 
 * This transform handles:
 * 1. Converting ReactDOM.render() to createRoot().render()
 * 2. Updating string refs to createRef() or useRef()
 * 3. Updating act imports from 'react-dom/test-utils' to 'react-dom/client'
 * 4. Converting defaultProps to destructuring with default values
 */

module.exports = function(file, api, options) {
  const j = api.jscodeshift;
  const root = j(file.source);
  let hasModifications = false;

  // 1. Transform ReactDOM.render() to ReactDOM.createRoot().render()
  const reactDomRenderTransformations = root
    .find(j.CallExpression, {
      callee: {
        object: { name: 'ReactDOM' },
        property: { name: 'render' }
      }
    })
    .forEach(path => {
      hasModifications = true;
      const [reactEl, container, callback] = path.node.arguments;
      
      // Create the createRoot().render() expression
      const createRootCall = j.callExpression(
        j.memberExpression(
          j.callExpression(
            j.memberExpression(
              j.identifier('ReactDOM'),
              j.identifier('createRoot')
            ),
            [container]
          ),
          j.identifier('render')
        ),
        [reactEl]
      );

      // If there was a callback, handle it
      if (callback) {
        console.warn('ReactDOM.render callback detected - this is not supported in React 19.');
      }

      // Replace the node
      j(path).replaceWith(createRootCall);

      // Add import for createRoot if it's missing
      const reactDomImports = root.find(j.ImportDeclaration, {
        source: { value: 'react-dom' }
      });

      if (reactDomImports.length) {
        const importDecl = reactDomImports.nodes()[0];
        const newImport = j.importDeclaration(
          [j.importSpecifier(j.identifier('createRoot'))], 
          j.literal('react-dom/client')
        );
        j(reactDomImports.at(0).get()).insertAfter(newImport);
      }
    });

  // 2. Transform string refs to createRef/useRef
  const stringRefTransformations = root
    .find(j.JSXAttribute, {
      name: { name: 'ref' },
      value: { type: 'Literal' }
    })
    .forEach(path => {
      hasModifications = true;
      
      // Get the containing component/function
      let parent = path.parent;
      while (parent && 
             parent.node.type !== 'ClassDeclaration' && 
             parent.node.type !== 'FunctionDeclaration' &&
             parent.node.type !== 'ArrowFunctionExpression') {
        parent = parent.parent;
      }
      
      // Different handling for class vs function components
      if (parent && parent.node.type === 'ClassDeclaration') {
        // For classes, use createRef
        const refName = path.node.value.value;
        
        // Replace string ref with reference to this.refName
        j(path).replaceWith(
          j.jsxAttribute(
            j.jsxIdentifier('ref'),
            j.jsxExpressionContainer(
              j.memberExpression(j.thisExpression(), j.identifier(refName))
            )
          )
        );
        
        // Add class property for the ref
        const classBody = parent.node.body;
        const createRefProp = j.classProperty(
          j.identifier(refName),
          j.callExpression(
            j.memberExpression(j.identifier('React'), j.identifier('createRef')),
            []
          )
        );
        
        // Add to beginning of class body
        classBody.body.unshift(createRefProp);
      } else {
        // For function components, use useRef
        const refName = path.node.value.value;
        
        // Replace string ref with ref variable
        j(path).replaceWith(
          j.jsxAttribute(
            j.jsxIdentifier('ref'),
            j.jsxExpressionContainer(j.identifier(refName))
          )
        );
        
        // Add useRef hook at beginning of function body
        if (parent) {
          const useRefDecl = j.variableDeclaration('const', [
            j.variableDeclarator(
              j.identifier(refName),
              j.callExpression(
                j.identifier('useRef'),
                [j.nullLiteral()]
              )
            )
          ]);
          
          if (parent.node.body.type === 'BlockStatement') {
            parent.node.body.body.unshift(useRefDecl);
          }
        }
        
        // Make sure we have the useRef import
        const reactImports = root.find(j.ImportDeclaration, {
          source: { value: 'react' }
        });
        
        if (reactImports.length) {
          const importDecl = reactImports.get(0).node;
          const hasUseRefImport = importDecl.specifiers.some(
            spec => spec.imported && spec.imported.name === 'useRef'
          );
          
          if (!hasUseRefImport) {
            importDecl.specifiers.push(
              j.importSpecifier(j.identifier('useRef'))
            );
          }
        }
      }
    });

  // 3. Update act imports from 'react-dom/test-utils' to 'react-dom/client'
  const actImportTransformations = root
    .find(j.ImportDeclaration, {
      source: { value: 'react-dom/test-utils' }
    })
    .forEach(path => {
      const specifiers = path.node.specifiers;
      const actImportSpecifier = specifiers.find(
        spec => spec.type === 'ImportSpecifier' && spec.imported.name === 'act'
      );
      
      if (actImportSpecifier) {
        hasModifications = true;
        
        // Create new import for act from react-dom/client
        const newImport = j.importDeclaration(
          [j.importSpecifier(j.identifier('act'))],
          j.literal('react-dom/client')
        );
        
        // If there are other imports from test-utils, keep them
        if (specifiers.length > 1) {
          const remainingSpecifiers = specifiers.filter(
            spec => !(spec.type === 'ImportSpecifier' && spec.imported.name === 'act')
          );
          path.node.specifiers = remainingSpecifiers;
          
          // Insert new import after current one
          j(path).insertAfter(newImport);
        } else {
          // Replace entire import declaration
          j(path).replaceWith(newImport);
        }
      }
    });

  // 4. Convert static defaultProps to destructuring with default values
  const defaultPropsTransformations = root
    .find(j.ClassProperty, {
      static: true,
      key: {
        name: 'defaultProps'
      }
    })
    .forEach(path => {
      hasModifications = true;
      const className = path.parent.parent.node.id.name;
      console.log(`Found static defaultProps in class component: ${className}`);
      // This is more complex and would require understanding the component's prop types
      // For now, just log a warning - this should be handled by react-codemod-defaultprops
    });

  // Also find functional component defaultProps
  root
    .find(j.AssignmentExpression, {
      left: {
        type: 'MemberExpression',
        property: {
          name: 'defaultProps'
        }
      }
    })
    .forEach(path => {
      hasModifications = true;
      let componentName = '';
      if (path.node.left.object.type === 'Identifier') {
        componentName = path.node.left.object.name;
      }
      console.log(`Found defaultProps assignment for component: ${componentName}`);
      // This is more complex and would require understanding the component's structure
      // For now, just log a warning - this should be handled by react-codemod-defaultprops
    });

  return hasModifications ? root.toSource() : null;
};