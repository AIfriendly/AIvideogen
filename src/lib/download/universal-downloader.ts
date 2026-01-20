/**
 * Universal Downloader Service
 *
 * Story 6.12: MCP Video Assembly Integration
 * AC-6.12.3: Universal Downloader Service
 *
 * Provides a unified interface for downloading videos from multiple providers:
 * - YouTube: Uses yt-dlp via downloadWithRetry
 * - DVIDS/NASA: Uses MCP provider registry via downloadFromAnyProvider
 *
 * Error Handling Strategy:
 * - YouTube failures are retryable (network issues, temporary errors)
 * - MCP failures are logged but don't block assembly (graceful degradation)
 * - All errors return consistent UniversalDownloadResult interface
 *
 * @module lib/download/universal-downloader
 */

import { downloadWithRetry } from '@/lib/youtube/download-segment';
import { ProviderRegistry } from '@/lib/mcp/provider-registry';

/**
 * Download options for universal downloader
 */
export interface UniversalDownloadOptions {
  /** Video ID (provider-specific format) */
  videoId: string;
  /** Provider ID (youtube, dvids, nasa, etc.) */
  providerId?: string;
  /** Output file path for downloaded video */
  outputPath: string;
  /** Duration of video segment to download (seconds) */
  segmentDuration: number;
  /** Max video height (e.g., 720 for 720p) - YouTube only */
  maxHeight?: number;
}

/**
 * Download result interface (consistent across all providers)
 */
export interface UniversalDownloadResult {
  /** Whether the download succeeded */
  success: boolean;
  /** Path to downloaded file (if success) */
  filePath?: string;
  /** Which provider was actually used */
  providerUsed: string;
  /** Error message (if failed) */
  error?: string;
  /** Whether the error is retryable */
  retryable?: boolean;
}

/**
 * Download a video from the specified provider
 *
 * Routes to appropriate downloader based on providerId:
 * - 'youtube' → yt-dlp via downloadWithRetry
 * - 'dvids', 'nasa' → MCP provider registry
 * - Other → defaults to YouTube for backward compatibility
 *
 * @param options - Download options
 * @returns Promise resolving to download result
 *
 * @example
 * // Download YouTube video
 * const result = await downloadVideo({
 *   videoId: 'dQw4w9WgXcQ',
 *   providerId: 'youtube',
 *   outputPath: '/cache/video.mp4',
 *   segmentDuration: 30,
 *   maxHeight: 720
 * });
 *
 * // Download DVIDS video
 * const result = await downloadVideo({
 *   videoId: 'DVID-12345',
 *   providerId: 'dvids',
 *   outputPath: '/cache/dvids-video.mp4',
 *   segmentDuration: 45
 * });
 */
export async function downloadVideo(
  options: UniversalDownloadOptions
): Promise<UniversalDownloadResult> {
  const {
    videoId,
    providerId = 'youtube', // Default to YouTube for backward compatibility
    outputPath,
    segmentDuration,
    maxHeight
  } = options;

  // Route to appropriate downloader based on provider
  if (providerId === 'youtube') {
    return downloadYouTubeVideo(videoId, outputPath, segmentDuration, maxHeight);
  } else {
    return downloadMCPVideo(videoId, providerId, outputPath, segmentDuration);
  }
}

/**
 * Download YouTube video using yt-dlp
 *
 * @param videoId - YouTube video ID (11 characters)
 * @param outputPath - Output file path
 * @param segmentDuration - Duration to download (seconds)
 * @param maxHeight - Max video height (optional)
 * @returns Download result
 */
async function downloadYouTubeVideo(
  videoId: string,
  outputPath: string,
  segmentDuration: number,
  maxHeight?: number
): Promise<UniversalDownloadResult> {
  try {
    console.log(`[Universal Downloader] Downloading YouTube video: ${videoId}`);

    const result = await downloadWithRetry({
      videoId,
      segmentDuration,
      outputPath,
      maxHeight: maxHeight || 720,
    });

    if (result.success) {
      console.log(`[Universal Downloader] YouTube download complete: ${result.filePath}`);
      return {
        success: true,
        filePath: result.filePath,
        providerUsed: 'youtube',
      };
    } else {
      console.error(`[Universal Downloader] YouTube download failed: ${result.error}`);
      return {
        success: false,
        providerUsed: 'youtube',
        error: result.error || 'Unknown YouTube download error',
        retryable: true, // YouTube errors are typically retryable
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Universal Downloader] YouTube download error: ${errorMessage}`);
    return {
      success: false,
      providerUsed: 'youtube',
      error: errorMessage,
      retryable: true,
    };
  }
}

/**
 * Download MCP provider video (DVIDS, NASA, etc.)
 *
 * @param videoId - Provider-specific video ID
 * @param providerId - MCP provider ID (dvids, nasa, etc.)
 * @param outputPath - Output file path
 * @param segmentDuration - Duration to download (seconds)
 * @returns Download result
 */
async function downloadMCPVideo(
  videoId: string,
  providerId: string,
  outputPath: string,
  segmentDuration: number
): Promise<UniversalDownloadResult> {
  try {
    console.log(`[Universal Downloader] Downloading ${providerId} video: ${videoId}`);

    // Initialize provider registry (singleton pattern)
    const registry = new ProviderRegistry('config/mcp_servers.json');

    // Download from MCP provider - returns file path (string)
    const filePath = await registry.downloadFromAnyProvider(
      videoId,
      providerId,
      outputPath,
      segmentDuration
    );

    // Success - registry returns the file path
    console.log(`[Universal Downloader] ${providerId} download complete: ${filePath}`);
    return {
      success: true,
      filePath,
      providerUsed: providerId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Detect specific error types for better handling
    const isConnectionError = errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('Connection refused') ||
      errorMessage.includes('MCP server not running') ||
      errorMessage.includes('Server not running');

    const isTimeoutError = errorMessage.includes('timeout') ||
      errorMessage.includes('timed out');

    console.error(`[Universal Downloader] ${providerId} download error: ${errorMessage}`);

    return {
      success: false,
      providerUsed: providerId,
      error: errorMessage,
      retryable: isConnectionError || isTimeoutError,
    };
  }
}

/**
 * Get supported provider IDs
 *
 * @returns Array of supported provider IDs
 */
export function getSupportedProviders(): string[] {
  return ['youtube', 'dvids', 'nasa'];
}

/**
 * Validate provider ID
 *
 * @param providerId - Provider ID to validate
 * @returns True if provider is supported
 */
export function isValidProvider(providerId: string): boolean {
  return getSupportedProviders().includes(providerId);
}
