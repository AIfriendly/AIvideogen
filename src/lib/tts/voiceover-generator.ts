/**
 * Voiceover Generation Business Logic
 *
 * Handles scene-by-scene audio generation with:
 * - Text sanitization before TTS
 * - Sequential scene processing
 * - Partial completion detection and resume
 * - Progress tracking via callbacks
 * - Total duration calculation
 * - Error handling with retry logic
 *
 * Follows layered architecture pattern from Story 2.4.
 */

import fs from 'fs';
import path from 'path';
import { sanitizeForTTS } from './sanitize-text';
import { getTTSProvider } from '@/lib/tts/factory';
import type { Scene } from '@/lib/db/queries';
import {
  updateSceneAudio,
  updateSceneSanitizedText,
  updateProjectDuration,
  getScenesByProjectId
} from '@/lib/db/queries';

/**
 * Result of voiceover generation process
 */
export interface VoiceoverResult {
  completed: number;
  skipped: number;
  failed: number;
  totalDuration: number;
  errors?: Array<{ sceneNumber: number; error: string }>;
}

/**
 * Progress callback function type
 */
export type ProgressCallback = (currentScene: number, totalScenes: number) => void;

/**
 * Generate voiceovers for all scenes in a project
 *
 * This is the main business logic function that:
 * 1. Detects partial completion (skips already-generated scenes)
 * 2. Sanitizes text before TTS generation
 * 3. Generates audio for each incomplete scene sequentially
 * 4. Saves audio files with organized naming
 * 5. Updates database with file paths and durations
 * 6. Calculates and stores total project duration
 * 7. Calls progress callback for UI updates
 *
 * @param projectId - Project ID
 * @param scenes - Array of scenes to process
 * @param voiceId - Voice profile ID to use
 * @param onProgress - Optional progress callback for UI updates
 * @returns VoiceoverResult with completion statistics
 *
 * @example
 * ```typescript
 * const result = await generateVoiceoversWithProgress(
 *   projectId,
 *   scenes,
 *   'sarah',
 *   (current, total) => console.log(`Processing ${current}/${total}`)
 * );
 * console.log(`Completed: ${result.completed}, Skipped: ${result.skipped}`);
 * ```
 */
export async function generateVoiceoversWithProgress(
  projectId: string,
  scenes: Scene[],
  voiceId: string,
  onProgress?: ProgressCallback
): Promise<VoiceoverResult> {
  const result: VoiceoverResult = {
    completed: 0,
    skipped: 0,
    failed: 0,
    totalDuration: 0,
    errors: []
  };

  // Validate inputs
  if (!projectId || !scenes || scenes.length === 0) {
    throw new Error('Invalid input: projectId and scenes are required');
  }

  if (!voiceId) {
    throw new Error('Invalid input: voiceId is required');
  }

  // Get TTS provider instance
  const tts = getTTSProvider();

  // Create audio directory for this project
  const audioDir = path.join(process.cwd(), '.cache', 'audio', 'projects', projectId);
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
    console.log(`Created audio directory: ${audioDir}`);
  }

  // Process scenes sequentially
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const sceneNumber = scene.scene_number;

    // Call progress callback
    if (onProgress) {
      onProgress(i + 1, scenes.length);
    }

    // Check for partial completion (skip if audio already exists)
    if (scene.audio_file_path) {
      // Verify file exists on disk
      const absolutePath = path.join(process.cwd(), scene.audio_file_path);
      if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).size > 0) {
        console.log(`Skipping scene ${sceneNumber} - audio already exists`);
        result.skipped++;
        result.totalDuration += scene.duration || 0;
        continue;
      } else {
        console.log(`Scene ${sceneNumber} has database record but file missing, regenerating...`);
      }
    }

    try {
      // Sanitize scene text before TTS
      console.log(`Sanitizing text for scene ${sceneNumber}...`);
      const sanitizationResult = sanitizeForTTS(scene.text);

      if (sanitizationResult.sanitized.trim().length === 0) {
        console.warn(`Scene ${sceneNumber} has no speakable text after sanitization, skipping`);
        result.skipped++;
        continue;
      }

      console.log(`Generating audio for scene ${sceneNumber}...`);
      console.log(`Original text length: ${sanitizationResult.originalLength}, Sanitized: ${sanitizationResult.sanitizedLength}`);
      if (sanitizationResult.removedElements.length > 0) {
        console.log(`Removed elements: ${sanitizationResult.removedElements.join(', ')}`);
      }

      // Generate audio using TTS provider
      let audioResult;
      try {
        audioResult = await tts.generateAudio(sanitizationResult.sanitized, voiceId);
      } catch (ttsError: any) {
        // Retry once for transient errors
        if (
          ttsError.message?.includes('TTS_TIMEOUT') ||
          ttsError.message?.includes('TTS_SERVICE_ERROR')
        ) {
          console.warn(`TTS error for scene ${sceneNumber}, retrying in 2 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          audioResult = await tts.generateAudio(sanitizationResult.sanitized, voiceId);
        } else {
          throw ttsError;
        }
      }

      // Construct file path
      const fileName = `scene-${sceneNumber}.mp3`;
      const absolutePath = path.join(audioDir, fileName);
      const relativePath = path.join('.cache', 'audio', 'projects', projectId, fileName);

      // Save audio file
      fs.writeFileSync(absolutePath, audioResult.audioBuffer);
      console.log(`Saved audio file: ${relativePath} (${audioResult.fileSize} bytes, ${audioResult.duration}s)`);

      // Update database with audio metadata
      updateSceneAudio(scene.id, relativePath, audioResult.duration);

      // Optionally store sanitized text
      if (sanitizationResult.sanitized !== scene.text) {
        updateSceneSanitizedText(scene.id, sanitizationResult.sanitized);
      }

      result.completed++;
      result.totalDuration += audioResult.duration;

      // Add delay between TTS calls to respect rate limits
      if (i < scenes.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

    } catch (error: any) {
      console.error(`Failed to generate audio for scene ${sceneNumber}:`, error);
      result.failed++;
      result.errors?.push({
        sceneNumber,
        error: error.message || 'Unknown error'
      });

      // Continue processing remaining scenes
      continue;
    }
  }

  // Calculate total duration from all scenes (including skipped ones)
  const allScenes = getScenesByProjectId(projectId);
  const totalDuration = allScenes.reduce((sum, scene) => sum + (scene.duration || 0), 0);

  // Update project with total duration
  updateProjectDuration(projectId, Math.round(totalDuration * 100) / 100); // Round to 2 decimals

  result.totalDuration = totalDuration;

  console.log(`Voiceover generation complete: ${result.completed} completed, ${result.skipped} skipped, ${result.failed} failed`);
  console.log(`Total project duration: ${result.totalDuration}s (${Math.floor(result.totalDuration / 60)}m ${Math.floor(result.totalDuration % 60)}s)`);

  return result;
}

/**
 * Check if scene has valid audio file
 *
 * @param scene - Scene to check
 * @returns true if scene has audio file on disk, false otherwise
 */
export function hasValidAudio(scene: Scene): boolean {
  if (!scene.audio_file_path) {
    return false;
  }

  const absolutePath = path.join(process.cwd(), scene.audio_file_path);
  try {
    return fs.existsSync(absolutePath) && fs.statSync(absolutePath).size > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Get count of scenes with completed audio
 *
 * @param scenes - Array of scenes to check
 * @returns Number of scenes with valid audio files
 */
export function getCompletedAudioCount(scenes: Scene[]): number {
  return scenes.filter(hasValidAudio).length;
}
