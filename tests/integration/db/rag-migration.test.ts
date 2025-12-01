/**
 * RAG Migration Integration Tests - Story 6.1
 *
 * Tests for the RAG infrastructure database migration.
 * Covers: AC-6.1.3 (background_jobs table), AC-6.1.4 (cron_schedules table)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { up, down, id, name } from '@/lib/db/migrations/013_rag_infrastructure';

describe('Migration 013: RAG Infrastructure', () => {
  let db: Database.Database;

  beforeEach(() => {
    // Create in-memory database for testing
    db = new Database(':memory:');

    // Create prerequisite projects table (foreign key dependency)
    db.exec(`
      CREATE TABLE projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
  });

  afterEach(() => {
    db.close();
  });

  describe('migration metadata', () => {
    it('[P2] 6.1-DB-001: should have correct migration id and name', () => {
      // GIVEN: Migration module

      // WHEN/THEN: Metadata is correct
      expect(id).toBe(13);
      expect(name).toBe('rag_infrastructure');
    });
  });

  describe('up()', () => {
    it('[P0] 6.1-DB-002: should create background_jobs table with all columns', () => {
      // GIVEN: Fresh database

      // WHEN: Migration up runs
      up(db);

      // THEN: background_jobs table exists with correct columns
      const tableInfo = db.prepare("PRAGMA table_info(background_jobs)").all() as Array<{ name: string; type: string }>;
      const columns = tableInfo.map((col) => col.name);

      expect(columns).toContain('id');
      expect(columns).toContain('type');
      expect(columns).toContain('status');
      expect(columns).toContain('priority');
      expect(columns).toContain('payload');
      expect(columns).toContain('result');
      expect(columns).toContain('progress');
      expect(columns).toContain('attempt');
      expect(columns).toContain('max_attempts');
      expect(columns).toContain('project_id');
      expect(columns).toContain('scheduled_for');
      expect(columns).toContain('started_at');
      expect(columns).toContain('completed_at');
      expect(columns).toContain('created_at');
      expect(columns).toContain('updated_at');
    });

    it('[P0] 6.1-DB-003: should create cron_schedules table', () => {
      // GIVEN: Fresh database

      // WHEN: Migration up runs
      up(db);

      // THEN: cron_schedules table exists with correct columns
      const tableInfo = db.prepare("PRAGMA table_info(cron_schedules)").all() as Array<{ name: string }>;
      const columns = tableInfo.map((col) => col.name);

      expect(columns).toContain('id');
      expect(columns).toContain('name');
      expect(columns).toContain('job_type');
      expect(columns).toContain('cron_expression');
      expect(columns).toContain('payload');
      expect(columns).toContain('enabled');
      expect(columns).toContain('last_run');
      expect(columns).toContain('next_run');
      expect(columns).toContain('created_at');
    });

    it('[P0] 6.1-DB-004: should create channels table', () => {
      // GIVEN: Fresh database

      // WHEN: Migration up runs
      up(db);

      // THEN: channels table exists with correct columns
      const tableInfo = db.prepare("PRAGMA table_info(channels)").all() as Array<{ name: string }>;
      const columns = tableInfo.map((col) => col.name);

      expect(columns).toContain('id');
      expect(columns).toContain('channel_id');
      expect(columns).toContain('name');
      expect(columns).toContain('description');
      expect(columns).toContain('subscriber_count');
      expect(columns).toContain('video_count');
      expect(columns).toContain('is_user_channel');
      expect(columns).toContain('is_competitor');
      expect(columns).toContain('niche');
      expect(columns).toContain('last_sync');
      expect(columns).toContain('sync_status');
    });

    it('[P0] 6.1-DB-005: should create channel_videos table with FK', () => {
      // GIVEN: Fresh database

      // WHEN: Migration up runs
      up(db);

      // THEN: channel_videos table exists with FK to channels
      const tableInfo = db.prepare("PRAGMA table_info(channel_videos)").all() as Array<{ name: string }>;
      const columns = tableInfo.map((col) => col.name);

      expect(columns).toContain('id');
      expect(columns).toContain('channel_id');
      expect(columns).toContain('video_id');
      expect(columns).toContain('title');
      expect(columns).toContain('transcript');
      expect(columns).toContain('embedding_id');
      expect(columns).toContain('embedding_status');

      // Verify FK exists
      const fkInfo = db.prepare("PRAGMA foreign_key_list(channel_videos)").all() as Array<{ table: string }>;
      expect(fkInfo.some((fk) => fk.table === 'channels')).toBe(true);
    });

    it('[P0] 6.1-DB-006: should create news_sources table', () => {
      // GIVEN: Fresh database

      // WHEN: Migration up runs
      up(db);

      // THEN: news_sources table exists
      const tableInfo = db.prepare("PRAGMA table_info(news_sources)").all() as Array<{ name: string }>;
      const columns = tableInfo.map((col) => col.name);

      expect(columns).toContain('id');
      expect(columns).toContain('name');
      expect(columns).toContain('url');
      expect(columns).toContain('niche');
      expect(columns).toContain('fetch_method');
      expect(columns).toContain('enabled');
    });

    it('[P0] 6.1-DB-007: should create news_articles table with FK', () => {
      // GIVEN: Fresh database

      // WHEN: Migration up runs
      up(db);

      // THEN: news_articles table exists with FK to news_sources
      const tableInfo = db.prepare("PRAGMA table_info(news_articles)").all() as Array<{ name: string }>;
      const columns = tableInfo.map((col) => col.name);

      expect(columns).toContain('id');
      expect(columns).toContain('source_id');
      expect(columns).toContain('headline');
      expect(columns).toContain('summary');
      expect(columns).toContain('url');
      expect(columns).toContain('niche');

      // Verify FK exists
      const fkInfo = db.prepare("PRAGMA foreign_key_list(news_articles)").all() as Array<{ table: string }>;
      expect(fkInfo.some((fk) => fk.table === 'news_sources')).toBe(true);
    });

    it('[P1] 6.1-DB-008: should add RAG columns to projects table', () => {
      // GIVEN: Fresh database

      // WHEN: Migration up runs
      up(db);

      // THEN: projects table has RAG columns
      const tableInfo = db.prepare("PRAGMA table_info(projects)").all() as Array<{ name: string }>;
      const columns = tableInfo.map((col) => col.name);

      expect(columns).toContain('rag_enabled');
      expect(columns).toContain('rag_config');
      expect(columns).toContain('rag_last_sync');
      expect(columns).toContain('niche');
    });

    it('[P1] 6.1-DB-009: should seed 7 military news sources', () => {
      // GIVEN: Fresh database

      // WHEN: Migration up runs
      up(db);

      // THEN: 7 news sources are seeded
      const sources = db.prepare("SELECT * FROM news_sources WHERE niche = 'military'").all();
      expect(sources).toHaveLength(7);
    });

    it('[P1] 6.1-DB-010: should create required indexes', () => {
      // GIVEN: Fresh database

      // WHEN: Migration up runs
      up(db);

      // THEN: Indexes exist
      const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type = 'index'").all() as Array<{ name: string }>;
      const indexNames = indexes.map((idx) => idx.name);

      expect(indexNames).toContain('idx_jobs_status');
      expect(indexNames).toContain('idx_jobs_type');
      expect(indexNames).toContain('idx_jobs_scheduled');
      expect(indexNames).toContain('idx_channels_channel_id');
      expect(indexNames).toContain('idx_channel_videos_channel');
      expect(indexNames).toContain('idx_news_sources_niche');
      expect(indexNames).toContain('idx_news_articles_source');
    });

    it('[P2] 6.1-DB-011: should enforce CHECK constraints on status', () => {
      // GIVEN: Migrated database
      up(db);

      // WHEN: Attempting to insert invalid status
      const stmt = db.prepare(`
        INSERT INTO background_jobs (id, type, status)
        VALUES (?, ?, ?)
      `);

      // THEN: Invalid status is rejected
      expect(() => {
        stmt.run('job-1', 'test', 'invalid_status');
      }).toThrow();

      // Valid status works
      expect(() => {
        stmt.run('job-2', 'test', 'pending');
      }).not.toThrow();
    });

    it('[P2] 6.1-DB-012: should enforce UNIQUE constraint on channel_id', () => {
      // GIVEN: Migrated database with a channel
      up(db);

      db.prepare(`
        INSERT INTO channels (id, channel_id, name)
        VALUES (?, ?, ?)
      `).run('id-1', 'UCtest123', 'Test Channel');

      // WHEN: Attempting to insert duplicate channel_id
      // THEN: UNIQUE constraint violation
      expect(() => {
        db.prepare(`
          INSERT INTO channels (id, channel_id, name)
          VALUES (?, ?, ?)
        `).run('id-2', 'UCtest123', 'Another Channel');
      }).toThrow(/UNIQUE constraint failed/);
    });
  });

  describe('down()', () => {
    it('[P1] 6.1-DB-013: should drop all created tables', () => {
      // GIVEN: Migrated database
      up(db);

      // WHEN: Migration down runs
      down(db);

      // THEN: Tables are dropped
      const tables = db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type = 'table'
        AND name IN ('background_jobs', 'cron_schedules', 'channels', 'channel_videos', 'news_sources', 'news_articles')
      `).all();

      expect(tables).toHaveLength(0);
    });

    it('[P2] 6.1-DB-014: should preserve projects table (only drops new columns conceptually)', () => {
      // GIVEN: Migrated database
      up(db);

      // WHEN: Migration down runs
      down(db);

      // THEN: Projects table still exists (SQLite can't easily drop columns)
      const tables = db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type = 'table' AND name = 'projects'
      `).all();

      expect(tables).toHaveLength(1);
    });
  });

  describe('data integrity', () => {
    it('[P1] 6.1-DB-015: should CASCADE delete channel_videos when channel deleted', () => {
      // GIVEN: Channel with videos
      up(db);
      db.exec("PRAGMA foreign_keys = ON");

      db.prepare(`
        INSERT INTO channels (id, channel_id, name)
        VALUES (?, ?, ?)
      `).run('ch-1', 'UCtest', 'Test Channel');

      db.prepare(`
        INSERT INTO channel_videos (id, channel_id, video_id, title)
        VALUES (?, ?, ?, ?)
      `).run('vid-1', 'UCtest', 'abc123', 'Test Video');

      // WHEN: Channel is deleted
      db.prepare(`DELETE FROM channels WHERE id = ?`).run('ch-1');

      // THEN: Videos are also deleted
      const videos = db.prepare(`SELECT * FROM channel_videos WHERE channel_id = ?`).all('UCtest');
      expect(videos).toHaveLength(0);
    });

    it('[P1] 6.1-DB-016: should CASCADE delete news_articles when news_source deleted', () => {
      // GIVEN: News source with articles
      up(db);
      db.exec("PRAGMA foreign_keys = ON");

      db.prepare(`
        INSERT INTO news_sources (id, name, url, niche)
        VALUES (?, ?, ?, ?)
      `).run('src-1', 'Test Source', 'https://example.com/rss', 'military');

      db.prepare(`
        INSERT INTO news_articles (id, source_id, headline, url)
        VALUES (?, ?, ?, ?)
      `).run('art-1', 'src-1', 'Test Article', 'https://example.com/article');

      // WHEN: News source is deleted
      db.prepare(`DELETE FROM news_sources WHERE id = ?`).run('src-1');

      // THEN: Articles are also deleted
      const articles = db.prepare(`SELECT * FROM news_articles WHERE source_id = ?`).all('src-1');
      expect(articles).toHaveLength(0);
    });

    it('[P2] 6.1-DB-017: should enforce priority range constraint', () => {
      // GIVEN: Migrated database
      up(db);

      // WHEN: Attempting to insert priority outside range
      const stmt = db.prepare(`
        INSERT INTO background_jobs (id, type, priority)
        VALUES (?, ?, ?)
      `);

      // THEN: Out of range priorities are rejected
      expect(() => {
        stmt.run('job-1', 'test', 0); // Below minimum
      }).toThrow();

      expect(() => {
        stmt.run('job-2', 'test', 11); // Above maximum
      }).toThrow();

      // Valid priority works
      expect(() => {
        stmt.run('job-3', 'test', 5);
      }).not.toThrow();
    });
  });
});
