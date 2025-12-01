/**
 * News Embedding Service
 *
 * Story 6.4 - News Feed Aggregation & Embedding
 *
 * Generates embeddings for news articles and stores them in ChromaDB.
 * Follows the same pattern established in channel-sync.ts for YouTube transcripts.
 */

import { randomUUID } from 'crypto';
import { generateEmbedding, generateEmbeddings } from '../embeddings/local-embeddings';
import { getChromaClient } from '../vector-db/chroma-client';
import {
  NewsArticleRecord,
  updateArticleEmbeddingStatus
} from '@/lib/db/queries-news';

/**
 * Result of embedding a single article
 */
export interface ArticleEmbeddingResult {
  articleId: string;
  success: boolean;
  embeddingId?: string;
  error?: string;
}

/**
 * Result of batch embedding
 */
export interface BatchEmbeddingResult {
  total: number;
  successful: number;
  failed: number;
  results: ArticleEmbeddingResult[];
}

/**
 * Embed a single news article and store in ChromaDB
 */
export async function embedNewsArticle(
  article: NewsArticleRecord
): Promise<ArticleEmbeddingResult> {
  try {
    // Mark as processing
    updateArticleEmbeddingStatus(article.id, 'processing');

    // Generate text for embedding (headline + summary)
    const embeddingText = `${article.headline}\n\n${article.summary || ''}`.trim();

    // Generate embedding
    const embeddingResult = await generateEmbedding(embeddingText);

    // Create unique embedding ID
    const embeddingId = `news_${article.id}_${randomUUID().slice(0, 8)}`;

    // Store in ChromaDB
    const chromaClient = await getChromaClient();
    await chromaClient.addDocuments('news_articles', {
      ids: [embeddingId],
      embeddings: [embeddingResult.embedding],
      documents: [embeddingText],
      metadatas: [{
        articleId: article.id,
        sourceId: article.sourceId,
        headline: article.headline,
        url: article.url,
        publishedAt: article.publishedAt || '',
        niche: article.niche || 'general',
        type: 'news_article'
      }]
    });

    // Update database with success
    updateArticleEmbeddingStatus(article.id, 'embedded', embeddingId);

    return {
      articleId: article.id,
      success: true,
      embeddingId
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[NewsEmbedding] Failed to embed article ${article.id}:`, errorMessage);

    // Update database with error
    updateArticleEmbeddingStatus(article.id, 'error');

    return {
      articleId: article.id,
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Embed multiple news articles in batch
 */
export async function embedNewsArticles(
  articles: NewsArticleRecord[],
  batchSize: number = 10
): Promise<BatchEmbeddingResult> {
  const results: ArticleEmbeddingResult[] = [];

  // Process in batches
  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);

    // Generate texts for batch
    const texts = batch.map(article =>
      `${article.headline}\n\n${article.summary || ''}`.trim()
    );

    // Mark all as processing
    for (const article of batch) {
      updateArticleEmbeddingStatus(article.id, 'processing');
    }

    try {
      // Generate embeddings for batch
      const embeddingResults = await generateEmbeddings(texts);

      // Store each in ChromaDB
      const chromaClient = await getChromaClient();

      for (let j = 0; j < batch.length; j++) {
        const article = batch[j];
        const embeddingResult = embeddingResults[j];

        try {
          const embeddingId = `news_${article.id}_${randomUUID().slice(0, 8)}`;

          await chromaClient.addDocuments('news_articles', {
            ids: [embeddingId],
            embeddings: [embeddingResult.embedding],
            documents: [texts[j]],
            metadatas: [{
              articleId: article.id,
              sourceId: article.sourceId,
              headline: article.headline,
              url: article.url,
              publishedAt: article.publishedAt || '',
              niche: article.niche || 'general',
              type: 'news_article'
            }]
          });

          updateArticleEmbeddingStatus(article.id, 'embedded', embeddingId);

          results.push({
            articleId: article.id,
            success: true,
            embeddingId
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`[NewsEmbedding] Failed to store embedding for ${article.id}:`, errorMessage);

          updateArticleEmbeddingStatus(article.id, 'error');

          results.push({
            articleId: article.id,
            success: false,
            error: errorMessage
          });
        }
      }
    } catch (error) {
      // Batch embedding generation failed - mark all as error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[NewsEmbedding] Batch embedding failed:`, errorMessage);

      for (const article of batch) {
        updateArticleEmbeddingStatus(article.id, 'error');
        results.push({
          articleId: article.id,
          success: false,
          error: errorMessage
        });
      }
    }
  }

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  return {
    total: articles.length,
    successful,
    failed,
    results
  };
}

/**
 * Delete embeddings from ChromaDB by embedding IDs
 */
export async function deleteNewsEmbeddings(embeddingIds: string[]): Promise<number> {
  if (embeddingIds.length === 0) {
    return 0;
  }

  try {
    const chromaClient = await getChromaClient();
    await chromaClient.deleteDocuments('news_articles', embeddingIds);
    return embeddingIds.length;
  } catch (error) {
    console.error('[NewsEmbedding] Failed to delete embeddings:', error);
    return 0;
  }
}
