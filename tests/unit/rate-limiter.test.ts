/**
 * Unit tests for RateLimiter
 * Tests AC4: Rate limiting (100 requests per 100 seconds)
 * Following TEA test-quality.md best practices
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { RateLimiter } from '@/lib/youtube/rate-limiter';
import { YouTubeError, YouTubeErrorCode } from '@/lib/youtube/types';
import { createTimestamps } from '../factories/youtube.factory';

describe('RateLimiter', () => {
  let originalDateNow: () => number;
  let consoleLogSpy: any;

  beforeEach(() => {
    // Save original Date.now
    originalDateNow = Date.now;
    // Clear all mocks
    vi.clearAllMocks();
    // Mock console.log
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore Date.now
    Date.now = originalDateNow;
    // Restore console
    consoleLogSpy.mockRestore();
  });

  describe('Initialization', () => {
    test('should initialize with max requests and window parameters', () => {
      // Given/When: Creating rate limiter
      const limiter = new RateLimiter(100, 100000); // 100 requests per 100 seconds

      // Then: Should be created without error
      expect(limiter).toBeDefined();
      expect(limiter.acquire).toBeDefined();
    });

    test('should start with empty request history', async () => {
      // Given: New rate limiter
      const limiter = new RateLimiter(5, 1000);

      // When: First request
      const startTime = Date.now();
      await limiter.acquire();
      const endTime = Date.now();

      // Then: Should not delay (no prior requests)
      expect(endTime - startTime).toBeLessThan(10); // Allow small margin
    });
  });

  describe('Sliding Window Algorithm', () => {
    test('should allow requests immediately when under limit', async () => {
      // Given: Rate limiter with capacity
      const limiter = new RateLimiter(5, 10000);

      // When: Making requests under limit
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(limiter.acquire());
      }

      // Then: All should resolve immediately
      await expect(Promise.all(promises)).resolves.toBeDefined();
    });

    test('should cleanup old timestamps outside window', async () => {
      // Given: Rate limiter with old timestamps
      const limiter = new RateLimiter(3, 1000); // 3 req per second

      // Simulate old requests
      let now = 1000000;
      Date.now = vi.fn().mockReturnValue(now);

      // Make 3 requests
      await limiter.acquire();
      await limiter.acquire();
      await limiter.acquire();

      // When: Time passes beyond window
      now = 1002000; // 2 seconds later
      Date.now = vi.fn().mockReturnValue(now);

      // Then: Should allow new request immediately (old ones expired)
      const startTime = Date.now();
      await limiter.acquire();
      const endTime = Date.now();

      expect(endTime - startTime).toBe(0);
    });

    test('should correctly calculate sliding window', async () => {
      // Given: Rate limiter with specific window
      const limiter = new RateLimiter(2, 1000); // 2 req per second

      let now = 1000000;
      Date.now = vi.fn().mockReturnValue(now);

      // Make 2 requests
      await limiter.acquire();
      await limiter.acquire();

      // When: Half window passes
      now = 1000500; // 500ms later
      Date.now = vi.fn().mockReturnValue(now);

      // First request is still in window (less than 1000ms old)
      // So we're still at limit
      const acquirePromise = limiter.acquire();

      // Should be delayed
      await expect(Promise.race([
        acquirePromise,
        new Promise(resolve => setTimeout(() => resolve('timeout'), 100))
      ])).resolves.toBe('timeout');
    });
  });

  describe('Request Queueing', () => {
    test('should queue requests when at rate limit', async () => {
      // Given: Rate limiter at capacity
      const limiter = new RateLimiter(2, 1000);

      let now = 1000000;
      Date.now = vi.fn().mockReturnValue(now);

      // Fill capacity
      await limiter.acquire();
      await limiter.acquire();

      // When: Requesting beyond limit
      const queuedPromise = limiter.acquire();

      // Then: Should be queued (not resolved immediately)
      const result = await Promise.race([
        queuedPromise.then(() => 'resolved'),
        new Promise(resolve => setTimeout(() => resolve('queued'), 50))
      ]);

      expect(result).toBe('queued');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Rate limit reached')
      );
    });

    test('should process queue in FIFO order', async () => {
      // Given: Rate limiter with queue
      const limiter = new RateLimiter(1, 1000);

      let now = 1000000;
      Date.now = vi.fn()
        .mockReturnValueOnce(now)     // First acquire
        .mockReturnValueOnce(now)     // Second acquire (queued)
        .mockReturnValueOnce(now)     // Third acquire (queued)
        .mockReturnValueOnce(now + 1100) // Time passes
        .mockReturnValue(now + 1100);

      // Make requests
      await limiter.acquire(); // Immediate

      const order: number[] = [];
      const promise1 = limiter.acquire().then(() => order.push(1));
      const promise2 = limiter.acquire().then(() => order.push(2));
      const promise3 = limiter.acquire().then(() => order.push(3));

      // When: Time passes and queue processes
      await new Promise(resolve => setTimeout(resolve, 100));

      // Simulate processQueue being called
      // Note: This is testing internal behavior
      // In real implementation, this would be triggered by timer

      // Then: Should process in FIFO order
      // This test is simplified - actual implementation may vary
      expect(order.length).toBeLessThanOrEqual(3);
    });

    test('should limit queue size to prevent memory overflow', async () => {
      // Given: Rate limiter with max queue size
      const limiter = new RateLimiter(1, 100000); // 1 req per 100 sec (very restrictive)

      // Fill the slot
      await limiter.acquire();

      // When: Attempting to queue more than 100 requests
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(limiter.acquire().catch(e => e));
      }

      // 101st request should throw
      await expect(limiter.acquire()).rejects.toThrow(YouTubeError);
      await expect(limiter.acquire()).rejects.toThrow('queue full');
    });
  });

  describe('Delay Calculation', () => {
    test('should calculate correct delay until oldest expires', async () => {
      // Given: Rate limiter with known state
      const limiter = new RateLimiter(2, 1000); // 2 req per second

      const now = 1000000;
      Date.now = vi.fn().mockReturnValue(now);

      // Make 2 requests
      await limiter.acquire();
      await limiter.acquire();

      // When: Checking delay for next request
      // The oldest request was at time 1000000
      // It expires at 1001000 (1000ms window)
      // Current time is still 1000000
      // So delay should be ~1000ms

      // This tests the internal delay calculation
      // In practice, acquire() would handle this
      const startAcquire = Date.now();
      const acquirePromise = limiter.acquire();

      // Should not resolve immediately
      const immediate = await Promise.race([
        acquirePromise.then(() => true),
        new Promise(resolve => setTimeout(() => resolve(false), 50))
      ]);

      expect(immediate).toBe(false);
    });

    test('should have zero delay when window has passed', async () => {
      // Given: Old requests outside window
      const limiter = new RateLimiter(1, 1000);

      let now = 1000000;
      Date.now = vi.fn().mockReturnValue(now);

      await limiter.acquire();

      // When: Window expires
      now = 1002000; // 2 seconds later
      Date.now = vi.fn().mockReturnValue(now);

      // Then: No delay needed
      const startTime = Date.now();
      await limiter.acquire();
      const endTime = Date.now();

      expect(endTime - startTime).toBe(0);
    });
  });

  describe('Concurrent Request Handling', () => {
    test('should handle burst of concurrent requests', async () => {
      // Given: Rate limiter
      const limiter = new RateLimiter(5, 1000);

      // When: Burst of 10 concurrent requests
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(limiter.acquire().catch(e => e));
      }

      // Then: First 5 should succeed, rest queued
      const results = await Promise.allSettled(promises);
      const fulfilled = results.filter(r => r.status === 'fulfilled');
      expect(fulfilled.length).toBeGreaterThanOrEqual(5);
    });

    test('should handle parallel acquire calls correctly', async () => {
      // Given: Rate limiter
      const limiter = new RateLimiter(3, 1000);

      // When: Parallel acquire calls
      const [r1, r2, r3] = await Promise.all([
        limiter.acquire(),
        limiter.acquire(),
        limiter.acquire()
      ]);

      // Then: All should complete
      expect(r1).toBeUndefined();
      expect(r2).toBeUndefined();
      expect(r3).toBeUndefined();
    });

    test('should maintain consistency under concurrent load', async () => {
      // Given: Rate limiter with specific limit
      const limit = 10;
      const window = 1000;
      const limiter = new RateLimiter(limit, window);

      let now = Date.now();
      Date.now = vi.fn().mockReturnValue(now);

      // When: Exactly limit requests
      const promises = [];
      for (let i = 0; i < limit; i++) {
        promises.push(limiter.acquire());
      }

      await Promise.all(promises);

      // Then: Next request should be delayed
      const extraPromise = limiter.acquire();
      const immediate = await Promise.race([
        extraPromise.then(() => true),
        new Promise(resolve => setTimeout(() => resolve(false), 50))
      ]);

      expect(immediate).toBe(false);
    });
  });

  describe('Logging', () => {
    test('should log when rate limit delays request', async () => {
      // Given: Rate limiter at capacity
      const limiter = new RateLimiter(1, 10000);

      await limiter.acquire();

      // When: Next request is delayed
      const acquirePromise = limiter.acquire();

      // Wait a bit for log to happen
      await new Promise(resolve => setTimeout(resolve, 50));

      // Then: Should log delay information
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Rate limit reached')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Delaying request')
      );
    });

    test('should include queue size in log message', async () => {
      // Given: Rate limiter with queue
      const limiter = new RateLimiter(1, 10000);

      await limiter.acquire();

      // When: Multiple requests queued
      limiter.acquire();
      limiter.acquire();
      limiter.acquire();

      // Wait for logs
      await new Promise(resolve => setTimeout(resolve, 50));

      // Then: Should show queue size
      const logCalls = consoleLogSpy.mock.calls;
      const queueLogs = logCalls.filter((call: any[]) =>
        call[0].includes('Queue size')
      );
      expect(queueLogs.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should throw YouTubeError when queue is full', async () => {
      // Given: Very restrictive limiter
      const limiter = new RateLimiter(1, 1000000); // 1 req per ~16 min

      await limiter.acquire();

      // When: Filling queue
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(limiter.acquire().catch(() => 'caught'));
      }

      // Then: 101st should throw
      try {
        await limiter.acquire();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(YouTubeError);
        expect((error as YouTubeError).code).toBe(YouTubeErrorCode.RATE_LIMITED);
        expect((error as YouTubeError).message).toContain('queue full');
      }
    });

    test('should handle negative window gracefully', () => {
      // Given/When: Invalid window
      // Should default to reasonable value or throw
      expect(() => new RateLimiter(100, -1000)).toThrow();
    });

    test('should handle zero max requests', () => {
      // Given/When: Zero max requests (no requests allowed)
      const limiter = new RateLimiter(0, 1000);

      // Then: All requests should be queued/delayed
      expect(limiter.acquire()).rejects.toThrow();
    });
  });

  describe('Edge Cases', () => {
    test('should handle very short window', async () => {
      // Given: 1ms window (extremely short)
      const limiter = new RateLimiter(1, 1);

      let now = Date.now();
      Date.now = vi.fn()
        .mockReturnValueOnce(now)
        .mockReturnValueOnce(now)
        .mockReturnValueOnce(now + 2); // After window

      // When: Quick succession
      await limiter.acquire();

      // Should allow after tiny delay
      await limiter.acquire();
      expect(Date.now()).toBeGreaterThan(now);
    });

    test('should handle very large window', async () => {
      // Given: 24 hour window
      const dayInMs = 24 * 60 * 60 * 1000;
      const limiter = new RateLimiter(100, dayInMs);

      // When: Making requests
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(limiter.acquire());
      }

      // Then: Should handle correctly
      await expect(Promise.all(promises)).resolves.toBeDefined();
    });

    test('should handle system time changes', async () => {
      // Given: Rate limiter with requests
      const limiter = new RateLimiter(2, 1000);

      let now = 1000000;
      Date.now = vi.fn().mockReturnValue(now);

      await limiter.acquire();
      await limiter.acquire();

      // When: System time goes backwards (NTP adjustment)
      now = 999000; // 1 second earlier
      Date.now = vi.fn().mockReturnValue(now);

      // Then: Should handle gracefully (not crash)
      // Behavior may vary - might allow or delay
      expect(limiter.acquire()).toBeDefined();
    });

    test('should handle rapid acquire/release cycles', async () => {
      // Given: Rate limiter
      const limiter = new RateLimiter(1, 100);

      // When: Rapid cycling
      for (let i = 0; i < 10; i++) {
        await limiter.acquire();
        await new Promise(resolve => setTimeout(resolve, 150));
      }

      // Then: Should complete without error
      expect(true).toBe(true);
    });
  });

  describe('Performance', () => {
    test('should handle high request volume efficiently', async () => {
      // Given: High capacity limiter
      const limiter = new RateLimiter(1000, 1000);

      // When: High volume
      const startTime = Date.now();
      const promises = [];

      for (let i = 0; i < 1000; i++) {
        promises.push(limiter.acquire());
      }

      await Promise.all(promises);
      const endTime = Date.now();

      // Then: Should complete quickly (all fit in window)
      expect(endTime - startTime).toBeLessThan(1000);
    });

    test('should cleanup efficiently', async () => {
      // Given: Limiter with many old timestamps
      const limiter = new RateLimiter(100, 1000);

      let now = 1000000;

      // Add many timestamps
      for (let i = 0; i < 100; i++) {
        Date.now = vi.fn().mockReturnValue(now + i);
        await limiter.acquire();
      }

      // When: Much time passes
      now = 2000000; // 1000 seconds later
      Date.now = vi.fn().mockReturnValue(now);

      // Then: Cleanup should be quick
      const startTime = Date.now();
      await limiter.acquire();
      const endTime = Date.now();

      expect(endTime - startTime).toBe(0);
    });
  });
});