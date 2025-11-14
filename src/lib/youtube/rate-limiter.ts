/**
 * YouTube API Rate Limiter
 *
 * Implements sliding window rate limiting to respect YouTube API constraints:
 * - Default: 100 requests per 100 seconds
 * - Request queueing for burst traffic
 * - FIFO queue processing
 */

import { YouTubeError, YouTubeErrorCode } from './types';
import type { YouTubeLogger } from './logger';

/**
 * Queued request promise resolvers
 */
interface QueuedRequest {
  resolve: () => void;
  reject: (error: Error) => void;
  timestamp: number;
}

/**
 * Rate Limiter with Sliding Window Algorithm
 *
 * Prevents exceeding YouTube API rate limits by tracking request timestamps
 * and queuing excess requests. Uses a sliding window to allow burst traffic
 * while maintaining average rate compliance.
 */
export class RateLimiter {
  private requestTimestamps: number[] = [];
  private queue: QueuedRequest[] = [];
  private maxRequests: number;
  private windowMs: number;
  private logger?: YouTubeLogger;
  private maxQueueSize: number = 100; // Prevent memory overflow
  private processing: boolean = false;

  /**
   * Create rate limiter
   *
   * @param maxRequests - Maximum requests allowed in time window
   * @param windowMs - Time window in milliseconds
   * @param logger - Optional logger instance
   */
  constructor(maxRequests: number, windowMs: number, logger?: YouTubeLogger) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.logger = logger;

    this.logger?.debug('RateLimiter initialized', {
      maxRequests,
      windowMs,
      windowSeconds: windowMs / 1000
    });
  }

  /**
   * Acquire permission to make an API request
   *
   * Returns immediately if under rate limit, otherwise queues the request
   * and resolves when rate limit allows.
   *
   * @returns Promise that resolves when request is allowed
   * @throws {YouTubeError} If queue is full
   */
  async acquire(): Promise<void> {
    // Cleanup old timestamps outside the window
    this.cleanupOldTimestamps();

    // If under limit, allow immediately
    if (this.requestTimestamps.length < this.maxRequests) {
      this.requestTimestamps.push(Date.now());

      this.logger?.debug('Rate limit check passed', {
        currentRequests: this.requestTimestamps.length,
        maxRequests: this.maxRequests,
        queueSize: this.queue.length
      });

      return Promise.resolve();
    }

    // At limit - check queue capacity
    if (this.queue.length >= this.maxQueueSize) {
      const error = new YouTubeError(
        YouTubeErrorCode.RATE_LIMITED,
        `Rate limit queue full (${this.maxQueueSize} pending requests). Please try again later.`
      );

      this.logger?.error('Rate limit queue overflow', error, {
        queueSize: this.queue.length,
        maxQueueSize: this.maxQueueSize
      });

      throw error;
    }

    // Calculate delay until next available slot
    const delay = this.getDelay();

    this.logger?.warn('Rate limit reached, queueing request', {
      currentRequests: this.requestTimestamps.length,
      maxRequests: this.maxRequests,
      delayMs: delay,
      queueSize: this.queue.length + 1
    });

    // Queue the request
    return new Promise<void>((resolve, reject) => {
      this.queue.push({
        resolve,
        reject,
        timestamp: Date.now()
      });

      // Start processing queue if not already processing
      if (!this.processing) {
        this.scheduleQueueProcessing(delay);
      }
    });
  }

  /**
   * Remove timestamps older than the time window
   *
   * @private
   */
  private cleanupOldTimestamps(): void {
    const cutoff = Date.now() - this.windowMs;
    const beforeCount = this.requestTimestamps.length;

    this.requestTimestamps = this.requestTimestamps.filter(ts => ts > cutoff);

    const removedCount = beforeCount - this.requestTimestamps.length;
    if (removedCount > 0) {
      this.logger?.debug('Cleaned up expired timestamps', {
        removed: removedCount,
        remaining: this.requestTimestamps.length
      });
    }
  }

  /**
   * Calculate delay until next request slot is available
   *
   * @returns Delay in milliseconds
   * @private
   */
  private getDelay(): number {
    if (this.requestTimestamps.length === 0) {
      return 0;
    }

    // Find the oldest timestamp
    const oldest = this.requestTimestamps[0];

    // Calculate when it will expire (exit the window)
    const expiresAt = oldest + this.windowMs;

    // Calculate delay until that time
    const delay = Math.max(0, expiresAt - Date.now());

    return delay;
  }

  /**
   * Schedule queue processing after delay
   *
   * @param delay - Milliseconds to wait before processing
   * @private
   */
  private scheduleQueueProcessing(delay: number): void {
    this.processing = true;

    setTimeout(() => {
      this.processQueue();
    }, delay);
  }

  /**
   * Process queued requests
   *
   * Dequeues requests in FIFO order and resolves them as rate limit allows.
   *
   * @private
   */
  private processQueue(): void {
    this.cleanupOldTimestamps();

    // Process as many queued requests as possible
    while (this.queue.length > 0 && this.requestTimestamps.length < this.maxRequests) {
      const queued = this.queue.shift();
      if (!queued) break;

      // Add timestamp and resolve promise
      this.requestTimestamps.push(Date.now());
      queued.resolve();

      this.logger?.debug('Processed queued request', {
        waitTime: Date.now() - queued.timestamp,
        currentRequests: this.requestTimestamps.length,
        remainingQueue: this.queue.length
      });
    }

    // If queue still has items, schedule next processing
    if (this.queue.length > 0) {
      const delay = this.getDelay();

      this.logger?.debug('Rescheduling queue processing', {
        delay,
        queueSize: this.queue.length
      });

      this.scheduleQueueProcessing(delay);
    } else {
      this.processing = false;

      this.logger?.debug('Queue processing complete', {
        currentRequests: this.requestTimestamps.length
      });
    }
  }

  /**
   * Get current rate limit status
   *
   * @returns Status information for debugging/monitoring
   */
  getStatus(): {
    currentRequests: number;
    maxRequests: number;
    queueSize: number;
    nextAvailableIn: number;
  } {
    this.cleanupOldTimestamps();

    return {
      currentRequests: this.requestTimestamps.length,
      maxRequests: this.maxRequests,
      queueSize: this.queue.length,
      nextAvailableIn: this.getDelay()
    };
  }
}
