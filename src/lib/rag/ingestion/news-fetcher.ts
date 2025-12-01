/**
 * News Fetcher Service
 *
 * Story 6.4 - News Feed Aggregation & Embedding
 *
 * Fetches news articles from RSS feeds with robust error handling.
 * Implements item-level error handling, timeouts, and date normalization.
 */

import Parser from 'rss-parser';
import type { NewsSource } from './news-sources';

/**
 * Parsed news article from RSS feed
 */
export interface ParsedNewsArticle {
  headline: string;
  summary: string;
  url: string;
  publishedAt: string;
  sourceId: string;
  niche: string;
}

/**
 * Result of fetching a single RSS source
 */
export interface FetchSourceResult {
  sourceId: string;
  sourceName: string;
  success: boolean;
  articles: ParsedNewsArticle[];
  error?: string;
  itemErrors: number;
}

/**
 * RSS fetch timeout in milliseconds
 */
const FETCH_TIMEOUT_MS = 10000;

/**
 * Maximum summary length in characters
 */
const MAX_SUMMARY_LENGTH = 500;

/**
 * Create RSS parser with timeout configuration
 */
function createParser(): Parser {
  return new Parser({
    timeout: FETCH_TIMEOUT_MS,
    headers: {
      'User-Agent': 'AI-Video-Generator/1.0 (RSS Aggregator)',
      'Accept': 'application/rss+xml, application/xml, text/xml'
    }
  });
}

/**
 * Normalize date to ISO 8601 format
 */
function normalizeDate(dateStr: string | undefined): string {
  if (!dateStr) {
    return new Date().toISOString();
  }

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return new Date().toISOString();
    }
    return date.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

/**
 * Extract and truncate summary from RSS item
 */
function extractSummary(item: Parser.Item): string {
  // Try different fields in order of preference
  const content = item.contentSnippet || item.content || item.summary || '';

  // Strip HTML tags if present
  const cleanContent = content.replace(/<[^>]*>/g, '').trim();

  // Truncate to max length
  if (cleanContent.length > MAX_SUMMARY_LENGTH) {
    return cleanContent.substring(0, MAX_SUMMARY_LENGTH - 3) + '...';
  }

  return cleanContent;
}

/**
 * Parse a single RSS item with error handling
 */
function parseItem(
  item: Parser.Item,
  sourceId: string,
  niche: string
): ParsedNewsArticle | null {
  try {
    // Validate required fields
    const headline = item.title?.trim();
    const url = item.link?.trim();

    if (!headline || !url) {
      return null;
    }

    return {
      headline,
      summary: extractSummary(item),
      url,
      publishedAt: normalizeDate(item.pubDate || item.isoDate),
      sourceId,
      niche
    };
  } catch (error) {
    // Item-level error - return null and let caller continue
    console.warn(`[NewsFetcher] Error parsing RSS item:`, error);
    return null;
  }
}

/**
 * Fetch and parse RSS feed from a single source
 */
export async function fetchNewsSource(source: NewsSource): Promise<FetchSourceResult> {
  const parser = createParser();
  const result: FetchSourceResult = {
    sourceId: source.id,
    sourceName: source.name,
    success: false,
    articles: [],
    itemErrors: 0
  };

  try {
    console.log(`[NewsFetcher] Fetching RSS from ${source.name}: ${source.url}`);
    const feed = await parser.parseURL(source.url);

    if (!feed.items || feed.items.length === 0) {
      console.warn(`[NewsFetcher] Empty feed from ${source.name}`);
      result.success = true; // Empty is not an error
      return result;
    }

    // Parse each item with individual error handling
    for (const item of feed.items) {
      try {
        const article = parseItem(item, source.id, source.niche);
        if (article) {
          result.articles.push(article);
        } else {
          result.itemErrors++;
        }
      } catch (error) {
        // Item-level error - log and continue
        console.warn(`[NewsFetcher] Skipping malformed item in ${source.name}:`, error);
        result.itemErrors++;
      }
    }

    result.success = true;
    console.log(
      `[NewsFetcher] Parsed ${result.articles.length} articles from ${source.name}` +
      (result.itemErrors > 0 ? ` (${result.itemErrors} items skipped)` : '')
    );

  } catch (error) {
    // Source-level error - entire feed failed
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[NewsFetcher] Failed to fetch ${source.name}:`, errorMessage);
    result.error = errorMessage;
  }

  return result;
}

/**
 * Fetch news from multiple sources with error isolation
 */
export async function fetchAllNewsSources(
  sources: NewsSource[],
  onProgress?: (sourceIndex: number, total: number, sourceName: string) => void
): Promise<FetchSourceResult[]> {
  const results: FetchSourceResult[] = [];

  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];

    // Report progress
    if (onProgress) {
      onProgress(i + 1, sources.length, source.name);
    }

    // Fetch this source - errors are isolated
    const result = await fetchNewsSource(source);
    results.push(result);
  }

  return results;
}

/**
 * Filter results to only successful sources
 */
export function getSuccessfulResults(results: FetchSourceResult[]): FetchSourceResult[] {
  return results.filter(r => r.success);
}

/**
 * Get summary statistics from fetch results
 */
export function getFetchSummary(results: FetchSourceResult[]): {
  totalSources: number;
  successfulSources: number;
  failedSources: number;
  totalArticles: number;
  totalItemErrors: number;
} {
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const totalArticles = successful.reduce((sum, r) => sum + r.articles.length, 0);
  const totalItemErrors = results.reduce((sum, r) => sum + r.itemErrors, 0);

  return {
    totalSources: results.length,
    successfulSources: successful.length,
    failedSources: failed.length,
    totalArticles,
    totalItemErrors
  };
}
