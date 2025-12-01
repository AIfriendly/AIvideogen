/**
 * Script Generation API Endpoint
 *
 * POST /api/projects/[id]/generate-script - Generate professional video script using LLM
 *
 * This endpoint orchestrates the script generation pipeline:
 * 1. Validates project exists and has a confirmed topic
 * 2. Optionally retrieves RAG context if rag_enabled (Story 6.6)
 * 3. Delegates to business logic layer for LLM interaction and retry
 * 4. Transforms LLM output (camelCase) to database format (snake_case)
 * 5. Saves scenes to database in a transaction
 * 6. Updates project status flags (script_generated, current_step)
 *
 * Standard response format:
 * Success: { success: true, data: { projectId, sceneCount, scenes, attempts, ragContextUsed? } }
 * Error: { success: false, error: string }
 *
 * Story 2.4: LLM-Based Script Generation (Professional Quality)
 * Story 6.6: RAG-Augmented Script Generation
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getProject,
  createScenes,
  markScriptGenerated,
  updateProject,
  deleteScenesByProjectId,
  getSystemPromptById,
  getDefaultSystemPrompt,
} from '@/lib/db/queries';
import { initializeDatabase } from '@/lib/db/init';
import { generateScriptWithRetry, ScriptGenerationError } from '@/lib/llm/script-generator';
import { sanitizeTopicInput } from '@/lib/llm/sanitize-text';
import {
  retrieveRAGContext,
  getProjectRAGConfig,
  buildRAGPrompt,
  getRAGContextUsage,
  getRAGContextMessage,
  type RAGContextUsage
} from '@/lib/rag';

// Remove timeout limit for script generation (can take 2-5 minutes with retries)
export const maxDuration = 1200; // 20 minutes for long scripts with multiple retries

// Initialize database on first import (idempotent)
initializeDatabase();

/**
 * POST /api/projects/[id]/generate-script
 *
 * Generate a professional video script for a project
 *
 * Request Body: (empty - uses project.topic from database)
 *
 * @param request - Next.js request object
 * @param params - Route parameters containing project ID
 * @returns JSON response with generated scenes or error
 *
 * Success Response (200):
 * {
 *   "success": true,
 *   "data": {
 *     "projectId": "uuid-string",
 *     "sceneCount": 4,
 *     "scenes": [
 *       {
 *         "id": "uuid",
 *         "project_id": "uuid",
 *         "scene_number": 1,
 *         "text": "Scene narration...",
 *         "sanitized_text": null,
 *         "audio_file_path": null,
 *         "duration": null,
 *         "created_at": "2025-11-07T...",
 *         "updated_at": "2025-11-07T..."
 *       }
 *     ],
 *     "attempts": 1
 *   }
 * }
 *
 * Error Response (400 - Missing Topic):
 * {
 *   "success": false,
 *   "error": "Topic not confirmed. Please confirm topic first."
 * }
 *
 * Error Response (404 - Project Not Found):
 * {
 *   "success": false,
 *   "error": "Project not found with ID: {id}"
 * }
 *
 * Error Response (500 - Generation Failed):
 * {
 *   "success": false,
 *   "error": "Script generation failed after 3 attempts",
 *   "details": ["issue 1", "issue 2", ...]
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // Parse optional rag_enabled parameter from request body (Story 6.6)
    let ragEnabledParam: boolean | undefined;
    try {
      const body = await request.json();
      ragEnabledParam = body?.rag_enabled;
    } catch {
      // Empty body or non-JSON is acceptable - use project defaults
    }

    console.log(`[Script Generation API] Starting generation for project: ${projectId}`);

    // Validate project ID is provided
    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project ID is required',
        },
        { status: 400 }
      );
    }

    // Load project from database
    const project = getProject(projectId);

    // Return 404 if project not found
    if (!project) {
      console.error(`[Script Generation API] Project not found: ${projectId}`);
      return NextResponse.json(
        {
          success: false,
          error: `Project not found with ID: ${projectId}`,
        },
        { status: 404 }
      );
    }

    // Validate project has a confirmed topic
    if (!project.topic) {
      console.error(`[Script Generation API] Project ${projectId} has no topic`);
      return NextResponse.json(
        {
          success: false,
          error: 'Topic not confirmed. Please confirm topic first.',
        },
        { status: 400 }
      );
    }

    console.log(`[Script Generation API] Project found with topic: "${project.topic}"`);

    // Sanitize topic input to prevent prompt injection
    const sanitizedTopic = sanitizeTopicInput(project.topic);

    // Extract optional config (reserved for future use: video length, style preferences)
    let projectConfig: any = null;
    if (project.config_json) {
      try {
        projectConfig = JSON.parse(project.config_json);
        console.log(`[Script Generation API] Using project config:`, projectConfig);
      } catch {
        // Ignore invalid JSON, proceed with defaults
        console.warn(`[Script Generation API] Invalid config_json for project ${projectId}`);
      }
    } else {
      console.log(`[Script Generation API] No config_json found, using defaults (3-5 scenes)`);
    }

    // Load project's selected persona for script generation style (Story 1.8 integration)
    let personaPrompt: string | null = null;
    let personaName: string | null = null;
    try {
      if (project.system_prompt_id) {
        const persona = getSystemPromptById(project.system_prompt_id);
        if (persona) {
          personaPrompt = persona.prompt;
          personaName = persona.name;
          console.log(`[Script Generation API] Using persona: ${personaName} for project ${projectId}`);
        }
      }
      // Fallback to default persona if none selected
      if (!personaPrompt) {
        const defaultPersona = getDefaultSystemPrompt();
        if (defaultPersona) {
          personaPrompt = defaultPersona.prompt;
          personaName = defaultPersona.name;
          console.log(`[Script Generation API] Using default persona: ${personaName} for project ${projectId}`);
        }
      }
    } catch (error) {
      console.warn('[Script Generation API] Could not load persona, using default script style:', error);
    }

    // ========================================================================
    // RAG Context Retrieval (Story 6.6)
    // ========================================================================
    let ragContextUsed: RAGContextUsage | undefined;
    let ragPromptSection = '';
    let ragMode: 'established' | 'cold_start' = 'established';

    // Determine if RAG should be used (explicit param > project config)
    const { enabled: projectRagEnabled, config: ragConfig } = getProjectRAGConfig(projectId);
    const shouldUseRag = ragEnabledParam !== undefined ? ragEnabledParam : projectRagEnabled;

    if (shouldUseRag && ragConfig) {
      console.log(`[Script Generation API] RAG enabled - retrieving context for topic: "${sanitizedTopic}"`);
      ragMode = ragConfig.mode || 'established';

      try {
        const ragStartTime = Date.now();

        // Retrieve RAG context using Story 6.5 infrastructure
        const ragContext = await retrieveRAGContext(projectId, sanitizedTopic);
        const ragRetrievalTime = Date.now() - ragStartTime;

        // Calculate usage statistics
        ragContextUsed = getRAGContextUsage(ragContext, ragRetrievalTime);

        console.log(`[Script Generation API] RAG context retrieved in ${ragRetrievalTime}ms:`,
          `channel=${ragContextUsed.channelVideos},`,
          `competitors=${ragContextUsed.competitorVideos},`,
          `news=${ragContextUsed.newsArticles}`
        );

        // Build RAG prompt section if we have context
        if (ragContextUsed.totalDocuments > 0) {
          ragPromptSection = buildRAGPrompt(ragContext, ragMode);
          const contextMsg = getRAGContextMessage(ragContextUsed);
          console.log(`[Script Generation API] ${contextMsg}`);
        } else {
          console.log(`[Script Generation API] No RAG context available - proceeding without`);
        }
      } catch (ragError) {
        // Graceful degradation - proceed without RAG on error
        console.warn(`[Script Generation API] RAG retrieval failed, proceeding without:`, ragError);
        ragContextUsed = undefined;
      }
    } else if (shouldUseRag && !ragConfig) {
      console.log(`[Script Generation API] RAG enabled but no config found - proceeding without RAG`);
    }

    // ========================================================================
    // Script Generation with optional RAG augmentation
    // ========================================================================

    // Call business logic layer for script generation with retry
    console.log(`[Script Generation API] Calling script generator with config:`, projectConfig);
    if (personaName) {
      console.log(`[Script Generation API] Script style will be influenced by persona: ${personaName}`);
    }
    if (ragPromptSection) {
      console.log(`[Script Generation API] RAG context will be injected into prompt`);
    }

    // Combine persona prompt with RAG context if available
    // RAG context is prepended to persona so the persona style is applied to the RAG-informed content
    const combinedPersonaPrompt = ragPromptSection
      ? `${ragPromptSection}\n\n${personaPrompt || ''}`
      : personaPrompt;

    let result;
    try {
      result = await generateScriptWithRetry(sanitizedTopic, projectConfig, 6, combinedPersonaPrompt);
    } catch (error) {
      if (error instanceof ScriptGenerationError) {
        console.error(
          `[Script Generation API] Generation failed after ${error.attempts} attempts:`,
          error.validationIssues
        );
        return NextResponse.json(
          {
            success: false,
            error: `Script generation failed after ${error.attempts} attempts`,
            details: error.validationIssues,
          },
          { status: 500 }
        );
      }
      // Re-throw other errors
      throw error;
    }

    const { scenes: llmScenes, attempts, validationScore } = result;

    console.log(
      `[Script Generation API] Generated ${llmScenes.length} scenes in ${attempts} attempts ` +
      `(quality score: ${validationScore}/100)`
    );

    // Transform LLM response format (camelCase) to database format (snake_case)
    const dbScenes = llmScenes.map((scene) => ({
      project_id: projectId,
      scene_number: scene.sceneNumber,
      text: scene.text,
      sanitized_text: null, // Will be populated during TTS generation
      audio_file_path: null,
      duration: scene.estimatedDuration || null,
    }));

    // If project already has scenes (regenerating), delete old scenes first
    if (project.script_generated) {
      console.log(`[Script Generation API] Deleting existing scenes for regeneration...`);
      deleteScenesByProjectId(projectId);
    }

    console.log(`[Script Generation API] Saving ${dbScenes.length} scenes to database...`);

    // Save scenes to database (bulk insert with transaction)
    const savedScenes = createScenes(dbScenes);

    console.log(`[Script Generation API] Saved ${savedScenes.length} scenes successfully`);

    // Update project status: script_generated = true
    console.log(`[Script Generation API] Marking script as generated...`);
    markScriptGenerated(projectId);

    // Update project status: current_step = 'voiceover'
    console.log(`[Script Generation API] Updating current_step to 'voiceover'...`);
    updateProject(projectId, { current_step: 'voiceover' });

    console.log(`[Script Generation API] ✓ Script generation complete for project ${projectId}`);

    // Return success response with optional RAG context usage (Story 6.6)
    return NextResponse.json(
      {
        success: true,
        data: {
          projectId: project.id,
          sceneCount: savedScenes.length,
          scenes: savedScenes,
          attempts: attempts,
          // Include RAG context usage if RAG was used (Story 6.6)
          ...(ragContextUsed && { ragContextUsed }),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Script Generation API] Unexpected error:', error);

    // Check for database errors
    if (error instanceof Error) {
      if (error.message.includes('FOREIGN KEY constraint failed')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Database error: Invalid project reference',
          },
          { status: 500 }
        );
      }
      if (error.message.includes('UNIQUE constraint failed')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Database error: Duplicate scene numbers detected',
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error during script generation',
      },
      { status: 500 }
    );
  }
}
