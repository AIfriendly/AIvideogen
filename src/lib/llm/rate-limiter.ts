/**
 * Rate Limiter Utility for LLM Providers
 *
 * Implements sliding window rate limiting to prevent API quota exhaustion.
 * Tracks request timestamps per-provider and enforces configurable request limits.
 *
 * @module lib/llm/rate-limiter
 */

/**
 * Configuration for rate limiting a specific provider
 */
export interface RateLimitConfig {
  enabled: boolean;
  requestsPerMinute: number;
}

/**
 * Rate limiter using sliding window algorithm
 *
 * This implementation tracks timestamps of successful requests within
 * a rolling time window (60 seconds). When the limit is reached, subsequent
 * requests wait until the oldest timestamp expires.
 *
 * Thread Safety Note: Node.js is single-threaded with async event loop.
 * The Map is safe for concurrent await operations but not for actual parallelism
 * (e.g., PM2 clustering, worker threads). For multi-process scenarios,
 * consider Redis-backed rate limiting.
 */
export class RateLimiter {
  // Map of providerId -> array of request timestamps (milliseconds since epoch)
  private requests: Map<string, number[]> = new Map();

  // Constants
  private readonly WINDOW_MS = 60000; // 1 minute sliding window
  private readonly MAX_TIMESTAMPS = 1000; // Safety limit to prevent memory leaks

  /**
   * Wait until the next request is allowed for the given provider
   *
   * @param providerId - Unique identifier for the LLM provider (e.g., 'gemini', 'ollama')
   * @param requestsPerMinute - Maximum requests allowed per minute (0 = block all)
   * @param enabled - Whether rate limiting is enabled for this provider
   * @returns Promise that resolves when the request can proceed
   */
  async wait(providerId: string, requestsPerMinute: number, enabled: boolean = true): Promise<void> {
    // If rate limiting is disabled, proceed immediately
    if (!enabled) {
      return;
    }

    // Zero rate limit blocks all requests
    if (requestsPerMinute <= 0) {
      console.warn(`[RateLimiter] ${providerId} rate limit is 0, blocking all requests`);
      throw new Error(`Rate limit exceeded for ${providerId} (requestsPerMinute=${requestsPerMinute})`);
    }

    const now = Date.now();

    // Get or initialize timestamp array for this provider
    let timestamps = this.requests.get(providerId) || [];

    // Remove timestamps older than window (sliding window)
    timestamps = timestamps.filter(ts => now - ts < this.WINDOW_MS);

    // Safety check: prevent unbounded memory growth
    if (timestamps.length > this.MAX_TIMESTAMPS) {
      console.warn(`[RateLimiter] Timestamp limit exceeded for ${providerId}, purging old entries`);
      timestamps = timestamps.slice(-this.MAX_TIMESTAMPS);
    }

    // Check if at limit
    if (timestamps.length >= requestsPerMinute) {
      // Calculate wait time until oldest timestamp expires
      const oldestTimestamp = timestamps[0];
      const waitMs = oldestTimestamp + this.WINDOW_MS - now;

      if (waitMs > 0) {
        const waitSeconds = (waitMs / 1000).toFixed(1);
        console.log(`[RateLimiter] ${providerId} rate limit hit, waiting ${waitSeconds}s`);

        // Warn user if wait time is excessive
        if (waitMs > 60000) { // More than 1 minute
          console.warn(`[RateLimiter] ${providerId} rate limit wait time exceeds 60s (waiting ${waitSeconds}s total)`);
        }

        // Wait until next available slot
        await new Promise(resolve => setTimeout(resolve, waitMs));

        // After waiting, filter out expired timestamps again
        const newNow = Date.now();
        timestamps = timestamps.filter(ts => newNow - ts < this.WINDOW_MS);
      }
    }

    // Add current timestamp AFTER waiting (this records when we proceed, not when we arrived)
    timestamps.push(now);
    this.requests.set(providerId, timestamps);

    console.log(`[RateLimiter] ${providerId} rate limit check passed (${timestamps.length}/${requestsPerMinute} used)`);
  }

  /**
   * Reset rate limit tracking for a specific provider (useful for testing or manual override)
   *
   * @param providerId - The provider to reset
   */
  reset(providerId: string): void {
    this.requests.delete(providerId);
    console.log(`[RateLimiter] Reset rate limit tracking for ${providerId}`);
  }

  /**
   * Get current usage statistics for a provider
   *
   * @param providerId - The provider to query
   * @returns Object with current request count within the window
   */
  getUsage(providerId: string): { count: number; limit: number } {
    const timestamps = this.requests.get(providerId) || [];
    const now = Date.now();
    const validTimestamps = timestamps.filter(ts => now - ts < this.WINDOW_MS);
    return {
      count: validTimestamps.length,
      limit: validTimestamps.length // Limit not tracked here, would need config
    };
  }
}

/**
 * Singleton instance for rate limiting
 * Multiple providers share the same rate limiter with independent tracking
 */
export const rateLimiter = new RateLimiter();

/**
 * Parse rate limit configuration from environment variables
 *
 * @param enabledVar - Environment variable name for enabled flag (e.g., 'GEMINI_RATE_LIMIT_ENABLED')
 * @param limitVar - Environment variable name for requests per minute (e.g., 'GEMINI_RATE_LIMIT_REQUESTS_PER_MINUTE')
 * @param defaultEnabled - Default value for enabled flag
 * @param defaultLimit - Default value for requests per minute
 * @returns RateLimit configuration object
 */
export function parseRateLimitConfig(
  enabledVar: string,
  limitVar: string,
  defaultEnabled: boolean = true,
  defaultLimit: number = 1
): RateLimitConfig {
  // Parse enabled flag
  const enabledRaw = process.env[enabledVar];
  let enabled = defaultEnabled;

  if (enabledRaw !== undefined) {
    enabled = enabledRaw.toLowerCase() === 'true' || enabledRaw === '1';
  }

  // Parse requests per minute
  const limitRaw = process.env[limitVar];
  let requestsPerMinute = defaultLimit;

  if (limitRaw !== undefined) {
    const parsed = parseInt(limitRaw, 10);
    if (isNaN(parsed) || parsed < 0) {
      console.warn(
        `[RateLimiter] Invalid ${limitVar}="${limitRaw}", using default ${defaultLimit}`
      );
      requestsPerMinute = defaultLimit;
    } else {
      requestsPerMinute = parsed;
    }
  }

  return { enabled, requestsPerMinute };
}
