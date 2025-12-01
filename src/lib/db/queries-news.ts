/**
 * Database Query Functions for News
 *
 * Story 6.4 - News Feed Aggregation & Embedding
 *
 * CRUD operations for news_sources and news_articles tables.
 * Follows the pattern established in queries-channels.ts
 */

import { randomUUID } from 'crypto';
import db from './client';

/**
 * News article database record
 */
export interface NewsArticleRecord {
  id: string;
  sourceId: string;
  headline: string;
  summary: string | null;
  url: string;
  publishedAt: string | null;
  niche: string | null;
  embeddingId: string | null;
  embeddingStatus: 'pending' | 'processing' | 'embedded' | 'error';
  createdAt: string;
}

/**
 * News source database record
 */
export interface NewsSourceRecord {
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

// ============================================
// NEWS ARTICLE OPERATIONS
// ============================================

/**
 * Create a new news article
 */
export function createNewsArticle(article: {
  sourceId: string;
  headline: string;
  summary?: string;
  url: string;
  publishedAt?: string;
  niche?: string;
}): NewsArticleRecord {
  const id = randomUUID();

  db.prepare(`
    INSERT INTO news_articles (
      id, source_id, headline, summary, url, published_at, niche, embedding_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
  `).run(
    id,
    article.sourceId,
    article.headline,
    article.summary || null,
    article.url,
    article.publishedAt || null,
    article.niche || null
  );

  return getNewsArticleById(id)!;
}

/**
 * Get a news article by ID
 */
export function getNewsArticleById(id: string): NewsArticleRecord | null {
  const row = db.prepare(`
    SELECT
      id,
      source_id as sourceId,
      headline,
      summary,
      url,
      published_at as publishedAt,
      niche,
      embedding_id as embeddingId,
      embedding_status as embeddingStatus,
      created_at as createdAt
    FROM news_articles
    WHERE id = ?
  `).get(id) as NewsArticleRecord | undefined;

  return row || null;
}

/**
 * Get a news article by URL (for deduplication)
 */
export function getNewsArticleByUrl(url: string): NewsArticleRecord | null {
  const row = db.prepare(`
    SELECT
      id,
      source_id as sourceId,
      headline,
      summary,
      url,
      published_at as publishedAt,
      niche,
      embedding_id as embeddingId,
      embedding_status as embeddingStatus,
      created_at as createdAt
    FROM news_articles
    WHERE url = ?
  `).get(url) as NewsArticleRecord | undefined;

  return row || null;
}

/**
 * Get news articles by niche with optional limit
 */
export function getNewsArticlesByNiche(
  niche: string,
  limit: number = 50
): NewsArticleRecord[] {
  return db.prepare(`
    SELECT
      id,
      source_id as sourceId,
      headline,
      summary,
      url,
      published_at as publishedAt,
      niche,
      embedding_id as embeddingId,
      embedding_status as embeddingStatus,
      created_at as createdAt
    FROM news_articles
    WHERE niche = ?
    ORDER BY published_at DESC
    LIMIT ?
  `).all(niche, limit) as NewsArticleRecord[];
}

/**
 * Get news articles by source ID
 */
export function getNewsArticlesBySource(
  sourceId: string,
  limit: number = 100
): NewsArticleRecord[] {
  return db.prepare(`
    SELECT
      id,
      source_id as sourceId,
      headline,
      summary,
      url,
      published_at as publishedAt,
      niche,
      embedding_id as embeddingId,
      embedding_status as embeddingStatus,
      created_at as createdAt
    FROM news_articles
    WHERE source_id = ?
    ORDER BY published_at DESC
    LIMIT ?
  `).all(sourceId, limit) as NewsArticleRecord[];
}

/**
 * Get articles that need embedding (pending or error status)
 */
export function getUnembeddedArticles(limit: number = 50): NewsArticleRecord[] {
  return db.prepare(`
    SELECT
      id,
      source_id as sourceId,
      headline,
      summary,
      url,
      published_at as publishedAt,
      niche,
      embedding_id as embeddingId,
      embedding_status as embeddingStatus,
      created_at as createdAt
    FROM news_articles
    WHERE embedding_status = 'pending'
    ORDER BY created_at ASC
    LIMIT ?
  `).all(limit) as NewsArticleRecord[];
}

/**
 * Update article embedding status
 */
export function updateArticleEmbeddingStatus(
  id: string,
  status: 'pending' | 'processing' | 'embedded' | 'error',
  embeddingId?: string
): void {
  if (embeddingId) {
    db.prepare(`
      UPDATE news_articles
      SET embedding_status = ?, embedding_id = ?
      WHERE id = ?
    `).run(status, embeddingId, id);
  } else {
    db.prepare(`
      UPDATE news_articles
      SET embedding_status = ?
      WHERE id = ?
    `).run(status, id);
  }
}

/**
 * Delete articles older than specified date
 * Returns the deleted articles (for ChromaDB cleanup)
 */
export function deleteOldNewsArticles(olderThanDate: string): NewsArticleRecord[] {
  // First, get the articles to be deleted (need their embedding IDs)
  const articlesToDelete = db.prepare(`
    SELECT
      id,
      source_id as sourceId,
      headline,
      summary,
      url,
      published_at as publishedAt,
      niche,
      embedding_id as embeddingId,
      embedding_status as embeddingStatus,
      created_at as createdAt
    FROM news_articles
    WHERE published_at < ?
  `).all(olderThanDate) as NewsArticleRecord[];

  // Delete them
  if (articlesToDelete.length > 0) {
    db.prepare(`
      DELETE FROM news_articles
      WHERE published_at < ?
    `).run(olderThanDate);
  }

  return articlesToDelete;
}

/**
 * Count articles by embedding status
 */
export function getArticleCountByStatus(): Record<string, number> {
  const rows = db.prepare(`
    SELECT embedding_status as status, COUNT(*) as count
    FROM news_articles
    GROUP BY embedding_status
  `).all() as Array<{ status: string; count: number }>;

  const result: Record<string, number> = {
    pending: 0,
    processing: 0,
    embedded: 0,
    error: 0
  };

  for (const row of rows) {
    result[row.status] = row.count;
  }

  return result;
}

/**
 * Get total article count
 */
export function getTotalArticleCount(): number {
  const row = db.prepare(`
    SELECT COUNT(*) as count FROM news_articles
  `).get() as { count: number };
  return row.count;
}

// ============================================
// NEWS SOURCE OPERATIONS
// ============================================

/**
 * Get all news sources
 */
export function getNewsSources(): NewsSourceRecord[] {
  const rows = db.prepare(`
    SELECT
      id,
      name,
      url,
      niche,
      fetch_method as fetchMethod,
      enabled,
      last_fetch as lastFetch,
      article_count as articleCount,
      created_at as createdAt
    FROM news_sources
    ORDER BY name
  `).all() as Array<{
    id: string;
    name: string;
    url: string;
    niche: string;
    fetchMethod: 'rss' | 'scrape';
    enabled: number;
    lastFetch: string | null;
    articleCount: number;
    createdAt: string;
  }>;

  return rows.map(row => ({
    id: row.id,
    name: row.name,
    url: row.url,
    niche: row.niche,
    fetchMethod: row.fetchMethod,
    enabled: Boolean(row.enabled),
    lastFetch: row.lastFetch,
    articleCount: row.articleCount,
    createdAt: row.createdAt
  }));
}

/**
 * Get a news source by ID
 */
export function getNewsSourceById(id: string): NewsSourceRecord | null {
  const row = db.prepare(`
    SELECT
      id,
      name,
      url,
      niche,
      fetch_method as fetchMethod,
      enabled,
      last_fetch as lastFetch,
      article_count as articleCount,
      created_at as createdAt
    FROM news_sources
    WHERE id = ?
  `).get(id) as {
    id: string;
    name: string;
    url: string;
    niche: string;
    fetchMethod: 'rss' | 'scrape';
    enabled: number;
    lastFetch: string | null;
    articleCount: number;
    createdAt: string;
  } | undefined;

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    url: row.url,
    niche: row.niche,
    fetchMethod: row.fetchMethod,
    enabled: Boolean(row.enabled),
    lastFetch: row.lastFetch,
    articleCount: row.articleCount,
    createdAt: row.createdAt
  };
}

/**
 * Get news sources by niche
 */
export function getNewsSourcesByNiche(niche: string): NewsSourceRecord[] {
  const rows = db.prepare(`
    SELECT
      id,
      name,
      url,
      niche,
      fetch_method as fetchMethod,
      enabled,
      last_fetch as lastFetch,
      article_count as articleCount,
      created_at as createdAt
    FROM news_sources
    WHERE niche = ?
    ORDER BY name
  `).all(niche) as Array<{
    id: string;
    name: string;
    url: string;
    niche: string;
    fetchMethod: 'rss' | 'scrape';
    enabled: number;
    lastFetch: string | null;
    articleCount: number;
    createdAt: string;
  }>;

  return rows.map(row => ({
    id: row.id,
    name: row.name,
    url: row.url,
    niche: row.niche,
    fetchMethod: row.fetchMethod,
    enabled: Boolean(row.enabled),
    lastFetch: row.lastFetch,
    articleCount: row.articleCount,
    createdAt: row.createdAt
  }));
}

/**
 * Get only enabled news sources
 */
export function getEnabledNewsSources(): NewsSourceRecord[] {
  const rows = db.prepare(`
    SELECT
      id,
      name,
      url,
      niche,
      fetch_method as fetchMethod,
      enabled,
      last_fetch as lastFetch,
      article_count as articleCount,
      created_at as createdAt
    FROM news_sources
    WHERE enabled = 1
    ORDER BY name
  `).all() as Array<{
    id: string;
    name: string;
    url: string;
    niche: string;
    fetchMethod: 'rss' | 'scrape';
    enabled: number;
    lastFetch: string | null;
    articleCount: number;
    createdAt: string;
  }>;

  return rows.map(row => ({
    id: row.id,
    name: row.name,
    url: row.url,
    niche: row.niche,
    fetchMethod: row.fetchMethod,
    enabled: true,
    lastFetch: row.lastFetch,
    articleCount: row.articleCount,
    createdAt: row.createdAt
  }));
}

/**
 * Update news source last fetch timestamp and article count
 */
export function updateNewsSourceLastFetch(
  id: string,
  timestamp: string,
  articleCount: number
): void {
  db.prepare(`
    UPDATE news_sources
    SET last_fetch = ?, article_count = ?
    WHERE id = ?
  `).run(timestamp, articleCount, id);
}

/**
 * Toggle news source enabled status
 */
export function toggleNewsSourceEnabled(id: string, enabled: boolean): void {
  db.prepare(`
    UPDATE news_sources
    SET enabled = ?
    WHERE id = ?
  `).run(enabled ? 1 : 0, id);
}

/**
 * Get news sync statistics
 */
export function getNewsSyncStats(): {
  totalSources: number;
  enabledSources: number;
  totalArticles: number;
  embeddedArticles: number;
  pendingArticles: number;
} {
  const sourceStats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN enabled = 1 THEN 1 ELSE 0 END) as enabled
    FROM news_sources
  `).get() as { total: number; enabled: number };

  const articleStats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN embedding_status = 'embedded' THEN 1 ELSE 0 END) as embedded,
      SUM(CASE WHEN embedding_status = 'pending' THEN 1 ELSE 0 END) as pending
    FROM news_articles
  `).get() as { total: number; embedded: number; pending: number };

  return {
    totalSources: sourceStats.total,
    enabledSources: sourceStats.enabled,
    totalArticles: articleStats.total,
    embeddedArticles: articleStats.embedded || 0,
    pendingArticles: articleStats.pending || 0
  };
}
