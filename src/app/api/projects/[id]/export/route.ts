/**
 * Export API Endpoint - Story 5.5
 *
 * GET /api/projects/[id]/export
 *
 * Returns export metadata for completed videos including:
 * - Video path, thumbnail path
 * - Duration, file size
 * - Scene count, title
 * - Resolution
 *
 * Also updates project current_step to 'complete' on first view.
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db/client';
import { stat } from 'fs/promises';
import path from 'path';

interface ProjectRow {
  id: string;
  name: string | null;
  topic: string | null;
  video_path: string | null;
  thumbnail_path: string | null;
  total_duration: number | null;
  video_file_size: number | null;
  current_step: string | null;
}

interface SceneCountRow {
  count: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // Get project data
    const project = db.prepare(`
      SELECT id, name, topic, video_path, thumbnail_path, total_duration, video_file_size, current_step
      FROM projects
      WHERE id = ?
    `).get(projectId) as ProjectRow | undefined;

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found', code: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      );
    }

    if (!project.video_path) {
      return NextResponse.json(
        { error: 'No video available for this project', code: 'FILE_NOT_FOUND' },
        { status: 400 }
      );
    }

    // Get scene count
    const sceneResult = db.prepare(`
      SELECT COUNT(*) as count FROM scenes WHERE project_id = ?
    `).get(projectId) as SceneCountRow;

    // Get file size if not stored in database
    let fileSize = project.video_file_size;
    if (!fileSize) {
      try {
        // Try to get file size from filesystem
        const videoFullPath = path.join(process.cwd(), project.video_path);
        const stats = await stat(videoFullPath);
        fileSize = stats.size;
      } catch {
        // File might not exist at that path, try public folder
        try {
          const publicPath = path.join(process.cwd(), 'public', project.video_path.replace(/^public\//, ''));
          const stats = await stat(publicPath);
          fileSize = stats.size;
        } catch {
          fileSize = 0;
        }
      }
    }

    // Update current_step to 'complete' on first view
    if (project.current_step !== 'complete') {
      db.prepare(`
        UPDATE projects SET current_step = 'complete' WHERE id = ?
      `).run(projectId);
    }

    // Determine title from topic or name
    const title = project.topic || project.name || 'Untitled Video';

    // Transform video_path for client consumption
    // Videos stored in public/videos/{projectId}/final.mp4
    // Serve via /videos/{projectId}/final.mp4
    let videoPath = project.video_path;
    if (videoPath) {
      // Handle absolute paths (Windows or Unix)
      const publicIndex = videoPath.indexOf('public');
      if (publicIndex !== -1) {
        videoPath = videoPath.substring(publicIndex).replace(/\\/g, '/').replace('public/', '/');
      } else if (!videoPath.startsWith('/')) {
        videoPath = '/' + videoPath;
      }
    }

    // Transform thumbnail_path similarly
    let thumbnailPath = project.thumbnail_path;
    if (thumbnailPath) {
      // Handle absolute paths (Windows or Unix)
      const publicIndex = thumbnailPath.indexOf('public');
      if (publicIndex !== -1) {
        thumbnailPath = thumbnailPath.substring(publicIndex).replace(/\\/g, '/').replace('public/', '/');
      } else if (!thumbnailPath.startsWith('/')) {
        thumbnailPath = '/' + thumbnailPath;
      }
    }

    return NextResponse.json({
      video_path: videoPath,
      thumbnail_path: thumbnailPath,
      duration: project.total_duration || 0,
      file_size: fileSize || 0,
      scene_count: sceneResult.count,
      title,
      resolution: '1280x720', // Standard resolution per Epic 5 spec
    });
  } catch (error) {
    console.error('[export] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch export data',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
