import { Request, Response, NextFunction } from 'express';
import logger from './logger';

/**
 * Performance Monitoring Utilities
 */

interface PerformanceMetrics {
  requestCount: number;
  errorCount: number;
  totalDuration: number;
  slowestRequests: Array<{
    method: string;
    path: string;
    duration: number;
    timestamp: string;
  }>;
}

class MonitoringService {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private readonly SLOW_REQUEST_THRESHOLD = 1000; // 1 second
  private readonly MAX_SLOW_REQUESTS_TRACKED = 100;

  /**
   * Middleware to track request performance
   */
  trackPerformance() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      
      // Add correlation ID
      if (!req.correlationId) {
        req.correlationId = this.generateCorrelationId();
      }

      // Track response
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const endpoint = `${req.method} ${req.route?.path || req.path}`;

        this.recordMetric(endpoint, duration, res.statusCode >= 400);

        // Log slow requests
        if (duration > this.SLOW_REQUEST_THRESHOLD) {
          logger.warn('Slow request detected', {
            method: req.method,
            path: req.path,
            duration,
            statusCode: res.statusCode,
            correlationId: req.correlationId
          });
        }

        // Log request
        logger.info('Request completed', {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
          correlationId: req.correlationId,
          userId: (req as any).user?.userId,
          ip: req.ip
        });
      });

      next();
    };
  }

  /**
   * Record metric for an endpoint
   */
  private recordMetric(endpoint: string, duration: number, isError: boolean) {
    let metrics = this.metrics.get(endpoint);

    if (!metrics) {
      metrics = {
        requestCount: 0,
        errorCount: 0,
        totalDuration: 0,
        slowestRequests: []
      };
      this.metrics.set(endpoint, metrics);
    }

    metrics.requestCount++;
    metrics.totalDuration += duration;
    
    if (isError) {
      metrics.errorCount++;
    }

    // Track slow requests
    if (duration > this.SLOW_REQUEST_THRESHOLD) {
      metrics.slowestRequests.push({
        method: endpoint.split(' ')[0],
        path: endpoint.split(' ')[1],
        duration,
        timestamp: new Date().toISOString()
      });

      // Keep only the slowest N requests
      if (metrics.slowestRequests.length > this.MAX_SLOW_REQUESTS_TRACKED) {
        metrics.slowestRequests.sort((a, b) => b.duration - a.duration);
        metrics.slowestRequests = metrics.slowestRequests.slice(0, this.MAX_SLOW_REQUESTS_TRACKED);
      }
    }
  }

  /**
   * Get metrics for all endpoints
   */
  getMetrics() {
    const result: any = {
      endpoints: [],
      summary: {
        totalRequests: 0,
        totalErrors: 0,
        averageDuration: 0
      }
    };

    let totalRequests = 0;
    let totalErrors = 0;
    let totalDuration = 0;

    this.metrics.forEach((metrics, endpoint) => {
      const avgDuration = metrics.requestCount > 0
        ? Math.round(metrics.totalDuration / metrics.requestCount)
        : 0;

      const errorRate = metrics.requestCount > 0
        ? ((metrics.errorCount / metrics.requestCount) * 100).toFixed(2)
        : '0.00';

      result.endpoints.push({
        endpoint,
        requestCount: metrics.requestCount,
        errorCount: metrics.errorCount,
        errorRate: `${errorRate}%`,
        avgDuration: `${avgDuration}ms`,
        slowestRequests: metrics.slowestRequests.slice(0, 5) // Top 5
      });

      totalRequests += metrics.requestCount;
      totalErrors += metrics.errorCount;
      totalDuration += metrics.totalDuration;
    });

    result.summary = {
      totalRequests,
      totalErrors,
      errorRate: totalRequests > 0
        ? `${((totalErrors / totalRequests) * 100).toFixed(2)}%`
        : '0.00%',
      averageDuration: totalRequests > 0
        ? `${Math.round(totalDuration / totalRequests)}ms`
        : '0ms'
    };

    // Sort by request count
    result.endpoints.sort((a: any, b: any) => b.requestCount - a.requestCount);

    return result;
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics.clear();
    logger.info('Metrics reset');
  }

  /**
   * Generate correlation ID
   */
  private generateCorrelationId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get system health metrics
   */
  getSystemHealth() {
    const usage = process.memoryUsage();
    
    return {
      status: 'healthy',
      uptime: Math.floor(process.uptime()),
      memory: {
        heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
        rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
        external: `${Math.round(usage.external / 1024 / 1024)}MB`
      },
      cpu: {
        user: process.cpuUsage().user / 1000000,
        system: process.cpuUsage().system / 1000000
      }
    };
  }
}

export const monitoringService = new MonitoringService();

/**
 * Middleware to add correlation ID
 */
export const correlationIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const correlationId = req.headers['x-correlation-id'] as string || 
    `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  
  next();
};

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      correlationId: string;
    }
  }
}
