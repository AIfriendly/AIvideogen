/**
 * Voiceover Progress Polling API Endpoint
 *
 * GET /api/projects/[id]/voiceover-progress - Poll for voiceover generation progress
 *
 * This endpoint provides real-time progress updates during voiceover generation.
 * Client polls this endpoint every 1 second to update UI progress indicators.
 *
 * Standard response format:
 * Success: { success: true, data: { status, currentScene, totalScenes, progress } }
 *
 * Story 2.5: Voiceover Generation for Scenes
 */

import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/db/init';

// Initialize database on first import (idempotent)
initializeDatabase();

/**
 * In-memory progress tracking (shared with generation endpoint)
 * This would ideally be a Redis cache in production
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
 * GET /api/projects/[id]/voiceover-progress
 *
 * Get current progress of voiceover generation
 *
 * @param request - Next.js request object
 * @param params - Route parameters containing project ID
 * @returns JSON response with progress data
 *
 * Success Response (200 - Generating):
 * {
 *   "success": true,
 *   "data": {
 *     "status": "generating",
 *     "currentScene": 3,
 *     "totalScenes": 5,
 *     "progress": 60,
 *     "sceneNumber": 3
 *   }
 * }
 *
 * Success Response (200 - Complete):
 * {
 *   "success": true,
 *   "data": {
 *     "status": "complete",
 *     "currentScene": 5,
 *     "totalScenes": 5,
 *     "progress": 100
 *   }
 * }
 *
 * Success Response (200 - Error):
 * {
 *   "success": true,
 *   "data": {
 *     "status": "error",
 *     "currentScene": 3,
 *     "totalScenes": 5,
 *     "progress": 60,
 *     "error": "TTS service unavailable"
 *   }
 * }
 *
 * Success Response (200 - Idle/Not Started):
 * {
 *   "success": true,
 *   "data": {
 *     "status": "idle",
 *     "currentScene": 0,
 *     "totalScenes": 0,
 *     "progress": 0
 *   }
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // Get progress from map
    const progress = progressMap.get(projectId);

    if (!progress) {
      // No progress data means generation hasn't started or was cleaned up
      return NextResponse.json({
        success: true,
        data: {
          status: 'idle',
          currentScene: 0,
          totalScenes: 0,
          progress: 0,
        },
      });
    }

    // Calculate progress percentage
    const progressPercent =
      progress.totalScenes > 0
        ? Math.round((progress.currentScene / progress.totalScenes) * 100)
        : 0;

    return NextResponse.json({
      success: true,
      data: {
        status: progress.status,
        currentScene: progress.currentScene,
        totalScenes: progress.totalScenes,
        progress: progressPercent,
        sceneNumber: progress.sceneNumber,
        error: progress.error,
      },
    });
  } catch (error) {
    console.error('[Voiceover Progress API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * Export progress map for sharing with generation endpoint
 */
export { progressMap };
