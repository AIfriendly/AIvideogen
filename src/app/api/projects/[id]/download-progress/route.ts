/**
 * Download Progress Tracking Endpoint
 *
 * Returns real-time progress of download jobs for a project.
 * Used for progress bars and status updates in the UI.
 *
 * Story 3.6: Default Segment Download Service
 *
 * GET /api/projects/[id]/download-progress
 * Response: { total, completed, downloading, queued, failed, message }
 */

import { NextRequest, NextResponse } from 'next/server';
import { downloadQueue } from '@/lib/youtube/download-queue';
import { validateProjectId } from '@/lib/utils/validate-project-id';

// ============================================================================
// Types
// ============================================================================

interface DownloadProgressResponse {
  total: number;
  completed: number;
  downloading: number;
  queued: number;
  failed: number;
  message: string;
}

// ============================================================================
// API Route Handler
// ============================================================================

/**
 * GET /api/projects/[id]/download-progress
 * Get download progress for a project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  try {
    // Validate project ID
    if (!validateProjectId(projectId)) {
      return NextResponse.json(
        {
          total: 0,
          completed: 0,
          downloading: 0,
          queued: 0,
          failed: 0,
          message: 'Invalid project ID',
        } as DownloadProgressResponse,
        { status: 400 }
      );
    }

    // Get queue status from download queue
    const status = downloadQueue.getQueueStatus(projectId);

    // Build message
    let message: string;
    if (status.total === 0) {
      message = 'No downloads found for this project';
    } else if (status.completed === status.total) {
      message = `All ${status.total} segments downloaded`;
    } else {
      message = `Downloaded ${status.completed}/${status.total} segments`;
      if (status.downloading > 0) {
        message += ` (${status.downloading} downloading)`;
      }
      if (status.queued > 0) {
        message += ` (${status.queued} queued)`;
      }
      if (status.failed > 0) {
        message += ` (${status.failed} failed)`;
      }
    }

    const response: DownloadProgressResponse = {
      ...status,
      message,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[Download Progress] Unexpected error:', error);
    return NextResponse.json(
      {
        total: 0,
        completed: 0,
        downloading: 0,
        queued: 0,
        failed: 0,
        message: 'Error fetching download progress',
      } as DownloadProgressResponse,
      { status: 500 }
    );
  }
}
