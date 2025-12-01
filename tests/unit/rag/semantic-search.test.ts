/**
 * Semantic Search Tests
 *
 * Story 6.5 - RAG Retrieval & Context Building
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock ChromaDB client
vi.mock('@/lib/rag/vector-db/chroma-client', () => ({
  getChromaClientIfEnabled: vi.fn()
}));

// Mock embeddings service
vi.mock('@/lib/rag/embeddings/local-embeddings', () => ({
  generateEmbedding: vi.fn()
}));

import {
  queryRelevantContent,
  queryMultipleCollections,
  clearEmbeddingCache,
  getCacheStats
} from '@/lib/rag/retrieval/semantic-search';
import { getChromaClientIfEnabled } from '@/lib/rag/vector-db/chroma-client';
import { generateEmbedding } from '@/lib/rag/embeddings/local-embeddings';

describe('Semantic Search', () => {
  const mockEmbedding = new Array(384).fill(0.1);

  const mockQueryResults = {
    ids: ['doc1', 'doc2', 'doc3'],
    documents: ['Content 1', 'Content 2', 'Content 3'],
    metadatas: [
      { niche: 'military', channel_id: 'ch1' },
      { niche: 'military', channel_id: 'ch1' },
      { niche: 'military', channel_id: 'ch2' }
    ],
    distances: [0.1, 0.3, 0.5]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    clearEmbeddingCache();

    // Mock embedding generation
    vi.mocked(generateEmbedding).mockResolvedValue({
      embedding: mockEmbedding,
      dimensions: 384,
      model: 'all-MiniLM-L6-v2'
    });
  });

  afterEach(() => {
    clearEmbeddingCache();
  });

  describe('queryRelevantContent', () => {
    it('should return empty array when RAG is disabled', async () => {
      vi.mocked(getChromaClientIfEnabled).mockResolvedValue(null);

      const results = await queryRelevantContent('test query', 'channel_content');

      expect(results).toEqual([]);
      expect(generateEmbedding).not.toHaveBeenCalled();
    });

    it('should query ChromaDB and return sorted results', async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue(mockQueryResults)
      };
      vi.mocked(getChromaClientIfEnabled).mockResolvedValue(mockClient as never);

      const results = await queryRelevantContent('test query', 'channel_content');

      expect(results).toHaveLength(3);
      // Results should be sorted by score (highest first)
      expect(results[0].id).toBe('doc1');
      expect(results[0].score).toBeGreaterThan(results[1].score);
      expect(results[1].score).toBeGreaterThan(results[2].score);
    });

    it('should respect topK parameter', async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue(mockQueryResults)
      };
      vi.mocked(getChromaClientIfEnabled).mockResolvedValue(mockClient as never);

      await queryRelevantContent('test query', 'channel_content', { topK: 10 });

      expect(mockClient.query).toHaveBeenCalledWith(
        'channel_content',
        mockEmbedding,
        10,
        undefined
      );
    });

    it('should build where clause from filters', async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({ ids: [], documents: [], metadatas: [], distances: [] })
      };
      vi.mocked(getChromaClientIfEnabled).mockResolvedValue(mockClient as never);

      await queryRelevantContent('test query', 'channel_content', {
        filters: { niche: 'military', channelId: 'ch1' }
      });

      const whereClause = mockClient.query.mock.calls[0][3];
      expect(whereClause).toBeDefined();
      expect(whereClause.$and).toContainEqual({ niche: { $eq: 'military' } });
      expect(whereClause.$and).toContainEqual({ channel_id: { $eq: 'ch1' } });
    });

    it('should handle ChromaDB errors gracefully', async () => {
      const mockClient = {
        query: vi.fn().mockRejectedValue(new Error('ChromaDB error'))
      };
      vi.mocked(getChromaClientIfEnabled).mockResolvedValue(mockClient as never);

      const results = await queryRelevantContent('test query', 'channel_content');

      expect(results).toEqual([]);
    });

    it('should cache query embeddings', async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({ ids: [], documents: [], metadatas: [], distances: [] })
      };
      vi.mocked(getChromaClientIfEnabled).mockResolvedValue(mockClient as never);

      // First query
      await queryRelevantContent('same query', 'channel_content');
      expect(generateEmbedding).toHaveBeenCalledTimes(1);

      // Second query with same text
      await queryRelevantContent('same query', 'channel_content');
      expect(generateEmbedding).toHaveBeenCalledTimes(1); // Still 1, used cache
    });

    it('should convert distances to similarity scores', async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({
          ids: ['doc1'],
          documents: ['Content'],
          metadatas: [{}],
          distances: [0] // Distance 0 = perfect match
        })
      };
      vi.mocked(getChromaClientIfEnabled).mockResolvedValue(mockClient as never);

      const results = await queryRelevantContent('test query', 'channel_content');

      // Distance 0 should convert to score ~1 (e^0 = 1)
      expect(results[0].score).toBeCloseTo(1, 1);
    });
  });

  describe('queryMultipleCollections', () => {
    it('should query all collections in parallel', async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({ ids: [], documents: [], metadatas: [], distances: [] })
      };
      vi.mocked(getChromaClientIfEnabled).mockResolvedValue(mockClient as never);

      const results = await queryMultipleCollections(
        'test query',
        ['channel_content', 'news_articles']
      );

      expect(results.get('channel_content')).toEqual([]);
      expect(results.get('news_articles')).toEqual([]);
      expect(mockClient.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cache management', () => {
    it('should track cache statistics', async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({ ids: [], documents: [], metadatas: [], distances: [] })
      };
      vi.mocked(getChromaClientIfEnabled).mockResolvedValue(mockClient as never);

      // Make a query to populate cache
      await queryRelevantContent('test query', 'channel_content');

      const stats = getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.oldestAgeMs).not.toBeNull();
    });

    it('should clear cache', async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({ ids: [], documents: [], metadatas: [], distances: [] })
      };
      vi.mocked(getChromaClientIfEnabled).mockResolvedValue(mockClient as never);

      await queryRelevantContent('test query', 'channel_content');
      clearEmbeddingCache();

      const stats = getCacheStats();
      expect(stats.size).toBe(0);
    });
  });
});

describe('Date range filtering', () => {
  it('should build date range filter correctly', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({ ids: [], documents: [], metadatas: [], distances: [] })
    };
    vi.mocked(getChromaClientIfEnabled).mockResolvedValue(mockClient as never);
    vi.mocked(generateEmbedding).mockResolvedValue({
      embedding: new Array(384).fill(0.1),
      dimensions: 384,
      model: 'all-MiniLM-L6-v2'
    });

    await queryRelevantContent('test query', 'news_articles', {
      filters: {
        dateRange: {
          start: '2025-11-24T00:00:00Z',
          end: '2025-12-01T23:59:59Z'
        }
      }
    });

    const whereClause = mockClient.query.mock.calls[0][3];
    expect(whereClause.$and).toContainEqual({
      published_at: { $gte: '2025-11-24T00:00:00Z' }
    });
    expect(whereClause.$and).toContainEqual({
      published_at: { $lte: '2025-12-01T23:59:59Z' }
    });
  });
});
