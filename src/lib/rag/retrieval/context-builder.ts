/**
 * RAG Context Builder
 *
 * Assembles RAGContext from multiple ChromaDB collections.
 * Story 6.5 - RAG Retrieval & Context Building
 */

import { queryRelevantContent, type MetadataFilters } from './semantic-search';
import { truncateRAGContext, DEFAULT_MAX_TOKENS, countRAGContextTokens } from './token-counter';
import type { RAGContext, RAGConfig, RetrievedDocument } from '../types';
import db from '@/lib/db/client';

/**
 * Options for context retrieval
 */
export interface ContextBuilderOptions {
  topKPerCollection?: number;  // Default: 5
  maxTokens?: number;          // Default: 4000
  includeNews?: boolean;       // Default: based on config
  newsDaysBack?: number;       // Default: 7
}

/**
 * Project RAG configuration from database
 */
interface ProjectRAGRow {
  id: string;
  rag_enabled: number;
  rag_config: string | null;
  niche: string | null;
}

/**
 * Get project RAG configuration from database
 */
export function getProjectRAGConfig(projectId: string): { enabled: boolean; config: RAGConfig | null } {
  const row = db.prepare(`
    SELECT id, rag_enabled, rag_config, niche
    FROM projects
    WHERE id = ?
  `).get(projectId) as ProjectRAGRow | undefined;

  if (!row) {
    return { enabled: false, config: null };
  }

  const enabled = Boolean(row.rag_enabled);

  if (!enabled || !row.rag_config) {
    return { enabled, config: null };
  }

  try {
    const config = JSON.parse(row.rag_config) as RAGConfig;
    // Use project niche as fallback
    if (!config.niche && row.niche) {
      config.niche = row.niche;
    }
    return { enabled, config };
  } catch {
    console.error(`[context-builder] Invalid rag_config JSON for project ${projectId}`);
    return { enabled, config: null };
  }
}

/**
 * Check if RAG is enabled for a project
 */
export function isProjectRAGEnabled(projectId: string): boolean {
  const { enabled } = getProjectRAGConfig(projectId);
  return enabled;
}

/**
 * Get user's channel ID from project RAG config
 */
export function getProjectUserChannelId(projectId: string): string | null {
  const { config } = getProjectRAGConfig(projectId);
  return config?.userChannelId || null;
}

/**
 * Get competitor channel IDs from project RAG config
 */
export function getProjectCompetitorChannels(projectId: string): string[] {
  const { config } = getProjectRAGConfig(projectId);
  return config?.competitorChannels || [];
}

/**
 * Get project niche
 */
export function getProjectNiche(projectId: string): string | null {
  const { config } = getProjectRAGConfig(projectId);
  return config?.niche || null;
}

/**
 * Calculate date range for news filtering (last N days)
 */
function getNewsDateRange(daysBack: number): { start: string; end: string } {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  return {
    start: startDate.toISOString(),
    end: endDate.toISOString()
  };
}

/**
 * Retrieve RAG context for a project
 *
 * @param projectId - The project ID
 * @param query - The topic/query to search for
 * @param options - Context builder options
 * @returns RAGContext with documents from all applicable collections
 */
export async function retrieveRAGContext(
  projectId: string,
  query: string,
  options: ContextBuilderOptions = {}
): Promise<RAGContext> {
  const {
    topKPerCollection = 5,
    maxTokens = DEFAULT_MAX_TOKENS,
    newsDaysBack = 7
  } = options;

  // Initialize empty context
  const context: RAGContext = {
    channelContent: [],
    competitorContent: [],
    newsArticles: [],
    trendingTopics: []
  };

  // Get project RAG configuration
  const { enabled, config } = getProjectRAGConfig(projectId);

  if (!enabled || !config) {
    console.log(`[context-builder] RAG not enabled for project ${projectId}`);
    return context;
  }

  const niche = config.niche;
  const includeNews = options.includeNews ?? config.newsEnabled;

  try {
    // Build promises for parallel queries
    const queryPromises: Promise<void>[] = [];

    // 1. Query user's channel content (established mode only)
    if (config.mode === 'established' && config.userChannelId) {
      queryPromises.push(
        queryRelevantContent(query, 'channel_content', {
          topK: topKPerCollection,
          filters: { channelId: config.userChannelId }
        }).then(docs => {
          context.channelContent = docs;
        })
      );
    }

    // 2. Query competitor channels
    if (config.competitorChannels && config.competitorChannels.length > 0) {
      // Query each competitor channel and combine results
      const competitorPromises = config.competitorChannels.map(channelId =>
        queryRelevantContent(query, 'channel_content', {
          topK: Math.ceil(topKPerCollection / config.competitorChannels.length),
          filters: { channelId }
        })
      );

      queryPromises.push(
        Promise.all(competitorPromises).then(results => {
          // Flatten and sort by score
          const allDocs: RetrievedDocument[] = results.flat();
          allDocs.sort((a, b) => b.score - a.score);
          context.competitorContent = allDocs.slice(0, topKPerCollection);
        })
      );
    }

    // 3. Query news articles
    if (includeNews && niche) {
      const dateRange = getNewsDateRange(newsDaysBack);
      const newsFilters: MetadataFilters = {
        niche,
        dateRange
      };

      queryPromises.push(
        queryRelevantContent(query, 'news_articles', {
          topK: topKPerCollection,
          filters: newsFilters
        }).then(docs => {
          context.newsArticles = docs;
        })
      );
    }

    // 4. Query trending topics (if enabled)
    if (config.trendsEnabled && niche) {
      queryPromises.push(
        queryRelevantContent(query, 'trending_topics', {
          topK: 3, // Fewer trending topics
          filters: { niche }
        }).then(docs => {
          context.trendingTopics = docs;
        })
      );
    }

    // Execute all queries in parallel
    await Promise.all(queryPromises);

    // Truncate context to fit within token limit
    const truncatedContext = truncateRAGContext(context, maxTokens);

    console.log(`[context-builder] Retrieved RAG context for project ${projectId}:`,
      `channel=${truncatedContext.channelContent.length},`,
      `competitors=${truncatedContext.competitorContent.length},`,
      `news=${truncatedContext.newsArticles.length},`,
      `trends=${truncatedContext.trendingTopics.length}`
    );

    return truncatedContext;
  } catch (error) {
    console.error(`[context-builder] Failed to retrieve RAG context:`, error);
    // Return empty context on error (graceful degradation)
    return context;
  }
}

/**
 * Get RAG context statistics for preview/debugging
 */
export interface RAGContextStats {
  channelContentCount: number;
  competitorContentCount: number;
  newsArticlesCount: number;
  trendingTopicsCount: number;
  totalDocuments: number;
  estimatedTokens: number;
}

/**
 * Calculate statistics for a RAGContext
 */
export function getRAGContextStats(context: RAGContext): RAGContextStats {
  return {
    channelContentCount: context.channelContent.length,
    competitorContentCount: context.competitorContent.length,
    newsArticlesCount: context.newsArticles.length,
    trendingTopicsCount: context.trendingTopics.length,
    totalDocuments: context.channelContent.length +
      context.competitorContent.length +
      context.newsArticles.length +
      context.trendingTopics.length,
    estimatedTokens: countRAGContextTokens(context)
  };
}
