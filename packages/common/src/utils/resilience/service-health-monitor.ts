import { createLogger, LogLevel, Logger } from '../logger';
import { getResilienceFacade, getAllHealthStatus } from './resilience-factory';

export interface ProviderHealth {
  status: 'UP' | 'DEGRADED' | 'DOWN';
  lastChecked: Date;
  responseTime: number;
  circuitState: string;
  failureRate: number;
}

export class ServiceHealthMonitor {
  private providerHealth: Map<string, ProviderHealth> = new Map();
  private readonly checkInterval: number;
  private intervalId: NodeJS.Timeout | null = null;
  private logger: Logger;
  
  constructor(
    private readonly providers: string[],
    private readonly healthCheckFns: Map<string, () => Promise<boolean>>,
    checkIntervalMs = 60000
  ) {
    this.checkInterval = checkIntervalMs;
    this.logger = createLogger({ context: 'ServiceHealthMonitor', level: LogLevel.INFO });
    
    // Initialize health statuses
    this.providers.forEach(provider => {
      this.providerHealth.set(provider, {
        status: 'UP',
        lastChecked: new Date(),
        responseTime: 0,
        circuitState: 'CLOSED',
        failureRate: 0
      });
    });
  }
  
  public start(): void {
    if (this.intervalId) {
      return;
    }
    
    this.logger.info('Starting service health monitoring');
    
    // Perform an initial check
    this.checkAllProviders().catch(error => {
      this.logger.error('Error in initial health check', { error });
    });
    
    this.intervalId = setInterval(async () => {
      try {
        await this.checkAllProviders();
      } catch (error) {
        this.logger.error('Error in health check interval', { error });
      }
    }, this.checkInterval);
  }
  
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.logger.info('Stopped service health monitoring');
    }
  }
  
  public async checkAllProviders(): Promise<void> {
    this.logger.debug('Checking health of all providers');
    
    // Get current resilience health statuses
    const resilienceStatuses = getAllHealthStatus();
    
    // Check each provider
    for (const provider of this.providers) {
      try {
        await this.checkProvider(provider, resilienceStatuses.get(provider));
      } catch (error) {
        this.logger.error(`Error checking provider ${provider}`, { error });
      }
    }
  }
  
  private async checkProvider(
    provider: string, 
    resilienceStatus?: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY'
  ): Promise<void> {
    const healthCheckFn = this.healthCheckFns.get(provider);
    if (!healthCheckFn) {
      this.logger.warn(`No health check function for provider ${provider}`);
      return;
    }
    
    const startTime = Date.now();
    let isHealthy = false;
    
    try {
      isHealthy = await healthCheckFn();
    } catch (error) {
      this.logger.error(`Health check failed for provider ${provider}`, { error });
      isHealthy = false;
    }
    
    const responseTime = Date.now() - startTime;
    this.logger.debug(`Health check for ${provider}: ${isHealthy ? 'UP' : 'DOWN'}, response time: ${responseTime}ms`);
    
    const previousHealth = this.providerHealth.get(provider);
    if (!previousHealth) {
      this.logger.warn(`No previous health status for provider ${provider}`);
      return;
    }
    
    // Update circuit state from resilience status
    let circuitState = previousHealth.circuitState;
    if (resilienceStatus === 'HEALTHY') {
      circuitState = 'CLOSED';
    } else if (resilienceStatus === 'DEGRADED') {
      circuitState = 'HALF_OPEN';
    } else if (resilienceStatus === 'UNHEALTHY') {
      circuitState = 'OPEN';
    }
    
    // Update failure rate with decay
    const newFailureRate = isHealthy 
      ? (previousHealth.failureRate * 0.8) // Exponential decay when healthy
      : Math.min((previousHealth.failureRate * 1.2 + 0.1), 1); // Increase with cap when unhealthy
    
    // Determine overall status
    let status: 'UP' | 'DEGRADED' | 'DOWN';
    if (!isHealthy) {
      status = 'DOWN';
    } else if (responseTime > 5000 || newFailureRate > 0.3 || resilienceStatus === 'DEGRADED') {
      status = 'DEGRADED';
    } else {
      status = 'UP';
    }
    
    // Update health status
    const newHealth: ProviderHealth = {
      status,
      lastChecked: new Date(),
      responseTime,
      circuitState,
      failureRate: newFailureRate
    };
    
    this.providerHealth.set(provider, newHealth);
    
    // Log significant changes
    if (previousHealth.status !== newHealth.status) {
      this.logger.info(`Provider ${provider} changed status from ${previousHealth.status} to ${newHealth.status}`);
    }
  }
  
  public getProviderHealth(provider: string): ProviderHealth | undefined {
    return this.providerHealth.get(provider);
  }
  
  public getAllProvidersHealth(): Map<string, ProviderHealth> {
    return new Map(this.providerHealth);
  }
  
  public isHealthy(provider: string): boolean {
    const health = this.providerHealth.get(provider);
    return health?.status === 'UP';
  }
  
  public isDegraded(provider: string): boolean {
    const health = this.providerHealth.get(provider);
    return health?.status === 'DEGRADED';
  }
  
  public getSystemHealth(): 'UP' | 'DEGRADED' | 'DOWN' {
    let degradedCount = 0;
    let downCount = 0;
    
    for (const health of this.providerHealth.values()) {
      if (health.status === 'DOWN') {
        downCount++;
      } else if (health.status === 'DEGRADED') {
        degradedCount++;
      }
    }
    
    // If any critical provider is down, system is down
    if (downCount > 0) {
      return 'DOWN';
    }
    
    // If any provider is degraded, system is degraded
    if (degradedCount > 0) {
      return 'DEGRADED';
    }
    
    return 'UP';
  }
}