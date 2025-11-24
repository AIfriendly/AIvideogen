// Video Assembler - Orchestrates the assembly pipeline
// STUB base from Story 5.1 + Story 5.2 trimAllScenes method

import { existsSync, mkdirSync } from 'fs';
import { AssemblyScene, AssemblyJob, JobProgressUpdate } from '../../src/types/assembly';
import { VIDEO_ASSEMBLY_CONFIG } from './constants';
import { FFmpegClient } from './ffmpeg';
import { Trimmer } from './trimmer';

export class VideoAssembler {
  private ffmpeg: FFmpegClient;

  constructor() {
    this.ffmpeg = new FFmpegClient();
  }

  // === Story 5.1 base methods (stubs) ===

  async createJob(projectId: string, totalScenes: number): Promise<string> {
    // Stub: In Story 5.1, this will create a database record
    const jobId = `asm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`[Assembler] Created job ${jobId} for project ${projectId} with ${totalScenes} scenes`);
    return jobId;
  }

  async updateJobProgress(jobId: string, update: JobProgressUpdate): Promise<void> {
    // Stub: In Story 5.1, this will update the database record
    console.log(`[Assembler] Job ${jobId} progress: ${update.stage} - ${update.progress}%${update.current_scene ? ` (scene ${update.current_scene})` : ''}`);
  }

  async getJobStatus(jobId: string): Promise<AssemblyJob | null> {
    // Stub: In Story 5.1, this will query the database
    console.log(`[Assembler] Getting status for job ${jobId}`);
    return null;
  }

  async failJob(jobId: string, errorMessage: string): Promise<void> {
    // Stub: In Story 5.1, this will update the database
    console.error(`[Assembler] Job ${jobId} failed: ${errorMessage}`);
  }

  async completeJob(jobId: string, videoPath: string, thumbnailPath: string): Promise<void> {
    // Stub: In Story 5.1, this will update the database
    console.log(`[Assembler] Job ${jobId} completed. Video: ${videoPath}, Thumbnail: ${thumbnailPath}`);
  }

  // === Story 5.2 trimming methods ===

  /**
   * Trim all scenes to match their voiceover durations
   * Returns array of trimmed video file paths
   */
  async trimAllScenes(
    jobId: string,
    scenes: AssemblyScene[]
  ): Promise<string[]> {
    const trimmer = new Trimmer(this.ffmpeg);
    const outputDir = `${VIDEO_ASSEMBLY_CONFIG.TEMP_DIR}/${jobId}`;

    // Ensure output directory exists
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const trimmedPaths: string[] = [];

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];

      // Update progress: Trimming is 0-30% of total assembly
      await this.updateJobProgress(jobId, {
        stage: 'trimming',
        progress: Math.round((i / scenes.length) * 30),
        current_scene: scene.scene_number
      });

      try {
        const trimmedPath = await trimmer.trimScene(scene, outputDir);
        trimmedPaths.push(trimmedPath);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await this.failJob(jobId, `Failed to trim scene ${scene.scene_number}: ${errorMessage}`);
        throw error;
      }
    }

    // Final progress update for trimming stage
    await this.updateJobProgress(jobId, {
      stage: 'trimming',
      progress: 30,
      current_scene: scenes.length
    });

    return trimmedPaths;
  }
}
