/**
 * YouTube Segment Download Service
 *
 * Core download functionality using yt-dlp with segment extraction.
 * Implements security hardening, retry logic, and error classification.
 *
 * Story 3.6: Default Segment Download Service
 *
 * Security Features:
 * - spawn() with argument array (prevents command injection)
 * - videoId validation (11-char alphanumeric + dashes/underscores)
 * - Output path sanitization (prevents path traversal)
 *
 * Reliability Features:
 * - Exponential backoff retry (max 3 attempts: 1s, 2s, 4s)
 * - Error classification (retryable vs permanent)
 * - File verification after download
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Options for downloading a video segment
 */
export interface DownloadSegmentOptions {
  videoId: string;            // YouTube video ID (11 characters)
  segmentDuration: number;    // Duration in seconds (voiceover + 5s buffer)
  outputPath: string;         // ABSOLUTE file path including filename
  maxHeight?: number;         // Default: 720
}

/**
 * Result of a download attempt
 */
export interface DownloadSegmentResult {
  success: boolean;
  filePath?: string;          // ABSOLUTE path to downloaded file
  error?: string;
  retryable?: boolean;        // True if error should be retried
}

/**
 * Options for retry logic
 */
export interface RetryOptions {
  maxRetries: number;         // Default: 3
  baseDelay: number;          // Default: 1000ms
  maxDelay: number;           // Default: 8000ms
}

// ============================================================================
// Security Validation Functions
// ============================================================================

/**
 * Validate YouTube video ID format
 * @param videoId - YouTube video ID to validate
 * @returns true if valid, false otherwise
 *
 * Security: Prevents command injection via malicious video IDs
 * YouTube IDs are exactly 11 characters: alphanumeric, dashes, underscores
 */
export function validateVideoId(videoId: string): boolean {
  const videoIdRegex = /^[a-zA-Z0-9_-]{11}$/;
  return videoIdRegex.test(videoId);
}

/**
 * Sanitize output path to prevent path traversal attacks
 * @param outputPath - Absolute path to sanitize
 * @param projectId - Project ID for validation
 * @returns Sanitized absolute path
 * @throws Error if path traversal detected
 *
 * Security: Ensures all downloads write to .cache/videos/{projectId}/ directory
 */
export function sanitizeOutputPath(outputPath: string, projectId: string): string {
  // Base path for video cache
  const basePath = path.resolve(process.cwd(), '.cache', 'videos', projectId);
  const resolvedPath = path.resolve(outputPath);

  // Prevent path traversal attacks
  if (!resolvedPath.startsWith(basePath)) {
    throw new Error(`Invalid output path: path traversal detected. Path must be within .cache/videos/${projectId}/`);
  }

  return resolvedPath;
}

// ============================================================================
// Error Classification
// ============================================================================

/**
 * Classify error as retryable or permanent
 * @param error - Error message from yt-dlp
 * @returns true if error should be retried
 *
 * Retryable errors: Network timeout, connection refused, HTTP 429/503
 * Permanent errors: Video unavailable (404), invalid URL, disk space full
 */
function isRetryableError(error: string): boolean {
  const retryablePatterns = [
    /timeout/i,
    /connection refused/i,
    /429/,                  // HTTP 429 Too Many Requests
    /503/,                  // HTTP 503 Service Unavailable
    /network/i,
    /ECONNREFUSED/i,
    /ETIMEDOUT/i,
  ];

  const permanentPatterns = [
    /video unavailable/i,
    /404/,                  // HTTP 404 Not Found
    /invalid.*url/i,
    /no space left/i,
    /private video/i,
    /deleted video/i,
    /unsupported/i,
  ];

  // Check if error matches permanent patterns first (higher priority)
  if (permanentPatterns.some(pattern => pattern.test(error))) {
    return false;
  }

  // Check if error matches retryable patterns
  if (retryablePatterns.some(pattern => pattern.test(error))) {
    return true;
  }

  // Default: treat unknown errors as non-retryable to avoid infinite loops
  return false;
}

// ============================================================================
// Core Download Function
// ============================================================================

/**
 * Download a video segment using yt-dlp
 * @param options - Download options
 * @returns Download result with success status and file path
 *
 * SECURITY: Uses spawn() with argument array to prevent command injection
 * NEVER use exec() with string interpolation for security reasons
 */
export async function downloadDefaultSegment(
  options: DownloadSegmentOptions
): Promise<DownloadSegmentResult> {
  const { videoId, segmentDuration, outputPath, maxHeight = 720 } = options;

  // Security: Validate video ID format
  if (!validateVideoId(videoId)) {
    return {
      success: false,
      error: `Invalid video ID format: "${videoId}". Must be 11 characters (alphanumeric, dashes, underscores).`,
      retryable: false,
    };
  }

  try {
    // Security: Sanitize output path (throws if path traversal detected)
    // Extract projectId from path for validation
    const pathParts = outputPath.split(path.sep);
    const cacheIndex = pathParts.indexOf('.cache');
    if (cacheIndex === -1 || cacheIndex + 2 >= pathParts.length) {
      return {
        success: false,
        error: 'Invalid output path format. Expected: .cache/videos/{projectId}/...',
        retryable: false,
      };
    }
    const projectId = pathParts[cacheIndex + 2]; // .cache/videos/{projectId}
    const sanitizedPath = sanitizeOutputPath(outputPath, projectId);

    // Ensure output directory exists
    const outputDir = path.dirname(sanitizedPath);
    await fs.mkdir(outputDir, { recursive: true });

    // Build yt-dlp command arguments (SECURE: argument array, NOT string interpolation)
    const youtubeUrl = `https://youtube.com/watch?v=${videoId}`;
    const args = [
      youtubeUrl,
      '--download-sections', `*0-${segmentDuration}`,  // Download first N seconds
      '-f', `best[height<=${maxHeight}]`,              // Resolution cap (720p)
      '-o', sanitizedPath,                              // Output path
      '--no-playlist',                                  // Don't download playlists
      '--no-warnings',                                  // Suppress warnings
      '--quiet',                                        // Quiet mode (errors only)
      '--postprocessor-args', 'ffmpeg:-an',            // Story 3.7: Strip audio (AC35)
    ];

    console.log(`[Download] Starting download: videoId=${videoId}, duration=${segmentDuration}s, path=${sanitizedPath}`);

    // Execute yt-dlp using spawn (SECURE)
    const downloadResult = await executeYtDlp(args);

    if (!downloadResult.success) {
      // Classify error as retryable or permanent
      const retryable = isRetryableError(downloadResult.error || '');
      console.error(`[Download] Failed (retryable=${retryable}):`, downloadResult.error);

      return {
        success: false,
        error: downloadResult.error,
        retryable,
      };
    }

    // Verify file exists after download
    try {
      await fs.access(sanitizedPath);
      console.log(`[Download] Success: ${sanitizedPath}`);

      return {
        success: true,
        filePath: sanitizedPath,
      };
    } catch (accessError) {
      console.error(`[Download] File not found after download: ${sanitizedPath}`);
      return {
        success: false,
        error: `Download completed but file not found at ${sanitizedPath}`,
        retryable: false,
      };
    }
  } catch (error: any) {
    console.error('[Download] Unexpected error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error during download',
      retryable: false,
    };
  }
}

/**
 * Execute yt-dlp command using spawn
 * @param args - Command arguments
 * @returns Result with success status and error message
 */
async function executeYtDlp(args: string[]): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    // Use yt-dlp.exe from project root if it exists, otherwise try system PATH
    const ytDlpPath = process.platform === 'win32'
      ? path.join(process.cwd(), 'yt-dlp.exe')
      : 'yt-dlp';

    const ytDlpProcess = spawn(ytDlpPath, args);

    let stderr = '';

    // Capture stderr for error messages
    ytDlpProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ytDlpProcess.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        const error = stderr.trim() || `yt-dlp exited with code ${code}`;
        resolve({ success: false, error });
      }
    });

    ytDlpProcess.on('error', (error) => {
      // This catches errors like "command not found"
      resolve({
        success: false,
        error: `Failed to execute yt-dlp: ${error.message}. Ensure yt-dlp is installed and in PATH.`,
      });
    });
  });
}

// ============================================================================
// Retry Logic with Exponential Backoff
// ============================================================================

/**
 * Download with automatic retry logic and exponential backoff
 * @param options - Download options
 * @param retryOptions - Retry configuration (max 3 attempts by default)
 * @returns Final download result
 *
 * Retry sequence: 1s, 2s, 4s delays between attempts
 * Only retries if error is classified as retryable
 */
export async function downloadWithRetry(
  options: DownloadSegmentOptions,
  retryOptions: RetryOptions = {
    maxRetries: 3,
    baseDelay: 1000,  // 1 second
    maxDelay: 8000,   // 8 seconds
  }
): Promise<DownloadSegmentResult> {
  for (let attempt = 0; attempt <= retryOptions.maxRetries; attempt++) {
    // Log retry attempt
    if (attempt > 0) {
      console.log(`[Download] Retry attempt ${attempt}/${retryOptions.maxRetries} for videoId=${options.videoId}`);
    }

    // Attempt download
    const result = await downloadDefaultSegment(options);

    // Success - return immediately
    if (result.success) {
      if (attempt > 0) {
        console.log(`[Download] Retry successful after ${attempt} attempts`);
      }
      return result;
    }

    // Permanent failure - don't retry
    if (!result.retryable) {
      console.log(`[Download] Permanent failure, not retrying: ${result.error}`);
      return result;
    }

    // Retryable error - apply exponential backoff delay if not last attempt
    if (attempt < retryOptions.maxRetries) {
      const delay = Math.min(
        retryOptions.baseDelay * Math.pow(2, attempt),
        retryOptions.maxDelay
      );
      console.log(`[Download] Retryable error, waiting ${delay}ms before retry: ${result.error}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    } else {
      // Max retries exhausted
      console.error(`[Download] Max retries exhausted (${retryOptions.maxRetries}) for videoId=${options.videoId}`);
      return {
        ...result,
        error: `Max retries exhausted. Last error: ${result.error}`,
      };
    }
  }

  // Should never reach here, but TypeScript requires a return
  return {
    success: false,
    error: 'Max retries exhausted',
    retryable: false,
  };
}
