/**
 * Vision API Module - Story 3.7
 *
 * Exports all Vision API functionality for B-roll content filtering.
 */

// Types
export * from './types';

// Client
export { VisionAPIClient, QuotaTracker, visionClient } from './client';

// Frame Extraction
export {
  extractFrames,
  getVideoDuration,
  getFrameDimensions,
  stripAudio,
  checkFFmpegAvailable
} from './frame-extractor';

// CV Filter Service
export {
  analyzeVideoSuggestion,
  batchAnalyzeSuggestions,
  analyzeSceneSuggestions,
  getSuggestionsForCVAnalysis,
  getSceneCVSummary,
  getCVFilterStatus,
  type CVFilterResult,
  type CVFilterStatus
} from './cv-filter-service';
