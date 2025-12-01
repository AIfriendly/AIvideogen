/**
 * RAG Ingestion Module Exports
 *
 * Story 6.3 - YouTube Channel Sync & Caption Scraping
 */

// Python bridge for transcript scraping
export {
  scrapeVideoTranscript,
  scrapeVideoTranscripts,
  isRecoverableError,
  errorCodeToEmbeddingStatus,
  type ScrapedTranscript,
  type TranscriptError,
  type TranscriptErrorCode,
  type TranscriptResult,
  type TranscriptSegment
} from './python-bridge';

// YouTube channel service
export {
  YouTubeChannelService,
  getYouTubeChannelService,
  type YouTubeChannel,
  type YouTubeVideo,
  type GetChannelVideosOptions
} from './youtube-channel';

// Channel sync service
export {
  ChannelSyncService,
  getChannelSyncService,
  type ChannelSyncOptions,
  type ChannelSyncResult,
  type SyncProgress
} from './channel-sync';
