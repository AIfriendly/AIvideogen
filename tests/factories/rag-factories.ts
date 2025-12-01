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
