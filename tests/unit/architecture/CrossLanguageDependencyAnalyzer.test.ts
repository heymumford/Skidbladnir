/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import { CrossLanguageDependencyAnalyzer } from './CrossLanguageDependencyAnalyzer';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('CrossLanguageDependencyAnalyzer', () => {
  let tempDir: string;

  beforeEach(() => {
    // Create a temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cross-dependency-test-'));
    
    // Create a mock directory structure
    fs.mkdirSync(path.join(tempDir, 'internal', 'typescript', 'api'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'internal', 'python', 'orchestrator'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'internal', 'go', 'binary-processor'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'cmd', 'api'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'cmd', 'orchestrator'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'cmd', 'binary-processor'), { recursive: true });
  });

  afterEach(() => {
    // Clean up the temporary directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('findServiceEndpointUsage', () => {
    it('should detect localhost URLs with port numbers', () => {
      const filePath = path.join(tempDir, 'internal', 'typescript', 'api', 'client.ts');
      const fileContent = `
      function fetchWorkflows() {
        return fetch('http://localhost:8000/api/workflows');
      }
      
      function fetchTestCase(id) {
        return fetch(\`http://localhost:8000/api/test-cases/\${id}\`);
      }
      
      function processBinary(data) {
        return fetch('https://localhost:8090/api/binary-processing/jobs', {
          method: 'POST',
          body: JSON.stringify(data)
        });
      }
      `;
      
      fs.writeFileSync(filePath, fileContent);
      
      const dependencies = CrossLanguageDependencyAnalyzer.findServiceEndpointUsage(filePath, tempDir);
      
      expect(dependencies.has('orchestrator')).toBe(true);
      expect(dependencies.has('binary-processor')).toBe(true);
      expect(Array.from(dependencies.get('orchestrator') || [])).toContain('workflows');
      expect(Array.from(dependencies.get('orchestrator') || [])).toContain('test-cases');
      expect(Array.from(dependencies.get('binary-processor') || [])).toContain('binary-processing/jobs');
    });

    it('should detect service name URLs', () => {
      const filePath = path.join(tempDir, 'internal', 'python', 'orchestrator', 'client.py');
      const fileContent = `
      def fetch_attachments():
          return requests.get("http://binary-processor/api/attachments")
          
      def process_job(job_data):
          return requests.post("http://binary-processor-service:8090/api/binary-processing/jobs", json=job_data)
      `;
      
      fs.writeFileSync(filePath, fileContent);
      
      const dependencies = CrossLanguageDependencyAnalyzer.findServiceEndpointUsage(filePath, tempDir);
      
      expect(dependencies.has('binary-processor')).toBe(true);
      expect(Array.from(dependencies.get('binary-processor') || [])).toContain('attachments');
      expect(Array.from(dependencies.get('binary-processor') || [])).toContain('binary-processing/jobs');
    });

    it('should throw error for non-existent files', () => {
      const nonExistentPath = path.join(tempDir, 'non-existent.ts');
      
      expect(() => {
        CrossLanguageDependencyAnalyzer.findServiceEndpointUsage(nonExistentPath, tempDir);
      }).toThrow('File not found');
    });
  });

  describe('findApiClientCalls', () => {
    it('should detect API calls in TypeScript files', () => {
      const filePath = path.join(tempDir, 'internal', 'typescript', 'api', 'service.ts');
      const fileContent = `
      import axios from 'axios';
      
      class OrchestratorClient {
        async getWorkflows() {
          return axios.get('/api/workflows');
        }
        
        async createTestCase(data) {
          return axios.post('/api/test-cases', data);
        }
      }
      
      function fetchBinaryJob(id) {
        return fetch('/api/binary-processing/jobs/' + id);
      }
      `;
      
      fs.writeFileSync(filePath, fileContent);
      
      const dependencies = CrossLanguageDependencyAnalyzer.findApiClientCalls(filePath, tempDir);
      
      expect(dependencies.has('orchestrator')).toBe(true);
      expect(dependencies.has('binary-processor')).toBe(true);
      expect(Array.from(dependencies.get('orchestrator') || [])).toContain('/api/workflows');
      expect(Array.from(dependencies.get('orchestrator') || [])).toContain('/api/test-cases');
      expect(Array.from(dependencies.get('binary-processor') || [])).toContain('/api/binary-processing/jobs');
    });

    it('should detect API calls in Python files', () => {
      const filePath = path.join(tempDir, 'internal', 'python', 'orchestrator', 'service.py');
      const fileContent = `
      import requests
      import httpx
      
      def get_binary_data(attachment_id):
          return requests.get('http://binary-processor:8090/api/attachments/' + attachment_id)
          
      def process_binary_job(job_data):
          return httpx.post('http://binary-processor-service/api/binary-processing/jobs', json=job_data)
          
      class ApiClient:
          def __init__(self):
              self.client = httpx.Client()
              
          def get_test_cases(self):
              return self.client.get('http://api:8080/api/test-cases')
      `;
      
      fs.writeFileSync(filePath, fileContent);
      
      const dependencies = CrossLanguageDependencyAnalyzer.findApiClientCalls(filePath, tempDir);
      
      expect(dependencies.has('binary-processor')).toBe(true);
      expect(dependencies.has('api')).toBe(true);
      expect(Array.from(dependencies.get('binary-processor') || [])).toContain('attachments');
      expect(Array.from(dependencies.get('binary-processor') || [])).toContain('binary-processing/jobs');
      expect(Array.from(dependencies.get('api') || [])).toContain('test-cases');
    });

    it('should detect API calls in Go files', () => {
      const filePath = path.join(tempDir, 'internal', 'go', 'binary-processor', 'service.go');
      const fileContent = `
      package main
      
      import "net/http"
      
      func getOrchestratorStatus() (*http.Response, error) {
          return http.Get("http://orchestrator:8000/api/health")
      }
      
      func getApiStatus() (*http.Response, error) {
          client := &http.Client{}
          return client.Get("http://api:8080/api/health")
      }
      `;
      
      fs.writeFileSync(filePath, fileContent);
      
      const dependencies = CrossLanguageDependencyAnalyzer.findApiClientCalls(filePath, tempDir);
      
      expect(dependencies.has('orchestrator')).toBe(true);
      expect(dependencies.has('api')).toBe(true);
      expect(Array.from(dependencies.get('orchestrator') || [])).toContain('health');
      expect(Array.from(dependencies.get('api') || [])).toContain('health');
    });

    it('should throw error for non-existent files', () => {
      const nonExistentPath = path.join(tempDir, 'non-existent.ts');
      
      expect(() => {
        CrossLanguageDependencyAnalyzer.findApiClientCalls(nonExistentPath, tempDir);
      }).toThrow('File not found');
    });
  });

  describe('analyzeServiceDependencies', () => {
    it('should combine endpoint usage and API client calls', () => {
      // Mock the directory structure with files
      const apiFile = path.join(tempDir, 'internal', 'typescript', 'api', 'client.ts');
      fs.writeFileSync(apiFile, `
        function callOrchestrator() {
          return fetch('http://localhost:8000/api/workflows');
        }
        
        function callProcessor() {
          return axios.get('/api/binary-processing/jobs');
        }
      `);
      
      // Use spies to avoid actual file scanning in the implementation
      const endpointSpy = jest.spyOn(CrossLanguageDependencyAnalyzer, 'findServiceEndpointUsage')
        .mockImplementation(() => {
          const map = new Map();
          map.set('orchestrator', new Set(['workflows']));
          return map;
        });
        
      const apiCallSpy = jest.spyOn(CrossLanguageDependencyAnalyzer, 'findApiClientCalls')
        .mockImplementation(() => {
          const map = new Map();
          map.set('binary-processor', new Set(['binary-processing/jobs']));
          return map;
        });
      
      // Mock the PolyglotArchitectureValidator.findFiles method
      jest.spyOn(require('./PolyglotArchitectureValidator').PolyglotArchitectureValidator, 'findFiles')
        .mockReturnValue([apiFile]);
      
      // Execute the analysis
      const dependencies = CrossLanguageDependencyAnalyzer.analyzeServiceDependencies('api', tempDir);
      
      // Verify the results
      expect(dependencies.has('orchestrator')).toBe(true);
      expect(dependencies.has('binary-processor')).toBe(true);
      expect(Array.from(dependencies.get('orchestrator') || [])).toEqual(['workflows']);
      expect(Array.from(dependencies.get('binary-processor') || [])).toEqual(['binary-processing/jobs']);
      
      // Restore the original methods
      endpointSpy.mockRestore();
      apiCallSpy.mockRestore();
    });
    
    it('should throw error for unknown service', () => {
      expect(() => {
        CrossLanguageDependencyAnalyzer.analyzeServiceDependencies('unknown-service', tempDir);
      }).toThrow('Unknown service: unknown-service');
    });
  });

  describe('validateServiceApiUsage', () => {
    it('should validate correct API usage', () => {
      const dependencies = new Map();
      dependencies.set('orchestrator', new Set(['workflows', 'test-cases']));
      
      const result = CrossLanguageDependencyAnalyzer.validateServiceApiUsage('api', dependencies);
      
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
    
    it('should detect undeclared dependencies', () => {
      const dependencies = new Map();
      dependencies.set('undeclared-service', new Set(['some-api']));
      
      const result = CrossLanguageDependencyAnalyzer.validateServiceApiUsage('api', dependencies);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('not declared');
    });
    
    it('should detect usage of unprovided APIs', () => {
      const dependencies = new Map();
      dependencies.set('orchestrator', new Set(['not-provided-api']));
      
      const result = CrossLanguageDependencyAnalyzer.validateServiceApiUsage('api', dependencies);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('not provided');
    });
    
    it('should return error for unknown service', () => {
      const dependencies = new Map();
      
      const result = CrossLanguageDependencyAnalyzer.validateServiceApiUsage('unknown-service', dependencies);
      
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Unknown service');
    });
  });

  describe('findCircularDependencies', () => {
    it('should detect simple circular dependencies', () => {
      const dependencies = new Map();
      dependencies.set('service-a', ['service-b']);
      dependencies.set('service-b', ['service-c']);
      dependencies.set('service-c', ['service-a']);
      
      const circles = CrossLanguageDependencyAnalyzer.findCircularDependencies(dependencies);
      
      expect(circles.length).toBe(1);
      expect(circles[0]).toContain('service-a');
      expect(circles[0]).toContain('service-b');
      expect(circles[0]).toContain('service-c');
    });
    
    it('should handle multiple circular dependencies', () => {
      const dependencies = new Map();
      dependencies.set('service-a', ['service-b']);
      dependencies.set('service-b', ['service-a']);
      dependencies.set('service-c', ['service-d']);
      dependencies.set('service-d', ['service-e']);
      dependencies.set('service-e', ['service-c']);
      
      const circles = CrossLanguageDependencyAnalyzer.findCircularDependencies(dependencies);
      
      expect(circles.length).toBe(2);
    });
    
    it('should not report when no circular dependencies exist', () => {
      const dependencies = new Map();
      dependencies.set('service-a', ['service-b']);
      dependencies.set('service-b', ['service-c']);
      dependencies.set('service-c', []);
      
      const circles = CrossLanguageDependencyAnalyzer.findCircularDependencies(dependencies);
      
      expect(circles.length).toBe(0);
    });
  });

  describe('formatAnalysisResults', () => {
    it('should format a passing report', () => {
      const results = {
        serviceDependencies: [
          {
            service: 'api',
            language: 'typescript',
            dependsOn: [
              {
                service: 'orchestrator',
                language: 'python',
                apis: ['workflows'],
                valid: true
              }
            ]
          }
        ],
        missingDependencies: [],
        circularDependencies: [],
        valid: true
      };
      
      const report = CrossLanguageDependencyAnalyzer.formatAnalysisResults(results);
      
      expect(report).toContain('PASSED');
      expect(report).toContain('api (typescript)');
      expect(report).toContain('orchestrator (python)');
      expect(report).toContain('workflows');
    });
    
    it('should format a failing report with missing dependencies', () => {
      const results = {
        serviceDependencies: [
          {
            service: 'api',
            language: 'typescript',
            dependsOn: [
              {
                service: 'orchestrator',
                language: 'python',
                apis: ['workflows'],
                valid: false
              }
            ]
          }
        ],
        missingDependencies: [
          {
            consumer: 'api',
            provider: 'orchestrator',
            apis: ['workflows']
          }
        ],
        circularDependencies: [],
        valid: false
      };
      
      const report = CrossLanguageDependencyAnalyzer.formatAnalysisResults(results);
      
      expect(report).toContain('FAILED');
      expect(report).toContain('Missing Dependencies');
      expect(report).toContain('api cannot use orchestrator');
    });
    
    it('should format a report with circular dependencies', () => {
      const results = {
        serviceDependencies: [
          {
            service: 'api',
            language: 'typescript',
            dependsOn: [
              {
                service: 'orchestrator',
                language: 'python',
                apis: ['workflows'],
                valid: true
              }
            ]
          },
          {
            service: 'orchestrator',
            language: 'python',
            dependsOn: [
              {
                service: 'api',
                language: 'typescript',
                apis: ['test-cases'],
                valid: true
              }
            ]
          }
        ],
        missingDependencies: [],
        circularDependencies: [
          {
            path: ['api', 'orchestrator', 'api'],
            apis: ['workflows', 'test-cases']
          }
        ],
        valid: false
      };
      
      const report = CrossLanguageDependencyAnalyzer.formatAnalysisResults(results);
      
      expect(report).toContain('FAILED');
      expect(report).toContain('Circular Dependencies');
      expect(report).toContain('api -> orchestrator -> api');
    });
  });

  describe('generateDependencyDiagram', () => {
    it('should generate a Mermaid diagram', () => {
      const results = {
        serviceDependencies: [
          {
            service: 'api',
            language: 'typescript',
            dependsOn: [
              {
                service: 'orchestrator',
                language: 'python',
                apis: ['workflows', 'test-cases'],
                valid: true
              }
            ]
          },
          {
            service: 'orchestrator',
            language: 'python',
            dependsOn: [
              {
                service: 'binary-processor',
                language: 'go',
                apis: ['attachments'],
                valid: true
              }
            ]
          },
          {
            service: 'binary-processor',
            language: 'go',
            dependsOn: []
          }
        ],
        missingDependencies: [],
        circularDependencies: [],
        valid: true
      };
      
      const diagram = CrossLanguageDependencyAnalyzer.generateDependencyDiagram(results);
      
      expect(diagram).toContain('```mermaid');
      expect(diagram).toContain('graph TD');
      expect(diagram).toContain('api["api"]:::typescript');
      expect(diagram).toContain('orchestrator["orchestrator"]:::python');
      expect(diagram).toContain('binary-processor["binary-processor"]:::go');
      expect(diagram).toContain('api -->|"2 APIs"| orchestrator');
      expect(diagram).toContain('orchestrator -->|"1 APIs"| binary-processor');
    });
    
    it('should highlight invalid dependencies', () => {
      const results = {
        serviceDependencies: [
          {
            service: 'api',
            language: 'typescript',
            dependsOn: [
              {
                service: 'orchestrator',
                language: 'python',
                apis: ['workflows'],
                valid: false
              }
            ]
          }
        ],
        missingDependencies: [
          {
            consumer: 'api',
            provider: 'orchestrator',
            apis: ['workflows']
          }
        ],
        circularDependencies: [],
        valid: false
      };
      
      const diagram = CrossLanguageDependencyAnalyzer.generateDependencyDiagram(results);
      
      expect(diagram).toContain('color:red,stroke:red');
    });
  });

  describe('analyzeCrossLanguageDependencies', () => {
    it('should perform a complete analysis', () => {
      // This is more of an integration test that would require mocking multiple methods
      // For simplicity, let's mock the main building blocks and verify they're called correctly
      const analyzeServiceSpy = jest.spyOn(CrossLanguageDependencyAnalyzer, 'analyzeServiceDependencies')
        .mockImplementation(() => {
          const map = new Map();
          map.set('orchestrator', new Set(['workflows']));
          return map;
        });
        
      const validateSpy = jest.spyOn(CrossLanguageDependencyAnalyzer, 'validateServiceApiUsage')
        .mockImplementation(() => {
          return { valid: true, errors: [] };
        });
        
      const circularSpy = jest.spyOn(CrossLanguageDependencyAnalyzer, 'findCircularDependencies')
        .mockImplementation(() => {
          return [];
        });
      
      // Execute the analysis
      const results = CrossLanguageDependencyAnalyzer.analyzeCrossLanguageDependencies(tempDir);
      
      // Verify the results
      expect(results.valid).toBe(true);
      expect(results.serviceDependencies.length).toBeGreaterThan(0);
      expect(results.missingDependencies.length).toBe(0);
      expect(results.circularDependencies.length).toBe(0);
      
      // Verify the methods were called
      expect(analyzeServiceSpy).toHaveBeenCalled();
      expect(validateSpy).toHaveBeenCalled();
      expect(circularSpy).toHaveBeenCalled();
      
      // Restore the original methods
      analyzeServiceSpy.mockRestore();
      validateSpy.mockRestore();
      circularSpy.mockRestore();
    });
  });
});