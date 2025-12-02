/**
 * RAG Setup API Endpoint
 *
 * Initialize RAG configuration for a project.
 * Handles both Established Channel and Cold Start modes.
 *
 * POST /api/rag/setup
 *
 * Story 6.7 - Channel Intelligence UI & Setup Wizard
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProject, updateProject } from '@/lib/db/queries';
import { getChannelSyncService } from '@/lib/rag/ingestion/channel-sync';
import { getUserChannel, getCompetitorChannels, getAllChannels, createChannel } from '@/lib/db/queries-channels';
import { jobQueue } from '@/lib/jobs/queue';
import type { RAGConfig } from '@/lib/rag/types';

/**
 * POST /api/rag/setup
 *
 * Initialize or update RAG configuration.
 *
 * Body:
 * - projectId?: string (optional - for project-specific RAG)
 * - mode: 'established' | 'cold_start'
 * - config: {
 *     userChannelId?: string (for established mode)
 *     competitorChannels?: string[] (up to 5)
 *     niche: string (required for cold_start)
 *     newsEnabled?: boolean (default: true)
 *     trendsEnabled?: boolean (default: true)
 *   }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, mode, config } = body;

    // Validate mode
    if (!mode || !['established', 'cold_start'].includes(mode)) {
      return NextResponse.json(
        { success: false, error: 'mode must be "established" or "cold_start"' },
        { status: 400 }
      );
    }

    // Validate mode-specific requirements
    if (mode === 'established' && !config?.userChannelId) {
      return NextResponse.json(
        { success: false, error: 'userChannelId is required for established mode' },
        { status: 400 }
      );
    }

    if (mode === 'cold_start' && !config?.niche) {
      return NextResponse.json(
        { success: false, error: 'niche is required for cold_start mode' },
        { status: 400 }
      );
    }

    // Validate competitor limit
    const competitorChannels = config?.competitorChannels || [];
    if (competitorChannels.length > 5) {
      return NextResponse.json(
        { success: false, error: 'Maximum 5 competitor channels allowed' },
        { status: 400 }
      );
    }

    // Build RAG config
    const ragConfig: RAGConfig = {
      mode,
      userChannelId: config?.userChannelId,
      competitorChannels,
      niche: config?.niche || '',
      newsEnabled: config?.newsEnabled !== false,
      trendsEnabled: config?.trendsEnabled !== false,
      syncFrequency: 'daily',
    };

    // Track created jobs
    const jobIds: string[] = [];
    const syncService = getChannelSyncService();

    // Add user channel if in established mode
    if (mode === 'established' && ragConfig.userChannelId) {
      try {
        // Check if channel already exists
        const existingChannel = getUserChannel();
        if (!existingChannel || existingChannel.channelId !== ragConfig.userChannelId) {
          const channel = await syncService.addChannel(ragConfig.userChannelId, {
            isUserChannel: true,
            isCompetitor: false,
            niche: ragConfig.niche || undefined,
          });

          // Enqueue sync job
          const jobId = jobQueue.enqueue({
            type: 'rag_sync_channel',
            payload: {
              channelId: channel.id,
              incremental: false,
              maxVideos: 50,
            },
            priority: 2,
          });
          jobIds.push(jobId);
        }
      } catch (error) {
        console.error('[RAG Setup] Failed to add user channel:', error);
        return NextResponse.json(
          {
            success: false,
            error: `Failed to add user channel: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
          { status: 400 }
        );
      }
    }

    // Add competitor channels
    for (const channelId of competitorChannels) {
      try {
        const channel = await syncService.addChannel(channelId, {
          isUserChannel: false,
          isCompetitor: true,
          niche: ragConfig.niche || undefined,
        });

        // Enqueue sync job
        const jobId = jobQueue.enqueue({
          type: 'rag_sync_channel',
          payload: {
            channelId: channel.id,
            incremental: false,
            maxVideos: 50,
          },
          priority: 3,
        });
        jobIds.push(jobId);
      } catch (error) {
        console.error(`[RAG Setup] Failed to add competitor channel ${channelId}:`, error);
        // Continue with other channels
      }
    }

    // Enqueue news sync if enabled
    if (ragConfig.newsEnabled) {
      const newsJobId = jobQueue.enqueue({
        type: 'rag_sync_news',
        payload: {
          niche: ragConfig.niche,
        },
        priority: 4,
      });
      jobIds.push(newsJobId);
    }

    // If projectId provided, save RAG config to project
    if (projectId) {
      const project = getProject(projectId);
      if (project) {
        // Get current config and merge
        const currentConfig = project.config_json ? JSON.parse(project.config_json) : {};
        const newConfig = {
          ...currentConfig,
          rag: ragConfig,
        };
        updateProject(projectId, { config_json: JSON.stringify(newConfig) });
      }
    }

    return NextResponse.json({
      success: true,
      config: ragConfig,
      jobIds,
      message: `RAG setup complete. ${jobIds.length} sync job(s) enqueued.`,
    });
  } catch (error) {
    console.error('[RAG Setup API] POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/rag/setup
 *
 * Get current RAG setup information.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    // Get channels
    const userChannel = getUserChannel();
    const competitorChannels = getCompetitorChannels();

    // If projectId provided, get project-specific config
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
    } else if (competitorChannels.length > 0) {
      mode = 'cold_start';
    }

    return NextResponse.json({
      success: true,
      data: {
        configured: mode !== 'not_configured',
        mode,
        userChannel: userChannel || null,
        competitorChannels,
        projectConfig: projectRagConfig,
      },
    });
  } catch (error) {
    console.error('[RAG Setup API] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
