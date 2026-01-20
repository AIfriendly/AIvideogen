/**
 * Cleanup utilities for temporary files and resources
 *
 * Provides helper functions for cleaning up after pipeline operations.
 *
 * @module lib/utils/cleanup
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Cleans up temporary files for a project
 *
 * @param projectId - The project ID to clean up
 * @returns Promise that resolves when cleanup is complete
 */
export async function cleanupTempFiles(projectId: string): Promise<void> {
  const tempDir = path.join(process.cwd(), '.cache', 'temp', projectId);

  if (fs.existsSync(tempDir)) {
    const files = fs.readdirSync(tempDir);
    files.forEach(file => {
      const filePath = path.join(tempDir, file);
      try {
        fs.unlinkSync(filePath);
      } catch (error) {
        // Log but don't throw - cleanup should be best-effort
        console.warn(`Failed to delete temp file: ${filePath}`, error);
      }
    });

    // Try to remove the directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to remove temp directory: ${tempDir}`, error);
    }
  }
}

/**
 * Cleans up orphaned audio files
 *
 * @param projectId - The project ID to clean up
 */
export async function cleanupOrphanedAudio(projectId: string): Promise<void> {
  const audioDir = path.join(process.cwd(), '.cache', 'audio', 'projects', projectId);

  if (fs.existsSync(audioDir)) {
    try {
      fs.rmSync(audioDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to cleanup audio directory: ${audioDir}`, error);
    }
  }
}
