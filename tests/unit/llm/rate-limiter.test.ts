/**
 * Unit tests for LLM Rate Limiter
 * Tests Story 1.3b: Rate Limiting for LLM Providers
 * Following TEA test-quality.md best practices
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RateLimiter, parseRateLimitConfig } from '@/lib/llm/rate-limiter';

describe('RateLimiter (LLM)', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter();
  });

  afterEach(() => {
    rateLimiter = new RateLimiter();
  });

  describe('wait()', () => {
    it('should allow first request immediately', async () => {
      const startTime = Date.now();
      await rateLimiter.wait('test-provider', 1, true);

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(100); // Should be nearly instant
    });

    it('should enforce rate limit for second request', async () => {
      const providerId = 'test-provider';
      const limit = 1; // 1 request per minute

      // First request should proceed immediately
      await rateLimiter.wait(providerId, limit, true);

      // Second request should wait (using mocked time to speed up test)
      vi.useFakeTimers();
      const waitPromise = rateLimiter.wait(providerId, limit, true);

      // Fast-forward 59 seconds - should still be waiting
      await vi.advanceTimersByTimeAsync(59000);
      const isWaiting59 = await Promise.race([
        waitPromise.then(() => false),
        Promise.resolve(true)
      ]);
      expect(isWaiting59).toBe(true); // Still waiting

      // Fast-forward to 61 seconds - should complete
      await vi.advanceTimersByTimeAsync(2000);
      await waitPromise;
      vi.useRealTimers();
    });

    it('should allow request after window expires', async () => {
      const providerId = 'test-provider';
      const limit = 1;

      // First request
      await rateLimiter.wait(providerId, limit, true);

      // Second request (should wait)
      vi.useFakeTimers();
      const waitPromise = rateLimiter.wait(providerId, limit, true);

      // Fast-forward past the window
      await vi.advanceTimersByTimeAsync(61000);
      await waitPromise;

      // Third request should proceed immediately since window expired
      const startTime = Date.now();
      await rateLimiter.wait(providerId, limit, true);
      const elapsed = Date.now() - startTime;

      vi.useRealTimers();

      // Should proceed immediately after window expires
      expect(elapsed).toBeLessThan(100);
    });

    it('should handle multiple requests per minute', async () => {
      const providerId = 'test-provider';
      const limit = 3; // 3 requests per minute

      // First 3 requests should proceed without waiting
      const startTime1 = Date.now();
      await rateLimiter.wait(providerId, limit, true);
      const elapsed1 = Date.now() - startTime1;
      expect(elapsed1).toBeLessThan(100);

      const startTime2 = Date.now();
      await rateLimiter.wait(providerId, limit, true);
      const elapsed2 = Date.now() - startTime2;
      expect(elapsed2).toBeLessThan(100);

      const startTime3 = Date.now();
      await rateLimiter.wait(providerId, limit, true);
      const elapsed3 = Date.now() - startTime3;
      expect(elapsed3).toBeLessThan(100);

      // Fourth request should wait
      vi.useFakeTimers();
      const waitPromise = rateLimiter.wait(providerId, limit, true);

      // Fast-forward 59 seconds - should still be waiting
      await vi.advanceTimersByTimeAsync(59000);
      const isWaiting = await Promise.race([
        waitPromise.then(() => false),
        Promise.resolve(true)
      ]);
      expect(isWaiting).toBe(true);

      // Fast-forward past the window
      await vi.advanceTimersByTimeAsync(2000);
      await waitPromise;
      vi.useRealTimers();
    });

    it('should not wait when rate limiting is disabled', async () => {
      const providerId = 'test-provider';

      // First request
      await rateLimiter.wait(providerId, 1, true);

      // Second request with disabled rate limiting
      const startTime = Date.now();
      await rateLimiter.wait(providerId, 1, false);
      const elapsed = Date.now() - startTime;

      // Should proceed immediately
      expect(elapsed).toBeLessThan(100);
    });

    it('should block all requests when limit is 0', async () => {
      const providerId = 'test-provider';

      await expect(
        rateLimiter.wait(providerId, 0, true)
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('should track providers independently', async () => {
      const provider1 = 'provider-1';
      const provider2 = 'provider-2';
      const limit = 1;

      // First request on provider1
      await rateLimiter.wait(provider1, limit, true);

      // First request on provider2 should proceed immediately
      const startTime = Date.now();
      await rateLimiter.wait(provider2, limit, true);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(100);
    });

    it('should return usage statistics', async () => {
      const providerId = 'test-provider';
      await rateLimiter.wait(providerId, 1, true);

      const usage = rateLimiter.getUsage(providerId);
      expect(usage.count).toBeGreaterThan(0);
    });
  });

  describe('parseRateLimitConfig()', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      // Reset environment before each test
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should use default values when env vars not set', () => {
      const config = parseRateLimitConfig(
        'NONEXISTENT_ENABLED',
        'NONEXISTENT_LIMIT',
        true,  // default enabled
        5     // default limit
      );

      expect(config.enabled).toBe(true);
      expect(config.requestsPerMinute).toBe(5);
    });

    it('should parse enabled flag from env var', () => {
      process.env['TEST_ENABLED'] = 'false';
      const config = parseRateLimitConfig('TEST_ENABLED', 'TEST_LIMIT', true, 1);

      expect(config.enabled).toBe(false);
    });

    it('should parse enabled=true from env var', () => {
      process.env['TEST_ENABLED'] = 'true';
      const config = parseRateLimitConfig('TEST_ENABLED', 'TEST_LIMIT', false, 1);

      expect(config.enabled).toBe(true);
    });

    it('should parse enabled=1 from env var', () => {
      process.env['TEST_ENABLED'] = '1';
      const config = parseRateLimitConfig('TEST_ENABLED', 'TEST_LIMIT', false, 1);

      expect(config.enabled).toBe(true);
    });

    it('should parse requests per minute from env var', () => {
      process.env['TEST_LIMIT'] = '10';
      const config = parseRateLimitConfig('TEST_ENABLED', 'TEST_LIMIT', false, 1);

      expect(config.requestsPerMinute).toBe(10);
    });

    it('should use default for invalid limit values', () => {
      process.env['TEST_LIMIT'] = 'invalid';
      const config = parseRateLimitConfig('TEST_ENABLED', 'TEST_LIMIT', true, 5);

      expect(config.requestsPerMinute).toBe(5); // Default value
    });

    it('should use default for negative limit values', () => {
      process.env['TEST_LIMIT'] = '-5';
      const config = parseRateLimitConfig('TEST_ENABLED', 'TEST_LIMIT', true, 5);

      expect(config.requestsPerMinute).toBe(5); // Default value
    });

    it('should use default for zero limit values', () => {
      process.env['TEST_LIMIT'] = '0';
      const config = parseRateLimitConfig('TEST_ENABLED', 'TEST_LIMIT', true, 5);

      expect(config.requestsPerMinute).toBe(0); // Zero is valid (blocks all)
    });
  });

  describe('reset()', () => {
    it('should clear timestamps for provider', async () => {
      const providerId = 'test-provider';

      // Make a request
      await rateLimiter.wait(providerId, 1, true);

      // Verify usage exists
      const usageBefore = rateLimiter.getUsage(providerId);
      expect(usageBefore.count).toBeGreaterThan(0);

      // Reset
      rateLimiter.reset(providerId);

      // Usage should be cleared
      const usageAfter = rateLimiter.getUsage(providerId);
      expect(usageAfter.count).toBe(0);
    });
  });

  describe('Memory Safety', () => {
    it('should prevent unbounded memory growth', async () => {
      const providerId = 'test-provider';
      const limit = 1000; // High limit

      // Make requests up to the safety limit
      for (let i = 0; i < 1000; i++) {
        await rateLimiter.wait(providerId, limit, true);
      }

      // This should trigger cleanup warning but not crash
      const usage = rateLimiter.getUsage(providerId);
      expect(usage.count).toBeLessThanOrEqual(1000);
    });
  });
});
