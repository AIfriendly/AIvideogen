/**
 * YouTube API Client Factory
 *
 * Provides singleton instance of YouTubeAPIClient to ensure consistent
 * quota and rate limit tracking across the application.
 */

import { YouTubeAPIClient } from './client';

/**
 * Singleton client instance
 */
let clientInstance: YouTubeAPIClient | null = null;

/**
 * Get YouTube API client instance
 *
 * Returns the singleton YouTubeAPIClient instance, creating it if it doesn't exist.
 * This ensures quota and rate limit state is shared across all API requests.
 *
 * @param apiKey - Optional API key (defaults to YOUTUBE_API_KEY env var)
 * @returns YouTube API client instance
 * @throws {YouTubeError} If API key is not configured
 *
 * @example
 * ```typescript
 * // In API route
 * const client = getYouTubeClient();
 * const results = await client.searchVideos('gaming');
 * ```
 */
export function getYouTubeClient(apiKey?: string): YouTubeAPIClient {
  if (!clientInstance) {
    clientInstance = new YouTubeAPIClient(apiKey);
  }
  return clientInstance;
}

/**
 * Reset YouTube API client instance
 *
 * Clears the singleton instance, allowing a fresh client to be created.
 * Primarily used in testing to reset client state between tests.
 *
 * @example
 * ```typescript
 * // In test setup
 * afterEach(() => {
 *   resetYouTubeClient();
 * });
 * ```
 */
export function resetYouTubeClient(): void {
  clientInstance = null;
}

/**
 * Check if YouTube client is initialized
 *
 * @returns True if client instance exists
 */
export function hasYouTubeClient(): boolean {
  return clientInstance !== null;
}
