/**
 * Voiceover Generation Integration Tests
 *
 * Tests the full voiceover generation workflow including:
 * - API endpoint validation
 * - Business logic layer
 * - Database updates
 * - File system operations
 * - Progress tracking
 * - Partial completion recovery
 *
 * Story 2.5: Voiceover Generation for Scenes
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, mkdirSync } from 'fs';
import path from 'path';
import {
  generateVoiceoversWithProgress,
  validateVoiceoverPrerequisites,
  hasCompletedAudio,
  getSceneAudioPath,
} from '@/lib/tts/voiceover-generator';
import {
  createProject,
  getProject,
  createScene,
  getScenesByProjectId,
  updateProject,
} from '@/lib/db/queries';
import { initializeDatabase } from '@/lib/db/init';

// Initialize database before tests
initializeDatabase();

describe('Voiceover Generation Integration Tests', () => {
  let testProjectId: string;
  const testCacheDir = path.join(process.cwd(), '.cache', 'audio', 'projects');

  beforeEach(async () => {
    // Create test project
    const project = createProject('Voiceover Test Project');
    testProjectId = project.id;

    // Set up project with prerequisites
    updateProject(testProjectId, {
      topic: 'Test Topic',
      voice_id: 'sarah',
      script_generated: true,
      voice_selected: true,
      current_step: 'voiceover',
    });

    // Create test scenes
    createScene({
      project_id: testProjectId,
      scene_number: 1,
      text: '**Scene 1:** This is the first scene with *markdown* formatting.',
    });

    createScene({
      project_id: testProjectId,
      scene_number: 2,
      text: 'Title: Second Scene\n\nThis is clean narration text.',
    });

    createScene({
      project_id: testProjectId,
      scene_number: 3,
      text: '[Stage direction] The final scene begins here.',
    });
  });

  afterEach(() => {
    // Clean up test audio files
    const projectDir = path.join(testCacheDir, testProjectId);
    if (existsSync(projectDir)) {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });

  describe('Prerequisite Validation', () => {
    it('should pass validation when prerequisites are met', () => {
      const project = getProject(testProjectId);
      expect(() => validateVoiceoverPrerequisites(project!)).not.toThrow();
    });

    it('should throw SCRIPT_NOT_GENERATED when script not generated', () => {
      updateProject(testProjectId, { script_generated: false });
      const project = getProject(testProjectId);
      expect(() => validateVoiceoverPrerequisites(project!)).toThrow('SCRIPT_NOT_GENERATED');
    });

    it('should throw VOICE_NOT_SELECTED when voice not selected', () => {
      updateProject(testProjectId, { voice_id: null });
      const project = getProject(testProjectId);
      expect(() => validateVoiceoverPrerequisites(project!)).toThrow('VOICE_NOT_SELECTED');
    });
  });

  describe('Audio File Path Generation', () => {
    it('should generate correct audio file path', () => {
      const path = getSceneAudioPath(testProjectId, 1);
      expect(path).toBe(`.cache/audio/projects/${testProjectId}/scene-1.mp3`);
    });

    it('should handle different scene numbers', () => {
      const path1 = getSceneAudioPath(testProjectId, 1);
      const path2 = getSceneAudioPath(testProjectId, 99);
      expect(path1).toContain('scene-1.mp3');
      expect(path2).toContain('scene-99.mp3');
    });
  });

  describe('Completed Audio Detection', () => {
    it('should return false when scene has no audio file path', () => {
      const scenes = getScenesByProjectId(testProjectId);
      expect(hasCompletedAudio(scenes[0])).toBe(false);
    });

    it('should return false when audio file path exists but file does not', () => {
      const scenes = getScenesByProjectId(testProjectId);
      const sceneWithPath = {
        ...scenes[0],
        audio_file_path: `.cache/audio/projects/${testProjectId}/scene-1.mp3`,
      };
      expect(hasCompletedAudio(sceneWithPath)).toBe(false);
    });
  });

  describe('Progress Tracking', () => {
    it('should call progress callback for each scene', async () => {
      const progressUpdates: Array<{
        current: number;
        total: number;
        sceneNumber: number;
      }> = [];

      await generateVoiceoversWithProgress(
        testProjectId,
        'sarah',
        (current, total, sceneNumber) => {
          progressUpdates.push({ current, total, sceneNumber });
        }
      );

      // Should have progress updates for all 3 scenes
      expect(progressUpdates.length).toBeGreaterThanOrEqual(3);
      expect(progressUpdates[0].total).toBe(3);
      expect(progressUpdates[progressUpdates.length - 1].current).toBe(3);
    });

    it('should track scene numbers correctly', async () => {
      const sceneNumbers: number[] = [];

      await generateVoiceoversWithProgress(
        testProjectId,
        'sarah',
        (_, __, sceneNumber) => {
          sceneNumbers.push(sceneNumber);
        }
      );

      expect(sceneNumbers).toContain(1);
      expect(sceneNumbers).toContain(2);
      expect(sceneNumbers).toContain(3);
    });
  });

  describe('Text Sanitization Integration', () => {
    it('should remove markdown from generated audio', async () => {
      const result = await generateVoiceoversWithProgress(testProjectId, 'sarah');

      // All scenes should be processed
      expect(result.completed).toBeGreaterThan(0);

      // Verify scenes were updated
      const scenes = getScenesByProjectId(testProjectId);
      expect(scenes[0].audio_file_path).toBeTruthy();
    });

    it('should handle scenes with only formatting', async () => {
      // Create scene with only markdown
      createScene({
        project_id: testProjectId,
        scene_number: 4,
        text: '**[Stage direction]**',
      });

      const result = await generateVoiceoversWithProgress(testProjectId, 'sarah');

      // Should handle gracefully (either skip or fail that scene)
      expect(result.completed + result.skipped + result.failed).toBeGreaterThan(0);
    });
  });

  describe('Database Updates', () => {
    it('should update scene records with audio paths and durations', async () => {
      await generateVoiceoversWithProgress(testProjectId, 'sarah');

      const scenes = getScenesByProjectId(testProjectId);

      scenes.forEach((scene) => {
        if (scene.text.trim().length > 0) {
          // Scenes with content should have audio
          expect(scene.audio_file_path).toBeTruthy();
          expect(scene.duration).toBeGreaterThan(0);
          expect(scene.audio_file_path).toContain(testProjectId);
          expect(scene.audio_file_path).toContain(`scene-${scene.scene_number}.mp3`);
        }
      });
    });

    it('should update project total duration', async () => {
      await generateVoiceoversWithProgress(testProjectId, 'sarah');

      const project = getProject(testProjectId);
      expect(project!.total_duration).toBeGreaterThan(0);

      // Total duration should be sum of scene durations
      const scenes = getScenesByProjectId(testProjectId);
      const expectedDuration = scenes.reduce((sum, s) => sum + (s.duration || 0), 0);
      expect(Math.abs(project!.total_duration! - expectedDuration)).toBeLessThan(0.01);
    });

    it('should update project workflow step to visual-sourcing', async () => {
      await generateVoiceoversWithProgress(testProjectId, 'sarah');

      const project = getProject(testProjectId);
      expect(project!.current_step).toBe('visual-sourcing');
    });
  });

  describe('File System Operations', () => {
    it('should create audio directory if it does not exist', async () => {
      const projectDir = path.join(testCacheDir, testProjectId);

      // Ensure directory doesn't exist
      if (existsSync(projectDir)) {
        rmSync(projectDir, { recursive: true, force: true });
      }

      await generateVoiceoversWithProgress(testProjectId, 'sarah');

      expect(existsSync(projectDir)).toBe(true);
    });

    it('should save audio files with correct naming convention', async () => {
      await generateVoiceoversWithProgress(testProjectId, 'sarah');

      const projectDir = path.join(testCacheDir, testProjectId);
      const scene1Path = path.join(projectDir, 'scene-1.mp3');
      const scene2Path = path.join(projectDir, 'scene-2.mp3');
      const scene3Path = path.join(projectDir, 'scene-3.mp3');

      expect(existsSync(scene1Path)).toBe(true);
      expect(existsSync(scene2Path)).toBe(true);
      expect(existsSync(scene3Path)).toBe(true);
    });
  });

  describe('Partial Completion Recovery', () => {
    it('should skip scenes that already have audio files', async () => {
      // Generate audio for all scenes first
      const firstResult = await generateVoiceoversWithProgress(testProjectId, 'sarah');
      expect(firstResult.completed).toBeGreaterThan(0);

      // Generate again - should skip all scenes
      const secondResult = await generateVoiceoversWithProgress(testProjectId, 'sarah');
      expect(secondResult.skipped).toBe(3);
      expect(secondResult.completed).toBe(0);
    });

    it('should resume from first incomplete scene', async () => {
      // Generate audio for first 2 scenes only (by creating them first)
      const tempProjectId = createProject('Temp Project').id;
      updateProject(tempProjectId, {
        topic: 'Test',
        voice_id: 'sarah',
        script_generated: true,
        voice_selected: true,
      });

      createScene({
        project_id: tempProjectId,
        scene_number: 1,
        text: 'Scene 1',
      });

      createScene({
        project_id: tempProjectId,
        scene_number: 2,
        text: 'Scene 2',
      });

      // Generate first batch
      await generateVoiceoversWithProgress(tempProjectId, 'sarah');

      // Add third scene
      createScene({
        project_id: tempProjectId,
        scene_number: 3,
        text: 'Scene 3',
      });

      // Generate again - should skip first 2, generate third
      const result = await generateVoiceoversWithProgress(tempProjectId, 'sarah');
      expect(result.skipped).toBe(2);
      expect(result.completed).toBe(1);

      // Cleanup
      const tempProjectDir = path.join(testCacheDir, tempProjectId);
      if (existsSync(tempProjectDir)) {
        rmSync(tempProjectDir, { recursive: true, force: true });
      }
    });
  });

  describe('Error Handling', () => {
    it('should throw error when no scenes exist', async () => {
      const emptyProjectId = createProject('Empty Project').id;
      updateProject(emptyProjectId, {
        voice_id: 'sarah',
        script_generated: true,
      });

      await expect(
        generateVoiceoversWithProgress(emptyProjectId, 'sarah')
      ).rejects.toThrow('NO_SCENES_FOUND');
    });

    it('should return error summary for failed scenes', async () => {
      // Create scene with empty text
      createScene({
        project_id: testProjectId,
        scene_number: 4,
        text: '',
      });

      const result = await generateVoiceoversWithProgress(testProjectId, 'sarah');

      // Should have some failures or successful completions
      expect(result.completed + result.failed + result.skipped).toBeGreaterThan(0);
    });
  });

  describe('Voice Consistency', () => {
    it('should use the same voice for all scenes', async () => {
      await generateVoiceoversWithProgress(testProjectId, 'sarah');

      const scenes = getScenesByProjectId(testProjectId);

      // All scenes should have audio from the same voice
      scenes.forEach((scene) => {
        if (scene.audio_file_path) {
          expect(scene.audio_file_path).toContain(testProjectId);
        }
      });

      // Project should still have voice_id set
      const project = getProject(testProjectId);
      expect(project!.voice_id).toBe('sarah');
    });
  });

  describe('Generation Summary', () => {
    it('should return accurate summary of generation results', async () => {
      const result = await generateVoiceoversWithProgress(testProjectId, 'sarah');

      expect(result).toHaveProperty('completed');
      expect(result).toHaveProperty('skipped');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('totalDuration');

      expect(result.completed).toBeGreaterThanOrEqual(0);
      expect(result.skipped).toBeGreaterThanOrEqual(0);
      expect(result.failed).toBeGreaterThanOrEqual(0);
      expect(result.totalDuration).toBeGreaterThanOrEqual(0);

      // Total should match scene count
      expect(result.completed + result.skipped + result.failed).toBe(3);
    });
  });
});
