/**
 * Voice Profile API Endpoint
 *
 * Returns voice profile information by ID
 */

import { NextResponse } from 'next/server';
import { getVoiceById } from '@/lib/tts/voice-profiles';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: voiceId } = await params;

    if (!voiceId) {
      return NextResponse.json(
        { success: false, error: 'Voice ID is required' },
        { status: 400 }
      );
    }

    const voice = getVoiceById(voiceId);

    if (!voice) {
      return NextResponse.json(
        { success: false, error: 'Voice not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: voice.id,
        name: voice.name,
        gender: voice.gender,
        accent: voice.accent,
        tone: voice.tone,
        previewUrl: voice.previewUrl,
      },
    });
  } catch (error) {
    console.error('Error fetching voice:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch voice',
      },
      { status: 500 }
    );
  }
}
