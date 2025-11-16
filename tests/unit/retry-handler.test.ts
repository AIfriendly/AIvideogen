/**
 * Unit tests for RetryHandler
 * Tests AC5: Exponential backoff retry logic
 * Following TEA test-quality.md best practices
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { RetryHandler } from '@/lib/youtube/retry-handler';
import { YouTubeError, YouTubeErrorCode } from '@/lib/youtube/types';

describe('RetryHandler', () => {
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;
  let originalSetTimeout: typeof setTimeout;

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();
    // Mock console
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // Save original setTimeout
    originalSetTimeout = global.setTimeout;
    // Use fake timers for controlled testing
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Restore console
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    // Restore timers
    vi.useRealTimers();
    global.setTimeout = originalSetTimeout;
  });

  describe('Initialization', () => {
    test('should initialize with default parameters', () => {
      // Given/When: Creating handler with defaults
      const handler = new RetryHandler();

      // Then: Should be created with default values
      expect(handler).toBeDefined();
      expect(handler.executeWithRetry).toBeDefined();
    });

    test('should accept custom max retries and base delay', () => {
      // Given/When: Creating handler with custom values
      const handler = new RetryHandler(5, 2000);

      // Then: Should accept custom configuration
      expect(handler).toBeDefined();
    });
  });

  describe('Exponential Backoff Calculation', () => {
    test('should calculate exponential delays correctly', async () => {
      // Given: Handler with known base delay
      const handler = new RetryHandler(3, 1000);
      const delays: number[] = [];

      // Mock operation that always fails
      const operation = vi.fn().mockRejectedValue(
        new YouTubeError(YouTubeErrorCode.NETWORK_ERROR, 'Network error')
      );

      // When: Executing with retries
      const promise = handler.executeWithRetry(operation, 'test operation');

      // Capture delays
      // Attempt 1: immediate
      await vi.runOnlyPendingTimersAsync();

      // Attempt 2: 1000ms delay (1 * 1000)
      await vi.advanceTimersByTimeAsync(1000);

      // Attempt 3: 2000ms delay (2 * 1000)
      await vi.advanceTimersByTimeAsync(2000);

      // Attempt 4: 4000ms delay (4 * 1000)
      await vi.advanceTimersByTimeAsync(4000);

      // Then: Should fail after max retries with exponential delays
      await expect(promise).rejects.toThrow(YouTubeError);
      expect(operation).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    test('should add jitter to delays', async () => {
      // Given: Handler with retries
      const handler = new RetryHandler(2, 1000);

      // Mock Math.random for controlled jitter
      const mathRandomSpy = vi.spyOn(Math, 'random');
      mathRandomSpy.mockReturnValueOnce(0.5); // No jitter
      mathRandomSpy.mockReturnValueOnce(0.9); // +40% jitter
      mathRandomSpy.mockReturnValueOnce(0.1); // -40% jitter

      // Operation that fails twice then succeeds
      let attempt = 0;
      const operation = vi.fn().mockImplementation(() => {
        attempt++;
        if (attempt <= 2) {
          return Promise.reject(new YouTubeError(
            YouTubeErrorCode.NETWORK_ERROR,
            'Network error'
          ));
        }
        return Promise.resolve('success');
      });

      // When: Executing with retries
      const result = await handler.executeWithRetry(operation, 'test');

      // Then: Should succeed with jittered delays
      expect(result).toBe('success');
      expect(mathRandomSpy).toHaveBeenCalled();
    });

    test('should respect maximum retry attempts', async () => {
      // Given: Handler with 2 max retries
      const handler = new RetryHandler(2, 100);

      // Operation that always fails
      const operation = vi.fn().mockRejectedValue(
        new YouTubeError(YouTubeErrorCode.NETWORK_ERROR, 'Network error')
      );

      // When: Executing
      const promise = handler.executeWithRetry(operation, 'test');

      // Fast-forward through all retries
      await vi.runAllTimersAsync();

      // Then: Should stop after max attempts
      await expect(promise).rejects.toThrow(YouTubeError);
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('Retryable Error Detection', () => {
    test('should retry on network errors', async () => {
      // Given: Network error
      const handler = new RetryHandler(2, 100);

      let attempt = 0;
      const operation = vi.fn().mockImplementation(() => {
        attempt++;
        if (attempt === 1) {
          const error = new Error('ECONNRESET');
          (error as any).code = 'ECONNRESET';
          return Promise.reject(error);
        }
        return Promise.resolve('success');
      });

      // When: Executing
      const result = await handler.executeWithRetry(operation, 'test');

      // Then: Should retry and succeed
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    test('should retry on 5xx server errors', async () => {
      // Given: 500 Internal Server Error
      const handler = new RetryHandler(2, 100);

      let attempt = 0;
      const operation = vi.fn().mockImplementation(() => {
        attempt++;
        if (attempt === 1) {
          const error = {
            response: { status: 500 },
            message: 'Internal Server Error'
          };
          return Promise.reject(error);
        }
        return Promise.resolve('success');
      });

      // When: Executing
      vi.useRealTimers(); // Use real timers for this test
      const result = await handler.executeWithRetry(operation, 'test');

      // Then: Should retry and succeed
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    test('should retry on 429 rate limit errors', async () => {
      // Given: 429 Too Many Requests
      const handler = new RetryHandler(2, 100);

      let attempt = 0;
      const operation = vi.fn().mockImplementation(() => {
        attempt++;
        if (attempt === 1) {
          const error = {
            response: { status: 429 },
            message: 'Too Many Requests'
          };
          return Promise.reject(error);
        }
        return Promise.resolve('success');
      });

      // When: Executing
      vi.useRealTimers();
      const result = await handler.executeWithRetry(operation, 'test');

      // Then: Should retry and succeed
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    test('should NOT retry on 4xx client errors (except 429)', async () => {
      // Given: 400 Bad Request
      const handler = new RetryHandler(3, 100);

      const operation = vi.fn().mockRejectedValue({
        response: { status: 400 },
        message: 'Bad Request'
      });

      // When: Executing
      vi.useRealTimers();
      await expect(handler.executeWithRetry(operation, 'test')).rejects.toThrow();

      // Then: Should NOT retry
      expect(operation).toHaveBeenCalledTimes(1);
    });

    test('should NOT retry on quota exceeded errors', async () => {
      // Given: Quota exceeded error
      const handler = new RetryHandler(3, 100);

      const operation = vi.fn().mockRejectedValue(
        new YouTubeError(YouTubeErrorCode.QUOTA_EXCEEDED, 'Quota exceeded')
      );

      // When: Executing
      await expect(handler.executeWithRetry(operation, 'test')).rejects.toThrow();

      // Then: Should NOT retry
      expect(operation).toHaveBeenCalledTimes(1);
    });

    test('should NOT retry on invalid API key errors', async () => {
      // Given: Invalid API key
      const handler = new RetryHandler(3, 100);

      const operation = vi.fn().mockRejectedValue(
        new YouTubeError(YouTubeErrorCode.API_KEY_INVALID, 'Invalid API key')
      );

      // When: Executing
      await expect(handler.executeWithRetry(operation, 'test')).rejects.toThrow();

      // Then: Should NOT retry
      expect(operation).toHaveBeenCalledTimes(1);
    });

    test('should retry on specific YouTube error codes', async () => {
      // Given: Service unavailable error
      const handler = new RetryHandler(2, 100);

      let attempt = 0;
      const operation = vi.fn().mockImplementation(() => {
        attempt++;
        if (attempt === 1) {
          return Promise.reject(
            new YouTubeError(YouTubeErrorCode.SERVICE_UNAVAILABLE, 'Service down')
          );
        }
        return Promise.resolve('success');
      });

      // When: Executing
      vi.useRealTimers();
      const result = await handler.executeWithRetry(operation, 'test');

      // Then: Should retry and succeed
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('Circuit Breaker Pattern', () => {
    test('should open circuit after 5 consecutive failures', async () => {
      // Given: Handler with circuit breaker
      const handler = new RetryHandler(1, 100);

      const operation = vi.fn().mockRejectedValue(
        new YouTubeError(YouTubeErrorCode.NETWORK_ERROR, 'Network error')
      );

      // When: 5 consecutive failures
      vi.useRealTimers();
      for (let i = 0; i < 5; i++) {
        await expect(handler.executeWithRetry(operation, `test ${i}`))
          .rejects.toThrow();
      }

      // Then: Circuit should be open
      await expect(handler.executeWithRetry(operation, 'test 6'))
        .rejects.toThrow('Circuit breaker open');

      // Operation should not be called when circuit is open
      const callsBefore = operation.mock.calls.length;
      await expect(handler.executeWithRetry(operation, 'test 7'))
        .rejects.toThrow('Circuit breaker open');
      expect(operation).toHaveBeenCalledTimes(callsBefore); // No additional call
    });

    test('should close circuit after cooldown period', async () => {
      // Given: Handler with open circuit
      const handler = new RetryHandler(1, 100);

      const operation = vi.fn()
        .mockRejectedValueOnce(new YouTubeError(YouTubeErrorCode.NETWORK_ERROR, 'Error'))
        .mockRejectedValueOnce(new YouTubeError(YouTubeErrorCode.NETWORK_ERROR, 'Error'))
        .mockRejectedValueOnce(new YouTubeError(YouTubeErrorCode.NETWORK_ERROR, 'Error'))
        .mockRejectedValueOnce(new YouTubeError(YouTubeErrorCode.NETWORK_ERROR, 'Error'))
        .mockRejectedValueOnce(new YouTubeError(YouTubeErrorCode.NETWORK_ERROR, 'Error'))
        .mockResolvedValue('success');

      // Open circuit with 5 failures
      vi.useRealTimers();
      for (let i = 0; i < 5; i++) {
        await expect(handler.executeWithRetry(operation, `test ${i}`))
          .rejects.toThrow();
      }

      // Circuit is now open
      await expect(handler.executeWithRetry(operation, 'blocked'))
        .rejects.toThrow('Circuit breaker open');

      // When: Wait for cooldown (60 seconds)
      await new Promise(resolve => setTimeout(resolve, 61000));

      // Then: Circuit should close and allow requests
      const result = await handler.executeWithRetry(operation, 'after cooldown');
      expect(result).toBe('success');
    });

    test('should reset consecutive failures on success', async () => {
      // Given: Handler
      const handler = new RetryHandler(1, 100);

      // Some failures followed by success
      const operation = vi.fn()
        .mockRejectedValueOnce(new YouTubeError(YouTubeErrorCode.NETWORK_ERROR, 'Error'))
        .mockRejectedValueOnce(new YouTubeError(YouTubeErrorCode.NETWORK_ERROR, 'Error'))
        .mockResolvedValueOnce('success')
        .mockRejectedValueOnce(new YouTubeError(YouTubeErrorCode.NETWORK_ERROR, 'Error'))
        .mockResolvedValueOnce('success');

      // When: Mixed success and failures
      vi.useRealTimers();
      await expect(handler.executeWithRetry(operation, 'fail 1')).rejects.toThrow();
      await expect(handler.executeWithRetry(operation, 'fail 2')).rejects.toThrow();
      await expect(handler.executeWithRetry(operation, 'success')).resolves.toBe('success');
      await expect(handler.executeWithRetry(operation, 'fail 3')).rejects.toThrow();
      await expect(handler.executeWithRetry(operation, 'success 2')).resolves.toBe('success');

      // Then: Circuit should not open (failures were not consecutive)
      const finalOp = vi.fn().mockResolvedValue('final');
      await expect(handler.executeWithRetry(finalOp, 'final')).resolves.toBe('final');
      expect(finalOp).toHaveBeenCalled();
    });

    test('should include circuit breaker status in error message', async () => {
      // Given: Open circuit
      const handler = new RetryHandler(1, 100);

      const operation = vi.fn().mockRejectedValue(
        new YouTubeError(YouTubeErrorCode.NETWORK_ERROR, 'Error')
      );

      // Open circuit
      vi.useRealTimers();
      for (let i = 0; i < 5; i++) {
        await expect(handler.executeWithRetry(operation, `test ${i}`))
          .rejects.toThrow();
      }

      // When: Attempting with open circuit
      try {
        await handler.executeWithRetry(operation, 'test');
        expect.fail('Should have thrown');
      } catch (error) {
        // Then: Error message should indicate circuit breaker
        expect(error).toBeInstanceOf(YouTubeError);
        expect((error as YouTubeError).message).toContain('Circuit breaker open');
        expect((error as YouTubeError).message).toContain('Try again in');
      }
    });
  });

  describe('Retry Logging', () => {
    test('should log retry attempts with context', async () => {
      // Given: Handler with retries
      const handler = new RetryHandler(2, 100);

      let attempt = 0;
      const operation = vi.fn().mockImplementation(() => {
        attempt++;
        if (attempt <= 2) {
          return Promise.reject(new YouTubeError(
            YouTubeErrorCode.NETWORK_ERROR,
            'Network error'
          ));
        }
        return Promise.resolve('success');
      });

      // When: Executing with retries
      vi.useRealTimers();
      await handler.executeWithRetry(operation, 'test context');

      // Then: Should log each retry
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Retry attempt'),
        expect.stringContaining('test context')
      );
    });

    test('should log final failure with all attempts', async () => {
      // Given: Operation that always fails
      const handler = new RetryHandler(2, 100);

      const operation = vi.fn().mockRejectedValue(
        new YouTubeError(YouTubeErrorCode.NETWORK_ERROR, 'Network error')
      );

      // When: Executing until failure
      vi.useRealTimers();
      await expect(handler.executeWithRetry(operation, 'test')).rejects.toThrow();

      // Then: Should log circuit breaker opening
      const errorLogs = consoleErrorSpy.mock.calls;
      const circuitBreakerLog = errorLogs.find((call: any[]) =>
        call[0].includes('consecutive failures')
      );
      // Circuit breaker opens after 5 consecutive failures
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    test('should include error details in retry logs', async () => {
      // Given: Detailed error
      const handler = new RetryHandler(1, 100);

      const operation = vi.fn()
        .mockRejectedValueOnce({
          response: { status: 503 },
          message: 'Service temporarily unavailable'
        })
        .mockResolvedValue('success');

      // When: Retrying
      vi.useRealTimers();
      await handler.executeWithRetry(operation, 'test operation');

      // Then: Should log error details
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Retry attempt'),
        expect.stringContaining('Service temporarily unavailable')
      );
    });
  });

  describe('Error Context', () => {
    test('should include retry history in final error', async () => {
      // Given: Operation that fails
      const handler = new RetryHandler(2, 100);

      const operation = vi.fn().mockRejectedValue(
        new YouTubeError(YouTubeErrorCode.NETWORK_ERROR, 'Network error')
      );

      // When: All retries exhausted
      vi.useRealTimers();
      try {
        await handler.executeWithRetry(operation, 'test operation');
        expect.fail('Should have thrown');
      } catch (error) {
        // Then: Error should include context
        expect(error).toBeInstanceOf(YouTubeError);
        const ytError = error as YouTubeError;
        expect(ytError.message).toContain('Failed after');
        expect(ytError.message).toContain('attempts');
        expect(ytError.context).toBeDefined();
        expect(ytError.context?.attempts).toBeDefined();
      }
    });

    test('should include operation context in error', async () => {
      // Given: Named operation
      const handler = new RetryHandler(1, 100);

      const operation = vi.fn().mockRejectedValue(
        new YouTubeError(YouTubeErrorCode.NETWORK_ERROR, 'Network error')
      );

      // When: Operation fails
      vi.useRealTimers();
      try {
        await handler.executeWithRetry(operation, 'YouTube search: test query');
        expect.fail('Should have thrown');
      } catch (error) {
        // Then: Context should be in error
        expect((error as YouTubeError).message).toContain('YouTube search: test query');
      }
    });
  });

  describe('Success Cases', () => {
    test('should return result on immediate success', async () => {
      // Given: Successful operation
      const handler = new RetryHandler();

      const operation = vi.fn().mockResolvedValue({ data: 'result' });

      // When: Executing
      const result = await handler.executeWithRetry(operation, 'test');

      // Then: Should return result without retry
      expect(result).toEqual({ data: 'result' });
      expect(operation).toHaveBeenCalledTimes(1);
    });

    test('should return result after successful retry', async () => {
      // Given: Operation that succeeds on retry
      const handler = new RetryHandler(3, 100);

      let attempt = 0;
      const operation = vi.fn().mockImplementation(() => {
        attempt++;
        if (attempt === 1) {
          return Promise.reject(new YouTubeError(
            YouTubeErrorCode.NETWORK_ERROR,
            'Temporary error'
          ));
        }
        return Promise.resolve({ success: true });
      });

      // When: Executing
      vi.useRealTimers();
      const result = await handler.executeWithRetry(operation, 'test');

      // Then: Should return successful result
      expect(result).toEqual({ success: true });
      expect(operation).toHaveBeenCalledTimes(2);
    });

    test('should reset failure count on success', async () => {
      // Given: Handler tracking failures
      const handler = new RetryHandler(1, 100);

      const failOp = vi.fn().mockRejectedValue(
        new YouTubeError(YouTubeErrorCode.NETWORK_ERROR, 'Error')
      );

      const successOp = vi.fn().mockResolvedValue('success');

      // When: Some failures then success
      vi.useRealTimers();
      await expect(handler.executeWithRetry(failOp, 'fail 1')).rejects.toThrow();
      await expect(handler.executeWithRetry(failOp, 'fail 2')).rejects.toThrow();
      await expect(handler.executeWithRetry(successOp, 'success')).resolves.toBe('success');

      // Then: Failure count should reset
      // Next failures should start counting from 0
      await expect(handler.executeWithRetry(failOp, 'fail 3')).rejects.toThrow();
      await expect(handler.executeWithRetry(failOp, 'fail 4')).rejects.toThrow();

      // Circuit should not be open yet (only 4 total, not 5 consecutive)
      const testOp = vi.fn().mockResolvedValue('test');
      await expect(handler.executeWithRetry(testOp, 'test')).resolves.toBe('test');
      expect(testOp).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero max retries', async () => {
      // Given: No retries allowed
      const handler = new RetryHandler(0, 1000);

      const operation = vi.fn().mockRejectedValue(
        new YouTubeError(YouTubeErrorCode.NETWORK_ERROR, 'Error')
      );

      // When: Executing
      await expect(handler.executeWithRetry(operation, 'test')).rejects.toThrow();

      // Then: Should fail immediately without retry
      expect(operation).toHaveBeenCalledTimes(1);
    });

    test('should handle very large max retries', async () => {
      // Given: Many retries allowed
      const handler = new RetryHandler(10, 10);

      let attempt = 0;
      const operation = vi.fn().mockImplementation(() => {
        attempt++;
        if (attempt === 5) {
          return Promise.resolve('success');
        }
        return Promise.reject(new YouTubeError(
          YouTubeErrorCode.NETWORK_ERROR,
          'Error'
        ));
      });

      // When: Executing
      vi.useRealTimers();
      const result = await handler.executeWithRetry(operation, 'test');

      // Then: Should succeed after several attempts
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(5);
    });

    test('should handle synchronous exceptions', async () => {
      // Given: Operation that throws synchronously
      const handler = new RetryHandler(2, 100);

      let attempt = 0;
      const operation = vi.fn().mockImplementation(() => {
        attempt++;
        if (attempt === 1) {
          throw new Error('Sync error');
        }
        return Promise.resolve('success');
      });

      // When: Executing
      vi.useRealTimers();
      const result = await handler.executeWithRetry(operation, 'test');

      // Then: Should retry and succeed
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    test('should handle undefined errors gracefully', async () => {
      // Given: Undefined error
      const handler = new RetryHandler(1, 100);

      const operation = vi.fn().mockRejectedValue(undefined);

      // When: Executing
      vi.useRealTimers();
      await expect(handler.executeWithRetry(operation, 'test')).rejects.toBeUndefined();

      // Then: Should not retry undefined (not retryable)
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });
});