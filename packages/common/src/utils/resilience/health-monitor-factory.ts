import { ServiceHealthMonitor } from './service-health-monitor';
export { ServiceHealthMonitor } from './service-health-monitor';
import axios from 'axios';
import { getRateLimiter as _getRateLimiter } from './resilience-factory';

// Singleton instance of the service health monitor
let globalHealthMonitor: ServiceHealthMonitor | null = null;

// Standard health check functions for common providers
const standardHealthChecks = new Map<string, () => Promise<boolean>>();

/**
 * Register a health check function for a provider
 * @param providerName The name of the provider
 * @param healthCheckFn The health check function
 */
export const registerHealthCheck = (
  providerName: string,
  healthCheckFn: () => Promise<boolean>
): void => {
  standardHealthChecks.set(providerName, healthCheckFn);
};

/**
 * Create a health check function for an endpoint with optional authentication
 * @param url The URL to check
 * @param getAuthHeaders Optional function to get authentication headers
 * @returns A health check function
 */
export const createEndpointHealthCheck = (
  url: string,
  getAuthHeaders?: () => Promise<Record<string, string>>
): (() => Promise<boolean>) => {
  return async (): Promise<boolean> => {
    try {
      const headers: Record<string, string> = getAuthHeaders 
        ? await getAuthHeaders()
        : {};
      
      const response = await axios.get(url, { 
        headers,
        timeout: 5000, // Short timeout for health checks
        validateStatus: status => status < 500 // Consider 4xx as "up" but with issues
      });
      
      return response.status < 400;
    } catch (error) {
      return false;
    }
  };
};

/**
 * Register standard health checks for common providers
 */
export const registerStandardHealthChecks = (): void => {
  // Zephyr health check
  registerHealthCheck('zephyr', createEndpointHealthCheck(
    'https://api.zephyrscale.smartbear.com/v2/health'
  ));
  
  // qTest health check
  registerHealthCheck('qtest', createEndpointHealthCheck(
    'https://api.qasymphony.com/health'
  ));
  
  // Jira health check
  registerHealthCheck('jira', createEndpointHealthCheck(
    'https://api.atlassian.com/ex/jira/status'
  ));
  
  // Azure DevOps health check
  registerHealthCheck('azure-devops', createEndpointHealthCheck(
    'https://status.dev.azure.com/_apis/status/health'
  ));
  
  // Rally health check
  registerHealthCheck('rally', createEndpointHealthCheck(
    'https://rally1.rallydev.com/slm/webservice/v2.0/workspace'
  ));
  
  // HP ALM health check
  registerHealthCheck('hp-alm', createEndpointHealthCheck(
    'https://alm.example.com/qcbin/rest/is-authenticated'
  ));
};

/**
 * Create a global health monitor for all registered providers
 * @param checkIntervalMs The interval in milliseconds to check health
 * @returns The service health monitor
 */
export const createGlobalHealthMonitor = (
  checkIntervalMs = 60000
): ServiceHealthMonitor => {
  if (!globalHealthMonitor) {
    // Register standard health checks if not done yet
    if (standardHealthChecks.size === 0) {
      registerStandardHealthChecks();
    }
    
    // Get all provider names
    const providers = Array.from(standardHealthChecks.keys());
    
    // Create the health monitor
    globalHealthMonitor = new ServiceHealthMonitor(
      providers,
      standardHealthChecks,
      checkIntervalMs
    );
    
    // Start the health checks
    globalHealthMonitor.start();
  }
  
  return globalHealthMonitor;
};

/**
 * Get the global health monitor
 * @returns The service health monitor
 */
export const getGlobalHealthMonitor = (): ServiceHealthMonitor | null => {
  return globalHealthMonitor;
};

/**
 * Reset the global health monitor
 */
export const resetGlobalHealthMonitor = (): void => {
  if (globalHealthMonitor) {
    globalHealthMonitor.stop();
    globalHealthMonitor = null;
  }
};