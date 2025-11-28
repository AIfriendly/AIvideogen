/**
 * Video Assembler - Story 5.1
 *
 * Manages video assembly jobs and orchestrates the assembly process.
 * Uses FFmpegClient for actual video processing operations.
 */

import { randomUUID } from 'crypto';
import { mkdir, rm } from 'fs/promises';
import { existsSync, mkdirSync, statSync } from 'fs';
import path from 'path';
import db from '@/lib/db/client';
import { FFmpegClient } from './ffmpeg';
import { Concatenator } from './concatenator';
import { ThumbnailGenerator } from './thumbnail';
import { VIDEO_ASSEMBLY_CONFIG, ASSEMBLY_JOB_STATUS } from './constants';
import { getPublicPath } from '@/lib/utils/paths';
import type { AssemblyJob, AssemblyJobStatus, AssemblyStage, AssemblyScene } from '@/types/assembly';

/**
 * VideoAssembler class for managing assembly jobs
 */
export class VideoAssembler {
  private ffmpeg: FFmpegClient;

  constructor(ffmpegClient?: FFmpegClient) {
    this.ffmpeg = ffmpegClient || new FFmpegClient();
  }

  /**
   * Create a new assembly job
   */
  async createJob(projectId: string, totalScenes: number): Promise<string> {
    const jobId = randomUUID();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO assembly_jobs (
        id, project_id, status, progress, current_stage, current_scene,
        total_scenes, error_message, started_at, completed_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      jobId,
      projectId,
      ASSEMBLY_JOB_STATUS.PENDING,
      0,
      null,
      null,
      totalScenes,
      null,
      null,
      null,
      now
    );

    console.log(`[VideoAssembler] Created job ${jobId} for project ${projectId}`);

    // Create temporary directory for this job
    const tempDir = path.join(process.cwd(), VIDEO_ASSEMBLY_CONFIG.TEMP_DIR, jobId);
    await mkdir(tempDir, { recursive: true });

    return jobId;
  }

  /**
   * Get assembly job by ID
   */
  getJobStatus(jobId: string): AssemblyJob | null {
    const stmt = db.prepare('SELECT * FROM assembly_jobs WHERE id = ?');
    return (stmt.get(jobId) as AssemblyJob) || null;
  }

  /**
   * Get assembly job by project ID
   */
  getJobByProject(projectId: string): AssemblyJob | null {
    const stmt = db.prepare(`
      SELECT * FROM assembly_jobs
      WHERE project_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `);
    return (stmt.get(projectId) as AssemblyJob) || null;
  }

  /**
   * Check if project has an active (pending/processing) job
   */
  hasActiveJob(projectId: string): boolean {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM assembly_jobs
      WHERE project_id = ? AND status IN (?, ?)
    `);
    const result = stmt.get(
      projectId,
      ASSEMBLY_JOB_STATUS.PENDING,
      ASSEMBLY_JOB_STATUS.PROCESSING
    ) as { count: number };
    return result.count > 0;
  }

  /**
   * Update job progress
   */
  updateJobProgress(
    jobId: string,
    progress: number,
    stage: AssemblyStage,
    currentScene?: number
  ): void {
    const updates: string[] = [
      'progress = ?',
      'current_stage = ?',
      'status = ?',
    ];
    const values: (string | number | null)[] = [
      Math.min(100, Math.max(0, progress)),
      stage,
      ASSEMBLY_JOB_STATUS.PROCESSING,
    ];

    if (currentScene !== undefined) {
      updates.push('current_scene = ?');
      values.push(currentScene);
    }

    // Set started_at on first progress update
    const job = this.getJobStatus(jobId);
    if (job && !job.started_at) {
      updates.push('started_at = ?');
      values.push(new Date().toISOString());
    }

    values.push(jobId);

    const stmt = db.prepare(`
      UPDATE assembly_jobs
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);
  }

  /**
   * Mark job as complete
   */
  async completeJob(jobId: string): Promise<void> {
    const stmt = db.prepare(`
      UPDATE assembly_jobs
      SET status = ?, progress = 100, completed_at = ?
      WHERE id = ?
    `);

    stmt.run(ASSEMBLY_JOB_STATUS.COMPLETE, new Date().toISOString(), jobId);

    console.log(`[VideoAssembler] Job ${jobId} completed successfully`);

    // Cleanup temporary directory
    await this.cleanupTempDir(jobId);
  }

  /**
   * Mark job as failed
   */
  async failJob(jobId: string, errorMessage: string): Promise<void> {
    const stmt = db.prepare(`
      UPDATE assembly_jobs
      SET status = ?, error_message = ?, completed_at = ?
      WHERE id = ?
    `);

    stmt.run(
      ASSEMBLY_JOB_STATUS.ERROR,
      errorMessage,
      new Date().toISOString(),
      jobId
    );

    console.error(`[VideoAssembler] Job ${jobId} failed: ${errorMessage}`);

    // Cleanup temporary directory
    await this.cleanupTempDir(jobId);
  }

  /**
   * Get temporary directory path for a job
   */
  getTempDir(jobId: string): string {
    return path.join(process.cwd(), VIDEO_ASSEMBLY_CONFIG.TEMP_DIR, jobId);
  }

  /**
   * Get output directory path
   */
  getOutputDir(): string {
    return path.join(process.cwd(), VIDEO_ASSEMBLY_CONFIG.OUTPUT_DIR);
  }

  /**
   * Cleanup temporary files for a job
   */
  private async cleanupTempDir(jobId: string): Promise<void> {
    const tempDir = this.getTempDir(jobId);
    try {
      await rm(tempDir, { recursive: true, force: true });
      console.log(`[VideoAssembler] Cleaned up temp dir: ${tempDir}`);
    } catch (error) {
      console.error(`[VideoAssembler] Failed to cleanup temp dir: ${error}`);
    }
  }

  /**
   * Update project with video output paths
   */
  updateProjectVideo(
    projectId: string,
    videoPath: string,
    thumbnailPath: string | null,
    totalDuration: number,
    fileSize: number
  ): void {
    const stmt = db.prepare(`
      UPDATE projects
      SET video_path = ?, thumbnail_path = ?, video_total_duration = ?, video_file_size = ?
      WHERE id = ?
    `);

    stmt.run(videoPath, thumbnailPath, totalDuration, fileSize, projectId);
  }

  /**
   * Assemble all trimmed scenes into final video with audio
   * Story 5.3: Main assembly orchestration
   */
  async assembleScenes(
    jobId: string,
    projectId: string,
    trimmedPaths: string[],
    scenes: AssemblyScene[]
  ): Promise<string> {
    const outputDir = `${VIDEO_ASSEMBLY_CONFIG.OUTPUT_DIR}/${projectId}`;

    // Ensure output directory exists
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    // Step 1: Concatenate all trimmed videos
    this.updateJobProgress(jobId, 35, 'concatenating');
    const concatenator = new Concatenator(this.ffmpeg);
    const concatPath = `${VIDEO_ASSEMBLY_CONFIG.TEMP_DIR}/${jobId}/concatenated.mp4`;

    await concatenator.concatenateVideos(trimmedPaths, concatPath);
    console.log(`[VideoAssembler] Concatenated ${trimmedPaths.length} scenes`);

    // Step 2: Overlay all audio tracks
    this.updateJobProgress(jobId, 60, 'audio_overlay');
    const finalPath = await this.overlayAllAudio(
      jobId,
      projectId,
      concatPath,
      scenes,
      outputDir
    );

    // Step 3: Generate thumbnail
    // Get project topic/name for thumbnail text
    const projectStmt = db.prepare('SELECT topic, name FROM projects WHERE id = ?');
    const project = projectStmt.get(projectId) as { topic: string | null; name: string | null } | undefined;
    const thumbnailTitle = project?.topic || project?.name || 'Video';

    let thumbnailPath: string | null = null;
    try {
      thumbnailPath = await this.generateThumbnail(jobId, finalPath, thumbnailTitle, projectId);
      console.log(`[VideoAssembler] Thumbnail generated: ${thumbnailPath}`);
    } catch (error) {
      // Thumbnail generation failure should not fail the whole assembly
      console.error('[VideoAssembler] Thumbnail generation failed (non-fatal):', error);
    }

    // Step 4: Finalize and update records
    this.updateJobProgress(jobId, 95, 'finalizing');
    const finalDuration = await this.ffmpeg.getVideoDuration(finalPath);
    const fileSize = statSync(finalPath).size;

    // Update project with video info
    // Store relative paths (public/...) in database for portability
    const relativeVideoPath = getPublicPath(finalPath);
    const relativeThumbnailPath = thumbnailPath ? getPublicPath(thumbnailPath) : null;
    this.updateProjectVideo(projectId, relativeVideoPath, relativeThumbnailPath, finalDuration, fileSize);

    return finalPath;
  }

  /**
   * Overlay voiceover audio for all scenes onto concatenated video
   */
  private async overlayAllAudio(
    jobId: string,
    projectId: string,
    videoPath: string,
    scenes: AssemblyScene[],
    outputDir: string
  ): Promise<string> {
    const finalPath = `${outputDir}/final.mp4`;

    // Build audio inputs with timing
    const audioInputs: { path: string; startTime: number }[] = [];
    let currentTime = 0;

    for (const scene of scenes) {
      if (!existsSync(scene.audioFilePath)) {
        throw new Error(
          `Audio file not found for scene ${scene.sceneNumber}: ${scene.audioFilePath}`
        );
      }

      audioInputs.push({
        path: scene.audioFilePath,
        startTime: currentTime,
      });

      // Use audioDuration (actual voiceover length) NOT clipDuration (original YouTube video length)
      // The videos are trimmed to match audio duration, so timing must use the same value
      currentTime += scene.audioDuration;
    }

    console.log(`[VideoAssembler] Overlaying ${audioInputs.length} audio tracks`);
    await this.ffmpeg.muxAudioVideo(videoPath, audioInputs, finalPath);

    // Validate output
    if (!existsSync(finalPath)) {
      throw new Error(`Audio overlay failed: output not created at ${finalPath}`);
    }

    return finalPath;
  }

  // ========================================
  // Story 5.4: Thumbnail Generation
  // ========================================

  /**
   * Generate thumbnail for completed video
   * Extracts a frame from the video and adds title text overlay
   */
  async generateThumbnail(
    jobId: string,
    videoPath: string,
    title: string,
    projectId: string
  ): Promise<string> {
    const generator = new ThumbnailGenerator(this.ffmpeg);

    // Update progress to thumbnail stage
    this.updateJobProgress(jobId, 75, 'thumbnail');

    const outputDir = path.join(process.cwd(), VIDEO_ASSEMBLY_CONFIG.OUTPUT_DIR, projectId);
    const thumbnailPath = path.join(outputDir, 'thumbnail.jpg');

    // Ensure output directory exists
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const result = await generator.generate({
      videoPath,
      title,
      outputPath: thumbnailPath,
    });

    // Update project with thumbnail path only
    // Store relative path (public/...) in database for portability
    const relativeThumbnailPath = getPublicPath(result.thumbnailPath);
    this.updateProjectThumbnail(projectId, relativeThumbnailPath);

    // Update progress
    this.updateJobProgress(jobId, 85, 'thumbnail');

    console.log(
      `[VideoAssembler] Thumbnail generated: ${result.thumbnailPath}, ` +
      `dimensions: ${result.width}x${result.height}, ` +
      `source timestamp: ${result.sourceTimestamp.toFixed(2)}s`
    );

    return result.thumbnailPath;
  }

  /**
   * Update project with thumbnail path only
   * Used when generating thumbnail without modifying video data
   */
  updateProjectThumbnail(projectId: string, thumbnailPath: string): void {
    const stmt = db.prepare(`
      UPDATE projects
      SET thumbnail_path = ?
      WHERE id = ?
    `);
    stmt.run(thumbnailPath, projectId);
  }
}

// Export singleton instance for convenience
export const videoAssembler = new VideoAssembler();
