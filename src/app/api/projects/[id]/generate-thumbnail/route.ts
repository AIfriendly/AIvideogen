/**
 * Generate Thumbnail API - Story 5.4
 *
 * POST /api/projects/[id]/generate-thumbnail
 * Generates a thumbnail from the project's video with title overlay.
 */

import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'fs';
import path from 'path';
import db from '@/lib/db/client';
import { FFmpegClient } from '@/lib/video/ffmpeg';
import { ThumbnailGenerator } from '@/lib/video/thumbnail';
import { VIDEO_ASSEMBLY_CONFIG } from '@/lib/video/constants';
import { updateProjectThumbnail } from '@/lib/db/queries';
import { getPublicPath, toWebPath } from '@/lib/utils/paths';

interface ProjectRow {
  id: string;
  video_path: string | null;
  topic: string | null;
  name: string | null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // Get project to verify it exists and get video path and topic
    const projectStmt = db.prepare(`
      SELECT id, video_path, topic, name
      FROM projects
      WHERE id = ?
    `);
    const project = projectStmt.get(projectId) as ProjectRow | undefined;

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found', code: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      );
    }

    if (!project.video_path) {
      return NextResponse.json(
        { error: 'No video available for this project', code: 'VIDEO_NOT_FOUND' },
        { status: 400 }
      );
    }

    // Resolve video path - could be relative (public/...) or absolute
    let videoFilePath = project.video_path;
    if (!path.isAbsolute(videoFilePath)) {
      videoFilePath = path.join(process.cwd(), videoFilePath);
    }

    // Verify video file exists
    if (!existsSync(videoFilePath)) {
      return NextResponse.json(
        { error: 'Video file not found on disk', code: 'FILE_NOT_FOUND' },
        { status: 400 }
      );
    }

    // Use topic or name as the thumbnail text
    const title = project.topic || project.name || 'Untitled Video';

    // Generate thumbnail
    const ffmpeg = new FFmpegClient();
    const generator = new ThumbnailGenerator(ffmpeg);

    const outputPath = `${VIDEO_ASSEMBLY_CONFIG.OUTPUT_DIR}/${projectId}/thumbnail.jpg`;

    console.log(`[generate-thumbnail] Generating thumbnail for project ${projectId}`);
    console.log(`[generate-thumbnail] Video path: ${videoFilePath}`);
    console.log(`[generate-thumbnail] Title: ${title}`);

    const result = await generator.generate({
      videoPath: videoFilePath,
      title,
      outputPath,
    });

    // Update project with relative thumbnail path for database portability
    const relativeThumbnailPath = getPublicPath(result.thumbnailPath);
    updateProjectThumbnail(projectId, relativeThumbnailPath);

    console.log(`[generate-thumbnail] Thumbnail created: ${result.thumbnailPath}`);
    console.log(`[generate-thumbnail] Stored path: ${relativeThumbnailPath}`);

    // Return web-servable path for frontend
    return NextResponse.json({
      thumbnail_path: toWebPath(result.thumbnailPath),
      width: result.width,
      height: result.height,
      source_timestamp: result.sourceTimestamp,
    });
  } catch (error) {
    console.error('[generate-thumbnail] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate thumbnail',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
