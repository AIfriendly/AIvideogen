/**
 * Assembly Trigger API Endpoint - Epic 4, Story 4.5 + Epic 5, Story 5.1
 *
 * POST /api/projects/[id]/assemble - Trigger video assembly
 *
 * Validates all scenes have clip selections and creates an assembly job.
 * Story 5.1: Integrated with assembly_jobs table and proper job management.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getProject,
  createAssemblyJob,
  hasActiveAssemblyJob,
} from '@/lib/db/queries';
import db from '@/lib/db/client';
import { initializeDatabase } from '@/lib/db/init';
import { transformAssemblyJob } from '@/types/assembly';

// Initialize database on first import (idempotent)
initializeDatabase();

/**
 * Assembly scene data structure
 */
interface AssemblyScene {
  sceneId: string;
  sceneNumber: number;
  scriptText: string;
  audioFilePath: string;
  selectedClipId: string;
  videoId: string;
  clipDuration: number;
}

/**
 * Assembly response structure
 */
interface AssemblyResponse {
  assemblyJobId: string;
  status: 'queued' | 'processing' | 'complete' | 'error';
  message: string;
  sceneCount: number;
}

/**
 * POST /api/projects/[id]/assemble
 *
 * Triggers video assembly for a project.
 *
 * Responses:
 * - 200: Success with { assemblyJobId, status, message, sceneCount }
 * - 400: Not all scenes have selections
 * - 404: Project not found
 * - 500: Database error
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // Validate project ID is provided
    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project ID is required',
          code: 'INVALID_REQUEST',
        },
        { status: 400 }
      );
    }

    // Verify project exists
    const project = getProject(projectId);
    if (!project) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project not found',
          code: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Get total scene count for the project
    const totalScenesResult = db.prepare(`
      SELECT COUNT(*) as count FROM scenes WHERE project_id = ?
    `).get(projectId) as { count: number };

    if (totalScenesResult.count === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No scenes found for this project',
          code: 'NO_SCENES',
        },
        { status: 400 }
      );
    }

    // Load all scenes with selections (JOIN on visual_suggestions)
    // Note: INNER JOIN is intentional - if a suggestion is deleted after selection,
    // the scene will not appear in results, triggering the validation error below.
    // This ensures data integrity by requiring all selected clips to exist.
    const scenes = db.prepare(`
      SELECT
        s.id as sceneId,
        s.scene_number as sceneNumber,
        s.text as scriptText,
        s.audio_file_path as audioFilePath,
        s.selected_clip_id as selectedClipId,
        vs.video_id as videoId,
        vs.duration as clipDuration
      FROM scenes s
      INNER JOIN visual_suggestions vs ON s.selected_clip_id = vs.id
      WHERE s.project_id = ?
      ORDER BY s.scene_number
    `).all(projectId) as AssemblyScene[];

    // Validate all scenes have selections
    if (scenes.length !== totalScenesResult.count) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not all scenes have clip selections',
          code: 'INCOMPLETE_SELECTIONS',
          selectedCount: scenes.length,
          totalCount: totalScenesResult.count,
        },
        { status: 400 }
      );
    }

    // Check for existing active job (Story 5.1)
    if (hasActiveAssemblyJob(projectId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'An assembly job is already in progress for this project',
          code: 'JOB_ALREADY_EXISTS',
        },
        { status: 409 }
      );
    }

    // Create assembly job in database (Story 5.1)
    const job = createAssemblyJob(projectId, scenes.length);

    // Update project status to 'editing' (valid current_step value)
    db.prepare(`
      UPDATE projects
      SET current_step = 'editing'
      WHERE id = ?
    `).run(projectId);

    console.log(`[Assembly Trigger] Created job ${job.id} for project ${projectId} with ${scenes.length} scenes`);

    // Return job info (actual processing will be done by Stories 5.2-5.3)
    const response: AssemblyResponse = {
      assemblyJobId: job.id,
      status: 'queued',
      message: 'Video assembly started',
      sceneCount: scenes.length,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('[API Error] POST /api/projects/[id]/assemble:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to trigger assembly',
        code: 'DATABASE_ERROR',
      },
      { status: 500 }
    );
  }
}
