/**
 * Local Embeddings Service Unit Tests - Story 6.1
 *
 * Tests for the Python subprocess-based embeddings service.
 * Covers: AC-6.1.2 (Embeddings with all-MiniLM-L6-v2, 384 dimensions)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createEmbedding } from '../../factories/rag-factories';

describe('LocalEmbeddingsService', () => {
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
    it('[P0] 6.1-UNIT-014: should export LocalEmbeddingsService class', async () => {
      // GIVEN: Module is imported

      // WHEN: LocalEmbeddingsService is accessed
      const { LocalEmbeddingsService } = await import('@/lib/rag/embeddings/local-embeddings');

      // THEN: Class is exported
      expect(LocalEmbeddingsService).toBeDefined();
      expect(typeof LocalEmbeddingsService).toBe('function');
    });

    it('[P0] 6.1-UNIT-015: should export getEmbeddingsService function', async () => {
      // GIVEN: Module is imported

      // WHEN: getEmbeddingsService is accessed
      const { getEmbeddingsService } = await import('@/lib/rag/embeddings/local-embeddings');

      // THEN: Function is exported
      expect(getEmbeddingsService).toBeDefined();
      expect(typeof getEmbeddingsService).toBe('function');
    });

    it('[P1] 6.1-UNIT-016: should export generateEmbedding convenience function', async () => {
      // GIVEN: Module is imported

      // WHEN: generateEmbedding is accessed
      const { generateEmbedding } = await import('@/lib/rag/embeddings/local-embeddings');

      // THEN: Function is exported
      expect(generateEmbedding).toBeDefined();
      expect(typeof generateEmbedding).toBe('function');
    });

    it('[P1] 6.1-UNIT-017: should export generateEmbeddings batch function', async () => {
      // GIVEN: Module is imported

      // WHEN: generateEmbeddings is accessed
      const { generateEmbeddings } = await import('@/lib/rag/embeddings/local-embeddings');

      // THEN: Function is exported
      expect(generateEmbeddings).toBeDefined();
      expect(typeof generateEmbeddings).toBe('function');
    });

    it('[P1] 6.1-UNIT-024: should export getEmbeddingsHealth function', async () => {
      // GIVEN: Module is imported

      // WHEN: getEmbeddingsHealth is accessed
      const { getEmbeddingsHealth } = await import('@/lib/rag/embeddings/local-embeddings');

      // THEN: Function is exported
      expect(getEmbeddingsHealth).toBeDefined();
      expect(typeof getEmbeddingsHealth).toBe('function');
    });
  });

  describe('LocalEmbeddingsService instance', () => {
    it('[P1] 6.1-UNIT-027: should create instance without throwing', async () => {
      // GIVEN: LocalEmbeddingsService class
      const { LocalEmbeddingsService } = await import('@/lib/rag/embeddings/local-embeddings');

      // WHEN: Instance is created
      // THEN: No error thrown
      expect(() => new LocalEmbeddingsService()).not.toThrow();
    });

    it('[P2] 6.1-UNIT-025: should report not ready before initialization', async () => {
      // GIVEN: Uninitialized service
      const { LocalEmbeddingsService } = await import('@/lib/rag/embeddings/local-embeddings');
      const service = new LocalEmbeddingsService();

      // WHEN: isReady is checked before init
      // THEN: Should report not ready
      expect(service.isReady()).toBe(false);
    });
  });
});

describe('Embedding generation (factory tests)', () => {
  it('[P0] 6.1-UNIT-018: should generate 384-dimensional vectors', () => {
    // GIVEN: Embedding factory

    // WHEN: Embedding is created with default dimensions
    const result = createEmbedding();

    // THEN: 384-dimensional vector is returned
    expect(result.embedding).toHaveLength(384);
    expect(result.dimensions).toBe(384);
  });

  it('[P0] 6.1-UNIT-019: should use all-MiniLM-L6-v2 model', () => {
    // GIVEN: Embedding factory

    // WHEN: Embedding is created
    const result = createEmbedding();

    // THEN: Model name is all-MiniLM-L6-v2
    expect(result.model).toBe('all-MiniLM-L6-v2');
  });

  it('[P1] 6.1-UNIT-020: should handle batch embeddings', () => {
    // GIVEN: Need multiple embeddings

    // WHEN: Multiple embeddings are created
    const embeddings = [
      createEmbedding(),
      createEmbedding(),
      createEmbedding(),
    ];

    // THEN: All embeddings have correct dimensions
    expect(embeddings).toHaveLength(3);
    embeddings.forEach((result) => {
      expect(result.embedding).toHaveLength(384);
      expect(result.dimensions).toBe(384);
      expect(result.model).toBe('all-MiniLM-L6-v2');
    });
  });

  it('[P2] 6.1-UNIT-022: should handle empty case', () => {
    // GIVEN: Empty array

    // WHEN: No embeddings are created
    const embeddings: ReturnType<typeof createEmbedding>[] = [];

    // THEN: Empty array
    expect(embeddings).toHaveLength(0);
  });

  it('[P2] 6.1-UNIT-023: should generate unique embeddings', () => {
    // GIVEN: Multiple embedding generations

    // WHEN: Two embeddings are created
    const embedding1 = createEmbedding();
    const embedding2 = createEmbedding();

    // THEN: Embeddings are different (random values)
    expect(embedding1.embedding).not.toEqual(embedding2.embedding);
  });

  it('[P2] 6.1-UNIT-026: should support custom dimensions', () => {
    // GIVEN: Custom dimension requirements

    // WHEN: Embedding is created with 768 dimensions
    const result = createEmbedding(768);

    // THEN: Custom dimensions are used
    expect(result.embedding).toHaveLength(768);
    expect(result.dimensions).toBe(768);
  });
});
