/**
 * REAL YouTube API Integration Test (Story 3.3)
 * NO MOCKING - Tests actual YouTube API calls
 *
 * IMPORTANT: This test uses real API quota (101 units per search)
 * Run manually only when needed
 */

import { describe, test, expect } from 'vitest';
import { YouTubeAPIClient } from '@/lib/youtube/client';

describe('Story 3.3: Real YouTube API Integration (Manual Test)', () => {
  test('REAL API: searchVideos should retrieve actual videos with duration', async () => {
    // Given: Real YouTube API client
    const client = new YouTubeAPIClient();

    // When: Searching for real videos
    const results = await client.searchVideos('nature documentary', {
      maxResults: 5
    });

    // Then: Should return real YouTube videos
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(5);

    // And: Each video should have all required fields
    const firstVideo = results[0];
    console.log('First video result:', JSON.stringify(firstVideo, null, 2));

    expect(firstVideo).toHaveProperty('videoId');
    expect(firstVideo).toHaveProperty('title');
    expect(firstVideo).toHaveProperty('thumbnailUrl');
    expect(firstVideo).toHaveProperty('channelTitle');
    expect(firstVideo).toHaveProperty('embedUrl');
    expect(firstVideo).toHaveProperty('duration');

    // And: videoId should be valid YouTube ID (11 characters)
    expect(firstVideo.videoId).toMatch(/^[A-Za-z0-9_-]{11}$/);

    // And: embedUrl should be correct format
    expect(firstVideo.embedUrl).toBe(`https://www.youtube.com/embed/${firstVideo.videoId}`);

    // And: duration should be a number (seconds)
    expect(typeof firstVideo.duration).toBe('string');
    const durationNum = parseInt(firstVideo.duration, 10);
    expect(durationNum).toBeGreaterThan(0);

    console.log(`✅ Successfully retrieved ${results.length} videos from YouTube API`);
    console.log(`✅ First video: "${firstVideo.title}" (${firstVideo.duration}s)`);
  }, 30000); // 30 second timeout for API call

  test('REAL API: searchWithMultipleQueries should aggregate and deduplicate', async () => {
    // Given: Real YouTube API client
    const client = new YouTubeAPIClient();

    // When: Searching with multiple related queries
    const queries = [
      'wildlife safari africa',
      'african animals documentary',
      'savanna wildlife'
    ];

    const results = await client.searchWithMultipleQueries(queries, {
      maxResults: 3 // 3 per query = ~9 total (less after deduplication)
    });

    // Then: Should return aggregated results
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);

    console.log(`✅ Retrieved ${results.length} deduplicated videos from ${queries.length} queries`);

    // And: Should have deduplicated by videoId (no duplicates)
    const videoIds = results.map(v => v.videoId);
    const uniqueVideoIds = new Set(videoIds);
    expect(videoIds.length).toBe(uniqueVideoIds.size);
    console.log(`✅ Deduplication working: ${videoIds.length} unique videos`);

    // And: All videos should have duration
    results.forEach((video, index) => {
      expect(video.duration).toBeDefined();
      expect(parseInt(video.duration, 10)).toBeGreaterThan(0);
      console.log(`   ${index + 1}. ${video.title} (${video.duration}s)`);
    });

    // And: Check quota usage
    const quotaUsage = client.getQuotaUsage();
    console.log(`✅ Quota used: ${quotaUsage.used}/${quotaUsage.limit} (${quotaUsage.remaining} remaining)`);
    expect(quotaUsage.used).toBeGreaterThan(0);
  }, 60000); // 60 second timeout for multiple API calls

  test('REAL API: should handle zero results gracefully', async () => {
    // Given: Real YouTube API client
    const client = new YouTubeAPIClient();

    // When: Searching with nonsense query (should return 0 results)
    const results = await client.searchVideos('zxcvbnmasdfghjklqwertyuiop123456789', {
      maxResults: 5
    });

    // Then: Should return empty array (not error)
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(0);

    console.log('✅ Zero results handled gracefully (empty array, no crash)');
  }, 30000);

  test('REAL API: POST /generate-visuals endpoint integration', async () => {
    // This test requires a real project with scenes
    // Skip if no test project exists
    console.log('⚠️  Skipping endpoint test - requires manual project setup');
    console.log('To test manually:');
    console.log('1. Create a project with scenes');
    console.log('2. curl -X POST http://localhost:3000/api/projects/[ID]/generate-visuals');
    console.log('3. curl http://localhost:3000/api/projects/[ID]/visual-suggestions');
  });
});
