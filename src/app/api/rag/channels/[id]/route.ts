/**
 * RAG Channel API - GET, DELETE by ID
 *
 * Story 6.3 - YouTube Channel Sync & Caption Scraping
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getChannelById,
  updateChannel,
  deleteChannel,
  getChannelVideos,
  getChannelVideoCount,
  getEmbeddedVideoCount
} from '@/lib/db/queries-channels';

/**
 * GET /api/rag/channels/[id]
 *
 * Get channel details including video stats.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const channel = getChannelById(id);

    if (!channel) {
      return NextResponse.json(
        { success: false, error: 'Channel not found' },
        { status: 404 }
      );
    }

    // Get video stats
    const videoCount = getChannelVideoCount(channel.channelId);
    const embeddedCount = getEmbeddedVideoCount(channel.channelId);

    // Get recent videos
    const recentVideos = getChannelVideos(channel.channelId, {
      limit: 10,
      orderBy: 'published_at',
      order: 'DESC'
    });

    return NextResponse.json({
      success: true,
      channel,
      stats: {
        totalVideos: videoCount,
        embeddedVideos: embeddedCount,
        pendingVideos: videoCount - embeddedCount
      },
      recentVideos
    });

  } catch (error) {
    console.error('[RAG Channel API] GET error:', error);
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
 * PATCH /api/rag/channels/[id]
 *
 * Update channel metadata.
 *
 * Body:
 * - isUserChannel: boolean (optional)
 * - isCompetitor: boolean (optional)
 * - niche: string (optional)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const channel = getChannelById(id);
    if (!channel) {
      return NextResponse.json(
        { success: false, error: 'Channel not found' },
        { status: 404 }
      );
    }

    const { isUserChannel, isCompetitor, niche } = body;

    const updated = updateChannel(id, {
      isUserChannel: isUserChannel !== undefined ? isUserChannel : undefined,
      isCompetitor: isCompetitor !== undefined ? isCompetitor : undefined,
      niche: niche !== undefined ? niche : undefined
    });

    return NextResponse.json({
      success: true,
      channel: updated
    });

  } catch (error) {
    console.error('[RAG Channel API] PATCH error:', error);
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
 * DELETE /api/rag/channels/[id]
 *
 * Delete a channel and all its videos.
 * Also removes all associated embeddings from ChromaDB.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const channel = getChannelById(id);

    if (!channel) {
      return NextResponse.json(
        { success: false, error: 'Channel not found' },
        { status: 404 }
      );
    }

    // Delete channel (async - also removes ChromaDB embeddings)
    const deleted = await deleteChannel(id);

    return NextResponse.json({
      success: deleted,
      message: deleted
        ? `Channel ${channel.name} deleted successfully (embeddings removed from ChromaDB)`
        : 'Channel deletion failed'
    });

  } catch (error) {
    console.error('[RAG Channel API] DELETE error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
