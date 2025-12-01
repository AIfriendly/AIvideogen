/**
 * Channel Database Queries
 *
 * CRUD operations for channels and channel_videos tables.
 * Story 6.3 - YouTube Channel Sync & Caption Scraping
 */

import { randomUUID } from 'crypto';
import db from './client';
import type { Channel, ChannelVideo } from '../rag/types';

/**
 * Database row types
 */
interface ChannelRow {
  id: string;
  channel_id: string;
  name: string;
  description: string | null;
  subscriber_count: number | null;
  video_count: number | null;
  is_user_channel: number;
  is_competitor: number;
  niche: string | null;
  last_sync: string | null;
  sync_status: string;
  created_at: string;
  updated_at: string;
}

interface ChannelVideoRow {
  id: string;
  channel_id: string;
  video_id: string;
  title: string;
  description: string | null;
  published_at: string | null;
  duration_seconds: number | null;
  view_count: number | null;
  transcript: string | null;
  embedding_id: string | null;
  embedding_status: string;
  created_at: string;
}

/**
 * Convert database row to Channel object
 */
function rowToChannel(row: ChannelRow): Channel {
  return {
    id: row.id,
    channelId: row.channel_id,
    name: row.name,
    description: row.description,
    subscriberCount: row.subscriber_count,
    videoCount: row.video_count,
    isUserChannel: row.is_user_channel === 1,
    isCompetitor: row.is_competitor === 1,
    niche: row.niche,
    lastSync: row.last_sync,
    syncStatus: row.sync_status as Channel['syncStatus'],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Convert database row to ChannelVideo object
 */
function rowToChannelVideo(row: ChannelVideoRow): ChannelVideo {
  return {
    id: row.id,
    channelId: row.channel_id,
    videoId: row.video_id,
    title: row.title,
    description: row.description,
    publishedAt: row.published_at,
    durationSeconds: row.duration_seconds,
    viewCount: row.view_count,
    transcript: row.transcript,
    embeddingId: row.embedding_id,
    embeddingStatus: row.embedding_status as ChannelVideo['embeddingStatus'],
    createdAt: row.created_at
  };
}

// ============================================================
// CHANNEL OPERATIONS
// ============================================================

/**
 * Create a new channel record
 */
export function createChannel(input: {
  channelId: string;
  name: string;
  description?: string | null;
  subscriberCount?: number | null;
  videoCount?: number | null;
  isUserChannel?: boolean;
  isCompetitor?: boolean;
  niche?: string | null;
}): Channel {
  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO channels (
      id, channel_id, name, description, subscriber_count, video_count,
      is_user_channel, is_competitor, niche, sync_status, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
  `).run(
    id,
    input.channelId,
    input.name,
    input.description || null,
    input.subscriberCount || null,
    input.videoCount || null,
    input.isUserChannel ? 1 : 0,
    input.isCompetitor ? 1 : 0,
    input.niche || null,
    now,
    now
  );

  return getChannelById(id)!;
}

/**
 * Get channel by internal ID
 */
export function getChannelById(id: string): Channel | null {
  const row = db.prepare('SELECT * FROM channels WHERE id = ?').get(id) as ChannelRow | undefined;
  return row ? rowToChannel(row) : null;
}

/**
 * Get channel by YouTube channel ID
 */
export function getChannelByYouTubeId(channelId: string): Channel | null {
  const row = db.prepare('SELECT * FROM channels WHERE channel_id = ?').get(channelId) as ChannelRow | undefined;
  return row ? rowToChannel(row) : null;
}

/**
 * Get all channels by niche
 */
export function getChannelsByNiche(niche: string): Channel[] {
  const rows = db.prepare('SELECT * FROM channels WHERE niche = ? ORDER BY created_at DESC').all(niche) as ChannelRow[];
  return rows.map(rowToChannel);
}

/**
 * Get all channels
 */
export function getAllChannels(): Channel[] {
  const rows = db.prepare('SELECT * FROM channels ORDER BY created_at DESC').all() as ChannelRow[];
  return rows.map(rowToChannel);
}

/**
 * Get user channel
 */
export function getUserChannel(): Channel | null {
  const row = db.prepare('SELECT * FROM channels WHERE is_user_channel = 1 LIMIT 1').get() as ChannelRow | undefined;
  return row ? rowToChannel(row) : null;
}

/**
 * Get competitor channels
 */
export function getCompetitorChannels(): Channel[] {
  const rows = db.prepare('SELECT * FROM channels WHERE is_competitor = 1 ORDER BY created_at DESC').all() as ChannelRow[];
  return rows.map(rowToChannel);
}

/**
 * Update channel
 */
export function updateChannel(id: string, input: Partial<{
  name: string;
  description: string | null;
  subscriberCount: number | null;
  videoCount: number | null;
  isUserChannel: boolean;
  isCompetitor: boolean;
  niche: string | null;
  lastSync: string | null;
  syncStatus: Channel['syncStatus'];
}>): Channel | null {
  const updates: string[] = [];
  const params: (string | number | null)[] = [];

  if (input.name !== undefined) {
    updates.push('name = ?');
    params.push(input.name);
  }
  if (input.description !== undefined) {
    updates.push('description = ?');
    params.push(input.description);
  }
  if (input.subscriberCount !== undefined) {
    updates.push('subscriber_count = ?');
    params.push(input.subscriberCount);
  }
  if (input.videoCount !== undefined) {
    updates.push('video_count = ?');
    params.push(input.videoCount);
  }
  if (input.isUserChannel !== undefined) {
    updates.push('is_user_channel = ?');
    params.push(input.isUserChannel ? 1 : 0);
  }
  if (input.isCompetitor !== undefined) {
    updates.push('is_competitor = ?');
    params.push(input.isCompetitor ? 1 : 0);
  }
  if (input.niche !== undefined) {
    updates.push('niche = ?');
    params.push(input.niche);
  }
  if (input.lastSync !== undefined) {
    updates.push('last_sync = ?');
    params.push(input.lastSync);
  }
  if (input.syncStatus !== undefined) {
    updates.push('sync_status = ?');
    params.push(input.syncStatus);
  }

  if (updates.length === 0) {
    return getChannelById(id);
  }

  updates.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(id);

  db.prepare(`UPDATE channels SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  return getChannelById(id);
}

/**
 * Delete channel and its videos
 */
export function deleteChannel(id: string): boolean {
  const result = db.prepare('DELETE FROM channels WHERE id = ?').run(id);
  return result.changes > 0;
}

// ============================================================
// CHANNEL VIDEO OPERATIONS
// ============================================================

/**
 * Create or update a channel video record
 */
export function upsertChannelVideo(input: {
  channelId: string;
  videoId: string;
  title: string;
  description?: string | null;
  publishedAt?: string | null;
  durationSeconds?: number | null;
  viewCount?: number | null;
}): ChannelVideo {
  const existing = getChannelVideoByYouTubeId(input.videoId);

  if (existing) {
    // Update existing video
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE channel_videos
      SET title = ?, description = ?, published_at = ?, duration_seconds = ?, view_count = ?
      WHERE id = ?
    `).run(
      input.title,
      input.description || null,
      input.publishedAt || null,
      input.durationSeconds || null,
      input.viewCount || null,
      existing.id
    );
    return getChannelVideoById(existing.id)!;
  }

  // Create new video
  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO channel_videos (
      id, channel_id, video_id, title, description, published_at,
      duration_seconds, view_count, embedding_status, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  `).run(
    id,
    input.channelId,
    input.videoId,
    input.title,
    input.description || null,
    input.publishedAt || null,
    input.durationSeconds || null,
    input.viewCount || null,
    now
  );

  return getChannelVideoById(id)!;
}

/**
 * Get channel video by internal ID
 */
export function getChannelVideoById(id: string): ChannelVideo | null {
  const row = db.prepare('SELECT * FROM channel_videos WHERE id = ?').get(id) as ChannelVideoRow | undefined;
  return row ? rowToChannelVideo(row) : null;
}

/**
 * Get channel video by YouTube video ID
 */
export function getChannelVideoByYouTubeId(videoId: string): ChannelVideo | null {
  const row = db.prepare('SELECT * FROM channel_videos WHERE video_id = ?').get(videoId) as ChannelVideoRow | undefined;
  return row ? rowToChannelVideo(row) : null;
}

/**
 * Get all videos for a channel
 */
export function getChannelVideos(channelId: string, options: {
  limit?: number;
  offset?: number;
  orderBy?: 'published_at' | 'created_at';
  order?: 'ASC' | 'DESC';
} = {}): ChannelVideo[] {
  const orderBy = options.orderBy || 'published_at';
  const order = options.order || 'DESC';
  const limit = options.limit || 50;
  const offset = options.offset || 0;

  const rows = db.prepare(`
    SELECT * FROM channel_videos
    WHERE channel_id = ?
    ORDER BY ${orderBy} ${order}
    LIMIT ? OFFSET ?
  `).all(channelId, limit, offset) as ChannelVideoRow[];

  return rows.map(rowToChannelVideo);
}

/**
 * Get videos that need transcript scraping (pending embedding)
 */
export function getUnprocessedVideos(channelId: string, limit: number = 50): ChannelVideo[] {
  const rows = db.prepare(`
    SELECT * FROM channel_videos
    WHERE channel_id = ? AND transcript IS NULL AND embedding_status = 'pending'
    ORDER BY published_at DESC
    LIMIT ?
  `).all(channelId, limit) as ChannelVideoRow[];

  return rows.map(rowToChannelVideo);
}

/**
 * Get videos that have transcripts but no embeddings
 */
export function getVideosNeedingEmbedding(channelId: string, limit: number = 50): ChannelVideo[] {
  const rows = db.prepare(`
    SELECT * FROM channel_videos
    WHERE channel_id = ? AND transcript IS NOT NULL AND embedding_status = 'pending'
    ORDER BY published_at DESC
    LIMIT ?
  `).all(channelId, limit) as ChannelVideoRow[];

  return rows.map(rowToChannelVideo);
}

/**
 * Update channel video with transcript
 */
export function updateVideoTranscript(
  videoId: string,
  transcript: string,
  embeddingStatus: ChannelVideo['embeddingStatus'] = 'pending'
): ChannelVideo | null {
  db.prepare(`
    UPDATE channel_videos
    SET transcript = ?, embedding_status = ?
    WHERE video_id = ?
  `).run(transcript, embeddingStatus, videoId);

  return getChannelVideoByYouTubeId(videoId);
}

/**
 * Update video embedding status
 */
export function updateVideoEmbeddingStatus(
  videoId: string,
  embeddingId: string | null,
  embeddingStatus: ChannelVideo['embeddingStatus']
): ChannelVideo | null {
  db.prepare(`
    UPDATE channel_videos
    SET embedding_id = ?, embedding_status = ?
    WHERE video_id = ?
  `).run(embeddingId, embeddingStatus, videoId);

  return getChannelVideoByYouTubeId(videoId);
}

/**
 * Get video count for a channel
 */
export function getChannelVideoCount(channelId: string): number {
  const result = db.prepare('SELECT COUNT(*) as count FROM channel_videos WHERE channel_id = ?').get(channelId) as { count: number };
  return result.count;
}

/**
 * Get count of videos with embeddings
 */
export function getEmbeddedVideoCount(channelId: string): number {
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM channel_videos
    WHERE channel_id = ? AND embedding_status = 'embedded'
  `).get(channelId) as { count: number };
  return result.count;
}

/**
 * Get latest video publication date for incremental sync
 */
export function getLatestVideoDate(channelId: string): string | null {
  const result = db.prepare(`
    SELECT MAX(published_at) as latest FROM channel_videos WHERE channel_id = ?
  `).get(channelId) as { latest: string | null };
  return result.latest;
}

/**
 * Delete all videos for a channel
 */
export function deleteChannelVideos(channelId: string): number {
  const result = db.prepare('DELETE FROM channel_videos WHERE channel_id = ?').run(channelId);
  return result.changes;
}
