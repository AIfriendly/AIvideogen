/**
 * RAG System Type Definitions
 *
 * Type definitions for the Channel Intelligence & Content Research system.
 * Story 6.1 - RAG Infrastructure Setup
 */

// RAG Configuration
export interface RAGConfig {
  mode: 'established' | 'cold_start';
  userChannelId?: string;           // For established mode
  competitorChannels: string[];     // Up to 5
  niche: string;
  newsEnabled: boolean;
  trendsEnabled: boolean;
  syncFrequency: 'daily' | 'weekly';
}

// RAG Context for script generation
export interface RAGContext {
  channelContent: RetrievedDocument[];
  competitorContent: RetrievedDocument[];
  newsArticles: RetrievedDocument[];
  trendingTopics: RetrievedDocument[];
}

// Retrieved document from vector search
export interface RetrievedDocument {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  score: number;
}

// Video transcript from YouTube
export interface VideoTranscript {
  videoId: string;
  channelId: string;
  title: string;
  description: string;
  transcript: TranscriptSegment[];
  fullText: string;
  publishedAt: string;
}

// Transcript segment with timing
export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

// News article from RSS feed
export interface NewsArticle {
  id: string;
  sourceId: string;
  headline: string;
  summary: string;
  url: string;
  publishedAt: string;
  niche: string;
}

// Channel information
export interface Channel {
  id: string;
  channelId: string;
  name: string;
  description: string | null;
  subscriberCount: number | null;
  videoCount: number | null;
  isUserChannel: boolean;
  isCompetitor: boolean;
  niche: string | null;
  lastSync: string | null;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'error';
  createdAt: string;
  updatedAt: string;
}

// Channel video with transcript
export interface ChannelVideo {
  id: string;
  channelId: string;
  videoId: string;
  title: string;
  description: string | null;
  publishedAt: string | null;
  durationSeconds: number | null;
  viewCount: number | null;
  transcript: string | null;
  embeddingId: string | null;
  embeddingStatus: 'pending' | 'processing' | 'embedded' | 'error';
  createdAt: string;
}

// News source configuration
export interface NewsSource {
  id: string;
  name: string;
  url: string;
  niche: string;
  fetchMethod: 'rss' | 'scrape';
  enabled: boolean;
  lastFetch: string | null;
  articleCount: number;
  createdAt: string;
}

// ChromaDB collection names
export type ChromaCollection = 'channel_content' | 'news_articles' | 'trending_topics';

// Embedding result
export interface EmbeddingResult {
  embedding: number[];
  dimensions: number;
  model: string;
}

// RAG health status
export interface RAGHealthStatus {
  chromadb: {
    connected: boolean;
    error?: string;
  };
  collections: {
    channel_content: number;
    news_articles: number;
    trending_topics: number;
  };
  embeddings: {
    available: boolean;
    model: string;
    dimensions: number;
    error?: string;
  };
  overall: 'healthy' | 'degraded' | 'unhealthy';
}
