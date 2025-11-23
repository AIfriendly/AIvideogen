/**
 * CV Filter Service - Story 3.7
 *
 * Orchestrates the computer vision content filtering process:
 * 1. Extract frames from downloaded video segments
 * 2. Analyze frames with Vision API (face detection, OCR, labels)
 * 3. Calculate CV score
 * 4. Update database with results
 *
 * Gracefully degrades when Vision API is unavailable or quota exceeded.
 */

import db from '@/lib/db/client';
import {
  visionClient,
  extractFrames,
  getFrameDimensions,
  VisionAPIError,
  VisionErrorCode,
  type VisionAnalysisResult
} from './index';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Result of CV filtering operation
 */
export interface CVFilterResult {
  suggestionId: string;
  cvScore: number | null;
  analyzed: boolean;
  reason?: string;
  faceDetected?: boolean;
  textDetected?: boolean;
  labelMatchScore?: number;
}

/**
 * Status of the CV filtering service
 */
export interface CVFilterStatus {
  available: boolean;
  quotaUsed: number;
  quotaLimit: number;
  quotaRemaining: number;
  resetDate: Date;
  reason?: string;
}

/**
 * Get CV filter service status
 */
export function getCVFilterStatus(): CVFilterStatus {
  const isAvailable = visionClient.isAvailable();
  const quota = visionClient.getQuotaUsage();

  let reason: string | undefined;
  if (!isAvailable) {
    if (visionClient.isQuotaExceeded()) {
      reason = 'Quota exceeded';
    } else {
      reason = 'Vision API not configured';
    }
  }

  return {
    available: isAvailable,
    quotaUsed: quota.used,
    quotaLimit: quota.limit,
    quotaRemaining: quota.remaining,
    resetDate: quota.resetDate,
    reason
  };
}

/**
 * Update CV score in database
 */
function updateCVScore(suggestionId: string, cvScore: number | null): void {
  const stmt = db.prepare(`
    UPDATE visual_suggestions
    SET cv_score = ?
    WHERE id = ?
  `);
  stmt.run(cvScore, suggestionId);
}

/**
 * Analyze a single suggestion with Vision API
 *
 * @param suggestionId - ID of the visual suggestion
 * @param segmentPath - Path to the downloaded video segment
 * @param expectedLabels - Expected labels from scene analysis for matching
 * @returns CV filter result with score
 */
export async function analyzeVideoSuggestion(
  suggestionId: string,
  segmentPath: string,
  expectedLabels: string[] = []
): Promise<CVFilterResult> {
  // Check if Vision API is available
  if (!visionClient.isAvailable()) {
    const reason = visionClient.isQuotaExceeded()
      ? 'Vision API quota exceeded'
      : 'Vision API not configured';

    return {
      suggestionId,
      cvScore: null,
      analyzed: false,
      reason
    };
  }

  // Resolve full path (handle .cache/ prefix)
  const fullPath = segmentPath.startsWith('.cache/')
    ? path.join(process.cwd(), segmentPath)
    : segmentPath;

  // Check if file exists
  if (!fs.existsSync(fullPath)) {
    return {
      suggestionId,
      cvScore: null,
      analyzed: false,
      reason: `Segment file not found: ${segmentPath}`
    };
  }

  try {
    // Extract frames (3 frames by default)
    console.log(`[CVFilter] Extracting frames from: ${segmentPath}`);
    const frames = await extractFrames(fullPath, 3);

    // Get frame dimensions
    const dimensions = await getFrameDimensions(fullPath);

    // Analyze frames with Vision API
    console.log(`[CVFilter] Analyzing ${frames.length} frames with Vision API`);
    const result = await visionClient.analyzeFrames(frames, dimensions, expectedLabels);

    // Update database with CV score
    updateCVScore(suggestionId, result.cvScore);

    console.log(`[CVFilter] Analysis complete for ${suggestionId}: CV score = ${result.cvScore}`);

    return {
      suggestionId,
      cvScore: result.cvScore,
      analyzed: true,
      faceDetected: result.faceDetection.hasTalkingHead,
      textDetected: result.textDetection.hasCaption,
      labelMatchScore: result.labelDetection.matchScore
    };
  } catch (error) {
    if (error instanceof VisionAPIError) {
      const reason = error.code === VisionErrorCode.QUOTA_EXCEEDED
        ? 'Vision API quota exceeded'
        : error.message;

      console.warn(`[CVFilter] Analysis failed for ${suggestionId}: ${reason}`);

      return {
        suggestionId,
        cvScore: null,
        analyzed: false,
        reason
      };
    }

    console.error(`[CVFilter] Unexpected error for ${suggestionId}:`, error);
    return {
      suggestionId,
      cvScore: null,
      analyzed: false,
      reason: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Batch analyze multiple suggestions
 *
 * @param suggestions - Array of suggestions to analyze
 * @param expectedLabels - Expected labels from scene analysis
 * @returns Array of CV filter results
 */
export async function batchAnalyzeSuggestions(
  suggestions: Array<{
    id: string;
    segmentPath: string | null;
    downloadStatus: string;
  }>,
  expectedLabels: string[] = []
): Promise<CVFilterResult[]> {
  const results: CVFilterResult[] = [];

  for (const suggestion of suggestions) {
    // Skip if segment not downloaded
    if (suggestion.downloadStatus !== 'complete' || !suggestion.segmentPath) {
      results.push({
        suggestionId: suggestion.id,
        cvScore: null,
        analyzed: false,
        reason: 'Segment not downloaded'
      });
      continue;
    }

    // Check quota before each analysis
    if (visionClient.isQuotaExceeded()) {
      results.push({
        suggestionId: suggestion.id,
        cvScore: null,
        analyzed: false,
        reason: 'Vision API quota exceeded'
      });
      continue;
    }

    // Analyze the suggestion
    const result = await analyzeVideoSuggestion(
      suggestion.id,
      suggestion.segmentPath,
      expectedLabels
    );
    results.push(result);

    // Stop if quota exceeded during batch
    if (!result.analyzed && result.reason?.includes('quota')) {
      // Mark remaining suggestions as not analyzed
      const remainingStart = suggestions.indexOf(suggestion) + 1;
      for (let i = remainingStart; i < suggestions.length; i++) {
        results.push({
          suggestionId: suggestions[i].id,
          cvScore: null,
          analyzed: false,
          reason: 'Vision API quota exceeded'
        });
      }
      break;
    }
  }

  return results;
}

/**
 * Get suggestions that need CV analysis for a scene
 */
export function getSuggestionsForCVAnalysis(sceneId: string): Array<{
  id: string;
  segmentPath: string | null;
  downloadStatus: string;
}> {
  const stmt = db.prepare(`
    SELECT id, default_segment_path as segmentPath, download_status as downloadStatus
    FROM visual_suggestions
    WHERE scene_id = ?
      AND cv_score IS NULL
      AND download_status = 'complete'
      AND default_segment_path IS NOT NULL
    ORDER BY rank ASC
  `);

  return stmt.all(sceneId) as Array<{
    id: string;
    segmentPath: string | null;
    downloadStatus: string;
  }>;
}

/**
 * Analyze all pending suggestions for a scene
 */
export async function analyzeSceneSuggestions(
  sceneId: string,
  expectedLabels: string[] = []
): Promise<CVFilterResult[]> {
  const suggestions = getSuggestionsForCVAnalysis(sceneId);

  if (suggestions.length === 0) {
    console.log(`[CVFilter] No suggestions pending CV analysis for scene ${sceneId}`);
    return [];
  }

  console.log(`[CVFilter] Analyzing ${suggestions.length} suggestions for scene ${sceneId}`);
  return batchAnalyzeSuggestions(suggestions, expectedLabels);
}

/**
 * Get CV analysis summary for a scene
 */
export function getSceneCVSummary(sceneId: string): {
  total: number;
  analyzed: number;
  pending: number;
  avgScore: number | null;
  highScoreCount: number;
  lowScoreCount: number;
} {
  const stmt = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN cv_score IS NOT NULL THEN 1 ELSE 0 END) as analyzed,
      SUM(CASE WHEN cv_score IS NULL THEN 1 ELSE 0 END) as pending,
      AVG(cv_score) as avgScore,
      SUM(CASE WHEN cv_score >= 0.7 THEN 1 ELSE 0 END) as highScoreCount,
      SUM(CASE WHEN cv_score < 0.5 THEN 1 ELSE 0 END) as lowScoreCount
    FROM visual_suggestions
    WHERE scene_id = ?
  `);

  const result = stmt.get(sceneId) as {
    total: number;
    analyzed: number;
    pending: number;
    avgScore: number | null;
    highScoreCount: number;
    lowScoreCount: number;
  };

  return {
    total: result.total || 0,
    analyzed: result.analyzed || 0,
    pending: result.pending || 0,
    avgScore: result.avgScore,
    highScoreCount: result.highScoreCount || 0,
    lowScoreCount: result.lowScoreCount || 0
  };
}
