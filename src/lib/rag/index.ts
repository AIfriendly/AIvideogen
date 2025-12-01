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

// Retrieval (Story 6.5)
export {
  queryRelevantContent,
  queryMultipleCollections,
  clearEmbeddingCache,
  getCacheStats,
  retrieveRAGContext,
  getProjectRAGConfig,
  isProjectRAGEnabled,
  getProjectUserChannelId,
  getProjectCompetitorChannels,
  getProjectNiche,
  getRAGContextStats,
  countTokens,
  countRAGContextTokens,
  truncateRAGContext,
  formatRAGContextForPrompt,
  DEFAULT_MAX_TOKENS,
  type SearchOptions,
  type MetadataFilters,
  type ContextBuilderOptions,
  type RAGContextStats
} from './retrieval';

// Generation (Story 6.6)
export {
  buildRAGPrompt,
  formatChannelContent,
  formatCompetitorContent,
  formatNewsContent,
  formatTrendingTopics,
  getRAGContextUsage,
  getRAGContextMessage,
  type RAGContextUsage
} from './generation';
