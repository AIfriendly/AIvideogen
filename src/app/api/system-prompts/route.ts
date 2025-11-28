/**
 * System Prompts API Endpoint - Story 1.8
 *
 * Returns all preset system prompts for the PersonaSelector UI.
 *
 * @endpoint GET /api/system-prompts
 *
 * @success_response (200 OK)
 * {
 *   "prompts": [
 *     {
 *       "id": "scientific-analyst",
 *       "name": "Scientific Analyst",
 *       "description": "Neutral, data-driven...",
 *       "is_default": true
 *     },
 *     ...
 *   ]
 * }
 *
 * @error_response (500 Internal Server Error)
 * {
 *   "error": "Failed to fetch system prompts"
 * }
 */

import { NextResponse } from 'next/server';
import { getPresetSystemPrompts } from '@/lib/db/queries';
import { initializeDatabase } from '@/lib/db/init';

// Initialize database on first import
initializeDatabase();

export async function GET() {
  try {
    const prompts = getPresetSystemPrompts();
    return NextResponse.json({ prompts });
  } catch (error) {
    console.error('[system-prompts] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system prompts' },
      { status: 500 }
    );
  }
}
