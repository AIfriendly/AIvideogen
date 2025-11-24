// FFmpeg Client for Video Processing
// STUB base from Story 5.1 + Story 5.2 trim methods

import { spawn } from 'child_process';
import { VIDEO_ASSEMBLY_CONFIG } from './constants';

export interface FFProbeResult {
  duration: number;
  width: number;
  height: number;
  codec: string;
  bitrate: number;
}

export class FFmpegClient {
  private timeout: number;

  constructor(timeout?: number) {
    this.timeout = timeout || VIDEO_ASSEMBLY_CONFIG.FFMPEG_TIMEOUT;
  }

  // === Story 5.1 base methods (stubs) ===

  async getVideoDuration(videoPath: string): Promise<number> {
    const result = await this.probe(videoPath);
    return result.duration;
  }

  async getAudioDuration(audioPath: string): Promise<number> {
    const result = await this.probe(audioPath);
    return result.duration;
  }

  async probe(filePath: string): Promise<FFProbeResult> {
    return new Promise((resolve, reject) => {
      const args = [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        filePath
      ];

      const process = spawn('ffprobe', args);
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`FFprobe failed: ${stderr}`));
          return;
        }

        try {
          const data = JSON.parse(stdout);
          const format = data.format || {};
          const videoStream = data.streams?.find((s: { codec_type: string }) => s.codec_type === 'video') || {};

          resolve({
            duration: parseFloat(format.duration) || 0,
            width: videoStream.width || 0,
            height: videoStream.height || 0,
            codec: videoStream.codec_name || '',
            bitrate: parseInt(format.bit_rate) || 0
          });
        } catch (e) {
          reject(new Error(`Failed to parse FFprobe output: ${e}`));
        }
      });

      process.on('error', (err) => {
        reject(new Error(`FFprobe not found: ${err.message}. Ensure FFmpeg is installed and in PATH.`));
      });
    });
  }

  // === Story 5.2 trimming methods ===

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
      outputPath
    ];

    try {
      await this.execute(copyArgs);
    } catch (error) {
      // Fallback to re-encoding if copy fails
      console.warn('Copy codec failed, falling back to re-encode:', error);

      const encodeArgs = [
        '-i', videoPath,
        '-t', duration.toString(),
        '-c:v', VIDEO_ASSEMBLY_CONFIG.VIDEO_CODEC,
        '-c:a', VIDEO_ASSEMBLY_CONFIG.AUDIO_CODEC,
        '-y',
        outputPath
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
      outputPath
    ];

    await this.execute(args);
  }

  /**
   * Execute FFmpeg command
   */
  private execute(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn('ffmpeg', args);
      let stderr = '';

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      const timeoutId = setTimeout(() => {
        process.kill();
        reject(new Error(`FFmpeg command timed out after ${this.timeout}ms`));
      }, this.timeout);

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
        reject(new Error(`FFmpeg not found: ${err.message}. Ensure FFmpeg is installed and in PATH.`));
      });
    });
  }
}
