/**
 * YouTube API Client
 *
 * Core client for YouTube Data API v3 integration with:
 * - API key authentication
 * - Quota management and tracking
 * - Rate limiting (100 requests per 100 seconds)
 * - Exponential backoff retry logic
 * - Comprehensive error handling
 */

import { google } from 'googleapis';
import type { youtube_v3 } from 'googleapis';
import {
  VideoResult,
  SearchOptions,
  QuotaUsage,
  YouTubeError,
  YouTubeErrorCode
} from './types';
import { QuotaTracker } from './quota-tracker';
import { RateLimiter } from './rate-limiter';
import { RetryHandler } from './retry-handler';
import { YouTubeLogger } from './logger';
import { YouTubeErrorHandler } from './error-handler';

/**
 * YouTube API Client
 *
 * Provides authenticated access to YouTube Data API v3 with automatic
 * quota tracking, rate limiting, and error recovery.
 *
 * @example
 * ```typescript
 * const client = new YouTubeAPIClient();
 * const results = await client.searchVideos('gaming highlights', { maxResults: 10 });
 * console.log(`Found ${results.length} videos`);
 * console.log(`Quota: ${client.getQuotaUsage().used}/${client.getQuotaUsage().limit}`);
 * ```
 */
export class YouTubeAPIClient {
  private youtube: youtube_v3.Youtube;
  private apiKey: string;
  private quotaTracker: QuotaTracker;
  private rateLimiter: RateLimiter;
  private retryHandler: RetryHandler;
  private logger: YouTubeLogger;

  /**
   * Create YouTube API client
   *
   * @param apiKey - Optional API key (defaults to YOUTUBE_API_KEY env var)
   * @throws {YouTubeError} If API key is missing or invalid
   */
  constructor(apiKey?: string) {
    // Initialize logger
    this.logger = new YouTubeLogger(process.env.NODE_ENV === 'development');

    // Get API key from parameter or environment
    this.apiKey = apiKey || process.env.YOUTUBE_API_KEY || '';

    // Validate API key presence
    if (!this.apiKey) {
      const error = new YouTubeError(
        YouTubeErrorCode.API_KEY_NOT_CONFIGURED,
        'YouTube API key not configured. Add YOUTUBE_API_KEY to .env.local'
      );
      this.logger.error('YouTube API initialization failed', error, { reason: 'missing_api_key' });
      throw error;
    }

    // Initialize Google APIs YouTube client
    this.youtube = google.youtube({
      version: 'v3',
      auth: this.apiKey
    });

    // Initialize supporting modules
    const quotaLimit = parseInt(process.env.YOUTUBE_API_QUOTA_LIMIT || '10000', 10);
    const rateLimit = parseInt(process.env.YOUTUBE_API_RATE_LIMIT || '100', 10);
    const rateWindow = parseInt(process.env.YOUTUBE_API_RATE_WINDOW || '100000', 10);

    this.quotaTracker = new QuotaTracker(quotaLimit, this.logger);
    this.rateLimiter = new RateLimiter(rateLimit, rateWindow, this.logger);
    this.retryHandler = new RetryHandler(3, 1000, this.logger);

    this.logger.info('YouTubeAPIClient initialized', {
      quotaLimit,
      rateLimit: `${rateLimit} requests per ${rateWindow}ms`
    });
  }

  /**
   * Search for videos on YouTube
   *
   * Performs a YouTube search with the given query and options, handling
   * quota tracking, rate limiting, and automatic retries.
   *
   * @param query - Search query string
   * @param options - Optional search parameters
   * @returns Array of video results
   * @throws {YouTubeError} If search fails after retries or quota exceeded
   *
   * @example
   * ```typescript
   * const results = await client.searchVideos('nature documentary', {
   *   maxResults: 15,
   *   videoDuration: 'medium',
   *   order: 'relevance'
   * });
   * ```
   */
  async searchVideos(query: string, options?: SearchOptions): Promise<VideoResult[]> {
    // Input validation
    if (!query || query.trim().length === 0) {
      const error = new YouTubeError(
        YouTubeErrorCode.INVALID_REQUEST,
        'Search query cannot be empty'
      );
      this.logger.error('Invalid search query', error, { query });
      throw error;
    }

    // Sanitize query
    const sanitizedQuery = query.trim().substring(0, 100); // Limit to 100 chars

    // Validate maxResults
    const maxResults = options?.maxResults || 10;
    if (maxResults < 1 || maxResults > 50) {
      const error = new YouTubeError(
        YouTubeErrorCode.INVALID_REQUEST,
        `maxResults must be between 1 and 50 (received: ${maxResults})`
      );
      this.logger.error('Invalid maxResults', error, { maxResults });
      throw error;
    }

    // Check quota availability
    if (this.quotaTracker.isExceeded()) {
      const usage = this.quotaTracker.getUsage();
      const error = new YouTubeError(
        YouTubeErrorCode.QUOTA_EXCEEDED,
        `YouTube API daily quota exceeded (${usage.used}/${usage.limit} units). Quota resets at ${usage.resetTime.toLocaleString()}`,
        { usage }
      );
      this.logger.error('Quota exceeded before search', error);
      throw error;
    }

    // Log request
    this.logger.debug('YouTube search request initiated', {
      query: sanitizedQuery,
      maxResults,
      quotaCost: 100,
      options
    });

    // Acquire rate limit slot (may wait if limit reached)
    await this.rateLimiter.acquire();

    // Execute search with retry logic
    const results = await this.retryHandler.executeWithRetry(async () => {
      try {
        // Make YouTube API request
        const response = await this.youtube.search.list({
          part: ['snippet'],
          q: sanitizedQuery,
          type: ['video'],
          videoEmbeddable: options?.videoEmbeddable !== false ? 'true' : 'false',
          maxResults,
          relevanceLanguage: options?.relevanceLanguage || 'en',
          order: options?.order || 'relevance',
          videoDuration: options?.videoDuration
        });

        return response.data.items || [];
      } catch (error: any) {
        // Transform API errors to YouTubeError
        throw YouTubeErrorHandler.handleError(error, `search: "${sanitizedQuery}"`);
      }
    }, `YouTube search: "${sanitizedQuery}"`);

    // Transform results to VideoResult format
    const videoResults = results
      .filter(item => item.id?.videoId && item.snippet)
      .map(item => this.transformSearchResult(item));

    // Increment quota usage (search costs 100 units)
    this.quotaTracker.incrementUsage(100);

    // Log response
    const quotaUsage = this.quotaTracker.getUsage();
    this.logger.info('YouTube search completed', {
      query: sanitizedQuery,
      resultCount: videoResults.length,
      quotaUsed: quotaUsage.used,
      quotaRemaining: quotaUsage.remaining,
      quotaLimit: quotaUsage.limit
    });

    return videoResults;
  }

  /**
   * Get current quota usage information
   *
   * @returns Quota usage details including used, limit, remaining, and reset time
   */
  getQuotaUsage(): QuotaUsage {
    return this.quotaTracker.getUsage();
  }

  /**
   * Check if quota is exceeded
   *
   * @returns True if quota limit reached, false otherwise
   */
  isQuotaExceeded(): boolean {
    return this.quotaTracker.isExceeded();
  }

  /**
   * Validate API key format
   *
   * Performs basic format validation on the API key.
   * Note: This does not test if the key is authorized with YouTube.
   *
   * @private
   */
  private validateApiKey(): void {
    // Basic format validation (Google API keys are typically 39 characters)
    if (this.apiKey.length < 39 || !/^[A-Za-z0-9_-]+$/.test(this.apiKey)) {
      this.logger.warn('YouTube API key format appears invalid', {
        length: this.apiKey.length,
        expected: '39+ alphanumeric characters'
      });
    }
  }

  /**
   * Transform YouTube API search result to VideoResult interface
   *
   * @param item - YouTube API search result item
   * @returns Transformed VideoResult object
   * @private
   */
  private transformSearchResult(item: youtube_v3.Schema$SearchResult): VideoResult {
    const videoId = item.id?.videoId || '';
    const snippet = item.snippet;

    return {
      videoId,
      title: snippet?.title || 'Untitled Video',
      thumbnailUrl: snippet?.thumbnails?.high?.url || snippet?.thumbnails?.default?.url || '',
      channelTitle: snippet?.channelTitle || 'Unknown Channel',
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      publishedAt: snippet?.publishedAt || new Date().toISOString(),
      description: snippet?.description || '',
      // Optional fields - would require additional API call to get
      viewCount: undefined,
      likeCount: undefined,
      duration: undefined
    };
  }
}
