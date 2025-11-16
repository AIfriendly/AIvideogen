/**
 * Unit tests for YouTubeLogger
 * Tests AC7: Logging system for debugging
 * Following TEA test-quality.md best practices
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { YouTubeLogger } from '@/lib/youtube/logger';
import { YouTubeError, YouTubeErrorCode } from '@/lib/youtube/types';
import { createQuotaUsage } from '../factories/youtube.factory';

describe('YouTubeLogger', () => {
  let logger: YouTubeLogger;
  let consoleLogSpy: any;
  let consoleInfoSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;
  let consoleDebugSpy: any;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    // Clear all mocks
    vi.clearAllMocks();
    // Mock console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    // Create logger instance
    logger = new YouTubeLogger();
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
    // Restore console
    consoleLogSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleDebugSpy.mockRestore();
  });

  describe('Structured JSON Logging', () => {
    test('should log in JSON format', () => {
      // Given: Logger
      // When: Logging a message
      logger.info('Test message', { key: 'value' });

      // Then: Should output JSON
      expect(consoleInfoSpy).toHaveBeenCalled();
      const logCall = consoleInfoSpy.mock.calls[0][0];
      expect(() => JSON.parse(logCall)).not.toThrow();

      const parsed = JSON.parse(logCall);
      expect(parsed).toHaveProperty('timestamp');
      expect(parsed).toHaveProperty('level', 'INFO');
      expect(parsed).toHaveProperty('message', 'Test message');
      expect(parsed).toHaveProperty('context');
      expect(parsed.context).toHaveProperty('key', 'value');
    });

    test('should include timestamp in ISO format', () => {
      // Given: Logger
      // When: Logging
      logger.info('Test');

      // Then: Should have ISO timestamp
      const logCall = consoleInfoSpy.mock.calls[0][0];
      const parsed = JSON.parse(logCall);
      expect(parsed.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(new Date(parsed.timestamp)).toBeInstanceOf(Date);
    });

    test('should include correct log level', () => {
      // Given: Logger
      // When: Logging at different levels
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message', new Error('test'));

      // Then: Each should have correct level
      const debugLog = JSON.parse(consoleDebugSpy.mock.calls[0][0]);
      const infoLog = JSON.parse(consoleInfoSpy.mock.calls[0][0]);
      const warnLog = JSON.parse(consoleWarnSpy.mock.calls[0][0]);
      const errorLog = JSON.parse(consoleErrorSpy.mock.calls[0][0]);

      expect(debugLog.level).toBe('DEBUG');
      expect(infoLog.level).toBe('INFO');
      expect(warnLog.level).toBe('WARN');
      expect(errorLog.level).toBe('ERROR');
    });

    test('should format context as nested JSON', () => {
      // Given: Complex context
      const context = {
        query: 'test query',
        options: {
          maxResults: 10,
          order: 'relevance'
        },
        quotaUsage: {
          used: 100,
          limit: 10000
        }
      };

      // When: Logging with complex context
      logger.info('Complex context', context);

      // Then: Should preserve structure
      const parsed = JSON.parse(consoleInfoSpy.mock.calls[0][0]);
      expect(parsed.context).toEqual(context);
      expect(parsed.context.options.maxResults).toBe(10);
    });
  });

  describe('Request Logging', () => {
    test('should log API request details', () => {
      // Given: Request context
      const requestContext = {
        method: 'GET',
        endpoint: '/search',
        query: 'test video',
        maxResults: 25,
        quotaCost: 100
      };

      // When: Logging request
      logger.debug('YouTube search request', requestContext);

      // Then: Should include all request details
      const parsed = JSON.parse(consoleDebugSpy.mock.calls[0][0]);
      expect(parsed.message).toBe('YouTube search request');
      expect(parsed.context.method).toBe('GET');
      expect(parsed.context.endpoint).toBe('/search');
      expect(parsed.context.query).toBe('test video');
      expect(parsed.context.maxResults).toBe(25);
      expect(parsed.context.quotaCost).toBe(100);
    });

    test('should log response details', () => {
      // Given: Response context
      const responseContext = {
        query: 'test',
        resultCount: 10,
        duration: 234,
        quotaUsed: 100
      };

      // When: Logging response
      logger.info('YouTube search completed', responseContext);

      // Then: Should include response details
      const parsed = JSON.parse(consoleInfoSpy.mock.calls[0][0]);
      expect(parsed.context.resultCount).toBe(10);
      expect(parsed.context.duration).toBe(234);
      expect(parsed.context.quotaUsed).toBe(100);
    });

    test('should generate request ID for tracing', () => {
      // Given: Logger with request ID generation
      const requestId = logger.generateRequestId();

      // When: Logging with request ID
      logger.info('Request start', { requestId });
      logger.info('Request end', { requestId });

      // Then: Both logs should have same request ID
      const log1 = JSON.parse(consoleInfoSpy.mock.calls[0][0]);
      const log2 = JSON.parse(consoleInfoSpy.mock.calls[1][0]);
      expect(log1.context.requestId).toBe(requestId);
      expect(log2.context.requestId).toBe(requestId);
      expect(requestId).toMatch(/^[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}$/);
    });
  });

  describe('Quota Usage Logging', () => {
    test('should log quota usage after requests', () => {
      // Given: Quota usage
      const quotaUsage = createQuotaUsage({
        used: 5000,
        limit: 10000
      });

      // When: Logging quota
      logger.info('Quota status', { quotaUsage });

      // Then: Should include quota details
      const parsed = JSON.parse(consoleInfoSpy.mock.calls[0][0]);
      expect(parsed.context.quotaUsage.used).toBe(5000);
      expect(parsed.context.quotaUsage.limit).toBe(10000);
      expect(parsed.context.quotaUsage.remaining).toBe(5000);
    });

    test('should warn when quota is high', () => {
      // Given: High quota usage
      const quotaUsage = createQuotaUsage({
        used: 8500,
        limit: 10000
      });

      // When: Logging high quota
      logger.warn('Quota usage high', { quotaUsage, percentage: 85 });

      // Then: Should use warn level
      const parsed = JSON.parse(consoleWarnSpy.mock.calls[0][0]);
      expect(parsed.level).toBe('WARN');
      expect(parsed.context.percentage).toBe(85);
    });

    test('should include reset time in quota logs', () => {
      // Given: Quota with reset time
      const resetTime = new Date('2025-11-16T08:00:00Z');
      const quotaUsage = createQuotaUsage({
        used: 10000,
        limit: 10000,
        resetTime
      });

      // When: Logging quota exceeded
      logger.error('Quota exceeded', null, { quotaUsage });

      // Then: Should include reset time
      const parsed = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(parsed.context.quotaUsage.resetTime).toBe(resetTime.toISOString());
    });
  });

  describe('Error Logging', () => {
    test('should log error with stack trace', () => {
      // Given: Error with stack
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.js:10:5';

      // When: Logging error
      logger.error('Operation failed', error);

      // Then: Should include error details
      const parsed = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(parsed.error).toBeDefined();
      expect(parsed.error.message).toBe('Test error');
      expect(parsed.error.stack).toContain('test.js:10:5');
    });

    test('should log YouTubeError with code and context', () => {
      // Given: YouTubeError
      const error = new YouTubeError(
        YouTubeErrorCode.QUOTA_EXCEEDED,
        'Quota exceeded',
        { used: 10000, limit: 10000 }
      );

      // When: Logging
      logger.error('YouTube API error', error);

      // Then: Should include error code and context
      const parsed = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(parsed.error.code).toBe('QUOTA_EXCEEDED');
      expect(parsed.error.context).toEqual({ used: 10000, limit: 10000 });
    });

    test('should log error context separately from error object', () => {
      // Given: Error with additional context
      const error = new Error('Network error');
      const context = {
        operation: 'searchVideos',
        query: 'test',
        attempt: 3
      };

      // When: Logging with context
      logger.error('Search failed', error, context);

      // Then: Should have both error and context
      const parsed = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(parsed.error.message).toBe('Network error');
      expect(parsed.context.operation).toBe('searchVideos');
      expect(parsed.context.query).toBe('test');
      expect(parsed.context.attempt).toBe(3);
    });

    test('should handle circular references in errors', () => {
      // Given: Error with circular reference
      const error: any = new Error('Circular');
      error.circular = error;

      // When: Logging
      logger.error('Circular error', error);

      // Then: Should handle without throwing
      expect(consoleErrorSpy).toHaveBeenCalled();
      const logCall = consoleErrorSpy.mock.calls[0][0];
      expect(() => JSON.parse(logCall)).not.toThrow();
    });
  });

  describe('Rate Limiting Logs', () => {
    test('should log rate limit delays', () => {
      // Given: Rate limit context
      const context = {
        delayMs: 5000,
        queueSize: 3,
        windowRemaining: 45000
      };

      // When: Logging delay
      logger.info('Rate limit delay', context);

      // Then: Should include delay details
      const parsed = JSON.parse(consoleInfoSpy.mock.calls[0][0]);
      expect(parsed.context.delayMs).toBe(5000);
      expect(parsed.context.queueSize).toBe(3);
    });

    test('should log queue status', () => {
      // Given: Queue status
      const context = {
        queueSize: 10,
        maxQueueSize: 100,
        estimatedWaitMs: 15000
      };

      // When: Logging queue
      logger.debug('Rate limit queue status', context);

      // Then: Should include queue details
      const parsed = JSON.parse(consoleDebugSpy.mock.calls[0][0]);
      expect(parsed.context.queueSize).toBe(10);
      expect(parsed.context.maxQueueSize).toBe(100);
    });
  });

  describe('Log Level Filtering', () => {
    test('should respect log level in development', () => {
      // Given: Development environment
      process.env.NODE_ENV = 'development';
      process.env.YOUTUBE_LOG_LEVEL = 'DEBUG';
      const devLogger = new YouTubeLogger();

      // When: Logging at all levels
      devLogger.debug('Debug');
      devLogger.info('Info');
      devLogger.warn('Warn');
      devLogger.error('Error', new Error());

      // Then: All should be logged
      expect(consoleDebugSpy).toHaveBeenCalled();
      expect(consoleInfoSpy).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    test('should filter debug logs in production', () => {
      // Given: Production environment
      process.env.NODE_ENV = 'production';
      process.env.YOUTUBE_LOG_LEVEL = 'INFO';
      const prodLogger = new YouTubeLogger();

      // When: Logging at all levels
      prodLogger.debug('Debug');
      prodLogger.info('Info');
      prodLogger.warn('Warn');
      prodLogger.error('Error', new Error());

      // Then: Debug should be filtered
      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    test('should respect custom log level', () => {
      // Given: Custom log level (WARN)
      process.env.YOUTUBE_LOG_LEVEL = 'WARN';
      const customLogger = new YouTubeLogger();

      // When: Logging at all levels
      customLogger.debug('Debug');
      customLogger.info('Info');
      customLogger.warn('Warn');
      customLogger.error('Error', new Error());

      // Then: Only WARN and ERROR logged
      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    test('should handle ERROR only level', () => {
      // Given: ERROR only
      process.env.YOUTUBE_LOG_LEVEL = 'ERROR';
      const errorLogger = new YouTubeLogger();

      // When: Logging at all levels
      errorLogger.debug('Debug');
      errorLogger.info('Info');
      errorLogger.warn('Warn');
      errorLogger.error('Error', new Error());

      // Then: Only ERROR logged
      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('Sensitive Data Sanitization', () => {
    test('should never log API keys', () => {
      // Given: Context with API key
      const context = {
        apiKey: 'AIzaSy_secret_key_12345',
        query: 'test'
      };

      // When: Logging
      logger.info('Request', context);

      // Then: API key should be redacted
      const logCall = consoleInfoSpy.mock.calls[0][0];
      expect(logCall).not.toContain('AIzaSy_secret_key_12345');
      expect(logCall).toContain('[REDACTED]');
    });

    test('should sanitize authorization headers', () => {
      // Given: Headers with auth
      const context = {
        headers: {
          'Authorization': 'Bearer secret_token',
          'Content-Type': 'application/json'
        }
      };

      // When: Logging
      logger.debug('Request headers', context);

      // Then: Auth should be redacted
      const parsed = JSON.parse(consoleDebugSpy.mock.calls[0][0]);
      expect(parsed.context.headers.Authorization).toBe('[REDACTED]');
      expect(parsed.context.headers['Content-Type']).toBe('application/json');
    });

    test('should sanitize URLs with API keys', () => {
      // Given: URL with API key
      const context = {
        url: 'https://api.youtube.com/v3/search?key=AIzaSy_secret&q=test'
      };

      // When: Logging
      logger.info('API call', context);

      // Then: Key should be redacted in URL
      const parsed = JSON.parse(consoleInfoSpy.mock.calls[0][0]);
      expect(parsed.context.url).not.toContain('AIzaSy_secret');
      expect(parsed.context.url).toContain('key=[REDACTED]');
    });

    test('should handle nested sensitive data', () => {
      // Given: Nested sensitive data
      const context = {
        request: {
          config: {
            params: {
              key: 'AIzaSy_secret',
              q: 'test'
            }
          }
        }
      };

      // When: Logging
      logger.info('Deep context', context);

      // Then: Should find and redact
      const logCall = consoleInfoSpy.mock.calls[0][0];
      expect(logCall).not.toContain('AIzaSy_secret');
    });
  });

  describe('Performance Metrics', () => {
    test('should log operation duration', () => {
      // Given: Start time
      const startTime = Date.now();

      // When: Logging with duration
      const duration = 234;
      logger.info('Operation completed', {
        duration,
        startTime,
        endTime: startTime + duration
      });

      // Then: Should include timing
      const parsed = JSON.parse(consoleInfoSpy.mock.calls[0][0]);
      expect(parsed.context.duration).toBe(234);
      expect(parsed.context.startTime).toBe(startTime);
    });

    test('should calculate duration from start/end', () => {
      // Given: Start and end times
      const startTime = new Date('2025-11-15T10:00:00.000Z');
      const endTime = new Date('2025-11-15T10:00:01.234Z');

      // When: Logging
      logger.info('Search completed', {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        durationMs: 1234
      });

      // Then: Should show duration
      const parsed = JSON.parse(consoleInfoSpy.mock.calls[0][0]);
      expect(parsed.context.durationMs).toBe(1234);
    });
  });

  describe('Utility Methods', () => {
    test('should generate unique request IDs', () => {
      // Given: Logger
      // When: Generating multiple IDs
      const id1 = logger.generateRequestId();
      const id2 = logger.generateRequestId();
      const id3 = logger.generateRequestId();

      // Then: All should be unique
      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);

      // And: Should be valid UUIDs
      const uuidRegex = /^[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}$/;
      expect(id1).toMatch(uuidRegex);
      expect(id2).toMatch(uuidRegex);
    });

    test('should format bytes for human reading', () => {
      // Given: Logger with formatting
      // When: Formatting various sizes
      expect(logger.formatBytes(0)).toBe('0 B');
      expect(logger.formatBytes(1024)).toBe('1 KB');
      expect(logger.formatBytes(1024 * 1024)).toBe('1 MB');
      expect(logger.formatBytes(1536 * 1024)).toBe('1.5 MB');
    });

    test('should format duration for human reading', () => {
      // Given: Logger with formatting
      // When: Formatting durations
      expect(logger.formatDuration(0)).toBe('0ms');
      expect(logger.formatDuration(234)).toBe('234ms');
      expect(logger.formatDuration(1000)).toBe('1.0s');
      expect(logger.formatDuration(65000)).toBe('1m 5s');
    });
  });

  describe('Edge Cases', () => {
    test('should handle undefined context gracefully', () => {
      // Given: Logger
      // When: Logging without context
      logger.info('No context');

      // Then: Should log without error
      const parsed = JSON.parse(consoleInfoSpy.mock.calls[0][0]);
      expect(parsed.message).toBe('No context');
      expect(parsed.context).toEqual({});
    });

    test('should handle null error gracefully', () => {
      // Given: Null error
      // When: Logging
      logger.error('Null error', null);

      // Then: Should handle gracefully
      const parsed = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(parsed.message).toBe('Null error');
      expect(parsed.error).toBeNull();
    });

    test('should limit log message size', () => {
      // Given: Very large context
      const largeArray = new Array(10000).fill('x');
      const context = {
        data: largeArray
      };

      // When: Logging
      logger.info('Large context', context);

      // Then: Should truncate if too large
      const logCall = consoleInfoSpy.mock.calls[0][0];
      expect(logCall.length).toBeLessThan(100000); // Reasonable limit
    });

    test('should handle special characters in messages', () => {
      // Given: Special characters
      const message = 'Message with \n newline \t tab " quotes';

      // When: Logging
      logger.info(message);

      // Then: Should escape properly
      const logCall = consoleInfoSpy.mock.calls[0][0];
      const parsed = JSON.parse(logCall);
      expect(parsed.message).toBe(message);
    });
  });
});