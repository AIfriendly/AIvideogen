/**
 * News Embedding Service Tests
 *
 * Story 6.4 - News Feed Aggregation & Embedding
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/lib/rag/embeddings/local-embeddings', () => ({
  generateEmbedding: vi.fn(() => Promise.resolve({
    embedding: new Array(384).fill(0.1),
    dimensions: 384,
    model: 'all-MiniLM-L6-v2'
  })),
  generateEmbeddings: vi.fn((texts: string[]) => Promise.resolve(
    texts.map(() => ({
      embedding: new Array(384).fill(0.1),
      dimensions: 384,
      model: 'all-MiniLM-L6-v2'
    }))
  ))
}));

vi.mock('@/lib/rag/vector-db/chroma-client', () => ({
  getChromaClient: vi.fn(() => Promise.resolve({
    addDocuments: vi.fn(() => Promise.resolve()),
    deleteDocuments: vi.fn(() => Promise.resolve())
  }))
}));

vi.mock('@/lib/db/queries-news', () => ({
  updateArticleEmbeddingStatus: vi.fn()
}));

// Import after mocking
import {
  embedNewsArticle,
  embedNewsArticles,
  deleteNewsEmbeddings,
  type ArticleEmbeddingResult
} from '@/lib/rag/ingestion/news-embedding';
import type { NewsArticleRecord } from '@/lib/db/queries-news';

describe('News Embedding Service', () => {
  const mockArticle: NewsArticleRecord = {
    id: 'article-1',
    sourceId: 'source-1',
    headline: 'Test Article Headline',
    summary: 'This is a test article summary for embedding.',
    url: 'https://example.com/test-article',
    publishedAt: '2024-01-15T10:00:00Z',
    niche: 'military',
    embeddingId: null,
    embeddingStatus: 'pending',
    createdAt: '2024-01-15T10:00:00Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('embedNewsArticle', () => {
    it('should embed a single article successfully', async () => {
      const result = await embedNewsArticle(mockArticle);

      expect(result.articleId).toBe('article-1');
      expect(result.success).toBe(true);
      expect(result.embeddingId).toBeDefined();
      expect(result.embeddingId).toContain('news_article-1_');
    });

    it('should concatenate headline and summary for embedding', async () => {
      const { generateEmbedding } = await import('@/lib/rag/embeddings/local-embeddings');

      await embedNewsArticle(mockArticle);

      expect(generateEmbedding).toHaveBeenCalledWith(
        expect.stringContaining('Test Article Headline')
      );
      expect(generateEmbedding).toHaveBeenCalledWith(
        expect.stringContaining('test article summary')
      );
    });

    it('should handle articles with no summary', async () => {
      const articleNoSummary: NewsArticleRecord = {
        ...mockArticle,
        summary: null
      };

      const result = await embedNewsArticle(articleNoSummary);

      expect(result.success).toBe(true);
    });
  });

  describe('embedNewsArticles', () => {
    it('should embed multiple articles in batch', async () => {
      const articles: NewsArticleRecord[] = [
        { ...mockArticle, id: 'article-1' },
        { ...mockArticle, id: 'article-2', headline: 'Second Article' },
        { ...mockArticle, id: 'article-3', headline: 'Third Article' }
      ];

      const result = await embedNewsArticles(articles, 10);

      expect(result.total).toBe(3);
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(3);
    });

    it('should process in batches of specified size', async () => {
      const articles: NewsArticleRecord[] = Array.from({ length: 25 }, (_, i) => ({
        ...mockArticle,
        id: `article-${i}`,
        headline: `Article ${i}`
      }));

      const result = await embedNewsArticles(articles, 10);

      expect(result.total).toBe(25);
      expect(result.successful).toBe(25);
    });
  });

  describe('deleteNewsEmbeddings', () => {
    it('should delete embeddings by IDs', async () => {
      const embeddingIds = ['emb-1', 'emb-2', 'emb-3'];

      const deleted = await deleteNewsEmbeddings(embeddingIds);

      expect(deleted).toBe(3);
    });

    it('should handle empty array', async () => {
      const deleted = await deleteNewsEmbeddings([]);

      expect(deleted).toBe(0);
    });
  });
});

describe('ArticleEmbeddingResult Interface', () => {
  it('should have correct success shape', () => {
    const successResult: ArticleEmbeddingResult = {
      articleId: 'article-1',
      success: true,
      embeddingId: 'emb-123'
    };

    expect(successResult.success).toBe(true);
    expect(successResult.error).toBeUndefined();
  });

  it('should have correct error shape', () => {
    const errorResult: ArticleEmbeddingResult = {
      articleId: 'article-1',
      success: false,
      error: 'Embedding generation failed'
    };

    expect(errorResult.success).toBe(false);
    expect(errorResult.embeddingId).toBeUndefined();
    expect(errorResult.error).toBeDefined();
  });
});
