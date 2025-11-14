/**
 * YouTube API Error Handler
 *
 * Centralizes error handling for YouTube API operations with:
 * - Error code mapping to YouTubeErrorCode enum
 * - Actionable error messages with troubleshooting guidance
 * - Context preservation for debugging
 * - Documentation links
 */

import { YouTubeError, YouTubeErrorCode } from './types';

/**
 * Error message mappings for each error code
 */
const ERROR_MESSAGES: Record<YouTubeErrorCode, string> = {
  [YouTubeErrorCode.API_KEY_NOT_CONFIGURED]:
    'YouTube API key not configured. Add YOUTUBE_API_KEY to .env.local',

  [YouTubeErrorCode.API_KEY_INVALID]:
    'YouTube API key is invalid. Verify key in Google Cloud Console at https://console.cloud.google.com/apis/credentials',

  [YouTubeErrorCode.QUOTA_EXCEEDED]:
    'YouTube API daily quota exceeded (10,000 units). Quota resets at midnight Pacific Time.',

  [YouTubeErrorCode.RATE_LIMITED]:
    'YouTube API rate limit reached (100 requests per 100 seconds). Request will retry automatically.',

  [YouTubeErrorCode.NETWORK_ERROR]:
    'Failed to connect to YouTube API. Check internet connection and firewall settings.',

  [YouTubeErrorCode.SERVICE_UNAVAILABLE]:
    'YouTube API is temporarily unavailable. Please try again later.',

  [YouTubeErrorCode.INVALID_REQUEST]:
    'Invalid YouTube API request.'
};

/**
 * Troubleshooting guidance for each error code
 */
const ERROR_GUIDANCE: Record<YouTubeErrorCode, string> = {
  [YouTubeErrorCode.API_KEY_NOT_CONFIGURED]:
    'See setup guide: /docs/setup-guide.md#youtube-api-setup-epic-3',

  [YouTubeErrorCode.API_KEY_INVALID]:
    'Verify API key exists in Google Cloud Console. Ensure it is restricted to YouTube Data API v3 only. Try regenerating the key if needed.',

  [YouTubeErrorCode.QUOTA_EXCEEDED]:
    'Wait until midnight Pacific Time for quota reset. Check current usage with: npm run test:youtube -- --quota',

  [YouTubeErrorCode.RATE_LIMITED]:
    'The application will automatically retry after a short delay. If this persists, reduce concurrent requests.',

  [YouTubeErrorCode.NETWORK_ERROR]:
    'Verify internet connection. Check firewall allows HTTPS to googleapis.com. Try accessing https://www.googleapis.com/youtube/v3/ in browser.',

  [YouTubeErrorCode.SERVICE_UNAVAILABLE]:
    'Check YouTube API status at https://status.cloud.google.com/. If issue persists, check console for circuit breaker status.',

  [YouTubeErrorCode.INVALID_REQUEST]:
    'Verify request parameters are correct. Check query string, maxResults (1-50), and other options.'
};

/**
 * YouTube API Error Handler
 *
 * Provides centralized error handling and transformation for YouTube API operations.
 */
export class YouTubeErrorHandler {
  /**
   * Handle any error and convert to YouTubeError
   *
   * Detects error type, maps to appropriate error code, and creates
   * YouTubeError with actionable message and guidance.
   *
   * @param error - Original error
   * @param context - Optional context string (e.g., "search: gaming")
   * @returns Never (always throws)
   * @throws {YouTubeError} Converted error with actionable message
   */
  static handleError(error: any, context?: string): never {
    // If already a YouTubeError, just throw it
    if (error instanceof YouTubeError) {
      throw error;
    }

    // Detect error type and map to YouTubeErrorCode
    const code = this.detectErrorCode(error);

    // Create YouTubeError with actionable message
    const youtubeError = this.createActionableError(code, error, context);

    throw youtubeError;
  }

  /**
   * Create actionable YouTube error
   *
   * @param code - Error code
   * @param originalError - Original error object
   * @param context - Optional context string
   * @returns YouTubeError with actionable message
   */
  static createActionableError(
    code: YouTubeErrorCode,
    originalError?: any,
    context?: string
  ): YouTubeError {
    const message = this.getErrorMessage(code, originalError);
    const guidance = this.getErrorGuidance(code);

    // Build error context
    const errorContext: Record<string, any> = {
      guidance
    };

    if (context) {
      errorContext.operation = context;
    }

    if (originalError) {
      errorContext.originalError = {
        name: originalError.name,
        message: originalError.message,
        code: originalError.code,
        status: originalError.response?.status
      };
    }

    return new YouTubeError(code, message, errorContext);
  }

  /**
   * Get error message for error code
   *
   * @param code - Error code
   * @param originalError - Optional original error for details
   * @returns Error message
   */
  static getErrorMessage(code: YouTubeErrorCode, originalError?: any): string {
    let message = ERROR_MESSAGES[code];

    // Add specific details for some error types
    if (code === YouTubeErrorCode.INVALID_REQUEST && originalError?.message) {
      message += ` ${originalError.message}`;
    }

    if (code === YouTubeErrorCode.QUOTA_EXCEEDED && originalError?.context) {
      const { used, limit } = originalError.context;
      if (used && limit) {
        message = message.replace('(10,000 units)', `(${used}/${limit} units)`);
      }
    }

    return message;
  }

  /**
   * Get troubleshooting guidance for error code
   *
   * @param code - Error code
   * @returns Guidance string
   */
  static getErrorGuidance(code: YouTubeErrorCode): string {
    return ERROR_GUIDANCE[code];
  }

  /**
   * Detect error code from error object
   *
   * Maps various error types to appropriate YouTubeErrorCode.
   *
   * @param error - Error to analyze
   * @returns Detected error code
   * @private
   */
  private static detectErrorCode(error: any): YouTubeErrorCode {
    // Check for network errors
    if (this.isNetworkError(error)) {
      return YouTubeErrorCode.NETWORK_ERROR;
    }

    // Check HTTP status codes
    if (error.response?.status) {
      const status = error.response.status;

      // 401/403: Authentication/authorization errors
      if (status === 401 || status === 403) {
        // Check if it's quota exceeded (403 can be quota or invalid key)
        if (this.isQuotaError(error)) {
          return YouTubeErrorCode.QUOTA_EXCEEDED;
        }
        return YouTubeErrorCode.API_KEY_INVALID;
      }

      // 429: Rate limit
      if (status === 429) {
        return YouTubeErrorCode.RATE_LIMITED;
      }

      // 4xx: Client errors
      if (status >= 400 && status < 500) {
        return YouTubeErrorCode.INVALID_REQUEST;
      }

      // 5xx: Server errors
      if (status >= 500) {
        return YouTubeErrorCode.SERVICE_UNAVAILABLE;
      }
    }

    // Check error messages for specific patterns
    if (error.message) {
      const msg = error.message.toLowerCase();

      if (msg.includes('quota')) {
        return YouTubeErrorCode.QUOTA_EXCEEDED;
      }

      if (msg.includes('rate limit') || msg.includes('too many requests')) {
        return YouTubeErrorCode.RATE_LIMITED;
      }

      if (msg.includes('invalid') || msg.includes('malformed')) {
        return YouTubeErrorCode.INVALID_REQUEST;
      }

      if (msg.includes('api key') || msg.includes('authentication')) {
        return YouTubeErrorCode.API_KEY_INVALID;
      }
    }

    // Default to service unavailable
    return YouTubeErrorCode.SERVICE_UNAVAILABLE;
  }

  /**
   * Check if error is a network error
   *
   * @param error - Error to check
   * @returns True if network error
   * @private
   */
  private static isNetworkError(error: any): boolean {
    const networkErrorCodes = [
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ECONNREFUSED',
      'EHOSTUNREACH',
      'ENETUNREACH'
    ];

    return networkErrorCodes.includes(error.code);
  }

  /**
   * Check if error is quota exceeded
   *
   * @param error - Error to check
   * @returns True if quota exceeded
   * @private
   */
  private static isQuotaError(error: any): boolean {
    // Check error message
    if (error.message?.toLowerCase().includes('quota')) {
      return true;
    }

    // Check error response data
    if (error.response?.data) {
      const data = JSON.stringify(error.response.data).toLowerCase();
      return data.includes('quota') || data.includes('quotaexceeded');
    }

    return false;
  }
}
