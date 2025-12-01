/**
 * ChromaDB Client Unit Tests - Story 6.1
 *
 * Tests for the ChromaDB vector database client.
 * Covers: AC-6.1.1 (ChromaDB initialization with 3 collections)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createEmbedding } from '../../factories/rag-factories';

describe('ChromaDBClient', () => {
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

  describe('isRAGEnabled', () => {
    it('[P0] 6.1-UNIT-005: should return true when RAG_ENABLED=true', async () => {
      // GIVEN: RAG_ENABLED environment variable is true
      process.env.RAG_ENABLED = 'true';

      // WHEN: isRAGEnabled is called
      const { isRAGEnabled } = await import('@/lib/rag/vector-db/chroma-client');

      // THEN: Returns true
      expect(isRAGEnabled()).toBe(true);
    });

    it('[P0] 6.1-UNIT-006: should return false when RAG_ENABLED is not set', async () => {
      // GIVEN: RAG_ENABLED environment variable is not set
      delete process.env.RAG_ENABLED;

      // WHEN: isRAGEnabled is called
      const { isRAGEnabled } = await import('@/lib/rag/vector-db/chroma-client');

      // THEN: Returns false
      expect(isRAGEnabled()).toBe(false);
    });

    it('[P1] 6.1-UNIT-005b: should return false when RAG_ENABLED=false', async () => {
      // GIVEN: RAG_ENABLED is explicitly false
      process.env.RAG_ENABLED = 'false';

      // WHEN: isRAGEnabled is called
      const { isRAGEnabled } = await import('@/lib/rag/vector-db/chroma-client');

      // THEN: Returns false
      expect(isRAGEnabled()).toBe(false);
    });
  });

  describe('CHROMA_COLLECTIONS constant', () => {
    it('[P0] 6.1-UNIT-001: should define 3 collection names', async () => {
      // GIVEN: ChromaDB module is imported

      // WHEN: CHROMA_COLLECTIONS constant is accessed
      const { CHROMA_COLLECTIONS } = await import('@/lib/rag/vector-db/chroma-client');

      // THEN: 3 collections are defined as array
      expect(CHROMA_COLLECTIONS).toBeDefined();
      expect(Array.isArray(CHROMA_COLLECTIONS)).toBe(true);
      expect(CHROMA_COLLECTIONS).toHaveLength(3);
      expect(CHROMA_COLLECTIONS).toContain('channel_content');
      expect(CHROMA_COLLECTIONS).toContain('news_articles');
      expect(CHROMA_COLLECTIONS).toContain('trending_topics');
    });
  });

  describe('ChromaDBClient class', () => {
    it('[P0] 6.1-UNIT-002: should export ChromaDBClient class', async () => {
      // GIVEN: Module is imported

      // WHEN: ChromaDBClient is accessed
      const { ChromaDBClient } = await import('@/lib/rag/vector-db/chroma-client');

      // THEN: Class is exported
      expect(ChromaDBClient).toBeDefined();
      expect(typeof ChromaDBClient).toBe('function');
    });

    it('[P1] 6.1-UNIT-003: should create instance without throwing', async () => {
      // GIVEN: ChromaDBClient class
      const { ChromaDBClient } = await import('@/lib/rag/vector-db/chroma-client');

      // WHEN: Instance is created
      // THEN: No error thrown
      expect(() => new ChromaDBClient()).not.toThrow();
    });
  });

  describe('getChromaClientIfEnabled', () => {
    it('[P1] 6.1-UNIT-007: should return null when RAG disabled', async () => {
      // GIVEN: RAG is disabled
      delete process.env.RAG_ENABLED;

      // WHEN: getChromaClientIfEnabled is called
      const { getChromaClientIfEnabled } = await import('@/lib/rag/vector-db/chroma-client');
      const client = await getChromaClientIfEnabled();

      // THEN: Returns null
      expect(client).toBeNull();
    });
  });
});

describe('Embedding factory', () => {
  it('[P0] 6.1-UNIT-018: should generate 384-dimensional vectors', () => {
    // GIVEN: Embedding factory

    // WHEN: Embedding is created with default dimensions
    const result = createEmbedding();

    // THEN: 384-dimensional vector is returned
    expect(result.embedding).toHaveLength(384);
    expect(result.dimensions).toBe(384);
  });

  it('[P0] 6.1-UNIT-019: should use all-MiniLM-L6-v2 model name', () => {
    // GIVEN: Embedding factory

    // WHEN: Embedding is created
    const result = createEmbedding();

    // THEN: Model name is correct
    expect(result.model).toBe('all-MiniLM-L6-v2');
  });

  it('[P1] 6.1-UNIT-020: should generate embeddings with custom dimensions', () => {
    // GIVEN: Custom dimension count

    // WHEN: Embedding is created with 768 dimensions
    const result = createEmbedding(768);

    // THEN: Custom dimension vector is returned
    expect(result.embedding).toHaveLength(768);
    expect(result.dimensions).toBe(768);
  });

  it('[P2] 6.1-UNIT-021: should generate values in valid range [-1, 1]', () => {
    // GIVEN: Embedding factory

    // WHEN: Embedding is created
    const result = createEmbedding();

    // THEN: All values are in valid range
    for (const value of result.embedding) {
      expect(value).toBeGreaterThanOrEqual(-1);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});
