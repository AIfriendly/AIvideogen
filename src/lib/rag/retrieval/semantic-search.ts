/**
 * Semantic Search Service
 *
 * Implements semantic similarity search across ChromaDB collections.
 * Story 6.5 - RAG Retrieval & Context Building
 */

import { getChromaClientIfEnabled } from '../vector-db/chroma-client';
import { generateEmbedding } from '../embeddings/local-embeddings';
import type { ChromaCollection, RetrievedDocument } from '../types';

/**
 * Search options for semantic queries
 */
export interface SearchOptions {
  topK?: number;                           // Default: 5
  filters?: MetadataFilters;
}

/**
 * Metadata filters for narrowing search results
 */
export interface MetadataFilters {
  niche?: string;
  channelId?: string;
  sourceId?: string;
  dateRange?: {
    start: string;  // ISO 8601
    end: string;    // ISO 8601
  };
}

/**
 * Simple in-memory cache for query embeddings
 * Key: query text hash
 * Value: { embedding, timestamp }
 */
const embeddingCache = new Map<string, { embedding: number[]; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Clean up expired cache entries
 */
function cleanExpiredCache(): void {
  const now = Date.now();
  for (const [key, value] of embeddingCache.entries()) {
    if (now - value.timestamp > CACHE_TTL_MS) {
      embeddingCache.delete(key);
    }
  }
}

/**
 * Simple hash function for cache keys
 */
function hashQuery(query: string): string {
  let hash = 0;
  for (let i = 0; i < query.length; i++) {
    const char = query.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

/**
 * Get cached embedding or generate new one
 */
async function getQueryEmbedding(query: string): Promise<number[]> {
  // Clean expired entries periodically
  cleanExpiredCache();

  const cacheKey = hashQuery(query);
  const cached = embeddingCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.embedding;
  }

  // Generate new embedding
  const result = await generateEmbedding(query);
  embeddingCache.set(cacheKey, {
    embedding: result.embedding,
    timestamp: Date.now()
  });

  return result.embedding;
}

/**
 * Build ChromaDB where clause from metadata filters
 */
function buildWhereClause(filters?: MetadataFilters): Record<string, unknown> | undefined {
  if (!filters) return undefined;

  const conditions: Record<string, unknown>[] = [];

  if (filters.niche) {
    conditions.push({ niche: { $eq: filters.niche } });
  }

  if (filters.channelId) {
    conditions.push({ channel_id: { $eq: filters.channelId } });
  }

  if (filters.sourceId) {
    conditions.push({ source_id: { $eq: filters.sourceId } });
  }

  if (filters.dateRange) {
    if (filters.dateRange.start) {
      conditions.push({ published_at: { $gte: filters.dateRange.start } });
    }
    if (filters.dateRange.end) {
      conditions.push({ published_at: { $lte: filters.dateRange.end } });
    }
  }

  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];

  return { $and: conditions };
}

/**
 * Convert ChromaDB distance to similarity score
 * ChromaDB returns L2 distance, we convert to 0-1 score where 1 is most similar
 */
function distanceToScore(distance: number): number {
  // Using exponential decay: score = e^(-distance)
  // This maps distance 0 -> 1, and larger distances -> 0
  return Math.exp(-distance);
}

/**
 * Query relevant content from a ChromaDB collection
 *
 * @param query - The search query string
 * @param collection - The ChromaDB collection to search
 * @param options - Search options (topK, filters)
 * @returns Array of retrieved documents sorted by relevance
 */
export async function queryRelevantContent(
  query: string,
  collection: ChromaCollection,
  options: SearchOptions = {}
): Promise<RetrievedDocument[]> {
  const { topK = 5, filters } = options;

  try {
    // Get ChromaDB client
    const chromaClient = await getChromaClientIfEnabled();
    if (!chromaClient) {
      console.log('[semantic-search] RAG is disabled, returning empty results');
      return [];
    }

    // Generate query embedding (with caching)
    const queryEmbedding = await getQueryEmbedding(query);

    // Build where clause from filters
    const whereClause = buildWhereClause(filters);

    // Query ChromaDB
    const results = await chromaClient.query(
      collection,
      queryEmbedding,
      topK,
      whereClause
    );

    // Map results to RetrievedDocument format
    const documents: RetrievedDocument[] = [];
    for (let i = 0; i < results.ids.length; i++) {
      documents.push({
        id: results.ids[i],
        content: results.documents[i] || '',
        metadata: results.metadatas[i] || {},
        score: distanceToScore(results.distances[i] || 0)
      });
    }

    // Sort by score descending (should already be sorted, but ensure)
    documents.sort((a, b) => b.score - a.score);

    return documents;
  } catch (error) {
    console.error(`[semantic-search] Query failed for collection ${collection}:`, error);
    // Graceful degradation - return empty results on error
    return [];
  }
}

/**
 * Query multiple collections in parallel
 *
 * @param query - The search query string
 * @param collections - Array of collections to search
 * @param options - Search options (topK, filters per collection)
 * @returns Map of collection name to retrieved documents
 */
export async function queryMultipleCollections(
  query: string,
  collections: ChromaCollection[],
  options: SearchOptions = {}
): Promise<Map<ChromaCollection, RetrievedDocument[]>> {
  const results = new Map<ChromaCollection, RetrievedDocument[]>();

  // Query all collections in parallel
  const promises = collections.map(async (collection) => {
    const docs = await queryRelevantContent(query, collection, options);
    return { collection, docs };
  });

  const settled = await Promise.all(promises);

  for (const { collection, docs } of settled) {
    results.set(collection, docs);
  }

  return results;
}

/**
 * Clear the embedding cache
 * Useful for testing or when cache needs to be invalidated
 */
export function clearEmbeddingCache(): void {
  embeddingCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; oldestAgeMs: number | null } {
  cleanExpiredCache();

  let oldestTimestamp: number | null = null;
  for (const value of embeddingCache.values()) {
    if (oldestTimestamp === null || value.timestamp < oldestTimestamp) {
      oldestTimestamp = value.timestamp;
    }
  }

  return {
    size: embeddingCache.size,
    oldestAgeMs: oldestTimestamp ? Date.now() - oldestTimestamp : null
  };
}
