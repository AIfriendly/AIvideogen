/**
 * CV Analysis API Endpoint - Story 3.7
 *
 * Triggers computer vision analysis for visual suggestions.
 *
 * GET /api/projects/[id]/cv-analysis
 * - Get CV analysis status for the project
 *
 * POST /api/projects/[id]/cv-analysis
 * - Trigger CV analysis for all scenes or specific scene
 * - Body: { sceneId?: string, expectedLabels?: string[] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/db/init';
import db from '@/lib/db/client';
import {
  getCVFilterStatus,
  analyzeSceneSuggestions,
  getSceneCVSummary,
  type CVFilterResult
} from '@/lib/vision';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET - Get CV analysis status for a project
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    await initializeDatabase();
    const { id: projectId } = await params;

    // Verify project exists
    const project = db
      .prepare('SELECT id FROM projects WHERE id = ?')
      .get(projectId);

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Get all scenes for the project
    const scenes = db
      .prepare(`
        SELECT id, scene_number, visual_keywords
        FROM scenes
        WHERE project_id = ?
        ORDER BY scene_number ASC
      `)
      .all(projectId) as Array<{
        id: string;
        scene_number: number;
        visual_keywords: string | null;
      }>;

    // Get CV filter service status
    const serviceStatus = getCVFilterStatus();

    // Get CV analysis summary for each scene
    const sceneSummaries = scenes.map(scene => ({
      sceneId: scene.id,
      sceneNumber: scene.scene_number,
      ...getSceneCVSummary(scene.id)
    }));

    // Calculate project-level summary
    const totalSuggestions = sceneSummaries.reduce((sum, s) => sum + s.total, 0);
    const totalAnalyzed = sceneSummaries.reduce((sum, s) => sum + s.analyzed, 0);
    const totalPending = sceneSummaries.reduce((sum, s) => sum + s.pending, 0);

    return NextResponse.json({
      projectId,
      serviceStatus,
      summary: {
        totalSuggestions,
        totalAnalyzed,
        totalPending,
        percentComplete: totalSuggestions > 0
          ? Math.round((totalAnalyzed / totalSuggestions) * 100)
          : 0
      },
      scenes: sceneSummaries
    });
  } catch (error) {
    console.error('[CV Analysis GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get CV analysis status' },
      { status: 500 }
    );
  }
}

/**
 * POST - Trigger CV analysis for visual suggestions
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    await initializeDatabase();
    const { id: projectId } = await params;

    // Parse request body
    let sceneId: string | undefined;
    let expectedLabels: string[] = [];

    try {
      const body = await request.json();
      sceneId = body.sceneId;
      expectedLabels = body.expectedLabels || [];
    } catch {
      // Empty body is OK - analyze all scenes
    }

    // Verify project exists
    const project = db
      .prepare('SELECT id FROM projects WHERE id = ?')
      .get(projectId);

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Get CV filter service status
    const serviceStatus = getCVFilterStatus();

    if (!serviceStatus.available) {
      return NextResponse.json({
        success: false,
        message: serviceStatus.reason || 'CV analysis unavailable',
        serviceStatus,
        results: []
      });
    }

    // Get scenes to analyze
    let scenes: Array<{
      id: string;
      scene_number: number;
      visual_keywords: string | null;
    }>;

    if (sceneId) {
      // Analyze specific scene
      const scene = db
        .prepare(`
          SELECT id, scene_number, visual_keywords
          FROM scenes
          WHERE id = ? AND project_id = ?
        `)
        .get(sceneId, projectId) as {
          id: string;
          scene_number: number;
          visual_keywords: string | null;
        } | undefined;

      if (!scene) {
        return NextResponse.json(
          { error: 'Scene not found' },
          { status: 404 }
        );
      }

      scenes = [scene];
    } else {
      // Analyze all scenes
      scenes = db
        .prepare(`
          SELECT id, scene_number, visual_keywords
          FROM scenes
          WHERE project_id = ?
          ORDER BY scene_number ASC
        `)
        .all(projectId) as Array<{
          id: string;
          scene_number: number;
          visual_keywords: string | null;
        }>;
    }

    // Run CV analysis for each scene
    const allResults: Array<{
      sceneId: string;
      sceneNumber: number;
      results: CVFilterResult[];
    }> = [];

    for (const scene of scenes) {
      // Parse visual keywords for expected labels if not provided
      const sceneLabels = expectedLabels.length > 0
        ? expectedLabels
        : scene.visual_keywords
          ? JSON.parse(scene.visual_keywords)
          : [];

      const results = await analyzeSceneSuggestions(scene.id, sceneLabels);

      allResults.push({
        sceneId: scene.id,
        sceneNumber: scene.scene_number,
        results
      });

      // Check if quota exceeded during analysis
      if (!getCVFilterStatus().available) {
        console.log('[CV Analysis] Quota exceeded, stopping analysis');
        break;
      }
    }

    // Calculate summary
    const totalAnalyzed = allResults.reduce(
      (sum, scene) => sum + scene.results.filter(r => r.analyzed).length,
      0
    );
    const totalSkipped = allResults.reduce(
      (sum, scene) => sum + scene.results.filter(r => !r.analyzed).length,
      0
    );

    return NextResponse.json({
      success: true,
      message: `CV analysis complete. Analyzed: ${totalAnalyzed}, Skipped: ${totalSkipped}`,
      serviceStatus: getCVFilterStatus(),
      summary: {
        totalAnalyzed,
        totalSkipped,
        scenesProcessed: allResults.length
      },
      results: allResults
    });
  } catch (error) {
    console.error('[CV Analysis POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to run CV analysis' },
      { status: 500 }
    );
  }
}
