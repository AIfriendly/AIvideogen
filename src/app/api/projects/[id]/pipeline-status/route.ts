/**
 * Pipeline Status API Endpoint - Story 6.8a
 *
 * GET /api/projects/[id]/pipeline-status
 *
 * Returns real-time pipeline status for Quick Production progress page.
 * Maps the project's current_step and related state to a PipelineStatus object.
 *
 * Pipeline Stages:
 * - script: Script generation in progress
 * - voiceover: Voiceover generation in progress
 * - visuals: Visual sourcing in progress
 * - assembly: Video assembly in progress
 * - complete: Pipeline finished
 *
 * @module app/api/projects/[id]/pipeline-status
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db/client';

// Pipeline stages in order
type PipelineStage = 'script' | 'voiceover' | 'visuals' | 'assembly' | 'complete';

interface PipelineStatus {
  projectId: string;
  topic: string;
  currentStage: PipelineStage;
  completedStages: PipelineStage[];
  stageProgress: number; // 0-100 for current stage
  overallProgress: number; // 0-100 overall
  currentMessage: string;
  error?: string;
  // Provider progress fields (AC-6.11.3)
  visuals_provider?: 'youtube' | 'nasa' | 'dvids';
  visuals_download_progress?: number;
}

interface ProjectRow {
  id: string;
  name: string | null;
  topic: string | null;
  current_step: string | null;
  script_generated: number;
  voice_selected: number;
  visuals_generated: number;
  video_path: string | null;
  visuals_provider: string | null;
  visuals_download_progress: number | null;
}

interface SceneRow {
  total: number;
  with_audio: number;
}

interface SuggestionRow {
  total: number;
  complete: number;
}

interface AssemblyJobRow {
  status: string | null;
  progress: number | null;
}

/**
 * Map current_step to pipeline stage
 */
function mapCurrentStepToStage(
  currentStep: string | null,
  scriptGenerated: boolean,
  voiceSelected: boolean,
  visualsGenerated: boolean,
  hasVideoPath: boolean
): PipelineStage {
  if (hasVideoPath || currentStep === 'export') {
    return 'complete';
  }

  if (currentStep === 'editing' || currentStep === 'assembly') {
    return 'assembly';
  }

  if (currentStep === 'visual-curation' || currentStep === 'visual-sourcing') {
    return 'visuals';
  }

  if (currentStep === 'voiceover') {
    return 'voiceover';
  }

  if (currentStep === 'script-generation' || (voiceSelected && !scriptGenerated)) {
    return 'script';
  }

  // Default to script stage if in early steps
  return 'script';
}

/**
 * Get completed stages based on current stage
 */
function getCompletedStages(currentStage: PipelineStage): PipelineStage[] {
  const allStages: PipelineStage[] = ['script', 'voiceover', 'visuals', 'assembly', 'complete'];
  const currentIndex = allStages.indexOf(currentStage);

  if (currentIndex <= 0) {
    return [];
  }

  return allStages.slice(0, currentIndex);
}

/**
 * Calculate overall progress based on current stage and stage progress
 */
function calculateOverallProgress(currentStage: PipelineStage, stageProgress: number): number {
  const stageWeights: Record<PipelineStage, { start: number; end: number }> = {
    script: { start: 0, end: 25 },
    voiceover: { start: 25, end: 50 },
    visuals: { start: 50, end: 75 },
    assembly: { start: 75, end: 100 },
    complete: { start: 100, end: 100 },
  };

  const weight = stageWeights[currentStage];
  const stageRange = weight.end - weight.start;
  return Math.round(weight.start + (stageProgress / 100) * stageRange);
}

/**
 * Generate status message for current stage
 */
function getStatusMessage(
  currentStage: PipelineStage,
  stageProgress: number,
  sceneStats: { total: number; withAudio: number },
  suggestionStats: { total: number; complete: number }
): string {
  switch (currentStage) {
    case 'script':
      return stageProgress === 0 ? 'Starting script generation...' : 'Generating script...';
    case 'voiceover':
      if (sceneStats.total > 0) {
        return `Generating voiceover for scene ${sceneStats.withAudio + 1} of ${sceneStats.total}...`;
      }
      return 'Generating voiceovers...';
    case 'visuals':
      if (suggestionStats.total > 0) {
        return `Processing visuals: ${suggestionStats.complete} of ${suggestionStats.total} scenes...`;
      }
      return 'Sourcing visual content...';
    case 'assembly':
      return stageProgress < 50 ? 'Downloading video segments...' : 'Assembling final video...';
    case 'complete':
      return 'Video complete! Ready for export.';
    default:
      return 'Processing...';
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    console.log(`[pipeline-status] Fetching status for project: ${projectId}`);

    // Validate projectId
    if (!projectId || typeof projectId !== 'string') {
      console.error(`[pipeline-status] Invalid projectId:`, projectId);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid project ID',
        },
        { status: 400 }
      );
    }

    // Get project data
    let project;
    try {
      project = db.prepare(`
        SELECT
          id,
          name,
          topic,
          current_step,
          script_generated,
          voice_selected,
          visuals_generated,
          video_path,
          visuals_provider,
          visuals_download_progress
        FROM projects
        WHERE id = ?
      `).get(projectId) as ProjectRow | undefined;
    } catch (dbError) {
      console.error(`[pipeline-status] Database error:`, dbError);
      return NextResponse.json(
        {
          success: false,
          error: 'Database error',
        },
        { status: 500 }
      );
    }

    if (!project) {
      console.warn(`[pipeline-status] Project not found: ${projectId}`);
      return NextResponse.json(
        {
          success: false,
          error: 'Project not found',
        },
        { status: 404 }
      );
    }

    // Get scene statistics for voiceover progress
    let sceneStats;
    try {
      sceneStats = db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN audio_file_path IS NOT NULL THEN 1 ELSE 0 END) as with_audio
        FROM scenes
        WHERE project_id = ?
      `).get(projectId) as SceneRow | undefined;
    } catch (dbError) {
      console.warn(`[pipeline-status] Error fetching scene stats:`, dbError);
      sceneStats = undefined;
    }

    // Get visual suggestion statistics for visual progress
    // Count distinct scenes that have visual suggestions, not total suggestion rows
    let suggestionStats;
    try {
      suggestionStats = db.prepare(`
        SELECT
          COUNT(DISTINCT s.id) as total,
          COUNT(DISTINCT CASE WHEN vs.download_status = 'complete' THEN s.id END) as complete
        FROM visual_suggestions vs
        JOIN scenes s ON vs.scene_id = s.id
        WHERE s.project_id = ?
      `).get(projectId) as SuggestionRow | undefined;
    } catch (dbError) {
      console.warn(`[pipeline-status] Error fetching suggestion stats:`, dbError);
      suggestionStats = undefined;
    }

    // Get assembly job status if in assembly stage
    let assemblyJob;
    try {
      assemblyJob = db.prepare(`
        SELECT status, progress
        FROM assembly_jobs
        WHERE project_id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `).get(projectId) as AssemblyJobRow | undefined;
    } catch (dbError) {
      console.warn(`[pipeline-status] Error fetching assembly job:`, dbError);
      assemblyJob = undefined;
    }

    // Determine current stage
    const scriptGenerated = project.script_generated === 1;
    const voiceSelected = project.voice_selected === 1;
    const visualsGenerated = project.visuals_generated === 1;
    const hasVideoPath = !!project.video_path;

    const currentStage = mapCurrentStepToStage(
      project.current_step,
      scriptGenerated,
      voiceSelected,
      visualsGenerated,
      hasVideoPath
    );

    // Calculate stage progress
    let stageProgress = 0;
    const sceneTotal = sceneStats?.total ?? 0;
    const sceneWithAudio = sceneStats?.with_audio ?? 0;
    const suggestionTotal = suggestionStats?.total ?? 0;
    const suggestionComplete = suggestionStats?.complete ?? 0;

    switch (currentStage) {
      case 'script':
        stageProgress = scriptGenerated ? 100 : 50;
        break;
      case 'voiceover':
        stageProgress = sceneTotal > 0 ? Math.round((sceneWithAudio / sceneTotal) * 100) : 0;
        break;
      case 'visuals':
        stageProgress = suggestionTotal > 0 ? Math.round((suggestionComplete / suggestionTotal) * 100) : 0;
        break;
      case 'assembly':
        stageProgress = assemblyJob?.progress ?? 50;
        break;
      case 'complete':
        stageProgress = 100;
        break;
    }

    const completedStages = getCompletedStages(currentStage);
    const overallProgress = calculateOverallProgress(currentStage, stageProgress);

    const currentMessage = getStatusMessage(
      currentStage,
      stageProgress,
      { total: sceneTotal, withAudio: sceneWithAudio },
      { total: suggestionTotal, complete: suggestionComplete }
    );

    const status: PipelineStatus = {
      projectId: project.id,
      topic: project.topic || project.name || 'Untitled',
      currentStage,
      completedStages,
      stageProgress,
      overallProgress,
      currentMessage,
      visuals_provider: (project.visuals_provider as 'youtube' | 'nasa' | 'dvids' | undefined) || undefined,
      visuals_download_progress: project.visuals_download_progress ?? undefined,
    };

    // Check for errors
    if (assemblyJob?.status === 'error') {
      status.error = 'Video assembly failed. Please retry.';
    }

    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('[pipeline-status] Unexpected error:', error);
    console.error('[pipeline-status] Error type:', error?.constructor?.name);
    console.error('[pipeline-status] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[pipeline-status] Stack trace:', error instanceof Error ? error.stack : 'N/A');

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch pipeline status',
      },
      { status: 500 }
    );
  }
}
