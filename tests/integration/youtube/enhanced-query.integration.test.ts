/**
 * Integration Tests for Enhanced Query Generation (Story 3.2b)
 *
 * These tests verify that the enhanced query generation actually injects
 * negative terms and B-roll quality terms into the final queries.
 *
 * Required by multi-agent review (TEA-001, TEA-002)
 *
 * @module tests/integration/youtube/enhanced-query.integration.test
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

describe('[P1] Story 3.2b Integration: Enhanced Query Generation', () => {
  let mockLLM: Partial<LLMProvider>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLLM = {
      chat: vi.fn()
    };
    (createLLMProvider as any).mockReturnValue(mockLLM);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('[P1] AC1 & AC4: Gaming Content - Negative Term Injection', () => {
    it('[3.2b-INT-001] should inject gaming negative terms into enhancedQuery', async () => {
      // GIVEN: LLM returns gaming content analysis
      const gamingResponse = JSON.stringify({
        mainSubject: 'dark souls boss fight',
        setting: 'anor londo cathedral',
        mood: 'intense epic',
        action: 'fighting dodging',
        keywords: ['boss fight', 'combat', 'action rpg', 'challenge'],
        entities: ['Dark Souls', 'Ornstein and Smough', 'Anor Londo'],
        primaryQuery: 'dark souls ornstein smough boss fight',
        alternativeQueries: ['dark souls boss fight clean gameplay'],
        contentType: 'gaming',
        expectedLabels: ['video game', 'combat', 'boss', 'knight']
      });
      mockLLM.chat = vi.fn().mockResolvedValue(gamingResponse);

      // WHEN: We analyze a gaming scene
      const result = await analyzeSceneForVisuals(
        'The epic battle against Ornstein and Smough tests every player\'s skill'
      );

      // THEN: Enhanced query should contain gaming negative terms
      expect(result.enhancedQuery).toBeDefined();
      expect(result.enhancedQuery).toContain('-reaction');
      expect(result.enhancedQuery).toContain('-review');
      expect(result.enhancedQuery).toContain('-tier list');
      expect(result.enhancedQuery).toContain('-ranking');
      expect(result.enhancedQuery).toContain('-commentary');
    });

    it('[3.2b-INT-002] should inject gaming B-roll quality terms into enhancedQuery', async () => {
      // GIVEN: LLM returns gaming content analysis
      const gamingResponse = JSON.stringify({
        mainSubject: 'dark souls boss fight',
        setting: 'cathedral',
        primaryQuery: 'dark souls ornstein smough boss fight',
        contentType: 'gaming'
      });
      mockLLM.chat = vi.fn().mockResolvedValue(gamingResponse);

      // WHEN: We analyze a gaming scene
      const result = await analyzeSceneForVisuals(
        'The epic battle against Ornstein and Smough'
      );

      // THEN: Enhanced query should contain gaming B-roll quality terms
      expect(result.enhancedQuery).toBeDefined();
      expect(result.enhancedQuery).toContain('no commentary');
      expect(result.enhancedQuery).toContain('gameplay only');
    });
  });

  describe('[P1] AC2 & AC4: Historical Content - Negative Term Injection', () => {
    it('[3.2b-INT-003] should inject historical negative terms into enhancedQuery', async () => {
      // GIVEN: LLM returns historical content analysis
      const historicalResponse = JSON.stringify({
        mainSubject: 'winter palace storming',
        setting: 'petrograd russia 1917',
        mood: 'revolutionary dramatic',
        action: 'storming revolution',
        keywords: ['revolution', 'palace', 'bolshevik', 'october'],
        entities: ['Winter Palace', 'Russian Revolution', '1917', 'Petrograd'],
        primaryQuery: 'russian revolution winter palace',
        alternativeQueries: ['october revolution 1917 documentary'],
        contentType: 'historical',
        expectedLabels: ['palace', 'crowd', 'revolution', 'historical']
      });
      mockLLM.chat = vi.fn().mockResolvedValue(historicalResponse);

      // WHEN: We analyze a historical scene
      const result = await analyzeSceneForVisuals(
        'The storming of the Winter Palace marked the beginning of Soviet rule'
      );

      // THEN: Enhanced query should contain historical negative terms
      expect(result.enhancedQuery).toBeDefined();
      expect(result.enhancedQuery).toContain('-reaction');
      expect(result.enhancedQuery).toContain('-explained');
      expect(result.enhancedQuery).toContain('-opinion');
      expect(result.enhancedQuery).toContain('-analysis');
    });

    it('[3.2b-INT-004] should inject historical B-roll quality terms into enhancedQuery', async () => {
      // GIVEN: LLM returns historical content analysis
      const historicalResponse = JSON.stringify({
        mainSubject: 'winter palace',
        primaryQuery: 'russian revolution winter palace',
        contentType: 'historical'
      });
      mockLLM.chat = vi.fn().mockResolvedValue(historicalResponse);

      // WHEN: We analyze a historical scene
      const result = await analyzeSceneForVisuals(
        'The storming of the Winter Palace'
      );

      // THEN: Enhanced query should contain historical B-roll quality terms
      expect(result.enhancedQuery).toBeDefined();
      expect(result.enhancedQuery).toContain('historical footage');
      expect(result.enhancedQuery).toContain('documentary');
    });
  });

  describe('[P1] AC3 & AC5: Conceptual Content - B-Roll Quality Terms', () => {
    it('[3.2b-INT-005] should inject conceptual B-roll quality terms into enhancedQuery', async () => {
      // GIVEN: LLM returns conceptual content analysis
      const conceptualResponse = JSON.stringify({
        mainSubject: 'dystopian cityscape drones',
        setting: 'futuristic city',
        mood: 'dark ominous',
        action: 'patrolling surveillance',
        keywords: ['dystopia', 'drones', 'surveillance', 'futuristic'],
        entities: ['dystopia', 'autonomous drones', 'smart city'],
        primaryQuery: 'dystopian city AI robots',
        alternativeQueries: ['futuristic city drones cinematic'],
        contentType: 'conceptual',
        expectedLabels: ['skyscraper', 'drone', 'city', 'futuristic']
      });
      mockLLM.chat = vi.fn().mockResolvedValue(conceptualResponse);

      // WHEN: We analyze a conceptual scene
      const result = await analyzeSceneForVisuals(
        'Towering skyscrapers loom over empty streets as autonomous drones patrol'
      );

      // THEN: Enhanced query should contain conceptual B-roll quality terms
      expect(result.enhancedQuery).toBeDefined();
      expect(result.enhancedQuery).toContain('cinematic');
      expect(result.enhancedQuery).toContain('4K');
      expect(result.enhancedQuery).toContain('stock footage');
    });

    it('[3.2b-INT-006] should inject conceptual negative terms into enhancedQuery', async () => {
      // GIVEN: LLM returns conceptual content analysis
      const conceptualResponse = JSON.stringify({
        mainSubject: 'dystopian city',
        primaryQuery: 'dystopian city AI robots',
        contentType: 'conceptual'
      });
      mockLLM.chat = vi.fn().mockResolvedValue(conceptualResponse);

      // WHEN: We analyze a conceptual scene
      const result = await analyzeSceneForVisuals(
        'Towering skyscrapers with autonomous drones'
      );

      // THEN: Enhanced query should contain conceptual negative terms
      expect(result.enhancedQuery).toBeDefined();
      expect(result.enhancedQuery).toContain('-reaction');
      expect(result.enhancedQuery).toContain('-review');
      expect(result.enhancedQuery).toContain('-vlog');
    });
  });

  describe('[P1] AC1 & AC2: Entity Extraction', () => {
    it('[3.2b-INT-007] should extract gaming entities (boss names, game titles)', async () => {
      // GIVEN: LLM returns gaming content with entities
      const gamingResponse = JSON.stringify({
        mainSubject: 'dark souls boss fight',
        primaryQuery: 'dark souls ornstein smough boss fight',
        entities: ['Dark Souls', 'Ornstein and Smough', 'Anor Londo'],
        contentType: 'gaming'
      });
      mockLLM.chat = vi.fn().mockResolvedValue(gamingResponse);

      // WHEN: We analyze a gaming scene
      const result = await analyzeSceneForVisuals(
        'The epic battle against Ornstein and Smough tests every player\'s skill'
      );

      // THEN: Entities should be extracted
      expect(result.entities).toBeDefined();
      expect(result.entities).toHaveLength(3);
      expect(result.entities).toContain('Dark Souls');
      expect(result.entities).toContain('Ornstein and Smough');
      expect(result.entities).toContain('Anor Londo');
    });

    it('[3.2b-INT-008] should extract historical entities (events, locations)', async () => {
      // GIVEN: LLM returns historical content with entities
      const historicalResponse = JSON.stringify({
        mainSubject: 'winter palace storming',
        primaryQuery: 'russian revolution winter palace',
        entities: ['Winter Palace', 'Russian Revolution', '1917', 'Petrograd', 'Bolsheviks'],
        contentType: 'historical'
      });
      mockLLM.chat = vi.fn().mockResolvedValue(historicalResponse);

      // WHEN: We analyze a historical scene
      const result = await analyzeSceneForVisuals(
        'The storming of the Winter Palace marked the beginning of Soviet rule'
      );

      // THEN: Entities should be extracted
      expect(result.entities).toBeDefined();
      expect(result.entities).toHaveLength(5);
      expect(result.entities).toContain('Winter Palace');
      expect(result.entities).toContain('Russian Revolution');
      expect(result.entities).toContain('1917');
    });

    it('[3.2b-INT-009] should extract conceptual entities (technologies, themes)', async () => {
      // GIVEN: LLM returns conceptual content with entities
      const conceptualResponse = JSON.stringify({
        mainSubject: 'dystopian city',
        primaryQuery: 'dystopian city AI robots',
        entities: ['dystopia', 'autonomous drones', 'smart city', 'surveillance'],
        contentType: 'conceptual'
      });
      mockLLM.chat = vi.fn().mockResolvedValue(conceptualResponse);

      // WHEN: We analyze a conceptual scene
      const result = await analyzeSceneForVisuals(
        'Towering skyscrapers loom over empty streets as autonomous drones patrol'
      );

      // THEN: Entities should be extracted
      expect(result.entities).toBeDefined();
      expect(result.entities).toHaveLength(4);
      expect(result.entities).toContain('dystopia');
      expect(result.entities).toContain('autonomous drones');
    });
  });

  describe('[P2] Query Length Constraint', () => {
    it('[3.2b-INT-010] should cap enhanced query at 450 characters', async () => {
      // GIVEN: LLM returns a very long primary query
      const longQueryResponse = JSON.stringify({
        mainSubject: 'dark souls boss fight ornstein smough anor londo cathedral epic battle',
        primaryQuery: 'dark souls boss fight ornstein smough anor londo cathedral epic battle challenging combat action rpg souls like game difficulty challenge victory defeat knight dragon slayer executioner',
        contentType: 'gaming'
      });
      mockLLM.chat = vi.fn().mockResolvedValue(longQueryResponse);

      // WHEN: We analyze a scene
      const result = await analyzeSceneForVisuals(
        'An epic Dark Souls boss battle'
      );

      // THEN: Enhanced query should be capped at 450 characters
      expect(result.enhancedQuery).toBeDefined();
      expect(result.enhancedQuery!.length).toBeLessThanOrEqual(450);
    });
  });

  describe('[P2] Content Type Normalization', () => {
    it('[3.2b-INT-011] should normalize "game" to GAMING content type', async () => {
      // GIVEN: LLM returns "game" instead of "gaming"
      const response = JSON.stringify({
        mainSubject: 'minecraft',
        primaryQuery: 'minecraft gameplay',
        contentType: 'game'
      });
      mockLLM.chat = vi.fn().mockResolvedValue(response);

      // WHEN: We analyze a scene
      const result = await analyzeSceneForVisuals('Minecraft gameplay');

      // THEN: Content type should be normalized to GAMING
      expect(result.contentType).toBe(ContentType.GAMING);
    });

    it('[3.2b-INT-012] should normalize "history" to HISTORICAL content type', async () => {
      // GIVEN: LLM returns "history" instead of "historical"
      const response = JSON.stringify({
        mainSubject: 'world war',
        primaryQuery: 'world war footage',
        contentType: 'history'
      });
      mockLLM.chat = vi.fn().mockResolvedValue(response);

      // WHEN: We analyze a scene
      const result = await analyzeSceneForVisuals('World War II battle');

      // THEN: Content type should be normalized to HISTORICAL
      expect(result.contentType).toBe(ContentType.HISTORICAL);
    });

    it('[3.2b-INT-013] should normalize "concept" to CONCEPTUAL content type', async () => {
      // GIVEN: LLM returns "concept" instead of "conceptual"
      const response = JSON.stringify({
        mainSubject: 'future city',
        primaryQuery: 'future city drones',
        contentType: 'concept'
      });
      mockLLM.chat = vi.fn().mockResolvedValue(response);

      // WHEN: We analyze a scene
      const result = await analyzeSceneForVisuals('Futuristic city with drones');

      // THEN: Content type should be normalized to CONCEPTUAL
      expect(result.contentType).toBe(ContentType.CONCEPTUAL);
    });
  });

  describe('[P2] Fallback Behavior', () => {
    it('[3.2b-INT-014] should generate enhanced query with default B-roll terms in fallback', async () => {
      // GIVEN: LLM returns invalid JSON (triggers fallback)
      mockLLM.chat = vi.fn().mockResolvedValue('Not valid JSON');

      // WHEN: We analyze a scene
      const result = await analyzeSceneForVisuals(
        'A majestic lion roams the savanna at sunset'
      );

      // THEN: Fallback should generate enhanced query with default terms
      expect(result.enhancedQuery).toBeDefined();
      expect(result.enhancedQuery).toContain('cinematic');
      expect(result.enhancedQuery).toContain('4K');
      expect(result.enhancedQuery).toContain('stock footage');
      expect(result.enhancedQuery).toContain('-reaction');
      expect(result.enhancedQuery).toContain('-vlog');
    });

    it('[3.2b-INT-015] should return empty entities array in fallback', async () => {
      // GIVEN: LLM returns invalid JSON (triggers fallback)
      mockLLM.chat = vi.fn().mockResolvedValue('Invalid');

      // WHEN: We analyze a scene
      const result = await analyzeSceneForVisuals('A lion roams');

      // THEN: Entities should be empty array (no LLM to extract)
      expect(result.entities).toBeDefined();
      expect(result.entities).toEqual([]);
    });
  });
});
