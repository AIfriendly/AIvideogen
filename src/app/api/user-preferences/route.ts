/**
 * User Preferences API Endpoint - Story 6.8a
 *
 * GET /api/user-preferences - Retrieve user's Quick Production defaults
 * PUT /api/user-preferences - Update user's Quick Production defaults
 *
 * @module app/api/user-preferences
 */

import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/db/init';
import {
  getUserPreferences,
  updateUserPreferences,
  type UserPreferencesUpdate,
} from '@/lib/db/queries-user-preferences';
import { getVoiceById } from '@/lib/tts/voice-profiles';
import { getSystemPromptById } from '@/lib/db/queries';

// Initialize database on first import
initializeDatabase();

/**
 * GET /api/user-preferences
 *
 * Retrieve user's Quick Production defaults with joined voice and persona names.
 *
 * Response format:
 * {
 *   success: true,
 *   data: {
 *     id: string,
 *     default_voice_id: string | null,
 *     default_persona_id: string | null,
 *     quick_production_enabled: boolean,
 *     voice_name?: string,
 *     persona_name?: string,
 *     created_at: string,
 *     updated_at: string
 *   }
 * }
 */
export async function GET() {
  try {
    const preferences = getUserPreferences();

    if (!preferences) {
      return NextResponse.json(
        {
          success: false,
          error: 'User preferences not found',
        },
        { status: 404 }
      );
    }

    // Resolve voice name from TypeScript voice profiles
    let voiceName: string | undefined;
    if (preferences.default_voice_id) {
      const voice = getVoiceById(preferences.default_voice_id);
      voiceName = voice?.name;
    }

    return NextResponse.json({
      success: true,
      data: {
        ...preferences,
        voice_name: voiceName,
      },
    });
  } catch (error) {
    console.error('[user-preferences] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user preferences',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user-preferences
 *
 * Update user's Quick Production defaults (partial update supported).
 *
 * Request body:
 * {
 *   default_voice_id?: string | null,
 *   default_persona_id?: string | null,
 *   quick_production_enabled?: boolean
 * }
 *
 * Response format:
 * {
 *   success: true
 * }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate voice_id if provided (must exist in voice profiles)
    if (body.default_voice_id !== undefined && body.default_voice_id !== null) {
      const voice = getVoiceById(body.default_voice_id);
      if (!voice) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid voice ID: ${body.default_voice_id}`,
          },
          { status: 400 }
        );
      }
    }

    // Validate persona_id if provided (must exist in system_prompts table)
    if (body.default_persona_id !== undefined && body.default_persona_id !== null) {
      const persona = getSystemPromptById(body.default_persona_id);
      if (!persona) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid persona ID: ${body.default_persona_id}`,
          },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: UserPreferencesUpdate = {};

    if (body.default_voice_id !== undefined) {
      updateData.default_voice_id = body.default_voice_id;
    }

    if (body.default_persona_id !== undefined) {
      updateData.default_persona_id = body.default_persona_id;
    }

    if (body.quick_production_enabled !== undefined) {
      updateData.quick_production_enabled = body.quick_production_enabled;
    }

    // Update preferences
    updateUserPreferences(updateData);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('[user-preferences] PUT error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update user preferences',
      },
      { status: 500 }
    );
  }
}
