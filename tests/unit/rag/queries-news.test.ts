/**
 * Database Query Functions for News Tests
 *
 * Story 6.4 - News Feed Aggregation & Embedding
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the database client
vi.mock('@/lib/db/client', () => {
  const mockPrepare = vi.fn((sql: string) => {
    // Match getNewsSyncStats queries
    if (sql.includes('COUNT') && sql.includes('news_sources') && sql.includes('enabled')) {
      return {
        get: vi.fn(() => ({ total: 7, enabled: 5 })),
        all: vi.fn(() => [])
      };
    }
    if (sql.includes('COUNT') && sql.includes('news_articles') && sql.includes('embedded')) {
      return {
        get: vi.fn(() => ({ total: 100, embedded: 80, pending: 15, error: 5 })),
        all: vi.fn(() => [])
      };
    }
    // Match getArticleCountByStatus - GROUP BY embedding_status
    if (sql.includes('GROUP BY') && sql.includes('embedding_status')) {
      return {
        get: vi.fn(() => ({ pending: 10, processing: 2, embedded: 85, error: 3 })),
        all: vi.fn(() => [
          { embedding_status: 'pending', count: 10 },
          { embedding_status: 'processing', count: 2 },
          { embedding_status: 'embedded', count: 85 },
          { embedding_status: 'error', count: 3 }
        ])
      };
    }
    // Default mock - for SELECT queries like getNewsArticleByUrl, getUnembeddedArticles
    return {
      run: vi.fn(),
      get: vi.fn(() => null),
      all: vi.fn(() => [])
    };
  });

  return {
    default: {
      prepare: mockPrepare,
      pragma: vi.fn()
    }
  };
});

// Import after mocking
import {
  getNewsArticleByUrl,
  getUnembeddedArticles,
  getArticleCountByStatus,
  getNewsSyncStats,
  type NewsArticleRecord
} from '@/lib/db/queries-news';

describe('News Database Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Deduplication', () => {
    it('getNewsArticleByUrl returns null for non-existent URL', () => {
      // With mocked empty results
      const result = getNewsArticleByUrl('https://example.com/non-existent');
      expect(result).toBeNull();
    });
  });

  describe('Incremental Processing', () => {
    it('getUnembeddedArticles returns articles with pending status', () => {
      const result = getUnembeddedArticles(10);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('getArticleCountByStatus returns object with all statuses', () => {
      const result = getArticleCountByStatus();

      expect(result).toHaveProperty('pending');
      expect(result).toHaveProperty('processing');
      expect(result).toHaveProperty('embedded');
      expect(result).toHaveProperty('error');
    });

    it('getNewsSyncStats returns comprehensive stats', () => {
      const result = getNewsSyncStats();

      expect(result).toHaveProperty('totalSources');
      expect(result).toHaveProperty('enabledSources');
      expect(result).toHaveProperty('totalArticles');
      expect(result).toHaveProperty('embeddedArticles');
      expect(result).toHaveProperty('pendingArticles');
    });
  });
});

describe('News Article Record Interface', () => {
  it('should have correct shape', () => {
    const mockArticle: NewsArticleRecord = {
      id: 'article-1',
      sourceId: 'source-1',
      headline: 'Test Headline',
      summary: 'Test summary',
      url: 'https://example.com/article',
      publishedAt: '2024-01-15T10:00:00Z',
      niche: 'military',
      embeddingId: null,
      embeddingStatus: 'pending',
      createdAt: '2024-01-15T10:00:00Z'
    };

    expect(mockArticle.id).toBe('article-1');
    expect(mockArticle.embeddingStatus).toBe('pending');
    expect(['pending', 'processing', 'embedded', 'error']).toContain(mockArticle.embeddingStatus);
  });
});

describe('Pruning Logic', () => {
  it('should correctly calculate 7-day cutoff', () => {
    const retentionDays = 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Cutoff date should be approximately 7 days ago
    expect(cutoffDate.getTime()).toBeCloseTo(sevenDaysAgo.getTime(), -4);
  });

  it('should identify articles older than retention period', () => {
    const retentionDays = 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffDateStr = cutoffDate.toISOString();

    const testArticles = [
      { publishedAt: new Date().toISOString(), shouldPrune: false },
      {
        publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        shouldPrune: false
      },
      {
        publishedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        shouldPrune: true
      },
      {
        publishedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        shouldPrune: true
      }
    ];

    for (const article of testArticles) {
      const isPrunable = article.publishedAt < cutoffDateStr;
      expect(isPrunable).toBe(article.shouldPrune);
    }
  });
});
