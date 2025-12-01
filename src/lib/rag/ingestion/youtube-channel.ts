/**
 * YouTube Channel Service
 *
 * Fetches channel metadata and video lists from YouTube Data API v3.
 * Story 6.3 - YouTube Channel Sync & Caption Scraping
 */

import { google } from 'googleapis';
import type { youtube_v3 } from 'googleapis';

/**
 * YouTube channel metadata
 */
export interface YouTubeChannel {
  channelId: string;
  name: string;
  description: string | null;
  subscriberCount: number | null;
  videoCount: number | null;
  thumbnailUrl: string | null;
  customUrl: string | null;
}

/**
 * YouTube video metadata
 */
export interface YouTubeVideo {
  videoId: string;
  channelId: string;
  title: string;
  description: string | null;
  publishedAt: string;
  durationSeconds: number | null;
  viewCount: number | null;
  thumbnailUrl: string | null;
}

/**
 * Options for fetching channel videos
 */
export interface GetChannelVideosOptions {
  maxResults?: number;           // Max videos to fetch (default: 50)
  publishedAfter?: string;       // ISO date string for incremental sync
  publishedBefore?: string;      // ISO date string
  order?: 'date' | 'viewCount';  // Sort order (default: date)
}

/**
 * YouTube Channel Service
 *
 * Provides methods to fetch channel metadata and video lists.
 */
export class YouTubeChannelService {
  private youtube: youtube_v3.Youtube;
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.YOUTUBE_API_KEY || '';

    if (!this.apiKey) {
      throw new Error('YouTube API key not configured. Add YOUTUBE_API_KEY to .env.local');
    }

    this.youtube = google.youtube({
      version: 'v3',
      auth: this.apiKey
    });
  }

  /**
   * Get channel metadata by channel ID
   *
   * @param channelId - YouTube channel ID (starts with UC)
   * @returns Channel metadata or null if not found
   */
  async getChannelById(channelId: string): Promise<YouTubeChannel | null> {
    try {
      const response = await this.youtube.channels.list({
        part: ['snippet', 'statistics'],
        id: [channelId]
      });

      const channel = response.data.items?.[0];
      if (!channel) {
        return null;
      }

      return this.transformChannel(channel);
    } catch (error) {
      console.error(`Failed to fetch channel ${channelId}:`, error);
      throw this.handleApiError(error);
    }
  }

  /**
   * Get channel metadata by handle (e.g., @ChannelName)
   *
   * @param handle - YouTube handle (with or without @)
   * @returns Channel metadata or null if not found
   */
  async getChannelByHandle(handle: string): Promise<YouTubeChannel | null> {
    // Ensure handle starts with @
    const normalizedHandle = handle.startsWith('@') ? handle : `@${handle}`;

    try {
      const response = await this.youtube.channels.list({
        part: ['snippet', 'statistics'],
        forHandle: normalizedHandle
      });

      const channel = response.data.items?.[0];
      if (!channel) {
        return null;
      }

      return this.transformChannel(channel);
    } catch (error) {
      console.error(`Failed to fetch channel by handle ${handle}:`, error);
      throw this.handleApiError(error);
    }
  }

  /**
   * Get channel metadata by custom URL or username
   *
   * @param identifier - Channel custom URL, username, or handle
   * @returns Channel metadata or null if not found
   */
  async resolveChannel(identifier: string): Promise<YouTubeChannel | null> {
    // Check if it's a channel ID (starts with UC)
    if (identifier.startsWith('UC') && identifier.length === 24) {
      return this.getChannelById(identifier);
    }

    // Check if it's a handle
    if (identifier.startsWith('@')) {
      return this.getChannelByHandle(identifier);
    }

    // Try to extract channel ID from URL patterns
    const channelIdMatch = identifier.match(/channel\/(UC[\w-]{22})/);
    if (channelIdMatch) {
      return this.getChannelById(channelIdMatch[1]);
    }

    // Try handle pattern in URL
    const handleMatch = identifier.match(/@([\w.-]+)/);
    if (handleMatch) {
      return this.getChannelByHandle(`@${handleMatch[1]}`);
    }

    // Try as a handle if nothing else matched
    return this.getChannelByHandle(identifier);
  }

  /**
   * Get videos from a channel
   *
   * @param channelId - YouTube channel ID
   * @param options - Fetch options
   * @returns Array of video metadata
   */
  async getChannelVideos(
    channelId: string,
    options: GetChannelVideosOptions = {}
  ): Promise<YouTubeVideo[]> {
    const maxResults = Math.min(options.maxResults || 50, 50);
    const videos: YouTubeVideo[] = [];

    try {
      // Use search endpoint to get videos from channel
      let pageToken: string | undefined;

      do {
        const searchParams: youtube_v3.Params$Resource$Search$List = {
          part: ['snippet'],
          channelId,
          type: ['video'],
          maxResults: Math.min(maxResults - videos.length, 50),
          order: options.order || 'date',
          pageToken
        };

        if (options.publishedAfter) {
          searchParams.publishedAfter = options.publishedAfter;
        }

        if (options.publishedBefore) {
          searchParams.publishedBefore = options.publishedBefore;
        }

        const searchResponse = await this.youtube.search.list(searchParams);

        const searchItems = searchResponse.data.items || [];

        // Extract video IDs for duration lookup
        const videoIds = searchItems
          .map(item => item.id?.videoId)
          .filter((id): id is string => !!id);

        // Get video details (duration, view count)
        let videoDetails: Map<string, { duration: number | null; viewCount: number | null }> = new Map();

        if (videoIds.length > 0) {
          const detailsResponse = await this.youtube.videos.list({
            part: ['contentDetails', 'statistics'],
            id: videoIds
          });

          for (const item of detailsResponse.data.items || []) {
            if (item.id) {
              videoDetails.set(item.id, {
                duration: item.contentDetails?.duration
                  ? this.parseISO8601Duration(item.contentDetails.duration)
                  : null,
                viewCount: item.statistics?.viewCount
                  ? parseInt(item.statistics.viewCount, 10)
                  : null
              });
            }
          }
        }

        // Transform search results to YouTubeVideo
        for (const item of searchItems) {
          const videoId = item.id?.videoId;
          if (!videoId || !item.snippet) continue;

          const details = videoDetails.get(videoId);

          videos.push({
            videoId,
            channelId,
            title: item.snippet.title || 'Untitled',
            description: item.snippet.description || null,
            publishedAt: item.snippet.publishedAt || new Date().toISOString(),
            durationSeconds: details?.duration ?? null,
            viewCount: details?.viewCount ?? null,
            thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || null
          });
        }

        pageToken = searchResponse.data.nextPageToken || undefined;

        // Stop if we have enough videos
        if (videos.length >= maxResults) {
          break;
        }

      } while (pageToken);

      return videos.slice(0, maxResults);

    } catch (error) {
      console.error(`Failed to fetch videos for channel ${channelId}:`, error);
      throw this.handleApiError(error);
    }
  }

  /**
   * Transform YouTube API channel to our format
   */
  private transformChannel(channel: youtube_v3.Schema$Channel): YouTubeChannel {
    return {
      channelId: channel.id || '',
      name: channel.snippet?.title || 'Unknown Channel',
      description: channel.snippet?.description || null,
      subscriberCount: channel.statistics?.subscriberCount
        ? parseInt(channel.statistics.subscriberCount, 10)
        : null,
      videoCount: channel.statistics?.videoCount
        ? parseInt(channel.statistics.videoCount, 10)
        : null,
      thumbnailUrl: channel.snippet?.thumbnails?.high?.url ||
        channel.snippet?.thumbnails?.default?.url || null,
      customUrl: channel.snippet?.customUrl || null
    };
  }

  /**
   * Parse ISO 8601 duration to seconds
   */
  private parseISO8601Duration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);

    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Handle API errors
   */
  private handleApiError(error: unknown): Error {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      if (message.includes('quota')) {
        return new Error('YouTube API quota exceeded. Please try again tomorrow.');
      }

      if (message.includes('api key') || message.includes('forbidden')) {
        return new Error('YouTube API key is invalid or restricted.');
      }

      if (message.includes('not found')) {
        return new Error('Channel not found.');
      }

      return error;
    }

    return new Error('Unknown YouTube API error');
  }
}

// Export singleton instance
let youtubeChannelService: YouTubeChannelService | null = null;

export function getYouTubeChannelService(): YouTubeChannelService {
  if (!youtubeChannelService) {
    youtubeChannelService = new YouTubeChannelService();
  }
  return youtubeChannelService;
}
