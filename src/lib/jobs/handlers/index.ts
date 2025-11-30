/**
 * Job Handlers Index - Story 6.2
 *
 * Central export point for all job handlers.
 */

export { ragSyncChannelHandler } from './rag-sync';
export { ragSyncNewsHandler } from './news-fetch';
export { embeddingGenerationHandler } from './embedding';
export { cacheCleanupHandler } from './cleanup';

/**
 * Register all handlers with the job processor
 */
export function registerAllHandlers(): void {
  // Dynamically import to avoid circular dependencies
  import('../processor').then(({ jobProcessor }) => {
    import('./rag-sync').then(({ ragSyncChannelHandler }) => {
      jobProcessor.registerHandler('rag_sync_channel', ragSyncChannelHandler);
      jobProcessor.registerHandler('rag_sync_trends', ragSyncChannelHandler);
    });

    import('./news-fetch').then(({ ragSyncNewsHandler }) => {
      jobProcessor.registerHandler('rag_sync_news', ragSyncNewsHandler);
    });

    import('./embedding').then(({ embeddingGenerationHandler }) => {
      jobProcessor.registerHandler('embedding_generation', embeddingGenerationHandler);
    });

    import('./cleanup').then(({ cacheCleanupHandler }) => {
      jobProcessor.registerHandler('cache_cleanup', cacheCleanupHandler);
    });

    console.log('[JobHandlers] All handlers registered');
  });
}
