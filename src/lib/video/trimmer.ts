/**
 * Video Trimmer - Scene video trimming logic
 * Story 5.2: Scene Video Trimming & Preparation
 *
 * Handles trimming video clips to match voiceover duration.
 * Edge cases: long videos (trim), short videos (loop/extend).
 */

import { existsSync } from 'fs';
import { AssemblyScene } from '@/types/assembly';
import { FFmpegClient } from './ffmpeg';

export interface TrimResult {
  outputPath: string;
  originalDuration: number;
  trimmedDuration: number;
  wasLooped: boolean;
}

export class Trimmer {
  constructor(private ffmpeg: FFmpegClient) {}

  /**
   * Trim a scene's video to match its voiceover duration
   * Handles edge cases: long videos (trim), short videos (loop)
   */
  async trimScene(
    scene: AssemblyScene,
    outputDir: string
  ): Promise<string> {
    // Get video path from defaultSegmentPath
    const videoPath = scene.defaultSegmentPath || '';

    // Validate input file exists
    if (!existsSync(videoPath)) {
      throw new Error(
        `Video file not found: ${videoPath}. ` +
        `Cannot trim scene ${scene.sceneNumber}.`
      );
    }

    const videoDuration = await this.ffmpeg.getVideoDuration(videoPath);
    // CRITICAL: Use audioDuration (actual voiceover length), NOT clipDuration (YouTube video duration)
    // Videos must be trimmed to match voiceover duration for proper audio sync
    const audioDuration = scene.audioDuration;
    const outputPath = `${outputDir}/scene-${scene.sceneNumber}-trimmed.mp4`;

    // Log the operation
    console.log(
      `[Trimmer] Scene ${scene.sceneNumber}: ` +
      `video=${videoDuration.toFixed(2)}s, audio=${audioDuration.toFixed(2)}s`
    );

    // Determine trim strategy based on duration comparison
    // Allow 0.5s tolerance for "exact match" to avoid unnecessary operations
    const tolerance = 0.5;

    if (Math.abs(videoDuration - audioDuration) < tolerance) {
      // Durations match closely - just copy the file
      await this.ffmpeg.trimVideo(videoPath, audioDuration, outputPath);
      console.log(`[Trimmer] Scene ${scene.sceneNumber}: exact match, minimal trim`);
    } else if (videoDuration >= audioDuration) {
      // Video is long enough - trim to audio duration
      await this.ffmpeg.trimVideo(videoPath, audioDuration, outputPath);
      console.log(`[Trimmer] Scene ${scene.sceneNumber}: trimmed from ${videoDuration.toFixed(2)}s to ${audioDuration.toFixed(2)}s`);
    } else {
      // Video is too short - need to loop
      await this.handleShortVideo(
        videoPath,
        audioDuration,
        videoDuration,
        outputPath,
        scene.sceneNumber
      );
    }

    // Validate output was created
    if (!existsSync(outputPath)) {
      throw new Error(
        `Trimmed output not created: ${outputPath}. ` +
        `FFmpeg command may have failed for scene ${scene.sceneNumber}.`
      );
    }

    // Validate output duration
    const outputDuration = await this.ffmpeg.getVideoDuration(outputPath);
    if (Math.abs(outputDuration - audioDuration) > tolerance) {
      console.warn(
        `[Trimmer] Warning: Scene ${scene.sceneNumber} duration mismatch. ` +
        `Expected ${audioDuration.toFixed(2)}s, got ${outputDuration.toFixed(2)}s`
      );
    }

    return outputPath;
  }

  /**
   * Handle videos that are shorter than the required duration
   * Loops the video to reach target duration, then trims to exact length
   */
  private async handleShortVideo(
    videoPath: string,
    targetDuration: number,
    actualDuration: number,
    outputPath: string,
    sceneNumber: number
  ): Promise<void> {
    // Calculate how many loops needed
    const loopCount = Math.ceil(targetDuration / actualDuration);

    console.log(
      `[Trimmer] Scene ${sceneNumber}: video too short ` +
      `(${actualDuration.toFixed(2)}s < ${targetDuration.toFixed(2)}s), ` +
      `looping ${loopCount}x`
    );

    // Use FFmpeg loop feature
    await this.ffmpeg.loopVideo(videoPath, targetDuration, actualDuration, outputPath);
  }

  /**
   * Trim multiple scenes in sequence
   * Useful for batch processing with progress tracking
   */
  async trimScenes(
    scenes: AssemblyScene[],
    outputDir: string,
    onProgress?: (sceneNumber: number, total: number) => void
  ): Promise<string[]> {
    const results: string[] = [];

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];

      if (onProgress) {
        onProgress(scene.sceneNumber, scenes.length);
      }

      const outputPath = await this.trimScene(scene, outputDir);
      results.push(outputPath);
    }

    return results;
  }

  /**
   * Get detailed trim result with metadata
   */
  async trimSceneWithDetails(
    scene: AssemblyScene,
    outputDir: string
  ): Promise<TrimResult> {
    const videoPath = scene.defaultSegmentPath || '';
    const videoDuration = await this.ffmpeg.getVideoDuration(videoPath);
    const outputPath = await this.trimScene(scene, outputDir);

    return {
      outputPath,
      originalDuration: videoDuration,
      trimmedDuration: scene.audioDuration,
      wasLooped: videoDuration < scene.audioDuration,
    };
  }
}
