/**
 * RAG Initialization Integration Tests - Story 6.1
 *
 * Tests for the RAG system initialization orchestration.
 * Covers: AC-6.1.1, AC-6.1.2, AC-6.1.5 (integrated initialization)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('RAG Initialization', () => {
  // Store original env
  let originalRAGEnabled: string | undefined;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    originalRAGEnabled = process.env.RAG_ENABLED;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalRAGEnabled !== undefined) {
      process.env.RAG_ENABLED = originalRAGEnabled;
    } else {
      delete process.env.RAG_ENABLED;
    }
  });

  describe('module exports', () => {
    it('[P0] 6.1-INT-001: should export initializeRAG function', async () => {
      // GIVEN: RAG init module

      // WHEN: Module is imported
      const { initializeRAG } = await import('@/lib/rag/init');

      // THEN: initializeRAG is exported
      expect(initializeRAG).toBeDefined();
      expect(typeof initializeRAG).toBe('function');
    });

    it('[P0] 6.1-INT-002: should export getRAGHealthStatus function', async () => {
      // GIVEN: RAG init module

      // WHEN: Module is imported
      const { getRAGHealthStatus } = await import('@/lib/rag/init');

      // THEN: getRAGHealthStatus is exported
      expect(getRAGHealthStatus).toBeDefined();
      expect(typeof getRAGHealthStatus).toBe('function');
    });

    it('[P1] 6.1-INT-003: should export isRAGInitialized function', async () => {
      // GIVEN: RAG init module

      // WHEN: Module is imported
      const { isRAGInitialized } = await import('@/lib/rag/init');

      // THEN: isRAGInitialized is exported
      expect(isRAGInitialized).toBeDefined();
      expect(typeof isRAGInitialized).toBe('function');
    });

    it('[P1] 6.1-INT-004: should export shutdownRAG function', async () => {
      // GIVEN: RAG init module

      // WHEN: Module is imported
      const { shutdownRAG } = await import('@/lib/rag/init');

      // THEN: shutdownRAG is exported
      expect(shutdownRAG).toBeDefined();
      expect(typeof shutdownRAG).toBe('function');
    });

    it('[P2] 6.1-INT-005: should export getChromaClientInstance function', async () => {
      // GIVEN: RAG init module

      // WHEN: Module is imported
      const { getChromaClientInstance } = await import('@/lib/rag/init');

      // THEN: getChromaClientInstance is exported
      expect(getChromaClientInstance).toBeDefined();
      expect(typeof getChromaClientInstance).toBe('function');
    });

    it('[P2] 6.1-INT-006: should export getEmbeddingsServiceInstance function', async () => {
      // GIVEN: RAG init module

      // WHEN: Module is imported
      const { getEmbeddingsServiceInstance } = await import('@/lib/rag/init');

      // THEN: getEmbeddingsServiceInstance is exported
      expect(getEmbeddingsServiceInstance).toBeDefined();
      expect(typeof getEmbeddingsServiceInstance).toBe('function');
    });
  });

  describe('initializeRAG behavior', () => {
    it('[P1] 6.1-INT-007: should skip initialization when RAG disabled', async () => {
      // GIVEN: RAG is disabled
      delete process.env.RAG_ENABLED;

      // WHEN: initializeRAG is called
      const { initializeRAG } = await import('@/lib/rag/init');
      const result = await initializeRAG();

      // THEN: Returns success but with chromadb and embeddings as false
      // (implementation returns success:true with error message for graceful handling)
      expect(result.success).toBe(true);
      expect(result.chromadb).toBe(false);
      expect(result.embeddings).toBe(false);
      expect(result.error).toContain('disabled');
    });

    it('[P1] 6.1-INT-008: should return result object with required fields', async () => {
      // GIVEN: RAG is disabled (safe to call)
      delete process.env.RAG_ENABLED;

      // WHEN: initializeRAG is called
      const { initializeRAG } = await import('@/lib/rag/init');
      const result = await initializeRAG();

      // THEN: Result has expected structure
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('isRAGInitialized behavior', () => {
    it('[P1] 6.1-INT-009: should return false before initialization', async () => {
      // GIVEN: Fresh module state
      vi.resetModules();

      // WHEN: isRAGInitialized is called before init
      const { isRAGInitialized } = await import('@/lib/rag/init');
      const result = isRAGInitialized();

      // THEN: Returns false
      expect(result).toBe(false);
    });
  });

  describe('getRAGHealthStatus behavior', () => {
    it('[P1] 6.1-INT-010: should return health object with required fields', async () => {
      // GIVEN: RAG module

      // WHEN: getRAGHealthStatus is called
      const { getRAGHealthStatus } = await import('@/lib/rag/init');
      const health = await getRAGHealthStatus();

      // THEN: Health has expected structure
      expect(health).toHaveProperty('chromadb');
      expect(health).toHaveProperty('embeddings');
      expect(health).toHaveProperty('collections');
      expect(health).toHaveProperty('overall');
    });

    it('[P1] 6.1-INT-011: should return unhealthy when not initialized', async () => {
      // GIVEN: RAG not initialized
      vi.resetModules();
      delete process.env.RAG_ENABLED;

      // WHEN: Health status is requested
      const { getRAGHealthStatus } = await import('@/lib/rag/init');
      const health = await getRAGHealthStatus();

      // THEN: Overall status is unhealthy
      expect(health.overall).toBe('unhealthy');
    });

    it('[P2] 6.1-INT-012: should include collection counts in health', async () => {
      // GIVEN: RAG module

      // WHEN: getRAGHealthStatus is called
      const { getRAGHealthStatus } = await import('@/lib/rag/init');
      const health = await getRAGHealthStatus();

      // THEN: Collections object has expected keys
      expect(health.collections).toHaveProperty('channel_content');
      expect(health.collections).toHaveProperty('news_articles');
      expect(health.collections).toHaveProperty('trending_topics');
    });
  });
});
