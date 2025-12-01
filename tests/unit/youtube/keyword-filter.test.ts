/**
 * Unit Tests for Keyword Filtering
 * Story 3.7: Computer Vision Content Filtering
 *
 * Tests for global keyword filtering (AC33) and priority boosting (AC34):
 * - Filter out reaction/commentary/vlog content
 * - Prioritize stock footage/cinematic/4K indicators
 *
 * Test IDs: 3.7-UNIT-041 to 3.7-UNIT-055
 * Priority: P0 (Critical)
 * Risk Mitigation: R-005 (Content Quality)
 */

import { describe, it, expect, vi } from 'vitest';
import {
  filterByKeywords,
  calculatePriorityBoost,
} from '@/lib/youtube/filter-results';
import type { VideoResult } from '@/lib/youtube/types';

// ============================================================================
// Test Factories
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
    duration: overrides.duration || '60',
    ...overrides
  };
}

// ============================================================================
// AC33: Filter Out Reaction/Commentary Content
// ============================================================================

describe('filterByKeywords - AC33 Negative Filtering', () => {
  /**
   * [3.7-UNIT-041] Filter reaction videos
   */
  describe('[3.7-UNIT-041] Filter Reaction Videos', () => {
    it('should filter videos with "reaction" in title (AC33)', () => {
      // Given: Videos including reaction content
      const videos = [
        createMockVideo({ videoId: 'v1', title: 'My Reaction to Game Trailer' }),
        createMockVideo({ videoId: 'v2', title: 'Pure Gameplay Footage' }),
        createMockVideo({ videoId: 'v3', title: 'He Reacts to New Update' }),
      ];

      // When: Filtering
      const filtered = filterByKeywords(videos);

      // Then: Reaction videos should be removed
      expect(filtered).toHaveLength(1);
      expect(filtered[0].videoId).toBe('v2');
    });

    it('should be case-insensitive for "reaction" (AC33)', () => {
      // Given: Various cases
      const videos = [
        createMockVideo({ videoId: 'v1', title: 'REACTION Video' }),
        createMockVideo({ videoId: 'v2', title: 'Reaction Compilation' }),
        createMockVideo({ videoId: 'v3', title: 'Clean footage' }),
      ];

      // When: Filtering
      const filtered = filterByKeywords(videos);

      // Then: All reaction variants should be filtered
      expect(filtered).toHaveLength(1);
      expect(filtered[0].videoId).toBe('v3');
    });
  });

  /**
   * [3.7-UNIT-042] Filter commentary videos
   */
  describe('[3.7-UNIT-042] Filter Commentary Videos', () => {
    it('should filter videos with "commentary" in title (AC33)', () => {
      // Given: Videos with commentary
      const videos = [
        createMockVideo({ videoId: 'v1', title: 'Gameplay with Commentary' }),
        createMockVideo({ videoId: 'v2', title: 'Cinematic 4K Footage' }),
      ];

      // When: Filtering
      const filtered = filterByKeywords(videos);

      // Then: Commentary video should be removed
      expect(filtered).toHaveLength(1);
      expect(filtered[0].videoId).toBe('v2');
    });

    it('should KEEP videos with "no commentary" (negated pattern)', () => {
      // Given: Videos with negated commentary patterns
      const videos = [
        createMockVideo({ videoId: 'v1', title: 'Gameplay No Commentary' }),
        createMockVideo({ videoId: 'v2', title: 'No Commentary Walkthrough' }),
        createMockVideo({ videoId: 'v3', title: 'Dark Souls Sorcerer Run No Commentary #1' }),
        createMockVideo({ videoId: 'v4', title: 'Without Commentary Gameplay' }),
      ];

      // When: Filtering
      const filtered = filterByKeywords(videos);

      // Then: All "no commentary" videos should be KEPT
      expect(filtered).toHaveLength(4);
      expect(filtered.map(v => v.videoId)).toEqual(['v1', 'v2', 'v3', 'v4']);
    });

    it('should filter videos with both negated and non-negated commentary', () => {
      // Given: Videos with both patterns
      const videos = [
        createMockVideo({ videoId: 'v1', title: 'Gameplay with Commentary' }), // Filter
        createMockVideo({ videoId: 'v2', title: 'No Commentary Boss Fight' }), // Keep
        createMockVideo({ videoId: 'v3', title: 'My Commentary on No Commentary Videos' }), // Filter - has "My Commentary"
      ];

      // When: Filtering
      const filtered = filterByKeywords(videos);

      // Then: Only pure "no commentary" video should pass
      expect(filtered).toHaveLength(1);
      expect(filtered[0].videoId).toBe('v2');
    });
  });

  /**
   * [3.7-UNIT-043] Filter vlog content
   */
  describe('[3.7-UNIT-043] Filter Vlog Content', () => {
    it('should filter videos with "vlog" in title (AC33)', () => {
      // Given: Vlog videos
      const videos = [
        createMockVideo({ videoId: 'v1', title: 'Travel Vlog Paris' }),
        createMockVideo({ videoId: 'v2', title: 'Daily Vlog #123' }),
        createMockVideo({ videoId: 'v3', title: 'Paris City Footage 4K' }),
      ];

      // When: Filtering
      const filtered = filterByKeywords(videos);

      // Then: Vlogs should be removed
      expect(filtered).toHaveLength(1);
      expect(filtered[0].videoId).toBe('v3');
    });
  });

  /**
   * [3.7-UNIT-044] Filter review content
   */
  describe('[3.7-UNIT-044] Filter Review Content', () => {
    it('should filter videos with "review" in title (AC33)', () => {
      // Given: Review videos
      const videos = [
        createMockVideo({ videoId: 'v1', title: 'Game Review 2024' }),
        createMockVideo({ videoId: 'v2', title: 'Honest Review - Worth It?' }),
        createMockVideo({ videoId: 'v3', title: 'Stock Footage Collection' }),
      ];

      // When: Filtering
      const filtered = filterByKeywords(videos);

      // Then: Reviews should be removed
      expect(filtered).toHaveLength(1);
      expect(filtered[0].videoId).toBe('v3');
    });
  });

  /**
   * [3.7-UNIT-045] Filter "my thoughts" content
   */
  describe('[3.7-UNIT-045] Filter Opinion Content', () => {
    it('should filter videos with "my thoughts" in title (AC33)', () => {
      // Given: Opinion videos
      const videos = [
        createMockVideo({ videoId: 'v1', title: 'My Thoughts on the New Update' }),
        createMockVideo({ videoId: 'v2', title: 'Nature Documentary Footage' }),
      ];

      // When: Filtering
      const filtered = filterByKeywords(videos);

      // Then: Opinion videos should be removed
      expect(filtered).toHaveLength(1);
      expect(filtered[0].videoId).toBe('v2');
    });
  });

  /**
   * [3.7-UNIT-046] Filter by description
   */
  describe('[3.7-UNIT-046] Filter by Description', () => {
    it('should filter based on description content (AC33)', () => {
      // Given: Clean title but problematic description
      const videos = [
        createMockVideo({
          videoId: 'v1',
          title: 'Game Footage',
          description: 'My reaction to the new game update'
        }),
        createMockVideo({
          videoId: 'v2',
          title: 'Clean Footage',
          description: 'High quality cinematic B-roll'
        }),
      ];

      // When: Filtering
      const filtered = filterByKeywords(videos);

      // Then: Should filter based on description
      expect(filtered).toHaveLength(1);
      expect(filtered[0].videoId).toBe('v2');
    });
  });

  /**
   * [3.7-UNIT-047] Filter tier list and ranking
   */
  describe('[3.7-UNIT-047] Filter Tier List Content', () => {
    it('should filter videos with "tier list" or "ranking" (AC33)', () => {
      // Given: Tier list videos
      const videos = [
        createMockVideo({ videoId: 'v1', title: 'Ultimate Tier List 2024' }),
        createMockVideo({ videoId: 'v2', title: 'Character Ranking Guide' }),
        createMockVideo({ videoId: 'v3', title: 'Gameplay Walkthrough' }),
      ];

      // When: Filtering
      const filtered = filterByKeywords(videos);

      // Then: Tier lists should be removed
      expect(filtered).toHaveLength(1);
      expect(filtered[0].videoId).toBe('v3');
    });
  });

  /**
   * [3.7-UNIT-048] Filter explained content
   */
  describe('[3.7-UNIT-048] Filter Explained Content', () => {
    it('should filter videos with "explained" (AC33)', () => {
      // Given: Explained videos
      const videos = [
        createMockVideo({ videoId: 'v1', title: 'Lore Explained' }),
        createMockVideo({ videoId: 'v2', title: 'Raw Gameplay Footage' }),
      ];

      // When: Filtering
      const filtered = filterByKeywords(videos);

      // Then: Explained videos should be removed
      expect(filtered).toHaveLength(1);
      expect(filtered[0].videoId).toBe('v2');
    });
  });

  /**
   * [3.7-UNIT-049] Preserve clean videos
   */
  describe('[3.7-UNIT-049] Preserve Clean Videos', () => {
    it('should preserve videos without filter patterns (AC33)', () => {
      // Given: Clean videos
      const videos = [
        createMockVideo({ videoId: 'v1', title: 'City Time Lapse 4K' }),
        createMockVideo({ videoId: 'v2', title: 'Nature Documentary Footage' }),
        createMockVideo({ videoId: 'v3', title: 'Cinematic Drone Shots' }),
        createMockVideo({ videoId: 'v4', title: 'Abstract Motion Graphics' }),
      ];

      // When: Filtering
      const filtered = filterByKeywords(videos);

      // Then: All clean videos should pass
      expect(filtered).toHaveLength(4);
    });
  });
});

// ============================================================================
// AC34: Prioritize B-Roll Indicators
// ============================================================================

describe('calculatePriorityBoost - AC34 Positive Prioritization', () => {
  /**
   * [3.7-UNIT-050] Boost stock footage
   */
  describe('[3.7-UNIT-050] Boost Stock Footage', () => {
    it('should add boost for "stock footage" in title (AC34)', () => {
      // Given: Video with stock footage indicator
      const video = createMockVideo({ title: 'City Stock Footage 4K' });

      // When: Calculating boost
      const boost = calculatePriorityBoost(video);

      // Then: Should have positive boost
      expect(boost).toBeGreaterThan(0);
    });
  });

  /**
   * [3.7-UNIT-051] Boost cinematic
   */
  describe('[3.7-UNIT-051] Boost Cinematic', () => {
    it('should add boost for "cinematic" in title (AC34)', () => {
      // Given: Cinematic video
      const video = createMockVideo({ title: 'Cinematic Mountain Views' });

      // When: Calculating boost
      const boost = calculatePriorityBoost(video);

      // Then: Should have positive boost
      expect(boost).toBeGreaterThan(0);
    });
  });

  /**
   * [3.7-UNIT-052] Boost 4K
   */
  describe('[3.7-UNIT-052] Boost 4K', () => {
    it('should add boost for "4k" in title (AC34)', () => {
      // Given: 4K video
      const video = createMockVideo({ title: 'Nature 4K Video' });

      // When: Calculating boost
      const boost = calculatePriorityBoost(video);

      // Then: Should have positive boost
      expect(boost).toBeGreaterThan(0);
    });
  });

  /**
   * [3.7-UNIT-053] Boost no commentary
   */
  describe('[3.7-UNIT-053] Boost No Commentary', () => {
    it('should add boost for "no commentary" in title (AC34)', () => {
      // Given: No commentary video
      const video = createMockVideo({ title: 'Gameplay No Commentary' });

      // When: Calculating boost
      const boost = calculatePriorityBoost(video);

      // Then: Should have positive boost
      expect(boost).toBeGreaterThan(0);
    });
  });

  /**
   * [3.7-UNIT-054] Cumulative boost
   */
  describe('[3.7-UNIT-054] Cumulative Boost', () => {
    it('should accumulate boost for multiple indicators (AC34)', () => {
      // Given: Video with multiple indicators
      const singleIndicator = createMockVideo({ title: 'Stock Footage' });
      const multipleIndicators = createMockVideo({ title: 'Cinematic Stock Footage 4K' });

      // When: Calculating boosts
      const singleBoost = calculatePriorityBoost(singleIndicator);
      const multiBoost = calculatePriorityBoost(multipleIndicators);

      // Then: Multiple indicators should have higher boost
      expect(multiBoost).toBeGreaterThan(singleBoost);
    });
  });

  /**
   * [3.7-UNIT-055] No boost for generic videos
   */
  describe('[3.7-UNIT-055] No Boost for Generic Videos', () => {
    it('should return 0 boost for videos without indicators (AC34)', () => {
      // Given: Generic video
      const video = createMockVideo({ title: 'Random Video Title' });

      // When: Calculating boost
      const boost = calculatePriorityBoost(video);

      // Then: Should have no boost
      expect(boost).toBe(0);
    });
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Keyword Filter Edge Cases', () => {
  it('should handle empty results array', () => {
    const filtered = filterByKeywords([]);
    expect(filtered).toHaveLength(0);
  });

  it('should handle videos with undefined title', () => {
    const videos = [
      createMockVideo({ title: undefined as any }),
    ];

    // Should not throw
    expect(() => filterByKeywords(videos)).not.toThrow();
  });

  it('should handle videos with undefined description', () => {
    const videos = [
      createMockVideo({ description: undefined as any }),
    ];

    // Should not throw
    expect(() => filterByKeywords(videos)).not.toThrow();
  });

  it('should handle boost calculation with empty title', () => {
    const video = createMockVideo({ title: '' });
    const boost = calculatePriorityBoost(video);

    expect(boost).toBe(0);
  });
});
