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
   * quota tracking, rate limiting, and automatic retries. Retrieves video
   * durations from the YouTube API and converts them to seconds.
   *
   * @param query - Search query string
   * @param options - Optional search parameters
   * @returns Array of video results with duration in seconds
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

    // Check quota availability (search.list costs 100 + videos.list costs 1 = 101 total)
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
      quotaCost: 101, // 100 for search + 1 for video details
      options
    });

    // Acquire rate limit slot (may wait if limit reached)
    await this.rateLimiter.acquire();

    // Execute search with retry logic
    const searchResults = await this.retryHandler.executeWithRetry(async () => {
      try {
        // Make YouTube API search request
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

    // Transform results to VideoResult format (without duration yet)
    const videoResults = searchResults
      .filter(item => item.id?.videoId && item.snippet)
      .map(item => this.transformSearchResult(item));

    // Increment quota usage for search (100 units)
    this.quotaTracker.incrementUsage(100);

    // Retrieve video durations if we have results
    if (videoResults.length > 0) {
      await this.enrichWithDurations(videoResults);
    }

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
   * Search for videos using multiple queries and deduplicate results
   *
   * Executes searches for primary and alternative queries, aggregates results,
   * and deduplicates by videoId while preserving relevance ordering.
   *
   * @param queries - Array of search queries (first is primary, rest are alternatives)
   * @param options - Optional search parameters
   * @returns Deduplicated array of video results
   * @throws {YouTubeError} If primary query fails
   *
   * @example
   * ```typescript
   * const results = await client.searchWithMultipleQueries([
   *   'lion savanna sunset',
   *   'african lion wildlife',
   *   'lion walking grassland'
   * ], { maxResults: 10 });
   * ```
   */
  async searchWithMultipleQueries(
    queries: string[],
    options?: SearchOptions
  ): Promise<VideoResult[]> {
    if (!queries || queries.length === 0) {
      const error = new YouTubeError(
        YouTubeErrorCode.INVALID_REQUEST,
        'At least one search query is required'
      );
      this.logger.error('Invalid queries array', error);
      throw error;
    }

    const primaryQuery = queries[0];
    const alternativeQueries = queries.slice(1);
    const errors: string[] = [];

    this.logger.debug('Multi-query search initiated', {
      primaryQuery,
      alternativeCount: alternativeQueries.length,
      totalQueries: queries.length
    });

    // Execute primary query (required)
    let allResults: VideoResult[] = [];
    try {
      const primaryResults = await this.searchVideos(primaryQuery, options);
      allResults.push(...primaryResults);
      this.logger.debug('Primary query completed', {
        query: primaryQuery,
        resultCount: primaryResults.length
      });
    } catch (error: any) {
      // Primary query failure is fatal
      this.logger.error('Primary query failed', error, { query: primaryQuery });
      throw error;
    }

    // Execute alternative queries (optional - failures are logged but not fatal)
    for (const altQuery of alternativeQueries) {
      try {
        const altResults = await this.searchVideos(altQuery, options);
        allResults.push(...altResults);
        this.logger.debug('Alternative query completed', {
          query: altQuery,
          resultCount: altResults.length
        });
      } catch (error: any) {
        const errorMsg = `Alternative query "${altQuery}" failed: ${error.message}`;
        errors.push(errorMsg);
        this.logger.warn('Alternative query failed (continuing)', {
          query: altQuery,
          error: error.message
        });
        // Continue with other queries
      }
    }

    // Deduplicate by videoId (keep first occurrence)
    const seen = new Set<string>();
    const deduplicatedResults = allResults.filter(result => {
      if (seen.has(result.videoId)) {
        return false;
      }
      seen.add(result.videoId);
      return true;
    });

    this.logger.info('Multi-query search completed', {
      queriesExecuted: queries.length,
      queriesFailed: errors.length,
      totalResults: allResults.length,
      deduplicatedResults: deduplicatedResults.length,
      errors: errors.length > 0 ? errors : undefined
    });

    return deduplicatedResults;
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
   * Enrich video results with duration data from YouTube API
   *
   * Makes a videos.list API call to retrieve contentDetails.duration for all videos,
   * parses ISO 8601 duration format, and updates the VideoResult objects in place.
   *
   * @param videoResults - Array of VideoResult objects to enrich
   * @private
   */
  private async enrichWithDurations(videoResults: VideoResult[]): Promise<void> {
    if (videoResults.length === 0) {
      return;
    }

    try {
      // Acquire rate limit slot for videos.list call
      await this.rateLimiter.acquire();

      // Extract video IDs
      const videoIds = videoResults.map(v => v.videoId).join(',');

      // Call videos.list to get contentDetails
      const response = await this.retryHandler.executeWithRetry(async () => {
        try {
          return await this.youtube.videos.list({
            part: ['contentDetails'],
            id: [videoIds]
          });
        } catch (error: any) {
          throw YouTubeErrorHandler.handleError(error, 'videos.list for durations');
        }
      }, 'YouTube videos.list');

      // Increment quota usage (videos.list costs 1 unit)
      this.quotaTracker.incrementUsage(1);

      // Create a map of videoId -> duration in seconds
      const durationMap = new Map<string, number>();
      if (response.data.items) {
        for (const item of response.data.items) {
          if (item.id && item.contentDetails?.duration) {
            const durationSeconds = this.parseISO8601Duration(item.contentDetails.duration);
            durationMap.set(item.id, durationSeconds);
          }
        }
      }

      // Update VideoResult objects with duration
      for (const result of videoResults) {
        const duration = durationMap.get(result.videoId);
        if (duration !== undefined) {
          result.duration = duration.toString(); // Store as string to match interface
        }
      }

      this.logger.debug('Video durations enriched', {
        videosProcessed: videoResults.length,
        durationsRetrieved: durationMap.size
      });
    } catch (error: any) {
      // Log error but don't fail the search
      this.logger.warn('Failed to enrich durations (continuing without duration data)', error);
    }
  }

  /**
   * Parse ISO 8601 duration format to seconds
   *
   * Converts YouTube API duration format (e.g., "PT4M13S") to total seconds.
   *
   * @param iso8601Duration - ISO 8601 duration string
   * @returns Duration in seconds
   * @private
   *
   * @example
   * ```typescript
   * parseISO8601Duration("PT4M13S") // returns 253
   * parseISO8601Duration("PT1H30M") // returns 5400
   * parseISO8601Duration("PT45S") // returns 45
   * ```
   */
  private parseISO8601Duration(iso8601Duration: string): number {
    // ISO 8601 duration format: PT[hours]H[minutes]M[seconds]S
    const match = iso8601Duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

    if (!match) {
      this.logger.warn('Invalid ISO 8601 duration format', { duration: iso8601Duration });
      return 0;
    }

    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);

    return hours * 3600 + minutes * 60 + seconds;
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
      duration: undefined // Will be enriched by enrichWithDurations()
    };
  }
}
