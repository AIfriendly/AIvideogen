/**
 * Channel Sync Service
 *
 * Orchestrates channel synchronization: fetches videos, scrapes transcripts,
 * generates embeddings, and stores in ChromaDB.
 * Story 6.3 - YouTube Channel Sync & Caption Scraping
 */

import { randomUUID } from 'crypto';
import {
  getYouTubeChannelService,
  type YouTubeVideo,
  type YouTubeChannel
} from './youtube-channel';
import {
  scrapeVideoTranscripts,
  type ScrapedTranscript,
  type TranscriptError,
  type TranscriptErrorCode
} from './python-bridge';
import {
  createChannel,
  getChannelById,
  getChannelByYouTubeId,
  updateChannel,
  upsertChannelVideo,
  getUnprocessedVideos,
  getVideosNeedingEmbedding,
  updateVideoTranscript,
  updateVideoEmbeddingStatus,
  getLatestVideoDate
} from '@/lib/db/queries-channels';
import { getChromaClient } from '../vector-db/chroma-client';
import { generateEmbedding } from '../embeddings/local-embeddings';
import type { Channel, ChannelVideo } from '../types';

/**
 * Sync options
 */
export interface ChannelSyncOptions {
  maxVideos?: number;           // Max videos to fetch (default: 50)
  incremental?: boolean;        // Only sync new videos (default: true)
  scrapeTranscripts?: boolean;  // Scrape transcripts (default: true)
  generateEmbeddings?: boolean; // Generate and store embeddings (default: true)
  onProgress?: (progress: SyncProgress) => void;
}

/**
 * Sync progress callback data
 */
export interface SyncProgress {
  stage: 'fetching_videos' | 'scraping_transcripts' | 'generating_embeddings' | 'complete';
  percent: number;
  message: string;
  videosTotal?: number;
  videosProcessed?: number;
  transcriptsScraped?: number;
  transcriptsFailed?: number;
  embeddingsGenerated?: number;
}

/**
 * Sync result
 */
export interface ChannelSyncResult {
  success: boolean;
  channelId: string;
  channelName: string;
  videosFound: number;
  videosSynced: number;
  transcriptsScraped: number;
  transcriptsFailed: number;
  embeddingsGenerated: number;
  errors: {
    videoId: string;
    error: TranscriptErrorCode | 'EMBEDDING_ERROR';
    message: string;
  }[];
  durationMs: number;
}

/**
 * Channel Sync Service
 */
export class ChannelSyncService {
  private youtubeService = getYouTubeChannelService();

  /**
   * Add a new channel to track
   *
   * @param channelIdentifier - YouTube channel ID, handle, or URL
   * @param options - Channel configuration
   * @returns Created channel record
   */
  async addChannel(
    channelIdentifier: string,
    options: {
      isUserChannel?: boolean;
      isCompetitor?: boolean;
      niche?: string;
    } = {}
  ): Promise<Channel> {
    // Resolve channel from YouTube
    const ytChannel = await this.youtubeService.resolveChannel(channelIdentifier);

    if (!ytChannel) {
      throw new Error(`Channel not found: ${channelIdentifier}`);
    }

    // Check if already exists
    const existing = getChannelByYouTubeId(ytChannel.channelId);
    if (existing) {
      // Update existing channel
      return updateChannel(existing.id, {
        name: ytChannel.name,
        description: ytChannel.description,
        subscriberCount: ytChannel.subscriberCount,
        videoCount: ytChannel.videoCount,
        isUserChannel: options.isUserChannel,
        isCompetitor: options.isCompetitor,
        niche: options.niche
      })!;
    }

    // Create new channel
    return createChannel({
      channelId: ytChannel.channelId,
      name: ytChannel.name,
      description: ytChannel.description,
      subscriberCount: ytChannel.subscriberCount,
      videoCount: ytChannel.videoCount,
      isUserChannel: options.isUserChannel,
      isCompetitor: options.isCompetitor,
      niche: options.niche
    });
  }

  /**
   * Sync a channel's content
   *
   * Fetches videos, scrapes transcripts, generates embeddings.
   *
   * @param channelId - Internal channel ID (not YouTube ID)
   * @param options - Sync options
   * @returns Sync result
   */
  async syncChannel(channelId: string, options: ChannelSyncOptions = {}): Promise<ChannelSyncResult> {
    const startTime = Date.now();
    const channel = getChannelById(channelId);

    if (!channel) {
      throw new Error(`Channel not found: ${channelId}`);
    }

    const maxVideos = options.maxVideos || 50;
    const incremental = options.incremental !== false;
    const scrapeTranscripts = options.scrapeTranscripts !== false;
    const generateEmbeddings = options.generateEmbeddings !== false;
    const onProgress = options.onProgress || (() => {});

    const result: ChannelSyncResult = {
      success: false,
      channelId: channel.channelId,
      channelName: channel.name,
      videosFound: 0,
      videosSynced: 0,
      transcriptsScraped: 0,
      transcriptsFailed: 0,
      embeddingsGenerated: 0,
      errors: [],
      durationMs: 0
    };

    try {
      // Update sync status to syncing
      updateChannel(channel.id, { syncStatus: 'syncing' });

      // ============================================================
      // STAGE 1: Fetch videos from YouTube
      // ============================================================
      onProgress({
        stage: 'fetching_videos',
        percent: 10,
        message: 'Fetching videos from YouTube...'
      });

      const publishedAfter = incremental ? getLatestVideoDate(channel.channelId) : undefined;

      const videos = await this.youtubeService.getChannelVideos(channel.channelId, {
        maxResults: maxVideos,
        publishedAfter: publishedAfter || undefined,
        order: 'date'
      });

      result.videosFound = videos.length;

      // Store video metadata in database
      for (const video of videos) {
        upsertChannelVideo({
          channelId: channel.channelId,
          videoId: video.videoId,
          title: video.title,
          description: video.description,
          publishedAt: video.publishedAt,
          durationSeconds: video.durationSeconds,
          viewCount: video.viewCount
        });
        result.videosSynced++;
      }

      onProgress({
        stage: 'fetching_videos',
        percent: 30,
        message: `Found ${videos.length} videos`,
        videosTotal: videos.length,
        videosProcessed: videos.length
      });

      // ============================================================
      // STAGE 2: Scrape transcripts
      // ============================================================
      if (scrapeTranscripts && videos.length > 0) {
        onProgress({
          stage: 'scraping_transcripts',
          percent: 35,
          message: 'Scraping transcripts...',
          videosTotal: videos.length
        });

        // Get videos that need transcript scraping
        const unprocessedVideos = getUnprocessedVideos(channel.channelId, maxVideos);
        const videoIdsToScrape = unprocessedVideos.map(v => v.videoId);

        if (videoIdsToScrape.length > 0) {
          const transcriptResult = await scrapeVideoTranscripts(videoIdsToScrape, {
            rateLimitDelay: 0.5 // 500ms = 2 req/s
          });

          // Process successful transcripts
          for (const transcript of transcriptResult.transcripts) {
            updateVideoTranscript(transcript.videoId, transcript.text, 'pending');
            result.transcriptsScraped++;
          }

          // Process errors
          for (const error of transcriptResult.errors) {
            if (error.videoId) {
              // Mark video with error status
              updateVideoEmbeddingStatus(error.videoId, null, 'error');
              result.errors.push({
                videoId: error.videoId,
                error: error.error,
                message: error.message
              });
            }
            result.transcriptsFailed++;
          }
        }

        onProgress({
          stage: 'scraping_transcripts',
          percent: 60,
          message: `Scraped ${result.transcriptsScraped} transcripts (${result.transcriptsFailed} failed)`,
          transcriptsScraped: result.transcriptsScraped,
          transcriptsFailed: result.transcriptsFailed
        });
      }

      // ============================================================
      // STAGE 3: Generate embeddings
      // ============================================================
      if (generateEmbeddings) {
        onProgress({
          stage: 'generating_embeddings',
          percent: 65,
          message: 'Generating embeddings...'
        });

        // Get videos with transcripts but no embeddings
        const videosNeedingEmbedding = getVideosNeedingEmbedding(channel.channelId, maxVideos);

        for (let i = 0; i < videosNeedingEmbedding.length; i++) {
          const video = videosNeedingEmbedding[i];

          try {
            // Mark as processing
            updateVideoEmbeddingStatus(video.videoId, null, 'processing');

            // Generate embedding
            const embeddingResult = await generateEmbedding(video.transcript!);

            // Store in ChromaDB
            const chromaClient = await getChromaClient();
            const embeddingId = `video_${video.videoId}`;

            await chromaClient.addDocuments('channel_content', {
              ids: [embeddingId],
              embeddings: [embeddingResult.embedding],
              documents: [video.transcript!],
              metadatas: [{
                channelId: channel.channelId,
                videoId: video.videoId,
                title: video.title,
                publishedAt: video.publishedAt || '',
                type: 'video_transcript'
              }]
            });

            // Update database
            updateVideoEmbeddingStatus(video.videoId, embeddingId, 'embedded');
            result.embeddingsGenerated++;

          } catch (error) {
            updateVideoEmbeddingStatus(video.videoId, null, 'error');
            result.errors.push({
              videoId: video.videoId,
              error: 'EMBEDDING_ERROR',
              message: error instanceof Error ? error.message : String(error)
            });
          }

          // Progress update
          const progress = 65 + ((i + 1) / videosNeedingEmbedding.length) * 30;
          onProgress({
            stage: 'generating_embeddings',
            percent: Math.round(progress),
            message: `Generated ${result.embeddingsGenerated} embeddings`,
            embeddingsGenerated: result.embeddingsGenerated
          });
        }
      }

      // ============================================================
      // COMPLETE
      // ============================================================
      result.success = true;
      result.durationMs = Date.now() - startTime;

      // Update channel last sync
      updateChannel(channel.id, {
        lastSync: new Date().toISOString(),
        syncStatus: 'synced'
      });

      onProgress({
        stage: 'complete',
        percent: 100,
        message: `Sync complete: ${result.videosSynced} videos, ${result.transcriptsScraped} transcripts, ${result.embeddingsGenerated} embeddings`
      });

    } catch (error) {
      result.success = false;
      result.durationMs = Date.now() - startTime;

      // Update channel status to error
      updateChannel(channel.id, { syncStatus: 'error' });

      result.errors.push({
        videoId: '',
        error: 'UNKNOWN_ERROR' as TranscriptErrorCode,
        message: error instanceof Error ? error.message : String(error)
      });

      throw error;
    }

    return result;
  }

  /**
   * Sync all channels in a batch
   *
   * @param options - Sync options (applied to all channels)
   * @returns Array of sync results
   */
  async syncAllChannels(options: ChannelSyncOptions = {}): Promise<ChannelSyncResult[]> {
    const { getAllChannels } = await import('@/lib/db/queries-channels');
    const channels = getAllChannels();
    const results: ChannelSyncResult[] = [];

    for (const channel of channels) {
      try {
        const result = await this.syncChannel(channel.id, options);
        results.push(result);
      } catch (error) {
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
            error: 'UNKNOWN_ERROR' as TranscriptErrorCode,
            message: error instanceof Error ? error.message : String(error)
          }],
          durationMs: 0
        });
      }
    }

    return results;
  }
}

// Export singleton instance
let channelSyncService: ChannelSyncService | null = null;

export function getChannelSyncService(): ChannelSyncService {
  if (!channelSyncService) {
    channelSyncService = new ChannelSyncService();
  }
  return channelSyncService;
}
