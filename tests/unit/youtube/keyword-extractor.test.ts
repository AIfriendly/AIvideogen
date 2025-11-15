/**
 * Unit Tests for Keyword Extraction Fallback - Story 3.2
 *
 * Tests the keyword extraction and fallback analysis functionality used when
 * LLM provider is unavailable.
 *
 * Test IDs: 3.2-UNIT-019 through 3.2-UNIT-038
 * Priority Distribution: P1 (8 tests), P2 (10 tests), P3 (2 tests)
 */

import { describe, it, expect } from 'vitest';
import {
  extractKeywords,
  createFallbackAnalysis
} from '../../../src/lib/youtube/keyword-extractor';
import { ContentType } from '../../../src/lib/youtube/types';

describe('extractKeywords - Story 3.2', () => {
  describe('[P1] AC8: Keyword Extraction Core Functionality', () => {
    it('[3.2-UNIT-019] [P1] should extract keywords from simple scene text', () => {
      // GIVEN: A simple scene description with clear keywords
      const sceneText = 'A majestic lion roams the savanna at sunset';

      // WHEN: We extract keywords
      const keywords = extractKeywords(sceneText);

      // THEN: Should extract relevant keywords excluding stop words
      expect(keywords).toContain('majestic');
      expect(keywords).toContain('lion');
      expect(keywords).toContain('roams');
      expect(keywords).toContain('savanna');
      expect(keywords).toContain('sunset');
      expect(keywords.length).toBeLessThanOrEqual(5);
    });

    it('[3.2-UNIT-020] [P1] should remove stop words', () => {
      // GIVEN: Scene text with common stop words
      const sceneText = 'The quick brown fox jumps over the lazy dog with them';

      // WHEN: We extract keywords
      const keywords = extractKeywords(sceneText);

      // THEN: Should filter out stop words but keep content words
      expect(keywords).not.toContain('the');
      expect(keywords).not.toContain('with');
      expect(keywords).not.toContain('them');
      expect(keywords).toContain('quick');
      expect(keywords).toContain('brown');
    });

    it('[3.2-UNIT-021] [P2] should filter words shorter than 4 characters', () => {
      // GIVEN: Scene text with short words
      const sceneText = 'A big cat sat on a mat and ate';

      // WHEN: We extract keywords
      const keywords = extractKeywords(sceneText);

      // THEN: Should filter out words shorter than 4 characters
      expect(keywords).not.toContain('big');
      expect(keywords).not.toContain('cat');
      expect(keywords).not.toContain('sat');
      expect(keywords).not.toContain('mat');
      expect(keywords).not.toContain('ate');
    });

    it('[3.2-UNIT-022] [P1] should sort keywords by frequency', () => {
      // GIVEN: Scene text with repeated words
      const sceneText = 'amazing amazing amazing wonderful wonderful spectacular';

      // WHEN: We extract keywords
      const keywords = extractKeywords(sceneText);

      // THEN: Should sort by frequency (most frequent first)
      expect(keywords[0]).toBe('amazing'); // 3 occurrences
      expect(keywords[1]).toBe('wonderful'); // 2 occurrences
      expect(keywords[2]).toBe('spectacular'); // 1 occurrence
    });

    it('[3.2-UNIT-023] [P2] should return at most 5 keywords', () => {
      // GIVEN: Scene text with many words
      const sceneText =
        'first second third fourth fifth sixth seventh eighth ninth tenth';

      // WHEN: We extract keywords
      const keywords = extractKeywords(sceneText);

      // THEN: Should limit to maximum 5 keywords
      expect(keywords.length).toBe(5);
    });
  });

  describe('[P2] AC8: Edge Cases', () => {
    it('[3.2-UNIT-024] [P2] should handle empty text gracefully', () => {
      // GIVEN: Empty scene text
      const sceneText = '';

      // WHEN: We extract keywords
      const keywords = extractKeywords(sceneText);

      // THEN: Should return empty array
      expect(keywords).toEqual([]);
    });

    it('[3.2-UNIT-025] [P2] should handle text with only stop words', () => {
      // GIVEN: Scene text containing only stop words
      const sceneText = 'the a an and or but in on at';

      // WHEN: We extract keywords
      const keywords = extractKeywords(sceneText);

      // THEN: Should return empty array
      expect(keywords).toEqual([]);
    });

    it('[3.2-UNIT-026] [P2] should handle text with punctuation', () => {
      // GIVEN: Scene text with punctuation marks
      const sceneText = 'Hello, world! How are you doing today?';

      // WHEN: We extract keywords
      const keywords = extractKeywords(sceneText);

      // THEN: Should strip punctuation and extract clean keywords
      expect(keywords).toContain('hello');
      expect(keywords).toContain('world');
      expect(keywords).toContain('doing');
      expect(keywords).toContain('today');
    });

    it('[3.2-UNIT-027] [P3] should be case-insensitive', () => {
      // GIVEN: Scene text with mixed case
      const sceneText = 'AMAZING Amazing amazing';

      // WHEN: We extract keywords
      const keywords = extractKeywords(sceneText);

      // THEN: Should treat all case variants as same word
      expect(keywords[0]).toBe('amazing');
      expect(keywords.length).toBe(1);
    });
  });
});

describe('createFallbackAnalysis - Story 3.2', () => {
  describe('[P1] AC8: Fallback Analysis Structure', () => {
    it('[3.2-UNIT-028] [P1] should create valid SceneAnalysis structure', () => {
      // GIVEN: A scene text to analyze
      const sceneText = 'A majestic lion roams the savanna at sunset';

      // WHEN: We create fallback analysis
      const analysis = createFallbackAnalysis(sceneText);

      // THEN: Should return object with all required SceneAnalysis fields
      expect(analysis).toHaveProperty('mainSubject');
      expect(analysis).toHaveProperty('setting');
      expect(analysis).toHaveProperty('mood');
      expect(analysis).toHaveProperty('action');
      expect(analysis).toHaveProperty('keywords');
      expect(analysis).toHaveProperty('primaryQuery');
      expect(analysis).toHaveProperty('alternativeQueries');
      expect(analysis).toHaveProperty('contentType');
    });

    it('[3.2-UNIT-029] [P1] should populate mainSubject with first keyword', () => {
      // GIVEN: A scene text to analyze
      const sceneText = 'A majestic lion roams the savanna at sunset';

      // WHEN: We create fallback analysis
      const analysis = createFallbackAnalysis(sceneText);

      // THEN: Should use first (most frequent) keyword as mainSubject
      expect(analysis.mainSubject).toBeTruthy();
      expect(typeof analysis.mainSubject).toBe('string');
    });

    it('[3.2-UNIT-030] [P2] should populate setting with second keyword if available', () => {
      // GIVEN: A scene text with multiple keywords
      const sceneText = 'A majestic lion roams the savanna at sunset';

      // WHEN: We create fallback analysis
      const analysis = createFallbackAnalysis(sceneText);

      // THEN: Should use second keyword as setting
      expect(analysis.setting).toBeTruthy();
      expect(typeof analysis.setting).toBe('string');
    });

    it('[3.2-UNIT-031] [P2] should leave mood and action empty', () => {
      // GIVEN: A scene text to analyze
      const sceneText = 'A majestic lion roams the savanna at sunset';

      // WHEN: We create fallback analysis
      const analysis = createFallbackAnalysis(sceneText);

      // THEN: Should leave mood and action as empty strings
      expect(analysis.mood).toBe('');
      expect(analysis.action).toBe('');
    });

    it('[3.2-UNIT-032] [P1] should include keywords array', () => {
      // GIVEN: A scene text to analyze
      const sceneText = 'A majestic lion roams the savanna at sunset';

      // WHEN: We create fallback analysis
      const analysis = createFallbackAnalysis(sceneText);

      // THEN: Should include extracted keywords array
      expect(Array.isArray(analysis.keywords)).toBe(true);
      expect(analysis.keywords.length).toBeGreaterThan(0);
    });
  });

  describe('[P1] AC8: Fallback Query Generation', () => {
    it('[3.2-UNIT-033] [P1] should construct primaryQuery from top 4 keywords', () => {
      // GIVEN: A scene text to analyze
      const sceneText = 'A majestic lion roams the savanna at sunset';

      // WHEN: We create fallback analysis
      const analysis = createFallbackAnalysis(sceneText);

      // THEN: Should build query from top keywords
      expect(analysis.primaryQuery).toBeTruthy();
      expect(typeof analysis.primaryQuery).toBe('string');
      expect(analysis.primaryQuery).toContain(' '); // Should have spaces

      const queryWords = analysis.primaryQuery.split(' ');
      expect(queryWords.length).toBeLessThanOrEqual(4);
    });

    it('[3.2-UNIT-034] [P2] should have empty alternativeQueries array', () => {
      // GIVEN: A scene text to analyze
      const sceneText = 'A majestic lion roams the savanna at sunset';

      // WHEN: We create fallback analysis
      const analysis = createFallbackAnalysis(sceneText);

      // THEN: Should return empty array for alternative queries
      expect(Array.isArray(analysis.alternativeQueries)).toBe(true);
      expect(analysis.alternativeQueries.length).toBe(0);
    });

    it('[3.2-UNIT-035] [P2] should default contentType to B_ROLL', () => {
      // GIVEN: A scene text to analyze
      const sceneText = 'A majestic lion roams the savanna at sunset';

      // WHEN: We create fallback analysis
      const analysis = createFallbackAnalysis(sceneText);

      // THEN: Should default to B_ROLL content type
      expect(analysis.contentType).toBe(ContentType.B_ROLL);
    });
  });

  describe('[P2] AC8: Fallback Edge Cases', () => {
    it('[3.2-UNIT-036] [P2] should handle short text (< 10 words)', () => {
      // GIVEN: Very short scene text
      const sceneText = 'Amazing sunset view';

      // WHEN: We create fallback analysis
      const analysis = createFallbackAnalysis(sceneText);

      // THEN: Should still create valid structure with available data
      expect(analysis.mainSubject).toBeTruthy();
      expect(analysis.primaryQuery).toBeTruthy();
      expect(analysis.contentType).toBe(ContentType.B_ROLL);
    });

    it('[3.2-UNIT-037] [P3] should handle long text (> 200 words)', () => {
      // GIVEN: Very long scene text
      const longText = Array(250).fill('amazing beautiful wonderful').join(' ');

      // WHEN: We create fallback analysis
      const analysis = createFallbackAnalysis(longText);

      // THEN: Should still limit keywords and create valid query
      expect(analysis.mainSubject).toBeTruthy();
      expect(analysis.keywords.length).toBeLessThanOrEqual(5);
      expect(analysis.primaryQuery).toBeTruthy();
    });

    it('[3.2-UNIT-038] [P2] should handle text with only stop words gracefully', () => {
      // GIVEN: Scene text with only stop words
      const sceneText = 'the a an and or but in on at to for';

      // WHEN: We create fallback analysis
      const analysis = createFallbackAnalysis(sceneText);

      // THEN: Should return valid structure with empty fields
      expect(analysis.mainSubject).toBe('');
      expect(analysis.setting).toBe('');
      expect(analysis.primaryQuery).toBe('');
      expect(analysis.keywords).toEqual([]);
      expect(analysis.contentType).toBe(ContentType.B_ROLL);
    });
  });
});
