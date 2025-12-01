/**
 * RAG Retrieval Module Index
 *
 * Exports semantic search, context building, and token management.
 * Story 6.5 - RAG Retrieval & Context Building
 */

// Semantic Search
export {
  queryRelevantContent,
  queryMultipleCollections,
  clearEmbeddingCache,
  getCacheStats,
  type SearchOptions,
  type MetadataFilters
} from './semantic-search';

// Context Builder
export {
  retrieveRAGContext,
  getProjectRAGConfig,
  isProjectRAGEnabled,
  getProjectUserChannelId,
  getProjectCompetitorChannels,
  getProjectNiche,
  getRAGContextStats,
  type ContextBuilderOptions,
  type RAGContextStats
} from './context-builder';

// Token Counter
export {
  countTokens,
  countDocumentTokens,
  countDocumentsTokens,
  countRAGContextTokens,
  truncateRAGContext,
  formatRAGContextForPrompt,
  DEFAULT_MAX_TOKENS
} from './token-counter';
