/**
 * News Source API - Story 6.4
 *
 * GET /api/rag/news/[id] - Get a specific news source
 * PATCH /api/rag/news/[id] - Toggle enabled status
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getNewsSourceById,
  toggleNewsSourceEnabled,
  getNewsArticlesBySource
} from '@/lib/db/queries-news';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/rag/news/[id]
 *
 * Returns details for a specific news source
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const source = getNewsSourceById(id);

    if (!source) {
      return NextResponse.json(
        { success: false, error: 'News source not found' },
        { status: 404 }
      );
    }

    // Get recent articles for this source
    const recentArticles = getNewsArticlesBySource(id, 10);

    return NextResponse.json({
      success: true,
      source: {
        id: source.id,
        name: source.name,
        url: source.url,
        niche: source.niche,
        fetchMethod: source.fetchMethod,
        enabled: source.enabled,
        lastFetch: source.lastFetch,
        articleCount: source.articleCount,
        createdAt: source.createdAt
      },
      recentArticles: recentArticles.map(article => ({
        id: article.id,
        headline: article.headline,
        url: article.url,
        publishedAt: article.publishedAt,
        embeddingStatus: article.embeddingStatus
      }))
    });
  } catch (error) {
    console.error('[API] GET /api/rag/news/[id] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch news source'
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/rag/news/[id]
 *
 * Toggle the enabled status of a news source
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { enabled } = body;

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'enabled must be a boolean' },
        { status: 400 }
      );
    }

    const source = getNewsSourceById(id);
    if (!source) {
      return NextResponse.json(
        { success: false, error: 'News source not found' },
        { status: 404 }
      );
    }

    toggleNewsSourceEnabled(id, enabled);

    return NextResponse.json({
      success: true,
      source: {
        id: source.id,
        name: source.name,
        enabled
      }
    });
  } catch (error) {
    console.error('[API] PATCH /api/rag/news/[id] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update news source'
      },
      { status: 500 }
    );
  }
}
