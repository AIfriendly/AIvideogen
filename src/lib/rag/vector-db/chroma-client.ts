/**
 * ChromaDB Client Wrapper
 *
 * Manages ChromaDB connection, collection initialization, and operations.
 * Uses local persistence in .cache/chroma directory.
 * Story 6.1 - RAG Infrastructure Setup
 */

import path from 'path';
import { ChromaCollection, RAGHealthStatus } from '../types';

// ChromaDB client instance (lazy loaded)
let chromaClient: ChromaDBClient | null = null;

// Collection names
export const CHROMA_COLLECTIONS: ChromaCollection[] = [
  'channel_content',
  'news_articles',
  'trending_topics'
];

// ChromaDB persistence path
const CHROMA_PATH = path.join(process.cwd(), '.cache', 'chroma');

/**
 * ChromaDB client wrapper class
 */
export class ChromaDBClient {
  private client: import('chromadb').ChromaClient | null = null;
  private collections: Map<ChromaCollection, import('chromadb').Collection> = new Map();
  private initialized = false;
  private initializationError: Error | null = null;

  /**
   * Initialize ChromaDB client and collections
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Dynamic import to handle cases where chromadb is not installed
      const { ChromaClient } = await import('chromadb');

      // Create ChromaDB client with local persistence
      this.client = new ChromaClient({
        path: CHROMA_PATH
      });

      // Initialize all collections
      for (const collectionName of CHROMA_COLLECTIONS) {
        const collection = await this.client.getOrCreateCollection({
          name: collectionName,
          metadata: {
            description: `AI Video Generator RAG - ${collectionName}`,
            created: new Date().toISOString()
          }
        });
        this.collections.set(collectionName, collection);
      }

      this.initialized = true;
      console.log(`ChromaDB initialized with ${CHROMA_COLLECTIONS.length} collections at ${CHROMA_PATH}`);
    } catch (error) {
      this.initializationError = error instanceof Error ? error : new Error('Unknown ChromaDB initialization error');
      console.error('Failed to initialize ChromaDB:', this.initializationError.message);
      throw this.initializationError;
    }
  }

  /**
   * Check if ChromaDB is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get initialization error if any
   */
  getInitializationError(): Error | null {
    return this.initializationError;
  }

  /**
   * Get a collection by name
   */
  getCollection(name: ChromaCollection): import('chromadb').Collection {
    const collection = this.collections.get(name);
    if (!collection) {
      throw new Error(`Collection ${name} not found. Ensure ChromaDB is initialized.`);
    }
    return collection;
  }

  /**
   * Add documents to a collection
   */
  async addDocuments(
    collectionName: ChromaCollection,
    documents: {
      ids: string[];
      embeddings: number[][];
      documents: string[];
      metadatas: Record<string, unknown>[];
    }
  ): Promise<void> {
    const collection = this.getCollection(collectionName);
    await collection.add({
      ids: documents.ids,
      embeddings: documents.embeddings,
      documents: documents.documents,
      metadatas: documents.metadatas as import('chromadb').Metadata[]
    });
  }

  /**
   * Query a collection for similar documents
   */
  async query(
    collectionName: ChromaCollection,
    queryEmbedding: number[],
    nResults: number = 5,
    whereFilter?: Record<string, unknown>
  ): Promise<{
    ids: string[];
    documents: string[];
    metadatas: Record<string, unknown>[];
    distances: number[];
  }> {
    const collection = this.getCollection(collectionName);

    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults,
      where: whereFilter as import('chromadb').Where
    });

    return {
      ids: results.ids[0] || [],
      documents: (results.documents?.[0] || []) as string[],
      metadatas: (results.metadatas?.[0] || []) as Record<string, unknown>[],
      distances: results.distances?.[0] || []
    };
  }

  /**
   * Get count of documents in a collection
   */
  async getCollectionCount(collectionName: ChromaCollection): Promise<number> {
    const collection = this.getCollection(collectionName);
    return await collection.count();
  }

  /**
   * Delete documents from a collection
   */
  async deleteDocuments(
    collectionName: ChromaCollection,
    ids: string[]
  ): Promise<void> {
    const collection = this.getCollection(collectionName);
    await collection.delete({ ids });
  }

  /**
   * Update documents in a collection
   */
  async updateDocuments(
    collectionName: ChromaCollection,
    documents: {
      ids: string[];
      embeddings?: number[][];
      documents?: string[];
      metadatas?: Record<string, unknown>[];
    }
  ): Promise<void> {
    const collection = this.getCollection(collectionName);
    await collection.update({
      ids: documents.ids,
      embeddings: documents.embeddings,
      documents: documents.documents,
      metadatas: documents.metadatas as import('chromadb').Metadata[]
    });
  }

  /**
   * Get health status
   */
  async getHealthStatus(): Promise<Omit<RAGHealthStatus, 'embeddings' | 'overall'>> {
    const status: Omit<RAGHealthStatus, 'embeddings' | 'overall'> = {
      chromadb: {
        connected: false
      },
      collections: {
        channel_content: 0,
        news_articles: 0,
        trending_topics: 0
      }
    };

    if (!this.initialized) {
      status.chromadb.error = this.initializationError?.message || 'Not initialized';
      return status;
    }

    try {
      // Check connection by getting collection counts
      for (const collectionName of CHROMA_COLLECTIONS) {
        status.collections[collectionName] = await this.getCollectionCount(collectionName);
      }
      status.chromadb.connected = true;
    } catch (error) {
      status.chromadb.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return status;
  }

  /**
   * Close the client connection
   */
  async close(): Promise<void> {
    this.collections.clear();
    this.client = null;
    this.initialized = false;
    console.log('ChromaDB client closed');
  }
}

/**
 * Get the singleton ChromaDB client instance
 */
export async function getChromaClient(): Promise<ChromaDBClient> {
  if (!chromaClient) {
    chromaClient = new ChromaDBClient();
    await chromaClient.initialize();
  }
  return chromaClient;
}

/**
 * Check if RAG is enabled via environment variable
 */
export function isRAGEnabled(): boolean {
  const ragEnabled = process.env.RAG_ENABLED;
  return ragEnabled === 'true' || ragEnabled === '1';
}

/**
 * Get ChromaDB client if RAG is enabled, otherwise return null
 */
export async function getChromaClientIfEnabled(): Promise<ChromaDBClient | null> {
  if (!isRAGEnabled()) {
    return null;
  }
  return getChromaClient();
}
