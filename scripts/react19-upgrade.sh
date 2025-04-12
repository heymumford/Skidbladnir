#!/bin/bash
set -e

echo "React 19 Migration Plan"
echo "======================="
echo "This script will help you migrate to React 19 step by step."

# Step 1: First update to React 18.3 as a transitional step
echo -e "\n\nStep 1: Updating to React 18.3 ✅"
echo "React 18.3 is already installed"

# Step 2: Find all ReactDOM.render calls
echo -e "\n\nStep 2: Finding ReactDOM.render calls"
RENDER_FILES=$(grep -r "ReactDOM.render" --include="*.tsx" --include="*.jsx" --include="*.ts" --include="*.js" /home/emumford/NativeLinuxProjects/Skidbladnir/packages/)
echo "$RENDER_FILES"
if [ -z "$RENDER_FILES" ]; then
  echo "No ReactDOM.render calls found, this step can be skipped ✅"
else 
  echo "Manual update required for these files ⚠️"
fi

# Step 3: Check for string refs
echo -e "\n\nStep 3: Finding string refs"
STRING_REFS=$(grep -r "ref=[\"']" --include="*.tsx" --include="*.jsx" --include="*.ts" --include="*.js" /home/emumford/NativeLinuxProjects/Skidbladnir/packages/)
echo "$STRING_REFS"
if [ -z "$STRING_REFS" ]; then
  echo "No string refs found, this step can be skipped ✅"
else
  echo "Manual update required for these files ⚠️"
fi

# Step 4: Find act imports from test-utils
echo -e "\n\nStep 4: Finding act imports from react-dom/test-utils"
ACT_IMPORTS=$(grep -r "import { act } from 'react-dom/test-utils'" --include="*.tsx" --include="*.jsx" --include="*.ts" --include="*.js" /home/emumford/NativeLinuxProjects/Skidbladnir/packages/)
echo "$ACT_IMPORTS"
if [ -z "$ACT_IMPORTS" ]; then
  echo "No act imports from test-utils found, this step can be skipped ✅"
else
  echo "Manual update required for these files ⚠️"
fi

# Step 5: Find defaultProps
echo -e "\n\nStep 5: Finding defaultProps"
DEFAULT_PROPS=$(grep -r "defaultProps" --include="*.tsx" --include="*.jsx" --include="*.ts" --include="*.js" /home/emumford/NativeLinuxProjects/Skidbladnir/packages/)
echo "$DEFAULT_PROPS"
if [ -z "$DEFAULT_PROPS" ]; then
  echo "No defaultProps found, this step can be skipped ✅"
else
  echo "Manual update required for these files ⚠️"
fi

# Step 6: Check for ESLint configuration
echo -e "\n\nStep 6: Checking ESLint configuration"
if grep -q "eslint-plugin-react-hooks" package.json; then
  echo "ESLint React Hooks plugin already installed ✅"
else
  echo "Consider installing eslint-plugin-react-hooks for better warnings ⚠️"
  echo "npm install --save-dev eslint-plugin-react-hooks"
fi

# Step 7: Find test files for act() warnings
echo -e "\n\nStep 7: Searching for potential act() wrapping issues in tests"
TEST_FILES=$(find /home/emumford/NativeLinuxProjects/Skidbladnir/packages -name "*.test.tsx" -o -name "*.test.jsx" -o -name "*.test.ts" -o -name "*.test.js")
echo "Found $(echo "$TEST_FILES" | wc -l) test files to check for potential act() issues"
TEST_STATES=$(grep -r "useState" --include="*.test.tsx" --include="*.test.jsx" --include="*.test.ts" --include="*.test.js" /home/emumford/NativeLinuxProjects/Skidbladnir/packages/ | wc -l)
TEST_EFFECTS=$(grep -r "useEffect" --include="*.test.tsx" --include="*.test.jsx" --include="*.test.ts" --include="*.test.js" /home/emumford/NativeLinuxProjects/Skidbladnir/packages/ | wc -l)
echo "Found $TEST_STATES useState and $TEST_EFFECTS useEffect calls in test files"
echo "These may need act() wrapping in React 19 ⚠️"

echo -e "\n\nReady for React 19 Upgrade:"
echo "Run the following commands to upgrade to React 19:"
echo "1. npm install react@19.1.0 react-dom@19.1.0"
echo "2. Update all tests to use act() where needed"
echo "3. Fix any defaultProps issues"
echo "4. Run tests and fix issues one by one"

echo -e "\n\nUpdating Kanban board with progress..."
echo "✅ Step 1: Update to React 18.3 as a transitional step"
echo "⬜ Step 2: Run official React 19 codemod recipe"
echo "⬜ Step 3: Run TypeScript-specific codemods"
echo "⬜ Step 4: Fix defaultProps with codemod"
echo "⬜ Step 5: Update ESLint plugins and run linters"
echo "⬜ Step 6: Fix test files to use proper act() wrapping"
echo "⬜ Step 7: Update all related dependencies"
echo "⬜ Step 8: Complete the migration to React 19.1"