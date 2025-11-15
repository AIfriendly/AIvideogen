/**
 * Unit Tests for Scene Analyzer
 *
 * Tests the analyzeSceneForVisuals function with mocked LLM provider to verify
 * error handling, retry logic, and fallback behavior.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { analyzeSceneForVisuals } from '../../../src/lib/youtube/analyze-scene';
import { ContentType } from '../../../src/lib/youtube/types';
import type { LLMProvider } from '../../../src/lib/llm/provider';

// Mock the LLM factory
vi.mock('../../../src/lib/llm/factory', () => ({
  createLLMProvider: vi.fn()
}));

import { createLLMProvider } from '../../../src/lib/llm/factory';

describe('analyzeSceneForVisuals', () => {
  let mockLLM: Partial<LLMProvider>;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Create mock LLM provider
    mockLLM = {
      chat: vi.fn()
    };

    (createLLMProvider as any).mockReturnValue(mockLLM);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Input Validation', () => {
    it('should throw error for empty string', async () => {
      await expect(analyzeSceneForVisuals('')).rejects.toThrow(
        'Scene text cannot be empty'
      );
    });

    it('should throw error for whitespace-only string', async () => {
      await expect(analyzeSceneForVisuals('   \n  \t  ')).rejects.toThrow(
        'Scene text cannot be empty'
      );
    });

    it('should accept valid scene text', async () => {
      const validResponse = JSON.stringify({
        mainSubject: 'lion',
        setting: 'savanna',
        mood: 'sunset',
        action: 'roaming',
        keywords: ['wildlife', 'grassland'],
        primaryQuery: 'lion savanna sunset',
        alternativeQueries: ['african lion sunset'],
        contentType: 'nature'
      });

      mockLLM.chat = vi.fn().mockResolvedValue(validResponse);

      const result = await analyzeSceneForVisuals('A lion roams the savanna');
      expect(result).toBeDefined();
    });
  });

  describe('LLM Success Cases', () => {
    it('should return valid SceneAnalysis when LLM succeeds', async () => {
      const validResponse = JSON.stringify({
        mainSubject: 'lion',
        setting: 'savanna',
        mood: 'sunset',
        action: 'roaming',
        keywords: ['wildlife', 'grassland', 'golden hour'],
        primaryQuery: 'lion savanna sunset wildlife',
        alternativeQueries: ['african lion sunset', 'lion walking grassland'],
        contentType: 'nature'
      });

      mockLLM.chat = vi.fn().mockResolvedValue(validResponse);

      const result = await analyzeSceneForVisuals(
        'A majestic lion roams the savanna at sunset'
      );

      expect(result.mainSubject).toBe('lion');
      expect(result.setting).toBe('savanna');
      expect(result.mood).toBe('sunset');
      expect(result.action).toBe('roaming');
      expect(result.keywords).toContain('wildlife');
      expect(result.primaryQuery).toBe('lion savanna sunset wildlife');
      expect(result.alternativeQueries).toHaveLength(2);
      expect(result.contentType).toBe(ContentType.NATURE);
    });

    it('should normalize missing optional fields', async () => {
      const partialResponse = JSON.stringify({
        mainSubject: 'lion',
        primaryQuery: 'lion savanna'
        // Missing: setting, mood, action, keywords, alternativeQueries, contentType
      });

      mockLLM.chat = vi.fn().mockResolvedValue(partialResponse);

      const result = await analyzeSceneForVisuals('A lion roams');

      expect(result.mainSubject).toBe('lion');
      expect(result.setting).toBe('');
      expect(result.mood).toBe('');
      expect(result.action).toBe('');
      expect(result.keywords).toEqual([]);
      expect(result.alternativeQueries).toEqual([]);
      expect(result.contentType).toBe(ContentType.B_ROLL); // Default
    });

    it('should handle invalid contentType gracefully', async () => {
      const invalidContentTypeResponse = JSON.stringify({
        mainSubject: 'lion',
        setting: 'savanna',
        primaryQuery: 'lion savanna',
        contentType: 'invalid-type' // Not a valid ContentType
      });

      mockLLM.chat = vi.fn().mockResolvedValue(invalidContentTypeResponse);

      const result = await analyzeSceneForVisuals('A lion');

      expect(result.contentType).toBe(ContentType.B_ROLL); // Should default
    });
  });

  describe('Error Handling - Invalid JSON', () => {
    it('should use fallback for invalid JSON response', async () => {
      mockLLM.chat = vi.fn().mockResolvedValue('This is not JSON');

      const result = await analyzeSceneForVisuals(
        'A majestic lion roams the savanna'
      );

      // Fallback should still return valid SceneAnalysis
      expect(result).toBeDefined();
      expect(result.contentType).toBe(ContentType.B_ROLL);
      expect(result.primaryQuery).toBeTruthy();
    });

    it('should not retry for invalid JSON', async () => {
      mockLLM.chat = vi.fn().mockResolvedValue('Not JSON');

      await analyzeSceneForVisuals('A lion roams');

      // Should only call once (no retry for invalid JSON)
      expect(mockLLM.chat).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling - Missing Required Fields', () => {
    it('should retry when mainSubject is missing', async () => {
      const invalidResponse = JSON.stringify({
        setting: 'savanna',
        primaryQuery: 'savanna sunset'
        // Missing: mainSubject
      });

      const validRetryResponse = JSON.stringify({
        mainSubject: 'lion',
        primaryQuery: 'lion savanna',
        contentType: 'nature'
      });

      mockLLM.chat = vi
        .fn()
        .mockResolvedValueOnce(invalidResponse)
        .mockResolvedValueOnce(validRetryResponse);

      const result = await analyzeSceneForVisuals('A lion');

      // Should have retried
      expect(mockLLM.chat).toHaveBeenCalledTimes(2);
      expect(result.mainSubject).toBe('lion');
    });

    it('should retry when primaryQuery is missing', async () => {
      const invalidResponse = JSON.stringify({
        mainSubject: 'lion',
        setting: 'savanna'
        // Missing: primaryQuery
      });

      const validRetryResponse = JSON.stringify({
        mainSubject: 'lion',
        primaryQuery: 'lion savanna'
      });

      mockLLM.chat = vi
        .fn()
        .mockResolvedValueOnce(invalidResponse)
        .mockResolvedValueOnce(validRetryResponse);

      const result = await analyzeSceneForVisuals('A lion');

      expect(mockLLM.chat).toHaveBeenCalledTimes(2);
      expect(result.primaryQuery).toBe('lion savanna');
    });

    it('should use fallback if retry also fails', async () => {
      const invalidResponse = JSON.stringify({
        setting: 'savanna'
        // Missing: mainSubject, primaryQuery
      });

      mockLLM.chat = vi.fn().mockResolvedValue(invalidResponse);

      const result = await analyzeSceneForVisuals(
        'A majestic lion roams the savanna'
      );

      // Should retry once (2 total calls)
      expect(mockLLM.chat).toHaveBeenCalledTimes(2);

      // Should use fallback
      expect(result.contentType).toBe(ContentType.B_ROLL);
    });
  });

  describe('Error Handling - LLM Timeout', () => {
    it('should use fallback if LLM times out (>10s)', async () => {
      // Mock LLM to never resolve (simulating timeout)
      mockLLM.chat = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve('too late'), 15000);
          })
      );

      const result = await analyzeSceneForVisuals('A lion roams');

      // Should use fallback
      expect(result).toBeDefined();
      expect(result.contentType).toBe(ContentType.B_ROLL);
    });
  });

  describe('Error Handling - LLM Connection Error', () => {
    it('should use fallback if LLM throws connection error', async () => {
      mockLLM.chat = vi.fn().mockRejectedValue(new Error('Connection failed'));

      const result = await analyzeSceneForVisuals(
        'A majestic lion roams the savanna'
      );

      // Should use fallback
      expect(result).toBeDefined();
      expect(result.contentType).toBe(ContentType.B_ROLL);
      expect(result.primaryQuery).toBeTruthy();
    });

    it('should use fallback if LLM throws network error', async () => {
      mockLLM.chat = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await analyzeSceneForVisuals('A lion');

      expect(result).toBeDefined();
      expect(result.contentType).toBe(ContentType.B_ROLL);
    });
  });

  describe('Performance Logging', () => {
    it('should complete analysis and return result', async () => {
      const validResponse = JSON.stringify({
        mainSubject: 'lion',
        primaryQuery: 'lion savanna',
        contentType: 'nature'
      });

      mockLLM.chat = vi.fn().mockResolvedValue(validResponse);

      const startTime = Date.now();
      const result = await analyzeSceneForVisuals('A lion');
      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(1000); // Should be fast with mock
    });
  });

  describe('Different Scene Types', () => {
    it('should analyze nature scene', async () => {
      const response = JSON.stringify({
        mainSubject: 'lion',
        setting: 'savanna',
        mood: 'sunset',
        primaryQuery: 'lion savanna sunset',
        contentType: 'nature'
      });

      mockLLM.chat = vi.fn().mockResolvedValue(response);

      const result = await analyzeSceneForVisuals(
        'A majestic lion roams the savanna at sunset'
      );

      expect(result.contentType).toBe(ContentType.NATURE);
    });

    it('should analyze gaming scene', async () => {
      const response = JSON.stringify({
        mainSubject: 'minecraft gameplay',
        setting: 'dark forest',
        primaryQuery: 'minecraft dark forest gameplay',
        contentType: 'gameplay'
      });

      mockLLM.chat = vi.fn().mockResolvedValue(response);

      const result = await analyzeSceneForVisuals(
        'A player navigates through a dark forest in Minecraft'
      );

      expect(result.contentType).toBe(ContentType.GAMEPLAY);
    });

    it('should analyze tutorial scene', async () => {
      const response = JSON.stringify({
        mainSubject: 'mixing ingredients',
        setting: 'kitchen',
        action: 'mixing',
        primaryQuery: 'mixing flour eggs bowl',
        contentType: 'tutorial'
      });

      mockLLM.chat = vi.fn().mockResolvedValue(response);

      const result = await analyzeSceneForVisuals('Mix flour and eggs in a bowl');

      expect(result.contentType).toBe(ContentType.TUTORIAL);
    });
  });
});
