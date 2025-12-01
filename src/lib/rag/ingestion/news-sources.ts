/**
 * News Source Configuration
 *
 * Story 6.4 - News Feed Aggregation & Embedding
 *
 * Defines interfaces and helper functions for news source management.
 * The actual news sources are seeded in Migration 013 and stored in the database.
 */

import db from '@/lib/db/client';

/**
 * News source configuration
 */
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

/**
 * Pre-defined military news sources (for reference - actual sources in database)
 * These match the sources seeded in Migration 013
 */
export const MILITARY_NEWS_SOURCE_IDS = [
  'warzone',
  'military-com',
  'defense-news',
  'breaking-defense',
  'defense-one',
  'military-times',
  'janes'
] as const;

export type MilitaryNewsSourceId = typeof MILITARY_NEWS_SOURCE_IDS[number];

/**
 * Raw database row type (enabled is stored as number)
 */
interface NewsSourceRow {
  id: string;
  name: string;
  url: string;
  niche: string;
  fetchMethod: 'rss' | 'scrape';
  enabled: number;
  lastFetch: string | null;
  articleCount: number;
  createdAt: string;
}

/**
 * Convert raw row to NewsSource
 */
function rowToNewsSource(row: NewsSourceRow, forceEnabled?: boolean): NewsSource {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    niche: row.niche,
    fetchMethod: row.fetchMethod,
    enabled: forceEnabled !== undefined ? forceEnabled : Boolean(row.enabled),
    lastFetch: row.lastFetch,
    articleCount: row.articleCount,
    createdAt: row.createdAt
  };
}

/**
 * Get all news sources from database
 */
export function getNewsSources(): NewsSource[] {
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
  `).all() as NewsSourceRow[];

  return rows.map(row => rowToNewsSource(row));
}

/**
 * Get news sources filtered by niche
 */
export function getNewsSourcesByNiche(niche: string): NewsSource[] {
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
  `).all(niche) as NewsSourceRow[];

  return rows.map(row => rowToNewsSource(row));
}

/**
 * Get only enabled news sources
 */
export function getEnabledNewsSources(): NewsSource[] {
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
  `).all() as NewsSourceRow[];

  return rows.map(row => rowToNewsSource(row, true));
}

/**
 * Get enabled news sources by niche
 */
export function getEnabledNewsSourcesByNiche(niche: string): NewsSource[] {
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
    WHERE enabled = 1 AND niche = ?
    ORDER BY name
  `).all(niche) as NewsSourceRow[];

  return rows.map(row => rowToNewsSource(row, true));
}

/**
 * Get a single news source by ID
 */
export function getNewsSourceById(id: string): NewsSource | null {
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
  `).get(id) as NewsSourceRow | undefined;

  if (!row) return null;

  return rowToNewsSource(row);
}

/**
 * Toggle enabled status for a news source
 */
export function toggleNewsSourceEnabled(id: string, enabled: boolean): void {
  db.prepare(`
    UPDATE news_sources
    SET enabled = ?
    WHERE id = ?
  `).run(enabled ? 1 : 0, id);
}

/**
 * Update last fetch timestamp and article count for a source
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
