/**
 * Test data factories for YouTube API testing
 * Following TEA data-factories.md best practices
 */

import { faker } from '@faker-js/faker';
import type {
  VideoResult,
  SearchOptions,
  QuotaUsage,
  YouTubeErrorCode
} from '@/lib/youtube/types';

/**
 * Create a mock VideoResult with optional overrides
 * Uses faker for unique, deterministic data
 */
export function createVideoResult(overrides?: Partial<VideoResult>): VideoResult {
  const videoId = overrides?.videoId || faker.string.alphanumeric(11);

  return {
    videoId,
    title: faker.lorem.sentence(),
    thumbnailUrl: faker.image.url(),
    channelTitle: faker.company.name(),
    embedUrl: `https://www.youtube.com/embed/${videoId}`,
    publishedAt: faker.date.past().toISOString(),
    description: faker.lorem.paragraph(),
    viewCount: faker.number.int({ min: 0, max: 1000000 }),
    likeCount: faker.number.int({ min: 0, max: 100000 }),
    duration: `PT${faker.number.int({ min: 1, max: 30 })}M${faker.number.int({ min: 0, max: 59 })}S`,
    ...overrides
  };
}

/**
 * Create multiple VideoResults
 */
export function createVideoResults(count: number = 10): VideoResult[] {
  return Array.from({ length: count }, () => createVideoResult());
}

/**
 * Create mock SearchOptions with defaults
 */
export function createSearchOptions(overrides?: Partial<SearchOptions>): SearchOptions {
  return {
    maxResults: 10,
    relevanceLanguage: 'en',
    videoEmbeddable: true,
    videoDuration: 'medium',
    order: 'relevance',
    ...overrides
  };
}

/**
 * Create mock QuotaUsage
 */
export function createQuotaUsage(overrides?: Partial<QuotaUsage>): QuotaUsage {
  const limit = 10000;
  const used = overrides?.used || faker.number.int({ min: 0, max: limit });

  return {
    used,
    limit,
    remaining: limit - used,
    resetTime: faker.date.future(),
    ...overrides
  };
}

/**
 * Create a mock YouTube API search response
 */
export function createYouTubeSearchResponse(itemCount: number = 10) {
  return {
    kind: 'youtube#searchListResponse',
    etag: faker.string.alphanumeric(20),
    nextPageToken: faker.string.alphanumeric(10),
    regionCode: 'US',
    pageInfo: {
      totalResults: faker.number.int({ min: 100, max: 10000 }),
      resultsPerPage: itemCount
    },
    items: Array.from({ length: itemCount }, () => ({
      kind: 'youtube#searchResult',
      etag: faker.string.alphanumeric(20),
      id: {
        kind: 'youtube#video',
        videoId: faker.string.alphanumeric(11)
      },
      snippet: {
        publishedAt: faker.date.past().toISOString(),
        channelId: faker.string.alphanumeric(24),
        title: faker.lorem.sentence(),
        description: faker.lorem.paragraph(),
        thumbnails: {
          default: {
            url: faker.image.url(),
            width: 120,
            height: 90
          },
          medium: {
            url: faker.image.url(),
            width: 320,
            height: 180
          },
          high: {
            url: faker.image.url(),
            width: 480,
            height: 360
          }
        },
        channelTitle: faker.company.name(),
        liveBroadcastContent: 'none'
      }
    }))
  };
}

/**
 * Create a mock API error response
 */
export function createYouTubeErrorResponse(
  code: number = 403,
  reason: string = 'quotaExceeded'
) {
  return {
    error: {
      code,
      message: faker.lorem.sentence(),
      errors: [
        {
          message: faker.lorem.sentence(),
          domain: 'youtube.quota',
          reason
        }
      ]
    }
  };
}

/**
 * Create test API keys
 */
export function createValidApiKey(): string {
  return 'AIzaSy' + faker.string.alphanumeric(33); // Total 39 chars
}

export function createInvalidApiKey(): string {
  return faker.string.alphanumeric(10); // Too short
}

/**
 * Create mock environment variables
 */
export function createYouTubeEnv(overrides?: Record<string, string>) {
  return {
    YOUTUBE_API_KEY: createValidApiKey(),
    YOUTUBE_API_QUOTA_LIMIT: '10000',
    YOUTUBE_API_RATE_LIMIT: '100',
    YOUTUBE_API_RATE_WINDOW: '100000',
    YOUTUBE_API_TIMEOUT: '30000',
    NODE_ENV: 'test',
    ...overrides
  };
}

/**
 * Create timestamps for rate limiting tests
 */
export function createTimestamps(count: number, intervalMs: number = 1000): number[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => now - (i * intervalMs));
}

/**
 * Create mock cache data for quota tracking
 */
export function createQuotaCache(used: number = 0) {
  const resetTime = new Date();
  resetTime.setHours(24, 0, 0, 0); // Next midnight

  return {
    used,
    limit: 10000,
    resetTime: resetTime.toISOString()
  };
}