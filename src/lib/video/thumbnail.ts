/**
 * Thumbnail Generator - Story 5.4
 *
 * Generates thumbnails from video files with title text overlay.
 * Uses FFmpeg for frame extraction and text rendering.
 */

import * as fs from 'fs';
import path from 'path';
import { FFmpegClient } from './ffmpeg';
import { VIDEO_ASSEMBLY_CONFIG } from './constants';

export interface ThumbnailOptions {
  videoPath: string;
  title: string;
  outputPath: string;
  width?: number;
  height?: number;
}

export interface ThumbnailResult {
  thumbnailPath: string;
  width: number;
  height: number;
  sourceTimestamp: number;
}

/**
 * ThumbnailGenerator class for creating video thumbnails
 */
export class ThumbnailGenerator {
  private ffmpeg: FFmpegClient;

  constructor(ffmpegClient?: FFmpegClient) {
    this.ffmpeg = ffmpegClient || new FFmpegClient();
  }

  /**
   * Generate a thumbnail from video with title overlay
   */
  async generate(options: ThumbnailOptions): Promise<ThumbnailResult> {
    const {
      videoPath,
      title,
      outputPath,
      width = VIDEO_ASSEMBLY_CONFIG.THUMBNAIL_WIDTH,
      height = VIDEO_ASSEMBLY_CONFIG.THUMBNAIL_HEIGHT,
    } = options;

    // Validate video exists
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Get video duration for frame selection
    const duration = await this.ffmpeg.getVideoDuration(videoPath);

    // Extract candidate frames at 10%, 50%, 90% of video
    const timestamps = [
      duration * 0.1,
      duration * 0.5,
      duration * 0.9,
    ];

    // Create temp directory for frames
    const tempDir = path.join(process.cwd(), VIDEO_ASSEMBLY_CONFIG.TEMP_DIR, 'thumbnails');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Generate unique prefix for this operation
    const uniqueId = Date.now().toString(36);
    const framePaths: string[] = [];

    try {
      // Extract frames
      for (let i = 0; i < timestamps.length; i++) {
        const framePath = path.join(tempDir, `${uniqueId}-frame-${i}.jpg`);
        await this.ffmpeg.extractFrame(videoPath, timestamps[i], framePath);
        framePaths.push(framePath);
      }

      // Select best frame (MVP: use middle frame at 50%)
      const bestFrameIndex = this.selectBestFrameIndex(framePaths);
      const bestFrame = framePaths[bestFrameIndex];
      const selectedTimestamp = timestamps[bestFrameIndex];

      // Add title text overlay to selected frame
      await this.ffmpeg.addTextOverlay(bestFrame, title, outputPath, width, height);

      // Verify output was created
      if (!fs.existsSync(outputPath)) {
        throw new Error(`Thumbnail generation failed: output not created at ${outputPath}`);
      }

      console.log(
        `[ThumbnailGenerator] Created thumbnail from frame at ${selectedTimestamp.toFixed(2)}s`
      );

      return {
        thumbnailPath: outputPath,
        width,
        height,
        sourceTimestamp: selectedTimestamp,
      };
    } finally {
      // Cleanup temp frames
      this.cleanupTempFrames(framePaths);
    }
  }

  /**
   * Select the best frame from candidates
   * MVP: Simply use the middle frame (50% timestamp)
   * Future: Implement frame scoring based on color variance, sharpness, etc.
   */
  selectBestFrameIndex(framePaths: string[]): number {
    // MVP implementation: use middle frame
    return Math.floor(framePaths.length / 2);
  }

  /**
   * Select the best frame path from candidates
   */
  selectBestFrame(framePaths: string[]): string {
    return framePaths[this.selectBestFrameIndex(framePaths)];
  }

  /**
   * Cleanup temporary frame files
   */
  private cleanupTempFrames(framePaths: string[]): void {
    for (const framePath of framePaths) {
      try {
        if (fs.existsSync(framePath)) {
          fs.unlinkSync(framePath);
        }
      } catch (error) {
        console.warn(`[ThumbnailGenerator] Failed to cleanup temp frame: ${framePath}`, error);
      }
    }
  }
}

// Export singleton instance for convenience
export const thumbnailGenerator = new ThumbnailGenerator();
