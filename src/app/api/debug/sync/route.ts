/**
 * Debug Sync API - Bypass job queue for direct sync testing
 *
 * This endpoint runs the sync synchronously and returns detailed progress.
 * Useful for debugging sync issues without waiting for the job processor.
 *
 * POST /api/debug/sync
 *
 * Body:
 * - channelId: string (optional) - specific channel to sync, defaults to user channel
 * - maxVideos: number (optional) - max videos to fetch
 * - incremental: boolean (optional) - incremental sync
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserChannel, getChannelById } from '@/lib/db/queries-channels';
import { getChannelSyncService, type SyncProgress } from '@/lib/rag/ingestion/channel-sync';

export async function POST(request: NextRequest) {
  const logs: string[] = [];
  logs.push('=== Debug Sync Started ===');

  try {
    const body = await request.json();
    const { channelId, maxVideos = 12, incremental = false } = body;

    // Get channel to sync
    const channel = channelId ? getChannelById(channelId) : getUserChannel();

    if (!channel) {
      logs.push('❌ No user channel found');
      return NextResponse.json({
        success: false,
        error: 'No user channel found. Please set up RAG first.',
        logs
      }, { status: 404 });
    }

    logs.push(`📺 Channel: ${channel.name}`);
    logs.push(`🆔 Channel ID: ${channel.channelId}`);
    logs.push(`📊 Video Count: ${channel.videoCount || 'Unknown'}`);
    logs.push(`🏷️  Niche: ${channel.niche || 'Not set'}`);

    // Get sync service
    const syncService = getChannelSyncService();

    // Progress callback to capture logs
    const onProgress = (progress: SyncProgress) => {
      const log = `[${progress.percent}%] ${progress.message}`;
      logs.push(log);
      console.log(`[DebugSync] ${log}`);
    };

    logs.push('🚀 Starting sync...');

    // Run sync
    const result = await syncService.syncChannel(channel.id, {
      maxVideos,
      incremental,
      scrapeTranscripts: true,
      generateEmbeddings: true,
      onProgress
    });

    logs.push('✅ Sync completed!');
    logs.push(`📊 Videos found: ${result.videosFound}`);
    logs.push(`📊 Videos synced: ${result.videosSynced}`);
    logs.push(`📊 Transcripts scraped: ${result.transcriptsScraped}`);
    logs.push(`📊 Embeddings generated: ${result.embeddingsGenerated}`);
    logs.push(`⏱️  Duration: ${(result.durationMs / 1000).toFixed(1)}s`);

    if (result.errors.length > 0) {
      logs.push(`⚠️  Errors: ${result.errors.length}`);
      result.errors.slice(0, 5).forEach((err, i) => {
        logs.push(`  ${i + 1}. ${err.videoId || 'N/A'}: ${err.message}`);
      });
    }

    return NextResponse.json({
      success: true,
      result,
      logs
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logs.push(`❌ Sync failed: ${errorMessage}`);
    console.error('[DebugSync] Error:', error);

    // Provide helpful error message
    let helpfulMessage = errorMessage;
    if (errorMessage.includes('ChromaDB') || errorMessage.includes('chromadb') || errorMessage.includes('ECONNREFUSED')) {
      helpfulMessage = 'ChromaDB is not running. Please start ChromaDB first:\n  docker run -p 8000:8000 chromadb/chroma';
    }

    return NextResponse.json({
      success: false,
      error: helpfulMessage,
      logs
    }, { status: 500 });
  }
}
