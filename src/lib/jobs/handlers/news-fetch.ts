/**
 * News Fetch Job Handler - Story 6.4
 *
 * Handler for fetching news from RSS feeds and storing embeddings.
 * Implements: fetch → parse → deduplicate → embed → prune
 */

import type { Job, JobHandler } from '../types';
import { jobQueue } from '../queue';
import { getEnabledNewsSources } from '@/lib/rag/ingestion/news-sources';
import {
  fetchAllNewsSources,
  getFetchSummary,
  type ParsedNewsArticle
} from '@/lib/rag/ingestion/news-fetcher';
import {
  createNewsArticle,
  getNewsArticleByUrl,
  deleteOldNewsArticles,
  updateNewsSourceLastFetch,
  getUnembeddedArticles
} from '@/lib/db/queries-news';
import { embedNewsArticles, deleteNewsEmbeddings } from '@/lib/rag/ingestion/news-embedding';

/**
 * Job payload for news fetch
 */
interface NewsFetchPayload {
  niche?: string;           // Filter by niche (optional)
  sourceIds?: string[];     // Specific sources to fetch (empty = all enabled)
  skipEmbedding?: boolean;  // Skip embedding generation
  skipPruning?: boolean;    // Skip old article pruning
  retentionDays?: number;   // Days to retain articles (default: 7)
}

/**
 * Result structure for news fetch job
 */
interface NewsFetchResult extends Record<string, unknown> {
  success: boolean;
  sourcesProcessed: number;
  sourcesSucceeded: number;
  sourcesFailed: number;
  articlesFound: number;
  articlesAdded: number;
  articlesSkipped: number;  // Duplicates
  embeddingsGenerated: number;
  articlesPruned: number;
  errors: Array<{
    sourceId: string;
    sourceName: string;
    error: string;
  }>;
  durationMs: number;
}

/**
 * News Fetch Job Handler (also exported as ragSyncNewsHandler for compatibility)
 *
 * Fetches news from RSS feeds, stores in database, generates embeddings.
 */
export const newsFetchHandler: JobHandler = async (job: Job): Promise<NewsFetchResult> => {
  const startTime = Date.now();
  const payload = (job.payload || {}) as NewsFetchPayload;
  const {
    sourceIds,
    skipEmbedding = false,
    skipPruning = false,
    retentionDays = 7
  } = payload;

  console.log(`[newsFetchHandler] Starting news fetch job ${job.id}`);
  jobQueue.updateProgress(job.id, 5);

  const result: NewsFetchResult = {
    success: true,
    sourcesProcessed: 0,
    sourcesSucceeded: 0,
    sourcesFailed: 0,
    articlesFound: 0,
    articlesAdded: 0,
    articlesSkipped: 0,
    embeddingsGenerated: 0,
    articlesPruned: 0,
    errors: [],
    durationMs: 0
  };

  try {
    // Step 1: Get enabled news sources (10%)
    let sources = getEnabledNewsSources();
    if (sourceIds && sourceIds.length > 0) {
      sources = sources.filter(s => sourceIds.includes(s.id));
    }

    if (sources.length === 0) {
      console.log(`[newsFetchHandler] No enabled news sources found`);
      jobQueue.updateProgress(job.id, 100);
      result.durationMs = Date.now() - startTime;
      return result;
    }

    console.log(`[newsFetchHandler] Fetching from ${sources.length} sources`);
    result.sourcesProcessed = sources.length;

    // Step 2: Fetch RSS feeds (10% - 50%)
    const fetchResults = await fetchAllNewsSources(
      sources,
      (index, total, sourceName) => {
        const progress = 10 + Math.round((index / total) * 40);
        jobQueue.updateProgress(job.id, progress);
        console.log(`[newsFetchHandler] Fetching source ${index}/${total}: ${sourceName}`);
      }
    );

    // Process fetch results
    const fetchSummary = getFetchSummary(fetchResults);
    result.sourcesSucceeded = fetchSummary.successfulSources;
    result.sourcesFailed = fetchSummary.failedSources;
    result.articlesFound = fetchSummary.totalArticles;

    // Collect errors from failed sources
    for (const fetchResult of fetchResults) {
      if (!fetchResult.success && fetchResult.error) {
        result.errors.push({
          sourceId: fetchResult.sourceId,
          sourceName: fetchResult.sourceName,
          error: fetchResult.error
        });
      }
    }

    console.log(`[newsFetchHandler] Fetched ${result.articlesFound} articles from ${result.sourcesSucceeded} sources`);

    // Step 3: Deduplicate and store articles (50% - 70%)
    const allArticles: ParsedNewsArticle[] = [];
    for (const fetchResult of fetchResults) {
      if (fetchResult.success) {
        allArticles.push(...fetchResult.articles);
      }
    }

    jobQueue.updateProgress(job.id, 50);

    const newArticleIds: string[] = [];
    for (let i = 0; i < allArticles.length; i++) {
      const article = allArticles[i];

      // Check for duplicate by URL
      const existing = getNewsArticleByUrl(article.url);
      if (existing) {
        result.articlesSkipped++;
        continue;
      }

      // Create new article record
      try {
        const newArticle = createNewsArticle({
          sourceId: article.sourceId,
          headline: article.headline,
          summary: article.summary,
          url: article.url,
          publishedAt: article.publishedAt,
          niche: article.niche
        });
        newArticleIds.push(newArticle.id);
        result.articlesAdded++;
      } catch (error) {
        console.warn(`[newsFetchHandler] Failed to store article:`, error);
      }

      // Update progress
      if (i % 10 === 0) {
        const progress = 50 + Math.round((i / allArticles.length) * 20);
        jobQueue.updateProgress(job.id, progress);
      }
    }

    console.log(`[newsFetchHandler] Stored ${result.articlesAdded} new articles, skipped ${result.articlesSkipped} duplicates`);

    // Update last fetch timestamps for sources
    const now = new Date().toISOString();
    for (const fetchResult of fetchResults) {
      if (fetchResult.success) {
        updateNewsSourceLastFetch(
          fetchResult.sourceId,
          now,
          fetchResult.articles.length
        );
      }
    }

    // Step 4: Generate embeddings (70% - 90%)
    if (!skipEmbedding && newArticleIds.length > 0) {
      jobQueue.updateProgress(job.id, 70);
      console.log(`[newsFetchHandler] Generating embeddings for ${newArticleIds.length} articles`);

      // Get unembedded articles (includes just-added ones)
      const unembeddedArticles = getUnembeddedArticles(100);
      if (unembeddedArticles.length > 0) {
        const embedResult = await embedNewsArticles(unembeddedArticles, 10);
        result.embeddingsGenerated = embedResult.successful;

        console.log(`[newsFetchHandler] Generated ${embedResult.successful}/${embedResult.total} embeddings`);

        if (embedResult.failed > 0) {
          console.warn(`[newsFetchHandler] ${embedResult.failed} embeddings failed`);
        }
      }
    }

    // Step 5: Prune old articles (90% - 100%)
    if (!skipPruning) {
      jobQueue.updateProgress(job.id, 90);
      console.log(`[newsFetchHandler] Pruning articles older than ${retentionDays} days`);

      const prunedArticles = await pruneOldNews(retentionDays);
      result.articlesPruned = prunedArticles;

      console.log(`[newsFetchHandler] Pruned ${prunedArticles} old articles`);
    }

    jobQueue.updateProgress(job.id, 100);
    result.durationMs = Date.now() - startTime;

    // Mark as failed if any sources failed
    if (result.sourcesFailed > 0 && result.sourcesSucceeded === 0) {
      result.success = false;
    }

    console.log(`[newsFetchHandler] News fetch complete in ${result.durationMs}ms`);
    return result;

  } catch (error) {
    console.error(`[newsFetchHandler] News fetch failed:`, error);
    result.success = false;
    result.durationMs = Date.now() - startTime;
    result.errors.push({
      sourceId: 'system',
      sourceName: 'System',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
};

// Export as ragSyncNewsHandler for backwards compatibility with Story 6.2
export const ragSyncNewsHandler = newsFetchHandler;

/**
 * Prune old news articles from database and ChromaDB
 *
 * @param retentionDays Number of days to retain articles
 * @returns Number of articles pruned
 */
export async function pruneOldNews(retentionDays: number = 7): Promise<number> {
  // Calculate cutoff date
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  const cutoffDateStr = cutoffDate.toISOString();

  console.log(`[pruneOldNews] Pruning articles older than ${cutoffDateStr}`);

  // Get articles to delete (need their embedding IDs)
  const articlesToDelete = deleteOldNewsArticles(cutoffDateStr);

  if (articlesToDelete.length === 0) {
    console.log(`[pruneOldNews] No articles to prune`);
    return 0;
  }

  // Collect embedding IDs for ChromaDB cleanup
  const embeddingIds = articlesToDelete
    .filter(a => a.embeddingId)
    .map(a => a.embeddingId!);

  // Delete embeddings from ChromaDB
  if (embeddingIds.length > 0) {
    const deleted = await deleteNewsEmbeddings(embeddingIds);
    console.log(`[pruneOldNews] Deleted ${deleted} embeddings from ChromaDB`);
  }

  console.log(`[pruneOldNews] Pruned ${articlesToDelete.length} articles`);
  return articlesToDelete.length;
}
