/**
 * Visual Suggestions Type Definitions
 *
 * TypeScript interfaces and types for visual suggestions system.
 * Defines the data structures for YouTube video suggestions with download tracking.
 *
 * Story 3.5: Visual Suggestions Database & Workflow Integration
 */

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
