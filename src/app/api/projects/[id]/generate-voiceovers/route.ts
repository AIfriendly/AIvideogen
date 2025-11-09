/**
 * Voiceover Generation API Endpoint
 *
 * POST /api/projects/[id]/generate-voiceovers - Generate TTS audio for all script scenes
 *
 * This endpoint orchestrates the voiceover generation pipeline:
 * 1. Validates project exists and has completed prerequisites
 * 2. Verifies script has been generated and voice has been selected
 * 3. Delegates to business logic layer for TTS generation
 * 4. Returns summary of generated audio files
 *
 * Standard response format:
 * Success: { success: true, data: { projectId, sceneCount, totalDuration, audioFiles } }
 * Error: { success: false, error: string }
 *
 * Story 2.5: Voiceover Generation for Scenes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProject, getScenesByProjectId, updateProject } from '@/lib/db/queries';
import { initializeDatabase } from '@/lib/db/init';
import { generateVoiceoversWithProgress } from '@/lib/tts/voiceover-generator';
import {
  setProgress,
  updateProgress as updateProgressCache,
  completeProgress,
  failProgress,
} from '@/lib/stores/voiceover-progress-cache';

// Initialize database on first import (idempotent)
await initializeDatabase();

/**
 * POST /api/projects/[id]/generate-voiceovers
 *
 * Generate voiceovers for all scenes in a project
 *
 * Request Body: (empty - uses project data from database)
 *
 * @param request - Next.js request object
 * @param params - Route parameters containing project ID
 * @returns JSON response with generation summary or error
 *
 * Success Response (200):
 * {
 *   "success": true,
 *   "data": {
 *     "projectId": "uuid-string",
 *     "sceneCount": 5,
 *     "totalDuration": 45.3,
 *     "audioFiles": [
 *       {
 *         "sceneNumber": 1,
 *         "audioPath": ".cache/audio/projects/{id}/scene-1.mp3",
 *         "duration": 8.5
 *       }
 *     ]
 *   }
 * }
 *
 * Error Response (400 - Script Not Generated):
 * {
 *   "success": false,
 *   "error": "Script must be generated before voiceovers",
 *   "code": "SCRIPT_NOT_GENERATED"
 * }
 *
 * Error Response (400 - Voice Not Selected):
 * {
 *   "success": false,
 *   "error": "Voice must be selected before voiceovers",
 *   "code": "VOICE_NOT_SELECTED"
 * }
 *
 * Error Response (400 - No Scenes):
 * {
 *   "success": false,
 *   "error": "No scenes exist for this project",
 *   "code": "NO_SCENES_FOUND"
 * }
 *
 * Error Response (404 - Project Not Found):
 * {
 *   "success": false,
 *   "error": "Project not found with ID: {id}",
 *   "code": "PROJECT_NOT_FOUND"
 * }
 *
 * Error Response (500 - TTS Service Error):
 * {
 *   "success": false,
 *   "error": "TTS generation failed",
 *   "code": "TTS_SERVICE_ERROR"
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    console.log(`[Voiceover Generation API] Starting generation for project: ${projectId}`);

    // Validate project ID format (UUID v4) - Security: Prevent path traversal
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!projectId || !uuidV4Regex.test(projectId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid project ID format. Project ID must be a valid UUID v4.',
          code: 'INVALID_PROJECT_ID',
        },
        { status: 400 }
      );
    }

    // Load project from database
    const project = getProject(projectId);

    if (!project) {
      return NextResponse.json(
        {
          success: false,
          error: `Project not found with ID: ${projectId}`,
          code: 'PROJECT_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Validate prerequisites: script generated
    if (!project.script_generated) {
      return NextResponse.json(
        {
          success: false,
          error: 'Script must be generated before voiceovers',
          code: 'SCRIPT_NOT_GENERATED',
        },
        { status: 400 }
      );
    }

    // Validate prerequisites: voice selected
    if (!project.voice_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Voice must be selected before voiceovers',
          code: 'VOICE_NOT_SELECTED',
        },
        { status: 400 }
      );
    }

    // Load scenes from database
    const scenes = getScenesByProjectId(projectId);

    if (scenes.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No scenes exist for this project',
          code: 'NO_SCENES_FOUND',
        },
        { status: 400 }
      );
    }

    console.log(
      `[Voiceover Generation API] Found ${scenes.length} scenes, using voice: ${project.voice_id}`
    );

    // Initialize progress tracking
    setProgress(projectId, {
      projectId,
      status: 'generating',
      currentScene: 0,
      totalScenes: scenes.length,
      progress: 0,
      startedAt: new Date(),
    });

    // Generate voiceovers with progress tracking
    const result = await generateVoiceoversWithProgress(
      projectId,
      scenes,
      project.voice_id,
      (currentScene, totalScenes) => {
        // Update progress cache
        updateProgressCache(projectId, currentScene, totalScenes);
      }
    );

    // Mark generation as complete
    completeProgress(projectId);

    // Update project workflow state
    updateProject(projectId, {
      current_step: 'visual-sourcing',
    });

    // Load updated scenes with audio paths
    const updatedScenes = getScenesByProjectId(projectId);

    // Build response
    const audioFiles = updatedScenes
      .filter((s) => s.audio_file_path)
      .map((s) => ({
        sceneNumber: s.scene_number,
        audioPath: s.audio_file_path!,
        duration: s.duration!,
      }));

    console.log(
      `[Voiceover Generation API] Complete: ${result.completed} completed, ${result.skipped} skipped, ${result.failed} failed`
    );

    return NextResponse.json({
      success: true,
      data: {
        projectId: project.id,
        sceneCount: scenes.length,
        totalDuration: result.totalDuration,
        audioFiles,
        summary: {
          completed: result.completed,
          skipped: result.skipped,
          failed: result.failed,
        },
        errors: result.errors,
      },
    });
  } catch (error) {
    console.error('[Voiceover Generation API] Error:', error);

    // Extract error code if present
    const errorMessage = error instanceof Error ? error.message : String(error);
    let errorCode = 'TTS_SERVICE_ERROR';

    if (errorMessage === 'NO_SCENES_FOUND') {
      errorCode = 'NO_SCENES_FOUND';
    } else if (errorMessage.includes('TTS')) {
      errorCode = 'TTS_SERVICE_ERROR';
    } else if (errorMessage.includes('database')) {
      errorCode = 'DATABASE_ERROR';
    }

    // Update progress cache to error state
    try {
      const { id: projectId } = await params;
      if (projectId) {
        failProgress(projectId, errorMessage);
      }
    } catch (err) {
      // Ignore error in error handler
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        code: errorCode,
      },
      { status: 500 }
    );
  }
}
