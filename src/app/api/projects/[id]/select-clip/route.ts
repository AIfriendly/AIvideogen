/**
 * Select Clip API Endpoint - Epic 4, Story 4.4
 *
 * POST /api/projects/[id]/select-clip - Save clip selection to database
 *
 * Updates the scenes.selected_clip_id column with the user's selection.
 * Validates that the scene belongs to the project and the suggestion belongs to the scene.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProject, updateSceneSelectedClip } from '@/lib/db/queries';
import db from '@/lib/db/client';
import { initializeDatabase } from '@/lib/db/init';

// Initialize database on first import (idempotent)
initializeDatabase();

/**
 * POST /api/projects/[id]/select-clip
 *
 * Request body:
 * {
 *   sceneId: string;
 *   suggestionId: string;
 * }
 *
 * Responses:
 * - 200: Success with { success: true, sceneId, selectedClipId }
 * - 400: Missing required fields or scene not in project
 * - 404: Project not found
 * - 409: Suggestion does not belong to specified scene
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

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON body',
          code: 'INVALID_REQUEST',
        },
        { status: 400 }
      );
    }

    const { sceneId, suggestionId } = body;

    // Validate required fields
    if (!sceneId) {
      return NextResponse.json(
        {
          success: false,
          error: 'sceneId is required',
          code: 'INVALID_REQUEST',
        },
        { status: 400 }
      );
    }

    if (!suggestionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'suggestionId is required',
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

    // Validate scene belongs to project
    const scene = db.prepare(`
      SELECT id FROM scenes WHERE id = ? AND project_id = ?
    `).get(sceneId, projectId) as { id: string } | undefined;

    if (!scene) {
      return NextResponse.json(
        {
          success: false,
          error: 'Scene not found in project',
          code: 'INVALID_REQUEST',
        },
        { status: 400 }
      );
    }

    // Validate suggestion belongs to scene
    const suggestion = db.prepare(`
      SELECT id FROM visual_suggestions WHERE id = ? AND scene_id = ?
    `).get(suggestionId, sceneId) as { id: string } | undefined;

    if (!suggestion) {
      return NextResponse.json(
        {
          success: false,
          error: 'Suggestion does not belong to specified scene',
          code: 'CONFLICT',
        },
        { status: 409 }
      );
    }

    // Update scenes table with selected_clip_id
    updateSceneSelectedClip(sceneId, suggestionId);

    console.log(`[Select Clip] Updated scene ${sceneId} with selected_clip_id ${suggestionId}`);

    return NextResponse.json(
      {
        success: true,
        sceneId,
        selectedClipId: suggestionId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API Error] POST /api/projects/[id]/select-clip:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to save selection',
        code: 'DATABASE_ERROR',
      },
      { status: 500 }
    );
  }
}
