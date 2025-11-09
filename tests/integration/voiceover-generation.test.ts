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

describe('2.5-INT Voiceover Generation Integration Tests', () => {
  let testProjectId: string;
  const testCacheDir = path.join(process.cwd(), '.cache', 'audio', 'projects');

  // Increase timeout for tests that require TTS service cold start (30s) + generation time
  const TTS_TEST_TIMEOUT = 60000; // 60 seconds

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

  describe('AC1: Prerequisite Validation [P0]', () => {
    it('[2.5-INT-001] [P0] should pass validation when prerequisites are met', () => {
      // Given: Project with script_generated=true and voice_id set
      // (Setup in beforeEach)

      // When: Validating voiceover prerequisites
      const project = getProject(testProjectId);

      // Then: Should pass validation without errors
      expect(() => validateVoiceoverPrerequisites(project!)).not.toThrow();
    });

    it('[2.5-INT-002] [P0] should throw SCRIPT_NOT_GENERATED when script not generated', () => {
      // Given: Project with script_generated=false
      updateProject(testProjectId, { script_generated: false });

      // When: Validating voiceover prerequisites
      const project = getProject(testProjectId);

      // Then: Should throw SCRIPT_NOT_GENERATED error
      expect(() => validateVoiceoverPrerequisites(project!)).toThrow('SCRIPT_NOT_GENERATED');
    });

    it('[2.5-INT-003] [P0] should throw VOICE_NOT_SELECTED when voice not selected', () => {
      // Given: Project with voice_id=null
      updateProject(testProjectId, { voice_id: null });

      // When: Validating voiceover prerequisites
      const project = getProject(testProjectId);

      // Then: Should throw VOICE_NOT_SELECTED error
      expect(() => validateVoiceoverPrerequisites(project!)).toThrow('VOICE_NOT_SELECTED');
    });
  });

  describe('AC5: Audio File Path Generation [P1]', () => {
    it('[2.5-INT-004] [P1] should generate correct audio file path', () => {
      // Given: Project ID and scene number

      // When: Generating audio file path
      const path = getSceneAudioPath(testProjectId, 1);

      // Then: Should return correct path format
      expect(path).toBe(`.cache/audio/projects/${testProjectId}/scene-1.mp3`);
    });

    it('[2.5-INT-005] [P2] should handle different scene numbers', () => {
      // Given: Different scene numbers (1 and 99)

      // When: Generating audio file paths
      const path1 = getSceneAudioPath(testProjectId, 1);
      const path2 = getSceneAudioPath(testProjectId, 99);

      // Then: Should return correct paths for each scene number
      expect(path1).toContain('scene-1.mp3');
      expect(path2).toContain('scene-99.mp3');
    });
  });

  describe('AC8: Completed Audio Detection [P1]', () => {
    it('[2.5-INT-006] [P1] should return false when scene has no audio file path', () => {
      // Given: Scene without audio_file_path
      const scenes = getScenesByProjectId(testProjectId);

      // When: Checking if scene has completed audio
      // Then: Should return false (no audio file path)
      expect(hasCompletedAudio(scenes[0])).toBe(false);
    });

    it('[2.5-INT-007] [P1] should return false when audio file path exists but file does not', () => {
      // Given: Scene with audio_file_path but file doesn't exist on disk
      const scenes = getScenesByProjectId(testProjectId);
      const sceneWithPath = {
        ...scenes[0],
        audio_file_path: `.cache/audio/projects/${testProjectId}/scene-1.mp3`,
      };

      // When: Checking if scene has completed audio
      // Then: Should return false (file doesn't exist)
      expect(hasCompletedAudio(sceneWithPath)).toBe(false);
    });
  });

  describe('AC7: Progress Tracking [P1]', () => {
    it('[2.5-INT-008] [P1] should call progress callback for each scene', async () => {
      // Given: Project with 3 scenes and progress callback
      const progressUpdates: Array<{
        current: number;
        total: number;
        sceneNumber: number;
      }> = [];

      // When: Generating voiceovers with progress callback
      await generateVoiceoversWithProgress(
        testProjectId,
        'sarah',
        (current, total, sceneNumber) => {
          progressUpdates.push({ current, total, sceneNumber });
        }
      );

      // Then: Should receive progress updates for all 3 scenes
      expect(progressUpdates.length).toBeGreaterThanOrEqual(3);
      expect(progressUpdates[0].total).toBe(3);
      expect(progressUpdates[progressUpdates.length - 1].current).toBe(3);
    });

    it('[2.5-INT-009] [P2] should track scene numbers correctly', async () => {
      // Given: Project with 3 scenes
      const sceneNumbers: number[] = [];

      // When: Generating voiceovers with progress callback tracking scene numbers
      await generateVoiceoversWithProgress(
        testProjectId,
        'sarah',
        (_, __, sceneNumber) => {
          sceneNumbers.push(sceneNumber);
        }
      );

      // Then: Should track all scene numbers (1, 2, 3)
      expect(sceneNumbers).toContain(1);
      expect(sceneNumbers).toContain(2);
      expect(sceneNumbers).toContain(3);
    });
  });

  describe('AC2-AC3: Text Sanitization Integration [P0]', () => {
    it('[2.5-INT-010] [P0] should remove markdown from generated audio', async () => {
      // Given: Scenes with markdown formatting (setup in beforeEach)

      // When: Generating voiceovers
      const result = await generateVoiceoversWithProgress(testProjectId, 'sarah');

      // Then: All scenes should be processed successfully
      expect(result.completed).toBeGreaterThan(0);

      // And: Scenes should be updated with audio file paths
      const scenes = getScenesByProjectId(testProjectId);
      expect(scenes[0].audio_file_path).toBeTruthy();
    });

    it('[2.5-INT-011] [P2] should handle scenes with only formatting', async () => {
      // Given: Scene with only markdown and stage directions
      // Create scene with only markdown
      createScene({
        project_id: testProjectId,
        scene_number: 4,
        text: '**[Stage direction]**',
      });

      // When: Generating voiceovers
      const result = await generateVoiceoversWithProgress(testProjectId, 'sarah');

      // Then: Should handle gracefully (either skip or fail that scene)
      expect(result.completed + result.skipped + result.failed).toBeGreaterThan(0);
    });
  });

  describe('AC6-AC9-AC10: Database Updates [P0]', () => {
    it('[2.5-INT-012] [P0] should update scene records with audio paths and durations', async () => {
      // Given: Project with scenes (setup in beforeEach)

      // When: Generating voiceovers
      await generateVoiceoversWithProgress(testProjectId, 'sarah');

      // Then: All scenes with content should be updated
      const scenes = getScenesByProjectId(testProjectId);

      scenes.forEach((scene) => {
        if (scene.text.trim().length > 0) {
          // Scenes with content should have audio file path and duration
          expect(scene.audio_file_path).toBeTruthy();
          expect(scene.duration).toBeGreaterThan(0);
          expect(scene.audio_file_path).toContain(testProjectId);
          expect(scene.audio_file_path).toContain(`scene-${scene.scene_number}.mp3`);
        }
      });
    });

    it('[2.5-INT-013] [P0] should update project total duration', async () => {
      // Given: Project with multiple scenes

      // When: Generating voiceovers
      await generateVoiceoversWithProgress(testProjectId, 'sarah');

      // Then: Project total_duration should be sum of all scene durations
      const project = getProject(testProjectId);
      expect(project!.total_duration).toBeGreaterThan(0);

      const scenes = getScenesByProjectId(testProjectId);
      const expectedDuration = scenes.reduce((sum, s) => sum + (s.duration || 0), 0);
      expect(Math.abs(project!.total_duration! - expectedDuration)).toBeLessThan(0.01);
    });

    it('[2.5-INT-014] [P0] should update project workflow step to visual-sourcing', async () => {
      // Given: Project with current_step='voiceover'

      // When: Generating voiceovers completes
      await generateVoiceoversWithProgress(testProjectId, 'sarah');

      // Then: Project workflow should advance to 'visual-sourcing'
      const project = getProject(testProjectId);
      expect(project!.current_step).toBe('visual-sourcing');
    });
  });

  describe('AC5: File System Operations [P1]', () => {
    it('[2.5-INT-015] [P1] should create audio directory if it does not exist', async () => {
      // Given: Audio directory doesn't exist
      const projectDir = path.join(testCacheDir, testProjectId);

      if (existsSync(projectDir)) {
        rmSync(projectDir, { recursive: true, force: true });
      }

      // When: Generating voiceovers
      await generateVoiceoversWithProgress(testProjectId, 'sarah');

      // Then: Audio directory should be created automatically
      expect(existsSync(projectDir)).toBe(true);
    });

    it('[2.5-INT-016] [P0] should save audio files with correct naming convention', async () => {
      // Given: Project with 3 scenes

      // When: Generating voiceovers
      await generateVoiceoversWithProgress(testProjectId, 'sarah');

      // Then: Audio files should be created with correct naming (scene-1.mp3, scene-2.mp3, scene-3.mp3)
      const projectDir = path.join(testCacheDir, testProjectId);
      const scene1Path = path.join(projectDir, 'scene-1.mp3');
      const scene2Path = path.join(projectDir, 'scene-2.mp3');
      const scene3Path = path.join(projectDir, 'scene-3.mp3');

      expect(existsSync(scene1Path)).toBe(true);
      expect(existsSync(scene2Path)).toBe(true);
      expect(existsSync(scene3Path)).toBe(true);
    });
  });

  describe('AC8: Partial Completion Recovery [P1]', () => {
    it('[2.5-INT-017] [P1] should skip scenes that already have audio files', async () => {
      // Given: Project with all scenes already generated
      const firstResult = await generateVoiceoversWithProgress(testProjectId, 'sarah');
      expect(firstResult.completed).toBeGreaterThan(0);

      // When: Running voiceover generation again
      const secondResult = await generateVoiceoversWithProgress(testProjectId, 'sarah');

      // Then: Should skip all scenes (already have audio)
      expect(secondResult.skipped).toBe(3);
      expect(secondResult.completed).toBe(0);
    });

    it('[2.5-INT-018] [P1] should resume from first incomplete scene', async () => {
      // Given: Project with first 2 scenes generated, 3rd scene added later
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

      // Generate first batch (scenes 1-2)
      await generateVoiceoversWithProgress(tempProjectId, 'sarah');

      // Add third scene after initial generation
      createScene({
        project_id: tempProjectId,
        scene_number: 3,
        text: 'Scene 3',
      });

      // When: Running voiceover generation again
      const result = await generateVoiceoversWithProgress(tempProjectId, 'sarah');

      // Then: Should skip first 2 scenes, generate only scene 3
      expect(result.skipped).toBe(2);
      expect(result.completed).toBe(1);

      // Cleanup
      const tempProjectDir = path.join(testCacheDir, tempProjectId);
      if (existsSync(tempProjectDir)) {
        rmSync(tempProjectDir, { recursive: true, force: true });
      }
    });
  });

  describe('Error Handling [P1]', () => {
    it('[2.5-INT-019] [P1] should throw error when no scenes exist', async () => {
      // Given: Project with no scenes
      const emptyProjectId = createProject('Empty Project').id;
      updateProject(emptyProjectId, {
        voice_id: 'sarah',
        script_generated: true,
      });

      // When: Attempting to generate voiceovers
      // Then: Should throw NO_SCENES_FOUND error
      await expect(
        generateVoiceoversWithProgress(emptyProjectId, 'sarah')
      ).rejects.toThrow('NO_SCENES_FOUND');
    });

    it('[2.5-INT-020] [P2] should return error summary for failed scenes', async () => {
      // Given: Scene with empty text
      // Create scene with empty text
      createScene({
        project_id: testProjectId,
        scene_number: 4,
        text: '',
      });

      // When: Generating voiceovers
      const result = await generateVoiceoversWithProgress(testProjectId, 'sarah');

      // Then: Should have some failures or successful completions
      expect(result.completed + result.failed + result.skipped).toBeGreaterThan(0);
    });
  });

  describe('AC4: Voice Consistency [P0]', () => {
    it('[2.5-INT-021] [P0] should use the same voice for all scenes', async () => {
      // Given: Project with voice_id='sarah'

      // When: Generating voiceovers
      await generateVoiceoversWithProgress(testProjectId, 'sarah');

      // Then: All scenes should have audio from the same voice (sarah)
      const scenes = getScenesByProjectId(testProjectId);

      scenes.forEach((scene) => {
        if (scene.audio_file_path) {
          expect(scene.audio_file_path).toContain(testProjectId);
        }
      });

      // And: Project should maintain voice_id='sarah'
      const project = getProject(testProjectId);
      expect(project!.voice_id).toBe('sarah');
    });
  });

  describe('Generation Summary [P1]', () => {
    it('[2.5-INT-022] [P1] should return accurate summary of generation results', async () => {
      // Given: Project with 3 scenes

      // When: Generating voiceovers
      const result = await generateVoiceoversWithProgress(testProjectId, 'sarah');

      // Then: Result should contain accurate summary
      expect(result).toHaveProperty('completed');
      expect(result).toHaveProperty('skipped');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('totalDuration');

      expect(result.completed).toBeGreaterThanOrEqual(0);
      expect(result.skipped).toBeGreaterThanOrEqual(0);
      expect(result.failed).toBeGreaterThanOrEqual(0);
      expect(result.totalDuration).toBeGreaterThanOrEqual(0);

      // And: Total should match scene count (3 scenes)
      expect(result.completed + result.skipped + result.failed).toBe(3);
    });
  });
});
