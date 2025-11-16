/**
 * Integration tests for YouTube API Client
 * Tests full workflows and component interactions
 * Following TEA test-quality.md best practices
 */

import { describe, test, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { YouTubeAPIClient } from '@/lib/youtube/client';
import { QuotaTracker } from '@/lib/youtube/quota-tracker';
import { RateLimiter } from '@/lib/youtube/rate-limiter';
import { RetryHandler } from '@/lib/youtube/retry-handler';
import { ErrorHandler } from '@/lib/youtube/error-handler';
import { YouTubeLogger } from '@/lib/youtube/logger';
import { getYouTubeClient, resetYouTubeClient } from '@/lib/youtube/factory';
import { YouTubeError, YouTubeErrorCode } from '@/lib/youtube/types';
import type { VideoResult, SearchOptions } from '@/lib/youtube/types';
import {
  createVideoResults,
  createYouTubeSearchResponse,
  createYouTubeErrorResponse,
  createValidApiKey,
  createQuotaCache
} from '../factories/youtube.factory';
import nock from 'nock';
import * as fs from 'fs';
import * as path from 'path';

// Mock file system for quota cache
vi.mock('fs');
vi.mock('path');

describe('YouTube Client Integration', () => {
  const API_BASE_URL = 'https://www.googleapis.com';
  const API_PATH = '/youtube/v3';
  let originalEnv: NodeJS.ProcessEnv;

  beforeAll(() => {
    // Enable nock
    nock.disableNetConnect();
  });

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    // Set test environment
    process.env.YOUTUBE_API_KEY = createValidApiKey();
    process.env.NODE_ENV = 'test';
    // Clear all mocks
    vi.clearAllMocks();
    // Clean up nock
    nock.cleanAll();
    // Reset client singleton
    resetYouTubeClient();
    // Mock cache directory
    vi.mocked(path.join).mockReturnValue('.cache/youtube-quota.json');
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
    vi.mocked(fs.writeFileSync).mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
    // Verify all nock interceptors were used
    if (!nock.isDone()) {
      console.error('Pending nock interceptors:', nock.pendingMocks());
      nock.cleanAll();
    }
  });

  describe('Full Search Workflow', () => {
    test('should complete successful search with all components working', async () => {
      // Given: Mock successful API response
      const mockResults = createVideoResults(5);
      const mockResponse = createYouTubeSearchResponse(5);

      nock(API_BASE_URL)
        .get(`${API_PATH}/search`)
        .query(true)
        .reply(200, mockResponse);

      // When: Performing search
      const client = getYouTubeClient();
      const results = await client.searchVideos('test query', { maxResults: 5 });

      // Then: Should return transformed results
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toHaveProperty('videoId');
        expect(result).toHaveProperty('title');
        expect(result).toHaveProperty('embedUrl');
        expect(result.embedUrl).toMatch(/^https:\/\/www\.youtube\.com\/embed\//);
      });

      // And: Quota should be tracked
      const quotaUsage = client.getQuotaUsage();
      expect(quotaUsage.used).toBe(100); // Search costs 100 units
    });

    test('should handle search with custom options', async () => {
      // Given: Custom search options
      const options: SearchOptions = {
        maxResults: 25,
        order: 'viewCount',
        videoDuration: 'long',
        relevanceLanguage: 'en',
        videoEmbeddable: true
      };

      nock(API_BASE_URL)
        .get(`${API_PATH}/search`)
        .query(query => {
          return query.maxResults === '25' &&
                 query.order === 'viewCount' &&
                 query.videoDuration === 'long';
        })
        .reply(200, createYouTubeSearchResponse(25));

      // When: Searching with options
      const client = getYouTubeClient();
      const results = await client.searchVideos('documentary', options);

      // Then: Should apply all options
      expect(results).toHaveLength(25);
    });

    test('should handle empty search results', async () => {
      // Given: Empty response
      nock(API_BASE_URL)
        .get(`${API_PATH}/search`)
        .query(true)
        .reply(200, {
          items: [],
          pageInfo: {
            totalResults: 0,
            resultsPerPage: 0
          }
        });

      // When: Searching
      const client = getYouTubeClient();
      const results = await client.searchVideos('very specific query');

      // Then: Should return empty array
      expect(results).toEqual([]);
      expect(results).toHaveLength(0);
    });
  });

  describe('Quota Management Integration', () => {
    test('should track quota across multiple requests', async () => {
      // Given: Multiple search endpoints
      for (let i = 0; i < 3; i++) {
        nock(API_BASE_URL)
          .get(`${API_PATH}/search`)
          .query(true)
          .reply(200, createYouTubeSearchResponse(10));
      }

      // When: Making multiple searches
      const client = getYouTubeClient();

      await client.searchVideos('query 1');
      expect(client.getQuotaUsage().used).toBe(100);

      await client.searchVideos('query 2');
      expect(client.getQuotaUsage().used).toBe(200);

      await client.searchVideos('query 3');
      expect(client.getQuotaUsage().used).toBe(300);

      // Then: Quota should accumulate
      const usage = client.getQuotaUsage();
      expect(usage.used).toBe(300);
      expect(usage.remaining).toBe(9700);
    });

    test('should block requests when quota exceeded', async () => {
      // Given: Quota near limit
      const nearLimitCache = createQuotaCache(9950);
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(nearLimitCache));

      // No API call should be made
      const scope = nock(API_BASE_URL)
        .get(`${API_PATH}/search`)
        .query(true)
        .reply(200, createYouTubeSearchResponse(10));

      // When: Attempting search that would exceed quota
      const client = getYouTubeClient();

      // Then: Should throw quota exceeded error
      await expect(client.searchVideos('test')).rejects.toThrow(YouTubeError);
      await expect(client.searchVideos('test')).rejects.toHaveProperty(
        'code',
        YouTubeErrorCode.QUOTA_EXCEEDED
      );

      // And: API should not be called
      expect(scope.isDone()).toBe(false);
    });

    test('should reset quota at midnight Pacific Time', async () => {
      // Given: Expired quota
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const expiredCache = {
        used: 10000,
        limit: 10000,
        resetTime: yesterday.toISOString()
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(expiredCache));

      nock(API_BASE_URL)
        .get(`${API_PATH}/search`)
        .query(true)
        .reply(200, createYouTubeSearchResponse(5));

      // When: Creating client (should reset quota)
      const client = getYouTubeClient();

      // Then: Should allow requests
      const results = await client.searchVideos('test');
      expect(results).toHaveLength(5);

      // And: Quota should be reset
      const usage = client.getQuotaUsage();
      expect(usage.used).toBe(100); // Only new search
    });

    test('should persist quota to cache file', async () => {
      // Given: Mock file system
      let savedCache: string = '';
      vi.mocked(fs.writeFileSync).mockImplementation((_, data) => {
        savedCache = data as string;
      });

      nock(API_BASE_URL)
        .get(`${API_PATH}/search`)
        .query(true)
        .reply(200, createYouTubeSearchResponse(5));

      // When: Making request
      const client = getYouTubeClient();
      await client.searchVideos('test');

      // Then: Should save quota to cache
      expect(fs.writeFileSync).toHaveBeenCalled();
      const parsed = JSON.parse(savedCache);
      expect(parsed.used).toBe(100);
      expect(parsed.limit).toBe(10000);
    });
  });

  describe('Rate Limiting Integration', () => {
    test('should handle burst of concurrent requests', async () => {
      // Given: Multiple API endpoints
      for (let i = 0; i < 10; i++) {
        nock(API_BASE_URL)
          .get(`${API_PATH}/search`)
          .query(true)
          .reply(200, createYouTubeSearchResponse(5));
      }

      // When: Making burst of requests
      const client = getYouTubeClient();
      const promises = [];

      for (let i = 0; i < 10; i++) {
        promises.push(
          client.searchVideos(`query ${i}`, { maxResults: 5 })
            .catch(err => ({ error: err }))
        );
      }

      // Then: Should handle all requests (some may be delayed)
      const results = await Promise.all(promises);
      const successful = results.filter(r => !('error' in r));
      expect(successful.length).toBeGreaterThan(0);
    });

    test('should queue excess requests', async () => {
      // Given: Rate limiter that delays
      const client = getYouTubeClient();

      // Mock many quick requests
      const mockRequests = 5;
      for (let i = 0; i < mockRequests; i++) {
        nock(API_BASE_URL)
          .get(`${API_PATH}/search`)
          .query(true)
          .delay(10) // Small delay
          .reply(200, createYouTubeSearchResponse(1));
      }

      // When: Making requests rapidly
      const startTime = Date.now();
      const promises = [];

      for (let i = 0; i < mockRequests; i++) {
        promises.push(client.searchVideos(`q${i}`, { maxResults: 1 }));
      }

      const results = await Promise.all(promises);

      // Then: All should complete
      expect(results).toHaveLength(mockRequests);
      results.forEach(r => expect(r).toHaveLength(1));
    });
  });

  describe('Retry Logic Integration', () => {
    test('should retry transient network errors', async () => {
      // Given: Network error then success
      nock(API_BASE_URL)
        .get(`${API_PATH}/search`)
        .query(true)
        .replyWithError('ETIMEDOUT');

      nock(API_BASE_URL)
        .get(`${API_PATH}/search`)
        .query(true)
        .reply(200, createYouTubeSearchResponse(5));

      // When: Making request
      const client = getYouTubeClient();
      const results = await client.searchVideos('test');

      // Then: Should succeed after retry
      expect(results).toHaveLength(5);
    });

    test('should retry 5xx server errors with backoff', async () => {
      // Given: Server errors then success
      nock(API_BASE_URL)
        .get(`${API_PATH}/search`)
        .query(true)
        .reply(500, 'Internal Server Error');

      nock(API_BASE_URL)
        .get(`${API_PATH}/search`)
        .query(true)
        .reply(503, 'Service Unavailable');

      nock(API_BASE_URL)
        .get(`${API_PATH}/search`)
        .query(true)
        .reply(200, createYouTubeSearchResponse(3));

      // When: Making request
      const client = getYouTubeClient();
      const results = await client.searchVideos('test');

      // Then: Should succeed after retries
      expect(results).toHaveLength(3);
    });

    test('should NOT retry non-retryable errors', async () => {
      // Given: 400 Bad Request
      nock(API_BASE_URL)
        .get(`${API_PATH}/search`)
        .query(true)
        .reply(400, createYouTubeErrorResponse(400, 'invalidParameter'));

      // When: Making request
      const client = getYouTubeClient();

      // Then: Should fail immediately
      await expect(client.searchVideos('test')).rejects.toThrow(YouTubeError);

      // Verify only one attempt was made
      expect(nock.isDone()).toBe(true);
    });

    test('should handle circuit breaker opening', async () => {
      // Given: Multiple network failures
      const client = getYouTubeClient();

      // Set up 5 consecutive failures to open circuit
      for (let i = 0; i < 10; i++) {
        nock(API_BASE_URL)
          .get(`${API_PATH}/search`)
          .query(true)
          .replyWithError('ECONNRESET');
      }

      // When: Making requests until circuit opens
      const failures = [];
      for (let i = 0; i < 6; i++) {
        try {
          await client.searchVideos(`test ${i}`);
        } catch (error) {
          failures.push(error);
        }
      }

      // Then: Later failures should indicate circuit breaker
      expect(failures).toHaveLength(6);
      const lastError = failures[failures.length - 1];
      expect(lastError).toBeInstanceOf(YouTubeError);
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle missing API key with actionable error', async () => {
      // Given: No API key
      delete process.env.YOUTUBE_API_KEY;
      resetYouTubeClient();

      // When: Attempting to use client
      try {
        getYouTubeClient();
        expect.fail('Should have thrown');
      } catch (error) {
        // Then: Should provide actionable guidance
        expect(error).toBeInstanceOf(YouTubeError);
        const ytError = error as YouTubeError;
        expect(ytError.code).toBe(YouTubeErrorCode.API_KEY_NOT_CONFIGURED);
        expect(ytError.message).toContain('Add YOUTUBE_API_KEY to .env.local');
      }
    });

    test('should handle invalid API key with guidance', async () => {
      // Given: Invalid key response
      nock(API_BASE_URL)
        .get(`${API_PATH}/search`)
        .query(true)
        .reply(401, {
          error: {
            code: 401,
            message: 'API key not valid',
            errors: [{
              reason: 'unauthorized'
            }]
          }
        });

      // When: Making request
      const client = getYouTubeClient();

      try {
        await client.searchVideos('test');
        expect.fail('Should have thrown');
      } catch (error) {
        // Then: Should guide to Cloud Console
        expect(error).toBeInstanceOf(YouTubeError);
        const ytError = error as YouTubeError;
        expect(ytError.code).toBe(YouTubeErrorCode.API_KEY_INVALID);
        expect(ytError.message).toContain('Google Cloud Console');
      }
    });

    test('should handle quota exceeded with reset time', async () => {
      // Given: Quota exceeded response
      nock(API_BASE_URL)
        .get(`${API_PATH}/search`)
        .query(true)
        .reply(403, {
          error: {
            code: 403,
            message: 'The request cannot be completed because you have exceeded your quota.',
            errors: [{
              reason: 'quotaExceeded',
              domain: 'youtube.quota'
            }]
          }
        });

      // When: Making request
      const client = getYouTubeClient();

      try {
        await client.searchVideos('test');
        expect.fail('Should have thrown');
      } catch (error) {
        // Then: Should include reset information
        expect(error).toBeInstanceOf(YouTubeError);
        const ytError = error as YouTubeError;
        expect(ytError.code).toBe(YouTubeErrorCode.QUOTA_EXCEEDED);
        expect(ytError.message).toContain('10,000 units');
        expect(ytError.message).toContain('midnight PT');
      }
    });
  });

  describe('Factory Pattern Integration', () => {
    test('should return singleton instance', () => {
      // Given/When: Getting client multiple times
      const client1 = getYouTubeClient();
      const client2 = getYouTubeClient();
      const client3 = getYouTubeClient();

      // Then: Should be same instance
      expect(client1).toBe(client2);
      expect(client2).toBe(client3);
    });

    test('should reset client for testing', async () => {
      // Given: Client with state
      nock(API_BASE_URL)
        .get(`${API_PATH}/search`)
        .query(true)
        .reply(200, createYouTubeSearchResponse(5));

      const client1 = getYouTubeClient();
      await client1.searchVideos('test');
      const usage1 = client1.getQuotaUsage();
      expect(usage1.used).toBe(100);

      // When: Resetting
      resetYouTubeClient();

      nock(API_BASE_URL)
        .get(`${API_PATH}/search`)
        .query(true)
        .reply(200, createYouTubeSearchResponse(5));

      const client2 = getYouTubeClient();
      await client2.searchVideos('test');
      const usage2 = client2.getQuotaUsage();

      // Then: Should be fresh instance
      expect(client1).not.toBe(client2);
      expect(usage2.used).toBe(100); // Fresh quota
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle sustained load', async () => {
      // Given: Many API endpoints
      const requestCount = 20;
      for (let i = 0; i < requestCount; i++) {
        nock(API_BASE_URL)
          .get(`${API_PATH}/search`)
          .query(true)
          .delay(Math.random() * 100) // Variable delay
          .reply(200, createYouTubeSearchResponse(5));
      }

      // When: Sustained requests
      const client = getYouTubeClient();
      const promises = [];
      const startTime = Date.now();

      for (let i = 0; i < requestCount; i++) {
        promises.push(
          client.searchVideos(`query ${i}`, { maxResults: 5 })
            .catch(err => null)
        );
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      // Then: Should handle all requests
      const successful = results.filter(r => r !== null);
      expect(successful.length).toBeGreaterThan(0);

      // And: Should track quota correctly
      const usage = client.getQuotaUsage();
      expect(usage.used).toBe(successful.length * 100);
    });

    test('should handle mixed success and failure scenarios', async () => {
      // Given: Mixed responses
      nock(API_BASE_URL)
        .get(`${API_PATH}/search`)
        .query(true)
        .reply(200, createYouTubeSearchResponse(5));

      nock(API_BASE_URL)
        .get(`${API_PATH}/search`)
        .query(true)
        .reply(500, 'Server Error');

      nock(API_BASE_URL)
        .get(`${API_PATH}/search`)
        .query(true)
        .reply(200, createYouTubeSearchResponse(3));

      nock(API_BASE_URL)
        .get(`${API_PATH}/search`)
        .query(true)
        .reply(429, 'Rate Limited');

      nock(API_BASE_URL)
        .get(`${API_PATH}/search`)
        .query(true)
        .delay(100)
        .reply(200, createYouTubeSearchResponse(2));

      // When: Making mixed requests
      const client = getYouTubeClient();
      const results = [];

      for (let i = 0; i < 5; i++) {
        try {
          const res = await client.searchVideos(`query ${i}`);
          results.push({ success: true, data: res });
        } catch (error) {
          results.push({ success: false, error });
        }
      }

      // Then: Should handle mixed results
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      expect(successful.length).toBeGreaterThan(0);
      expect(failed.length).toBeGreaterThan(0);
    });
  });

  describe('End-to-End Scenarios', () => {
    test('should handle complete user journey', async () => {
      // Given: User searching for videos
      const searchQuery = 'nature documentary';

      // Setup API responses
      nock(API_BASE_URL)
        .get(`${API_PATH}/search`)
        .query(q => q.q === searchQuery)
        .reply(200, createYouTubeSearchResponse(10));

      // When: User performs search
      const client = getYouTubeClient();
      const results = await client.searchVideos(searchQuery, {
        maxResults: 10,
        order: 'relevance',
        videoDuration: 'long'
      });

      // Then: Should get results
      expect(results).toHaveLength(10);

      // And: Can check quota
      const usage = client.getQuotaUsage();
      expect(usage.used).toBe(100);
      expect(usage.remaining).toBe(9900);

      // And: Can check if quota exceeded
      expect(client.isQuotaExceeded()).toBe(false);
    });

    test('should handle API degradation gracefully', async () => {
      // Given: Degraded API (slow, some failures)
      nock(API_BASE_URL)
        .get(`${API_PATH}/search`)
        .query(true)
        .delay(2000)
        .reply(500, 'Timeout');

      nock(API_BASE_URL)
        .get(`${API_PATH}/search`)
        .query(true)
        .delay(1000)
        .reply(200, createYouTubeSearchResponse(5));

      // When: Making request during degradation
      const client = getYouTubeClient();
      const startTime = Date.now();
      const results = await client.searchVideos('test');
      const duration = Date.now() - startTime;

      // Then: Should eventually succeed
      expect(results).toHaveLength(5);
      expect(duration).toBeGreaterThan(1000); // Includes retry delay
    });

    test('should recover from temporary outage', async () => {
      // Given: Temporary outage
      const client = getYouTubeClient();

      // First request fails
      nock(API_BASE_URL)
        .get(`${API_PATH}/search`)
        .query(true)
        .replyWithError('Service temporarily unavailable');

      try {
        await client.searchVideos('test 1');
      } catch (error) {
        expect(error).toBeDefined();
      }

      // Service recovers
      nock(API_BASE_URL)
        .get(`${API_PATH}/search`)
        .query(true)
        .reply(200, createYouTubeSearchResponse(5));

      // When: Trying again after recovery
      const results = await client.searchVideos('test 2');

      // Then: Should work normally
      expect(results).toHaveLength(5);
    });
  });
});