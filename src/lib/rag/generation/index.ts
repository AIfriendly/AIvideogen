/**
 * RAG Generation Module Exports
 *
 * Story 6.6 - RAG-Augmented Script Generation
 */

export {
  buildRAGPrompt,
  formatChannelContent,
  formatCompetitorContent,
  formatNewsContent,
  formatTrendingTopics,
  getRAGContextUsage,
  getRAGContextMessage,
  type RAGContextUsage
} from './rag-script-generator';

export {
  RAG_CONTEXT_HEADER,
  CHANNEL_STYLE_SECTION,
  COMPETITOR_SECTION,
  NEWS_SECTION,
  TRENDS_SECTION,
  RAG_CONTEXT_FOOTER,
  ESTABLISHED_CHANNEL_INSTRUCTION,
  COLD_START_INSTRUCTION,
  NEWS_INTEGRATION_INSTRUCTION,
  EMPTY_CONTEXT_MESSAGE
} from './rag-prompt-templates';
