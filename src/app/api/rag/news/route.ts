/**
 * News Sources API - Story 6.4
 *
 * GET /api/rag/news - List all news sources
 */

import { NextResponse } from 'next/server';
import { getNewsSources, getNewsSyncStats } from '@/lib/db/queries-news';

/**
 * GET /api/rag/news
 *
 * Returns list of news sources with sync statistics
 */
export async function GET() {
  try {
    const sources = getNewsSources();
    const stats = getNewsSyncStats();

    return NextResponse.json({
      success: true,
      sources: sources.map(source => ({
        id: source.id,
        name: source.name,
        url: source.url,
        niche: source.niche,
        fetchMethod: source.fetchMethod,
        enabled: source.enabled,
        lastFetch: source.lastFetch,
        articleCount: source.articleCount,
        createdAt: source.createdAt
      })),
      stats: {
        totalSources: stats.totalSources,
        enabledSources: stats.enabledSources,
        totalArticles: stats.totalArticles,
        embeddedArticles: stats.embeddedArticles,
        pendingArticles: stats.pendingArticles
      }
    });
  } catch (error) {
    console.error('[API] GET /api/rag/news error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch news sources'
      },
      { status: 500 }
    );
  }
}
