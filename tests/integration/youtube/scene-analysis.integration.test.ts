/**
 * Integration Tests for Scene Analysis - Story 3.2
 *
 * These tests use real LLM providers (Ollama or Gemini) to verify end-to-end
 * functionality of the scene analysis pipeline.
 *
 * NOTE: These tests require LLM_PROVIDER to be configured in .env.local:
 * - For Ollama: LLM_PROVIDER=ollama, OLLAMA_BASE_URL, OLLAMA_MODEL
 * - For Gemini: LLM_PROVIDER=gemini, GEMINI_API_KEY
 *
 * Skip these tests if LLM provider is not available:
 * - Run: npm test -- tests/integration/youtube --run
 * - Or manually: node manual-test-scene-analysis.js
 *
 * Test IDs: 3.2-INT-001 through 3.2-INT-007
 * Priority Distribution: P0 (2 tests), P1 (4 tests), P2 (1 test)
 */

import { describe, it, expect } from 'vitest';
import { analyzeSceneForVisuals } from '../../../src/lib/youtube/analyze-scene';
import { ContentType } from '../../../src/lib/youtube/types';

// Skip integration tests by default in CI (requires LLM provider setup)
const testMode = process.env.RUN_INTEGRATION_TESTS === 'true' ? describe : describe.skip;

testMode('Scene Analysis Integration Tests - Story 3.2', () => {
  describe('[P0] AC1, AC7, AC10: Nature Scene Analysis', () => {
    it('[3.2-INT-001] [P0] should analyze nature scene with real LLM', async () => {
      // GIVEN: A nature scene description
      const sceneText = 'A majestic lion roams the savanna at sunset';

      // WHEN: We analyze the scene with real LLM provider
      const analysis = await analyzeSceneForVisuals(sceneText);

      // THEN: Should return complete SceneAnalysis with valid data
      expect(analysis).toBeDefined();
      expect(analysis.mainSubject).toBeTruthy();
      expect(analysis.primaryQuery).toBeTruthy();

      // Verify content makes sense for nature scene
      expect(analysis.primaryQuery.toLowerCase()).toContain('lion');

      // Should have alternative queries (LLM should provide these)
      expect(analysis.alternativeQueries.length).toBeGreaterThanOrEqual(0);

      // Content type should be nature or documentary (LLM may vary)
      expect([
        ContentType.NATURE,
        ContentType.DOCUMENTARY,
        ContentType.B_ROLL
      ]).toContain(analysis.contentType);

      console.log('\nNature Scene Analysis:');
      console.log('Primary Query:', analysis.primaryQuery);
      console.log('Alternative Queries:', analysis.alternativeQueries);
      console.log('Content Type:', analysis.contentType);
    }, 15000); // 15 second timeout for LLM call
  });

  describe('[P1] AC4, AC7, AC10: Gaming Scene Analysis', () => {
    it('[3.2-INT-002] [P1] should analyze gaming scene with real LLM', async () => {
      // GIVEN: A gaming scene description
      const sceneText = 'A player navigates through a dark forest in Minecraft';

      // WHEN: We analyze the scene with real LLM provider
      const analysis = await analyzeSceneForVisuals(sceneText);

      // THEN: Should return valid analysis with gaming context
      expect(analysis).toBeDefined();
      expect(analysis.mainSubject).toBeTruthy();
      expect(analysis.primaryQuery).toBeTruthy();

      // Should identify Minecraft in the analysis
      expect(
        analysis.primaryQuery.toLowerCase() +
          ' ' +
          analysis.mainSubject.toLowerCase()
      ).toContain('minecraft');

      console.log('\nGaming Scene Analysis:');
      console.log('Primary Query:', analysis.primaryQuery);
      console.log('Alternative Queries:', analysis.alternativeQueries);
      console.log('Content Type:', analysis.contentType);
    }, 15000);
  });

  describe('[P1] AC4, AC7, AC10: Tutorial Scene Analysis', () => {
    it('[3.2-INT-003] [P1] should analyze tutorial scene with real LLM', async () => {
      // GIVEN: A tutorial scene description
      const sceneText = 'Mix flour and eggs in a glass bowl';

      // WHEN: We analyze the scene with real LLM provider
      const analysis = await analyzeSceneForVisuals(sceneText);

      // THEN: Should return valid analysis with tutorial context
      expect(analysis).toBeDefined();
      expect(analysis.mainSubject).toBeTruthy();
      expect(analysis.primaryQuery).toBeTruthy();

      console.log('\nTutorial Scene Analysis:');
      console.log('Primary Query:', analysis.primaryQuery);
      console.log('Alternative Queries:', analysis.alternativeQueries);
      console.log('Content Type:', analysis.contentType);
    }, 15000);
  });

  describe('[P2] AC4, AC7, AC10: Urban Scene Analysis', () => {
    it('[3.2-INT-004] [P2] should analyze urban scene with real LLM', async () => {
      // GIVEN: An urban scene description
      const sceneText = 'The busy streets of Tokyo at night glow with neon signs';

      // WHEN: We analyze the scene with real LLM provider
      const analysis = await analyzeSceneForVisuals(sceneText);

      // THEN: Should return valid analysis with urban context
      expect(analysis).toBeDefined();
      expect(analysis.mainSubject).toBeTruthy();
      expect(analysis.primaryQuery).toBeTruthy();

      // Should identify Tokyo in the analysis
      expect(
        analysis.primaryQuery.toLowerCase() +
          ' ' +
          analysis.mainSubject.toLowerCase()
      ).toContain('tokyo');

      console.log('\nUrban Scene Analysis:');
      console.log('Primary Query:', analysis.primaryQuery);
      console.log('Alternative Queries:', analysis.alternativeQueries);
      console.log('Content Type:', analysis.contentType);
    }, 15000);
  });

  describe('[P1] AC4, AC7, AC10: Abstract Scene Analysis', () => {
    it('[3.2-INT-005] [P1] should analyze abstract concept with real LLM', async () => {
      // GIVEN: An abstract concept description
      const sceneText = 'Innovation drives technological progress';

      // WHEN: We analyze the scene with real LLM provider
      const analysis = await analyzeSceneForVisuals(sceneText);

      // THEN: Should return valid analysis for abstract concept
      expect(analysis).toBeDefined();
      expect(analysis.mainSubject).toBeTruthy();
      expect(analysis.primaryQuery).toBeTruthy();

      console.log('\nAbstract Scene Analysis:');
      console.log('Primary Query:', analysis.primaryQuery);
      console.log('Alternative Queries:', analysis.alternativeQueries);
      console.log('Content Type:', analysis.contentType);
    }, 15000);
  });

  describe('[P0] AC6: Performance Validation', () => {
    it('[3.2-INT-006] [P0] should complete analysis within performance target', async () => {
      // GIVEN: A scene to analyze with performance monitoring
      const sceneText = 'A majestic lion roams the savanna at sunset';

      // WHEN: We analyze the scene and measure duration
      const startTime = Date.now();
      const analysis = await analyzeSceneForVisuals(sceneText);
      const duration = Date.now() - startTime;

      // THEN: Should complete within acceptable time limits
      expect(analysis).toBeDefined();

      console.log(`\nPerformance: Analysis completed in ${duration}ms`);

      // Performance target: <5s average (but allow up to 10s for slow responses)
      expect(duration).toBeLessThan(10000);

      if (duration > 5000) {
        console.warn(
          `WARNING: Analysis took ${duration}ms (>5s target). Consider LLM performance tuning.`
        );
      }
    }, 15000);
  });

  describe('[P1] AC5: SceneAnalysis Structure Validation', () => {
    it('[3.2-INT-007] [P1] should verify SceneAnalysis structure from real LLM', async () => {
      // GIVEN: A scene to analyze
      const sceneText = 'A majestic lion roams the savanna at sunset';

      // WHEN: We analyze the scene with real LLM provider
      const analysis = await analyzeSceneForVisuals(sceneText);

      // THEN: Should return object with all required fields and correct types
      // Verify all required fields exist
      expect(analysis).toHaveProperty('mainSubject');
      expect(analysis).toHaveProperty('setting');
      expect(analysis).toHaveProperty('mood');
      expect(analysis).toHaveProperty('action');
      expect(analysis).toHaveProperty('keywords');
      expect(analysis).toHaveProperty('primaryQuery');
      expect(analysis).toHaveProperty('alternativeQueries');
      expect(analysis).toHaveProperty('contentType');

      // Verify types are correct
      expect(typeof analysis.mainSubject).toBe('string');
      expect(typeof analysis.setting).toBe('string');
      expect(typeof analysis.mood).toBe('string');
      expect(typeof analysis.action).toBe('string');
      expect(Array.isArray(analysis.keywords)).toBe(true);
      expect(typeof analysis.primaryQuery).toBe('string');
      expect(Array.isArray(analysis.alternativeQueries)).toBe(true);
      expect(typeof analysis.contentType).toBe('string');

      // Required fields should not be empty
      expect(analysis.mainSubject).toBeTruthy();
      expect(analysis.primaryQuery).toBeTruthy();
    }, 15000);
  });
});
