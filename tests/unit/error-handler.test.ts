/**
 * Unit tests for ErrorHandler
 * Tests AC6: Actionable error messages
 * Following TEA test-quality.md best practices
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { ErrorHandler } from '@/lib/youtube/error-handler';
import { YouTubeError, YouTubeErrorCode } from '@/lib/youtube/types';
import { createYouTubeErrorResponse } from '../factories/youtube.factory';

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();
    // Create fresh instance
    errorHandler = new ErrorHandler();
  });

  describe('Error Code Mapping', () => {
    test('should map 401 to API_KEY_INVALID', () => {
      // Given: 401 Unauthorized error
      const error = {
        response: {
          status: 401,
          data: createYouTubeErrorResponse(401, 'unauthorized')
        }
      };

      // When: Handling error
      const result = errorHandler.handleError(error);

      // Then: Should map to API_KEY_INVALID
      expect(result).toBeInstanceOf(YouTubeError);
      expect(result.code).toBe(YouTubeErrorCode.API_KEY_INVALID);
    });

    test('should map 403 quota exceeded to QUOTA_EXCEEDED', () => {
      // Given: 403 with quota exceeded reason
      const error = {
        response: {
          status: 403,
          data: {
            error: {
              code: 403,
              message: 'The request cannot be completed because you have exceeded your quota.',
              errors: [{
                reason: 'quotaExceeded',
                domain: 'youtube.quota'
              }]
            }
          }
        }
      };

      // When: Handling error
      const result = errorHandler.handleError(error);

      // Then: Should map to QUOTA_EXCEEDED
      expect(result.code).toBe(YouTubeErrorCode.QUOTA_EXCEEDED);
    });

    test('should map 429 to RATE_LIMITED', () => {
      // Given: 429 Too Many Requests
      const error = {
        response: {
          status: 429,
          data: createYouTubeErrorResponse(429, 'rateLimitExceeded')
        }
      };

      // When: Handling error
      const result = errorHandler.handleError(error);

      // Then: Should map to RATE_LIMITED
      expect(result.code).toBe(YouTubeErrorCode.RATE_LIMITED);
    });

    test('should map 400 to INVALID_REQUEST', () => {
      // Given: 400 Bad Request
      const error = {
        response: {
          status: 400,
          data: createYouTubeErrorResponse(400, 'badRequest')
        }
      };

      // When: Handling error
      const result = errorHandler.handleError(error);

      // Then: Should map to INVALID_REQUEST
      expect(result.code).toBe(YouTubeErrorCode.INVALID_REQUEST);
    });

    test('should map 503 to SERVICE_UNAVAILABLE', () => {
      // Given: 503 Service Unavailable
      const error = {
        response: {
          status: 503,
          data: createYouTubeErrorResponse(503, 'backendError')
        }
      };

      // When: Handling error
      const result = errorHandler.handleError(error);

      // Then: Should map to SERVICE_UNAVAILABLE
      expect(result.code).toBe(YouTubeErrorCode.SERVICE_UNAVAILABLE);
    });

    test('should map network errors to NETWORK_ERROR', () => {
      // Given: Network error
      const error = new Error('ECONNREFUSED');
      (error as any).code = 'ECONNREFUSED';

      // When: Handling error
      const result = errorHandler.handleError(error);

      // Then: Should map to NETWORK_ERROR
      expect(result.code).toBe(YouTubeErrorCode.NETWORK_ERROR);
    });

    test('should map timeout errors to NETWORK_ERROR', () => {
      // Given: Timeout error
      const error = new Error('ETIMEDOUT');
      (error as any).code = 'ETIMEDOUT';

      // When: Handling error
      const result = errorHandler.handleError(error);

      // Then: Should map to NETWORK_ERROR
      expect(result.code).toBe(YouTubeErrorCode.NETWORK_ERROR);
    });

    test('should handle missing API key scenario', () => {
      // Given: Missing API key context
      const error = new Error('API key not provided');

      // When: Handling as missing key error
      const result = errorHandler.handleMissingApiKey();

      // Then: Should create API_KEY_NOT_CONFIGURED error
      expect(result.code).toBe(YouTubeErrorCode.API_KEY_NOT_CONFIGURED);
    });
  });

  describe('Actionable Error Messages', () => {
    test('should provide actionable guidance for missing API key', () => {
      // Given/When: Missing API key error
      const error = errorHandler.handleMissingApiKey();

      // Then: Should include setup instructions
      expect(error.message).toContain('YouTube API key not configured');
      expect(error.message).toContain('Add YOUTUBE_API_KEY to .env.local');
      expect(error.context?.guidance).toContain('docs/setup-guide.md');
    });

    test('should provide actionable guidance for invalid API key', () => {
      // Given: 401 error
      const error = {
        response: {
          status: 401,
          data: createYouTubeErrorResponse(401, 'unauthorized')
        }
      };

      // When: Handling error
      const result = errorHandler.handleError(error);

      // Then: Should include Cloud Console guidance
      expect(result.message).toContain('YouTube API key is invalid');
      expect(result.message).toContain('Google Cloud Console');
      expect(result.context?.guidance).toBeDefined();
    });

    test('should provide actionable guidance for quota exceeded', () => {
      // Given: Quota exceeded error with reset time
      const resetTime = new Date('2025-11-16T08:00:00Z');
      const error = {
        response: {
          status: 403,
          data: {
            error: {
              code: 403,
              message: 'Quota exceeded',
              errors: [{
                reason: 'quotaExceeded',
                domain: 'youtube.quota'
              }]
            }
          }
        }
      };

      // When: Handling error
      const result = errorHandler.handleError(error, { resetTime });

      // Then: Should include quota info and reset time
      expect(result.message).toContain('YouTube API daily quota exceeded');
      expect(result.message).toContain('10,000 units');
      expect(result.message).toContain('midnight PT');
      expect(result.context?.resetTime).toBe(resetTime);
    });

    test('should provide actionable guidance for rate limiting', () => {
      // Given: Rate limit error
      const error = {
        response: {
          status: 429,
          data: createYouTubeErrorResponse(429, 'rateLimitExceeded')
        }
      };

      // When: Handling error
      const result = errorHandler.handleError(error);

      // Then: Should explain rate limiting
      expect(result.message).toContain('YouTube API rate limit reached');
      expect(result.message).toContain('will retry automatically');
      expect(result.context?.guidance).toBeDefined();
    });

    test('should provide actionable guidance for network errors', () => {
      // Given: Connection refused
      const error = new Error('connect ECONNREFUSED 127.0.0.1:443');
      (error as any).code = 'ECONNREFUSED';

      // When: Handling error
      const result = errorHandler.handleError(error);

      // Then: Should include connectivity guidance
      expect(result.message).toContain('Failed to connect to YouTube API');
      expect(result.message).toContain('Check internet connection');
      expect(result.context?.guidance).toContain('firewall');
    });

    test('should provide actionable guidance for invalid requests', () => {
      // Given: 400 Bad Request
      const error = {
        response: {
          status: 400,
          data: {
            error: {
              code: 400,
              message: 'Invalid value for parameter',
              errors: [{
                reason: 'invalidParameter',
                message: 'Invalid value for maxResults'
              }]
            }
          }
        }
      };

      // When: Handling error
      const result = errorHandler.handleError(error);

      // Then: Should include parameter guidance
      expect(result.message).toContain('Invalid request');
      expect(result.context?.details).toContain('Invalid value');
    });

    test('should provide actionable guidance for service unavailable', () => {
      // Given: 503 error
      const error = {
        response: {
          status: 503,
          data: createYouTubeErrorResponse(503, 'backendError')
        }
      };

      // When: Handling error
      const result = errorHandler.handleError(error);

      // Then: Should indicate temporary issue
      expect(result.message).toContain('YouTube API service temporarily unavailable');
      expect(result.message).toContain('Try again');
      expect(result.context?.retryable).toBe(true);
    });
  });

  describe('Error Context Preservation', () => {
    test('should preserve original error details', () => {
      // Given: Detailed error
      const error = {
        response: {
          status: 403,
          statusText: 'Forbidden',
          data: {
            error: {
              code: 403,
              message: 'Daily quota exceeded',
              errors: [{
                reason: 'quotaExceeded',
                domain: 'youtube.quota',
                message: 'Daily quota exceeded for project',
                locationType: 'header',
                location: 'Authorization'
              }]
            }
          }
        },
        config: {
          url: 'https://www.googleapis.com/youtube/v3/search',
          method: 'GET'
        }
      };

      // When: Handling error
      const result = errorHandler.handleError(error);

      // Then: Should preserve details in context
      expect(result.context?.originalError).toBeDefined();
      expect(result.context?.httpStatus).toBe(403);
      expect(result.context?.apiEndpoint).toContain('/search');
      expect(result.context?.errorDetails).toContain('Daily quota exceeded');
    });

    test('should include request context if available', () => {
      // Given: Error with request info
      const error = {
        response: {
          status: 400,
          data: createYouTubeErrorResponse(400, 'badRequest')
        },
        config: {
          params: {
            q: 'test query',
            maxResults: 999
          }
        }
      };

      // When: Handling error
      const result = errorHandler.handleError(error, {
        operation: 'searchVideos',
        query: 'test query'
      });

      // Then: Should include request context
      expect(result.context?.operation).toBe('searchVideos');
      expect(result.context?.query).toBe('test query');
    });

    test('should include timestamp in error context', () => {
      // Given: Any error
      const error = new Error('Test error');

      // When: Handling error
      const result = errorHandler.handleError(error);

      // Then: Should include timestamp
      expect(result.context?.timestamp).toBeDefined();
      expect(new Date(result.context?.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('Documentation Links', () => {
    test('should include relevant documentation link for API key issues', () => {
      // Given: API key error
      const error = errorHandler.handleMissingApiKey();

      // Then: Should link to setup guide
      expect(error.context?.documentationUrl).toContain('setup-guide.md#youtube-api');
    });

    test('should include troubleshooting link for quota issues', () => {
      // Given: Quota error
      const error = {
        response: {
          status: 403,
          data: {
            error: {
              errors: [{ reason: 'quotaExceeded' }]
            }
          }
        }
      };

      // When: Handling error
      const result = errorHandler.handleError(error);

      // Then: Should link to troubleshooting
      expect(result.context?.documentationUrl).toContain('troubleshooting-youtube-api.md');
    });

    test('should include API documentation for invalid requests', () => {
      // Given: Invalid request
      const error = {
        response: {
          status: 400,
          data: createYouTubeErrorResponse(400, 'badRequest')
        }
      };

      // When: Handling error
      const result = errorHandler.handleError(error);

      // Then: Should link to API docs
      expect(result.context?.documentationUrl).toBeDefined();
    });
  });

  describe('Error Formatting', () => {
    test('should format error messages consistently', () => {
      // Given: Various errors
      const errors = [
        errorHandler.handleMissingApiKey(),
        errorHandler.handleError({ response: { status: 401 } }),
        errorHandler.handleError({ response: { status: 429 } }),
        errorHandler.handleError(new Error('ECONNREFUSED'))
      ];

      // Then: All should have consistent structure
      errors.forEach(error => {
        expect(error).toBeInstanceOf(YouTubeError);
        expect(error.code).toBeDefined();
        expect(error.message).toBeDefined();
        expect(error.context).toBeDefined();
        expect(error.message.length).toBeGreaterThan(0);
      });
    });

    test('should not expose sensitive information', () => {
      // Given: Error with potentially sensitive data
      const error = {
        response: {
          status: 401,
          headers: {
            'x-api-key': 'AIzaSy_secret_key_12345'
          }
        },
        config: {
          params: {
            key: 'AIzaSy_secret_key_12345'
          }
        }
      };

      // When: Handling error
      const result = errorHandler.handleError(error);

      // Then: Should not include API key
      expect(result.message).not.toContain('AIzaSy_secret_key_12345');
      expect(JSON.stringify(result.context)).not.toContain('AIzaSy_secret_key_12345');
    });

    test('should handle circular references in error objects', () => {
      // Given: Error with circular reference
      const error: any = new Error('Test');
      error.circular = error;

      // When: Handling error
      const result = errorHandler.handleError(error);

      // Then: Should handle without throwing
      expect(result).toBeInstanceOf(YouTubeError);
      expect(result.message).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    test('should handle null or undefined errors', () => {
      // Given: Null/undefined errors
      // When/Then: Should handle gracefully
      expect(errorHandler.handleError(null)).toBeInstanceOf(YouTubeError);
      expect(errorHandler.handleError(undefined)).toBeInstanceOf(YouTubeError);
    });

    test('should handle errors without response property', () => {
      // Given: Plain error
      const error = new Error('Something went wrong');

      // When: Handling error
      const result = errorHandler.handleError(error);

      // Then: Should create generic error
      expect(result).toBeInstanceOf(YouTubeError);
      expect(result.code).toBe(YouTubeErrorCode.UNKNOWN_ERROR);
      expect(result.message).toContain('Something went wrong');
    });

    test('should handle non-standard error objects', () => {
      // Given: Non-standard error
      const error = {
        customField: 'value',
        errorMessage: 'Custom error'
      };

      // When: Handling error
      const result = errorHandler.handleError(error);

      // Then: Should handle gracefully
      expect(result).toBeInstanceOf(YouTubeError);
      expect(result.code).toBe(YouTubeErrorCode.UNKNOWN_ERROR);
    });

    test('should handle string errors', () => {
      // Given: String error
      const error = 'Simple error string';

      // When: Handling error
      const result = errorHandler.handleError(error);

      // Then: Should convert to YouTubeError
      expect(result).toBeInstanceOf(YouTubeError);
      expect(result.message).toContain('Simple error string');
    });

    test('should handle very long error messages', () => {
      // Given: Long error message
      const longMessage = 'Error: ' + 'x'.repeat(10000);
      const error = new Error(longMessage);

      // When: Handling error
      const result = errorHandler.handleError(error);

      // Then: Should truncate if necessary
      expect(result.message.length).toBeLessThan(5000);
    });
  });

  describe('Error Categorization', () => {
    test('should identify retryable errors', () => {
      // Given: Various error types
      const retryableErrors = [
        { response: { status: 500 } }, // Server error
        { response: { status: 503 } }, // Service unavailable
        { response: { status: 429 } }, // Rate limited
        new Error('ETIMEDOUT'), // Network timeout
        new Error('ECONNRESET'), // Connection reset
      ];

      const nonRetryableErrors = [
        { response: { status: 400 } }, // Bad request
        { response: { status: 401 } }, // Unauthorized
        { response: { status: 403, data: { error: { errors: [{ reason: 'quotaExceeded' }] } } } }, // Quota
        errorHandler.handleMissingApiKey(), // Missing key
      ];

      // When/Then: Check retryable flag
      retryableErrors.forEach(error => {
        const result = errorHandler.handleError(error);
        expect(result.context?.retryable).toBe(true);
      });

      nonRetryableErrors.forEach(error => {
        const result = errorHandler.handleError(error);
        expect(result.context?.retryable).toBe(false);
      });
    });

    test('should categorize errors by severity', () => {
      // Given: Various errors
      const criticalErrors = [
        errorHandler.handleMissingApiKey(),
        { response: { status: 401 } },
      ];

      const temporaryErrors = [
        { response: { status: 503 } },
        { response: { status: 429 } },
        new Error('ETIMEDOUT'),
      ];

      // When/Then: Check severity
      criticalErrors.forEach(error => {
        const result = errorHandler.handleError(error);
        expect(result.context?.severity).toBe('critical');
      });

      temporaryErrors.forEach(error => {
        const result = errorHandler.handleError(error);
        expect(result.context?.severity).toBe('temporary');
      });
    });
  });

  describe('Utility Methods', () => {
    test('should correctly identify YouTube API errors', () => {
      // Given: Various error types
      const youtubeError = new YouTubeError(YouTubeErrorCode.QUOTA_EXCEEDED, 'Quota');
      const normalError = new Error('Normal error');
      const apiError = { response: { status: 403 } };

      // When/Then: Check identification
      expect(errorHandler.isYouTubeError(youtubeError)).toBe(true);
      expect(errorHandler.isYouTubeError(normalError)).toBe(false);
      expect(errorHandler.isYouTubeError(apiError)).toBe(false);
    });

    test('should extract error code correctly', () => {
      // Given: Various error formats
      const errors = [
        { response: { status: 401 }, expected: YouTubeErrorCode.API_KEY_INVALID },
        { response: { status: 429 }, expected: YouTubeErrorCode.RATE_LIMITED },
        { response: { status: 503 }, expected: YouTubeErrorCode.SERVICE_UNAVAILABLE },
        { code: 'ECONNREFUSED', expected: YouTubeErrorCode.NETWORK_ERROR },
      ];

      // When/Then: Verify code extraction
      errors.forEach(({ expected, ...error }) => {
        const result = errorHandler.handleError(error);
        expect(result.code).toBe(expected);
      });
    });
  });
});