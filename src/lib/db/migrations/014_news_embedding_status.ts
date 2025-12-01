/**
 * Migration 014: Add embedding_status column to news_articles table
 *
 * Story 6.4 - News Feed Aggregation & Embedding
 *
 * This migration adds the embedding_status column that was missing from
 * the original migration 013. This column tracks the embedding generation
 * state for each news article.
 */

import type Database from 'better-sqlite3';

export const id = 14;
export const name = 'news_embedding_status';

export function up(db: Database.Database): void {
  // Check if column already exists
  const tableInfo = db.prepare("PRAGMA table_info(news_articles)").all() as Array<{ name: string }>;
  const existingColumns = tableInfo.map(col => col.name);

  if (!existingColumns.includes('embedding_status')) {
    db.exec(`ALTER TABLE news_articles ADD COLUMN embedding_status TEXT DEFAULT 'pending' CHECK(embedding_status IN ('pending', 'processing', 'embedded', 'error'))`);
    console.log('Added embedding_status column to news_articles');
  } else {
    console.log('embedding_status column already exists in news_articles');
  }

  // Add index for efficient queries on embedding_status
  db.exec(`CREATE INDEX IF NOT EXISTS idx_news_articles_embedding_status ON news_articles(embedding_status)`);
  console.log('Created index on news_articles.embedding_status');

  console.log('Migration 014 (News Embedding Status) completed successfully');
}

export function down(db: Database.Database): void {
  // SQLite doesn't support DROP COLUMN directly, would need table rebuild
  // For simplicity, just drop the index
  db.exec(`DROP INDEX IF EXISTS idx_news_articles_embedding_status`);
  console.log('Migration 014 (News Embedding Status) rolled back');
}
