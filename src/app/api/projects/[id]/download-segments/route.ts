/**
 * Download Segments Orchestration Endpoint
 *
 * Orchestrates batch download of video segments for visual suggestions.
 * Supports both selective download (specific suggestion IDs) and full download.
 * Includes yt-dlp health check and proactive disk space validation.
 *
 * Story 3.6: Default Segment Download Service
 * Updated: Support selective downloads - only download user-selected clips
 *
 * POST /api/projects/[id]/download-segments
 * Request: { suggestionIds?: string[] } - Optional array of specific suggestion IDs to download
 *          If not provided, downloads all pending suggestions (legacy behavior)
 * Response: { success, totalJobs, queued, alreadyDownloaded, message, error }
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import db from '@/lib/db/client';
import { downloadQueue, DownloadJob } from '@/lib/youtube/download-queue';
import { validateProjectId } from '@/lib/utils/validate-project-id';

// ============================================================================
// Types
// ============================================================================

interface DownloadSegmentsResponse {
  success: boolean;
  totalJobs: number;
  queued: number;
  alreadyDownloaded: number;
  message: string;
  error?: string;
}

interface PendingSuggestion {
  id: string;
  scene_id: string;
  video_id: string;
  duration: number;
  scene_number: number;
}

// ============================================================================
// Disk Space Validation
// ============================================================================

/**
 * Check available disk space for .cache directory
 * @param requiredBytes - Required space in bytes
 * @returns Object with availability status and free space
 */
async function checkDiskSpace(requiredBytes: number): Promise<{ available: boolean; freeSpace: number }> {
  try {
    // Get disk space stats for .cache directory
    const cachePath = path.join(process.cwd(), '.cache');

    // Ensure .cache directory exists
    await fs.mkdir(cachePath, { recursive: true });

    // Note: Node.js doesn't have built-in statfs on Windows
    // For cross-platform compatibility, we'll implement a simpler check
    // In production, consider using a library like 'check-disk-space'

    // For now, we'll use a conservative approach:
    // Try to write a test file to check if we have space
    try {
      const testFile = path.join(cachePath, '.space-check-test');
      await fs.writeFile(testFile, 'test', 'utf-8');
      await fs.unlink(testFile);

      // If we can write, assume space is available
      // This is a simplified check - in production, use proper disk space library
      return {
        available: true,
        freeSpace: requiredBytes * 2, // Mock value
      };
    } catch (writeError) {
      // If write fails, assume no space
      return {
        available: false,
        freeSpace: 0,
      };
    }
  } catch (error) {
    console.error('[Download Segments] Failed to check disk space:', error);
    // Fail open: assume space available if check fails
    return { available: true, freeSpace: 0 };
  }
}

// ============================================================================
// yt-dlp Health Check
// ============================================================================

/**
 * Check if yt-dlp is available and ready
 */
async function checkYtDlpHealth(): Promise<{ available: boolean; error?: string }> {
  try {
    // Call health check endpoint
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/health/yt-dlp`);
    const health = await response.json();

    if (!health.available || !health.supportsDownloadSections) {
      return {
        available: false,
        error: health.error || 'yt-dlp not available or does not support --download-sections flag',
      };
    }

    return { available: true };
  } catch (error: any) {
    console.error('[Download Segments] Failed to check yt-dlp health:', error);
    return {
      available: false,
      error: 'Failed to check yt-dlp availability. Ensure yt-dlp is installed and in PATH.',
    };
  }
}

// ============================================================================
// Database Queries
// ============================================================================

/**
 * Load pending visual suggestions for a project
 * Returns suggestions with download_status = 'pending'
 */
function loadPendingSuggestions(projectId: string): PendingSuggestion[] {
  try {
    const stmt = db.prepare(`
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
      ORDER BY s.scene_number ASC, vs.rank ASC
    `);

    return stmt.all(projectId) as PendingSuggestion[];
  } catch (error) {
    console.error('[Download Segments] Failed to load pending suggestions:', error);
    throw new Error(
      `Failed to load pending suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Load specific visual suggestions by IDs
 * Used for selective download of user-chosen clips
 */
function loadSuggestionsByIds(projectId: string, suggestionIds: string[]): PendingSuggestion[] {
  if (suggestionIds.length === 0) return [];

  try {
    // Build placeholders for the IN clause
    const placeholders = suggestionIds.map(() => '?').join(',');
    const stmt = db.prepare(`
      SELECT
        vs.id,
        vs.scene_id,
        vs.video_id,
        vs.duration,
        s.scene_number
      FROM visual_suggestions vs
      INNER JOIN scenes s ON vs.scene_id = s.id
      WHERE s.project_id = ?
        AND vs.id IN (${placeholders})
        AND vs.download_status IN ('pending', 'error')
      ORDER BY s.scene_number ASC, vs.rank ASC
    `);

    return stmt.all(projectId, ...suggestionIds) as PendingSuggestion[];
  } catch (error) {
    console.error('[Download Segments] Failed to load suggestions by IDs:', error);
    throw new Error(
      `Failed to load suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Count already downloaded suggestions
 */
function countDownloadedSuggestions(projectId: string): number {
  try {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM visual_suggestions vs
      INNER JOIN scenes s ON vs.scene_id = s.id
      WHERE s.project_id = ?
        AND vs.download_status = 'complete'
    `);

    const result = stmt.get(projectId) as { count: number };
    return result.count || 0;
  } catch (error) {
    console.error('[Download Segments] Failed to count downloaded suggestions:', error);
    throw new Error(
      `Failed to count downloaded suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get scene duration by scene_id
 */
function getSceneDuration(sceneId: string): number {
  try {
    const stmt = db.prepare(`
      SELECT duration FROM scenes WHERE id = ?
    `);

    const result = stmt.get(sceneId) as { duration: number | null };
    return result?.duration || 15; // Default to 15 seconds if not found
  } catch (error) {
    console.error('[Download Segments] Failed to get scene duration:', error);
    return 15; // Default fallback
  }
}

// ============================================================================
// API Route Handler
// ============================================================================

/**
 * POST /api/projects/[id]/download-segments
 * Orchestrate batch download of video segments
 *
 * Request body (optional):
 * - suggestionIds: string[] - Specific suggestion IDs to download
 *   If not provided, downloads all pending suggestions (legacy behavior)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  try {
    // Parse request body for selective download
    let suggestionIds: string[] | undefined;
    try {
      const body = await request.json();
      if (body.suggestionIds && Array.isArray(body.suggestionIds)) {
        suggestionIds = body.suggestionIds;
        console.log(`[Download Segments] Selective download requested for ${body.suggestionIds.length} suggestions`);
      }
    } catch {
      // No body or invalid JSON - use default behavior (download all)
    }

    // Validate project ID
    if (!validateProjectId(projectId)) {
      return NextResponse.json(
        {
          success: false,
          totalJobs: 0,
          queued: 0,
          alreadyDownloaded: 0,
          message: 'Invalid project ID',
          error: 'Invalid project ID format',
        } as DownloadSegmentsResponse,
        { status: 400 }
      );
    }

    // Check yt-dlp health first
    const healthCheck = await checkYtDlpHealth();
    if (!healthCheck.available) {
      return NextResponse.json(
        {
          success: false,
          totalJobs: 0,
          queued: 0,
          alreadyDownloaded: 0,
          message: 'yt-dlp not available',
          error: healthCheck.error || 'yt-dlp not installed. See installation guide.',
        } as DownloadSegmentsResponse,
        { status: 503 }
      );
    }

    // Load suggestions - either specific IDs or all pending
    const pendingSuggestions = suggestionIds
      ? loadSuggestionsByIds(projectId, suggestionIds)
      : loadPendingSuggestions(projectId);
    const alreadyDownloaded = countDownloadedSuggestions(projectId);

    if (pendingSuggestions.length === 0) {
      return NextResponse.json({
        success: true,
        totalJobs: 0,
        queued: 0,
        alreadyDownloaded,
        message: alreadyDownloaded > 0
          ? `All ${alreadyDownloaded} suggestions already downloaded`
          : 'No pending downloads',
      } as DownloadSegmentsResponse);
    }

    // PROACTIVE DISK SPACE CHECK
    const estimatedSizePerSegment = 5 * 1024 * 1024; // 5MB per segment
    const requiredSpace = pendingSuggestions.length * estimatedSizePerSegment;
    const bufferSpace = 100 * 1024 * 1024; // 100MB safety buffer
    const totalRequired = requiredSpace + bufferSpace;

    const { available, freeSpace } = await checkDiskSpace(totalRequired);

    if (!available) {
      const requiredMB = Math.ceil(totalRequired / (1024 * 1024));
      const freeMB = Math.ceil(freeSpace / (1024 * 1024));

      return NextResponse.json(
        {
          success: false,
          totalJobs: pendingSuggestions.length,
          queued: 0,
          alreadyDownloaded,
          message: 'Insufficient disk space',
          error: `Insufficient disk space. Required: ${requiredMB}MB, Available: ${freeMB}MB. Free up space and retry.`,
        } as DownloadSegmentsResponse,
        { status: 507 } // HTTP 507 Insufficient Storage
      );
    }

    // Create .cache/videos/{projectId}/ directory
    const videoCacheDir = path.join(process.cwd(), '.cache', 'videos', projectId);
    await fs.mkdir(videoCacheDir, { recursive: true });

    // Enqueue download jobs
    let queuedCount = 0;
    const errors: string[] = [];

    for (const suggestion of pendingSuggestions) {
      try {
        // Get scene duration
        const sceneDuration = getSceneDuration(suggestion.scene_id);

        // Calculate segment duration (scene duration + 5s buffer)
        const segmentDuration = sceneDuration + 5;

        // Build relative output path with zero-padded scene number
        const paddedSceneNumber = suggestion.scene_number.toString().padStart(2, '0');
        const filename = `scene-${paddedSceneNumber}-default.mp4`;
        const relativePath = path.join('.cache', 'videos', projectId, filename);

        // Create download job
        const job: DownloadJob = {
          id: randomUUID(),
          suggestionId: suggestion.id,
          videoId: suggestion.video_id,
          segmentDuration,
          outputPath: relativePath,
          projectId,
          sceneNumber: suggestion.scene_number,
          status: 'queued',
          retryCount: 0,
        };

        // Enqueue job
        await downloadQueue.enqueueJob(job);
        queuedCount++;
      } catch (error: any) {
        console.error(`[Download Segments] Failed to enqueue job for suggestion ${suggestion.id}:`, error);
        errors.push(`Failed to enqueue ${suggestion.video_id}: ${error.message}`);
      }
    }

    // Return response
    const response: DownloadSegmentsResponse = {
      success: queuedCount > 0,
      totalJobs: pendingSuggestions.length,
      queued: queuedCount,
      alreadyDownloaded,
      message: `Queued ${queuedCount} of ${pendingSuggestions.length} downloads`,
    };

    if (errors.length > 0) {
      response.error = `Some jobs failed to enqueue: ${errors.join('; ')}`;
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[Download Segments] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        totalJobs: 0,
        queued: 0,
        alreadyDownloaded: 0,
        message: 'Internal server error',
        error: error.message || 'Unknown error occurred',
      } as DownloadSegmentsResponse,
      { status: 500 }
    );
  }
}
