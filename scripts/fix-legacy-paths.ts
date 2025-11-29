/**
 * Migration Script: Fix Legacy Absolute Paths
 *
 * This script converts absolute Windows paths stored in the database
 * to relative paths (public/...) for portability.
 *
 * Affected fields:
 * - projects.video_path
 * - projects.thumbnail_path
 *
 * Run with: npx tsx scripts/fix-legacy-paths.ts
 *
 * Created: Epic 5 Retrospective - Action Item
 */

import Database from 'better-sqlite3';
import path from 'path';

// Database path - adjust if needed
const DB_PATH = path.join(process.cwd(), 'ai-video-generator.db');

/**
 * Extract public-relative path from any path format
 */
function getPublicPath(inputPath: string): string {
  if (!inputPath) return '';

  // Normalize backslashes to forward slashes
  const normalized = inputPath.replace(/\\/g, '/');

  // Find 'public' segment
  const publicIndex = normalized.indexOf('public');

  if (publicIndex !== -1) {
    return normalized.substring(publicIndex);
  }

  // Already relative or doesn't contain 'public'
  return normalized;
}

/**
 * Check if path is an absolute Windows path
 */
function isAbsoluteWindowsPath(inputPath: string): boolean {
  if (!inputPath) return false;
  return /^[a-zA-Z]:[\\/]/.test(inputPath);
}

async function main() {
  console.log('='.repeat(60));
  console.log('Migration: Fix Legacy Absolute Paths');
  console.log('='.repeat(60));
  console.log(`\nDatabase: ${DB_PATH}\n`);

  // Open database
  const db = new Database(DB_PATH);

  // Get all projects with paths
  const projects = db.prepare(`
    SELECT id, video_path, thumbnail_path
    FROM projects
    WHERE video_path IS NOT NULL OR thumbnail_path IS NOT NULL
  `).all() as Array<{
    id: string;
    video_path: string | null;
    thumbnail_path: string | null;
  }>;

  console.log(`Found ${projects.length} projects with paths\n`);

  let videoPathsFixed = 0;
  let thumbnailPathsFixed = 0;
  let alreadyCorrect = 0;

  const updateStmt = db.prepare(`
    UPDATE projects
    SET video_path = ?, thumbnail_path = ?
    WHERE id = ?
  `);

  for (const project of projects) {
    let videoPath = project.video_path;
    let thumbnailPath = project.thumbnail_path;
    let needsUpdate = false;

    // Check and fix video_path
    if (videoPath && isAbsoluteWindowsPath(videoPath)) {
      const newPath = getPublicPath(videoPath);
      console.log(`[${project.id}] video_path:`);
      console.log(`  FROM: ${videoPath}`);
      console.log(`  TO:   ${newPath}`);
      videoPath = newPath;
      needsUpdate = true;
      videoPathsFixed++;
    }

    // Check and fix thumbnail_path
    if (thumbnailPath && isAbsoluteWindowsPath(thumbnailPath)) {
      const newPath = getPublicPath(thumbnailPath);
      console.log(`[${project.id}] thumbnail_path:`);
      console.log(`  FROM: ${thumbnailPath}`);
      console.log(`  TO:   ${newPath}`);
      thumbnailPath = newPath;
      needsUpdate = true;
      thumbnailPathsFixed++;
    }

    // Update if needed
    if (needsUpdate) {
      updateStmt.run(videoPath, thumbnailPath, project.id);
      console.log(`  ✓ Updated\n`);
    } else {
      alreadyCorrect++;
    }
  }

  db.close();

  // Summary
  console.log('='.repeat(60));
  console.log('Summary:');
  console.log('='.repeat(60));
  console.log(`  Video paths fixed:     ${videoPathsFixed}`);
  console.log(`  Thumbnail paths fixed: ${thumbnailPathsFixed}`);
  console.log(`  Already correct:       ${alreadyCorrect}`);
  console.log(`  Total projects:        ${projects.length}`);
  console.log('\n✓ Migration complete!\n');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
