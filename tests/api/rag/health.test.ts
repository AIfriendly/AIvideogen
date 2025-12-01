/**
 * RAG Health API Tests - Story 6.1
 *
 * Tests for the RAG health check API endpoint.
 * Covers: AC-6.1.5 (Health check endpoint returns correct status)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  createMockChromaClient,
  createMockEmbeddingsService,
  withRAGEnabled,
  withRAGDisabled,
} from '../../fixtures/rag-fixtures';

// Mock the RAG modules
vi.mock('@/lib/rag/init', () => ({
  initializeRAG: vi.fn(),
  getRAGHealthStatus: vi.fn(),
}));

vi.mock('@/lib/rag/vector-db/chroma-client', () => ({
  isRAGEnabled: vi.fn(),
}));

describe('GET /api/rag/health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('[P0] 6.1-API-001: should return disabled status when RAG_ENABLED=false', async () => {
    // GIVEN: RAG is disabled
    const chromaModule = await import('@/lib/rag/vector-db/chroma-client');
    vi.mocked(chromaModule.isRAGEnabled).mockReturnValue(false);

    // WHEN: Health endpoint is called
    const { GET } = await import('@/app/api/rag/health/route');
    const response = await GET();
    const body = await response.json();

    // THEN: Response indicates RAG is disabled
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.enabled).toBe(false);
    expect(body.message).toContain('RAG is disabled');
    expect(body.data.overall).toBe('disabled');
  });

  it('[P0] 6.1-API-002: should return healthy status when RAG works', async () => {
    // GIVEN: RAG is enabled and all services healthy
    const chromaModule = await import('@/lib/rag/vector-db/chroma-client');
    vi.mocked(chromaModule.isRAGEnabled).mockReturnValue(true);

    const initModule = await import('@/lib/rag/init');
    vi.mocked(initModule.initializeRAG).mockResolvedValue({
      success: true,
      chromadb: true,
      embeddings: true,
    });
    vi.mocked(initModule.getRAGHealthStatus).mockResolvedValue({
      chromadb: { connected: true },
      collections: {
        channel_content: 10,
        news_articles: 25,
        trending_topics: 5,
      },
      embeddings: {
        available: true,
        model: 'all-MiniLM-L6-v2',
        dimensions: 384,
      },
      overall: 'healthy',
    });

    // WHEN: Health endpoint is called
    const { GET } = await import('@/app/api/rag/health/route');
    const response = await GET();
    const body = await response.json();

    // THEN: Response indicates healthy status
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.enabled).toBe(true);
    expect(body.data.overall).toBe('healthy');
    expect(body.data.chromadb.connected).toBe(true);
    expect(body.data.embeddings.available).toBe(true);
    expect(body.data.embeddings.model).toBe('all-MiniLM-L6-v2');
    expect(body.data.embeddings.dimensions).toBe(384);
  });

  it('[P0] 6.1-API-003: should return collection counts', async () => {
    // GIVEN: RAG is enabled with documents in collections
    const chromaModule = await import('@/lib/rag/vector-db/chroma-client');
    vi.mocked(chromaModule.isRAGEnabled).mockReturnValue(true);

    const initModule = await import('@/lib/rag/init');
    vi.mocked(initModule.initializeRAG).mockResolvedValue({ success: true });
    vi.mocked(initModule.getRAGHealthStatus).mockResolvedValue({
      chromadb: { connected: true },
      collections: {
        channel_content: 42,
        news_articles: 100,
        trending_topics: 15,
      },
      embeddings: { available: true, model: 'all-MiniLM-L6-v2', dimensions: 384 },
      overall: 'healthy',
    });

    // WHEN: Health endpoint is called
    const { GET } = await import('@/app/api/rag/health/route');
    const response = await GET();
    const body = await response.json();

    // THEN: Collection counts are included
    expect(body.data.collections.channel_content).toBe(42);
    expect(body.data.collections.news_articles).toBe(100);
    expect(body.data.collections.trending_topics).toBe(15);
  });

  it('[P1] 6.1-API-004: should return degraded status with partial failure', async () => {
    // GIVEN: RAG enabled but embeddings service unavailable
    const chromaModule = await import('@/lib/rag/vector-db/chroma-client');
    vi.mocked(chromaModule.isRAGEnabled).mockReturnValue(true);

    const initModule = await import('@/lib/rag/init');
    vi.mocked(initModule.initializeRAG).mockResolvedValue({
      success: true,
      chromadb: true,
      embeddings: false,
    });
    vi.mocked(initModule.getRAGHealthStatus).mockResolvedValue({
      chromadb: { connected: true },
      collections: {
        channel_content: 10,
        news_articles: 25,
        trending_topics: 5,
      },
      embeddings: {
        available: false,
        model: 'all-MiniLM-L6-v2',
        dimensions: 384,
        error: 'Python process not running',
      },
      overall: 'degraded',
    });

    // WHEN: Health endpoint is called
    const { GET } = await import('@/app/api/rag/health/route');
    const response = await GET();
    const body = await response.json();

    // THEN: Response indicates degraded status
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.overall).toBe('degraded');
    expect(body.data.embeddings.available).toBe(false);
    expect(body.data.embeddings.error).toBeDefined();
  });

  it('[P1] 6.1-API-005: should return 500 on initialization failure', async () => {
    // GIVEN: RAG enabled but initialization throws
    const chromaModule = await import('@/lib/rag/vector-db/chroma-client');
    vi.mocked(chromaModule.isRAGEnabled).mockReturnValue(true);

    const initModule = await import('@/lib/rag/init');
    vi.mocked(initModule.initializeRAG).mockRejectedValue(
      new Error('ChromaDB connection timeout')
    );

    // WHEN: Health endpoint is called
    const { GET } = await import('@/app/api/rag/health/route');
    const response = await GET();
    const body = await response.json();

    // THEN: Response is 500 with error details
    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('HEALTH_CHECK_FAILED');
    expect(body.error.message).toContain('ChromaDB connection timeout');
  });

  it('[P2] 6.1-API-006: should call initializeRAG before checking health', async () => {
    // GIVEN: RAG enabled
    const chromaModule = await import('@/lib/rag/vector-db/chroma-client');
    vi.mocked(chromaModule.isRAGEnabled).mockReturnValue(true);

    const initModule = await import('@/lib/rag/init');
    vi.mocked(initModule.initializeRAG).mockResolvedValue({ success: true });
    vi.mocked(initModule.getRAGHealthStatus).mockResolvedValue({
      chromadb: { connected: true },
      collections: { channel_content: 0, news_articles: 0, trending_topics: 0 },
      embeddings: { available: true, model: 'all-MiniLM-L6-v2', dimensions: 384 },
      overall: 'healthy',
    });

    // WHEN: Health endpoint is called
    const { GET } = await import('@/app/api/rag/health/route');
    await GET();

    // THEN: initializeRAG was called before getRAGHealthStatus
    expect(initModule.initializeRAG).toHaveBeenCalled();
    expect(initModule.getRAGHealthStatus).toHaveBeenCalled();
  });

  it('[P2] 6.1-API-007: should handle getRAGHealthStatus failure', async () => {
    // GIVEN: initializeRAG works but getRAGHealthStatus fails
    const chromaModule = await import('@/lib/rag/vector-db/chroma-client');
    vi.mocked(chromaModule.isRAGEnabled).mockReturnValue(true);

    const initModule = await import('@/lib/rag/init');
    vi.mocked(initModule.initializeRAG).mockResolvedValue({ success: true });
    vi.mocked(initModule.getRAGHealthStatus).mockRejectedValue(
      new Error('Failed to query collection counts')
    );

    // WHEN: Health endpoint is called
    const { GET } = await import('@/app/api/rag/health/route');
    const response = await GET();
    const body = await response.json();

    // THEN: Response is 500 with error
    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.message).toContain('Failed to query collection counts');
  });
});
