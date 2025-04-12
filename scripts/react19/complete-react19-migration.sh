#!/bin/bash
set -e

echo "Completing React 19 Migration"
echo "============================"

# Step 1: Install React 19
echo -e "\n\nStep 1: Installing React 19"
npm install react@19.1.0 react-dom@19.1.0 --legacy-peer-deps

# Step 2: Update package.json in UI directory
echo -e "\n\nStep 2: Updating UI package dependencies"
cd packages/ui
npm install react@19.1.0 react-dom@19.1.0 --legacy-peer-deps
cd ../..

# Step 3: Run tests to verify everything works
echo -e "\n\nStep 3: Running tests to verify everything works"
npm run test:ui || {
  echo "Some tests failed after React 19 migration"
  echo "Please fix the failing tests before proceeding"
  exit 1
}

# Step 4: Verify linting passes
echo -e "\n\nStep 4: Running linting checks"
npm run lint || {
  echo "Linting checks failed after React 19 migration"
  echo "Please fix the linting issues before proceeding"
  exit 1
}

# Step 5: Check TypeScript compatibility
echo -e "\n\nStep 5: Checking TypeScript compatibility"
npm run typecheck || {
  echo "TypeScript checks failed after React 19 migration"
  echo "Please fix the typing issues before proceeding"
  exit 1
}

echo -e "\n\nReact 19 Migration Complete! ✅"
echo "If any issues arose during testing, linting, or type checking, please fix them before committing."

# Reminder to update the Kanban board
echo -e "\n\nReminder: Update the Kanban board with your progress."
echo "✅ Step 1: Update to React 18.3 as a transitional step"
echo "✅ Step 2: Update to React 19.1"
echo "✅ Step 3: Fix defaultProps usages"
echo "✅ Step 4: Update ESLint plugins"
echo "⬜ Step 5: Run tests and fix any remaining issues"