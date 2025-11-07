/**
 * Voice Selection API Endpoint
 *
 * POST /api/projects/[id]/select-voice
 *
 * Saves the selected voice for a project and advances workflow to script generation.
 *
 * @module app/api/projects/[id]/select-voice
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProject, updateProject } from '@/lib/db/queries';
import { initializeDatabase } from '@/lib/db/init';
import { MVP_VOICES } from '@/lib/tts/voice-profiles';

// Initialize database on first import (idempotent)
initializeDatabase();

/**
 * Request body interface
 */
interface SelectVoiceRequest {
  voiceId: string;
}

/**
 * Success response interface
 */
interface SelectVoiceResponse {
  success: boolean;
  data?: {
    projectId: string;
    voiceId: string;
    voiceSelected: boolean;
    currentStep: string;
  };
  error?: {
    message: string;
    code: string;
  };
}

/**
 * POST /api/projects/[id]/select-voice
 *
 * Saves voice selection and advances workflow to script generation.
 *
 * Request Body:
 * {
 *   "voiceId": "sarah"  // Must be a valid MVP voice ID
 * }
 *
 * Success Response (200):
 * {
 *   "success": true,
 *   "data": {
 *     "projectId": "uuid-string",
 *     "voiceId": "sarah",
 *     "voiceSelected": true,
 *     "currentStep": "script-generation"
 *   }
 * }
 *
 * Error Response (400/404/500):
 * {
 *   "success": false,
 *   "error": {
 *     "message": "Error description",
 *     "code": "ERROR_CODE"
 *   }
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params to get project ID (Next.js 15 async params)
    const { id: projectId } = await params;

    // Parse request body
    let body: SelectVoiceRequest;
    try {
      body = await request.json();
    } catch (err) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Invalid request body',
            code: 'INVALID_REQUEST',
          },
        } as SelectVoiceResponse,
        { status: 400 }
      );
    }

    const { voiceId } = body;

    // Validate voiceId
    if (!voiceId || typeof voiceId !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'voiceId is required and must be a string',
            code: 'INVALID_VOICE_ID',
          },
        } as SelectVoiceResponse,
        { status: 400 }
      );
    }

    // Validate voiceId exists in MVP_VOICES (application-level check)
    const voiceExists = MVP_VOICES.some((v) => v.id === voiceId);
    if (!voiceExists) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: `Invalid voice ID: ${voiceId}`,
            code: 'VOICE_NOT_FOUND',
          },
        } as SelectVoiceResponse,
        { status: 400 }
      );
    }

    // Validate projectId format (UUID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(projectId)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Invalid project ID format',
            code: 'INVALID_PROJECT_ID',
          },
        } as SelectVoiceResponse,
        { status: 400 }
      );
    }

    // Load project from database
    const project = getProject(projectId);
    if (!project) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: `Project not found: ${projectId}`,
            code: 'PROJECT_NOT_FOUND',
          },
        } as SelectVoiceResponse,
        { status: 404 }
      );
    }

    // Update project with voice selection
    // Atomic update: voice_id, voice_selected, current_step, last_active
    updateProject(projectId, {
      voice_id: voiceId,
      voice_selected: true,
      current_step: 'script-generation',
    });

    // Return success response
    return NextResponse.json(
      {
        success: true,
        data: {
          projectId,
          voiceId,
          voiceSelected: true,
          currentStep: 'script-generation',
        },
      } as SelectVoiceResponse,
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] /api/projects/[id]/select-voice error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          message:
            error instanceof Error
              ? error.message
              : 'Failed to save voice selection',
          code: 'DATABASE_ERROR',
        },
      } as SelectVoiceResponse,
      { status: 500 }
    );
  }
}
