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

  // ========================================
  // Story 5.2: Trimming Methods
  // ========================================

  /**
   * Trim video to match audio duration
   * Convenience method that gets audio duration and trims video to match
   */
  async trimToAudioDuration(
    videoPath: string,
    audioPath: string,
    outputPath: string
  ): Promise<void> {
    const audioDuration = await this.getAudioDuration(audioPath);
    await this.trimVideo(videoPath, audioDuration, outputPath);
  }

  /**
   * Trim video to specified duration
   * Uses -c copy for quality preservation when possible
   */
  async trimVideo(
    videoPath: string,
    duration: number,
    outputPath: string
  ): Promise<void> {
    // First try with copy codec (fast, no quality loss)
    const copyArgs = [
      '-i', videoPath,
      '-t', duration.toString(),
      '-c', 'copy',
      '-y',
      outputPath,
    ];

    try {
      await this.execute(copyArgs);
    } catch (error) {
      // Fallback to re-encoding if copy fails
      console.warn('[FFmpegClient] Copy codec failed, falling back to re-encode:', error);

      const encodeArgs = [
        '-i', videoPath,
        '-t', duration.toString(),
        '-c:v', VIDEO_ASSEMBLY_CONFIG.VIDEO_CODEC,
        '-c:a', VIDEO_ASSEMBLY_CONFIG.AUDIO_CODEC,
        '-y',
        outputPath,
      ];

      await this.execute(encodeArgs);
    }
  }

  /**
   * Loop a short video to reach target duration
   * Used when video is shorter than required duration
   */
  async loopVideo(
    videoPath: string,
    targetDuration: number,
    videoDuration: number,
    outputPath: string
  ): Promise<void> {
    const loopCount = Math.ceil(targetDuration / videoDuration);

    const args = [
      '-stream_loop', (loopCount - 1).toString(), // -1 because first play isn't a loop
      '-i', videoPath,
      '-t', targetDuration.toString(),
      '-c', 'copy',
      '-y',
      outputPath,
    ];

    await this.execute(args);
  }

  /**
   * Concatenate multiple video files using concat demuxer
   */
  async concat(
    listFilePath: string,
    outputPath: string
  ): Promise<void> {
    const args = [
      '-f', 'concat',
      '-safe', '0',
      '-i', listFilePath,
      '-c', 'copy',
      '-y',
      outputPath,
    ];
    await this.execute(args);
  }

  /**
   * Overlay audio onto video (replaces existing audio)
   */
  async overlayAudio(
    videoPath: string,
    audioPath: string,
    outputPath: string
  ): Promise<void> {
    const args = [
      '-i', videoPath,
      '-i', audioPath,
      '-c:v', 'copy',
      '-c:a', VIDEO_ASSEMBLY_CONFIG.AUDIO_CODEC,
      '-map', '0:v:0',
      '-map', '1:a:0',
      '-y',
      outputPath,
    ];
    await this.execute(args);
  }

  /**
   * Mux multiple audio files onto video with timing
   * Each audio starts at its scene's start time
   */
  async muxAudioVideo(
    videoPath: string,
    audioInputs: { path: string; startTime: number }[],
    outputPath: string
  ): Promise<void> {
    const inputArgs: string[] = ['-i', videoPath];
    const filterParts: string[] = [];
    const audioLabels: string[] = [];

    audioInputs.forEach((audio, index) => {
      inputArgs.push('-i', audio.path);
      const label = `[a${index}]`;
      // Delay audio to start at correct time (milliseconds)
      const delayMs = Math.round(audio.startTime * 1000);
      filterParts.push(`[${index + 1}:a]adelay=${delayMs}|${delayMs}${label}`);
      audioLabels.push(label);
    });

    // Mix all audio streams with normalize=0 to prevent volume reduction
    const mixFilter = `${audioLabels.join('')}amix=inputs=${audioInputs.length}:duration=longest:normalize=0[aout]`;
    filterParts.push(mixFilter);

    const filterComplex = filterParts.join(';');

    const args = [
      ...inputArgs,
      '-filter_complex', filterComplex,
      '-map', '0:v',
      '-map', '[aout]',
      '-c:v', 'copy',
      '-c:a', VIDEO_ASSEMBLY_CONFIG.AUDIO_CODEC,
      '-y',
      outputPath,
    ];

    await this.execute(args);
  }

  // ========================================
  // Story 5.4: Thumbnail Methods
  // ========================================

  /**
   * Extract a single frame from video at specified timestamp
   * Uses input seeking (-ss before -i) for faster seeking in large videos
   */
  async extractFrame(
    videoPath: string,
    timestamp: number,
    outputPath: string
  ): Promise<void> {
    const args = [
      '-ss', timestamp.toFixed(3),
      '-i', videoPath,
      '-vframes', '1',
      '-q:v', '2', // High quality JPEG
      '-y',
      outputPath,
    ];

    await this.execute(args);
  }

  /**
   * Extract multiple frames at specified timestamps
   * Returns array of output paths in same order as timestamps
   */
  async extractMultipleFrames(
    videoPath: string,
    timestamps: number[],
    outputDir: string
  ): Promise<string[]> {
    const outputPaths: string[] = [];

    for (let i = 0; i < timestamps.length; i++) {
      const outputPath = path.join(outputDir, `frame-${i}.jpg`);
      await this.extractFrame(videoPath, timestamps[i], outputPath);
      outputPaths.push(outputPath);
    }

    return outputPaths;
  }

  /**
   * Add text overlay to an image
   * Creates visually appealing text with shadow for legibility
   * Scales and pads image to target dimensions (1920x1080 by default)
   *
   * On Windows, uses explicit font file path to avoid Fontconfig dependency.
   * Falls back to just scaling the image if drawtext fails.
   */
  async addTextOverlay(
    inputPath: string,
    title: string,
    outputPath: string,
    width: number = VIDEO_ASSEMBLY_CONFIG.THUMBNAIL_WIDTH,
    height: number = VIDEO_ASSEMBLY_CONFIG.THUMBNAIL_HEIGHT
  ): Promise<void> {
    // Escape special characters in title for FFmpeg drawtext filter
    // FFmpeg requires escaping: backslash, colon, single quote
    const escapedTitle = title
      .replace(/\\/g, '\\\\\\\\') // Escape backslashes
      .replace(/:/g, '\\:') // Escape colons
      .replace(/'/g, "'\\''"); // Escape single quotes

    // Calculate font size based on title length to prevent overflow
    // Max 120px, scales down for longer titles (increased for better visibility)
    const fontSize = Math.min(120, Math.floor(2400 / Math.max(title.length, 10)));

    // On Windows, use explicit font file path to avoid Fontconfig dependency
    // FFmpeg on Windows needs the path with forward slashes and escaped colons
    const isWindows = process.platform === 'win32';
    const fontFile = isWindows
      ? 'fontfile=C\\\\:/Windows/Fonts/arial.ttf:'
      : '';

    // Build filter_complex for scaling, padding, and text overlay
    const filterComplex = [
      // Scale to fit within target dimensions while maintaining aspect ratio
      `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
      // Pad to exact target dimensions (centers the scaled image)
      `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`,
      // Add text shadow (offset 3px right, 3px down) for readability - centered vertically
      `drawtext=${fontFile}text='${escapedTitle}':fontsize=${fontSize}:fontcolor=black:x=(w-text_w)/2+3:y=(h-text_h)/2+3`,
      // Add main white text on top of shadow - centered vertically
      `drawtext=${fontFile}text='${escapedTitle}':fontsize=${fontSize}:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2`,
    ].join(',');

    const args = [
      '-i', inputPath,
      '-vf', filterComplex,
      '-q:v', String(VIDEO_ASSEMBLY_CONFIG.THUMBNAIL_QUALITY),
      '-y',
      outputPath,
    ];

    try {
      await this.execute(args);
    } catch (error) {
      // Fallback: if text overlay fails, just scale and pad the image without text
      console.warn('[FFmpegClient] Text overlay failed, falling back to scaled image only:', error);

      const fallbackFilter = [
        `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
        `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black`,
      ].join(',');

      const fallbackArgs = [
        '-i', inputPath,
        '-vf', fallbackFilter,
        '-q:v', String(VIDEO_ASSEMBLY_CONFIG.THUMBNAIL_QUALITY),
        '-y',
        outputPath,
      ];

      await this.execute(fallbackArgs);
    }
  }

  /**
   * Execute FFmpeg command
   */
  protected execute(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn(this.ffmpegPath, args);
      let stderr = '';

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      const timeoutId = setTimeout(() => {
        process.kill();
        reject(new Error(`FFmpeg command timed out after ${VIDEO_ASSEMBLY_CONFIG.FFMPEG_TIMEOUT}ms`));
      }, VIDEO_ASSEMBLY_CONFIG.FFMPEG_TIMEOUT);

      process.on('close', (code) => {
        clearTimeout(timeoutId);
        if (code !== 0) {
          reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`));
          return;
        }
        resolve();
      });

      process.on('error', (err) => {
        clearTimeout(timeoutId);
        reject(new Error(`FFmpeg error: ${err.message}`));
      });
    });
  }
}

// Export singleton instance for convenience
export const ffmpegClient = new FFmpegClient();
