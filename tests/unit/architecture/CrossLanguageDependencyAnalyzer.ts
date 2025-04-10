/**
 * Copyright (C) 2025 Eric C. Mumford (@heymumford)
 * 
 * This file is part of Skidbladnir.
 * 
 * Skidbladnir is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License as published in the LICENSE file.
 */

import * as fs from 'fs';
import * as path from 'path';
import { PolyglotArchitectureValidator } from './PolyglotArchitectureValidator';
import { execSync } from 'child_process';

/**
 * Service interface mapping
 */
type ServiceMapping = {
  name: string;
  port: number;
  language: 'typescript' | 'python' | 'go';
  dependencies: {
    service: string;
    type: 'required' | 'optional';
  }[];
  providedApis: string[];
  consumedApis: string[];
  sourcePattern: RegExp;
};

/**
 * Cross-language dependency analysis results
 */
interface DependencyAnalysisResult {
  serviceDependencies: {
    service: string;
    language: string;
    dependsOn: {
      service: string;
      language: string;
      apis: string[];
      valid: boolean;
    }[];
  }[];
  missingDependencies: {
    consumer: string;
    provider: string;
    apis: string[];
  }[];
  circularDependencies: {
    path: string[];
    apis: string[];
  }[];
  valid: boolean;
}

/**
 * API endpoint definition
 */
interface ApiEndpoint {
  service: string;
  endpoint: string;
  method: string;
  inputSchema?: string;
  outputSchema?: string;
}

/**
 * Provides utilities for analyzing dependencies between code written in different languages.
 */
export class CrossLanguageDependencyAnalyzer {
  // Map of service definitions
  private static readonly SERVICES: ServiceMapping[] = [
    {
      name: 'api',
      port: 8080,
      language: 'typescript',
      dependencies: [
        { service: 'orchestrator', type: 'required' }
      ],
      providedApis: [
        'test-cases', 
        'workflows', 
        'providers', 
        'health'
      ],
      consumedApis: [
        'workflows',
        'test-cases'
      ],
      sourcePattern: /\/internal\/typescript\/api\/|\/cmd\/api\//
    },
    {
      name: 'orchestrator',
      port: 8000,
      language: 'python',
      dependencies: [
        { service: 'binary-processor', type: 'required' }
      ],
      providedApis: [
        'workflows', 
        'test-cases', 
        'health'
      ],
      consumedApis: [
        'attachments',
        'binary-processing'
      ],
      sourcePattern: /\/internal\/python\/orchestrator\/|\/cmd\/orchestrator\//
    },
    {
      name: 'binary-processor',
      port: 8090,
      language: 'go',
      dependencies: [],
      providedApis: [
        'attachments', 
        'binary-processing', 
        'health'
      ],
      consumedApis: [],
      sourcePattern: /\/internal\/go\/binary-processor\/|\/cmd\/binary-processor\//
    },
    {
      name: 'ui',
      port: 3000,
      language: 'typescript',
      dependencies: [
        { service: 'api', type: 'required' }
      ],
      providedApis: [],
      consumedApis: [
        'test-cases',
        'workflows',
        'providers'
      ],
      sourcePattern: /\/internal\/typescript\/ui\/|\/cmd\/ui\//
    }
  ];

  /**
   * API endpoints with schema info
   */
  private static readonly API_ENDPOINTS: ApiEndpoint[] = [
    // API service endpoints
    { service: 'api', endpoint: '/api/test-cases', method: 'GET' },
    { service: 'api', endpoint: '/api/test-cases/:id', method: 'GET' },
    { service: 'api', endpoint: '/api/workflows', method: 'GET' },
    { service: 'api', endpoint: '/api/workflows/:id', method: 'GET' },
    { service: 'api', endpoint: '/api/providers', method: 'GET' },
    { service: 'api', endpoint: '/api/health', method: 'GET' },
    
    // Orchestrator endpoints
    { service: 'orchestrator', endpoint: '/api/workflows', method: 'GET' },
    { service: 'orchestrator', endpoint: '/api/workflows/:id', method: 'GET' },
    { service: 'orchestrator', endpoint: '/api/test-cases', method: 'GET' },
    { service: 'orchestrator', endpoint: '/api/test-cases/:id', method: 'GET' },
    { service: 'orchestrator', endpoint: '/api/health', method: 'GET' },
    
    // Binary processor endpoints
    { service: 'binary-processor', endpoint: '/api/attachments', method: 'GET' },
    { service: 'binary-processor', endpoint: '/api/attachments/:id', method: 'GET' },
    { service: 'binary-processor', endpoint: '/api/binary-processing/jobs', method: 'POST' },
    { service: 'binary-processor', endpoint: '/api/health', method: 'GET' },
  ];

  /**
   * Find service endpoint URLs in a file
   * 
   * @param filePath - Path to the file to analyze
   * @param rootDir - Root directory of the project
   * @returns Map of services to APIs used
   */
  public static findServiceEndpointUsage(filePath: string, rootDir: string): Map<string, Set<string>> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const apiPattern = /(http|https):\/\/localhost:(\d+)\/api\/([a-zA-Z0-9\-_\/]+)/g;
    const serviceUrlPattern = /(['"])http:\/\/([a-zA-Z0-9\-_]+)(:(\d+))?\/api\/([^'"]+)/g;
    
    const serviceDependencies = new Map<string, Set<string>>();
    
    // Find direct localhost URLs with ports
    let match;
    while ((match = apiPattern.exec(content)) !== null) {
      const port = match[2];
      const apiPath = match[3];
      
      // Find the service that matches this port
      const service = this.SERVICES.find(s => s.port.toString() === port);
      if (service) {
        if (!serviceDependencies.has(service.name)) {
          serviceDependencies.set(service.name, new Set<string>());
        }
        serviceDependencies.get(service.name)?.add(apiPath);
      }
    }
    
    // Find service name URLs
    while ((match = serviceUrlPattern.exec(content)) !== null) {
      const serviceName = match[2];
      const apiPath = match[5];
      
      // Map service names to our defined services
      const service = this.SERVICES.find(s => 
        s.name === serviceName || 
        (`${s.name}-service` === serviceName) ||
        (`${s.name}service` === serviceName)
      );
      
      if (service) {
        if (!serviceDependencies.has(service.name)) {
          serviceDependencies.set(service.name, new Set<string>());
        }
        serviceDependencies.get(service.name)?.add(apiPath);
      }
    }
    
    return serviceDependencies;
  }
  
  /**
   * Find REST API client code that may reference other services
   * 
   * @param filePath - Path to the file to analyze
   * @param rootDir - Root directory of the project
   * @returns Map of services to APIs used
   */
  public static findApiClientCalls(filePath: string, rootDir: string): Map<string, Set<string>> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const serviceDependencies = new Map<string, Set<string>>();
    
    // Look for patterns that indicate API calls
    const fileExtension = path.extname(filePath).toLowerCase();
    
    // TypeScript/JavaScript patterns
    if (fileExtension === '.ts' || fileExtension === '.js' || fileExtension === '.tsx') {
      // Look for fetch, axios, or other HTTP client calls
      const patterns = [
        /\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]/g,
        /fetch\(['"]([^'"]+)['"]/g,
        /axios\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]/g
      ];
      
      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const endpoint = match[pattern === patterns[1] ? 1 : 2];
          
          // Check if the endpoint matches one of the known endpoints
          for (const api of this.API_ENDPOINTS) {
            const simplifiedEndpoint = api.endpoint.replace(/:[^\/]+/g, '[^/]+');
            const apiRegex = new RegExp(`${simplifiedEndpoint}($|\\?|/)`);
            
            if (apiRegex.test(endpoint)) {
              if (!serviceDependencies.has(api.service)) {
                serviceDependencies.set(api.service, new Set<string>());
              }
              serviceDependencies.get(api.service)?.add(api.endpoint);
            }
          }
        }
      }
    }
    
    // Python patterns
    else if (fileExtension === '.py') {
      // Look for requests, httpx, or other HTTP client calls
      const patterns = [
        /requests\.(get|post|put|delete|patch)\([\s\n]*['"](http[^'"]+)['"]/g,
        /httpx\.(get|post|put|delete|patch)\([\s\n]*['"](http[^'"]+)['"]/g,
        /client\.(get|post|put|delete|patch)\([\s\n]*['"](http[^'"]+|[^'"]+)['"]/g
      ];
      
      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const endpoint = match[2];
          
          // Check if the endpoint matches one of the known services
          for (const service of this.SERVICES) {
            if (
              endpoint.includes(`localhost:${service.port}`) ||
              endpoint.includes(`${service.name}`) ||
              endpoint.includes(`${service.name}-service`) ||
              endpoint.includes(`${service.name}service`)
            ) {
              // Extract the API path
              const apiPath = endpoint.split('/api/')[1]?.split('?')[0]?.split("'")[0];
              if (apiPath) {
                if (!serviceDependencies.has(service.name)) {
                  serviceDependencies.set(service.name, new Set<string>());
                }
                serviceDependencies.get(service.name)?.add(apiPath);
              }
            }
          }
        }
      }
    }
    
    // Go patterns
    else if (fileExtension === '.go') {
      // Look for http.Get, http.Post, etc.
      const patterns = [
        /http\.(Get|Post|Put|Delete)\([\s\n]*['"](http[^'"]+)['"]/g,
        /client\.(Get|Post|Put|Delete)\([\s\n]*['"](http[^'"]+)['"]/g,
        /client\.(Do|Send)\([^)]*url[\s\n]*=[\s\n]*['"](http[^'"]+)['"]/g
      ];
      
      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const endpoint = match[2];
          
          // Check if the endpoint matches one of the known services
          for (const service of this.SERVICES) {
            if (
              endpoint.includes(`localhost:${service.port}`) ||
              endpoint.includes(`${service.name}`) ||
              endpoint.includes(`${service.name}-service`) ||
              endpoint.includes(`${service.name}service`)
            ) {
              // Extract the API path
              const apiPath = endpoint.split('/api/')[1]?.split('?')[0]?.split("'")[0];
              if (apiPath) {
                if (!serviceDependencies.has(service.name)) {
                  serviceDependencies.set(service.name, new Set<string>());
                }
                serviceDependencies.get(service.name)?.add(apiPath);
              }
            }
          }
        }
      }
    }
    
    return serviceDependencies;
  }
  
  /**
   * Extract which other services a service depends on
   * 
   * @param serviceName - Name of the service to analyze
   * @param rootDir - Root directory of the project
   * @returns Map of services to APIs used
   */
  public static analyzeServiceDependencies(serviceName: string, rootDir: string): Map<string, Set<string>> {
    const serviceConfig = this.SERVICES.find(s => s.name === serviceName);
    if (!serviceConfig) {
      throw new Error(`Unknown service: ${serviceName}`);
    }
    
    const allDependencies = new Map<string, Set<string>>();
    
    // Find all files for this service
    let serviceFiles: string[] = [];
    
    if (serviceConfig.language === 'typescript') {
      serviceFiles = PolyglotArchitectureValidator.findFiles(rootDir, '.ts')
        .filter(file => serviceConfig.sourcePattern.test(file));
    } else if (serviceConfig.language === 'python') {
      serviceFiles = PolyglotArchitectureValidator.findFiles(rootDir, '.py')
        .filter(file => serviceConfig.sourcePattern.test(file));
    } else if (serviceConfig.language === 'go') {
      serviceFiles = PolyglotArchitectureValidator.findFiles(rootDir, '.go')
        .filter(file => serviceConfig.sourcePattern.test(file));
    }
    
    // Analyze each file
    for (const file of serviceFiles) {
      // Find direct endpoint usage
      const endpointUsage = this.findServiceEndpointUsage(file, rootDir);
      
      // Find API client calls
      const apiClientCalls = this.findApiClientCalls(file, rootDir);
      
      // Merge results
      Array.from(endpointUsage.entries()).forEach(([service, apis]) => {
        if (!allDependencies.has(service)) {
          allDependencies.set(service, new Set<string>());
        }
        
        apis.forEach(api => {
          const dependencyApis = allDependencies.get(service);
          if (dependencyApis) {
            dependencyApis.add(api);
          }
        });
      });
      
      Array.from(apiClientCalls.entries()).forEach(([service, apis]) => {
        if (!allDependencies.has(service)) {
          allDependencies.set(service, new Set<string>());
        }
        
        apis.forEach(api => {
          const dependencyApis = allDependencies.get(service);
          if (dependencyApis) {
            dependencyApis.add(api);
          }
        });
      });
    }
    
    return allDependencies;
  }
  
  /**
   * Validate that APIs used are valid based on the service configuration
   * 
   * @param serviceName - Name of the service using the APIs
   * @param dependencies - Map of services to APIs used
   * @returns Validation result with errors
   */
  public static validateServiceApiUsage(
    serviceName: string, 
    dependencies: Map<string, Set<string>>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Get the service's allowed dependencies
    const serviceConfig = this.SERVICES.find(s => s.name === serviceName);
    if (!serviceConfig) {
      return { valid: false, errors: [`Unknown service: ${serviceName}`] };
    }
    
    // Check each dependency
    Array.from(dependencies.entries()).forEach(([dependencyName, apis]) => {
      // Skip self-dependencies
      if (dependencyName === serviceName) {
        return;
      }
      
      // Check if this dependency is allowed
      const allowedDependency = serviceConfig.dependencies.find(d => d.service === dependencyName);
      if (!allowedDependency) {
        errors.push(`Service ${serviceName} depends on ${dependencyName}, but this dependency is not declared`);
        return;
      }
      
      // Find the dependency service configuration
      const dependencyConfig = this.SERVICES.find(s => s.name === dependencyName);
      if (!dependencyConfig) {
        errors.push(`Unknown dependency service: ${dependencyName}`);
        return;
      }
      
      // Check that all APIs used are provided by the dependency
      apis.forEach(api => {
        const apiBase = api.split('/')[0];
        const isProvided = dependencyConfig.providedApis.some(providedApi => 
          providedApi === apiBase || api.startsWith(providedApi)
        );
        
        if (!isProvided) {
          errors.push(`Service ${serviceName} uses API ${api} from ${dependencyName}, but this API is not provided`);
        }
      });
    });
    
    return { valid: errors.length === 0, errors };
  }
  
  /**
   * Check for circular dependencies between services
   * 
   * @param serviceDependencies - Map of service dependencies
   * @returns Array of circular dependency paths
   */
  public static findCircularDependencies(
    serviceDependencies: Map<string, string[]>
  ): string[][] {
    const circulars: string[][] = [];
    const visited = new Set<string>();
    const stack = new Set<string>();
    
    // Depth-first search to find cycles
    const dfs = (node: string, path: string[] = []): void => {
      // If already in the current path, we have a cycle
      if (stack.has(node)) {
        // Extract the cycle
        const cycleStart = path.indexOf(node);
        const cycle = [...path.slice(cycleStart), node];
        circulars.push(cycle);
        return;
      }
      
      // If already visited, skip
      if (visited.has(node)) {
        return;
      }
      
      // Add to current path
      stack.add(node);
      path.push(node);
      
      // Visit neighbors
      const dependencies = serviceDependencies.get(node) || [];
      for (const dependency of dependencies) {
        dfs(dependency, [...path]);
      }
      
      // Remove from current path
      stack.delete(node);
      visited.add(node);
    };
    
    // Check each service
    Array.from(serviceDependencies.keys()).forEach(service => {
      visited.clear();
      stack.clear();
      dfs(service);
    });
    
    return circulars;
  }
  
  /**
   * Perform a full cross-language dependency analysis
   * 
   * @param rootDir - Root directory of the project
   * @returns Analysis results
   */
  public static analyzeCrossLanguageDependencies(rootDir: string): DependencyAnalysisResult {
    const serviceDependencies: DependencyAnalysisResult['serviceDependencies'] = [];
    const missingDependencies: DependencyAnalysisResult['missingDependencies'] = [];
    let valid = true;
    
    // Analyze each service
    for (const service of this.SERVICES) {
      // Get dependencies for this service
      const dependencies = this.analyzeServiceDependencies(service.name, rootDir);
      
      // Validate API usage
      const validation = this.validateServiceApiUsage(service.name, dependencies);
      if (!validation.valid) {
        valid = false;
      }
      
      // Add service dependencies
      const serviceDeps: {
        service: string;
        language: string;
        dependsOn: {
          service: string;
          language: string;
          apis: string[];
          valid: boolean;
        }[];
      } = {
        service: service.name,
        language: service.language,
        dependsOn: []
      };
      
      // Add dependencies
      Array.from(dependencies.entries()).forEach(([depName, apis]) => {
        // Skip self-dependencies
        if (depName === service.name) {
          return;
        }
        
        const depService = this.SERVICES.find(s => s.name === depName);
        if (!depService) {
          return;
        }
        
        // Check if this dependency is valid
        const isValid = validation.errors.every(error => 
          !error.includes(`Service ${service.name} depends on ${depName}`)
        );
        
        serviceDeps.dependsOn.push({
          service: depName,
          language: depService.language,
          apis: Array.from(apis),
          valid: isValid
        });
        
        // Add missing dependencies
        if (!isValid) {
          missingDependencies.push({
            consumer: service.name,
            provider: depName,
            apis: Array.from(apis)
          });
        }
      });
      
      serviceDependencies.push(serviceDeps);
    }
    
    // Create a map of service dependencies for cycle detection
    const depMap = new Map<string, string[]>();
    for (const service of serviceDependencies) {
      depMap.set(
        service.service,
        service.dependsOn.map(dep => dep.service)
      );
    }
    
    // Find circular dependencies
    const circles = this.findCircularDependencies(depMap);
    const circularDependencies: DependencyAnalysisResult['circularDependencies'] = circles.map(circle => {
      // Find the APIs used in this circular dependency
      const apis: string[] = [];
      
      for (let i = 0; i < circle.length - 1; i++) {
        const from = circle[i];
        const to = circle[i + 1];
        
        // Find the service dependency
        const service = serviceDependencies.find(s => s.service === from);
        if (service) {
          const dependency = service.dependsOn.find(d => d.service === to);
          if (dependency) {
            apis.push(...dependency.apis);
          }
        }
      }
      
      return {
        path: circle,
        apis: Array.from(new Set(apis)) // Deduplicate APIs
      };
    });
    
    // Check if there are circular dependencies
    if (circularDependencies.length > 0) {
      valid = false;
    }
    
    return {
      serviceDependencies,
      missingDependencies,
      circularDependencies,
      valid
    };
  }
  
  /**
   * Generate a human-readable report from the analysis results
   * 
   * @param results - Analysis results
   * @returns Formatted report
   */
  public static formatAnalysisResults(results: DependencyAnalysisResult): string {
    let report = 'Cross-Language Dependency Analysis Report\n';
    report += '===========================================\n\n';
    
    // Overall status
    report += `Overall Status: ${results.valid ? '✅ PASSED' : '❌ FAILED'}\n\n`;
    
    // Service dependencies
    report += 'Service Dependencies\n';
    report += '-------------------\n';
    for (const service of results.serviceDependencies) {
      report += `* ${service.service} (${service.language}):\n`;
      
      if (service.dependsOn.length === 0) {
        report += '  - No dependencies\n';
      } else {
        for (const dep of service.dependsOn) {
          const status = dep.valid ? '✅' : '❌';
          report += `  - ${status} Depends on ${dep.service} (${dep.language}):\n`;
          
          // List APIs used
          for (const api of dep.apis) {
            report += `      - ${api}\n`;
          }
        }
      }
      report += '\n';
    }
    
    // Missing dependencies
    if (results.missingDependencies.length > 0) {
      report += 'Missing Dependencies\n';
      report += '-------------------\n';
      for (const missing of results.missingDependencies) {
        report += `* ${missing.consumer} cannot use ${missing.provider} without a proper dependency declaration:\n`;
        for (const api of missing.apis) {
          report += `  - ${api}\n`;
        }
        report += '\n';
      }
    }
    
    // Circular dependencies
    if (results.circularDependencies.length > 0) {
      report += 'Circular Dependencies\n';
      report += '--------------------\n';
      for (const circular of results.circularDependencies) {
        report += `* Circular dependency detected: ${circular.path.join(' -> ')} -> ${circular.path[0]}\n`;
        report += '  APIs involved:\n';
        for (const api of circular.apis) {
          report += `  - ${api}\n`;
        }
        report += '\n';
      }
    }
    
    return report;
  }
  
  /**
   * Generate a visualization of service dependencies as a Mermaid diagram
   * 
   * @param results - Analysis results
   * @returns Mermaid diagram
   */
  public static generateDependencyDiagram(results: DependencyAnalysisResult): string {
    let diagram = '```mermaid\ngraph TD;\n';
    
    // Style nodes by language
    diagram += 'classDef typescript fill:#007acc,color:white;\n';
    diagram += 'classDef python fill:#306998,color:white;\n';
    diagram += 'classDef go fill:#00add8,color:white;\n';
    
    // Add nodes
    for (const service of results.serviceDependencies) {
      diagram += `  ${service.service}["${service.service}"]:::${service.language};\n`;
    }
    
    // Add edges
    for (const service of results.serviceDependencies) {
      for (const dep of service.dependsOn) {
        const style = dep.valid ? '' : ',color:red,stroke:red';
        diagram += `  ${service.service} -->|"${dep.apis.length} APIs"${style}| ${dep.service};\n`;
      }
    }
    
    diagram += '```';
    return diagram;
  }
}