/**
 * YouTube Video Filtering & Ranking Module
 *
 * This module provides content filtering and quality ranking for YouTube search results.
 * It implements duration-based filtering, title quality checks, content-type specific
 * filtering, and a multi-tier fallback system to ensure high-quality suggestions.
 *
 * Story 3.4: Content Filtering & Quality Ranking
 *
 * Key Features:
 * - Duration filtering (1x-3x ratio with 5-minute cap)
 * - Title spam detection (emojis, ALL CAPS, excessive punctuation)
 * - Content-type specific keyword filtering
 * - MVP ranking algorithm (duration match + relevance)
 * - 5-tier fallback logic for graceful degradation
 *
 * Performance Target: <50ms for filtering 15 results to 5-8 filtered results
 */

import { VideoResult, ContentType } from './types';
import { getFilterConfig } from './filter-config';

// ============================================================================
// Story 3.7: Global Keyword Filtering (Tier 1)
// ============================================================================

/**
 * Global filter patterns - remove these from ALL content types
 * These patterns indicate low-quality B-roll (commentary, reactions, etc.)
 */
const GLOBAL_FILTER_PATTERNS: string[] = [
  'reaction',
  'reacts',
  'commentary',
  'my thoughts',
  'review',
  'tier list',
  'ranking',
  'explained',
  'vlog'
];

/**
 * Global priority patterns - boost these for ALL content types
 * These patterns indicate high-quality B-roll footage
 */
const GLOBAL_PRIORITY_PATTERNS: string[] = [
  'stock footage',
  'cinematic',
  '4k',
  'no text',
  'gameplay only',
  'no commentary',
  'b-roll',
  'footage'
];

/**
 * Negation prefixes that indicate the keyword should be KEPT, not filtered
 * Example: "no commentary" should KEEP the video, not filter it
 */
const NEGATION_PREFIXES = ['no ', 'without ', 'non-', 'non '];

/**
 * Check if a pattern match is negated (e.g., "no commentary" vs "commentary")
 *
 * @param text - Full text to search in
 * @param pattern - Pattern that was matched
 * @param matchIndex - Index where pattern was found
 * @returns true if the match is negated (should be kept), false otherwise
 */
function isNegatedMatch(text: string, pattern: string, matchIndex: number): boolean {
  // Check if any negation prefix appears immediately before the pattern
  for (const prefix of NEGATION_PREFIXES) {
    const prefixStart = matchIndex - prefix.length;
    if (prefixStart >= 0) {
      const precedingText = text.substring(prefixStart, matchIndex);
      if (precedingText.toLowerCase() === prefix.toLowerCase()) {
        return true; // This is a negated match like "no commentary"
      }
    }
  }
  return false;
}

/**
 * Filter videos by global keyword patterns (Story 3.7 - Tier 1)
 *
 * Removes videos with titles/descriptions containing low-quality patterns
 * (reaction, commentary, vlog, etc.) regardless of content type.
 *
 * IMPORTANT: Negated patterns like "no commentary" are KEPT, not filtered.
 * This ensures videos explicitly marked as commentary-free are preserved.
 *
 * @param results - Array of video results to filter
 * @returns Filtered array with low-quality videos removed
 */
export function filterByKeywords(results: VideoResult[]): VideoResult[] {
  return results.filter(video => {
    const titleLower = (video.title || '').toLowerCase();
    const descriptionLower = (video.description || '').toLowerCase();
    const combinedText = `${titleLower} ${descriptionLower}`;

    // Check for filter patterns (these indicate low-quality B-roll)
    for (const pattern of GLOBAL_FILTER_PATTERNS) {
      const patternLower = pattern.toLowerCase();
      let searchStart = 0;
      let matchIndex: number;

      // Find all occurrences of the pattern
      while ((matchIndex = combinedText.indexOf(patternLower, searchStart)) !== -1) {
        // Check if this match is negated (e.g., "no commentary")
        if (!isNegatedMatch(combinedText, patternLower, matchIndex)) {
          // Not negated - this is a genuine match, filter it out
          console.log(`[filterByKeywords] Filtered video (contains "${pattern}"):`, video.title);
          return false;
        }
        // Move past this negated match to check for other occurrences
        searchStart = matchIndex + patternLower.length;
      }
    }

    return true;
  });
}

/**
 * Calculate priority boost for global B-roll indicators (Story 3.7)
 *
 * @param video - Video to calculate boost for
 * @returns Boost score (0-1 range, added to quality score)
 */
export function calculatePriorityBoost(video: VideoResult): number {
  const titleLower = (video.title || '').toLowerCase();
  const descriptionLower = (video.description || '').toLowerCase();
  const combinedText = `${titleLower} ${descriptionLower}`;

  let boost = 0;
  for (const pattern of GLOBAL_PRIORITY_PATTERNS) {
    if (combinedText.includes(pattern.toLowerCase())) {
      boost += 0.1; // Each matching pattern adds 0.1 boost
    }
  }

  // Cap boost at 0.3 to prevent excessive boosting
  return Math.min(boost, 0.3);
}

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Filter options for video filtering
 */
export interface FilterOptions {
  /**
   * Scene voiceover duration in seconds
   * Used for duration filtering calculations
   */
  sceneDuration: number;

  /**
   * Optional flag to allow standard license videos
   * Default: true (not currently used in MVP)
   */
  allowStandardLicense?: boolean;
}

/**
 * Video result with quality score
 * Extends VideoResult with calculated quality metrics
 */
export interface RankedVideo extends VideoResult {
  /**
   * Calculated quality score (0-1)
   * Higher score = better quality/relevance
   * Formula: (durationMatch * 0.6) + (relevance * 0.4)
   */
  qualityScore: number;

  /**
   * Original rank from YouTube search results
   * Preserved for debugging and analysis
   */
  originalRank?: number;
}

/**
 * Fallback tier information for logging
 */
interface FallbackTierInfo {
  tier: number;
  name: string;
  description: string;
  resultsCount: number;
}

// ============================================================================
// Task 1: Duration Filtering Logic
// ============================================================================

/**
 * Filter videos by duration based on scene voiceover length
 *
 * PRIMARY FILTER: This must be applied FIRST before all other filters.
 * Videos significantly longer than scene duration waste download bandwidth,
 * storage, and user editing time.
 *
 * Filtering Rules:
 * - Minimum duration: 1x scene duration (e.g., 10s scene → 10s minimum)
 * - Maximum duration: Math.min(sceneDuration * 3, 300) (3x OR 5 minutes, whichever is smaller)
 * - Edge case: For scenes > 300s, only enforce minimum (no maximum constraint)
 *
 * Examples:
 * - 10s scene: accepts 10s-30s videos (3x ratio applies)
 * - 90s scene: accepts 90s-270s videos (4.5 min, 3x applies)
 * - 120s scene: accepts 120s-300s videos (5 min cap enforced, NOT 360s)
 * - 180s scene: accepts 180s-300s videos (5 min cap enforced, NOT 540s)
 * - 400s scene: accepts videos >= 400s (ignore 3x ratio, only enforce minimum)
 *
 * @param results - Array of video results to filter
 * @param sceneDuration - Scene voiceover duration in seconds
 * @param ratioMax - Maximum duration ratio (default: 3)
 * @param capSeconds - Absolute maximum duration cap (default: 300)
 * @returns Filtered array of videos matching duration criteria
 * @throws Error if sceneDuration <= 0 (invalid input)
 */
export function filterByDuration(
  results: VideoResult[],
  sceneDuration: number,
  ratioMax: number = 3,
  capSeconds: number = 300
): VideoResult[] {
  // Input validation
  if (sceneDuration <= 0) {
    throw new Error(`Invalid sceneDuration: ${sceneDuration}. Must be greater than 0.`);
  }

  const minDuration = sceneDuration; // 1x ratio

  // For scenes > 300s (5 min), only enforce minimum (no maximum constraint)
  // This handles very long scenes where 3x ratio would be excessive
  const maxDuration = sceneDuration > capSeconds
    ? Infinity
    : Math.min(sceneDuration * ratioMax, capSeconds);

  return results.filter(video => {
    // Parse duration from string to number
    // Story 3.3 stores duration as string (e.g., "253" for 253 seconds)
    const duration = typeof video.duration === 'string'
      ? parseInt(video.duration, 10)
      : (video.duration || 0);

    // Skip videos with invalid/missing duration
    if (isNaN(duration) || duration <= 0) {
      console.warn(`[filterByDuration] Skipping video with invalid duration:`, {
        videoId: video.videoId,
        title: video.title,
        duration: video.duration
      });
      return false;
    }

    return duration >= minDuration && duration <= maxDuration;
  });
}

// ============================================================================
// Task 2: Content Quality Filtering (Title Spam Detection)
// ============================================================================

/**
 * Count emojis in a string
 * Uses Unicode emoji ranges to detect emoji characters
 *
 * @param text - Text to analyze
 * @returns Number of emojis found
 */
function countEmojis(text: string): number {
  // Unicode ranges for emojis
  // This regex covers most common emoji ranges
  // Using string replacement for Unicode escapes for ES5 compatibility
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  try {
    const matches = text.match(emojiRegex);
    return matches ? matches.length : 0;
  } catch {
    // Fallback if regex not supported in runtime
    // Count surrogate pairs (basic emoji detection)
    let count = 0;
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code >= 0xD800 && code <= 0xDBFF) {
        count++;
        i++; // Skip the low surrogate
      }
    }
    return count;
  }
}

/**
 * Calculate percentage of uppercase characters in title
 * Ignores non-letter characters
 *
 * @param text - Text to analyze
 * @returns Percentage of uppercase letters (0-100)
 */
function calculateCapsPercentage(text: string): number {
  // Extract only letter characters
  const letters = text.replace(/[^a-zA-Z]/g, '');
  if (letters.length === 0) return 0;

  const uppercaseCount = (text.match(/[A-Z]/g) || []).length;
  return (uppercaseCount / letters.length) * 100;
}

/**
 * Find longest sequence of consecutive punctuation marks
 *
 * @param text - Text to analyze
 * @returns Length of longest consecutive punctuation sequence
 */
function findMaxConsecutivePunctuation(text: string): number {
  const punctuationRegex = /[!?.,;:'"!]+/g;
  const matches = text.match(punctuationRegex);
  if (!matches) return 0;

  return Math.max(...matches.map(m => m.length));
}

/**
 * Filter videos by title quality (spam detection)
 *
 * Detects and filters out spam/low-quality video titles:
 * - ALL CAPS: More than 50% of title characters are uppercase
 * - Excessive emojis: More than 5 emojis in title
 * - Excessive punctuation: More than 10 consecutive punctuation marks
 *
 * @param results - Array of video results to filter
 * @returns Filtered array with spam titles removed
 */
export function filterByTitleQuality(results: VideoResult[]): VideoResult[] {
  const config = getFilterConfig();

  return results.filter(video => {
    // Validate title exists
    if (!video.title || typeof video.title !== 'string') {
      console.warn(`[filterByTitleQuality] Skipping video with missing/invalid title:`, {
        videoId: video.videoId
      });
      return false;
    }

    const title = video.title;

    // Check emoji count
    const emojiCount = countEmojis(title);
    if (emojiCount > config.maxEmojisInTitle) {
      console.log(`[filterByTitleQuality] Filtered spam title (too many emojis: ${emojiCount}):`, title);
      return false;
    }

    // Check ALL CAPS percentage
    const capsPercentage = calculateCapsPercentage(title);
    if (capsPercentage > config.maxCapsPercentage) {
      console.log(`[filterByTitleQuality] Filtered spam title (${capsPercentage.toFixed(0)}% CAPS):`, title);
      return false;
    }

    // Check consecutive punctuation
    const maxPunctuation = findMaxConsecutivePunctuation(title);
    if (maxPunctuation > config.maxConsecutivePunctuation) {
      console.log(`[filterByTitleQuality] Filtered spam title (${maxPunctuation} consecutive punctuation):`, title);
      return false;
    }

    return true;
  });
}

// ============================================================================
// Task 4: Content-Type Specific Filtering
// ============================================================================

/**
 * Content-type specific keyword rules
 * Maps ContentType to positive and negative keywords
 */
const CONTENT_TYPE_KEYWORDS: Record<ContentType, { positive: string[], negative: string[] }> = {
  [ContentType.GAMEPLAY]: {
    positive: ['gameplay', 'no commentary', 'walkthrough', 'playthrough'],
    negative: ['tutorial', 'review', 'reaction']
  },
  [ContentType.GAMING]: {
    positive: ['gameplay', 'no commentary', 'boss fight', 'gameplay only'],
    negative: ['reaction', 'review', 'tier list', 'ranking', 'commentary']
  },
  [ContentType.TUTORIAL]: {
    positive: ['tutorial', 'how to', 'guide', 'learn'],
    negative: ['gameplay', 'review', 'vlog']
  },
  [ContentType.NATURE]: {
    positive: ['wildlife', 'nature', 'documentary', '4k', 'hd'],
    negative: ['vlog', 'compilation', 'funny']
  },
  [ContentType.B_ROLL]: {
    positive: [], // No specific filtering
    negative: []
  },
  [ContentType.DOCUMENTARY]: {
    positive: ['documentary', 'story', 'history'],
    negative: ['trailer', 'review', 'reaction']
  },
  [ContentType.HISTORICAL]: {
    positive: ['documentary', 'historical footage', 'archive', 'period footage'],
    negative: ['reaction', 'explained', 'opinion', 'analysis']
  },
  [ContentType.URBAN]: {
    positive: ['city', 'urban', 'architecture', 'time lapse', 'timelapse'],
    negative: ['vlog', 'travel']
  },
  [ContentType.ABSTRACT]: {
    positive: ['animation', 'abstract', 'visual'],
    negative: ['tutorial', 'gameplay']
  },
  [ContentType.CONCEPTUAL]: {
    positive: ['cinematic', '4K', 'stock footage', 'b-roll'],
    negative: ['reaction', 'review', 'vlog', 'my thoughts']
  }
};

/**
 * Calculate content-type keyword score for a video
 *
 * Scoring system:
 * - +1 for each positive keyword match
 * - -1 for each negative keyword match
 *
 * @param video - Video to score
 * @param contentType - Target content type
 * @returns Keyword score (can be negative)
 */
function calculateContentTypeScore(video: VideoResult, contentType: ContentType): number {
  const keywords = CONTENT_TYPE_KEYWORDS[contentType];
  if (!keywords) return 0;

  const titleLower = (video.title || '').toLowerCase();
  const descriptionLower = (video.description || '').toLowerCase();
  const combinedText = `${titleLower} ${descriptionLower}`;

  let score = 0;

  // Add points for positive keywords
  keywords.positive.forEach(keyword => {
    if (combinedText.includes(keyword.toLowerCase())) {
      score += 1;
    }
  });

  // Subtract points for negative keywords
  keywords.negative.forEach(keyword => {
    if (combinedText.includes(keyword.toLowerCase())) {
      score -= 1;
    }
  });

  return score;
}

/**
 * Filter videos by content type
 *
 * Applies type-specific keyword filtering rules based on ContentType.
 * Uses keyword scoring system (+1 for positive, -1 for negative).
 * Filters out videos with negative score.
 *
 * @param results - Array of video results to filter
 * @param contentType - Target content type for filtering
 * @returns Filtered and re-ranked array
 */
export function filterByContentType(
  results: VideoResult[],
  contentType: ContentType
): VideoResult[] {
  // B_ROLL has no specific filtering - accept all
  if (contentType === ContentType.B_ROLL) {
    return results;
  }

  return results.filter(video => {
    const score = calculateContentTypeScore(video, contentType);

    // Filter out videos with negative score
    if (score < 0) {
      console.log(`[filterByContentType] Filtered video (negative score ${score} for ${contentType}):`, video.title);
      return false;
    }

    return true;
  });
}

// ============================================================================
// Task 3: Quality Ranking Algorithm
// ============================================================================

/**
 * Rank videos by quality score
 *
 * SIMPLIFIED MVP RANKING: Based on duration preference + relevance only.
 * Does not use view count, upload date, or channel metrics (not available from Story 3.3).
 *
 * Scoring Formula:
 * 1. Duration Match Score (60% weight):
 *    - Videos closer to 1.5x scene duration ranked higher
 *    - Formula: 1 / (1 + Math.abs(videoDuration - idealDuration) / idealDuration)
 *
 * 2. Relevance Score (40% weight):
 *    - Based on YouTube search rank (lower rank = higher relevance)
 *    - Formula: 1 / rank
 *
 * Final Score: (durationMatch * 0.6) + (relevance * 0.4)
 *
 * @param results - Array of video results to rank
 * @param sceneDuration - Scene voiceover duration in seconds
 * @param maxResults - Maximum number of results to return (default: 8)
 * @returns Ranked array of videos with quality scores, limited to top N
 */
export function rankVideos(
  results: VideoResult[],
  sceneDuration: number,
  maxResults: number = 8
): RankedVideo[] {
  const config = getFilterConfig();
  const idealDuration = sceneDuration * 1.5; // Prefer videos at 1.5x scene duration

  // Calculate quality score for each video
  const rankedVideos: RankedVideo[] = results.map((video, index) => {
    // Parse duration
    const duration = typeof video.duration === 'string'
      ? parseInt(video.duration, 10)
      : (video.duration || 0);

    // Calculate Duration Match Score (0-1)
    const durationMatch = duration > 0
      ? 1 / (1 + Math.abs(duration - idealDuration) / idealDuration)
      : 0;

    // Calculate Relevance Score (0-1)
    // Use array index as rank (0-based), add 1 to make it 1-based
    const rank = index + 1;
    const relevance = 1 / rank;

    // Story 3.7: Calculate priority boost for B-roll indicators
    const priorityBoost = calculatePriorityBoost(video);

    // Calculate weighted quality score (with priority boost)
    const qualityScore =
      (durationMatch * config.durationMatchWeight) +
      (relevance * config.relevanceWeight) +
      priorityBoost;

    return {
      ...video,
      qualityScore,
      originalRank: rank
    };
  });

  // Sort by quality score descending (highest first)
  rankedVideos.sort((a, b) => b.qualityScore - a.qualityScore);

  // Limit to top N results
  return rankedVideos.slice(0, maxResults);
}

// ============================================================================
// Task 5: Multi-Tier Fallback Logic
// ============================================================================

/**
 * Apply filters and ranking with multi-tier fallback logic
 *
 * Enhanced 5-tier fallback system for graceful degradation:
 *
 * Tier 1 (Strict): Duration 1x-3x + 5-min cap + all quality filters
 * Tier 2 (Relax Duration): Duration 1x-5x + 5-min cap + all quality filters
 * Tier 3 (Remove Cap): Duration 1x minimum only + all quality filters
 * Tier 4 (Relax Title): Duration 1x minimum + content type filter only
 * Tier 5 (Relax All): Duration 1x minimum + ranking only
 *
 * Each tier progressively relaxes one constraint to ensure at least 1-3
 * high-quality suggestions per scene when possible.
 *
 * @param results - Raw video results from YouTube search
 * @param sceneDuration - Scene voiceover duration in seconds
 * @param contentType - Content type for type-specific filtering
 * @param options - Additional filter options
 * @returns Filtered and ranked video suggestions (5-8 videos, or best available)
 */
export function filterAndRankResults(
  results: VideoResult[],
  sceneDuration: number,
  contentType: ContentType,
  options?: FilterOptions
): RankedVideo[] {
  const config = getFilterConfig();
  const startTime = performance.now();

  // Track fallback tier for logging
  let tierInfo: FallbackTierInfo | null = null;

  // Validate inputs
  if (!results || results.length === 0) {
    console.warn('[filterAndRankResults] No results to filter');
    return [];
  }

  if (sceneDuration <= 0) {
    throw new Error(`Invalid sceneDuration: ${sceneDuration}. Must be greater than 0.`);
  }

  console.log(`[filterAndRankResults] Starting with ${results.length} raw results for ${sceneDuration}s scene (${contentType})`);

  // -------------------------------------------------------------------------
  // TIER 1: Strict Filtering (Primary)
  // -------------------------------------------------------------------------
  try {
    // Story 3.7: Apply global keyword filter FIRST (removes reaction/commentary/vlog)
    let filtered = filterByKeywords(results);
    console.log(`[Tier 1] After global keyword filter: ${filtered.length} results`);

    filtered = filterByDuration(filtered, sceneDuration, 3, 300); // 1x-3x, 5-min cap
    console.log(`[Tier 1] After duration filter (1x-3x, 300s cap): ${filtered.length} results`);

    filtered = filterByTitleQuality(filtered);
    console.log(`[Tier 1] After title quality filter: ${filtered.length} results`);

    filtered = filterByContentType(filtered, contentType);
    console.log(`[Tier 1] After content type filter: ${filtered.length} results`);

    const ranked = rankVideos(filtered, sceneDuration, config.maxSuggestionsPerScene);
    console.log(`[Tier 1] After ranking: ${ranked.length} results`);

    if (ranked.length >= config.fallbackThreshold || !config.fallbackEnabled) {
      tierInfo = {
        tier: 1,
        name: 'Strict Filtering',
        description: '1x-3x duration, 5-min cap, all quality filters',
        resultsCount: ranked.length
      };
      logFallbackTier(tierInfo, startTime);
      return ranked;
    }
  } catch (error) {
    console.error('[Tier 1] Error during strict filtering:', error);
  }

  // -------------------------------------------------------------------------
  // TIER 2: Relaxed Duration (1x-5x)
  // -------------------------------------------------------------------------
  try {
    let filtered = filterByDuration(results, sceneDuration, 5, 300); // 1x-5x, keep 5-min cap
    console.log(`[Tier 2] After duration filter (1x-5x, 300s cap): ${filtered.length} results`);

    filtered = filterByTitleQuality(filtered);
    filtered = filterByContentType(filtered, contentType);
    const ranked = rankVideos(filtered, sceneDuration, config.maxSuggestionsPerScene);

    if (ranked.length >= config.fallbackThreshold) {
      tierInfo = {
        tier: 2,
        name: 'Relaxed Duration',
        description: '1x-5x duration, 5-min cap, all quality filters',
        resultsCount: ranked.length
      };
      logFallbackTier(tierInfo, startTime);
      return ranked;
    }
  } catch (error) {
    console.error('[Tier 2] Error during relaxed duration filtering:', error);
  }

  // -------------------------------------------------------------------------
  // TIER 3: Remove Duration Cap
  // -------------------------------------------------------------------------
  try {
    let filtered = filterByDuration(results, sceneDuration, Infinity, Infinity); // 1x minimum only
    console.log(`[Tier 3] After duration filter (1x minimum only): ${filtered.length} results`);

    filtered = filterByTitleQuality(filtered);
    filtered = filterByContentType(filtered, contentType);
    const ranked = rankVideos(filtered, sceneDuration, config.maxSuggestionsPerScene);

    if (ranked.length >= config.fallbackThreshold) {
      tierInfo = {
        tier: 3,
        name: 'Remove Duration Cap',
        description: '1x minimum duration, all quality filters',
        resultsCount: ranked.length
      };
      logFallbackTier(tierInfo, startTime);
      return ranked;
    }
  } catch (error) {
    console.error('[Tier 3] Error during no-cap filtering:', error);
  }

  // -------------------------------------------------------------------------
  // TIER 4: Relax Title Quality
  // -------------------------------------------------------------------------
  try {
    let filtered = filterByDuration(results, sceneDuration, Infinity, Infinity); // 1x minimum only
    console.log(`[Tier 4] After duration filter (1x minimum only): ${filtered.length} results`);

    // Skip title quality filter
    filtered = filterByContentType(filtered, contentType);
    const ranked = rankVideos(filtered, sceneDuration, config.maxSuggestionsPerScene);

    if (ranked.length >= config.fallbackThreshold) {
      tierInfo = {
        tier: 4,
        name: 'Relax Title Quality',
        description: '1x minimum duration, content type filter only',
        resultsCount: ranked.length
      };
      logFallbackTier(tierInfo, startTime);
      return ranked;
    }
  } catch (error) {
    console.error('[Tier 4] Error during relaxed title filtering:', error);
  }

  // -------------------------------------------------------------------------
  // TIER 5: Remove All Quality Filters
  // -------------------------------------------------------------------------
  try {
    let filtered = filterByDuration(results, sceneDuration, Infinity, Infinity); // 1x minimum only
    console.log(`[Tier 5] After duration filter (1x minimum only): ${filtered.length} results`);

    // Skip all quality filters, just rank
    const ranked = rankVideos(filtered, sceneDuration, config.maxSuggestionsPerScene);

    tierInfo = {
      tier: 5,
      name: 'Remove All Quality Filters',
      description: '1x minimum duration, ranking only',
      resultsCount: ranked.length
    };

    console.warn('[filterAndRankResults] WARNING: Tier 5 reached (low-quality search results)');
    logFallbackTier(tierInfo, startTime);

    // Return top 3 or all available if < 3
    return ranked.slice(0, Math.max(config.fallbackThreshold, ranked.length));
  } catch (error) {
    console.error('[Tier 5] Error during minimal filtering:', error);
    return [];
  }
}

/**
 * Log fallback tier information for monitoring
 */
function logFallbackTier(tierInfo: FallbackTierInfo, startTime: number): void {
  const endTime = performance.now();
  const duration = (endTime - startTime).toFixed(2);

  console.log(`
╔════════════════════════════════════════════════════════════════
║ FILTERING COMPLETE - Tier ${tierInfo.tier}: ${tierInfo.name}
╠════════════════════════════════════════════════════════════════
║ Description: ${tierInfo.description}
║ Results: ${tierInfo.resultsCount} videos
║ Duration: ${duration}ms
╚════════════════════════════════════════════════════════════════
  `);
}
