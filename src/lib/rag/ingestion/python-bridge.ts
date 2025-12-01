/**
 * Python Bridge - Node.js to Python subprocess communication
 *
 * Executes Python scripts and parses JSON responses.
 * Used for youtube-transcript-api integration.
 * Story 6.3 - YouTube Channel Sync & Caption Scraping
 */

import { spawn, SpawnOptions } from 'child_process';
import path from 'path';

// Timeout for Python subprocess execution
const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds per video
const BATCH_TIMEOUT_MS = 300000; // 5 minutes for batch operations

/**
 * Transcript segment with timing information
 */
export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

/**
 * Successfully scraped transcript
 */
export interface ScrapedTranscript {
  videoId: string;
  text: string;
  segments: TranscriptSegment[];
  language: string;
}

/**
 * Error during transcript scraping
 */
export interface TranscriptError {
  videoId: string | null;
  error: TranscriptErrorCode;
  message: string;
}

/**
 * Error codes from Python transcript scraper
 */
export type TranscriptErrorCode =
  | 'NO_CAPTIONS'
  | 'VIDEO_UNAVAILABLE'
  | 'AGE_RESTRICTED'
  | 'TRANSCRIPT_DISABLED'
  | 'RATE_LIMITED'
  | 'IMPORT_ERROR'
  | 'INVALID_INPUT'
  | 'FATAL_ERROR'
  | 'TIMEOUT'
  | 'UNKNOWN_ERROR';

/**
 * Result from transcript scraping
 */
export interface TranscriptResult {
  success: boolean;
  partial?: boolean;
  transcripts: ScrapedTranscript[];
  errors: TranscriptError[];
}

/**
 * Get Python executable path for virtual environment
 */
function getPythonPath(): string {
  const cwd = process.cwd();
  return process.platform === 'win32'
    ? path.join(cwd, '.venv', 'Scripts', 'python.exe')
    : path.join(cwd, '.venv', 'bin', 'python');
}

/**
 * Get transcript script path
 */
function getTranscriptScriptPath(): string {
  return path.join(process.cwd(), 'scripts', 'youtube-transcript.py');
}

/**
 * Execute Python script and return parsed JSON output
 */
async function execPython<T>(
  scriptPath: string,
  args: string[],
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  const pythonPath = getPythonPath();

  return new Promise<T>((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    let killed = false;

    const options: SpawnOptions = {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    };

    const proc = spawn(pythonPath, [scriptPath, ...args], options);

    // Set up timeout
    const timeoutId = setTimeout(() => {
      killed = true;
      proc.kill('SIGTERM');
      reject(new Error(`Python process timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    // Collect stdout
    proc.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    // Collect stderr (logs)
    proc.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
      // Log Python output for debugging
      const lines = data.toString().trim().split('\n');
      for (const line of lines) {
        if (line.trim()) {
          console.log(`[Python] ${line}`);
        }
      }
    });

    // Handle process exit
    proc.on('close', (code) => {
      clearTimeout(timeoutId);

      if (killed) {
        return; // Already rejected by timeout
      }

      if (code !== 0 && code !== null) {
        reject(new Error(`Python process exited with code ${code}: ${stderr}`));
        return;
      }

      try {
        // Parse JSON output
        const result = JSON.parse(stdout.trim()) as T;
        resolve(result);
      } catch (parseError) {
        reject(new Error(`Failed to parse Python output: ${stdout.substring(0, 500)}`));
      }
    });

    // Handle spawn errors
    proc.on('error', (error) => {
      clearTimeout(timeoutId);
      reject(new Error(`Failed to spawn Python process: ${error.message}`));
    });
  });
}

/**
 * Scrape transcript for a single video
 *
 * @param videoId - YouTube video ID
 * @param languages - Preferred language codes (default: ['en', 'en-US', 'en-GB'])
 * @returns Transcript result
 */
export async function scrapeVideoTranscript(
  videoId: string,
  languages: string[] = ['en', 'en-US', 'en-GB']
): Promise<TranscriptResult> {
  const scriptPath = getTranscriptScriptPath();
  const args = [
    '--video-id', videoId,
    '--languages', languages.join(',')
  ];

  try {
    return await execPython<TranscriptResult>(scriptPath, args, DEFAULT_TIMEOUT_MS);
  } catch (error) {
    return {
      success: false,
      transcripts: [],
      errors: [{
        videoId,
        error: error instanceof Error && error.message.includes('timed out') ? 'TIMEOUT' : 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : String(error)
      }]
    };
  }
}

/**
 * Scrape transcripts for multiple videos (batch)
 *
 * @param videoIds - Array of YouTube video IDs
 * @param options - Optional parameters
 * @returns Transcript result with all transcripts and errors
 */
export async function scrapeVideoTranscripts(
  videoIds: string[],
  options: {
    languages?: string[];
    rateLimitDelay?: number; // seconds between requests
  } = {}
): Promise<TranscriptResult> {
  if (videoIds.length === 0) {
    return {
      success: true,
      transcripts: [],
      errors: []
    };
  }

  const scriptPath = getTranscriptScriptPath();
  const languages = options.languages || ['en', 'en-US', 'en-GB'];
  const rateLimitDelay = options.rateLimitDelay || 0.5;

  // Calculate timeout based on number of videos
  // Base: 5 min + 3 seconds per video (accounting for rate limiting + processing)
  const timeoutMs = Math.min(
    BATCH_TIMEOUT_MS + (videoIds.length * 3000),
    600000 // Max 10 minutes
  );

  const args = [
    '--video-ids', videoIds.join(','),
    '--languages', languages.join(','),
    '--rate-limit', rateLimitDelay.toString()
  ];

  try {
    return await execPython<TranscriptResult>(scriptPath, args, timeoutMs);
  } catch (error) {
    return {
      success: false,
      transcripts: [],
      errors: [{
        videoId: null,
        error: error instanceof Error && error.message.includes('timed out') ? 'TIMEOUT' : 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : String(error)
      }]
    };
  }
}

/**
 * Check if transcript error is recoverable (can retry)
 */
export function isRecoverableError(errorCode: TranscriptErrorCode): boolean {
  return ['RATE_LIMITED', 'TIMEOUT', 'UNKNOWN_ERROR'].includes(errorCode);
}

/**
 * Map error code to embedding status for database
 */
export function errorCodeToEmbeddingStatus(
  errorCode: TranscriptErrorCode
): 'pending' | 'processing' | 'embedded' | 'error' | 'no_captions' | 'unavailable' | 'restricted' {
  switch (errorCode) {
    case 'NO_CAPTIONS':
    case 'TRANSCRIPT_DISABLED':
      return 'no_captions' as 'error'; // Will be stored as error with note
    case 'VIDEO_UNAVAILABLE':
      return 'unavailable' as 'error';
    case 'AGE_RESTRICTED':
      return 'restricted' as 'error';
    default:
      return 'error';
  }
}
