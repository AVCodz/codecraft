/**
 * PERFORMANCE MONITOR - Tracks and logs performance metrics for WebContainer operations
 * 
 * Purpose: Monitor timing, memory usage, and performance bottlenecks
 * Used by: WebContainer initialization, preview loading, file operations
 * Key Features: Metric tracking, memory monitoring, performance logging, bottleneck detection
 */

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private memoryCheckInterval?: NodeJS.Timeout;

  /**
   * Start timing a metric
   */
  start(name: string): void {
    this.metrics.set(name, {
      name,
      startTime: performance.now(),
    });
    console.log(`[Performance] ⏱️ Started: ${name}`);
  }

  /**
   * End timing a metric
   */
  end(name: string): number | null {
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`[Performance] ⚠️ Metric not found: ${name}`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;
    
    metric.endTime = endTime;
    metric.duration = duration;

    console.log(`[Performance] ✅ Completed: ${name} (${duration.toFixed(2)}ms)`);
    return duration;
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get a specific metric
   */
  getMetric(name: string): PerformanceMetric | undefined {
    return this.metrics.get(name);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
    console.log('[Performance] 🗑️ Metrics cleared');
  }

  /**
   * Start memory monitoring
   */
  startMemoryMonitoring(intervalMs: number = 5000): void {
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
    }

    this.memoryCheckInterval = setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        console.log('[Performance] 🧠 Memory:', {
          used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
          total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
          limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`,
        });
      }
    }, intervalMs);

    console.log(`[Performance] 🧠 Memory monitoring started (${intervalMs}ms interval)`);
  }

  /**
   * Stop memory monitoring
   */
  stopMemoryMonitoring(): void {
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = undefined;
      console.log('[Performance] 🧠 Memory monitoring stopped');
    }
  }

  /**
   * Log performance summary
   */
  logSummary(): void {
    const metrics = this.getMetrics();
    const completedMetrics = metrics.filter(m => m.duration !== undefined);
    
    if (completedMetrics.length === 0) {
      console.log('[Performance] 📊 No completed metrics to report');
      return;
    }

    console.group('[Performance] 📊 Performance Summary');
    
    completedMetrics
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .forEach(metric => {
        console.log(`${metric.name}: ${metric.duration!.toFixed(2)}ms`);
      });

    const totalTime = completedMetrics.reduce((sum, m) => sum + (m.duration || 0), 0);
    console.log(`Total measured time: ${totalTime.toFixed(2)}ms`);
    
    console.groupEnd();
  }
}

// Global instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Decorator for timing async functions
 */
export function timed(name: string) {
  return function <T extends (...args: any[]) => Promise<any>>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const originalMethod = descriptor.value!;
    
    descriptor.value = (async function (this: any, ...args: any[]) {
      performanceMonitor.start(name);
      try {
        const result = await originalMethod.apply(this, args);
        performanceMonitor.end(name);
        return result;
      } catch (error) {
        performanceMonitor.end(name);
        throw error;
      }
    }) as T;
    
    return descriptor;
  };
}

/**
 * Simple timing utility
 */
export async function timeAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
  performanceMonitor.start(name);
  try {
    const result = await fn();
    performanceMonitor.end(name);
    return result;
  } catch (error) {
    performanceMonitor.end(name);
    throw error;
  }
}

/**
 * Memory usage checker
 */
export function checkMemoryUsage(): void {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    const used = memory.usedJSHeapSize / 1024 / 1024;
    const total = memory.totalJSHeapSize / 1024 / 1024;
    const limit = memory.jsHeapSizeLimit / 1024 / 1024;
    
    console.log(`[Performance] 🧠 Memory: ${used.toFixed(2)}MB / ${total.toFixed(2)}MB (limit: ${limit.toFixed(2)}MB)`);
    
    // Warn if memory usage is high
    if (used > limit * 0.8) {
      console.warn('[Performance] ⚠️ High memory usage detected!');
    }
  }
}

/**
 * Cleanup utility for preventing memory leaks
 */
export function cleanup(): void {
  performanceMonitor.stopMemoryMonitoring();
  performanceMonitor.clear();
  
  // Force garbage collection if available (dev tools)
  if ('gc' in window) {
    (window as any).gc();
    console.log('[Performance] 🗑️ Garbage collection triggered');
  }
}
