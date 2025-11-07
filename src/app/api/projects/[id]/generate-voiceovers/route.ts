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
import { getProject, getScenesByProjectId } from '@/lib/db/queries';
import { initializeDatabase } from '@/lib/db/init';
import {
  generateVoiceoversWithProgress,
  validateVoiceoverPrerequisites,
} from '@/lib/tts/voiceover-generator';

// Initialize database on first import (idempotent)
initializeDatabase();

/**
 * In-memory progress tracking
 * Maps projectId -> { currentScene, totalScenes, status, error }
 */
const progressMap = new Map<
  string,
  {
    currentScene: number;
    totalScenes: number;
    status: 'generating' | 'complete' | 'error';
    error?: string;
    sceneNumber?: number;
  }
>();

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

    // Validate project ID is provided
    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project ID is required',
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

    // Validate prerequisites (script generated, voice selected)
    try {
      validateVoiceoverPrerequisites(project);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = errorMessage;

      let userMessage = 'Prerequisites not met';
      if (errorCode === 'SCRIPT_NOT_GENERATED') {
        userMessage = 'Script must be generated before voiceovers';
      } else if (errorCode === 'VOICE_NOT_SELECTED') {
        userMessage = 'Voice must be selected before voiceovers';
      }

      return NextResponse.json(
        {
          success: false,
          error: userMessage,
          code: errorCode,
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
    progressMap.set(projectId, {
      currentScene: 0,
      totalScenes: scenes.length,
      status: 'generating',
    });

    // Generate voiceovers with progress tracking
    const result = await generateVoiceoversWithProgress(
      projectId,
      project.voice_id!,
      (currentScene, totalScenes, sceneNumber) => {
        // Update progress map
        progressMap.set(projectId, {
          currentScene,
          totalScenes,
          status: 'generating',
          sceneNumber,
        });
      }
    );

    // Mark generation as complete
    progressMap.set(projectId, {
      currentScene: scenes.length,
      totalScenes: scenes.length,
      status: 'complete',
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

    // Update progress map to error state
    try {
      const match = request.url.match(/\/projects\/([^/]+)\/generate-voiceovers/);
      if (match && match[1]) {
        progressMap.set(match[1], {
          currentScene: 0,
          totalScenes: 0,
          status: 'error',
          error: errorMessage,
        });
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

/**
 * Export progress map for use in progress endpoint
 */
export { progressMap };
