/**
 * Visual Suggestions Type Definitions
 *
 * TypeScript interfaces and types for visual suggestions system.
 * Defines the data structures for YouTube video suggestions with download tracking.
 *
 * Story 3.5: Visual Suggestions Database & Workflow Integration
 * Story 3.7b: CV Pipeline Integration - added cvScore field and filtering
 */

/**
 * CV Score threshold for UI filtering (Story 3.7b)
 * Suggestions with cv_score below this value are hidden from the UI (AC64)
 * Suggestions with cv_score = null are still shown (AC65)
 */
export const CV_SCORE_THRESHOLD = 0.5;

/**
 * Visual suggestion data structure
 * Represents a YouTube video suggested for a scene
 */
export interface VisualSuggestion {
  id: string;
  sceneId: string;
  videoId: string;
  title: string;
  thumbnailUrl: string;
  channelTitle: string;
  embedUrl: string;
  rank: number;
  duration?: number; // Video duration in seconds
  defaultSegmentPath?: string; // Path to downloaded segment (Story 3.6)
  downloadStatus: DownloadStatus;
  cvScore?: number | null; // CV quality score 0-1 (Story 3.7b) - null if not analyzed
  createdAt: string;
}

/**
 * Download status enum for visual suggestions
 * Tracks the state of segment downloads (Story 3.6)
 */
export type DownloadStatus = 'pending' | 'downloading' | 'complete' | 'error';

/**
 * Constant array for runtime validation
 */
export const DOWNLOAD_STATUS_VALUES: DownloadStatus[] = [
  'pending',
  'downloading',
  'complete',
  'error',
];

/**
 * Type guard for download status validation
 */
export function isValidDownloadStatus(status: string): status is DownloadStatus {
  return DOWNLOAD_STATUS_VALUES.includes(status as DownloadStatus);
}

// ============================================================================
// CV Score Filtering (Story 3.7b)
// ============================================================================

/**
 * Filter suggestions by CV score
 *
 * Story 3.7b: Hide low-quality suggestions from UI
 * - AC64: Hide suggestions with cv_score < 0.5
 * - AC65: Show suggestions with cv_score = null (not yet analyzed)
 *
 * @param suggestions - Array of visual suggestions
 * @returns Filtered array with only acceptable suggestions
 */
export function filterSuggestionsByCVScore(
  suggestions: VisualSuggestion[]
): VisualSuggestion[] {
  return suggestions.filter((s) => {
    // AC65: Show if not yet analyzed (cvScore is null or undefined)
    if (s.cvScore === null || s.cvScore === undefined) {
      return true;
    }
    // AC64: Hide if cv_score below threshold
    return s.cvScore >= CV_SCORE_THRESHOLD;
  });
}

/**
 * Get count of filtered (hidden) suggestions
 *
 * Story 3.7b AC66: UI displays count of filtered low-quality videos
 *
 * @param suggestions - Array of visual suggestions
 * @returns Number of suggestions hidden due to low cv_score
 */
export function getFilteredSuggestionsCount(
  suggestions: VisualSuggestion[]
): number {
  return suggestions.filter((s) => {
    // Only count as filtered if cv_score exists AND is below threshold
    return s.cvScore !== null && s.cvScore !== undefined && s.cvScore < CV_SCORE_THRESHOLD;
  }).length;
}
