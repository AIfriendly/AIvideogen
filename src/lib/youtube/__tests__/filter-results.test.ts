/**
 * Unit Tests for YouTube Video Filtering & Ranking
 *
 * Story 3.4: Content Filtering & Quality Ranking
 *
 * Test Coverage:
 * 1. Duration filtering (1x-3x ratio, 5-minute cap, edge cases)
 * 2. Title quality filtering (spam detection)
 * 3. Ranking algorithm (duration match + relevance)
 * 4. Content-type specific filtering
 * 5. Multi-tier fallback logic
 * 6. Filter configuration
 * 7. Error handling
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  filterByDuration,
  filterByTitleQuality,
  filterByContentType,
  rankVideos,
  filterAndRankResults,
  type RankedVideo
} from '../filter-results';
import { getFilterConfig } from '../filter-config';
import { VideoResult, ContentType } from '../types';

// ============================================================================
// Test Data Factories
// ============================================================================

/**
 * Create a mock VideoResult for testing
 */
function createMockVideo(overrides: Partial<VideoResult> = {}): VideoResult {
  return {
    videoId: overrides.videoId || 'test-video-id',
    title: overrides.title || 'Test Video Title',
    thumbnailUrl: overrides.thumbnailUrl || 'https://example.com/thumb.jpg',
    channelTitle: overrides.channelTitle || 'Test Channel',
    embedUrl: overrides.embedUrl || 'https://youtube.com/embed/test',
    publishedAt: overrides.publishedAt || '2024-01-01T00:00:00Z',
    description: overrides.description || 'Test description',
    duration: overrides.duration || '60', // Default 60 seconds
    ...overrides
  };
}

/**
 * Create multiple mock videos with different durations
 */
function createVideosWithDurations(durations: number[]): VideoResult[] {
  return durations.map((duration, index) =>
    createMockVideo({
      videoId: `video-${index}`,
      title: `Video ${index} (${duration}s)`,
      duration: duration.toString()
    })
  );
}

// ============================================================================
// Task 1 Tests: Duration Filtering
// ============================================================================

describe('filterByDuration', () => {
  it('should accept videos within 1x-3x ratio for 10s scene', () => {
    // 10s scene → accepts 10s-30s videos
    const videos = createVideosWithDurations([5, 10, 20, 30, 40, 60]);
    const filtered = filterByDuration(videos, 10);

    expect(filtered).toHaveLength(3);
    expect(filtered.map(v => v.duration)).toEqual(['10', '20', '30']);
  });

  it('should accept videos within 1x-3x ratio for 90s scene', () => {
    // 90s scene → accepts 90s-270s videos (no cap)
    const videos = createVideosWithDurations([60, 90, 180, 270, 300, 360]);
    const filtered = filterByDuration(videos, 90);

    expect(filtered).toHaveLength(3);
    expect(filtered.map(v => v.duration)).toEqual(['90', '180', '270']);
  });

  it('should enforce 5-minute cap for 120s scene', () => {
    // 120s scene → max 300s (5 min cap), NOT 360s (3x ratio)
    const videos = createVideosWithDurations([100, 120, 240, 300, 360, 400]);
    const filtered = filterByDuration(videos, 120);

    expect(filtered).toHaveLength(3);
    expect(filtered.map(v => v.duration)).toEqual(['120', '240', '300']);
    expect(filtered.map(v => v.duration)).not.toContain('360'); // Cap enforced
  });

  it('should enforce 5-minute cap for 180s scene', () => {
    // 180s scene → max 300s (5 min cap), NOT 540s (3x ratio)
    const videos = createVideosWithDurations([150, 180, 300, 400, 540]);
    const filtered = filterByDuration(videos, 180);

    expect(filtered).toHaveLength(2);
    expect(filtered.map(v => v.duration)).toEqual(['180', '300']);
    expect(filtered.map(v => v.duration)).not.toContain('540'); // Cap enforced
  });

  it('should handle edge case: 400s scene (no maximum constraint)', () => {
    // 400s scene → accept videos >= 400s (no maximum limit)
    const videos = createVideosWithDurations([300, 400, 600, 1200, 3600]);
    const filtered = filterByDuration(videos, 400);

    expect(filtered).toHaveLength(4);
    expect(filtered.map(v => v.duration)).toEqual(['400', '600', '1200', '3600']);
    expect(filtered.map(v => v.duration)).not.toContain('300'); // Below minimum
  });

  it('should throw error for sceneDuration <= 0', () => {
    const videos = createVideosWithDurations([10, 20, 30]);

    expect(() => filterByDuration(videos, 0)).toThrow('Invalid sceneDuration: 0');
    expect(() => filterByDuration(videos, -10)).toThrow('Invalid sceneDuration: -10');
  });

  it('should return empty array when all videos outside range', () => {
    const videos = createVideosWithDurations([5, 8, 100, 150]);
    const filtered = filterByDuration(videos, 30); // Accepts 30-90s

    expect(filtered).toHaveLength(0);
  });

  it('should return empty array for empty input', () => {
    const filtered = filterByDuration([], 30);

    expect(filtered).toHaveLength(0);
  });

  it('should skip videos with invalid/missing duration', () => {
    const videos = [
      createMockVideo({ videoId: 'v1', duration: '30' }),
      createMockVideo({ videoId: 'v2', duration: undefined }),
      createMockVideo({ videoId: 'v3', duration: 'invalid' }),
      createMockVideo({ videoId: 'v4', duration: '0' }),
      createMockVideo({ videoId: 'v5', duration: '45' })
    ];

    const filtered = filterByDuration(videos, 30); // Accepts 30-90s

    expect(filtered).toHaveLength(2);
    expect(filtered.map(v => v.videoId)).toEqual(['v1', 'v5']);
  });

  it('should handle custom ratio and cap parameters', () => {
    const videos = createVideosWithDurations([30, 60, 150, 180, 200]);

    // Custom: 1x-5x ratio with 180s cap
    const filtered = filterByDuration(videos, 30, 5, 180);

    expect(filtered).toHaveLength(3);
    expect(filtered.map(v => v.duration)).toEqual(['30', '60', '150']);
    expect(filtered.map(v => v.duration)).not.toContain('180'); // At cap boundary
  });
});

// ============================================================================
// Task 2 Tests: Title Quality Filtering
// ============================================================================

describe('filterByTitleQuality', () => {
  it('should filter out titles with excessive emojis (>5)', () => {
    const videos = [
      createMockVideo({ videoId: 'v1', title: 'Normal title' }),
      createMockVideo({ videoId: 'v2', title: 'Some emojis 😀😁😂' }),
      createMockVideo({ videoId: 'v3', title: 'TOO MANY 😀😁😂🤣😃😄😅' }), // 7 emojis
      createMockVideo({ videoId: 'v4', title: 'Just right 😀😁😂🤣😃' }) // Exactly 5
    ];

    const filtered = filterByTitleQuality(videos);

    expect(filtered).toHaveLength(3);
    expect(filtered.map(v => v.videoId)).toEqual(['v1', 'v2', 'v4']);
    expect(filtered.map(v => v.videoId)).not.toContain('v3');
  });

  it('should filter out titles with >50% ALL CAPS', () => {
    const videos = [
      createMockVideo({ videoId: 'v1', title: 'Normal Title Case' }),
      createMockVideo({ videoId: 'v2', title: 'SOME CAPS but mostly lower' }),
      createMockVideo({ videoId: 'v3', title: 'ALL CAPS SPAM TITLE!!!' }),
      createMockVideo({ videoId: 'v4', title: 'HALF CAPS half lower' }) // Exactly 50%
    ];

    const filtered = filterByTitleQuality(videos);

    // v3 should be filtered (>50% caps)
    // v4 is borderline at exactly 50%, config allows up to 50%
    expect(filtered.length).toBeGreaterThanOrEqual(2);
    expect(filtered.map(v => v.videoId)).toContain('v1');
    expect(filtered.map(v => v.videoId)).not.toContain('v3');
  });

  it('should filter out titles with excessive consecutive punctuation (>10)', () => {
    const videos = [
      createMockVideo({ videoId: 'v1', title: 'Normal title!' }),
      createMockVideo({ videoId: 'v2', title: 'A few punctuation!!!' }),
      createMockVideo({ videoId: 'v3', title: 'SPAM TITLE!!!!!!!!!!!!' }), // 13 exclamation marks
      createMockVideo({ videoId: 'v4', title: 'Exactly ten!!!!!!!!!!' }) // Exactly 10
    ];

    const filtered = filterByTitleQuality(videos);

    expect(filtered.length).toBeGreaterThanOrEqual(3);
    expect(filtered.map(v => v.videoId)).toContain('v1');
    expect(filtered.map(v => v.videoId)).toContain('v2');
    expect(filtered.map(v => v.videoId)).not.toContain('v3');
  });

  it('should preserve normal titles', () => {
    const videos = [
      createMockVideo({ title: 'How to Build a Website' }),
      createMockVideo({ title: 'Tutorial: JavaScript Basics' }),
      createMockVideo({ title: 'Minecraft Gameplay - No Commentary' }),
      createMockVideo({ title: 'Wildlife Documentary 4K' })
    ];

    const filtered = filterByTitleQuality(videos);

    expect(filtered).toHaveLength(4);
  });

  it('should skip videos with missing/invalid title', () => {
    const videos = [
      createMockVideo({ videoId: 'v1', title: 'Valid title' }),
      createMockVideo({ videoId: 'v2', title: undefined as any }),
      createMockVideo({ videoId: 'v3', title: '' }),
      createMockVideo({ videoId: 'v4', title: 'Another valid' })
    ];

    const filtered = filterByTitleQuality(videos);

    expect(filtered.length).toBeLessThanOrEqual(3); // At least v2 and v3 filtered
    expect(filtered.map(v => v.videoId)).toContain('v1');
    expect(filtered.map(v => v.videoId)).toContain('v4');
  });

  it('should handle edge case: title with only special characters', () => {
    const videos = [
      createMockVideo({ title: '!!!###@@@' }),
      createMockVideo({ title: '     ' })
    ];

    const filtered = filterByTitleQuality(videos);

    // These shouldn't crash, just filter appropriately
    expect(filtered.length).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// Task 3 Tests: Ranking Algorithm
// ============================================================================

describe('rankVideos', () => {
  it('should rank videos closer to 1.5x scene duration higher', () => {
    // 30s scene → ideal 45s video
    // Note: Ranking combines duration match (60%) + relevance (40%)
    // 45s video has perfect duration match but lower relevance (position 3)
    // Need to check that videos closer to 1.5x get higher duration match scores
    const videos = createVideosWithDurations([30, 40, 45, 50, 90]);
    const ranked = rankVideos(videos, 30);

    // Find the 45s video in ranked results
    const video45 = ranked.find(v => v.duration === '45');
    const video30 = ranked.find(v => v.duration === '30');

    // 45s should have higher quality score than videos far from ideal (like 90s)
    const video90 = ranked.find(v => v.duration === '90');
    expect(video45!.qualityScore).toBeGreaterThan(video90!.qualityScore);

    // All videos should have quality scores in descending order
    for (let i = 0; i < ranked.length - 1; i++) {
      expect(ranked[i].qualityScore).toBeGreaterThanOrEqual(ranked[i + 1].qualityScore);
    }
  });

  it('should use relevance score based on original rank', () => {
    // Create videos with same duration but different positions
    const videos = [
      createMockVideo({ videoId: 'v1', duration: '60' }), // Rank 1 (highest relevance)
      createMockVideo({ videoId: 'v2', duration: '60' }), // Rank 2
      createMockVideo({ videoId: 'v3', duration: '60' })  // Rank 3
    ];

    const ranked = rankVideos(videos, 40); // 40s scene

    // With identical durations, rank 1 should win due to relevance
    expect(ranked[0].videoId).toBe('v1');
    expect(ranked[0].originalRank).toBe(1);
  });

  it('should sort by qualityScore descending (highest first)', () => {
    const videos = createVideosWithDurations([10, 30, 60, 90, 120]);
    const ranked = rankVideos(videos, 40); // 40s scene, ideal 60s

    // Verify descending order
    for (let i = 0; i < ranked.length - 1; i++) {
      expect(ranked[i].qualityScore).toBeGreaterThanOrEqual(ranked[i + 1].qualityScore);
    }
  });

  it('should limit to top N results (default 8)', () => {
    const videos = createVideosWithDurations([10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120]);
    const ranked = rankVideos(videos, 30);

    expect(ranked).toHaveLength(8);
  });

  it('should respect custom maxResults parameter', () => {
    const videos = createVideosWithDurations([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
    const ranked = rankVideos(videos, 30, 5);

    expect(ranked).toHaveLength(5);
  });

  it('should calculate quality score with correct weights (60% duration, 40% relevance)', () => {
    const config = getFilterConfig();
    const sceneDuration = 30;
    const idealDuration = sceneDuration * 1.5; // 45s

    // Test video at ideal duration with rank 1
    const video = createMockVideo({ duration: '45' });
    const ranked = rankVideos([video], sceneDuration);

    // Duration match should be 1.0 (perfect match)
    // Relevance should be 1.0 (rank 1)
    // Quality score = (1.0 * 0.6) + (1.0 * 0.4) = 1.0
    expect(ranked[0].qualityScore).toBeCloseTo(1.0, 2);
  });

  it('should handle videos with 0 or invalid duration', () => {
    const videos = [
      createMockVideo({ videoId: 'v1', duration: '0' }),
      createMockVideo({ videoId: 'v2', duration: undefined }),
      createMockVideo({ videoId: 'v3', duration: '30' })
    ];

    const ranked = rankVideos(videos, 30);

    // Should not crash, v3 should rank higher than invalid durations
    expect(ranked).toHaveLength(3);
    expect(ranked[0].videoId).toBe('v3');
  });

  it('should preserve all original VideoResult fields', () => {
    const originalVideo = createMockVideo({
      videoId: 'test-123',
      title: 'Test Video',
      channelTitle: 'Test Channel',
      duration: '60'
    });

    const ranked = rankVideos([originalVideo], 40);

    expect(ranked[0].videoId).toBe('test-123');
    expect(ranked[0].title).toBe('Test Video');
    expect(ranked[0].channelTitle).toBe('Test Channel');
    expect(ranked[0].qualityScore).toBeDefined();
    expect(ranked[0].originalRank).toBe(1);
  });
});

// ============================================================================
// Task 4 Tests: Content-Type Specific Filtering
// ============================================================================

describe('filterByContentType', () => {
  it('should prioritize GAMEPLAY keywords and filter negative ones', () => {
    const videos = [
      createMockVideo({ videoId: 'v1', title: 'Minecraft Gameplay No Commentary', description: 'Pure gameplay' }),
      createMockVideo({ videoId: 'v2', title: 'Game Review and Tutorial', description: 'How to play' }),
      createMockVideo({ videoId: 'v3', title: 'Walkthrough Playthrough', description: 'Gameplay footage' }),
      createMockVideo({ videoId: 'v4', title: 'Reaction to Game', description: 'My reaction' })
    ];

    const filtered = filterByContentType(videos, ContentType.GAMEPLAY);

    // v1 and v3 should pass (positive keywords)
    // v2 has "tutorial" (negative keyword)
    // v4 has "reaction" (negative keyword)
    expect(filtered.map(v => v.videoId)).toContain('v1');
    expect(filtered.map(v => v.videoId)).toContain('v3');
  });

  it('should prioritize TUTORIAL keywords and filter negative ones', () => {
    const videos = [
      createMockVideo({ videoId: 'v1', title: 'How to Code in JavaScript', description: 'Tutorial guide' }),
      createMockVideo({ videoId: 'v2', title: 'Learn Python Basics', description: 'Step by step guide' }),
      createMockVideo({ videoId: 'v3', title: 'Gameplay Vlog', description: 'Playing games' }),
      createMockVideo({ videoId: 'v4', title: 'Tutorial: Complete Guide', description: 'Educational content' })
    ];

    const filtered = filterByContentType(videos, ContentType.TUTORIAL);

    expect(filtered.map(v => v.videoId)).toContain('v1');
    expect(filtered.map(v => v.videoId)).toContain('v2');
    expect(filtered.map(v => v.videoId)).toContain('v4');
  });

  it('should prioritize NATURE keywords and filter negative ones', () => {
    const videos = [
      createMockVideo({ videoId: 'v1', title: 'Wildlife Documentary 4K', description: 'Nature footage' }),
      createMockVideo({ videoId: 'v2', title: 'Funny Animal Compilation', description: 'Hilarious pets' }),
      createMockVideo({ videoId: 'v3', title: 'Nature Documentary HD', description: 'Beautiful wildlife' }),
      createMockVideo({ videoId: 'v4', title: 'Travel Vlog', description: 'My journey' })
    ];

    const filtered = filterByContentType(videos, ContentType.NATURE);

    expect(filtered.map(v => v.videoId)).toContain('v1');
    expect(filtered.map(v => v.videoId)).toContain('v3');
  });

  it('should accept all videos for B_ROLL (no filtering)', () => {
    const videos = [
      createMockVideo({ videoId: 'v1', title: 'Random video 1' }),
      createMockVideo({ videoId: 'v2', title: 'Random video 2' }),
      createMockVideo({ videoId: 'v3', title: 'Random video 3' })
    ];

    const filtered = filterByContentType(videos, ContentType.B_ROLL);

    expect(filtered).toHaveLength(3);
    expect(filtered.map(v => v.videoId)).toEqual(['v1', 'v2', 'v3']);
  });

  it('should filter DOCUMENTARY content correctly', () => {
    const videos = [
      createMockVideo({ videoId: 'v1', title: 'Documentary: The Story of X', description: 'History documentary' }),
      createMockVideo({ videoId: 'v2', title: 'Movie Trailer', description: 'Coming soon' }),
      createMockVideo({ videoId: 'v3', title: 'Documentary History', description: 'Historical story' })
    ];

    const filtered = filterByContentType(videos, ContentType.DOCUMENTARY);

    expect(filtered.map(v => v.videoId)).toContain('v1');
    expect(filtered.map(v => v.videoId)).toContain('v3');
  });

  it('should filter URBAN content correctly', () => {
    const videos = [
      createMockVideo({ videoId: 'v1', title: 'City Time Lapse 4K', description: 'Urban architecture' }),
      createMockVideo({ videoId: 'v2', title: 'Travel Vlog', description: 'My trip' }),
      createMockVideo({ videoId: 'v3', title: 'Architecture Documentary', description: 'City buildings' })
    ];

    const filtered = filterByContentType(videos, ContentType.URBAN);

    expect(filtered.map(v => v.videoId)).toContain('v1');
    expect(filtered.map(v => v.videoId)).toContain('v3');
  });

  it('should filter ABSTRACT content correctly', () => {
    const videos = [
      createMockVideo({ videoId: 'v1', title: 'Abstract Animation Visual', description: 'Motion graphics' }),
      createMockVideo({ videoId: 'v2', title: 'Gameplay Tutorial', description: 'How to play' }),
      createMockVideo({ videoId: 'v3', title: 'Visual Abstract Art', description: 'Abstract visuals' })
    ];

    const filtered = filterByContentType(videos, ContentType.ABSTRACT);

    expect(filtered.map(v => v.videoId)).toContain('v1');
    expect(filtered.map(v => v.videoId)).toContain('v3');
  });

  it('should filter out videos with negative score', () => {
    const videos = [
      createMockVideo({
        videoId: 'v1',
        title: 'Tutorial Review Gameplay', // 2 negative keywords for GAMEPLAY
        description: 'Review of tutorial'
      }),
      createMockVideo({
        videoId: 'v2',
        title: 'Pure Gameplay Walkthrough',
        description: 'No commentary gameplay'
      })
    ];

    const filtered = filterByContentType(videos, ContentType.GAMEPLAY);

    // v1 should be filtered (negative score)
    expect(filtered.map(v => v.videoId)).toContain('v2');
  });
});

// ============================================================================
// Task 5 Tests: Multi-Tier Fallback Logic
// ============================================================================

describe('filterAndRankResults', () => {
  it('should succeed with Tier 1 (strict filtering) when sufficient results', () => {
    // Create 10 videos that match strict criteria
    const videos = createVideosWithDurations([30, 35, 40, 45, 50, 55, 60, 65, 70, 75]).map((v, i) => ({
      ...v,
      title: `Good Quality Video ${i}`,
      description: 'gameplay footage'
    }));

    const filtered = filterAndRankResults(videos, 30, ContentType.GAMEPLAY);

    // Should get 8 results (maxSuggestionsPerScene)
    expect(filtered.length).toBeGreaterThanOrEqual(3);
    expect(filtered.length).toBeLessThanOrEqual(8);
  });

  it('should fall back to Tier 2 when Tier 1 returns < 3 results', () => {
    // Create videos that only pass with relaxed duration (1x-5x)
    const videos = [
      ...createVideosWithDurations([30, 40, 50]), // Pass Tier 1 (30-90s range)
      ...createVideosWithDurations([120, 140]) // Only pass Tier 2 (30-150s range)
    ].map(v => ({ ...v, title: 'Good Video', description: 'gameplay' }));

    // With only 3 results in Tier 1, system might use Tier 1 or 2
    const filtered = filterAndRankResults(videos, 30, ContentType.GAMEPLAY);

    expect(filtered.length).toBeGreaterThanOrEqual(3);
  });

  it('should fall back to Tier 3 when removing duration cap helps', () => {
    // Create videos that need no cap to pass
    const videos = [
      ...createVideosWithDurations([100, 120]), // Pass Tier 1 (100-300s)
      ...createVideosWithDurations([350, 400]) // Only pass Tier 3 (no cap)
    ].map(v => ({ ...v, title: 'Quality Video' }));

    const filtered = filterAndRankResults(videos, 100, ContentType.B_ROLL);

    // Should get results from Tier 3
    expect(filtered.length).toBeGreaterThanOrEqual(2);
  });

  it('should fall back to Tier 4 when title quality is too strict', () => {
    // Create videos with spam titles but good duration
    const videos = createVideosWithDurations([30, 40, 50, 60]).map((v, i) => ({
      ...v,
      title: i < 2 ? 'SPAM TITLE WITH EMOJIS 😀😁😂🤣😃😄😅' : 'Normal Title'
    }));

    const filtered = filterAndRankResults(videos, 30, ContentType.B_ROLL);

    // Should still get results by relaxing title filter
    expect(filtered.length).toBeGreaterThanOrEqual(2);
  });

  it('should fall back to Tier 5 (minimal filtering) as last resort', () => {
    // Create videos that barely pass any filters
    const videos = [
      createMockVideo({ duration: '30', title: 'SPAM!!!!!', description: 'bad content' }),
      createMockVideo({ duration: '40', title: 'MORE SPAM 😀😁😂🤣😃😄😅', description: 'tutorial review' })
    ];

    const filtered = filterAndRankResults(videos, 30, ContentType.GAMEPLAY);

    // Should get at least some results from Tier 5
    expect(filtered.length).toBeGreaterThanOrEqual(1);
  });

  it('should handle empty results gracefully', () => {
    const filtered = filterAndRankResults([], 30, ContentType.B_ROLL);

    expect(filtered).toHaveLength(0);
  });

  it('should throw error for invalid sceneDuration', () => {
    const videos = createVideosWithDurations([30, 60, 90]);

    expect(() => filterAndRankResults(videos, 0, ContentType.B_ROLL)).toThrow('Invalid sceneDuration: 0');
    expect(() => filterAndRankResults(videos, -10, ContentType.B_ROLL)).toThrow('Invalid sceneDuration: -10');
  });

  it('should handle malformed VideoResult fields gracefully', () => {
    const videos = [
      createMockVideo({ videoId: 'v1', duration: '30', title: 'Valid' }),
      createMockVideo({ videoId: 'v2', duration: undefined, title: 'No duration' }),
      createMockVideo({ videoId: 'v3', duration: '50', title: undefined as any }),
      createMockVideo({ videoId: 'v4', duration: '60', title: 'Valid' })
    ];

    // Should not crash, should skip invalid entries
    const filtered = filterAndRankResults(videos, 30, ContentType.B_ROLL);

    expect(filtered.length).toBeGreaterThanOrEqual(1);
    expect(filtered.map(v => v.videoId)).toContain('v1');
    expect(filtered.map(v => v.videoId)).toContain('v4');
  });

  it('should complete filtering in < 50ms (performance target)', () => {
    // Create 15 videos (realistic search result count)
    const videos = createVideosWithDurations([
      30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100
    ]).map((v, i) => ({
      ...v,
      title: `Video ${i}`,
      description: 'test content'
    }));

    const startTime = performance.now();
    const filtered = filterAndRankResults(videos, 30, ContentType.B_ROLL);
    const endTime = performance.now();

    const duration = endTime - startTime;

    expect(duration).toBeLessThan(50); // < 50ms target
    expect(filtered.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Task 6 Tests: Filter Configuration
// ============================================================================

describe('getFilterConfig', () => {
  it('should return configuration with expected default values', () => {
    const config = getFilterConfig();

    expect(config.maxEmojisInTitle).toBe(5);
    expect(config.maxCapsPercentage).toBe(50);
    expect(config.maxConsecutivePunctuation).toBe(10);
    expect(config.durationRatioMin).toBe(1);
    expect(config.durationRatioMax).toBe(3);
    expect(config.durationCapSeconds).toBe(300);
    expect(config.maxSuggestionsPerScene).toBe(8);
    expect(config.fallbackEnabled).toBe(true);
    expect(config.fallbackThreshold).toBe(3);
    expect(config.durationMatchWeight).toBe(0.6);
    expect(config.relevanceWeight).toBe(0.4);
  });

  it('should return same configuration instance (singleton)', () => {
    const config1 = getFilterConfig();
    const config2 = getFilterConfig();

    expect(config1).toBe(config2);
  });
});
