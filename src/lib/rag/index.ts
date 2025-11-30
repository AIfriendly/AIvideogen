/**
 * RAG Module Exports
 *
 * Central export point for all RAG-related modules.
 * Story 6.1 - RAG Infrastructure Setup
 */

// Types
export * from './types';

// Vector Database
export {
  ChromaDBClient,
  getChromaClient,
  getChromaClientIfEnabled,
  isRAGEnabled,
  CHROMA_COLLECTIONS
} from './vector-db/chroma-client';

// Embeddings
export {
  LocalEmbeddingsService,
  getEmbeddingsService,
  generateEmbeddings,
  generateEmbedding,
  getEmbeddingsHealth
} from './embeddings/local-embeddings';

// Initialization
export {
  initializeRAG,
  getRAGHealthStatus,
  isRAGInitialized,
  getChromaClientInstance,
  getEmbeddingsServiceInstance,
  shutdownRAG
} from './init';
