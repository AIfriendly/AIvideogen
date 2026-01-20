/**
 * Auto-Select Visuals API Endpoint - Story 6.8b
 *
 * POST /api/projects/[id]/auto-select-visuals
 *
 * Automatically selects the best visual suggestion for each scene in a project.
 * Selection criteria:
 * 1. If cv_score is available: Select highest cv_score
 * 2. Otherwise: Select lowest rank (rank 1 is best)
 *
 * This endpoint is used by Quick Production Flow to automate visual selection
 * without requiring manual user intervention.
 *
 * @module app/api/projects/[id]/auto-select-visuals
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProject, updateSceneSelectedClip } from '@/lib/db/queries';
import db from '@/lib/db/client';
import { initializeDatabase } from '@/lib/db/init';

// Initialize database on first import (idempotent)
initializeDatabase();

interface VisualSuggestion {
  id: string;
  scene_id: string;
  video_id: string;
  rank: number;
  cv_score: number | null;
}

interface Scene {
  id: string;
  scene_number: number;
  selected_clip_id: string | null;
}

interface AutoSelectResult {
  sceneId: string;
  sceneNumber: number;
  selectedSuggestionId: string | null;
  reason: string;
}

/**
 * POST /api/projects/[id]/auto-select-visuals
 *
 * Automatically selects the best visual for each scene.
 *
 * Responses:
 * - 200: Success with { success: true, selectionsCount, selections }
 * - 404: Project not found
 * - 500: Database error
 */
export async function POST(
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
          error: 'Project ID is required',
          code: 'INVALID_REQUEST',
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
          error: 'Project not found',
          code: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

    console.log(`[Auto-Select Visuals] Processing project: ${projectId}`);

    // Get all scenes for this project
    const scenes = db.prepare(`
      SELECT id, scene_number, selected_clip_id
      FROM scenes
      WHERE project_id = ?
      ORDER BY scene_number ASC
    `).all(projectId) as Scene[];

    if (scenes.length === 0) {
      return NextResponse.json(
        {
          success: true,
          selectionsCount: 0,
          message: 'No scenes found in project',
          selections: [],
        },
        { status: 200 }
      );
    }

    console.log(`[Auto-Select Visuals] Found ${scenes.length} scenes`);

    const selections: AutoSelectResult[] = [];
    let selectionsCount = 0;

    // Process each scene
    for (const scene of scenes) {
      // Skip scenes that already have a selection
      if (scene.selected_clip_id) {
        selections.push({
          sceneId: scene.id,
          sceneNumber: scene.scene_number,
          selectedSuggestionId: scene.selected_clip_id,
          reason: 'already_selected',
        });
        continue;
      }

      // Get all visual suggestions for this scene
      const suggestions = db.prepare(`
        SELECT id, scene_id, video_id, rank, cv_score
        FROM visual_suggestions
        WHERE scene_id = ?
        ORDER BY
          CASE WHEN cv_score IS NOT NULL THEN 0 ELSE 1 END,
          cv_score DESC,
          rank ASC
        LIMIT 1
      `).get(scene.id) as VisualSuggestion | undefined;

      if (!suggestions) {
        // No suggestions available for this scene
        selections.push({
          sceneId: scene.id,
          sceneNumber: scene.scene_number,
          selectedSuggestionId: null,
          reason: 'no_suggestions',
        });
        continue;
      }

      // Select the best suggestion
      updateSceneSelectedClip(scene.id, suggestions.id);
      selectionsCount++;

      const reason = suggestions.cv_score !== null
        ? `cv_score_${suggestions.cv_score.toFixed(2)}`
        : `rank_${suggestions.rank}`;

      selections.push({
        sceneId: scene.id,
        sceneNumber: scene.scene_number,
        selectedSuggestionId: suggestions.id,
        reason,
      });

      console.log(
        `[Auto-Select Visuals] Scene ${scene.scene_number}: Selected ${suggestions.id} (${reason})`
      );
    }

    console.log(
      `[Auto-Select Visuals] Complete: ${selectionsCount} selections made for ${scenes.length} scenes`
    );

    return NextResponse.json(
      {
        success: true,
        selectionsCount,
        totalScenes: scenes.length,
        selections,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API Error] POST /api/projects/[id]/auto-select-visuals:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to auto-select visuals',
        code: 'DATABASE_ERROR',
      },
      { status: 500 }
    );
  }
}
