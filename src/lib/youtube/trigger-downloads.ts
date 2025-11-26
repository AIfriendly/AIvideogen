/**
 * Trigger Segment Downloads Helper
 *
 * Encapsulates the logic to trigger segment downloads for CV analysis.
 * Used by visual generation to auto-start downloads after suggestions are saved.
 *
 * Story 3.7b: CV Pipeline Integration
 */

import { randomUUID } from 'crypto';
import path from 'path';
import db from '../db/client';
import { downloadQueue, DownloadJob } from './download-queue';

/**
 * Suggestion row from database
 */
interface PendingSuggestion {
  id: string;
  scene_id: string;
  video_id: string;
  duration: number;
  scene_number: number;
}

/**
 * Trigger segment downloads for all pending suggestions in a project.
 *
 * This function:
 * 1. Finds all suggestions that haven't been downloaded yet
 * 2. Queues them for download via the download queue
 * 3. The download queue will trigger CV analysis after each download
 *
 * @param projectId - Project ID to trigger downloads for
 * @returns Object with counts of queued and skipped suggestions
 */
export async function triggerSegmentDownloads(projectId: string): Promise<{
  queued: number;
  alreadyDownloaded: number;
  total: number;
}> {
  console.log(`[TriggerDownloads] Starting for project ${projectId}`);

  // Get all suggestions that need downloading (pending status, no segment path)
  const pendingSuggestions = db.prepare(`
    SELECT
      vs.id,
      vs.scene_id,
      vs.video_id,
      vs.duration,
      s.scene_number
    FROM visual_suggestions vs
    INNER JOIN scenes s ON vs.scene_id = s.id
    WHERE s.project_id = ?
      AND vs.download_status = 'pending'
      AND vs.default_segment_path IS NULL
    ORDER BY s.scene_number, vs.rank
  `).all(projectId) as PendingSuggestion[];

  // Count already downloaded
  const alreadyDownloadedResult = db.prepare(`
    SELECT COUNT(*) as count
    FROM visual_suggestions vs
    INNER JOIN scenes s ON vs.scene_id = s.id
    WHERE s.project_id = ?
      AND vs.download_status = 'complete'
  `).get(projectId) as { count: number };

  const alreadyDownloaded = alreadyDownloadedResult.count;

  console.log(`[TriggerDownloads] Found ${pendingSuggestions.length} pending, ${alreadyDownloaded} already downloaded`);

  if (pendingSuggestions.length === 0) {
    console.log(`[TriggerDownloads] No pending suggestions to download`);
    return {
      queued: 0,
      alreadyDownloaded,
      total: alreadyDownloaded
    };
  }

  // Initialize download queue
  await downloadQueue.initialize();

  // Queue each suggestion for download
  let queued = 0;
  for (const suggestion of pendingSuggestions) {
    try {
      // Calculate segment duration (default 15s or video duration, whichever is smaller)
      const segmentDuration = Math.min(suggestion.duration || 15, 15);

      // Build output path (relative path for database storage)
      const outputPath = path.join(
        '.cache',
        'videos',
        projectId,
        'suggestions',
        `${suggestion.video_id}-${segmentDuration}s.mp4`
      );

      // Create download job
      const job: DownloadJob = {
        id: randomUUID(),
        suggestionId: suggestion.id,
        videoId: suggestion.video_id,
        segmentDuration,
        outputPath,
        projectId,
        sceneNumber: suggestion.scene_number,
        status: 'queued',
        retryCount: 0
      };

      // Enqueue job (this triggers the download and CV analysis)
      await downloadQueue.enqueueJob(job);
      queued++;

      console.log(`[TriggerDownloads] Queued job for video ${suggestion.video_id} (scene ${suggestion.scene_number})`);
    } catch (error) {
      console.error(`[TriggerDownloads] Failed to queue suggestion ${suggestion.id}:`, error);
      // Continue with other suggestions
    }
  }

  console.log(`[TriggerDownloads] Complete: ${queued} queued, ${alreadyDownloaded} already downloaded`);

  return {
    queued,
    alreadyDownloaded,
    total: queued + alreadyDownloaded
  };
}
