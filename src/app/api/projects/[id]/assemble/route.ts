/**
 * Assembly Trigger API Endpoint - Epic 4, Story 4.5 (Integrated with Epic 5)
 *
 * POST /api/projects/[id]/assemble - Trigger video assembly
 *
 * Validates all scenes have clip selections and triggers the assembly process.
 * Now fully integrated with Epic 5 video assembly implementation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProject } from '@/lib/db/queries';
import db from '@/lib/db/client';
import { initializeDatabase } from '@/lib/db/init';
import { videoAssembler } from '@/lib/video/assembler';
import { Trimmer } from '@/lib/video/trimmer';
import { FFmpegClient } from '@/lib/video/ffmpeg';
import type { AssemblyScene } from '@/types/assembly';
import { downloadVideo } from '@/lib/download/universal-downloader'; // Story 6.12: Universal downloader
import path from 'path';
import { mkdir, access } from 'fs/promises';

// Initialize database on first import (idempotent)
initializeDatabase();

/**
 * Assembly response structure
 */
interface AssemblyResponse {
  assemblyJobId: string;
  status: 'queued' | 'processing' | 'complete' | 'error';
  message: string;
  sceneCount: number;
}

/**
 * POST /api/projects/[id]/assemble
 *
 * Triggers video assembly for a project.
 *
 * Responses:
 * - 200: Success with { assemblyJobId, status, message, sceneCount }
 * - 400: Not all scenes have selections
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

    // Get total scene count for the project
    const totalScenesResult = db.prepare(`
      SELECT COUNT(*) as count FROM scenes WHERE project_id = ?
    `).get(projectId) as { count: number };

    if (totalScenesResult.count === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No scenes found for this project',
          code: 'NO_SCENES',
        },
        { status: 400 }
      );
    }

    // Load all scenes with selections (JOIN on visual_suggestions)
    // Note: INNER JOIN is intentional - if a suggestion is deleted after selection,
    // the scene will not appear in results, triggering the validation error below.
    // This ensures data integrity by requiring all selected clips to exist.
    const scenesData = db.prepare(`
      SELECT
        s.id as sceneId,
        s.scene_number as sceneNumber,
        s.text as scriptText,
        s.audio_file_path as audioFilePath,
        s.selected_clip_id as selectedClipId,
        s.duration as audioDuration,
        vs.video_id as videoId,
        vs.duration as clipDuration,
        vs.provider as providerId
      FROM scenes s
      INNER JOIN visual_suggestions vs ON s.selected_clip_id = vs.id
      WHERE s.project_id = ?
      ORDER BY s.scene_number
    `).all(projectId) as any[];

    // Transform to AssemblyScene format with required alias fields
    const scenes: AssemblyScene[] = scenesData.map(scene => ({
      sceneId: scene.sceneId,
      sceneNumber: scene.sceneNumber,
      scene_number: scene.sceneNumber, // Alias for backward compatibility
      scriptText: scene.scriptText,
      script_text: scene.scriptText, // Alias for backward compatibility
      audioFilePath: scene.audioFilePath,
      audio_path: scene.audioFilePath, // Alias for backward compatibility
      video_path: '', // Will be filled during trimming
      selectedClipId: scene.selectedClipId,
      videoId: scene.videoId,
      clipDuration: scene.clipDuration,
      audioDuration: scene.audioDuration, // Actual voiceover duration for audio timing
      duration: scene.audioDuration, // Alias for backward compatibility
      providerId: scene.providerId || 'youtube', // Story 6.12: Provider for download routing
    }));

    // Validate all scenes have selections
    if (scenes.length !== totalScenesResult.count) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not all scenes have clip selections',
          code: 'INCOMPLETE_SELECTIONS',
          selectedCount: scenes.length,
          totalCount: totalScenesResult.count,
        },
        { status: 400 }
      );
    }

    // Update project status to 'editing' (valid current_step value)
    db.prepare(`
      UPDATE projects
      SET current_step = 'editing'
      WHERE id = ?
    `).run(projectId);

    // Create assembly job in database (Story 5.1)
    const jobId = await videoAssembler.createJob(projectId, scenes.length);

    console.log(`[Assembly Trigger] Started job ${jobId} for project ${projectId} with ${scenes.length} scenes`);

    // Execute assembly asynchronously to not block the response
    // In production, this would be handled by a job queue (e.g., BullMQ, SQS)
    (async () => {
      try {
        // Update job to processing
        videoAssembler.updateJobProgress(jobId, 5, 'downloading');

        // Step 1: Download videos for each scene using universal downloader (Story 6.12)
        const tempDir = videoAssembler.getTempDir(jobId);
        const downloadsDir = path.join(tempDir, 'downloads');
        await mkdir(downloadsDir, { recursive: true });

        console.log(`[Assembly] Downloading ${scenes.length} videos for job ${jobId}`);

        // Story 6.12: Track scene errors for graceful error handling
        const sceneErrors: Array<{ sceneNumber: number; provider: string; error: string }> = [];
        let successfulDownloads = 0;

        for (let i = 0; i < scenes.length; i++) {
          const scene = scenes[i];
          const downloadProgress = 5 + ((i / scenes.length) * 15); // 5-20% for downloads
          videoAssembler.updateJobProgress(jobId, downloadProgress, 'downloading', scene.sceneNumber);

          // CRITICAL: Validate clipDuration before using it
          if (scene.clipDuration === null || scene.clipDuration === undefined) {
            const errorMsg = `Scene ${scene.sceneNumber} has invalid clip duration (null/undefined). ` +
              `Visual suggestion duration not populated. Check visual_suggestions.duration in database.`;
            console.error(`[Assembly] ${errorMsg}`);
            // Story 6.12: Log error but don't fail entire job - skip this scene
            sceneErrors.push({
              sceneNumber: scene.sceneNumber,
              provider: scene.providerId || 'youtube',
              error: errorMsg,
            });
            continue;
          }

          // Story 6.12: Use universal downloader for multi-provider support
          const downloadPath = path.join('.cache', 'videos', projectId, `scene-${scene.sceneNumber}-source.mp4`);
          const providerId = scene.providerId || 'youtube'; // Default to YouTube for backward compatibility

          console.log(`[Assembly] Downloading from ${providerId}: ${scene.videoId} for scene ${scene.sceneNumber}`);

          const downloadResult = await downloadVideo({
            videoId: scene.videoId,
            providerId,
            outputPath: downloadPath,
            segmentDuration: scene.clipDuration + 5, // Add 5s buffer for trimming
            maxHeight: 720, // Default to 720p for performance
          });

          if (!downloadResult.success) {
            // Story 6.12: Graceful error handling - skip failed clip, don't block entire assembly
            const errorMsg = `Failed to download video for scene ${scene.sceneNumber}. ` +
              `Provider: ${downloadResult.providerUsed}. ` +
              `Video ID: ${scene.videoId}. ` +
              `Error: ${downloadResult.error || 'Unknown error'}`;
            console.error(`[Assembly] ${errorMsg}`);

            sceneErrors.push({
              sceneNumber: scene.sceneNumber,
              provider: downloadResult.providerUsed,
              error: downloadResult.error || 'Unknown error',
            });
            continue; // Skip this scene and continue with next
          }

          // Add the downloaded file path to the scene object
          const fullPath = downloadResult.filePath || path.join(process.cwd(), '.cache', 'videos', downloadPath);
          scene.video_path = fullPath;
          scene.defaultSegmentPath = fullPath; // Trimmer expects this property

          // Verify file exists before proceeding
          try {
            await access(fullPath);
            console.log(`[Assembly] Downloaded scene ${scene.sceneNumber} from ${downloadResult.providerUsed}: ${fullPath}`);
            successfulDownloads++;
          } catch (accessError) {
            const errorMsg = `Download reported success but file not found: ${fullPath}. ` +
              `Scene ${scene.sceneNumber}, Video ID: ${scene.videoId}`;
            console.error(`[Assembly] ${errorMsg}`);

            sceneErrors.push({
              sceneNumber: scene.sceneNumber,
              provider: downloadResult.providerUsed,
              error: errorMsg,
            });
            continue;
          }
        }

        // Story 6.12: Fail entire job if ALL downloads failed
        if (successfulDownloads === 0) {
          const allErrorsMessage = sceneErrors.map(e =>
            `Scene ${e.sceneNumber} (${e.provider}): ${e.error}`
          ).join('; ');

          throw new Error(`All scene downloads failed. ${allErrorsMessage}`);
        }

        // Story 6.12: Log partial success if some scenes failed
        if (sceneErrors.length > 0) {
          console.warn(`[Assembly] ${sceneErrors.length} scene(s) failed to download, continuing with ${successfulDownloads} successful downloads`);
        }

        // Filter out scenes without video_path (failed downloads)
        const validScenes = scenes.filter(scene => scene.video_path);

        if (validScenes.length === 0) {
          throw new Error('No valid scenes remaining after download phase');
        }

        // Step 2: Trim scenes to match audio duration (Story 5.2)
        videoAssembler.updateJobProgress(jobId, 20, 'trimming');
        const ffmpeg = new FFmpegClient();
        const trimmer = new Trimmer(ffmpeg);
        const trimmedPaths = await trimmer.trimScenes(
          validScenes, // Story 6.12: Use only scenes with successful downloads
          tempDir,
          (sceneNumber, total) => {
            // Calculate progress: trimming is 20-35% of total progress
            const trimProgress = 20 + ((sceneNumber / total) * 15);
            videoAssembler.updateJobProgress(jobId, trimProgress, 'trimming', sceneNumber);
          }
        );

        console.log(`[Assembly] Trimmed ${trimmedPaths.length} scenes for job ${jobId}`);

        // Step 2: Assemble scenes (concatenate + audio overlay) (Story 5.3)
        const finalPath = await videoAssembler.assembleScenes(
          jobId,
          projectId,
          trimmedPaths,
          validScenes // Story 6.12: Use only scenes with successful downloads
        );

        // Step 3: Complete the job
        await videoAssembler.completeJob(jobId);

        console.log(`[Assembly] Completed job ${jobId} - Video saved to: ${finalPath}`);
      } catch (error) {
        console.error(`[Assembly] Job ${jobId} failed:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await videoAssembler.failJob(jobId, errorMessage);
      }
    })();

    // Return immediate response with job ID for tracking
    const response: AssemblyResponse = {
      assemblyJobId: jobId,
      status: 'processing',
      message: 'Video assembly started - processing in background',
      sceneCount: scenes.length,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('[API Error] POST /api/projects/[id]/assemble:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to trigger assembly',
        code: 'DATABASE_ERROR',
      },
      { status: 500 }
    );
  }
}
