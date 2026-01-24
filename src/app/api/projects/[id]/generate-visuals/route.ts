/**
 * Visual Content Sourcing API Endpoint
 *
 * POST /api/projects/[id]/generate-visuals - Generate video suggestions for all scenes
 *
 * This endpoint orchestrates the visual suggestion pipeline:
 * 1. Validates project exists and has completed prerequisites
 * 2. Loads all scenes for the project
 * 3. Checks project config for Quick Production mode (uses MCP providers) or standard mode (YouTube)
 * 4. For Quick Production: Uses MCP providers (DVIDS, NASA) via generateVisuals from lib/pipeline
 *    - MCP-only flow: if MCP fails, returns error (no fallback)
 * 5. For standard mode: Uses YouTube API with filtering and ranking
 * 6. Updates project.visuals_generated flag
 *
 * Standard response format:
 * Success: { success: true, scenesProcessed: number, suggestionsGenerated: number, filteringStats?: object, errors?: string[] }
 * Error: { success: false, error: string }
 *
 * Story 3.3: YouTube Video Search & Result Retrieval
 * Story 3.4: Content Filtering & Quality Ranking
 * Story 6.9: MCP Video Provider Integration (Quick Production)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getProject,
  getScenesByProjectId,
  saveVisualSuggestions,
  updateProject,
  updateProjectVisualsGenerated,
  getScenesWithVisualSuggestions,
  type VideoResultForSave
} from '@/lib/db/queries';
import db from '@/lib/db/client';
import { initializeDatabase } from '@/lib/db/init';
import { YouTubeAPIClient } from '@/lib/youtube/client';
import { analyzeSceneForVisuals } from '@/lib/youtube/analyze-scene';
import { YouTubeError, YouTubeErrorCode } from '@/lib/youtube/types';
import { filterAndRankResults } from '@/lib/youtube/filter-results';
import { generateVisuals as generateVisualsMCP } from '@/lib/pipeline/visual-generation';
import { triggerSegmentDownloads } from '@/lib/youtube/trigger-downloads';
import type { RAGContext } from '@/types/rag';

// Initialize database on first import (idempotent)
await initializeDatabase();

/**
 * POST /api/projects/[id]/generate-visuals
 *
 * Generate visual suggestions for all scenes in a project
 *
 * @param request - Next.js request object
 * @param params - Route parameters containing project ID
 * @returns JSON response with generation summary or error
 */
export async function POST(
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

    // CRITICAL: Log project config for debugging routing issues
    console.log(`[Visual Generation] Project ${projectId} config check:`);
    console.log(`[Visual Generation] - config_json exists: ${!!project.config_json}`);
    console.log(`[Visual Generation] - config_json length: ${project.config_json?.length || 0}`);
    console.log(`[Visual Generation] - config_json preview: ${project.config_json?.substring(0, 150) || 'null'}`);

    // Parse config_json to check if this is Quick Production mode
    let config = null;
    let ragContext: RAGContext | undefined = undefined;
    let preferredProvider: string | undefined = undefined;
    let isQuickProduction = false;

    if (project.config_json) {
      try {
        config = JSON.parse(project.config_json);
        isQuickProduction = config?.quickProduction === true;
        ragContext = config?.ragContext;
        preferredProvider = config?.preferredProvider;
        console.log(`[Visual Generation] Quick Production mode: ${isQuickProduction}, provider: ${preferredProvider || 'auto'}`);
      } catch (e) {
        console.warn('[Visual Generation] Failed to parse config_json:', e);
        console.warn('[Visual Generation] config_json was:', project.config_json?.substring(0, 200));
      }
    }

    // CRITICAL: Log routing decision for debugging
    console.log(`[Visual Generation] ROUTING DECISION: isQuickProduction=${isQuickProduction}, will use ${isQuickProduction ? 'MCP' : 'YouTube'} generation path`);

    // Load all scenes for the project
    const scenes = getScenesByProjectId(projectId);
    if (scenes.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No scenes found for project', code: 'NO_SCENES_FOUND' },
        { status: 400 }
      );
    }

    console.log(`[Visual Generation] Starting for project ${projectId} with ${scenes.length} scenes`);

    // ERROR RECOVERY: Get scenes that already have visual suggestions
    // This allows resuming after partial failure without regenerating completed scenes
    const completedSceneIds = getScenesWithVisualSuggestions(projectId);
    console.log(`[Visual Generation] Found ${completedSceneIds.length} scenes with existing suggestions (will skip)`);

    // Filter out completed scenes
    const scenesToProcess = scenes.filter(scene => !completedSceneIds.includes(scene.id));
    console.log(`[Visual Generation] Processing ${scenesToProcess.length} scenes (${scenes.length - scenesToProcess.length} skipped)`);

    // If all scenes already have suggestions, return success immediately
    if (scenesToProcess.length === 0) {
      console.log('[Visual Generation] All scenes already have suggestions, marking as complete');
      updateProjectVisualsGenerated(projectId, true);
      return NextResponse.json({
        success: true,
        scenesProcessed: scenes.length,
        suggestionsGenerated: completedSceneIds.length,
        message: 'All scenes already have visual suggestions'
      }, { status: 200 });
    }

    // ROUTING: Use MCP-based generation for Quick Production, YouTube API for standard mode
    if (isQuickProduction) {
      console.log('[Visual Generation] Using MCP-based visual generation for Quick Production');
      return await handleMCPVisualGeneration(
        projectId,
        scenesToProcess,
        ragContext,
        preferredProvider
      );
    }

    console.log('[Visual Generation] Using YouTube API for standard visual generation');
    console.log('[Visual Generation] WARNING: YouTube path selected - isQuickProduction was FALSE');
    console.log(`[Visual Generation] Config was: quickProduction=${isQuickProduction}, provider=${preferredProvider || 'none'}`);
    return await handleYouTubeVisualGeneration(
      projectId,
      scenesToProcess,
      scenes.length
    );
  } catch (error: any) {
    console.error('[Visual Generation] Fatal error:', error);

    // Update project status to error on failure
    try {
      const { id: projectId } = await params;
      updateProject(projectId, { status: 'error' });
    } catch (dbError) {
      console.error('[Visual Generation] Failed to update project status:', dbError);
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'An unexpected error occurred during visual generation',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

/**
 * Handle MCP-based visual generation for Quick Production
 * MCP-only flow - if MCP fails, returns error (no fallback to YouTube)
 */
async function handleMCPVisualGeneration(
  projectId: string,
  scenes: any[],
  ragContext: RAGContext | undefined,
  preferredProvider: string | undefined
): Promise<NextResponse> {
  try {
    console.log('[Visual Generation] Starting MCP-based visual generation');
    console.log(`[Visual Generation] MCP config: provider=${preferredProvider || 'auto'}, scenes=${scenes.length}`);

    const result = await generateVisualsMCP(
      projectId,
      scenes,
      ragContext,
      {
        providerId: preferredProvider,
        mcpConfigPath: 'config/mcp_servers.json',
        averageClipDuration: 8,
        minClipsPerScene: 6,
        onProgress: (sceneNumber: number, status: string) => {
          console.log(`[Visual Generation] Scene ${sceneNumber}: ${status}`);

          // AC-6.11.3: Update provider progress in database
          const progress = scenes.length > 0 ? Math.round((sceneNumber / scenes.length) * 100) : 0;
          const provider = (preferredProvider || 'youtube') as 'youtube' | 'nasa' | 'dvids';
          try {
            db.prepare(`
              UPDATE projects
              SET visuals_provider = ?,
                  visuals_download_progress = ?
              WHERE id = ?
            `).run(provider, progress, projectId);
          } catch (dbError) {
            console.warn('[Visual Generation] Failed to update provider progress:', dbError);
          }
        }
      }
    );

    console.log('[Visual Generation] MCP generation complete:', result);
    console.log(`[Visual Generation] MCP generated ${result.completed} scenes, ${result.totalSuggestions} suggestions, ${result.totalDuration}s total`);

    // CRITICAL: Verify MCP actually generated suggestions before marking as complete
    if (result.completed === 0 && result.totalSuggestions === 0) {
      console.error('[Visual Generation] MCP generation failed - no suggestions generated!');
      console.error('[Visual Generation] MCP errors:', result.errors);

      // MCP failure - return error response, do NOT fall back to YouTube
      return NextResponse.json({
        success: false,
        error: 'MCP visual generation failed - no suggestions generated',
        code: 'MCP_NO_RESULTS',
        errors: result.errors?.map(e => `Scene ${e.sceneNumber}: ${e.error}`)
      }, { status: 500 });
    }

    // Update project visuals_generated flag
    if (result.completed > 0) {
      updateProjectVisualsGenerated(projectId, true);
      updateProject(projectId, { current_step: 'visual-curation' });
      console.log(`[Visual Generation] Updated project ${projectId} visuals_generated = true`);

      // AC-6.11.3: Clear provider progress when complete
      try {
        db.prepare(`UPDATE projects SET visuals_provider = NULL, visuals_download_progress = 0 WHERE id = ?`).run(projectId);
        console.log(`[Visual Generation] Cleared provider progress for project ${projectId}`);
      } catch (dbError) {
        console.warn('[Visual Generation] Failed to clear provider progress:', dbError);
      }

      // CRITICAL: Trigger downloads for Quick Production flow
      // This ensures visual suggestions are downloaded automatically for Quick Production
      console.log(`[Visual Generation] Triggering downloads for Quick Production flow...`);
      try {
        const downloadResult = await triggerSegmentDownloads(projectId);
        console.log(`[Visual Generation] Downloads triggered: ${downloadResult.queued} queued, ${downloadResult.alreadyDownloaded} already downloaded`);
      } catch (downloadError: any) {
        console.error(`[Visual Generation] Failed to trigger downloads:`, downloadError);
        // Don't fail the request - downloads can be triggered manually
      }
    }

    return NextResponse.json({
      success: result.completed > 0,
      scenesProcessed: result.completed,
      suggestionsGenerated: result.totalSuggestions,
      totalDuration: result.totalDuration,
      targetDuration: result.targetDuration,
      errors: result.errors?.map(e => `Scene ${e.sceneNumber}: ${e.error}`)
    }, { status: 200 });
  } catch (error: any) {
    // MCP failure - log detailed error and return error response
    console.error('[Visual Generation] MCP generation failed with error:', error);
    console.error('[Visual Generation] Error details:', {
      message: error.message,
      code: error.code || 'UNKNOWN',
      stack: error.stack
    });

    // Return error response - do NOT fall back to YouTube
    return NextResponse.json({
      success: false,
      error: `MCP visual generation failed: ${error.message}`,
      code: error.code || 'MCP_ERROR',
      details: {
        message: error.message,
        code: error.code || 'UNKNOWN',
        provider: preferredProvider || 'auto'
      }
    }, { status: 500 });
  }
}

/**
 * Handle YouTube API-based visual generation for standard mode
 */
async function handleYouTubeVisualGeneration(
  projectId: string,
  scenesToProcess: any[],
  totalScenes: number
): Promise<NextResponse> {
  console.log('[Visual Generation] YouTube path started - processing scenes with YouTube API');
  console.log(`[Visual Generation] YouTube path: ${scenesToProcess.length} scenes to process out of ${totalScenes} total`);

  // Initialize YouTube API client
  const youtubeClient = new YouTubeAPIClient();

  let scenesProcessed = 0;
  let suggestionsGenerated = 0;
  const errors: string[] = [];

  // Process each scene (only scenes without suggestions)
  for (const scene of scenesToProcess) {
    try {
      console.log(`[Visual Generation] Processing scene ${scene.scene_number}: "${scene.text.substring(0, 50)}..."`);

      // Step 1: Analyze scene text to generate search queries
      const analysis = await analyzeSceneForVisuals(scene.text);
      console.log(`[Visual Generation] Scene ${scene.scene_number} analysis complete:`, {
        primaryQuery: analysis.primaryQuery,
        alternativeCount: analysis.alternativeQueries.length,
        contentType: analysis.contentType
      });

      // Step 2: Search YouTube with multiple queries
      const queries = [analysis.primaryQuery, ...analysis.alternativeQueries];
      const rawResults = await youtubeClient.searchWithMultipleQueries(queries, {
        maxResults: 15, // Standard YouTube API limit per query
        videoEmbeddable: true,
        relevanceLanguage: 'en',
        order: 'relevance'
      });

      console.log(`[Visual Generation] Scene ${scene.scene_number} search complete: ${rawResults.length} raw results found`);

      // Step 3: NEW (Story 3.4) - Apply filtering and ranking
      let filteredResults;
      try {
        // Validate scene duration exists
        if (!scene.duration || scene.duration <= 0) {
          console.warn(`[Visual Generation] Scene ${scene.scene_number} has invalid duration (${scene.duration}), skipping filtering`);
          filteredResults = rawResults.slice(0, 8); // Just take top 8 raw results
        } else {
          filteredResults = filterAndRankResults(
            rawResults,
            scene.duration, // Scene voiceover duration in seconds
            analysis.contentType,
            { sceneDuration: scene.duration }
          );
          console.log(`[Visual Generation] Scene ${scene.scene_number} filtering complete: ${filteredResults.length} filtered results (from ${rawResults.length} raw)`);
        }
      } catch (filterError: any) {
        // If filtering fails, fall back to raw results
        console.error(`[Visual Generation] Scene ${scene.scene_number} filtering error:`, filterError);
        filteredResults = rawResults.slice(0, 8);
        errors.push(`Scene ${scene.scene_number} filtering failed: ${filterError.message}`);
      }

      // Step 4: Save FILTERED suggestions to database with ranking
      if (filteredResults.length > 0) {
        // Convert VideoResult to VideoResultForSave format
        // Note: We don't include qualityScore in the saved data (internal ranking metric only)
        const suggestionsToSave: VideoResultForSave[] = filteredResults.map(result => ({
          videoId: result.videoId,
          title: result.title,
          thumbnailUrl: result.thumbnailUrl,
          channelTitle: result.channelTitle,
          embedUrl: result.embedUrl,
          duration: result.duration,
          provider: 'youtube', // Explicitly mark as YouTube provider
          sourceUrl: result.embedUrl // Use embed URL as source for YouTube
        }));

        const savedSuggestions = saveVisualSuggestions(scene.id, suggestionsToSave);
        suggestionsGenerated += savedSuggestions.length;
        console.log(`[Visual Generation] Scene ${scene.scene_number}: Saved ${savedSuggestions.length} YouTube suggestions (provider=youtube)`);
      } else {
        // Zero results after filtering - save empty array (valid outcome)
        saveVisualSuggestions(scene.id, []);
        console.log(`[Visual Generation] Scene ${scene.scene_number}: No results after filtering (empty suggestions saved)`);
      }

      scenesProcessed++;
    } catch (error: any) {
      // Log error but continue processing other scenes
      const errorMsg = `Scene ${scene.scene_number} failed: ${error.message}`;
      errors.push(errorMsg);
      console.error(`[Visual Generation] ${errorMsg}`, error);

      // Check for quota exceeded - this is fatal, stop processing
      if (error instanceof YouTubeError && error.code === YouTubeErrorCode.QUOTA_EXCEEDED) {
        console.error('[Visual Generation] YouTube API quota exceeded - stopping processing');
        break;
      }
    }
  }

  // Update project visuals_generated flag if at least one scene processed
  if (scenesProcessed > 0) {
    try {
      updateProjectVisualsGenerated(projectId, true);
      console.log(`[Visual Generation] Updated project ${projectId} visuals_generated = true`);

      // AC-6.11.3: Clear provider progress when complete (YouTube path)
      try {
        db.prepare(`UPDATE projects SET visuals_provider = NULL, visuals_download_progress = 0 WHERE id = ?`).run(projectId);
        console.log(`[Visual Generation] Cleared provider progress for project ${projectId}`);
      } catch (dbError) {
        console.warn('[Visual Generation] Failed to clear provider progress:', dbError);
      }

      // Update project workflow state to visual-curation
      updateProject(projectId, { current_step: 'visual-curation' });
      console.log(`[Visual Generation] Updated current_step to 'visual-curation'`);

      // CRITICAL: Trigger downloads for Quick Production flow
      // This ensures visual suggestions are downloaded automatically for Quick Production
      console.log(`[Visual Generation] Triggering downloads for Quick Production flow...`);
      try {
        const downloadResult = await triggerSegmentDownloads(projectId);
        console.log(`[Visual Generation] Downloads triggered: ${downloadResult.queued} queued, ${downloadResult.alreadyDownloaded} already downloaded`);
      } catch (downloadError: any) {
        console.error(`[Visual Generation] Failed to trigger downloads:`, downloadError);
        // Don't fail the request - downloads can be triggered manually
      }
    } catch (error: any) {
      console.error('[Visual Generation] Failed to update project visuals_generated flag:', error);
      errors.push(`Failed to update project flag: ${error.message}`);
    }
  }

  // Return response
  const response = {
    success: scenesProcessed > 0,
    scenesProcessed,
    suggestionsGenerated,
    ...(errors.length > 0 && { errors })
  };

  console.log('[Visual Generation] Complete:', response);

  return NextResponse.json(response, { status: 200 });
}
