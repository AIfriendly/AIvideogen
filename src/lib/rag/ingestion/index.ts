/**
 * RAG Ingestion Module Exports
 *
 * Story 6.3 - YouTube Channel Sync & Caption Scraping
 * Story 6.4 - News Feed Aggregation & Embedding
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

// News sources configuration
export {
  getNewsSources,
  getNewsSourcesByNiche,
  getEnabledNewsSources,
  getEnabledNewsSourcesByNiche,
  getNewsSourceById,
  toggleNewsSourceEnabled,
  updateNewsSourceLastFetch,
  type NewsSource,
  MILITARY_NEWS_SOURCE_IDS,
  type MilitaryNewsSourceId
} from './news-sources';

// News fetcher service
export {
  fetchNewsSource,
  fetchAllNewsSources,
  getSuccessfulResults,
  getFetchSummary,
  type ParsedNewsArticle,
  type FetchSourceResult
} from './news-fetcher';

// News embedding service
export {
  embedNewsArticle,
  embedNewsArticles,
  deleteNewsEmbeddings,
  type ArticleEmbeddingResult,
  type BatchEmbeddingResult
} from './news-embedding';
