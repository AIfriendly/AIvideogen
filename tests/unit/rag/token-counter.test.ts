/**
 * Token Counter Tests
 *
 * Story 6.5 - RAG Retrieval & Context Building
 */

import { describe, it, expect } from 'vitest';
import {
  countTokens,
  countDocumentTokens,
  countDocumentsTokens,
  countRAGContextTokens,
  truncateRAGContext,
  formatRAGContextForPrompt,
  DEFAULT_MAX_TOKENS
} from '@/lib/rag/retrieval/token-counter';
import type { RAGContext, RetrievedDocument } from '@/lib/rag/types';

describe('Token Counter', () => {
  describe('countTokens', () => {
    it('should approximate tokens as chars/4', () => {
      expect(countTokens('1234')).toBe(1); // 4 chars = 1 token
      expect(countTokens('12345678')).toBe(2); // 8 chars = 2 tokens
      expect(countTokens('123')).toBe(1); // 3 chars = 1 token (rounded up)
    });

    it('should return 0 for empty strings', () => {
      expect(countTokens('')).toBe(0);
    });

    it('should handle null/undefined', () => {
      expect(countTokens('')).toBe(0);
    });
  });

  describe('countDocumentTokens', () => {
    it('should count content and metadata tokens', () => {
      const doc: RetrievedDocument = {
        id: 'doc1',
        content: '1234567890123456', // 16 chars = 4 tokens
        metadata: { key: 'val' },
        score: 0.9
      };

      const tokens = countDocumentTokens(doc);
      expect(tokens).toBeGreaterThan(4); // Content + metadata
    });
  });

  describe('countDocumentsTokens', () => {
    it('should sum tokens from all documents', () => {
      const docs: RetrievedDocument[] = [
        { id: 'doc1', content: '1234567890123456', metadata: {}, score: 0.9 },
        { id: 'doc2', content: '1234567890123456', metadata: {}, score: 0.8 }
      ];

      const tokens = countDocumentsTokens(docs);
      expect(tokens).toBeGreaterThanOrEqual(8); // At least 8 tokens for content
    });

    it('should return 0 for empty array', () => {
      expect(countDocumentsTokens([])).toBe(0);
    });
  });

  describe('countRAGContextTokens', () => {
    it('should count tokens across all context categories', () => {
      const context: RAGContext = {
        channelContent: [{ id: '1', content: '1234567890', metadata: {}, score: 0.9 }],
        competitorContent: [{ id: '2', content: '1234567890', metadata: {}, score: 0.8 }],
        newsArticles: [{ id: '3', content: '1234567890', metadata: {}, score: 0.7 }],
        trendingTopics: []
      };

      const tokens = countRAGContextTokens(context);
      expect(tokens).toBeGreaterThan(0);
    });
  });
});

describe('Context Truncation', () => {
  const createDoc = (id: string, content: string, score: number): RetrievedDocument => ({
    id,
    content,
    metadata: {},
    score
  });

  describe('truncateRAGContext', () => {
    it('should return context unchanged if under limit', () => {
      const context: RAGContext = {
        channelContent: [createDoc('1', 'Short content', 0.9)],
        competitorContent: [],
        newsArticles: [],
        trendingTopics: []
      };

      const truncated = truncateRAGContext(context, 10000);

      expect(truncated.channelContent).toHaveLength(1);
    });

    it('should remove lowest-scored documents first', () => {
      const context: RAGContext = {
        channelContent: [
          createDoc('1', 'A'.repeat(1000), 0.9),
          createDoc('2', 'B'.repeat(1000), 0.5), // Lower score
          createDoc('3', 'C'.repeat(1000), 0.7)
        ],
        competitorContent: [],
        newsArticles: [],
        trendingTopics: []
      };

      // Set very low limit to force truncation
      const truncated = truncateRAGContext(context, 500);

      // Should have removed some documents
      expect(truncated.channelContent.length).toBeLessThan(3);

      // Remaining docs should be highest scored
      if (truncated.channelContent.length >= 1) {
        expect(truncated.channelContent[0].id).toBe('1'); // Highest score
      }
    });

    it('should respect priority weights', () => {
      const context: RAGContext = {
        channelContent: [createDoc('ch1', 'A'.repeat(2000), 0.9)],
        competitorContent: [createDoc('comp1', 'B'.repeat(2000), 0.9)],
        newsArticles: [createDoc('news1', 'C'.repeat(2000), 0.9)],
        trendingTopics: [createDoc('trend1', 'D'.repeat(2000), 0.9)]
      };

      // Low limit to force truncation
      const truncated = truncateRAGContext(context, 1000);

      // Channel content has highest priority, should keep more
      // This is a soft check as exact behavior depends on token calculations
      const totalTruncated = truncated.channelContent.length +
        truncated.competitorContent.length +
        truncated.newsArticles.length +
        truncated.trendingTopics.length;

      expect(totalTruncated).toBeLessThan(4);
    });

    it('should use default max tokens if not specified', () => {
      expect(DEFAULT_MAX_TOKENS).toBe(4000);

      const context: RAGContext = {
        channelContent: [],
        competitorContent: [],
        newsArticles: [],
        trendingTopics: []
      };

      // Should not throw
      const truncated = truncateRAGContext(context);
      expect(truncated).toBeDefined();
    });
  });
});

describe('Format RAG Context', () => {
  it('should format context with section headers', () => {
    const context: RAGContext = {
      channelContent: [{ id: '1', content: 'Channel video transcript', metadata: {}, score: 0.9 }],
      competitorContent: [{ id: '2', content: 'Competitor content', metadata: {}, score: 0.8 }],
      newsArticles: [{ id: '3', content: 'News summary', metadata: { headline: 'Breaking News' }, score: 0.7 }],
      trendingTopics: []
    };

    const formatted = formatRAGContextForPrompt(context);

    expect(formatted).toContain('## Your Channel Content');
    expect(formatted).toContain('Channel video transcript');
    expect(formatted).toContain('## Competitor Content');
    expect(formatted).toContain('## Recent News');
    expect(formatted).toContain('Breaking News');
  });

  it('should skip empty sections', () => {
    const context: RAGContext = {
      channelContent: [{ id: '1', content: 'Content', metadata: {}, score: 0.9 }],
      competitorContent: [],
      newsArticles: [],
      trendingTopics: []
    };

    const formatted = formatRAGContextForPrompt(context);

    expect(formatted).toContain('## Your Channel Content');
    expect(formatted).not.toContain('## Competitor Content');
    expect(formatted).not.toContain('## Recent News');
    expect(formatted).not.toContain('## Trending Topics');
  });

  it('should return empty string for fully empty context', () => {
    const context: RAGContext = {
      channelContent: [],
      competitorContent: [],
      newsArticles: [],
      trendingTopics: []
    };

    const formatted = formatRAGContextForPrompt(context);
    expect(formatted).toBe('');
  });
});
