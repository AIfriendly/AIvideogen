/**
 * RAG Context API Endpoint
 *
 * GET /api/projects/[id]/rag-context - Preview RAG context for a project
 *
 * Story 6.5 - RAG Retrieval & Context Building
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProjectById } from '@/lib/db/project-queries';
import { initializeDatabase } from '@/lib/db/init';
import {
  retrieveRAGContext,
  getProjectRAGConfig,
  getRAGContextStats,
  formatRAGContextForPrompt
} from '@/lib/rag/retrieval';

// Initialize database on first import
initializeDatabase();

/**
 * GET /api/projects/[id]/rag-context
 *
 * Preview RAG context for a project with a given query.
 * Useful for debugging and displaying context to users.
 *
 * Query Parameters:
 * - query: Required. The topic/query to search for.
 * - format: Optional. "raw" | "formatted". Default "raw".
 * - maxTokens: Optional. Maximum tokens for context. Default 4000.
 *
 * Success Response (200):
 * {
 *   "success": true,
 *   "data": {
 *     "ragEnabled": true,
 *     "config": { ... },
 *     "context": { ... },
 *     "stats": {
 *       "channelContentCount": 5,
 *       "competitorContentCount": 3,
 *       "newsArticlesCount": 5,
 *       "trendingTopicsCount": 0,
 *       "totalDocuments": 13,
 *       "estimatedTokens": 2500
 *     },
 *     "formatted": "..." // Only if format=formatted
 *   }
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // Validate project ID
    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Project ID is required',
            code: 'INVALID_REQUEST'
          }
        },
        { status: 400 }
      );
    }

    // Verify project exists
    const project = getProjectById(projectId);
    if (!project) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Project not found',
            code: 'NOT_FOUND'
          }
        },
        { status: 404 }
      );
    }

    // Get query parameter
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const format = searchParams.get('format') || 'raw';
    const maxTokensParam = searchParams.get('maxTokens');
    const maxTokens = maxTokensParam ? parseInt(maxTokensParam, 10) : 4000;

    if (!query) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Query parameter is required',
            code: 'INVALID_REQUEST'
          }
        },
        { status: 400 }
      );
    }

    // Get RAG configuration
    const { enabled: ragEnabled, config } = getProjectRAGConfig(projectId);

    // Retrieve RAG context
    const context = await retrieveRAGContext(projectId, query, {
      maxTokens
    });

    // Calculate statistics
    const stats = getRAGContextStats(context);

    // Build response
    const responseData: Record<string, unknown> = {
      ragEnabled,
      config,
      context,
      stats
    };

    // Add formatted version if requested
    if (format === 'formatted') {
      responseData.formatted = formatRAGContextForPrompt(context);
    }

    return NextResponse.json(
      {
        success: true,
        data: responseData
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API Error] GET /api/projects/[id]/rag-context:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to retrieve RAG context',
          code: 'INTERNAL_ERROR'
        }
      },
      { status: 500 }
    );
  }
}
