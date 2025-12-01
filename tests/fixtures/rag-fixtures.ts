/**
 * RAG Test Fixtures - Story 6.1
 *
 * Test fixtures for RAG infrastructure testing.
 * Provides mocked ChromaDB, embeddings, and database fixtures.
 */

import { vi, beforeEach, afterEach } from 'vitest';

// Mock ChromaDB client for testing
export interface MockChromaCollection {
  add: ReturnType<typeof vi.fn>;
  query: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
}

export interface MockChromaClient {
  getOrCreateCollection: ReturnType<typeof vi.fn>;
  collections: Map<string, MockChromaCollection>;
}

export function createMockChromaCollection(): MockChromaCollection {
  return {
    add: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockResolvedValue({
      ids: [['doc-1', 'doc-2']],
      documents: [['Document 1 content', 'Document 2 content']],
      metadatas: [[{ source: 'test' }, { source: 'test' }]],
      distances: [[0.1, 0.2]],
    }),
    count: vi.fn().mockResolvedValue(0),
    delete: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
  };
}

export function createMockChromaClient(): MockChromaClient {
  const collections = new Map<string, MockChromaCollection>();

  return {
    getOrCreateCollection: vi.fn().mockImplementation(async ({ name }) => {
      if (!collections.has(name)) {
        collections.set(name, createMockChromaCollection());
      }
      return collections.get(name);
    }),
    collections,
  };
}

// Mock embeddings service for testing
export interface MockEmbeddingsService {
  embed: ReturnType<typeof vi.fn>;
  embedSingle: ReturnType<typeof vi.fn>;
  getHealth: ReturnType<typeof vi.fn>;
  isReady: ReturnType<typeof vi.fn>;
  initialize: ReturnType<typeof vi.fn>;
  shutdown: ReturnType<typeof vi.fn>;
}

export function createMockEmbeddingsService(dimensions: number = 384): MockEmbeddingsService {
  const mockEmbedding = Array.from({ length: dimensions }, () => Math.random() * 2 - 1);

  return {
    embed: vi.fn().mockImplementation(async (texts: string[]) => {
      return texts.map(() => ({
        embedding: [...mockEmbedding],
        dimensions,
        model: 'all-MiniLM-L6-v2',
      }));
    }),
    embedSingle: vi.fn().mockResolvedValue({
      embedding: mockEmbedding,
      dimensions,
      model: 'all-MiniLM-L6-v2',
    }),
    getHealth: vi.fn().mockResolvedValue({
      available: true,
      model: 'all-MiniLM-L6-v2',
      dimensions,
    }),
    isReady: vi.fn().mockReturnValue(true),
    initialize: vi.fn().mockResolvedValue(undefined),
    shutdown: vi.fn().mockResolvedValue(undefined),
  };
}

// Environment variable helpers
export function withRAGEnabled<T>(fn: () => T | Promise<T>): () => Promise<T> {
  return async () => {
    const original = process.env.RAG_ENABLED;
    process.env.RAG_ENABLED = 'true';
    try {
      return await fn();
    } finally {
      if (original !== undefined) {
        process.env.RAG_ENABLED = original;
      } else {
        delete process.env.RAG_ENABLED;
      }
    }
  };
}

export function withRAGDisabled<T>(fn: () => T | Promise<T>): () => Promise<T> {
  return async () => {
    const original = process.env.RAG_ENABLED;
    delete process.env.RAG_ENABLED;
    try {
      return await fn();
    } finally {
      if (original !== undefined) {
        process.env.RAG_ENABLED = original;
      }
    }
  };
}

// Database test helpers
export interface TestDatabase {
  exec: (sql: string) => void;
  prepare: (sql: string) => {
    run: (...params: unknown[]) => void;
    get: (...params: unknown[]) => unknown;
    all: (...params: unknown[]) => unknown[];
  };
  close: () => void;
}

export function createTestDatabase(): TestDatabase {
  // Mock database for unit tests
  const mockPrepare = vi.fn().mockReturnValue({
    run: vi.fn(),
    get: vi.fn(),
    all: vi.fn().mockReturnValue([]),
  });

  return {
    exec: vi.fn(),
    prepare: mockPrepare,
    close: vi.fn(),
  };
}

// Cleanup tracker for fixture teardown
export class CleanupTracker {
  private cleanupFns: (() => void | Promise<void>)[] = [];

  track(fn: () => void | Promise<void>): void {
    this.cleanupFns.push(fn);
  }

  async cleanup(): Promise<void> {
    for (const fn of this.cleanupFns.reverse()) {
      await fn();
    }
    this.cleanupFns = [];
  }
}

// Setup/teardown helpers for test suites
export function setupRAGMocks() {
  const mockChromaClient = createMockChromaClient();
  const mockEmbeddingsService = createMockEmbeddingsService();
  const cleanup = new CleanupTracker();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await cleanup.cleanup();
    vi.restoreAllMocks();
  });

  return {
    mockChromaClient,
    mockEmbeddingsService,
    cleanup,
  };
}

// Mock Python subprocess for embeddings
export function mockPythonSubprocess() {
  const mockSpawn = vi.fn().mockReturnValue({
    stdout: {
      on: vi.fn((event, callback) => {
        if (event === 'data') {
          // Simulate ready response
          setTimeout(() => {
            callback(Buffer.from(JSON.stringify({
              status: 'ready',
              model: 'all-MiniLM-L6-v2',
              dimensions: 384,
            }) + '\n'));
          }, 10);
        }
      }),
    },
    stderr: {
      on: vi.fn(),
    },
    stdin: {
      write: vi.fn((_data, callback) => callback?.()),
    },
    on: vi.fn(),
    kill: vi.fn(),
  });

  vi.mock('child_process', () => ({
    spawn: mockSpawn,
  }));

  return mockSpawn;
}

// Mock ChromaDB module
export function mockChromaDBModule() {
  const mockClient = createMockChromaClient();

  vi.mock('chromadb', () => ({
    ChromaClient: vi.fn().mockImplementation(() => mockClient),
  }));

  return mockClient;
}
