/**
 * Channel Validation API Endpoint
 *
 * Validate a YouTube channel URL/ID and return channel information.
 *
 * POST /api/channels/validate
 *
 * Story 6.7 - Channel Intelligence UI & Setup Wizard
 */

import { NextRequest, NextResponse } from 'next/server';
import { getYouTubeChannelService } from '@/lib/rag/ingestion/youtube-channel';

/**
 * POST /api/channels/validate
 *
 * Validate a YouTube channel identifier.
 *
 * Body:
 * - identifier: string (channel URL, ID, or @handle)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier } = body;

    if (!identifier) {
      return NextResponse.json(
        { success: false, error: 'identifier is required' },
        { status: 400 }
      );
    }

    // Get YouTube channel service
    const youtubeService = getYouTubeChannelService();

    // Resolve and validate channel
    try {
      const channel = await youtubeService.resolveChannel(identifier);

      if (!channel) {
        return NextResponse.json({
          success: true,
          valid: false,
          error: 'Channel not found. Please check the URL or channel ID.',
        });
      }

      return NextResponse.json({
        success: true,
        valid: true,
        channel: {
          id: channel.channelId,
          name: channel.name,
          description: channel.description,
          subscriberCount: channel.subscriberCount,
          videoCount: channel.videoCount,
          thumbnailUrl: channel.thumbnailUrl,
          customUrl: channel.customUrl,
        },
      });
    } catch (error) {
      // Channel not found or invalid
      if (error instanceof Error && error.message.includes('not found')) {
        return NextResponse.json({
          success: true,
          valid: false,
          error: 'Channel not found. Please check the URL or channel ID.',
        });
      }

      throw error;
    }
  } catch (error) {
    console.error('[Channel Validate API] POST error:', error);

    // Check for API configuration issues
    if (error instanceof Error && error.message.includes('API key')) {
      return NextResponse.json(
        {
          success: false,
          error: 'YouTube API not configured. Please set YOUTUBE_API_KEY in environment.',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
