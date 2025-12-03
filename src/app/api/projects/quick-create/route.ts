/**
 * Quick Create API Endpoint - Story 6.8b
 *
 * POST /api/projects/quick-create
 *
 * Creates a new project with topic pre-filled, applies user's default voice and persona,
 * and triggers the Quick Production pipeline (script → voiceover → visuals → assembly).
 *
 * This is the one-click video creation entry point from RAG topic suggestions.
 *
 * @module app/api/projects/quick-create
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { headers } from 'next/headers';
import db from '@/lib/db/client';
import { initializeDatabase } from '@/lib/db/init';
import {
  getUserPreferences,
  hasConfiguredDefaults,
} from '@/lib/db/queries-user-preferences';

// Initialize database on first import
initializeDatabase();

interface QuickCreateRequest {
  topic: string;
  ragContext?: {
    channelContent?: any[];
    competitorContent?: any[];
    newsArticles?: any[];
    trendingTopics?: any[];
  };
}

interface QuickCreateResponse {
  success: boolean;
  data?: {
    projectId: string;
    redirectUrl: string;
  };
  error?: 'DEFAULTS_NOT_CONFIGURED' | 'PIPELINE_FAILED' | 'VALIDATION_ERROR';
  message?: string;
}

/**
 * POST /api/projects/quick-create
 *
 * Create a project with pre-configured defaults and trigger the video pipeline.
 *
 * Request body:
 * {
 *   topic: string;                       // Video topic from suggestion
 *   ragContext?: RAGContext;             // Pre-assembled RAG context (optional)
 * }
 *
 * Success Response (201):
 * {
 *   success: true,
 *   data: {
 *     projectId: string,
 *     redirectUrl: string                // /projects/{id}/progress
 *   }
 * }
 *
 * Error Response (400 - DEFAULTS_NOT_CONFIGURED):
 * {
 *   success: false,
 *   error: 'DEFAULTS_NOT_CONFIGURED',
 *   message: 'Please configure default voice and persona'
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse<QuickCreateResponse>> {
  try {
    // Parse request body
    const body = await request.json() as QuickCreateRequest;

    // Validate topic is provided
    if (!body.topic || typeof body.topic !== 'string' || body.topic.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Topic is required',
        },
        { status: 400 }
      );
    }

    const topic = body.topic.trim();

    console.log(`[quick-create] Creating project for topic: "${topic}"`);

    // Check if user has configured defaults
    if (!hasConfiguredDefaults()) {
      console.log('[quick-create] Defaults not configured, redirecting to settings');
      return NextResponse.json(
        {
          success: false,
          error: 'DEFAULTS_NOT_CONFIGURED',
          message: 'Please configure default voice and persona to use Quick Production',
        },
        { status: 400 }
      );
    }

    // Get user preferences
    const preferences = getUserPreferences();
    if (!preferences || !preferences.default_voice_id || !preferences.default_persona_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'DEFAULTS_NOT_CONFIGURED',
          message: 'Please configure default voice and persona to use Quick Production',
        },
        { status: 400 }
      );
    }

    console.log(`[quick-create] Using defaults - voice: ${preferences.default_voice_id}, persona: ${preferences.default_persona_id}`);

    // Create project with topic confirmed and defaults applied
    const projectId = randomUUID();
    const now = new Date().toISOString();

    // Store RAG context in config_json if provided
    let configJson: string | null = null;
    if (body.ragContext) {
      configJson = JSON.stringify({
        ragContext: body.ragContext,
        quickProduction: true,
      });
    } else {
      configJson = JSON.stringify({
        quickProduction: true,
      });
    }

    // Insert project with topic and defaults
    const insertStmt = db.prepare(`
      INSERT INTO projects (
        id,
        name,
        topic,
        current_step,
        status,
        config_json,
        system_prompt_id,
        voice_id,
        voice_selected,
        rag_enabled,
        created_at,
        last_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      projectId,
      topic.substring(0, 50), // Use first 50 chars of topic as name
      topic,
      'script-generation', // Skip topic confirmation, start at script generation
      'active',
      configJson,
      preferences.default_persona_id,
      preferences.default_voice_id,
      1, // voice_selected = true
      body.ragContext ? 1 : 0, // rag_enabled if context provided
      now,
      now
    );

    console.log(`[quick-create] Project created: ${projectId}`);

    // Get base URL from request headers for internal API calls
    const headersList = await headers();
    const host = headersList.get('host') || 'localhost:3000';
    const protocol = headersList.get('x-forwarded-proto') || 'http';
    const baseUrl = `${protocol}://${host}`;

    // Trigger pipeline and wait for initial confirmation
    // This ensures the pipeline starts successfully before returning to user
    const pipelineStarted = await triggerPipeline(projectId, topic, preferences.default_persona_id, baseUrl, body.ragContext);

    if (!pipelineStarted) {
      // Pipeline failed to start - update project and return error
      db.prepare(`UPDATE projects SET status = 'error' WHERE id = ?`).run(projectId);
      return NextResponse.json(
        {
          success: false,
          error: 'PIPELINE_FAILED',
          message: 'Failed to start video generation pipeline. Please try again.',
        },
        { status: 500 }
      );
    }

    // Return success with redirect URL
    return NextResponse.json(
      {
        success: true,
        data: {
          projectId,
          redirectUrl: `/projects/${projectId}/progress`,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[quick-create] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'PIPELINE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to create project',
      },
      { status: 500 }
    );
  }
}

/**
 * Trigger the video production pipeline.
 * Returns true if the pipeline started successfully, false otherwise.
 *
 * The pipeline runs: script → voiceover → visuals → assembly
 * Each stage is triggered sequentially after the previous completes.
 */
async function triggerPipeline(
  projectId: string,
  topic: string,
  personaId: string,
  baseUrl: string,
  ragContext?: QuickCreateRequest['ragContext']
): Promise<boolean> {
  try {
    console.log(`[quick-create] Triggering pipeline for project: ${projectId}`);
    console.log(`[quick-create] Using base URL: ${baseUrl}`);

    // Call the script generation API
    const response = await fetch(`${baseUrl}/api/projects/${projectId}/generate-script`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rag_enabled: !!ragContext,
      }),
    });

    // Parse response once to avoid stream reuse error
    const scriptData = await response.json();

    if (!response.ok) {
      console.error(`[quick-create] Script generation failed:`, scriptData);
      db.prepare(`UPDATE projects SET status = 'error' WHERE id = ?`).run(projectId);
      return false;
    }

    console.log(`[quick-create] Script generation started for project: ${projectId}`);

    // Script generation succeeded - continue pipeline asynchronously
    // The remaining stages run in the background while user sees progress page
    if (scriptData.success) {
      console.log(`[quick-create] Script generated successfully, triggering voiceovers...`);
      // Don't await - let remaining pipeline run in background
      // Frontend polls pipeline-status to track progress
      continuesPipeline(projectId, baseUrl).catch((err) => {
        console.error(`[quick-create] Background pipeline error:`, err);
        db.prepare(`UPDATE projects SET status = 'error' WHERE id = ?`).run(projectId);
      });
    }

    return true;
  } catch (error) {
    console.error(`[quick-create] Pipeline error:`, error);
    try {
      db.prepare(`UPDATE projects SET status = 'error' WHERE id = ?`).run(projectId);
    } catch (dbError) {
      console.error(`[quick-create] Failed to update project status:`, dbError);
    }
    return false;
  }
}

/**
 * Continue the pipeline after script generation.
 * Runs voiceover → visuals → assembly stages sequentially.
 * This runs in the background after initial response is sent.
 */
async function continuesPipeline(projectId: string, baseUrl: string): Promise<void> {
  await triggerVoiceovers(projectId, baseUrl);
}

/**
 * Trigger voiceover generation for all scenes
 */
async function triggerVoiceovers(projectId: string, baseUrl: string): Promise<void> {
  try {
    const response = await fetch(`${baseUrl}/api/projects/${projectId}/generate-voiceovers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[quick-create] Voiceover generation failed for project: ${projectId}`);
      return;
    }

    console.log(`[quick-create] Voiceovers generated, triggering visual sourcing...`);
    await triggerVisuals(projectId, baseUrl);
  } catch (error) {
    console.error(`[quick-create] Voiceover error:`, error);
  }
}

/**
 * Trigger visual sourcing for all scenes
 */
async function triggerVisuals(projectId: string, baseUrl: string): Promise<void> {
  try {
    const response = await fetch(`${baseUrl}/api/projects/${projectId}/generate-visuals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[quick-create] Visual sourcing failed for project: ${projectId}`);
      return;
    }

    console.log(`[quick-create] Visuals sourced, triggering auto-selection and assembly...`);
    await triggerAssembly(projectId, baseUrl);
  } catch (error) {
    console.error(`[quick-create] Visual sourcing error:`, error);
  }
}

/**
 * Trigger auto-selection and video assembly
 */
async function triggerAssembly(projectId: string, baseUrl: string): Promise<void> {
  try {
    // First auto-select visuals
    const autoSelectResponse = await fetch(`${baseUrl}/api/projects/${projectId}/auto-select-visuals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!autoSelectResponse.ok) {
      console.error(`[quick-create] Auto-select visuals failed for project: ${projectId}`);
      // Continue anyway - user can manually select
    }

    // Then trigger assembly
    const assemblyResponse = await fetch(`${baseUrl}/api/projects/${projectId}/assemble`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!assemblyResponse.ok) {
      console.error(`[quick-create] Assembly failed for project: ${projectId}`);
      return;
    }

    console.log(`[quick-create] Pipeline complete for project: ${projectId}`);
  } catch (error) {
    console.error(`[quick-create] Assembly error:`, error);
  }
}
