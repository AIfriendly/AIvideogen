/**
 * RAG Script Generator Tests
 *
 * Unit tests for the RAG prompt building and context formatting functions.
 * Story 6.6 - RAG-Augmented Script Generation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildRAGPrompt,
  formatChannelContent,
  formatCompetitorContent,
  formatNewsContent,
  formatTrendingTopics,
  getRAGContextUsage,
  getRAGContextMessage,
} from '@/lib/rag/generation/rag-script-generator';
import type { RAGContext, RetrievedDocument } from '@/lib/rag/types';

// Helper to create mock documents
function createMockDocument(overrides: Partial<RetrievedDocument> = {}): RetrievedDocument {
  return {
    id: 'doc-1',
    content: 'This is sample content about the topic at hand.',
    metadata: {
      title: 'Sample Video Title',
      published_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago
      channel_name: 'Sample Channel',
    },
    score: 0.85,
    ...overrides,
  };
}

// Helper to create mock RAG context
function createMockRAGContext(overrides: Partial<RAGContext> = {}): RAGContext {
  return {
    channelContent: [],
    competitorContent: [],
    newsArticles: [],
    trendingTopics: [],
    ...overrides,
  };
}

describe('RAG Script Generator', () => {
  describe('formatChannelContent', () => {
    it('should format channel content with title and date', () => {
      const docs = [
        createMockDocument({
          content: 'This video explains how modern tanks work.',
          metadata: {
            title: 'Why Modern Tanks Are Obsolete',
            published_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          },
        }),
      ];

      const result = formatChannelContent(docs);

      expect(result).toContain('Why Modern Tanks Are Obsolete');
      expect(result).toContain('2 weeks ago');
      expect(result).toContain('modern tanks');
    });

    it('should return empty string for empty array', () => {
      expect(formatChannelContent([])).toBe('');
    });

    it('should truncate long content to 500 chars', () => {
      const longContent = 'A'.repeat(1000);
      const docs = [createMockDocument({ content: longContent })];

      const result = formatChannelContent(docs);

      expect(result.length).toBeLessThan(longContent.length);
      expect(result).toContain('...');
    });
  });

  describe('formatCompetitorContent', () => {
    it('should format competitor content with channel name', () => {
      const docs = [
        createMockDocument({
          content: 'Competitor analysis of drone warfare.',
          metadata: {
            title: 'Drone Warfare Analysis',
            channel_name: 'Military Watch',
            published_at: new Date().toISOString(),
          },
        }),
      ];

      const result = formatCompetitorContent(docs);

      expect(result).toContain('[Military Watch]');
      expect(result).toContain('Drone Warfare Analysis');
      expect(result).toContain('Approach:');
    });

    it('should handle missing channel name', () => {
      const docs = [createMockDocument({ metadata: { title: 'Test' } })];

      const result = formatCompetitorContent(docs);

      expect(result).toContain('[Unknown Channel]');
    });
  });

  describe('formatNewsContent', () => {
    it('should format news with headline and source', () => {
      const docs = [
        createMockDocument({
          metadata: {
            headline: 'Pentagon Announces New Program',
            source_name: 'Defense News',
            summary: 'The Pentagon announced a new drone initiative today.',
            published_at: '2025-11-28T12:00:00Z',
          },
        }),
      ];

      const result = formatNewsContent(docs);

      expect(result).toContain('Pentagon Announces New Program');
      expect(result).toContain('Defense News');
      expect(result).toContain('Nov 28, 2025');
      expect(result).toContain('drone initiative');
    });

    it('should use content for headline if metadata missing', () => {
      const docs = [
        createMockDocument({
          content: 'Breaking news about military operations',
          metadata: {},
        }),
      ];

      const result = formatNewsContent(docs);

      expect(result).toContain('Breaking news');
    });
  });

  describe('formatTrendingTopics', () => {
    it('should format trending topics as bullet list', () => {
      const docs = [
        createMockDocument({
          metadata: { topic: 'AI in Warfare' },
        }),
        createMockDocument({
          metadata: { topic: 'Hypersonic Missiles' },
        }),
      ];

      const result = formatTrendingTopics(docs);

      expect(result).toContain('- AI in Warfare');
      expect(result).toContain('- Hypersonic Missiles');
    });

    it('should include trend score if available', () => {
      const docs = [
        createMockDocument({
          metadata: { topic: 'AI in Warfare', trend_score: 95 },
        }),
      ];

      const result = formatTrendingTopics(docs);

      expect(result).toContain('(trending: 95)');
    });
  });

  describe('buildRAGPrompt', () => {
    it('should return empty message for empty context', () => {
      const context = createMockRAGContext();

      const result = buildRAGPrompt(context);

      expect(result).toContain('No additional context is available');
    });

    it('should include channel section when channel content exists', () => {
      const context = createMockRAGContext({
        channelContent: [createMockDocument()],
      });

      const result = buildRAGPrompt(context, 'established');

      expect(result).toContain('YOUR CHANNEL STYLE EXAMPLES');
      expect(result).toContain('CONTEXT FROM YOUR CONTENT LIBRARY');
    });

    it('should include competitor section when competitor content exists', () => {
      const context = createMockRAGContext({
        competitorContent: [createMockDocument()],
      });

      const result = buildRAGPrompt(context);

      expect(result).toContain('COMPETITOR APPROACHES');
    });

    it('should include news section with integration instruction', () => {
      const context = createMockRAGContext({
        newsArticles: [createMockDocument()],
      });

      const result = buildRAGPrompt(context);

      expect(result).toContain('CURRENT NEWS & TRENDS');
      expect(result).toContain('NEWS INTEGRATION');
    });

    it('should include established channel instruction for established mode', () => {
      const context = createMockRAGContext({
        channelContent: [createMockDocument()],
      });

      const result = buildRAGPrompt(context, 'established');

      expect(result).toContain('established channel');
      expect(result).toContain('Match the style');
    });

    it('should include cold start instruction for cold_start mode', () => {
      const context = createMockRAGContext({
        competitorContent: [createMockDocument()],
      });

      const result = buildRAGPrompt(context, 'cold_start');

      expect(result).toContain('just starting out');
      expect(result).toContain('differentiate');
    });

    it('should include header and footer', () => {
      const context = createMockRAGContext({
        newsArticles: [createMockDocument()],
      });

      const result = buildRAGPrompt(context);

      expect(result).toContain('=== CONTEXT FROM YOUR CONTENT LIBRARY ===');
      expect(result).toContain('=== END CONTEXT ===');
    });
  });

  describe('getRAGContextUsage', () => {
    it('should calculate correct totals', () => {
      const context = createMockRAGContext({
        channelContent: [createMockDocument(), createMockDocument()],
        competitorContent: [createMockDocument()],
        newsArticles: [createMockDocument(), createMockDocument(), createMockDocument()],
        trendingTopics: [],
      });

      const usage = getRAGContextUsage(context, 250);

      expect(usage.channelVideos).toBe(2);
      expect(usage.competitorVideos).toBe(1);
      expect(usage.newsArticles).toBe(3);
      expect(usage.trendingTopics).toBe(0);
      expect(usage.totalDocuments).toBe(6);
      expect(usage.retrievalTimeMs).toBe(250);
    });
  });

  describe('getRAGContextMessage', () => {
    it('should return "No additional context" for empty usage', () => {
      const usage = {
        channelVideos: 0,
        competitorVideos: 0,
        newsArticles: 0,
        trendingTopics: 0,
        totalDocuments: 0,
        retrievalTimeMs: 100,
      };

      expect(getRAGContextMessage(usage)).toBe('No additional context available');
    });

    it('should format message with videos', () => {
      const usage = {
        channelVideos: 3,
        competitorVideos: 2,
        newsArticles: 0,
        trendingTopics: 0,
        totalDocuments: 5,
        retrievalTimeMs: 100,
      };

      const message = getRAGContextMessage(usage);

      expect(message).toContain('5 videos');
    });

    it('should format message with all types', () => {
      const usage = {
        channelVideos: 2,
        competitorVideos: 1,
        newsArticles: 4,
        trendingTopics: 2,
        totalDocuments: 9,
        retrievalTimeMs: 100,
      };

      const message = getRAGContextMessage(usage);

      expect(message).toContain('3 videos');
      expect(message).toContain('4 news articles');
      expect(message).toContain('2 trending topics');
    });

    it('should use singular form for single items', () => {
      const usage = {
        channelVideos: 1,
        competitorVideos: 0,
        newsArticles: 1,
        trendingTopics: 1,
        totalDocuments: 3,
        retrievalTimeMs: 100,
      };

      const message = getRAGContextMessage(usage);

      expect(message).toContain('1 video');
      expect(message).toContain('1 news article');
      expect(message).toContain('1 trending topic');
    });
  });
});
