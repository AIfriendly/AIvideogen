/**
 * Visual Content Sourcing API Endpoint
 *
 * POST /api/projects/[id]/generate-visuals - Generate YouTube video suggestions for all scenes
 *
 * This endpoint orchestrates the visual suggestion pipeline:
 * 1. Validates project exists and has completed prerequisites
 * 2. Loads all scenes for the project
 * 3. For each scene: analyzes text, generates search queries, searches YouTube
 * 4. Saves visual suggestions to database with ranking
 * 5. Updates project.visuals_generated flag
 *
 * Standard response format:
 * Success: { success: true, scenesProcessed: number, suggestionsGenerated: number, errors?: string[] }
 * Error: { success: false, error: string }
 *
 * Story 3.3: YouTube Video Search & Result Retrieval
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getProject,
  getScenesByProjectId,
  saveVisualSuggestions,
  updateProjectVisualsGenerated,
  type VideoResultForSave
} from '@/lib/db/queries';
import { initializeDatabase } from '@/lib/db/init';
import { YouTubeAPIClient } from '@/lib/youtube/client';
import { analyzeSceneForVisuals } from '@/lib/youtube/analyze-scene';
import { YouTubeError, YouTubeErrorCode } from '@/lib/youtube/types';

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

    // Load all scenes for the project
    const scenes = getScenesByProjectId(projectId);
    if (scenes.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No scenes found for project', code: 'NO_SCENES_FOUND' },
        { status: 400 }
      );
    }

    console.log(`[Visual Generation] Starting for project ${projectId} with ${scenes.length} scenes`);

    // Initialize YouTube API client
    const youtubeClient = new YouTubeAPIClient();

    let scenesProcessed = 0;
    let suggestionsGenerated = 0;
    const errors: string[] = [];

    // Process each scene
    for (const scene of scenes) {
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
        const searchResults = await youtubeClient.searchWithMultipleQueries(queries, {
          maxResults: 10,
          videoEmbeddable: true,
          relevanceLanguage: 'en',
          order: 'relevance'
        });

        console.log(`[Visual Generation] Scene ${scene.scene_number} search complete: ${searchResults.length} results found`);

        // Step 3: Save suggestions to database with ranking
        if (searchResults.length > 0) {
          // Convert VideoResult to VideoResultForSave format
          const suggestionsToSave: VideoResultForSave[] = searchResults.map(result => ({
            videoId: result.videoId,
            title: result.title,
            thumbnailUrl: result.thumbnailUrl,
            channelTitle: result.channelTitle,
            embedUrl: result.embedUrl,
            duration: result.duration
          }));

          const savedSuggestions = saveVisualSuggestions(scene.id, suggestionsToSave);
          suggestionsGenerated += savedSuggestions.length;
          console.log(`[Visual Generation] Scene ${scene.scene_number}: Saved ${savedSuggestions.length} suggestions`);
        } else {
          // Zero results - save empty array (valid outcome)
          saveVisualSuggestions(scene.id, []);
          console.log(`[Visual Generation] Scene ${scene.scene_number}: No results found (empty suggestions saved)`);
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
  } catch (error: any) {
    console.error('[Visual Generation] Fatal error:', error);

    // Handle YouTube API quota exceeded
    if (error instanceof YouTubeError && error.code === YouTubeErrorCode.QUOTA_EXCEEDED) {
      return NextResponse.json(
        {
          success: false,
          error: 'YouTube API daily quota exceeded. Please try again tomorrow or upgrade your quota.',
          code: 'QUOTA_EXCEEDED'
        },
        { status: 429 }
      );
    }

    // Handle YouTube API key not configured
    if (error instanceof YouTubeError && error.code === YouTubeErrorCode.API_KEY_NOT_CONFIGURED) {
      return NextResponse.json(
        {
          success: false,
          error: 'YouTube API key not configured. Please add YOUTUBE_API_KEY to your environment variables.',
          code: 'API_KEY_NOT_CONFIGURED'
        },
        { status: 500 }
      );
    }

    // Generic error handler
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
