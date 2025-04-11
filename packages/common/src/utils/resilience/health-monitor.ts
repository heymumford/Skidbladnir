import { getAllHealthStatus } from './resilience-factory';
import { createLogger, LogLevel, Logger } from '../logger';

export enum ServiceHealth {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY'
}

export interface ServiceHealthDetails {
  status: ServiceHealth;
  timestamp: number;
  providers: Record<string, {
    status: ServiceHealth;
    details?: any;
  }>;
  overallStatus: ServiceHealth;
}

export class ServiceHealthMonitor {
  private static instance: ServiceHealthMonitor;
  private health: ServiceHealthDetails;
  private checkIntervalId: NodeJS.Timeout | null = null;
  private logger: Logger;
  
  private constructor() {
    this.logger = createLogger({ context: 'ServiceHealthMonitor', level: LogLevel.INFO });
    this.health = {
      status: ServiceHealth.HEALTHY,
      timestamp: Date.now(),
      providers: {},
      overallStatus: ServiceHealth.HEALTHY
    };
  }
  
  public static getInstance(): ServiceHealthMonitor {
    if (!ServiceHealthMonitor.instance) {
      ServiceHealthMonitor.instance = new ServiceHealthMonitor();
    }
    return ServiceHealthMonitor.instance;
  }
  
  /**
   * Start monitoring service health
   * @param intervalMs How often to check service health (default: 60000ms)
   */
  public startMonitoring(intervalMs = 60000): void {
    if (this.checkIntervalId) {
      this.stopMonitoring();
    }
    
    // Run an initial check
    this.checkHealth();
    
    // Set up interval for regular checks
    this.checkIntervalId = setInterval(() => {
      this.checkHealth();
    }, intervalMs);
  }
  
  /**
   * Stop monitoring service health
   */
  public stopMonitoring(): void {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
  }
  
  /**
   * Check and update service health
   */
  public checkHealth(): ServiceHealthDetails {
    try {
      // Get health status from all providers
      const providerStatus = getAllHealthStatus();
      const providers: Record<string, {
        status: ServiceHealth;
        details?: any;
      }> = {};
      
      // Map the status of each provider
      let overallStatus = ServiceHealth.HEALTHY;
      
      for (const [provider, status] of providerStatus.entries()) {
        // Convert status to ServiceHealth enum
        const healthStatus = status as ServiceHealth;
        
        // Update overall status based on provider status
        if (healthStatus === ServiceHealth.UNHEALTHY) {
          overallStatus = ServiceHealth.UNHEALTHY;
        } else if (
          healthStatus === ServiceHealth.DEGRADED && 
          overallStatus === ServiceHealth.HEALTHY
        ) {
          overallStatus = ServiceHealth.DEGRADED;
        }
        
        // Add provider status to the health details
        providers[provider] = {
          status: healthStatus
        };
      }
      
      // Update health details
      this.health = {
        status: overallStatus,
        timestamp: Date.now(),
        providers,
        overallStatus
      };
      
      // Log status changes
      if (overallStatus !== ServiceHealth.HEALTHY) {
        this.logger.warn(`Service health is ${overallStatus}`, {
          providers: Object.entries(providers)
            .filter(([_, details]) => details.status !== ServiceHealth.HEALTHY)
            .map(([provider, details]) => `${provider}: ${details.status}`)
            .join(', ')
        });
      }
    } catch (error) {
      this.logger.error('Error checking service health', { error });
      
      // If we can't check health, assume degraded
      this.health = {
        status: ServiceHealth.DEGRADED,
        timestamp: Date.now(),
        providers: {},
        overallStatus: ServiceHealth.DEGRADED
      };
    }
    
    return this.health;
  }
  
  /**
   * Get current service health
   */
  public getHealth(): ServiceHealthDetails {
    return this.health;
  }
  
  /**
   * Get current service health status
   */
  public getStatus(): ServiceHealth {
    return this.health.overallStatus;
  }
  
  /**
   * Check if all services are healthy
   */
  public isHealthy(): boolean {
    return this.health.overallStatus === ServiceHealth.HEALTHY;
  }
  
  /**
   * Check if services are at least partially operational
   */
  public isOperational(): boolean {
    return this.health.overallStatus !== ServiceHealth.UNHEALTHY;
  }
}