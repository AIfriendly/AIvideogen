/**
 * Filter Configuration Module
 *
 * Provides filtering preferences and quality thresholds for YouTube video results.
 * This module exports a singleton configuration with default values optimized for
 * high-quality content filtering.
 *
 * Story 3.4 - Task 6: Filter Configuration
 */

/**
 * Filter configuration interface
 *
 * Defines all configurable parameters for video filtering and ranking.
 */
export interface FilterConfig {
  /**
   * Maximum number of emojis allowed in video title
   * Default: 5
   * Videos with more emojis are considered spam and filtered out
   */
  maxEmojisInTitle: number;

  /**
   * Maximum percentage of title that can be uppercase (0-100)
   * Default: 50 (50%)
   * Videos with more than 50% uppercase characters are considered spam
   */
  maxCapsPercentage: number;

  /**
   * Maximum number of consecutive punctuation marks allowed
   * Default: 10
   * Prevents spam titles like "AMAZING!!!!!!!!!!!!!"
   */
  maxConsecutivePunctuation: number;

  /**
   * Minimum duration ratio multiplier (relative to scene duration)
   * Default: 1 (1x scene duration)
   * Example: 30s scene → minimum 30s video
   */
  durationRatioMin: number;

  /**
   * Maximum duration ratio multiplier (relative to scene duration)
   * Default: 3 (3x scene duration)
   * Example: 30s scene → maximum 90s video (if under cap)
   */
  durationRatioMax: number;

  /**
   * Absolute maximum video duration in seconds
   * Default: 300 (5 minutes)
   * Enforced regardless of scene duration to prevent downloading very long videos
   */
  durationCapSeconds: number;

  /**
   * Maximum number of video suggestions to return per scene
   * Default: 8
   * Videos are ranked and limited to top N results
   */
  maxSuggestionsPerScene: number;

  /**
   * Enable multi-tier fallback logic
   * Default: true
   * If strict filtering returns < 3 results, progressively relax constraints
   */
  fallbackEnabled: boolean;

  /**
   * Minimum number of results required to avoid fallback
   * Default: 3
   * If fewer results, trigger next fallback tier
   */
  fallbackThreshold: number;

  /**
   * Duration match weight in quality score calculation
   * Default: 0.6 (60%)
   */
  durationMatchWeight: number;

  /**
   * Relevance weight in quality score calculation
   * Default: 0.4 (40%)
   */
  relevanceWeight: number;
}

/**
 * Default filter configuration
 *
 * Optimized values based on Story 3.4 requirements and architecture specifications.
 * These values provide a balance between strict quality filtering and result availability.
 */
export const DEFAULT_FILTER_CONFIG: FilterConfig = {
  maxEmojisInTitle: 5,
  maxCapsPercentage: 50,
  maxConsecutivePunctuation: 10,
  durationRatioMin: 1,
  durationRatioMax: 3,
  durationCapSeconds: 300, // 5 minutes
  maxSuggestionsPerScene: 8,
  fallbackEnabled: true,
  fallbackThreshold: 3,
  durationMatchWeight: 0.6,
  relevanceWeight: 0.4,
};

/**
 * Get current filter configuration
 *
 * Returns the active filter configuration. For MVP, this returns the default
 * configuration as a singleton. Post-MVP enhancement could add runtime updates
 * via Zustand store or per-user preferences.
 *
 * @returns FilterConfig object with current settings
 */
export function getFilterConfig(): FilterConfig {
  return DEFAULT_FILTER_CONFIG;
}
