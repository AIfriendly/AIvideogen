/**
 * RAG Sync Channel Handler - Story 6.3
 *
 * Handler for syncing YouTube channel content to ChromaDB.
 * Implements full sync logic: fetch videos → scrape transcripts → generate embeddings.
 */

import type { Job, JobHandler } from '../types';
import { jobQueue } from '../queue';
import { getChannelSyncService, type SyncProgress, type ChannelSyncResult } from '@/lib/rag/ingestion/channel-sync';
import { getChannelById, getAllChannels } from '@/lib/db/queries-channels';

/**
 * Job payload for RAG channel sync
 */
interface RagSyncChannelPayload {
  channelId?: string;           // Internal channel ID (sync specific channel)
  youtubeChannelId?: string;    // YouTube channel ID (for adding new channel)
  maxVideos?: number;           // Max videos to fetch (default: 50)
  incremental?: boolean;        // Incremental sync (default: true)
  isUserChannel?: boolean;      // Mark as user's own channel
  isCompetitor?: boolean;       // Mark as competitor channel
  niche?: string;               // Channel niche category
}

/**
 * RAG Channel Sync Job Handler
 *
 * Syncs YouTube channel transcripts to ChromaDB.
 * Can sync a specific channel or all channels.
 */
export const ragSyncChannelHandler: JobHandler = async (job: Job) => {
  const payload = job.payload as RagSyncChannelPayload;
  const { channelId, youtubeChannelId, maxVideos, incremental, isUserChannel, isCompetitor, niche } = payload;

  console.log(`[ragSyncChannelHandler] Starting sync job ${job.id}`);
  jobQueue.updateProgress(job.id, 5);

  const syncService = getChannelSyncService();

  // Progress callback to update job progress
  const onProgress = (progress: SyncProgress) => {
    jobQueue.updateProgress(job.id, progress.percent);
    console.log(`[ragSyncChannelHandler] ${progress.message} (${progress.percent}%)`);
  };

  try {
    // Case 1: Sync a specific channel by internal ID
    if (channelId) {
      const channel = getChannelById(channelId);
      if (!channel) {
        throw new Error(`Channel not found: ${channelId}`);
      }

      console.log(`[ragSyncChannelHandler] Syncing channel: ${channel.name} (${channel.channelId})`);

      const result = await syncService.syncChannel(channelId, {
        maxVideos: maxVideos || 50,
        incremental: incremental !== false,
        onProgress
      });

      return formatSyncResult(result);
    }

    // Case 2: Add and sync a new channel by YouTube channel ID
    if (youtubeChannelId) {
      console.log(`[ragSyncChannelHandler] Adding new channel: ${youtubeChannelId}`);
      jobQueue.updateProgress(job.id, 10);

      const channel = await syncService.addChannel(youtubeChannelId, {
        isUserChannel,
        isCompetitor,
        niche
      });

      console.log(`[ragSyncChannelHandler] Channel added: ${channel.name}, starting sync...`);

      const result = await syncService.syncChannel(channel.id, {
        maxVideos: maxVideos || 50,
        incremental: false, // Full sync for new channel
        onProgress
      });

      return formatSyncResult(result);
    }

    // Case 3: Sync all channels
    console.log(`[ragSyncChannelHandler] Syncing all channels`);

    const channels = getAllChannels();
    if (channels.length === 0) {
      return {
        success: true,
        message: 'No channels to sync',
        channelsSynced: 0
      };
    }

    const results: ChannelSyncResult[] = [];
    const channelCount = channels.length;

    for (let i = 0; i < channelCount; i++) {
      const channel = channels[i];
      console.log(`[ragSyncChannelHandler] Syncing channel ${i + 1}/${channelCount}: ${channel.name}`);

      // Update progress for multi-channel sync
      const baseProgress = Math.round((i / channelCount) * 90);
      const channelProgress = (progress: SyncProgress) => {
        const totalProgress = baseProgress + Math.round((progress.percent / 100) * (90 / channelCount));
        jobQueue.updateProgress(job.id, totalProgress);
      };

      try {
        const result = await syncService.syncChannel(channel.id, {
          maxVideos: maxVideos || 50,
          incremental: incremental !== false,
          onProgress: channelProgress
        });
        results.push(result);
      } catch (error) {
        console.error(`[ragSyncChannelHandler] Failed to sync channel ${channel.name}:`, error);
        results.push({
          success: false,
          channelId: channel.channelId,
          channelName: channel.name,
          videosFound: 0,
          videosSynced: 0,
          transcriptsScraped: 0,
          transcriptsFailed: 0,
          embeddingsGenerated: 0,
          errors: [{
            videoId: '',
            error: 'UNKNOWN_ERROR',
            message: error instanceof Error ? error.message : String(error)
          }],
          durationMs: 0
        });
      }
    }

    jobQueue.updateProgress(job.id, 100);

    // Aggregate results
    const summary = {
      success: results.every(r => r.success),
      channelsSynced: results.length,
      channelsSucceeded: results.filter(r => r.success).length,
      channelsFailed: results.filter(r => !r.success).length,
      totalVideos: results.reduce((sum, r) => sum + r.videosSynced, 0),
      totalTranscripts: results.reduce((sum, r) => sum + r.transcriptsScraped, 0),
      totalEmbeddings: results.reduce((sum, r) => sum + r.embeddingsGenerated, 0),
      totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
      results: results.map(r => ({
        channelId: r.channelId,
        channelName: r.channelName,
        success: r.success,
        videos: r.videosSynced,
        transcripts: r.transcriptsScraped,
        embeddings: r.embeddingsGenerated,
        errors: r.errors.length
      }))
    };

    console.log(`[ragSyncChannelHandler] All channels synced: ${summary.channelsSucceeded}/${summary.channelsSynced} succeeded`);

    return summary;

  } catch (error) {
    console.error(`[ragSyncChannelHandler] Sync failed:`, error);
    throw error;
  }
};

/**
 * Format single channel sync result for job output
 */
function formatSyncResult(result: ChannelSyncResult) {
  return {
    success: result.success,
    channelId: result.channelId,
    channelName: result.channelName,
    videosFound: result.videosFound,
    videosSynced: result.videosSynced,
    transcriptsScraped: result.transcriptsScraped,
    transcriptsFailed: result.transcriptsFailed,
    embeddingsGenerated: result.embeddingsGenerated,
    errorCount: result.errors.length,
    durationMs: result.durationMs,
    errors: result.errors.slice(0, 10) // Limit errors in response
  };
}
