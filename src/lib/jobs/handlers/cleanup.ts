/**
 * Cache Cleanup Handler - Story 6.2
 *
 * Handler for cleaning up old cache files.
 */

import fs from 'fs';
import path from 'path';
import type { Job, JobHandler } from '../types';
import { jobQueue } from '../queue';

/**
 * Cache directories to clean
 */
const CACHE_DIRECTORIES = [
  '.cache/videos',
  '.cache/audio',
  '.cache/output',
];

/**
 * Cache Cleanup Job Handler
 *
 * Cleans up old cache files based on maxAgeDays parameter.
 */
export const cacheCleanupHandler: JobHandler = async (job: Job) => {
  const { maxAgeDays = 30 } = job.payload as { maxAgeDays?: number };

  console.log(`[cacheCleanupHandler] Starting cleanup (maxAgeDays: ${maxAgeDays})`);

  // Update progress
  jobQueue.updateProgress(job.id, 10);

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
  const cutoffTime = cutoffDate.getTime();

  let totalDeleted = 0;
  let totalBytes = 0;
  const errors: string[] = [];

  // Process each cache directory
  const progressPerDir = 80 / CACHE_DIRECTORIES.length;

  for (let i = 0; i < CACHE_DIRECTORIES.length; i++) {
    const cacheDir = path.join(process.cwd(), CACHE_DIRECTORIES[i]);

    try {
      const result = await cleanDirectory(cacheDir, cutoffTime);
      totalDeleted += result.deleted;
      totalBytes += result.bytes;
    } catch (error) {
      const err = error as Error;
      console.error(`[cacheCleanupHandler] Error cleaning ${cacheDir}:`, err.message);
      errors.push(`${CACHE_DIRECTORIES[i]}: ${err.message}`);
    }

    // Update progress
    jobQueue.updateProgress(job.id, 10 + Math.round((i + 1) * progressPerDir));
  }

  // Also clean old completed jobs from database
  jobQueue.updateProgress(job.id, 95);
  const deletedJobs = cleanOldJobs(maxAgeDays);

  console.log(`[cacheCleanupHandler] Completed: ${totalDeleted} files, ${formatBytes(totalBytes)}, ${deletedJobs} old jobs`);

  return {
    success: errors.length === 0,
    deleted: totalDeleted,
    bytes: totalBytes,
    bytesFormatted: formatBytes(totalBytes),
    deletedJobs,
    errors: errors.length > 0 ? errors : undefined,
  };
};

/**
 * Clean a directory recursively
 */
async function cleanDirectory(
  dirPath: string,
  cutoffTime: number
): Promise<{ deleted: number; bytes: number }> {
  let deleted = 0;
  let bytes = 0;

  if (!fs.existsSync(dirPath)) {
    return { deleted, bytes };
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    try {
      if (entry.isDirectory()) {
        // Recurse into subdirectories
        const result = await cleanDirectory(fullPath, cutoffTime);
        deleted += result.deleted;
        bytes += result.bytes;

        // Remove empty directories
        try {
          const remaining = fs.readdirSync(fullPath);
          if (remaining.length === 0) {
            fs.rmdirSync(fullPath);
          }
        } catch {
          // Ignore errors removing directories
        }
      } else if (entry.isFile()) {
        const stats = fs.statSync(fullPath);

        if (stats.mtimeMs < cutoffTime) {
          bytes += stats.size;
          fs.unlinkSync(fullPath);
          deleted++;
        }
      }
    } catch (error) {
      // Log but continue with other files
      console.error(`[cacheCleanupHandler] Error processing ${fullPath}:`, error);
    }
  }

  return { deleted, bytes };
}

/**
 * Clean old completed/failed jobs from database
 */
function cleanOldJobs(maxAgeDays: number): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxAgeDays);

  // Import db directly to avoid circular dependency
  const db = require('@/lib/db/client').default;

  const result = db.prepare(`
    DELETE FROM background_jobs
    WHERE status IN ('completed', 'failed', 'cancelled')
      AND completed_at < ?
  `).run(cutoff.toISOString());

  return result.changes;
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
