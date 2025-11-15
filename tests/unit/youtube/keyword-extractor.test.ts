/**
 * Unit Tests for Keyword Extraction Fallback
 *
 * Tests the keyword extraction and fallback analysis functionality used when
 * LLM provider is unavailable.
 */

import { describe, it, expect } from 'vitest';
import {
  extractKeywords,
  createFallbackAnalysis
} from '../../../src/lib/youtube/keyword-extractor';
import { ContentType } from '../../../src/lib/youtube/types';

describe('extractKeywords', () => {
  it('should extract keywords from simple scene text', () => {
    const sceneText = 'A majestic lion roams the savanna at sunset';
    const keywords = extractKeywords(sceneText);

    expect(keywords).toContain('majestic');
    expect(keywords).toContain('lion');
    expect(keywords).toContain('roams');
    expect(keywords).toContain('savanna');
    expect(keywords).toContain('sunset');
    expect(keywords.length).toBeLessThanOrEqual(5);
  });

  it('should remove stop words', () => {
    const sceneText = 'The quick brown fox jumps over the lazy dog with them';
    const keywords = extractKeywords(sceneText);

    // Stop words should be filtered out
    expect(keywords).not.toContain('the');
    expect(keywords).not.toContain('with');
    expect(keywords).not.toContain('them');

    // Content words should remain
    expect(keywords).toContain('quick');
    expect(keywords).toContain('brown');
  });

  it('should filter words shorter than 4 characters', () => {
    const sceneText = 'A big cat sat on a mat and ate';
    const keywords = extractKeywords(sceneText);

    // Short words should be filtered
    expect(keywords).not.toContain('big');
    expect(keywords).not.toContain('cat');
    expect(keywords).not.toContain('sat');
    expect(keywords).not.toContain('mat');
    expect(keywords).not.toContain('ate');
  });

  it('should sort keywords by frequency', () => {
    const sceneText = 'amazing amazing amazing wonderful wonderful spectacular';
    const keywords = extractKeywords(sceneText);

    // 'amazing' appears 3 times, should be first
    expect(keywords[0]).toBe('amazing');
    // 'wonderful' appears 2 times, should be second
    expect(keywords[1]).toBe('wonderful');
    // 'spectacular' appears 1 time, should be third
    expect(keywords[2]).toBe('spectacular');
  });

  it('should return at most 5 keywords', () => {
    const sceneText =
      'first second third fourth fifth sixth seventh eighth ninth tenth';
    const keywords = extractKeywords(sceneText);

    expect(keywords.length).toBe(5);
  });

  it('should handle empty text gracefully', () => {
    const keywords = extractKeywords('');
    expect(keywords).toEqual([]);
  });

  it('should handle text with only stop words', () => {
    const sceneText = 'the a an and or but in on at';
    const keywords = extractKeywords(sceneText);

    expect(keywords).toEqual([]);
  });

  it('should handle text with punctuation', () => {
    const sceneText = 'Hello, world! How are you doing today?';
    const keywords = extractKeywords(sceneText);

    expect(keywords).toContain('hello');
    expect(keywords).toContain('world');
    expect(keywords).toContain('doing');
    expect(keywords).toContain('today');
  });

  it('should be case-insensitive', () => {
    const sceneText = 'AMAZING Amazing amazing';
    const keywords = extractKeywords(sceneText);

    // All variants should be counted as same word
    expect(keywords[0]).toBe('amazing');
    expect(keywords.length).toBe(1);
  });
});

describe('createFallbackAnalysis', () => {
  it('should create valid SceneAnalysis structure', () => {
    const sceneText = 'A majestic lion roams the savanna at sunset';
    const analysis = createFallbackAnalysis(sceneText);

    expect(analysis).toHaveProperty('mainSubject');
    expect(analysis).toHaveProperty('setting');
    expect(analysis).toHaveProperty('mood');
    expect(analysis).toHaveProperty('action');
    expect(analysis).toHaveProperty('keywords');
    expect(analysis).toHaveProperty('primaryQuery');
    expect(analysis).toHaveProperty('alternativeQueries');
    expect(analysis).toHaveProperty('contentType');
  });

  it('should populate mainSubject with first keyword', () => {
    const sceneText = 'A majestic lion roams the savanna at sunset';
    const analysis = createFallbackAnalysis(sceneText);

    expect(analysis.mainSubject).toBeTruthy();
    expect(typeof analysis.mainSubject).toBe('string');
  });

  it('should populate setting with second keyword if available', () => {
    const sceneText = 'A majestic lion roams the savanna at sunset';
    const analysis = createFallbackAnalysis(sceneText);

    expect(analysis.setting).toBeTruthy();
    expect(typeof analysis.setting).toBe('string');
  });

  it('should leave mood and action empty', () => {
    const sceneText = 'A majestic lion roams the savanna at sunset';
    const analysis = createFallbackAnalysis(sceneText);

    expect(analysis.mood).toBe('');
    expect(analysis.action).toBe('');
  });

  it('should include keywords array', () => {
    const sceneText = 'A majestic lion roams the savanna at sunset';
    const analysis = createFallbackAnalysis(sceneText);

    expect(Array.isArray(analysis.keywords)).toBe(true);
    expect(analysis.keywords.length).toBeGreaterThan(0);
  });

  it('should construct primaryQuery from top 4 keywords', () => {
    const sceneText = 'A majestic lion roams the savanna at sunset';
    const analysis = createFallbackAnalysis(sceneText);

    expect(analysis.primaryQuery).toBeTruthy();
    expect(typeof analysis.primaryQuery).toBe('string');

    // Query should have spaces between keywords
    expect(analysis.primaryQuery).toContain(' ');

    // Should have at most 4 keywords (may be less if text is short)
    const queryWords = analysis.primaryQuery.split(' ');
    expect(queryWords.length).toBeLessThanOrEqual(4);
  });

  it('should have empty alternativeQueries array', () => {
    const sceneText = 'A majestic lion roams the savanna at sunset';
    const analysis = createFallbackAnalysis(sceneText);

    expect(Array.isArray(analysis.alternativeQueries)).toBe(true);
    expect(analysis.alternativeQueries.length).toBe(0);
  });

  it('should default contentType to B_ROLL', () => {
    const sceneText = 'A majestic lion roams the savanna at sunset';
    const analysis = createFallbackAnalysis(sceneText);

    expect(analysis.contentType).toBe(ContentType.B_ROLL);
  });

  it('should handle short text (< 10 words)', () => {
    const sceneText = 'Amazing sunset view';
    const analysis = createFallbackAnalysis(sceneText);

    expect(analysis.mainSubject).toBeTruthy();
    expect(analysis.primaryQuery).toBeTruthy();
    expect(analysis.contentType).toBe(ContentType.B_ROLL);
  });

  it('should handle long text (> 200 words)', () => {
    const longText = Array(250).fill('amazing beautiful wonderful').join(' ');
    const analysis = createFallbackAnalysis(longText);

    expect(analysis.mainSubject).toBeTruthy();
    expect(analysis.keywords.length).toBeLessThanOrEqual(5);
    expect(analysis.primaryQuery).toBeTruthy();
  });

  it('should handle text with only stop words gracefully', () => {
    const sceneText = 'the a an and or but in on at to for';
    const analysis = createFallbackAnalysis(sceneText);

    // Should still return valid structure, even with empty fields
    expect(analysis.mainSubject).toBe('');
    expect(analysis.setting).toBe('');
    expect(analysis.primaryQuery).toBe('');
    expect(analysis.keywords).toEqual([]);
    expect(analysis.contentType).toBe(ContentType.B_ROLL);
  });
});
