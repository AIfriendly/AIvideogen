/**
 * Voice List API Endpoint
 *
 * GET /api/voice/list
 *
 * Returns available voice profiles for voice selection UI.
 * MVP returns 5 voices, with metadata about full catalog (48 voices).
 *
 * @module app/api/voice/list
 */

import { NextResponse } from 'next/server';
import { MVP_VOICES, VOICE_PROFILES, getVoiceStats } from '@/lib/tts/voice-profiles';

/**
 * GET /api/voice/list
 *
 * Returns list of available voice profiles for MVP.
 *
 * Response format:
 * {
 *   success: true,
 *   data: {
 *     voices: VoiceProfile[],      // MVP voices (5)
 *     totalVoices: number,          // MVP count (5)
 *     totalAvailable: number,       // Full catalog count (48)
 *     defaultVoice: string,         // Default voice ID
 *     stats: object                 // Catalog statistics
 *   }
 * }
 *
 * @example
 * ```typescript
 * const response = await fetch('/api/voice/list');
 * const { data } = await response.json();
 * console.log(`${data.totalVoices} MVP voices available`);
 * console.log(`${data.totalAvailable} total voices in catalog`);
 * ```
 */
export async function GET() {
  try {
    // Get voice statistics
    const stats = getVoiceStats();

    // Return MVP voices with catalog metadata
    return NextResponse.json({
      success: true,
      data: {
        // MVP voices (5) for UI
        voices: MVP_VOICES,

        // MVP count
        totalVoices: MVP_VOICES.length,

        // Full catalog count
        totalAvailable: VOICE_PROFILES.length,

        // Default voice (first MVP voice)
        defaultVoice: MVP_VOICES[0]?.id || 'sarah',

        // Catalog statistics
        stats: {
          total: stats.total,
          mvp: stats.mvp,
          byGender: stats.byGender,
          byAccent: stats.byAccent,
        },
      },
    });
  } catch (error) {
    console.error('[API] /api/voice/list error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to load voice profiles',
          code: 'VOICE_LOAD_ERROR',
        },
      },
      { status: 500 }
    );
  }
}
