/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { CircularDependencyValidator } from './CircularDependencyValidator';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('CircularDependencyValidator', () => {
  let tempDir: string;

  beforeEach(() => {
    // Create a temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'circular-dependency-test-'));
    
    // Create test directory structure
    fs.mkdirSync(path.join(tempDir, 'src', 'moduleA'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'src', 'moduleB'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'src', 'moduleC'), { recursive: true });
  });

  afterEach(() => {
    // Clean up
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should detect no circular dependencies in a well-structured codebase', () => {
    // Create files with no circular dependencies
    fs.writeFileSync(path.join(tempDir, 'src', 'moduleA', 'a.ts'), `
      export class A {
        method() {
          return 'A';
        }
      }
    `);
    
    fs.writeFileSync(path.join(tempDir, 'src', 'moduleB', 'b.ts'), `
      import { A } from '../moduleA/a';
      
      export class B {
        constructor(private a: A) {}
        
        method() {
          return this.a.method() + 'B';
        }
      }
    `);
    
    fs.writeFileSync(path.join(tempDir, 'src', 'moduleC', 'c.ts'), `
      import { B } from '../moduleB/b';
      
      export class C {
        constructor(private b: B) {}
        
        method() {
          return this.b.method() + 'C';
        }
      }
    `);
    
    // Create validator
    const validator = CircularDependencyValidator.forDirectory(
      path.join(tempDir, 'src'),
      tempDir
    );
    
    // Detect cycles
    const cycles = validator.detectCircularDependencies();
    
    // Expect no cycles
    expect(cycles.length).toBe(0);
  });

  it('should detect simple circular dependencies between two files', () => {
    // Create files with a direct circular dependency
    fs.writeFileSync(path.join(tempDir, 'src', 'moduleA', 'a.ts'), `
      import { B } from '../moduleB/b';
      
      export class A {
        constructor(private b: B) {}
        
        method() {
          return this.b.method() + 'A';
        }
      }
    `);
    
    fs.writeFileSync(path.join(tempDir, 'src', 'moduleB', 'b.ts'), `
      import { A } from '../moduleA/a';
      
      export class B {
        constructor(private a: A) {}
        
        method() {
          return this.a.method() + 'B';
        }
      }
    `);
    
    // Create validator
    const validator = CircularDependencyValidator.forDirectory(
      path.join(tempDir, 'src'),
      tempDir
    );
    
    // Detect cycles
    const cycles = validator.detectCircularDependencies();
    
    // Expect one cycle
    expect(cycles.length).toBeGreaterThan(0);
    
    // Format the output for verification
    const formattedCycles = CircularDependencyValidator.formatCircularDependencies(
      cycles,
      tempDir
    );
    
    // Verify the output contains the expected files
    expect(formattedCycles).toContain('moduleA/a.ts');
    expect(formattedCycles).toContain('moduleB/b.ts');
  });

  it('should detect complex circular dependencies between multiple files', () => {
    // Create files with a circular dependency chain A -> B -> C -> A
    fs.writeFileSync(path.join(tempDir, 'src', 'moduleA', 'a.ts'), `
      import { C } from '../moduleC/c';
      
      export class A {
        constructor(private c: C) {}
        
        method() {
          return this.c.method() + 'A';
        }
      }
    `);
    
    fs.writeFileSync(path.join(tempDir, 'src', 'moduleB', 'b.ts'), `
      import { A } from '../moduleA/a';
      
      export class B {
        constructor(private a: A) {}
        
        method() {
          return this.a.method() + 'B';
        }
      }
    `);
    
    fs.writeFileSync(path.join(tempDir, 'src', 'moduleC', 'c.ts'), `
      import { B } from '../moduleB/b';
      
      export class C {
        constructor(private b: B) {}
        
        method() {
          return this.b.method() + 'C';
        }
      }
    `);
    
    // Create validator
    const validator = CircularDependencyValidator.forDirectory(
      path.join(tempDir, 'src'),
      tempDir
    );
    
    // Detect cycles
    const cycles = validator.detectCircularDependencies();
    
    // Expect at least one cycle
    expect(cycles.length).toBeGreaterThan(0);
    
    // Format the output for verification
    const formattedCycles = CircularDependencyValidator.formatCircularDependencies(
      cycles,
      tempDir
    );
    
    // Verify the output contains all three files
    expect(formattedCycles).toContain('moduleA/a.ts');
    expect(formattedCycles).toContain('moduleB/b.ts');
    expect(formattedCycles).toContain('moduleC/c.ts');
  });

  it('should generate human-readable output for circular dependencies', () => {
    const mockCycles = [
      [
        '/home/user/project/src/moduleA/a.ts',
        '/home/user/project/src/moduleB/b.ts',
        '/home/user/project/src/moduleA/a.ts'
      ]
    ];
    
    const formattedOutput = CircularDependencyValidator.formatCircularDependencies(
      mockCycles,
      '/home/user/project'
    );
    
    // Check that the output is formatted as expected
    expect(formattedOutput).toContain('Found 1 circular');
    expect(formattedOutput).toContain('src/moduleA/a.ts');
    expect(formattedOutput).toContain('src/moduleB/b.ts');
    expect(formattedOutput).toContain('back to start');
  });
});