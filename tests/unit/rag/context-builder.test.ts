/**
 * Context Builder Tests
 *
 * Story 6.5 - RAG Retrieval & Context Building
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock database client
vi.mock('@/lib/db/client', () => ({
  default: {
    prepare: vi.fn(() => ({
      get: vi.fn(),
      all: vi.fn()
    }))
  }
}));

// Mock semantic search
vi.mock('@/lib/rag/retrieval/semantic-search', () => ({
  queryRelevantContent: vi.fn()
}));

import db from '@/lib/db/client';
import { queryRelevantContent } from '@/lib/rag/retrieval/semantic-search';
import {
  getProjectRAGConfig,
  isProjectRAGEnabled,
  getProjectUserChannelId,
  getProjectCompetitorChannels,
  getProjectNiche,
  retrieveRAGContext,
  getRAGContextStats
} from '@/lib/rag/retrieval/context-builder';

describe('Project RAG Config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProjectRAGConfig', () => {
    it('should return disabled when project not found', () => {
      const mockGet = vi.fn().mockReturnValue(undefined);
      vi.mocked(db.prepare).mockReturnValue({ get: mockGet } as never);

      const result = getProjectRAGConfig('nonexistent');

      expect(result.enabled).toBe(false);
      expect(result.config).toBeNull();
    });

    it('should return config when RAG is enabled', () => {
      const mockConfig = {
        mode: 'established',
        userChannelId: 'UC123',
        competitorChannels: ['UC456'],
        niche: 'military',
        newsEnabled: true,
        trendsEnabled: false,
        syncFrequency: 'daily'
      };

      const mockGet = vi.fn().mockReturnValue({
        id: 'proj1',
        rag_enabled: 1,
        rag_config: JSON.stringify(mockConfig),
        niche: 'military'
      });
      vi.mocked(db.prepare).mockReturnValue({ get: mockGet } as never);

      const result = getProjectRAGConfig('proj1');

      expect(result.enabled).toBe(true);
      expect(result.config).toEqual(mockConfig);
    });

    it('should handle invalid JSON gracefully', () => {
      const mockGet = vi.fn().mockReturnValue({
        id: 'proj1',
        rag_enabled: 1,
        rag_config: 'invalid-json',
        niche: 'military'
      });
      vi.mocked(db.prepare).mockReturnValue({ get: mockGet } as never);

      const result = getProjectRAGConfig('proj1');

      expect(result.enabled).toBe(true);
      expect(result.config).toBeNull();
    });

    it('should use project niche as fallback', () => {
      const mockConfig = {
        mode: 'cold_start',
        competitorChannels: [],
        newsEnabled: true,
        trendsEnabled: true,
        syncFrequency: 'daily'
        // niche not specified in config
      };

      const mockGet = vi.fn().mockReturnValue({
        id: 'proj1',
        rag_enabled: 1,
        rag_config: JSON.stringify(mockConfig),
        niche: 'technology'
      });
      vi.mocked(db.prepare).mockReturnValue({ get: mockGet } as never);

      const result = getProjectRAGConfig('proj1');

      expect(result.config?.niche).toBe('technology');
    });
  });

  describe('isProjectRAGEnabled', () => {
    it('should return true when RAG is enabled', () => {
      const mockGet = vi.fn().mockReturnValue({
        id: 'proj1',
        rag_enabled: 1,
        rag_config: '{}',
        niche: null
      });
      vi.mocked(db.prepare).mockReturnValue({ get: mockGet } as never);

      expect(isProjectRAGEnabled('proj1')).toBe(true);
    });

    it('should return false when RAG is disabled', () => {
      const mockGet = vi.fn().mockReturnValue({
        id: 'proj1',
        rag_enabled: 0,
        rag_config: null,
        niche: null
      });
      vi.mocked(db.prepare).mockReturnValue({ get: mockGet } as never);

      expect(isProjectRAGEnabled('proj1')).toBe(false);
    });
  });

  describe('getProjectUserChannelId', () => {
    it('should return user channel ID from config', () => {
      const mockGet = vi.fn().mockReturnValue({
        id: 'proj1',
        rag_enabled: 1,
        rag_config: JSON.stringify({ userChannelId: 'UC123', mode: 'established', competitorChannels: [], niche: 'test', newsEnabled: true, trendsEnabled: false, syncFrequency: 'daily' }),
        niche: null
      });
      vi.mocked(db.prepare).mockReturnValue({ get: mockGet } as never);

      expect(getProjectUserChannelId('proj1')).toBe('UC123');
    });

    it('should return null when no user channel', () => {
      const mockGet = vi.fn().mockReturnValue({
        id: 'proj1',
        rag_enabled: 1,
        rag_config: JSON.stringify({ mode: 'cold_start', competitorChannels: [], niche: 'test', newsEnabled: true, trendsEnabled: false, syncFrequency: 'daily' }),
        niche: null
      });
      vi.mocked(db.prepare).mockReturnValue({ get: mockGet } as never);

      expect(getProjectUserChannelId('proj1')).toBeNull();
    });
  });

  describe('getProjectCompetitorChannels', () => {
    it('should return competitor channels array', () => {
      const mockGet = vi.fn().mockReturnValue({
        id: 'proj1',
        rag_enabled: 1,
        rag_config: JSON.stringify({ competitorChannels: ['UC1', 'UC2'], mode: 'established', niche: 'test', newsEnabled: true, trendsEnabled: false, syncFrequency: 'daily' }),
        niche: null
      });
      vi.mocked(db.prepare).mockReturnValue({ get: mockGet } as never);

      expect(getProjectCompetitorChannels('proj1')).toEqual(['UC1', 'UC2']);
    });

    it('should return empty array when no competitors', () => {
      const mockGet = vi.fn().mockReturnValue({
        id: 'proj1',
        rag_enabled: 0,
        rag_config: null,
        niche: null
      });
      vi.mocked(db.prepare).mockReturnValue({ get: mockGet } as never);

      expect(getProjectCompetitorChannels('proj1')).toEqual([]);
    });
  });

  describe('getProjectNiche', () => {
    it('should return niche from config', () => {
      const mockGet = vi.fn().mockReturnValue({
        id: 'proj1',
        rag_enabled: 1,
        rag_config: JSON.stringify({ niche: 'military', mode: 'cold_start', competitorChannels: [], newsEnabled: true, trendsEnabled: false, syncFrequency: 'daily' }),
        niche: null
      });
      vi.mocked(db.prepare).mockReturnValue({ get: mockGet } as never);

      expect(getProjectNiche('proj1')).toBe('military');
    });
  });
});

describe('retrieveRAGContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(queryRelevantContent).mockResolvedValue([]);
  });

  it('should return empty context when RAG is disabled', async () => {
    const mockGet = vi.fn().mockReturnValue({
      id: 'proj1',
      rag_enabled: 0,
      rag_config: null,
      niche: null
    });
    vi.mocked(db.prepare).mockReturnValue({ get: mockGet } as never);

    const context = await retrieveRAGContext('proj1', 'test query');

    expect(context.channelContent).toEqual([]);
    expect(context.competitorContent).toEqual([]);
    expect(context.newsArticles).toEqual([]);
    expect(context.trendingTopics).toEqual([]);
    expect(queryRelevantContent).not.toHaveBeenCalled();
  });

  it('should query channel content for established mode', async () => {
    const mockConfig = {
      mode: 'established',
      userChannelId: 'UC123',
      competitorChannels: [],
      niche: 'military',
      newsEnabled: false,
      trendsEnabled: false,
      syncFrequency: 'daily'
    };

    const mockGet = vi.fn().mockReturnValue({
      id: 'proj1',
      rag_enabled: 1,
      rag_config: JSON.stringify(mockConfig),
      niche: 'military'
    });
    vi.mocked(db.prepare).mockReturnValue({ get: mockGet } as never);

    await retrieveRAGContext('proj1', 'test query');

    expect(queryRelevantContent).toHaveBeenCalledWith(
      'test query',
      'channel_content',
      expect.objectContaining({
        filters: { channelId: 'UC123' }
      })
    );
  });

  it('should query news articles when enabled', async () => {
    const mockConfig = {
      mode: 'cold_start',
      competitorChannels: [],
      niche: 'military',
      newsEnabled: true,
      trendsEnabled: false,
      syncFrequency: 'daily'
    };

    const mockGet = vi.fn().mockReturnValue({
      id: 'proj1',
      rag_enabled: 1,
      rag_config: JSON.stringify(mockConfig),
      niche: 'military'
    });
    vi.mocked(db.prepare).mockReturnValue({ get: mockGet } as never);

    await retrieveRAGContext('proj1', 'test query');

    expect(queryRelevantContent).toHaveBeenCalledWith(
      'test query',
      'news_articles',
      expect.objectContaining({
        filters: expect.objectContaining({
          niche: 'military',
          dateRange: expect.any(Object)
        })
      })
    );
  });

  it('should query trending topics when enabled', async () => {
    const mockConfig = {
      mode: 'cold_start',
      competitorChannels: [],
      niche: 'military',
      newsEnabled: false,
      trendsEnabled: true,
      syncFrequency: 'daily'
    };

    const mockGet = vi.fn().mockReturnValue({
      id: 'proj1',
      rag_enabled: 1,
      rag_config: JSON.stringify(mockConfig),
      niche: 'military'
    });
    vi.mocked(db.prepare).mockReturnValue({ get: mockGet } as never);

    await retrieveRAGContext('proj1', 'test query');

    expect(queryRelevantContent).toHaveBeenCalledWith(
      'test query',
      'trending_topics',
      expect.objectContaining({
        topK: 3,
        filters: { niche: 'military' }
      })
    );
  });

  it('should handle errors gracefully', async () => {
    const mockConfig = {
      mode: 'established',
      userChannelId: 'UC123',
      competitorChannels: [],
      niche: 'military',
      newsEnabled: true,
      trendsEnabled: true,
      syncFrequency: 'daily'
    };

    const mockGet = vi.fn().mockReturnValue({
      id: 'proj1',
      rag_enabled: 1,
      rag_config: JSON.stringify(mockConfig),
      niche: 'military'
    });
    vi.mocked(db.prepare).mockReturnValue({ get: mockGet } as never);

    // Make one query fail
    vi.mocked(queryRelevantContent).mockRejectedValue(new Error('Query failed'));

    const context = await retrieveRAGContext('proj1', 'test query');

    // Should return empty context on error
    expect(context.channelContent).toEqual([]);
  });
});

describe('getRAGContextStats', () => {
  it('should calculate correct statistics', () => {
    const context = {
      channelContent: [
        { id: '1', content: 'Content 1', metadata: {}, score: 0.9 },
        { id: '2', content: 'Content 2', metadata: {}, score: 0.8 }
      ],
      competitorContent: [
        { id: '3', content: 'Competitor', metadata: {}, score: 0.7 }
      ],
      newsArticles: [
        { id: '4', content: 'News 1', metadata: {}, score: 0.6 },
        { id: '5', content: 'News 2', metadata: {}, score: 0.5 }
      ],
      trendingTopics: []
    };

    const stats = getRAGContextStats(context);

    expect(stats.channelContentCount).toBe(2);
    expect(stats.competitorContentCount).toBe(1);
    expect(stats.newsArticlesCount).toBe(2);
    expect(stats.trendingTopicsCount).toBe(0);
    expect(stats.totalDocuments).toBe(5);
    expect(stats.estimatedTokens).toBeGreaterThan(0);
  });
});
