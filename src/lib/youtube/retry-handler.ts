/**
 * YouTube API Retry Handler
 *
 * Implements exponential backoff retry logic with:
 * - Maximum 3 retry attempts
 * - Exponential delays: 1s, 2s, 4s
 * - Jitter to prevent thundering herd
 * - Circuit breaker pattern (5 consecutive failures)
 * - Retry only on transient errors
 */

import { YouTubeError, YouTubeErrorCode } from './types';
import type { YouTubeLogger } from './logger';

/**
 * Retry attempt information
 */
interface RetryAttempt {
  attempt: number;
  error: string;
  delay: number;
}

/**
 * Retry Handler with Exponential Backoff
 *
 * Automatically retries failed operations with exponential backoff delays.
 * Implements circuit breaker pattern to prevent cascading failures.
 */
export class RetryHandler {
  private maxRetries: number;
  private baseDelay: number;
  private logger?: YouTubeLogger;
  private consecutiveFailures: number = 0;
  private circuitOpen: boolean = false;
  private circuitOpenTime?: Date;
  private readonly circuitBreakerThreshold = 5; // Open after 5 consecutive failures
  private readonly circuitBreakerCooldown = 60000; // 60 seconds

  /**
   * Create retry handler
   *
   * @param maxRetries - Maximum retry attempts (default: 3)
   * @param baseDelay - Base delay in milliseconds (default: 1000)
   * @param logger - Optional logger instance
   */
  constructor(maxRetries: number = 3, baseDelay: number = 1000, logger?: YouTubeLogger) {
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
    this.logger = logger;

    this.logger?.debug('RetryHandler initialized', {
      maxRetries,
      baseDelay,
      circuitBreakerThreshold: this.circuitBreakerThreshold,
      circuitBreakerCooldown: this.circuitBreakerCooldown
    });
  }

  /**
   * Execute operation with automatic retry logic
   *
   * Retries the operation up to maxRetries times on retryable errors,
   * with exponential backoff delays between attempts.
   *
   * @param operation - Async operation to execute
   * @param context - Context description for logging
   * @returns Operation result
   * @throws {YouTubeError} If all retries fail or error is not retryable
   *
   * @example
   * ```typescript
   * const result = await retryHandler.executeWithRetry(
   *   () => youtube.search.list({ q: 'test' }),
   *   'YouTube search for "test"'
   * );
   * ```
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    // Check circuit breaker
    if (this.circuitOpen) {
      const cooldownElapsed = Date.now() - (this.circuitOpenTime?.getTime() || 0);

      if (cooldownElapsed < this.circuitBreakerCooldown) {
        const waitSeconds = Math.ceil((this.circuitBreakerCooldown - cooldownElapsed) / 1000);
        const error = new YouTubeError(
          YouTubeErrorCode.SERVICE_UNAVAILABLE,
          `Circuit breaker open due to consecutive failures. Try again in ${waitSeconds} seconds.`,
          { cooldownRemaining: waitSeconds }
        );

        this.logger?.error('Circuit breaker rejected request', error, {
          context,
          cooldownElapsed,
          cooldownRemaining: waitSeconds
        });

        throw error;
      } else {
        // Close circuit after cooldown
        this.circuitOpen = false;
        this.consecutiveFailures = 0;

        this.logger?.info('Circuit breaker closed after cooldown', {
          context,
          cooldownElapsed
        });
      }
    }

    let lastError: Error | null = null;
    const attemptErrors: RetryAttempt[] = [];

    // Try operation with retries
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await operation();

        // Success - reset consecutive failures counter
        if (this.consecutiveFailures > 0) {
          this.logger?.info('Operation succeeded after previous failures', {
            context,
            previousFailures: this.consecutiveFailures
          });
          this.consecutiveFailures = 0;
        }

        return result;
      } catch (error: any) {
        lastError = error;

        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          this.logger?.error('Non-retryable error encountered', error, {
            context,
            attempt,
            errorType: error.constructor.name
          });
          throw error;
        }

        // If this is the last attempt, don't retry
        if (attempt >= this.maxRetries) {
          attemptErrors.push({
            attempt,
            error: error.message || String(error),
            delay: 0
          });
          break;
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt);
        attemptErrors.push({
          attempt,
          error: error.message || String(error),
          delay
        });

        this.logger?.warn(`Retry attempt ${attempt}/${this.maxRetries}`, {
          context,
          delay,
          error: error.message || String(error),
          errorCode: error.code
        });

        // Wait before next attempt
        await this.sleep(delay);
      }
    }

    // All retries failed
    this.consecutiveFailures++;

    // Check circuit breaker threshold
    if (this.consecutiveFailures >= this.circuitBreakerThreshold) {
      this.circuitOpen = true;
      this.circuitOpenTime = new Date();

      this.logger?.error('Circuit breaker opened', undefined, {
        context,
        consecutiveFailures: this.consecutiveFailures,
        threshold: this.circuitBreakerThreshold,
        cooldown: this.circuitBreakerCooldown
      });
    }

    // Create final error with retry history
    const error = new YouTubeError(
      YouTubeErrorCode.SERVICE_UNAVAILABLE,
      `Failed after ${this.maxRetries} attempts: ${context}`,
      {
        attempts: attemptErrors,
        finalError: lastError?.message || String(lastError),
        consecutiveFailures: this.consecutiveFailures
      }
    );

    this.logger?.error('All retry attempts failed', error, {
      context,
      maxRetries: this.maxRetries,
      consecutiveFailures: this.consecutiveFailures
    });

    throw error;
  }

  /**
   * Check if error should be retried
   *
   * Retries on:
   * - Network errors (ECONNRESET, ETIMEDOUT, etc.)
   * - 5xx server errors
   * - 429 rate limit errors
   * - YouTube RATE_LIMITED or NETWORK_ERROR codes
   *
   * Does NOT retry on:
   * - 4xx client errors (except 429)
   * - Quota exceeded errors
   * - Invalid API key
   * - Invalid request
   *
   * @param error - Error to check
   * @returns True if error should be retried
   * @private
   */
  private isRetryableError(error: any): boolean {
    // Check if it's a YouTubeError
    if (error instanceof YouTubeError) {
      const retryableCodes = [
        YouTubeErrorCode.RATE_LIMITED,
        YouTubeErrorCode.NETWORK_ERROR,
        YouTubeErrorCode.SERVICE_UNAVAILABLE
      ];
      return retryableCodes.includes(error.code);
    }

    // Check for network errors
    if (error.code === 'ECONNRESET' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ECONNREFUSED') {
      return true;
    }

    // Check for HTTP status codes
    if (error.response?.status) {
      const status = error.response.status;

      // Retry on 5xx server errors
      if (status >= 500 && status < 600) {
        return true;
      }

      // Retry on 429 rate limit
      if (status === 429) {
        return true;
      }

      // Don't retry on other 4xx errors
      if (status >= 400 && status < 500) {
        return false;
      }
    }

    // Default to not retrying unknown errors
    return false;
  }

  /**
   * Calculate delay for retry attempt
   *
   * Uses exponential backoff with jitter:
   * - Attempt 1: ~1000ms (±100ms)
   * - Attempt 2: ~2000ms (±200ms)
   * - Attempt 3: ~4000ms (±400ms)
   *
   * @param attempt - Attempt number (1-indexed)
   * @returns Delay in milliseconds
   * @private
   */
  private calculateDelay(attempt: number): number {
    // Exponential backoff: baseDelay * (2 ^ (attempt - 1))
    const exponentialDelay = this.baseDelay * Math.pow(2, attempt - 1);

    // Add jitter: ±10% random variation
    const jitter = exponentialDelay * 0.1 * (Math.random() * 2 - 1);

    // Calculate final delay and ensure it's positive
    const delay = Math.round(exponentialDelay + jitter);

    return Math.max(0, delay);
  }

  /**
   * Sleep for specified milliseconds
   *
   * @param ms - Milliseconds to sleep
   * @returns Promise that resolves after delay
   * @private
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get circuit breaker status
   *
   * @returns Circuit breaker information
   */
  getCircuitStatus(): {
    open: boolean;
    consecutiveFailures: number;
    threshold: number;
    cooldownRemaining: number;
  } {
    let cooldownRemaining = 0;

    if (this.circuitOpen && this.circuitOpenTime) {
      const elapsed = Date.now() - this.circuitOpenTime.getTime();
      cooldownRemaining = Math.max(0, this.circuitBreakerCooldown - elapsed);
    }

    return {
      open: this.circuitOpen,
      consecutiveFailures: this.consecutiveFailures,
      threshold: this.circuitBreakerThreshold,
      cooldownRemaining
    };
  }

  /**
   * Manually reset circuit breaker
   *
   * Use with caution - typically circuit should reset automatically.
   */
  resetCircuit(): void {
    const wasOpen = this.circuitOpen;
    this.circuitOpen = false;
    this.consecutiveFailures = 0;
    this.circuitOpenTime = undefined;

    if (wasOpen) {
      this.logger?.info('Circuit breaker manually reset');
    }
  }
}
