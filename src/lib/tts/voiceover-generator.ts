/**
 * Voiceover Generation Business Logic
 *
 * Handles the sequential processing of scenes to generate TTS audio files.
 * Implements partial completion recovery, progress tracking, and error handling.
 *
 * @module lib/tts/voiceover-generator
 */

import { getTTSProvider } from './factory';
import { sanitizeForTTS, validateSanitization } from './sanitize-text';
import { getScenesByProjectId, updateSceneAudio, updateProjectDuration, updateProject } from '@/lib/db/queries';
import type { Scene } from '@/lib/db/queries';
import fs from 'fs';
import path from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

/**
 * Voiceover generation result
 */
export interface VoiceoverResult {
  /** Number of scenes successfully processed */
  completed: number;
  /** Number of scenes skipped (already had audio) */
  skipped: number;
  /** Number of scenes that failed */
  failed: number;
  /** Total duration in seconds */
  totalDuration: number;
  /** Errors that occurred during generation */
  errors?: Array<{ sceneNumber: number; error: string }>;
}

/**
 * Progress callback function type
 */
export type ProgressCallback = (currentScene: number, totalScenes: number, sceneNumber: number) => void;

/**
 * Generate voiceovers for all scenes in a project
 *
 * This function:
 * 1. Loads all scenes from database
 * 2. Checks for existing audio files (partial completion)
 * 3. Processes each incomplete scene sequentially
 * 4. Sanitizes text before TTS generation
 * 5. Saves audio files with organized naming
 * 6. Updates database with paths and durations
 * 7. Calculates and stores total project duration
 * 8. Updates project workflow step
 *
 * @param projectId - Project ID
 * @param voiceId - Voice ID to use for all scenes
 * @param onProgress - Optional progress callback
 * @returns Voiceover generation result
 *
 * @example
 * ```typescript
 * const result = await generateVoiceoversWithProgress(
 *   'project-123',
 *   'sarah',
 *   (current, total, sceneNum) => {
 *     console.log(`Processing scene ${sceneNum} (${current}/${total})`);
 *   }
 * );
 * console.log(`Completed: ${result.completed}, Skipped: ${result.skipped}`);
 * ```
 */
export async function generateVoiceoversWithProgress(
  projectId: string,
  voiceId: string,
  onProgress?: ProgressCallback
): Promise<VoiceoverResult> {
  const errors: Array<{ sceneNumber: number; error: string }> = [];
  let completed = 0;
  let skipped = 0;
  let failed = 0;

  try {
    // Get TTS provider instance
    const tts = getTTSProvider();

    // Load all scenes for the project
    const scenes = getScenesByProjectId(projectId);

    if (scenes.length === 0) {
      throw new Error('NO_SCENES_FOUND');
    }

    const totalScenes = scenes.length;

    // Create output directory if it doesn't exist
    const audioDir = path.join(process.cwd(), '.cache', 'audio', 'projects', projectId);
    if (!existsSync(audioDir)) {
      mkdirSync(audioDir, { recursive: true });
    }

    // Process each scene sequentially
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const sceneNumber = scene.scene_number;

      try {
        // Check if audio already exists (partial completion recovery)
        if (scene.audio_file_path) {
          const audioPath = path.join(process.cwd(), scene.audio_file_path);
          if (existsSync(audioPath)) {
            console.log(`Skipping scene ${sceneNumber} - audio already exists`);
            skipped++;
            if (onProgress) {
              onProgress(i + 1, totalScenes, sceneNumber);
            }
            continue;
          }
        }

        // Report progress
        if (onProgress) {
          onProgress(i + 1, totalScenes, sceneNumber);
        }

        // Sanitize text for TTS
        const sanitized = sanitizeForTTS(scene.text);

        // Validate sanitization
        const validation = validateSanitization(sanitized);
        if (!validation.valid) {
          console.warn(
            `Scene ${sceneNumber} sanitization issues: ${validation.issues.join(', ')}`
          );
          // Continue anyway - validation is a warning, not a blocker
        }

        if (!sanitized || sanitized.trim().length === 0) {
          console.warn(`Scene ${sceneNumber} has no speakable content after sanitization`);
          errors.push({
            sceneNumber,
            error: 'No speakable content after sanitization',
          });
          failed++;
          continue;
        }

        // Generate audio using TTS provider
        console.log(`Generating audio for scene ${sceneNumber}...`);
        const audioResult = await tts.generateAudio(sanitized, voiceId);

        // Save audio file with organized naming
        const filename = `scene-${sceneNumber}.mp3`;
        const relativePath = `.cache/audio/projects/${projectId}/${filename}`;
        const absolutePath = path.join(process.cwd(), relativePath);

        // Write audio buffer to file
        writeFileSync(absolutePath, Buffer.from(audioResult.audioBuffer));

        // Update scene in database
        updateSceneAudio(scene.id, relativePath, audioResult.duration);

        console.log(
          `Scene ${sceneNumber} complete: ${audioResult.duration}s, ${audioResult.fileSize} bytes`
        );
        completed++;

        // Add small delay between scenes to respect rate limits
        if (i < scenes.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Error processing scene ${sceneNumber}:`, error);
        errors.push({
          sceneNumber,
          error: error instanceof Error ? error.message : String(error),
        });
        failed++;
        // Continue processing remaining scenes
      }
    }

    // Calculate total duration from all scenes
    const updatedScenes = getScenesByProjectId(projectId);
    const totalDuration = updatedScenes.reduce((sum, scene) => {
      return sum + (scene.duration || 0);
    }, 0);

    // Round to 2 decimal places
    const roundedDuration = Math.round(totalDuration * 100) / 100;

    // Update project with total duration
    updateProjectDuration(projectId, roundedDuration);

    // Update project workflow step to 'visual-sourcing'
    updateProject(projectId, { current_step: 'visual-sourcing' });

    console.log(
      `Voiceover generation complete: ${completed} completed, ${skipped} skipped, ${failed} failed`
    );
    console.log(`Total duration: ${roundedDuration}s`);

    return {
      completed,
      skipped,
      failed,
      totalDuration: roundedDuration,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error('Fatal error during voiceover generation:', error);
    throw error;
  }
}

/**
 * Check if a scene has completed audio generation
 *
 * @param scene - Scene to check
 * @returns True if scene has audio file that exists on disk
 */
export function hasCompletedAudio(scene: Scene): boolean {
  if (!scene.audio_file_path) {
    return false;
  }

  const audioPath = path.join(process.cwd(), scene.audio_file_path);
  return existsSync(audioPath);
}

/**
 * Get audio file path for a scene
 *
 * @param projectId - Project ID
 * @param sceneNumber - Scene number
 * @returns Relative path to audio file
 */
export function getSceneAudioPath(projectId: string, sceneNumber: number): string {
  return `.cache/audio/projects/${projectId}/scene-${sceneNumber}.mp3`;
}

/**
 * Validate project prerequisites for voiceover generation
 *
 * @param project - Project to validate
 * @throws Error with specific error code if validation fails
 */
export function validateVoiceoverPrerequisites(project: {
  script_generated: boolean;
  voice_id: string | null;
}): void {
  if (!project.script_generated) {
    throw new Error('SCRIPT_NOT_GENERATED');
  }

  if (!project.voice_id) {
    throw new Error('VOICE_NOT_SELECTED');
  }
}
