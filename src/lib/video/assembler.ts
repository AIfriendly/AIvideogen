/**
 * Video Assembler - Story 5.1
 *
 * Manages video assembly jobs and orchestrates the assembly process.
 * Uses FFmpegClient for actual video processing operations.
 */

import { randomUUID } from 'crypto';
import { mkdir, rm } from 'fs/promises';
import path from 'path';
import db from '@/lib/db/client';
import { FFmpegClient } from './ffmpeg';
import { VIDEO_ASSEMBLY_CONFIG, ASSEMBLY_JOB_STATUS } from './constants';
import type { AssemblyJob, AssemblyJobStatus, AssemblyStage } from '@/types/assembly';

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
    thumbnailPath: string,
    totalDuration: number,
    fileSize: number
  ): void {
    const stmt = db.prepare(`
      UPDATE projects
      SET video_path = ?, thumbnail_path = ?, total_duration = ?, video_file_size = ?
      WHERE id = ?
    `);

    stmt.run(videoPath, thumbnailPath, totalDuration, fileSize, projectId);
  }
}

// Export singleton instance for convenience
export const videoAssembler = new VideoAssembler();
