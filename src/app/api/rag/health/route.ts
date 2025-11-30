/**
 * RAG Health Check API Endpoint
 *
 * Returns the health status of the RAG system including:
 * - ChromaDB connection status
 * - Collection counts
 * - Embeddings service status
 * - Overall health
 *
 * GET /api/rag/health
 *
 * Story 6.1 - RAG Infrastructure Setup
 */

import { NextResponse } from 'next/server';
import { getRAGHealthStatus, initializeRAG } from '@/lib/rag/init';
import { isRAGEnabled } from '@/lib/rag/vector-db/chroma-client';

export async function GET(): Promise<NextResponse> {
  try {
    // Check if RAG is enabled
    if (!isRAGEnabled()) {
      return NextResponse.json({
        success: true,
        enabled: false,
        message: 'RAG is disabled. Set RAG_ENABLED=true to enable.',
        data: {
          chromadb: { connected: false, error: 'RAG disabled' },
          collections: { channel_content: 0, news_articles: 0, trending_topics: 0 },
          embeddings: { available: false, model: 'all-MiniLM-L6-v2', dimensions: 384, error: 'RAG disabled' },
          overall: 'disabled'
        }
      });
    }

    // Try to initialize RAG if not already initialized
    await initializeRAG();

    // Get health status
    const healthStatus = await getRAGHealthStatus();

    return NextResponse.json({
      success: true,
      enabled: true,
      data: healthStatus
    });

  } catch (error) {
    console.error('RAG health check failed:', error);

    return NextResponse.json(
      {
        success: false,
        enabled: isRAGEnabled(),
        error: {
          code: 'HEALTH_CHECK_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    );
  }
}
