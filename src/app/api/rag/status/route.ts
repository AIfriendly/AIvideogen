/**
 * RAG Status API Endpoint
 *
 * Get comprehensive RAG sync status and statistics.
 *
 * GET /api/rag/status
 *
 * Story 6.7 - Channel Intelligence UI & Setup Wizard
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProject } from '@/lib/db/queries';
import { getUserChannel, getCompetitorChannels, getAllChannels, getEmbeddedVideoCount, getChannelVideoCount } from '@/lib/db/queries-channels';
import { getNewsSyncStats, getTotalArticleCount } from '@/lib/db/queries-news';
import { jobQueue } from '@/lib/jobs/queue';
import { getRAGHealthStatus, isRAGInitialized } from '@/lib/rag/init';
import { isRAGEnabled } from '@/lib/rag/vector-db/chroma-client';
import type { RAGConfig } from '@/lib/rag/types';

/**
 * GET /api/rag/status
 *
 * Get RAG sync status and statistics.
 *
 * Query params:
 * - projectId: Optional project ID for project-specific config
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    // Check if RAG is enabled
    const ragEnabled = isRAGEnabled();
    const ragInitialized = isRAGInitialized();

    // Get channels info
    const userChannel = getUserChannel();
    const competitorChannels = getCompetitorChannels();
    const allChannels = getAllChannels();

    // Calculate video statistics
    let totalVideosIndexed = 0;
    let totalEmbeddedVideos = 0;
    for (const channel of allChannels) {
      totalVideosIndexed += getChannelVideoCount(channel.id);
      totalEmbeddedVideos += getEmbeddedVideoCount(channel.id);
    }

    // Get news statistics
    const newsStats = getNewsSyncStats();
    const totalNewsArticles = getTotalArticleCount();

    // Get job statistics
    const pendingJobs = jobQueue.getJobs({ status: ['pending', 'running'] });
    const recentJobs = jobQueue.getJobs({
      status: ['completed', 'failed'],
      limit: 5,
    });

    // Determine last sync time from channels
    let lastSync: string | null = null;
    for (const channel of allChannels) {
      if (channel.lastSync && (!lastSync || channel.lastSync > lastSync)) {
        lastSync = channel.lastSync;
      }
    }

    // Get project-specific RAG config if projectId provided
    let projectRagConfig: RAGConfig | null = null;
    if (projectId) {
      const project = getProject(projectId);
      if (project?.config_json) {
        const config = JSON.parse(project.config_json);
        projectRagConfig = config.rag || null;
      }
    }

    // Determine mode
    let mode: 'established' | 'cold_start' | 'not_configured' = 'not_configured';
    if (userChannel) {
      mode = 'established';
    } else if (competitorChannels.length > 0 || allChannels.length > 0) {
      mode = 'cold_start';
    }

    // Get RAG health if initialized
    let health = null;
    if (ragInitialized) {
      try {
        health = await getRAGHealthStatus();
      } catch (error) {
        console.error('[RAG Status] Failed to get health:', error);
      }
    }

    // Format last sync for display
    const formatLastSync = (date: string | null): string => {
      if (!date) return 'Never';
      const now = new Date();
      const syncDate = new Date(date);
      const diffMs = now.getTime() - syncDate.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      if (diffHours < 1) return 'Less than an hour ago';
      if (diffHours === 1) return '1 hour ago';
      if (diffHours < 24) return `${diffHours} hours ago`;
      if (diffDays === 1) return '1 day ago';
      return `${diffDays} days ago`;
    };

    return NextResponse.json({
      success: true,
      data: {
        enabled: ragEnabled,
        initialized: ragInitialized,
        configured: mode !== 'not_configured',
        mode,
        lastSync,
        lastSyncFormatted: formatLastSync(lastSync),
        stats: {
          channels: {
            total: allChannels.length,
            userChannel: userChannel ? 1 : 0,
            competitors: competitorChannels.length,
          },
          videos: {
            total: totalVideosIndexed,
            embedded: totalEmbeddedVideos,
          },
          news: {
            sources: newsStats.totalSources,
            enabledSources: newsStats.enabledSources,
            articles: totalNewsArticles,
            embeddedArticles: newsStats.embeddedArticles,
          },
          jobs: {
            pending: pendingJobs.filter(j => j.status === 'pending').length,
            running: pendingJobs.filter(j => j.status === 'running').length,
            recentCompleted: recentJobs.filter(j => j.status === 'completed').length,
            recentFailed: recentJobs.filter(j => j.status === 'failed').length,
          },
        },
        userChannel: userChannel || null,
        competitorChannels,
        projectConfig: projectRagConfig,
        health,
        pendingJobs: pendingJobs.map(j => ({
          id: j.id,
          type: j.type,
          status: j.status,
          progress: j.progress,
        })),
      },
    });
  } catch (error) {
    console.error('[RAG Status API] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
