/**
 * Unit Tests for Scene Analyzer - Story 3.2
 *
 * Tests the analyzeSceneForVisuals function with mocked LLM provider to verify
 * error handling, retry logic, and fallback behavior.
 *
 * Test IDs: 3.2-UNIT-001 through 3.2-UNIT-018
 * Priority Distribution: P0 (2 tests), P1 (8 tests), P2 (6 tests), P3 (2 tests)
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

describe('analyzeSceneForVisuals - Story 3.2', () => {
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

  describe('[P1] AC1: Input Validation', () => {
    it('[3.2-UNIT-001] [P1] should throw error for empty string', async () => {
      // GIVEN: An empty scene text string
      const emptyText = '';

      // WHEN: We attempt to analyze the empty scene
      // THEN: Should throw validation error with clear message
      await expect(analyzeSceneForVisuals(emptyText)).rejects.toThrow(
        'Scene text cannot be empty'
      );
    });

    it('[3.2-UNIT-002] [P2] should throw error for whitespace-only string', async () => {
      // GIVEN: A scene text with only whitespace
      const whitespaceText = '   \n  \t  ';

      // WHEN: We attempt to analyze the whitespace-only scene
      // THEN: Should throw validation error
      await expect(analyzeSceneForVisuals(whitespaceText)).rejects.toThrow(
        'Scene text cannot be empty'
      );
    });

    it('[3.2-UNIT-003] [P1] should accept valid scene text', async () => {
      // GIVEN: LLM configured to return valid scene analysis
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

      // WHEN: We analyze valid scene text
      const result = await analyzeSceneForVisuals('A lion roams the savanna');

      // THEN: Should return valid SceneAnalysis object
      expect(result).toBeDefined();
    });
  });

  describe('[P0] AC2 & AC5: LLM Success Cases', () => {
    it('[3.2-UNIT-004] [P0] should return valid SceneAnalysis when LLM succeeds', async () => {
      // GIVEN: LLM returns complete, valid scene analysis
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

      // WHEN: We analyze a nature scene
      const result = await analyzeSceneForVisuals(
        'A majestic lion roams the savanna at sunset'
      );

      // THEN: Should return complete SceneAnalysis with all fields populated
      expect(result.mainSubject).toBe('lion');
      expect(result.setting).toBe('savanna');
      expect(result.mood).toBe('sunset');
      expect(result.action).toBe('roaming');
      expect(result.keywords).toContain('wildlife');
      expect(result.primaryQuery).toBe('lion savanna sunset wildlife');
      expect(result.alternativeQueries).toHaveLength(2);
      expect(result.contentType).toBe(ContentType.NATURE);
    });

    it('[3.2-UNIT-005] [P1] should normalize missing optional fields', async () => {
      // GIVEN: LLM returns minimal response with only required fields
      const partialResponse = JSON.stringify({
        mainSubject: 'lion',
        primaryQuery: 'lion savanna'
        // Missing: setting, mood, action, keywords, alternativeQueries, contentType
      });
      mockLLM.chat = vi.fn().mockResolvedValue(partialResponse);

      // WHEN: We analyze a scene
      const result = await analyzeSceneForVisuals('A lion roams');

      // THEN: Should normalize missing fields to empty values and defaults
      expect(result.mainSubject).toBe('lion');
      expect(result.setting).toBe('');
      expect(result.mood).toBe('');
      expect(result.action).toBe('');
      expect(result.keywords).toEqual([]);
      expect(result.alternativeQueries).toEqual([]);
      expect(result.contentType).toBe(ContentType.B_ROLL); // Default
    });

    it('[3.2-UNIT-006] [P3] should handle invalid contentType gracefully', async () => {
      // GIVEN: LLM returns response with invalid contentType value
      const invalidContentTypeResponse = JSON.stringify({
        mainSubject: 'lion',
        setting: 'savanna',
        primaryQuery: 'lion savanna',
        contentType: 'invalid-type' // Not a valid ContentType enum
      });
      mockLLM.chat = vi.fn().mockResolvedValue(invalidContentTypeResponse);

      // WHEN: We analyze the scene
      const result = await analyzeSceneForVisuals('A lion');

      // THEN: Should default to B_ROLL contentType
      expect(result.contentType).toBe(ContentType.B_ROLL);
    });
  });

  describe('[P1] AC9: Error Handling - Invalid JSON', () => {
    it('[3.2-UNIT-007] [P1] should use fallback for invalid JSON response', async () => {
      // GIVEN: LLM returns non-JSON response
      mockLLM.chat = vi.fn().mockResolvedValue('This is not JSON');

      // WHEN: We analyze a scene
      const result = await analyzeSceneForVisuals(
        'A majestic lion roams the savanna'
      );

      // THEN: Should fall back to keyword extraction and return valid SceneAnalysis
      expect(result).toBeDefined();
      expect(result.contentType).toBe(ContentType.B_ROLL);
      expect(result.primaryQuery).toBeTruthy();
    });

    it('[3.2-UNIT-008] [P2] should not retry for invalid JSON', async () => {
      // GIVEN: LLM returns non-JSON response
      mockLLM.chat = vi.fn().mockResolvedValue('Not JSON');

      // WHEN: We analyze a scene
      await analyzeSceneForVisuals('A lion roams');

      // THEN: Should call LLM only once (no retry for parse errors)
      expect(mockLLM.chat).toHaveBeenCalledTimes(1);
    });
  });

  describe('[P1] AC9: Error Handling - Missing Required Fields', () => {
    it('[3.2-UNIT-009] [P1] should retry when mainSubject is missing', async () => {
      // GIVEN: First LLM response missing mainSubject, second response valid
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

      // WHEN: We analyze a scene
      const result = await analyzeSceneForVisuals('A lion');

      // THEN: Should retry once and return valid result from retry
      expect(mockLLM.chat).toHaveBeenCalledTimes(2);
      expect(result.mainSubject).toBe('lion');
    });

    it('[3.2-UNIT-010] [P1] should retry when primaryQuery is missing', async () => {
      // GIVEN: First LLM response missing primaryQuery, second response valid
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

      // WHEN: We analyze a scene
      const result = await analyzeSceneForVisuals('A lion');

      // THEN: Should retry once and return valid result
      expect(mockLLM.chat).toHaveBeenCalledTimes(2);
      expect(result.primaryQuery).toBe('lion savanna');
    });

    it('[3.2-UNIT-011] [P1] should use fallback if retry also fails', async () => {
      // GIVEN: LLM returns invalid response on both attempts
      const invalidResponse = JSON.stringify({
        setting: 'savanna'
        // Missing: mainSubject, primaryQuery
      });
      mockLLM.chat = vi.fn().mockResolvedValue(invalidResponse);

      // WHEN: We analyze a scene
      const result = await analyzeSceneForVisuals(
        'A majestic lion roams the savanna'
      );

      // THEN: Should retry once then fall back to keyword extraction
      expect(mockLLM.chat).toHaveBeenCalledTimes(2);
      expect(result.contentType).toBe(ContentType.B_ROLL);
    });
  });

  describe('[P1] AC8 & AC9: Error Handling - LLM Timeout', () => {
    it('[3.2-UNIT-012] [P1] should use fallback if LLM times out (>10s)', async () => {
      // GIVEN: LLM never resolves within 10 second timeout
      mockLLM.chat = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve('too late'), 15000);
          })
      );

      // WHEN: We analyze a scene
      const result = await analyzeSceneForVisuals('A lion roams');

      // THEN: Should timeout and fall back to keyword extraction
      expect(result).toBeDefined();
      expect(result.contentType).toBe(ContentType.B_ROLL);
    });
  });

  describe('[P1] AC8 & AC9: Error Handling - LLM Connection Error', () => {
    it('[3.2-UNIT-013] [P1] should use fallback if LLM throws connection error', async () => {
      // GIVEN: LLM throws connection failure error
      mockLLM.chat = vi.fn().mockRejectedValue(new Error('Connection failed'));

      // WHEN: We analyze a scene
      const result = await analyzeSceneForVisuals(
        'A majestic lion roams the savanna'
      );

      // THEN: Should fall back to keyword extraction
      expect(result).toBeDefined();
      expect(result.contentType).toBe(ContentType.B_ROLL);
      expect(result.primaryQuery).toBeTruthy();
    });

    it('[3.2-UNIT-014] [P2] should use fallback if LLM throws network error', async () => {
      // GIVEN: LLM throws network refusal error
      mockLLM.chat = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

      // WHEN: We analyze a scene
      const result = await analyzeSceneForVisuals('A lion');

      // THEN: Should fall back to keyword extraction
      expect(result).toBeDefined();
      expect(result.contentType).toBe(ContentType.B_ROLL);
    });
  });

  describe('[P2] AC6: Performance Logging', () => {
    it('[3.2-UNIT-015] [P2] should complete analysis and return result', async () => {
      // GIVEN: LLM configured to return valid response
      const validResponse = JSON.stringify({
        mainSubject: 'lion',
        primaryQuery: 'lion savanna',
        contentType: 'nature'
      });
      mockLLM.chat = vi.fn().mockResolvedValue(validResponse);

      // WHEN: We analyze a scene and measure duration
      const startTime = Date.now();
      const result = await analyzeSceneForVisuals('A lion');
      const duration = Date.now() - startTime;

      // THEN: Should complete quickly with mocked LLM (<1s)
      expect(result).toBeDefined();
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('[P0] AC4 & AC7: Different Scene Types', () => {
    it('[3.2-UNIT-016] [P0] should analyze nature scene', async () => {
      // GIVEN: LLM configured to analyze nature scene
      const response = JSON.stringify({
        mainSubject: 'lion',
        setting: 'savanna',
        mood: 'sunset',
        primaryQuery: 'lion savanna sunset',
        contentType: 'nature'
      });
      mockLLM.chat = vi.fn().mockResolvedValue(response);

      // WHEN: We analyze a nature scene description
      const result = await analyzeSceneForVisuals(
        'A majestic lion roams the savanna at sunset'
      );

      // THEN: Should classify as NATURE content type
      expect(result.contentType).toBe(ContentType.NATURE);
    });

    it('[3.2-UNIT-017] [P2] should analyze gaming scene', async () => {
      // GIVEN: LLM configured to analyze gaming scene
      const response = JSON.stringify({
        mainSubject: 'minecraft gameplay',
        setting: 'dark forest',
        primaryQuery: 'minecraft dark forest gameplay',
        contentType: 'gameplay'
      });
      mockLLM.chat = vi.fn().mockResolvedValue(response);

      // WHEN: We analyze a gaming scene description
      const result = await analyzeSceneForVisuals(
        'A player navigates through a dark forest in Minecraft'
      );

      // THEN: Should classify as GAMEPLAY content type
      expect(result.contentType).toBe(ContentType.GAMEPLAY);
    });

    it('[3.2-UNIT-018] [P3] should analyze tutorial scene', async () => {
      // GIVEN: LLM configured to analyze tutorial scene
      const response = JSON.stringify({
        mainSubject: 'mixing ingredients',
        setting: 'kitchen',
        action: 'mixing',
        primaryQuery: 'mixing flour eggs bowl',
        contentType: 'tutorial'
      });
      mockLLM.chat = vi.fn().mockResolvedValue(response);

      // WHEN: We analyze a tutorial scene description
      const result = await analyzeSceneForVisuals('Mix flour and eggs in a bowl');

      // THEN: Should classify as TUTORIAL content type
      expect(result.contentType).toBe(ContentType.TUTORIAL);
    });
  });
});
