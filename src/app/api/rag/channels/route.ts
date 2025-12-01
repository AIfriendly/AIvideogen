/**
 * RAG Channels API - GET (list) and POST (add)
 *
 * Story 6.3 - YouTube Channel Sync & Caption Scraping
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllChannels, getChannelsByNiche, createChannel, getChannelByYouTubeId } from '@/lib/db/queries-channels';
import { getChannelSyncService } from '@/lib/rag/ingestion/channel-sync';
import { jobQueue } from '@/lib/jobs/queue';

/**
 * GET /api/rag/channels
 *
 * List all tracked channels or filter by niche.
 *
 * Query params:
 * - niche: Filter by niche (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const niche = searchParams.get('niche');

    const channels = niche
      ? getChannelsByNiche(niche)
      : getAllChannels();

    return NextResponse.json({
      success: true,
      channels,
      count: channels.length
    });

  } catch (error) {
    console.error('[RAG Channels API] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/rag/channels
 *
 * Add a new channel to track.
 *
 * Body:
 * - channelIdentifier: YouTube channel ID, handle, or URL (required)
 * - isUserChannel: boolean (optional)
 * - isCompetitor: boolean (optional)
 * - niche: string (optional)
 * - autoSync: boolean (optional, default: true) - trigger sync job immediately
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelIdentifier, isUserChannel, isCompetitor, niche, autoSync = true } = body;

    if (!channelIdentifier) {
      return NextResponse.json(
        { success: false, error: 'channelIdentifier is required' },
        { status: 400 }
      );
    }

    // Add channel
    const syncService = getChannelSyncService();
    const channel = await syncService.addChannel(channelIdentifier, {
      isUserChannel: !!isUserChannel,
      isCompetitor: !!isCompetitor,
      niche: niche || undefined
    });

    // Enqueue sync job if autoSync is enabled
    let jobId: string | null = null;
    if (autoSync) {
      jobId = jobQueue.enqueue({
        type: 'rag_sync_channel',
        payload: {
          channelId: channel.id,
          incremental: false, // Full sync for new channel
          maxVideos: 50
        },
        priority: 3 // High priority
      });
    }

    return NextResponse.json({
      success: true,
      channel,
      syncJobId: jobId,
      message: autoSync
        ? `Channel added and sync job enqueued (job: ${jobId})`
        : 'Channel added (sync not triggered)'
    });

  } catch (error) {
    console.error('[RAG Channels API] POST error:', error);

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { success: false, error: 'Channel not found on YouTube' },
          { status: 404 }
        );
      }
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { success: false, error: 'YouTube API configuration error' },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
