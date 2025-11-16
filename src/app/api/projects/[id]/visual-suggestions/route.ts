/**
 * Visual Suggestions Retrieval API Endpoint
 *
 * GET /api/projects/[id]/visual-suggestions - Retrieve visual suggestions for a project
 *
 * This endpoint retrieves all YouTube video suggestions for all scenes in a project,
 * ordered by scene number and then by rank (relevance).
 *
 * Optional query parameter:
 * - sceneId: Filter suggestions for a specific scene
 *
 * Standard response format:
 * Success: { suggestions: VisualSuggestion[] }
 * Error: { success: false, error: string }
 *
 * Story 3.3: YouTube Video Search & Result Retrieval
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getProject,
  getVisualSuggestions,
  getVisualSuggestionsByProject
} from '@/lib/db/queries';
import { initializeDatabase } from '@/lib/db/init';

// Initialize database on first import (idempotent)
await initializeDatabase();

/**
 * GET /api/projects/[id]/visual-suggestions
 *
 * Retrieve visual suggestions for a project
 *
 * @param request - Next.js request object
 * @param params - Route parameters containing project ID
 * @returns JSON response with visual suggestions or error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // Validate project exists
    const project = getProject(projectId);
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found', code: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Check for optional sceneId query parameter
    const { searchParams } = new URL(request.url);
    const sceneId = searchParams.get('sceneId');

    let suggestions;

    if (sceneId) {
      // Get suggestions for specific scene
      suggestions = getVisualSuggestions(sceneId);
      console.log(`[Visual Suggestions] Retrieved ${suggestions.length} suggestions for scene ${sceneId}`);
    } else {
      // Get all suggestions for project (ordered by scene number, then rank)
      suggestions = getVisualSuggestionsByProject(projectId);
      console.log(`[Visual Suggestions] Retrieved ${suggestions.length} suggestions for project ${projectId}`);
    }

    // Return suggestions (empty array if none exist)
    return NextResponse.json(
      { suggestions },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[Visual Suggestions] Error:', error);

    // Generic error handler
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'An unexpected error occurred while retrieving visual suggestions',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}
