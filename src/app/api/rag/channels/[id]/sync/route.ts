/**
 * RAG Channel Sync API - POST (trigger sync)
 *
 * Story 6.3 - YouTube Channel Sync & Caption Scraping
 */

import { NextRequest, NextResponse } from 'next/server';
import { getChannelById } from '@/lib/db/queries-channels';
import { jobQueue } from '@/lib/jobs/queue';
import { initializeJobs, isJobsInitialized } from '@/lib/jobs/init';

/**
 * POST /api/rag/channels/[id]/sync
 *
 * Trigger a sync job for a specific channel.
 *
 * Body:
 * - incremental: boolean (optional, default: true) - only sync new videos
 * - maxVideos: number (optional, default: 50) - max videos to fetch
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auto-initialize job processor if needed
    if (!isJobsInitialized()) {
      console.log('[RAG Channel Sync] Job processor not initialized, initializing...');
      await initializeJobs();
      console.log('[RAG Channel Sync] Job processor initialized');
    }

    const { id } = await params;
    const channel = getChannelById(id);

    if (!channel) {
      return NextResponse.json(
        { success: false, error: 'Channel not found' },
        { status: 404 }
      );
    }

    // Parse request body
    let incremental = true;
    let maxVideos = 50;

    try {
      const body = await request.json();
      incremental = body.incremental !== false;
      maxVideos = body.maxVideos || 50;
    } catch {
      // Empty body is OK, use defaults
    }

    // Enqueue sync job
    const jobId = jobQueue.enqueue({
      type: 'rag_sync_channel',
      payload: {
        channelId: id,
        incremental,
        maxVideos: Math.min(maxVideos, 50) // Cap at 50
      },
      priority: 3 // High priority for user-initiated sync
    });

    return NextResponse.json({
      success: true,
      jobId,
      channel: {
        id: channel.id,
        channelId: channel.channelId,
        name: channel.name
      },
      message: `Sync job enqueued for ${channel.name}`,
      settings: {
        incremental,
        maxVideos: Math.min(maxVideos, 50)
      }
    });

  } catch (error) {
    console.error('[RAG Channel Sync API] POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
