/**
 * RAG Test Factories - Story 6.1
 *
 * Factory functions for generating test data for RAG infrastructure tests.
 * Uses faker for unique, parallel-safe data generation.
 */

import { faker } from '@faker-js/faker';

// Types matching lib/rag/types.ts
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

export interface NewsArticle {
  id: string;
  sourceId: string;
  headline: string;
  summary: string | null;
  url: string;
  publishedAt: string | null;
  niche: string | null;
  embeddingId: string | null;
  createdAt: string;
}

export interface BackgroundJob {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  priority: number;
  payload: string | null;
  result: string | null;
  progress: number;
  attempt: number;
  maxAttempts: number;
  projectId: string | null;
  scheduledFor: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CronSchedule {
  id: string;
  name: string;
  jobType: string;
  cronExpression: string;
  payload: string | null;
  enabled: boolean;
  lastRun: string | null;
  nextRun: string | null;
  createdAt: string;
}

export interface EmbeddingResult {
  embedding: number[];
  dimensions: number;
  model: string;
}

export interface RAGConfig {
  mode: 'established' | 'cold_start';
  userChannelId?: string;
  competitorChannels: string[];
  niche: string;
  newsEnabled: boolean;
  trendsEnabled: boolean;
  syncFrequency: 'daily' | 'weekly';
}

// Factory Functions

export function createChannel(overrides: Partial<Channel> = {}): Channel {
  const now = new Date().toISOString();
  return {
    id: faker.string.uuid(),
    channelId: faker.string.alphanumeric(24),
    name: faker.company.name(),
    description: faker.lorem.paragraph(),
    subscriberCount: faker.number.int({ min: 1000, max: 10000000 }),
    videoCount: faker.number.int({ min: 10, max: 1000 }),
    isUserChannel: false,
    isCompetitor: false,
    niche: 'military',
    lastSync: null,
    syncStatus: 'pending',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createUserChannel(overrides: Partial<Channel> = {}): Channel {
  return createChannel({ isUserChannel: true, ...overrides });
}

export function createCompetitorChannel(overrides: Partial<Channel> = {}): Channel {
  return createChannel({ isCompetitor: true, ...overrides });
}

export function createChannelVideo(overrides: Partial<ChannelVideo> = {}): ChannelVideo {
  return {
    id: faker.string.uuid(),
    channelId: faker.string.alphanumeric(24),
    videoId: faker.string.alphanumeric(11),
    title: faker.lorem.sentence(),
    description: faker.lorem.paragraph(),
    publishedAt: faker.date.recent({ days: 30 }).toISOString(),
    durationSeconds: faker.number.int({ min: 60, max: 3600 }),
    viewCount: faker.number.int({ min: 100, max: 1000000 }),
    transcript: faker.lorem.paragraphs(5),
    embeddingId: null,
    embeddingStatus: 'pending',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createNewsSource(overrides: Partial<NewsSource> = {}): NewsSource {
  return {
    id: faker.string.uuid(),
    name: faker.company.name(),
    url: faker.internet.url(),
    niche: 'military',
    fetchMethod: 'rss',
    enabled: true,
    lastFetch: null,
    articleCount: 0,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createNewsArticle(overrides: Partial<NewsArticle> = {}): NewsArticle {
  return {
    id: faker.string.uuid(),
    sourceId: faker.string.uuid(),
    headline: faker.lorem.sentence(),
    summary: faker.lorem.paragraph(),
    url: faker.internet.url(),
    publishedAt: faker.date.recent({ days: 7 }).toISOString(),
    niche: 'military',
    embeddingId: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createBackgroundJob(overrides: Partial<BackgroundJob> = {}): BackgroundJob {
  const now = new Date().toISOString();
  return {
    id: faker.string.uuid(),
    type: 'channel_sync',
    status: 'pending',
    priority: 5,
    payload: null,
    result: null,
    progress: 0,
    attempt: 0,
    maxAttempts: 3,
    projectId: null,
    scheduledFor: null,
    startedAt: null,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createCronSchedule(overrides: Partial<CronSchedule> = {}): CronSchedule {
  return {
    id: faker.string.uuid(),
    name: `schedule-${faker.string.alphanumeric(8)}`,
    jobType: 'channel_sync',
    cronExpression: '0 0 * * *', // Daily at midnight
    payload: null,
    enabled: true,
    lastRun: null,
    nextRun: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createEmbedding(dimensions: number = 384): EmbeddingResult {
  return {
    embedding: Array.from({ length: dimensions }, () => faker.number.float({ min: -1, max: 1 })),
    dimensions,
    model: 'all-MiniLM-L6-v2',
  };
}

export function createRAGConfig(overrides: Partial<RAGConfig> = {}): RAGConfig {
  return {
    mode: 'cold_start',
    competitorChannels: [],
    niche: 'military',
    newsEnabled: true,
    trendsEnabled: true,
    syncFrequency: 'daily',
    ...overrides,
  };
}

export function createEstablishedRAGConfig(overrides: Partial<RAGConfig> = {}): RAGConfig {
  return createRAGConfig({
    mode: 'established',
    userChannelId: faker.string.alphanumeric(24),
    competitorChannels: [
      faker.string.alphanumeric(24),
      faker.string.alphanumeric(24),
    ],
    ...overrides,
  });
}

// Batch creation helpers

export function createChannels(count: number, overrides: Partial<Channel> = {}): Channel[] {
  return Array.from({ length: count }, () => createChannel(overrides));
}

export function createChannelVideos(count: number, channelId: string): ChannelVideo[] {
  return Array.from({ length: count }, () => createChannelVideo({ channelId }));
}

export function createNewsArticles(count: number, sourceId: string): NewsArticle[] {
  return Array.from({ length: count }, () => createNewsArticle({ sourceId }));
}

// ============================================================================
// Story 6.7: Channel Intelligence UI Factories
// ============================================================================

/**
 * Sync status for Channel Intelligence dashboard
 */
export interface SyncStatus {
  lastSync: string | null;
  videosIndexed: number;
  newsArticles: number;
  trendsIndexed: number;
  pendingJobs: number;
  activeSyncs: number;
  errors: SyncError[];
}

export interface SyncError {
  channelId: string;
  message: string;
  timestamp: string;
  retryable: boolean;
}

export interface RAGHealthStatus {
  chromadb: {
    connected: boolean;
    error?: string;
    latency?: number;
  };
  collections: {
    videos: number;
    news: number;
    trends: number;
  };
  embeddings: {
    available: boolean;
    model: string;
    dimensions: number;
  };
}

export interface TopicSuggestion {
  id: string;
  title: string;
  description: string;
  relevanceScore: number;
  sourceChannels: string[];
  relatedNews: string[];
}

export interface ChannelPreview {
  channelId: string;
  name: string;
  description: string;
  thumbnailUrl: string;
  videoCount: number;
  subscriberCount: number;
  customUrl?: string;
}

/**
 * Create sync status for Channel Intelligence dashboard
 */
export function createSyncStatus(overrides: Partial<SyncStatus> = {}): SyncStatus {
  return {
    lastSync: faker.date.recent({ days: 1 }).toISOString(),
    videosIndexed: faker.number.int({ min: 10, max: 500 }),
    newsArticles: faker.number.int({ min: 5, max: 100 }),
    trendsIndexed: faker.number.int({ min: 0, max: 20 }),
    pendingJobs: faker.number.int({ min: 0, max: 3 }),
    activeSyncs: 0,
    errors: [],
    ...overrides,
  };
}

/**
 * Create sync status with active sync in progress
 */
export function createActiveSyncStatus(overrides: Partial<SyncStatus> = {}): SyncStatus {
  return createSyncStatus({
    activeSyncs: 1,
    pendingJobs: faker.number.int({ min: 1, max: 5 }),
    ...overrides,
  });
}

/**
 * Create sync status with errors
 */
export function createErrorSyncStatus(overrides: Partial<SyncStatus> = {}): SyncStatus {
  return createSyncStatus({
    errors: [
      {
        channelId: faker.string.alphanumeric(24),
        message: 'YouTube API rate limit exceeded',
        timestamp: faker.date.recent().toISOString(),
        retryable: true,
      },
    ],
    ...overrides,
  });
}

/**
 * Create RAG health status (ChromaDB connected)
 */
export function createRAGHealthStatus(overrides: Partial<RAGHealthStatus> = {}): RAGHealthStatus {
  return {
    chromadb: {
      connected: true,
      latency: faker.number.int({ min: 5, max: 50 }),
    },
    collections: {
      videos: faker.number.int({ min: 0, max: 1000 }),
      news: faker.number.int({ min: 0, max: 500 }),
      trends: faker.number.int({ min: 0, max: 50 }),
    },
    embeddings: {
      available: true,
      model: 'all-MiniLM-L6-v2',
      dimensions: 384,
    },
    ...overrides,
  };
}

/**
 * Create RAG health status (ChromaDB disconnected)
 */
export function createDisconnectedRAGHealth(): RAGHealthStatus {
  return {
    chromadb: {
      connected: false,
      error: 'Connection refused: ChromaDB server not running',
    },
    collections: {
      videos: 0,
      news: 0,
      trends: 0,
    },
    embeddings: {
      available: false,
      model: 'all-MiniLM-L6-v2',
      dimensions: 384,
    },
  };
}

/**
 * Create topic suggestion
 */
export function createTopicSuggestion(overrides: Partial<TopicSuggestion> = {}): TopicSuggestion {
  return {
    id: faker.string.uuid(),
    title: faker.lorem.sentence({ min: 3, max: 8 }),
    description: faker.lorem.paragraph(),
    relevanceScore: faker.number.float({ min: 0.7, max: 1.0, fractionDigits: 2 }),
    sourceChannels: [faker.string.alphanumeric(24)],
    relatedNews: [],
    ...overrides,
  };
}

/**
 * Create multiple topic suggestions (3-5)
 */
export function createTopicSuggestions(count: number = 5): TopicSuggestion[] {
  return Array.from({ length: Math.min(count, 5) }, () => createTopicSuggestion());
}

/**
 * Create channel preview (for validation display)
 */
export function createChannelPreview(overrides: Partial<ChannelPreview> = {}): ChannelPreview {
  return {
    channelId: 'UC' + faker.string.alphanumeric(22),
    name: faker.company.name() + ' Channel',
    description: faker.lorem.paragraph(),
    thumbnailUrl: faker.image.url({ width: 88, height: 88 }),
    videoCount: faker.number.int({ min: 10, max: 1000 }),
    subscriberCount: faker.number.int({ min: 1000, max: 10000000 }),
    customUrl: '@' + faker.internet.userName().replace(/[^a-zA-Z0-9._-]/g, ''),
    ...overrides,
  };
}

/**
 * Create suggested channels for Cold Start niche
 */
export function createNicheSuggestions(niche: string, count: number = 5): ChannelPreview[] {
  const nichePrefixes: Record<string, string[]> = {
    military: ['Defense', 'Military', 'Tactical', 'Combat', 'War'],
    gaming: ['Gaming', 'Gamer', 'Play', 'Stream', 'Pro'],
    tech: ['Tech', 'Digital', 'Code', 'Dev', 'Cyber'],
    cooking: ['Chef', 'Kitchen', 'Cook', 'Food', 'Recipe'],
    fitness: ['Fit', 'Gym', 'Workout', 'Health', 'Strong'],
    finance: ['Money', 'Finance', 'Invest', 'Trade', 'Wealth'],
    science: ['Science', 'Lab', 'Research', 'Discovery', 'Quantum'],
    travel: ['Travel', 'Adventure', 'Explore', 'Journey', 'World'],
  };

  const prefixes = nichePrefixes[niche] || ['Channel'];

  return Array.from({ length: count }, (_, i) =>
    createChannelPreview({
      name: `${prefixes[i % prefixes.length]} ${faker.company.name()}`,
    })
  );
}

/**
 * Create full setup wizard state for established channel mode
 */
export function createEstablishedSetupState() {
  return {
    mode: 'established' as const,
    step: 'channel-input' as const,
    userChannel: null as ChannelPreview | null,
    validationStatus: 'idle' as 'idle' | 'loading' | 'success' | 'error',
    validationError: null as string | null,
    competitorChannels: [] as ChannelPreview[],
  };
}

/**
 * Create full setup wizard state for cold start mode
 */
export function createColdStartSetupState(niche: string = 'military') {
  return {
    mode: 'cold_start' as const,
    step: 'niche-selection' as const,
    selectedNiche: niche,
    suggestedChannels: createNicheSuggestions(niche, 5),
    selectedChannels: [] as ChannelPreview[],
  };
}

/**
 * Valid YouTube channel URLs for testing
 */
export const VALID_CHANNEL_URLS = [
  'https://youtube.com/@TechChannel',
  'https://www.youtube.com/@TechChannel',
  'http://youtube.com/@TechChannel',
  'https://youtube.com/channel/UCaBcDeFgHiJkLmNoPqRsTuVw',
  'https://youtube.com/c/TechChannel',
  'https://youtube.com/user/TechChannel',
  '@TechChannel',
  'UCaBcDeFgHiJkLmNoPqRsTuVw',
];

/**
 * Invalid/malicious channel URLs for security testing
 */
export const INVALID_CHANNEL_URLS = [
  '',
  '   ',
  'not-a-url',
  'https://example.com/@TechChannel',
  'javascript:alert(1)',
  '<script>alert(1)</script>',
  '../../../etc/passwd',
  "https://youtube.com/@test' OR '1'='1",
  'https://youtube.com/@test|rm -rf /',
];

/**
 * Niche options matching UI dropdown
 */
export const NICHE_OPTIONS = [
  { id: 'military', name: 'Military & Defense', icon: '🎖️' },
  { id: 'gaming', name: 'Gaming', icon: '🎮' },
  { id: 'tech', name: 'Technology', icon: '💻' },
  { id: 'cooking', name: 'Cooking & Food', icon: '🍳' },
  { id: 'fitness', name: 'Fitness & Health', icon: '💪' },
  { id: 'finance', name: 'Finance & Business', icon: '💰' },
  { id: 'science', name: 'Science & Education', icon: '🔬' },
  { id: 'travel', name: 'Travel & Adventure', icon: '✈️' },
] as const;
