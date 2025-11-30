/**
 * RAG System Initialization
 *
 * Initializes the RAG infrastructure including ChromaDB and embeddings service.
 * Provides graceful degradation when components are unavailable.
 * Story 6.1 - RAG Infrastructure Setup
 */

import { getChromaClient, isRAGEnabled, ChromaDBClient } from './vector-db/chroma-client';
import { getEmbeddingsService, LocalEmbeddingsService } from './embeddings/local-embeddings';
import { RAGHealthStatus } from './types';

// Global initialization state
let ragInitialized = false;
let ragInitPromise: Promise<void> | null = null;
let chromaClient: ChromaDBClient | null = null;
let embeddingsService: LocalEmbeddingsService | null = null;

/**
 * Initialize the RAG system
 *
 * This function initializes ChromaDB and the embeddings service.
 * It is idempotent and safe to call multiple times.
 * RAG initialization is optional and will not block the application if it fails.
 */
export async function initializeRAG(): Promise<{
  success: boolean;
  chromadb: boolean;
  embeddings: boolean;
  error?: string;
}> {
  // Check if RAG is enabled
  if (!isRAGEnabled()) {
    console.log('RAG is disabled (RAG_ENABLED not set to true)');
    return {
      success: true,
      chromadb: false,
      embeddings: false,
      error: 'RAG is disabled via environment variable'
    };
  }

  // If already initialized, return success
  if (ragInitialized) {
    return {
      success: true,
      chromadb: chromaClient?.isInitialized() ?? false,
      embeddings: embeddingsService?.isReady() ?? false
    };
  }

  // If initialization is in progress, wait for it
  if (ragInitPromise) {
    await ragInitPromise;
    return {
      success: ragInitialized,
      chromadb: chromaClient?.isInitialized() ?? false,
      embeddings: embeddingsService?.isReady() ?? false
    };
  }

  // Start initialization
  ragInitPromise = (async () => {
    console.log('Initializing RAG system...');

    let chromaSuccess = false;
    let embeddingsSuccess = false;

    // Initialize ChromaDB
    try {
      console.log('Initializing ChromaDB...');
      chromaClient = await getChromaClient();
      chromaSuccess = chromaClient.isInitialized();
      console.log('ChromaDB initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ChromaDB:', error);
      // Continue - ChromaDB failure is not fatal
    }

    // Initialize Embeddings Service
    try {
      console.log('Initializing Embeddings Service...');
      embeddingsService = await getEmbeddingsService();
      embeddingsSuccess = embeddingsService.isReady();
      console.log('Embeddings Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Embeddings Service:', error);
      // Continue - Embeddings failure is not fatal
    }

    ragInitialized = chromaSuccess || embeddingsSuccess;

    if (ragInitialized) {
      console.log('RAG system initialized (partial or full)');
    } else {
      console.warn('RAG system initialization failed - all components unavailable');
    }
  })();

  await ragInitPromise;

  return {
    success: ragInitialized,
    chromadb: chromaClient?.isInitialized() ?? false,
    embeddings: embeddingsService?.isReady() ?? false
  };
}

/**
 * Get RAG health status
 */
export async function getRAGHealthStatus(): Promise<RAGHealthStatus> {
  const status: RAGHealthStatus = {
    chromadb: {
      connected: false
    },
    collections: {
      channel_content: 0,
      news_articles: 0,
      trending_topics: 0
    },
    embeddings: {
      available: false,
      model: 'all-MiniLM-L6-v2',
      dimensions: 384
    },
    overall: 'unhealthy'
  };

  // Check if RAG is enabled
  if (!isRAGEnabled()) {
    status.chromadb.error = 'RAG disabled';
    status.embeddings.error = 'RAG disabled';
    return status;
  }

  // Get ChromaDB status
  if (chromaClient) {
    const chromaStatus = await chromaClient.getHealthStatus();
    status.chromadb = chromaStatus.chromadb;
    status.collections = chromaStatus.collections;
  } else {
    status.chromadb.error = 'Not initialized';
  }

  // Get Embeddings status
  if (embeddingsService) {
    const embeddingsHealth = await embeddingsService.getHealth();
    status.embeddings = embeddingsHealth;
  } else {
    status.embeddings.error = 'Not initialized';
  }

  // Determine overall health
  if (status.chromadb.connected && status.embeddings.available) {
    status.overall = 'healthy';
  } else if (status.chromadb.connected || status.embeddings.available) {
    status.overall = 'degraded';
  } else {
    status.overall = 'unhealthy';
  }

  return status;
}

/**
 * Check if RAG is initialized and available
 */
export function isRAGInitialized(): boolean {
  return ragInitialized;
}

/**
 * Get the ChromaDB client (if initialized)
 */
export function getChromaClientInstance(): ChromaDBClient | null {
  return chromaClient;
}

/**
 * Get the Embeddings service (if initialized)
 */
export function getEmbeddingsServiceInstance(): LocalEmbeddingsService | null {
  return embeddingsService;
}

/**
 * Shutdown RAG system
 */
export async function shutdownRAG(): Promise<void> {
  console.log('Shutting down RAG system...');

  if (embeddingsService) {
    await embeddingsService.shutdown();
    embeddingsService = null;
  }

  if (chromaClient) {
    await chromaClient.close();
    chromaClient = null;
  }

  ragInitialized = false;
  ragInitPromise = null;

  console.log('RAG system shutdown complete');
}
