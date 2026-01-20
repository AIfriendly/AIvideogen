/**
 * Migration 018: Add missing embedding_status values for channel_videos
 *
 * The code uses 'no_captions', 'unavailable', 'restricted' statuses
 * but the database schema only allows: 'pending', 'processing', 'embedded', 'error'
 *
 * This migration recreates the channel_videos table with expanded status values.
 *
 * Story 6.3 - Bug Fix: Videos not being indexed due to status constraint mismatch
 */

import type Database from 'better-sqlite3';

export const id = 18;
export const name = 'add_video_embedding_status_values';

export function up(db: Database.Database): void {
  // Get existing data
  const existingVideos = db.prepare('SELECT * FROM channel_videos').all() as Array<{
    id: string;
    channel_id: string;
    video_id: string;
    title: string | null;
    description: string | null;
    published_at: string | null;
    duration_seconds: number | null;
    view_count: number | null;
    transcript: string | null;
    embedding_id: string | null;
    embedding_status: string | null;
    created_at: string | null;
  }>;

  // Create new table with expanded status values
  db.exec(`
    CREATE TABLE channel_videos_new (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
      video_id TEXT NOT NULL UNIQUE,
      title TEXT,
      description TEXT,
      published_at TEXT,
      duration_seconds INTEGER,
      view_count INTEGER,
      transcript TEXT,
      embedding_id TEXT,
      embedding_status TEXT DEFAULT 'pending' CHECK(embedding_status IN (
        'pending',
        'processing',
        'embedded',
        'error',
        'no_captions',
        'unavailable',
        'restricted'
      )),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Copy existing data
  const insert = db.prepare(`
    INSERT INTO channel_videos_new (
      id, channel_id, video_id, title, description, published_at,
      duration_seconds, view_count, transcript, embedding_id,
      embedding_status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const video of existingVideos) {
    insert.run(
      video.id,
      video.channel_id,
      video.video_id,
      video.title,
      video.description,
      video.published_at,
      video.duration_seconds,
      video.view_count,
      video.transcript,
      video.embedding_id,
      video.embedding_status || 'pending',
      video.created_at
    );
  }

  // Drop old table and rename new one
  db.exec('DROP TABLE channel_videos');
  db.exec('ALTER TABLE channel_videos_new RENAME TO channel_videos');

  // Recreate indexes
  db.exec('CREATE INDEX IF NOT EXISTS idx_channel_videos_channel_id ON channel_videos(channel_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_channel_videos_embedding_status ON channel_videos(embedding_status)');
}

export function down(db: Database.Database): void {
  // Revert to original schema (only 'pending', 'processing', 'embedded', 'error')
  const existingVideos = db.prepare('SELECT * FROM channel_videos').all() as Array<{
    id: string;
    channel_id: string;
    video_id: string;
    title: string | null;
    description: string | null;
    published_at: string | null;
    duration_seconds: number | null;
    view_count: number | null;
    transcript: string | null;
    embedding_id: string | null;
    embedding_status: string | null;
    created_at: string | null;
  }>;

  db.exec(`
    CREATE TABLE channel_videos_old (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
      video_id TEXT NOT NULL UNIQUE,
      title TEXT,
      description TEXT,
      published_at TEXT,
      duration_seconds INTEGER,
      view_count INTEGER,
      transcript TEXT,
      embedding_id TEXT,
      embedding_status TEXT DEFAULT 'pending' CHECK(embedding_status IN ('pending', 'processing', 'embedded', 'error')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const insert = db.prepare(`
    INSERT INTO channel_videos_old (
      id, channel_id, video_id, title, description, published_at,
      duration_seconds, view_count, transcript, embedding_id,
      embedding_status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const video of existingVideos) {
    // Convert 'no_captions', 'unavailable', 'restricted' to 'error'
    let status = video.embedding_status || 'pending';
    if (['no_captions', 'unavailable', 'restricted'].includes(status)) {
      status = 'error';
    }

    insert.run(
      video.id,
      video.channel_id,
      video.video_id,
      video.title,
      video.description,
      video.published_at,
      video.duration_seconds,
      video.view_count,
      video.transcript,
      video.embedding_id,
      status,
      video.created_at
    );
  }

  db.exec('DROP TABLE channel_videos');
  db.exec('ALTER TABLE channel_videos_old RENAME TO channel_videos');

  db.exec('CREATE INDEX IF NOT EXISTS idx_channel_videos_channel_id ON channel_videos(channel_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_channel_videos_embedding_status ON channel_videos(embedding_status)');
}
