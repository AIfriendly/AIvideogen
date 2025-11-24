/**
 * Video Concatenator - Scene video concatenation logic
 * Story 5.3: Video Concatenation & Audio Overlay
 */

import { existsSync, writeFileSync, unlinkSync } from 'fs';
import { FFmpegClient } from './ffmpeg';

export interface ConcatResult {
  outputPath: string;
  totalDuration: number;
  sceneCount: number;
}

export class Concatenator {
  constructor(private ffmpeg: FFmpegClient) {}

  /**
   * Concatenate multiple video files into one
   * Uses FFmpeg concat demuxer for efficient joining
   */
  async concatenateVideos(
    inputPaths: string[],
    outputPath: string
  ): Promise<string> {
    if (inputPaths.length === 0) {
      throw new Error('No input videos to concatenate');
    }

    // Validate all input files exist
    for (const inputPath of inputPaths) {
      if (!existsSync(inputPath)) {
        throw new Error(`Input video not found: ${inputPath}`);
      }
    }

    // Generate concat demuxer list file
    const listFilePath = await this.generateConcatFile(inputPaths, outputPath);

    try {
      // Execute concatenation
      console.log(`[Concatenator] Concatenating ${inputPaths.length} videos`);
      await this.ffmpeg.concat(listFilePath, outputPath);

      // Validate output
      if (!existsSync(outputPath)) {
        throw new Error(`Concatenation failed: output not created at ${outputPath}`);
      }

      console.log(`[Concatenator] Successfully created: ${outputPath}`);
      return outputPath;
    } finally {
      // Clean up list file
      if (existsSync(listFilePath)) {
        unlinkSync(listFilePath);
      }
    }
  }

  /**
   * Generate FFmpeg concat demuxer list file
   */
  private async generateConcatFile(
    inputPaths: string[],
    outputPath: string
  ): Promise<string> {
    const listFilePath = outputPath.replace(/\.[^.]+$/, '-list.txt');

    // Format paths for concat demuxer (handle Windows backslashes and special chars)
    const content = inputPaths
      .map(p => `file '${p.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`)
      .join('\n');

    writeFileSync(listFilePath, content);
    return listFilePath;
  }

  /**
   * Get total duration of concatenated result
   */
  async getTotalDuration(videoPath: string): Promise<number> {
    return this.ffmpeg.getVideoDuration(videoPath);
  }
}
