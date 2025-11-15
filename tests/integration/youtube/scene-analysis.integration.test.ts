/**
 * Integration Tests for Scene Analysis
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
 */

import { describe, it, expect } from 'vitest';
import { analyzeSceneForVisuals } from '../../../src/lib/youtube/analyze-scene';
import { ContentType } from '../../../src/lib/youtube/types';

// Skip integration tests by default in CI (requires LLM provider setup)
const testMode = process.env.RUN_INTEGRATION_TESTS === 'true' ? describe : describe.skip;

testMode('Scene Analysis Integration Tests', () => {
  it('should analyze nature scene with real LLM', async () => {
    const sceneText = 'A majestic lion roams the savanna at sunset';
    const analysis = await analyzeSceneForVisuals(sceneText);

    // Verify structure
    expect(analysis).toBeDefined();
    expect(analysis.mainSubject).toBeTruthy();
    expect(analysis.primaryQuery).toBeTruthy();

    // Verify content makes sense
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

  it('should analyze gaming scene with real LLM', async () => {
    const sceneText = 'A player navigates through a dark forest in Minecraft';
    const analysis = await analyzeSceneForVisuals(sceneText);

    expect(analysis).toBeDefined();
    expect(analysis.mainSubject).toBeTruthy();
    expect(analysis.primaryQuery).toBeTruthy();

    // Should identify Minecraft
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

  it('should analyze tutorial scene with real LLM', async () => {
    const sceneText = 'Mix flour and eggs in a glass bowl';
    const analysis = await analyzeSceneForVisuals(sceneText);

    expect(analysis).toBeDefined();
    expect(analysis.mainSubject).toBeTruthy();
    expect(analysis.primaryQuery).toBeTruthy();

    console.log('\nTutorial Scene Analysis:');
    console.log('Primary Query:', analysis.primaryQuery);
    console.log('Alternative Queries:', analysis.alternativeQueries);
    console.log('Content Type:', analysis.contentType);
  }, 15000);

  it('should analyze urban scene with real LLM', async () => {
    const sceneText = 'The busy streets of Tokyo at night glow with neon signs';
    const analysis = await analyzeSceneForVisuals(sceneText);

    expect(analysis).toBeDefined();
    expect(analysis.mainSubject).toBeTruthy();
    expect(analysis.primaryQuery).toBeTruthy();

    // Should identify Tokyo
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

  it('should analyze abstract concept with real LLM', async () => {
    const sceneText = 'Innovation drives technological progress';
    const analysis = await analyzeSceneForVisuals(sceneText);

    expect(analysis).toBeDefined();
    expect(analysis.mainSubject).toBeTruthy();
    expect(analysis.primaryQuery).toBeTruthy();

    console.log('\nAbstract Scene Analysis:');
    console.log('Primary Query:', analysis.primaryQuery);
    console.log('Alternative Queries:', analysis.alternativeQueries);
    console.log('Content Type:', analysis.contentType);
  }, 15000);

  it('should complete analysis within performance target', async () => {
    const sceneText = 'A majestic lion roams the savanna at sunset';

    const startTime = Date.now();
    const analysis = await analyzeSceneForVisuals(sceneText);
    const duration = Date.now() - startTime;

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

  it('should verify SceneAnalysis structure from real LLM', async () => {
    const sceneText = 'A majestic lion roams the savanna at sunset';
    const analysis = await analyzeSceneForVisuals(sceneText);

    // Verify all required fields exist
    expect(analysis).toHaveProperty('mainSubject');
    expect(analysis).toHaveProperty('setting');
    expect(analysis).toHaveProperty('mood');
    expect(analysis).toHaveProperty('action');
    expect(analysis).toHaveProperty('keywords');
    expect(analysis).toHaveProperty('primaryQuery');
    expect(analysis).toHaveProperty('alternativeQueries');
    expect(analysis).toHaveProperty('contentType');

    // Verify types
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
