/**
 * Cache Cleanup Service
 *
 * Manages cleanup of old video segments with 7-day retention policy.
 * Includes database synchronization to keep download status consistent.
 *
 * Story 3.6: Default Segment Download Service
 *
 * Features:
 * - 7-day retention policy (configurable)
 * - Database synchronization via filename parsing
 * - Orphaned file detection
 * - Dry-run mode for testing
 */

import fs from 'fs/promises';
import path from 'path';
import db from '../db/client';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Cleanup options
 */
export interface CleanupOptions {
  retentionDays: number;    // Default: 7
  dryRun?: boolean;         // Preview mode without deleting
}

/**
 * Cleanup result summary
 */
export interface CleanupResult {
  filesDeleted: number;
  spaceFreed: number;       // Bytes
  databaseUpdates: number;  // Number of DB records updated
  orphanedFiles: number;    // Files without DB record
  errors: string[];
}

/**
 * File info for cleanup
 */
interface FileInfo {
  path: string;
  size: number;
  mtime: Date;
  projectId: string;
  sceneNumber: number;
}

// ============================================================================
// Filename Parsing
// ============================================================================

/**
 * Parse filename to extract projectId and sceneNumber
 * Format: .cache/videos/{projectId}/scene-{sceneNumber}-default.mp4
 */
function parseFilename(filePath: string): { projectId: string; sceneNumber: number } | null {
  try {
    // Match pattern: .cache/videos/{projectId}/scene-{sceneNumber}-default.mp4
    const match = filePath.match(/\.cache[/\\]videos[/\\]([^/\\]+)[/\\]scene-(\d+)-default\.mp4$/);

    if (!match) {
      return null;
    }

    const projectId = match[1];
    const sceneNumber = parseInt(match[2], 10);

    if (isNaN(sceneNumber)) {
      return null;
    }

    return { projectId, sceneNumber };
  } catch (error) {
    console.error('[Cleanup] Failed to parse filename:', filePath, error);
    return null;
  }
}

// ============================================================================
// File Scanning
// ============================================================================

/**
 * Recursively scan directory for video files
 */
async function scanVideoFiles(basePath: string): Promise<FileInfo[]> {
  const files: FileInfo[] = [];

  try {
    const entries = await fs.readdir(basePath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(basePath, entry.name);

      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        const subFiles = await scanVideoFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile() && entry.name.endsWith('.mp4')) {
        // Get file stats
        try {
          const stats = await fs.stat(fullPath);

          // Parse filename
          const parsed = parseFilename(fullPath);

          if (parsed) {
            files.push({
              path: fullPath,
              size: stats.size,
              mtime: stats.mtime,
              projectId: parsed.projectId,
              sceneNumber: parsed.sceneNumber,
            });
          }
        } catch (statError) {
          console.error('[Cleanup] Failed to stat file:', fullPath, statError);
        }
      }
    }
  } catch (error) {
    console.error('[Cleanup] Failed to scan directory:', basePath, error);
  }

  return files;
}

// ============================================================================
// Database Synchronization
// ============================================================================

/**
 * Update database records for deleted files
 * Resets download_status to 'pending' and clears default_segment_path
 */
async function syncDatabaseAfterCleanup(deletedFiles: FileInfo[]): Promise<number> {
  let updatedCount = 0;

  for (const file of deletedFiles) {
    try {
      // Query database for suggestions with this file path
      const relativePath = path.relative(process.cwd(), file.path).replace(/\\/g, '/');

      const stmt = db.prepare(`
        SELECT vs.id, vs.download_status
        FROM visual_suggestions vs
        INNER JOIN scenes s ON vs.scene_id = s.id
        WHERE s.project_id = ?
          AND s.scene_number = ?
          AND vs.default_segment_path = ?
      `);

      const suggestions = stmt.all(file.projectId, file.sceneNumber, relativePath) as Array<{
        id: string;
        download_status: string;
      }>;

      // Update each suggestion using transaction
      for (const suggestion of suggestions) {
        try {
          const updateTransaction = db.transaction(() => {
            const updateStmt = db.prepare(`
              UPDATE visual_suggestions
              SET download_status = 'pending',
                  default_segment_path = NULL
              WHERE id = ?
            `);
            updateStmt.run(suggestion.id);
          });

          updateTransaction();
          updatedCount++;
        } catch (updateError) {
          console.error('[Cleanup] Failed to update suggestion:', suggestion.id, updateError);
        }
      }
    } catch (error) {
      console.error('[Cleanup] Failed to sync database for file:', file.path, error);
    }
  }

  return updatedCount;
}

/**
 * Find orphaned files (files without corresponding DB record)
 */
async function findOrphanedFiles(allFiles: FileInfo[]): Promise<FileInfo[]> {
  const orphaned: FileInfo[] = [];

  for (const file of allFiles) {
    try {
      const relativePath = path.relative(process.cwd(), file.path).replace(/\\/g, '/');

      // Check if any DB record references this file
      const stmt = db.prepare(`
        SELECT COUNT(*) as count
        FROM visual_suggestions vs
        INNER JOIN scenes s ON vs.scene_id = s.id
        WHERE s.project_id = ?
          AND s.scene_number = ?
          AND vs.default_segment_path = ?
      `);

      const result = stmt.get(file.projectId, file.sceneNumber, relativePath) as { count: number };

      if (result.count === 0) {
        orphaned.push(file);
      }
    } catch (error) {
      console.error('[Cleanup] Failed to check orphan status for file:', file.path, error);
    }
  }

  return orphaned;
}

// ============================================================================
// Main Cleanup Function
// ============================================================================

/**
 * Clean up old video segments with retention policy
 * @param options - Cleanup options (retentionDays, dryRun)
 * @returns Cleanup result summary
 */
export async function cleanupOldSegments(
  options: CleanupOptions = { retentionDays: 7, dryRun: false }
): Promise<CleanupResult> {
  const { retentionDays, dryRun = false } = options;

  console.log(`[Cleanup] Starting cleanup (retention: ${retentionDays} days, dry-run: ${dryRun})`);

  const result: CleanupResult = {
    filesDeleted: 0,
    spaceFreed: 0,
    databaseUpdates: 0,
    orphanedFiles: 0,
    errors: [],
  };

  try {
    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    console.log(`[Cleanup] Cutoff date: ${cutoffDate.toISOString()}`);

    // Scan video cache directory
    const videoCachePath = path.join(process.cwd(), '.cache', 'videos');

    try {
      await fs.access(videoCachePath);
    } catch (accessError) {
      // Directory doesn't exist - nothing to clean
      console.log('[Cleanup] Video cache directory does not exist, nothing to clean');
      return result;
    }

    const allFiles = await scanVideoFiles(videoCachePath);
    console.log(`[Cleanup] Found ${allFiles.length} video files`);

    // Filter files older than retention period
    const filesToDelete = allFiles.filter(file => file.mtime < cutoffDate);
    console.log(`[Cleanup] ${filesToDelete.length} files older than ${retentionDays} days`);

    if (filesToDelete.length === 0) {
      console.log('[Cleanup] No files to delete');
      return result;
    }

    // Identify orphaned files (for logging)
    const orphanedFiles = await findOrphanedFiles(filesToDelete);
    result.orphanedFiles = orphanedFiles.length;

    if (orphanedFiles.length > 0) {
      console.log(`[Cleanup] Found ${orphanedFiles.length} orphaned files (no DB record)`);
      orphanedFiles.forEach(file => {
        console.log(`  - ${file.path}`);
      });
    }

    // Delete files (or simulate in dry-run mode)
    for (const file of filesToDelete) {
      try {
        if (!dryRun) {
          await fs.unlink(file.path);
        }

        result.filesDeleted++;
        result.spaceFreed += file.size;

        console.log(`[Cleanup] ${dryRun ? '[DRY-RUN] Would delete' : 'Deleted'}: ${file.path} (${file.size} bytes)`);
      } catch (deleteError: any) {
        const errorMsg = `Failed to delete ${file.path}: ${deleteError.message}`;
        console.error(`[Cleanup] ${errorMsg}`);
        result.errors.push(errorMsg);
      }
    }

    // Sync database (skip in dry-run mode)
    if (!dryRun) {
      console.log('[Cleanup] Syncing database...');
      result.databaseUpdates = await syncDatabaseAfterCleanup(filesToDelete);
      console.log(`[Cleanup] Updated ${result.databaseUpdates} database records`);
    } else {
      console.log('[Cleanup] [DRY-RUN] Would update database records');
    }

    // Summary
    const spaceMB = (result.spaceFreed / (1024 * 1024)).toFixed(2);
    console.log(`[Cleanup] Complete: ${result.filesDeleted} files deleted, ${spaceMB} MB freed, ${result.databaseUpdates} DB updates, ${result.orphanedFiles} orphaned files`);

    return result;
  } catch (error: any) {
    const errorMsg = `Cleanup failed: ${error.message}`;
    console.error(`[Cleanup] ${errorMsg}`);
    result.errors.push(errorMsg);
    return result;
  }
}

/**
 * Convenience function: Clean up with default settings (7-day retention)
 */
export async function cleanupWithDefaults(): Promise<CleanupResult> {
  return cleanupOldSegments({ retentionDays: 7, dryRun: false });
}

/**
 * Convenience function: Dry-run preview (no deletions)
 */
export async function previewCleanup(retentionDays: number = 7): Promise<CleanupResult> {
  return cleanupOldSegments({ retentionDays, dryRun: true });
}
