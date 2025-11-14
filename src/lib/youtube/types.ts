/**
 * YouTube API Type Definitions
 *
 * Type interfaces for YouTube Data API v3 integration, including video results,
 * search options, quota tracking, and error handling.
 */

/**
 * Video search result from YouTube API
 */
export interface VideoResult {
  /** YouTube video ID (e.g., "dQw4w9WgXcQ") */
  videoId: string;
  /** Video title */
  title: string;
  /** Thumbnail image URL (high quality) */
  thumbnailUrl: string;
  /** YouTube channel name */
  channelTitle: string;
  /** Embeddable video URL for iframe */
  embedUrl: string;
  /** ISO 8601 publish date (e.g., "2009-10-25T06:57:33Z") */
  publishedAt: string;
  /** Video description */
  description: string;
  /** View count (optional, requires additional API call) */
  viewCount?: number;
  /** Like count (optional, requires additional API call) */
  likeCount?: number;
  /** Video duration in ISO 8601 format (optional, e.g., "PT4M33S") */
  duration?: string;
}

/**
 * Search options for YouTube video queries
 */
export interface SearchOptions {
  /** Maximum number of results (1-50, default: 10) */
  maxResults?: number;
  /** Relevance language code (default: 'en') */
  relevanceLanguage?: string;
  /** Only return embeddable videos (default: true) */
  videoEmbeddable?: boolean;
  /** Filter by video duration */
  videoDuration?: 'short' | 'medium' | 'long';
  /** Sort order for results */
  order?: 'relevance' | 'date' | 'viewCount' | 'rating';
}

/**
 * Quota usage tracking information
 */
export interface QuotaUsage {
  /** Quota units used today */
  used: number;
  /** Total daily quota limit */
  limit: number;
  /** Remaining quota units */
  remaining: number;
  /** Time when quota resets (midnight Pacific Time) */
  resetTime: Date;
}

/**
 * YouTube API error codes
 */
export enum YouTubeErrorCode {
  /** API key not configured in environment variables */
  API_KEY_NOT_CONFIGURED = 'YOUTUBE_API_KEY_NOT_CONFIGURED',
  /** API key is invalid or unauthorized */
  API_KEY_INVALID = 'YOUTUBE_API_KEY_INVALID',
  /** Daily quota limit exceeded */
  QUOTA_EXCEEDED = 'YOUTUBE_QUOTA_EXCEEDED',
  /** Rate limit reached (too many requests) */
  RATE_LIMITED = 'YOUTUBE_RATE_LIMITED',
  /** Network or connectivity error */
  NETWORK_ERROR = 'YOUTUBE_NETWORK_ERROR',
  /** Invalid request parameters */
  INVALID_REQUEST = 'YOUTUBE_INVALID_REQUEST',
  /** YouTube API service unavailable */
  SERVICE_UNAVAILABLE = 'YOUTUBE_SERVICE_UNAVAILABLE'
}

/**
 * Custom error class for YouTube API errors
 *
 * Provides structured error information with actionable error codes
 * and optional context for debugging.
 */
export class YouTubeError extends Error {
  /**
   * Create a YouTube API error
   *
   * @param code - Error code from YouTubeErrorCode enum
   * @param message - Human-readable error message with actionable guidance
   * @param context - Optional context object with additional error details
   */
  constructor(
    public code: YouTubeErrorCode,
    message: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'YouTubeError';

    // Maintain proper stack trace for debugging (V8 engines only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, YouTubeError);
    }
  }

  /**
   * Convert error to JSON for logging/serialization
   */
  toJSON(): object {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      stack: this.stack
    };
  }
}
