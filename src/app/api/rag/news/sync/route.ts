/**
 * News Sync API - Story 6.4
 *
 * POST /api/rag/news/sync - Trigger manual news sync
 */

import { NextRequest, NextResponse } from 'next/server';
import { jobQueue } from '@/lib/jobs/queue';

interface SyncRequestBody {
  sourceIds?: string[];     // Specific sources to sync (empty = all enabled)
  skipEmbedding?: boolean;  // Skip embedding generation
  skipPruning?: boolean;    // Skip old article pruning
}

/**
 * POST /api/rag/news/sync
 *
 * Triggers a manual news fetch job
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as SyncRequestBody;
    const { sourceIds, skipEmbedding, skipPruning } = body;

    // Validate sourceIds if provided
    if (sourceIds && !Array.isArray(sourceIds)) {
      return NextResponse.json(
        { success: false, error: 'sourceIds must be an array' },
        { status: 400 }
      );
    }

    // Enqueue the news fetch job
    const jobId = jobQueue.enqueue({
      type: 'rag_sync_news',
      payload: {
        sourceIds,
        skipEmbedding: skipEmbedding || false,
        skipPruning: skipPruning || false
      },
      priority: 2  // High priority for manual sync
    });

    console.log(`[API] POST /api/rag/news/sync - Enqueued job ${jobId}`);

    return NextResponse.json({
      success: true,
      jobId,
      message: 'News sync job enqueued'
    });
  } catch (error) {
    console.error('[API] POST /api/rag/news/sync error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start news sync'
      },
      { status: 500 }
    );
  }
}
