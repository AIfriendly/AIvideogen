/**
 * FFmpeg Client - Story 5.1
 *
 * Provides FFmpeg operations for video assembly.
 * Handles probing, duration extraction, and FFmpeg availability checks.
 */

import { spawn } from 'child_process';
import { promisify } from 'util';
import { access, constants } from 'fs';
import path from 'path';
import { FFProbeResult } from '@/types/assembly';
import { VIDEO_ASSEMBLY_CONFIG } from './constants';

const accessAsync = promisify(access);

/**
 * FFmpegClient class for video processing operations
 */
export class FFmpegClient {
  private ffmpegPath: string;
  private ffprobePath: string;

  constructor(ffmpegPath?: string, ffprobePath?: string) {
    this.ffmpegPath = ffmpegPath || 'ffmpeg';
    this.ffprobePath = ffprobePath || 'ffprobe';
  }

  /**
   * Verify FFmpeg is installed and accessible
   */
  async verifyInstallation(): Promise<boolean> {
    try {
      const version = await this.getVersion();
      console.log(`[FFmpegClient] FFmpeg version: ${version}`);
      return true;
    } catch (error) {
      console.error('[FFmpegClient] FFmpeg not found:', error);
      return false;
    }
  }

  /**
   * Get FFmpeg version string
   */
  async getVersion(): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn(this.ffmpegPath, ['-version']);
      let output = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          const match = output.match(/ffmpeg version ([^\s]+)/);
          resolve(match ? match[1] : 'unknown');
        } else {
          reject(new Error('FFmpeg not installed or not in PATH'));
        }
      });

      process.on('error', (err) => {
        reject(new Error(`FFmpeg not found: ${err.message}. Install FFmpeg and add to PATH.`));
      });
    });
  }

  /**
   * Probe a media file for metadata
   */
  async probe(filePath: string): Promise<FFProbeResult> {
    // Verify file exists
    try {
      await accessAsync(filePath, constants.R_OK);
    } catch {
      throw new Error(`File not found or not readable: ${filePath}`);
    }

    return new Promise((resolve, reject) => {
      const args = [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        filePath,
      ];

      const process = spawn(this.ffprobePath, args);
      let stdout = '';
      let stderr = '';

      const timeout = setTimeout(() => {
        process.kill();
        reject(new Error(`FFprobe timed out for ${filePath}`));
      }, VIDEO_ASSEMBLY_CONFIG.PROBE_TIMEOUT);

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        clearTimeout(timeout);

        if (code === 0) {
          try {
            const result = JSON.parse(stdout);

            // Transform to our interface
            const transformed: FFProbeResult = {
              format: {
                filename: result.format?.filename || filePath,
                duration: parseFloat(result.format?.duration || '0'),
                size: parseInt(result.format?.size || '0', 10),
                bit_rate: parseInt(result.format?.bit_rate || '0', 10),
                format_name: result.format?.format_name || 'unknown',
              },
              streams: (result.streams || []).map((stream: Record<string, unknown>) => ({
                codec_type: stream.codec_type as 'video' | 'audio',
                codec_name: stream.codec_name as string,
                width: stream.width as number | undefined,
                height: stream.height as number | undefined,
                duration: stream.duration ? parseFloat(stream.duration as string) : undefined,
                bit_rate: stream.bit_rate ? parseInt(stream.bit_rate as string, 10) : undefined,
                channels: stream.channels as number | undefined,
                sample_rate: stream.sample_rate ? parseInt(stream.sample_rate as string, 10) : undefined,
              })),
            };

            resolve(transformed);
          } catch (err) {
            reject(new Error(`Failed to parse ffprobe output: ${err}`));
          }
        } else {
          reject(new Error(`FFprobe failed (code ${code}): ${stderr}`));
        }
      });

      process.on('error', (err) => {
        clearTimeout(timeout);
        reject(new Error(`FFprobe error: ${err.message}`));
      });
    });
  }

  /**
   * Get video file duration in seconds
   */
  async getVideoDuration(videoPath: string): Promise<number> {
    const result = await this.probe(videoPath);

    // Try to get duration from format first
    if (result.format.duration > 0) {
      return result.format.duration;
    }

    // Fall back to video stream duration
    const videoStream = result.streams.find(s => s.codec_type === 'video');
    if (videoStream?.duration && videoStream.duration > 0) {
      return videoStream.duration;
    }

    throw new Error(`Could not determine duration for ${videoPath}`);
  }

  /**
   * Get audio file duration in seconds
   */
  async getAudioDuration(audioPath: string): Promise<number> {
    const result = await this.probe(audioPath);

    // Try to get duration from format first
    if (result.format.duration > 0) {
      return result.format.duration;
    }

    // Fall back to audio stream duration
    const audioStream = result.streams.find(s => s.codec_type === 'audio');
    if (audioStream?.duration && audioStream.duration > 0) {
      return audioStream.duration;
    }

    throw new Error(`Could not determine duration for ${audioPath}`);
  }

  /**
   * Check if a file exists and is readable
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      await accessAsync(filePath, constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file extension
   */
  getExtension(filePath: string): string {
    return path.extname(filePath).toLowerCase();
  }
}

// Export singleton instance for convenience
export const ffmpegClient = new FFmpegClient();
