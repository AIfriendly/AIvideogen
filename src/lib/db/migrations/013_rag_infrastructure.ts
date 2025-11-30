/**
 * Migration 013: RAG Infrastructure - Story 6.1
 *
 * Creates tables for Channel Intelligence & Content Research system:
 * - background_jobs: Job queue for async operations
 * - cron_schedules: Scheduled recurring jobs
 * - channels: YouTube channels being tracked
 * - channel_videos: Videos with transcripts and embeddings
 * - news_sources: Configurable news feeds
 * - news_articles: Fetched news articles with embeddings
 * - Projects table extensions for RAG configuration
 */

import type Database from 'better-sqlite3';

export const id = 13;
export const name = 'rag_infrastructure';

export function up(db: Database.Database): void {
  // Background jobs table for async operations
  db.exec(`
    CREATE TABLE IF NOT EXISTS background_jobs (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
      priority INTEGER DEFAULT 5 CHECK(priority >= 1 AND priority <= 10),
      payload TEXT,
      result TEXT,
      progress INTEGER DEFAULT 0 CHECK(progress >= 0 AND progress <= 100),
      attempt INTEGER DEFAULT 0,
      max_attempts INTEGER DEFAULT 3,
      project_id TEXT,
      scheduled_for TEXT,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  db.exec(`CREATE INDEX IF NOT EXISTS idx_jobs_status ON background_jobs(status)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_jobs_type ON background_jobs(type)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_jobs_scheduled ON background_jobs(scheduled_for)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_jobs_project ON background_jobs(project_id)`);

  console.log('Created background_jobs table');

  // Cron schedules table for recurring jobs
  db.exec(`
    CREATE TABLE IF NOT EXISTS cron_schedules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      job_type TEXT NOT NULL,
      cron_expression TEXT NOT NULL,
      payload TEXT,
      enabled INTEGER DEFAULT 1,
      last_run TEXT,
      next_run TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  console.log('Created cron_schedules table');

  // Channels table for tracking YouTube channels
  db.exec(`
    CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      subscriber_count INTEGER,
      video_count INTEGER,
      is_user_channel INTEGER DEFAULT 0,
      is_competitor INTEGER DEFAULT 0,
      niche TEXT,
      last_sync TEXT,
      sync_status TEXT DEFAULT 'pending' CHECK(sync_status IN ('pending', 'syncing', 'synced', 'error')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`CREATE INDEX IF NOT EXISTS idx_channels_channel_id ON channels(channel_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_channels_niche ON channels(niche)`);

  console.log('Created channels table');

  // Channel videos table for video metadata and transcripts
  db.exec(`
    CREATE TABLE IF NOT EXISTS channel_videos (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      video_id TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT,
      published_at TEXT,
      duration_seconds INTEGER,
      view_count INTEGER,
      transcript TEXT,
      embedding_id TEXT,
      embedding_status TEXT DEFAULT 'pending' CHECK(embedding_status IN ('pending', 'processing', 'embedded', 'error')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (channel_id) REFERENCES channels(channel_id) ON DELETE CASCADE
    )
  `);

  db.exec(`CREATE INDEX IF NOT EXISTS idx_channel_videos_channel ON channel_videos(channel_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_channel_videos_published ON channel_videos(published_at)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_channel_videos_embedding ON channel_videos(embedding_status)`);

  console.log('Created channel_videos table');

  // News sources table for configurable news feeds
  db.exec(`
    CREATE TABLE IF NOT EXISTS news_sources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      niche TEXT NOT NULL,
      fetch_method TEXT DEFAULT 'rss' CHECK(fetch_method IN ('rss', 'scrape')),
      enabled INTEGER DEFAULT 1,
      last_fetch TEXT,
      article_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`CREATE INDEX IF NOT EXISTS idx_news_sources_niche ON news_sources(niche)`);

  console.log('Created news_sources table');

  // News articles table for fetched articles
  db.exec(`
    CREATE TABLE IF NOT EXISTS news_articles (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      headline TEXT NOT NULL,
      summary TEXT,
      url TEXT NOT NULL UNIQUE,
      published_at TEXT,
      niche TEXT,
      embedding_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (source_id) REFERENCES news_sources(id) ON DELETE CASCADE
    )
  `);

  db.exec(`CREATE INDEX IF NOT EXISTS idx_news_articles_source ON news_articles(source_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_news_articles_published ON news_articles(published_at)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_news_articles_niche ON news_articles(niche)`);

  console.log('Created news_articles table');

  // Projects table extensions for RAG configuration
  // Check if columns exist before adding them
  const tableInfo = db.prepare("PRAGMA table_info(projects)").all() as Array<{ name: string }>;
  const existingColumns = tableInfo.map(col => col.name);

  if (!existingColumns.includes('rag_enabled')) {
    db.exec(`ALTER TABLE projects ADD COLUMN rag_enabled INTEGER DEFAULT 0`);
    console.log('Added rag_enabled column to projects');
  }

  if (!existingColumns.includes('rag_config')) {
    db.exec(`ALTER TABLE projects ADD COLUMN rag_config TEXT`);
    console.log('Added rag_config column to projects');
  }

  if (!existingColumns.includes('rag_last_sync')) {
    db.exec(`ALTER TABLE projects ADD COLUMN rag_last_sync TEXT`);
    console.log('Added rag_last_sync column to projects');
  }

  if (!existingColumns.includes('niche')) {
    db.exec(`ALTER TABLE projects ADD COLUMN niche TEXT`);
    console.log('Added niche column to projects');
  }

  // Seed default military news sources
  const insertSource = db.prepare(`
    INSERT OR IGNORE INTO news_sources (id, name, url, niche, fetch_method)
    VALUES (?, ?, ?, ?, 'rss')
  `);

  const militarySources = [
    { id: 'warzone', name: 'The War Zone', url: 'https://www.thedrive.com/the-war-zone/feed' },
    { id: 'military-com', name: 'Military.com', url: 'https://www.military.com/rss-feeds' },
    { id: 'defense-news', name: 'Defense News', url: 'https://www.defensenews.com/arc/outboundfeeds/rss/' },
    { id: 'breaking-defense', name: 'Breaking Defense', url: 'https://breakingdefense.com/feed/' },
    { id: 'defense-one', name: 'Defense One', url: 'https://www.defenseone.com/rss/all/' },
    { id: 'military-times', name: 'Military Times', url: 'https://www.militarytimes.com/arc/outboundfeeds/rss/' },
    { id: 'janes', name: 'Janes Defence News', url: 'https://www.janes.com/feeds/news' }
  ];

  for (const source of militarySources) {
    insertSource.run(source.id, source.name, source.url, 'military');
  }

  console.log(`Seeded ${militarySources.length} military news sources`);

  console.log('Migration 013 (RAG Infrastructure) completed successfully');
}

export function down(db: Database.Database): void {
  // Drop tables in reverse order of creation
  db.exec(`DROP TABLE IF EXISTS news_articles`);
  db.exec(`DROP TABLE IF EXISTS news_sources`);
  db.exec(`DROP TABLE IF EXISTS channel_videos`);
  db.exec(`DROP TABLE IF EXISTS channels`);
  db.exec(`DROP TABLE IF EXISTS cron_schedules`);
  db.exec(`DROP TABLE IF EXISTS background_jobs`);

  // Note: Cannot easily remove columns from SQLite, would need table rebuild
  console.log('Migration 013 (RAG Infrastructure) rolled back');
}
