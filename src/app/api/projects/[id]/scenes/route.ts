/**
 * Scenes API Endpoint - Epic 4, Story 4.1
 *
 * GET /api/projects/[id]/scenes - Retrieve all scenes for a project
 *
 * Returns scenes ordered by scene_number ASC with all scene data
 * including text, audio metadata, and duration.
 *
 * Response Format:
 * Success (200): { success: true, data: { scenes: Scene[] } }
 * Not Found (404): { success: false, error: { message, code } }
 * Server Error (500): { success: false, error: { message, code } }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProject, getScenesByProjectId, type Scene } from '@/lib/db/queries';
import { initializeDatabase } from '@/lib/db/init';

// Initialize database on first import (idempotent)
initializeDatabase();

/**
 * GET /api/projects/[id]/scenes
 *
 * Retrieve all scenes for a specific project ordered by scene number
 *
 * @param request - Next.js request object
 * @param params - Route parameters containing project ID
 * @returns JSON response with scenes array or error
 *
 * Success Response (200):
 * {
 *   "success": true,
 *   "data": {
 *     "scenes": [
 *       {
 *         "id": "uuid-string",
 *         "project_id": "project-uuid",
 *         "scene_number": 1,
 *         "text": "Scene text content",
 *         "sanitized_text": "Sanitized text for TTS",
 *         "audio_file_path": "/path/to/audio.mp3",
 *         "duration": 5.2,
 *         "created_at": "2025-11-18T12:34:56.789Z",
 *         "updated_at": "2025-11-18T12:34:56.789Z"
 *       }
 *     ]
 *   }
 * }
 *
 * Error Response (404 - Project Not Found):
 * {
 *   "success": false,
 *   "error": {
 *     "message": "Project not found",
 *     "code": "NOT_FOUND"
 *   }
 * }
 *
 * Error Response (500 - Database Error):
 * {
 *   "success": false,
 *   "error": {
 *     "message": "Failed to fetch scenes",
 *     "code": "DATABASE_ERROR"
 *   }
 * }
 */
export async function GET(
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
          error: {
            message: 'Project ID is required',
            code: 'INVALID_REQUEST',
          },
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
          error: {
            message: 'Project not found',
            code: 'NOT_FOUND',
          },
        },
        { status: 404 }
      );
    }

    // Fetch scenes ordered by scene_number ASC
    const scenes = getScenesByProjectId(projectId);

    return NextResponse.json(
      {
        success: true,
        data: { scenes },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API Error] GET /api/projects/[id]/scenes:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to fetch scenes',
          code: 'DATABASE_ERROR',
        },
      },
      { status: 500 }
    );
  }
}
