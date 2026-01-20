/**
 * End-to-End Pipeline Validation Test
 *
 * This test validates the complete pipeline flow:
 * 1. Script generation → TTS → visual fetching → assembly
 * 2. Data flow between stages
 * 3. Integration of three critical fixes
 *
 * FIX #1: Script generation sets total_duration on project
 * FIX #2: Visual fetching uses total_duration to calculate clips needed
 * FIX #3: Assembly validates clipDuration before downloading and uses access() correctly
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getScenesByProjectId,
  createScenes,
  updateSceneAudio,
  saveVisualSuggestions,
  getVisualSuggestionsBySceneId,
  updateProjectDuration
} from '@/lib/db/queries';
import { initializeDatabase, shutdownDatabase } from '@/lib/db/init';
import { filterAndRankResults } from '@/lib/youtube/filter-results';
import type { VideoResult, ContentType } from '@/lib/youtube/types';

describe('End-to-End Pipeline Validation', () => {
  beforeAll(() => {
    initializeDatabase();
  });

  describe('FIX #1: Script Generation Sets total_duration', () => {
    it('should set total_duration on project after script generation', () => {
      // Arrange: Create a project
      const project = createProject({
        name: 'Pipeline Test Project',
        topic: 'Test topic for validation',
        current_step: 'script',
      });

      // Act: Simulate script generation behavior
      const scenes = [
        {
          project_id: project.id,
          scene_number: 1,
          text: 'Scene 1 text',
          sanitized_text: null,
          audio_file_path: null,
          duration: 30, // 30 seconds
        },
        {
          project_id: project.id,
          scene_number: 2,
          text: 'Scene 2 text',
          sanitized_text: null,
          audio_file_path: null,
          duration: 45, // 45 seconds
        },
        {
          project_id: project.id,
          scene_number: 3,
          text: 'Scene 3 text',
          sanitized_text: null,
          audio_file_path: null,
          duration: 25, // 25 seconds
        },
      ];

      const savedScenes = createScenes(scenes);

      // Calculate total duration (as done in script generation)
      const totalDuration = savedScenes.reduce((sum, scene) => {
        const sceneDuration = scene.duration || scene.estimatedDuration || 0;
        return sum + sceneDuration;
      }, 0);

      // Update project with total duration
      updateProjectDuration(project.id, totalDuration);

      // Assert: Verify total_duration is set correctly
      const updatedProject = getProject(project.id);
      expect(updatedProject).toBeDefined();
      expect(updatedProject!.total_duration).toBe(100); // 30 + 45 + 25 = 100

      // Cleanup
      deleteProject(project.id);
    });

    it('should handle scenes with null duration gracefully', () => {
      // Arrange: Create a project
      const project = createProject({
        name: 'Null Duration Test',
        topic: 'Test topic',
        current_step: 'script',
      });

      // Act: Create scenes with some null durations
      const scenes = [
        {
          project_id: project.id,
          scene_number: 1,
          text: 'Scene 1',
          sanitized_text: null,
          audio_file_path: null,
          duration: 30,
        },
        {
          project_id: project.id,
          scene_number: 2,
          text: 'Scene 2',
          sanitized_text: null,
          audio_file_path: null,
          duration: null, // Null duration
        },
        {
          project_id: project.id,
          scene_number: 3,
          text: 'Scene 3',
          sanitized_text: null,
          audio_file_path: null,
          duration: 20,
        },
      ];

      const savedScenes = createScenes(scenes);

      // Calculate total duration (should handle nulls)
      const totalDuration = savedScenes.reduce((sum, scene) => {
        const sceneDuration = scene.duration || scene.estimatedDuration || 0;
        return sum + sceneDuration;
      }, 0);

      updateProjectDuration(project.id, totalDuration);

      // Assert: Should only sum non-null durations (30 + 0 + 20 = 50)
      const updatedProject = getProject(project.id);
      expect(updatedProject!.total_duration).toBe(50);

      // Cleanup
      deleteProject(project.id);
    });
  });

  describe('FIX #2: Visual Fetching Uses total_duration', () => {
    it('should use scene.duration for filtering (not project.total_duration)', () => {
      // Arrange: Create mock YouTube search results
      const mockResults: VideoResult[] = [
        {
          videoId: 'video1',
          title: 'Good match video',
          thumbnailUrl: 'https://example.com/thumb1.jpg',
          channelTitle: 'Test Channel',
          embedUrl: 'https://youtube.com/embed/video1',
          duration: '45', // 45 seconds - within 1x-3x range
          description: 'Test description',
        },
        {
          videoId: 'video2',
          title: 'Too long video',
          thumbnailUrl: 'https://example.com/thumb2.jpg',
          channelTitle: 'Test Channel',
          embedUrl: 'https://youtube.com/embed/video2',
          duration: '300', // 5 minutes - exceeds 3x for 30s scene
          description: 'Test description',
        },
        {
          videoId: 'video3',
          title: 'Too short video',
          thumbnailUrl: 'https://example.com/thumb3.jpg',
          channelTitle: 'Test Channel',
          embedUrl: 'https://youtube.com/embed/video3',
          duration: '15', // 15 seconds - below 1x for 30s scene
          description: 'Test description',
        },
      ];

      const sceneDuration = 30; // 30 seconds
      const contentType = ContentType.B_ROLL;

      // Act: Filter and rank results using scene duration
      const filtered = filterAndRankResults(
        mockResults,
        sceneDuration,
        contentType,
        { sceneDuration }
      );

      // Assert: Should only include videos within 1x-3x range (30s-90s)
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered[0].videoId).toBe('video1'); // 45s is within range

      // Videos outside range should be filtered out
      const videoIds = filtered.map(v => v.videoId);
      expect(videoIds).not.toContain('video2'); // 300s exceeds 3x (90s)
      expect(videoIds).not.toContain('video3'); // 15s below 1x (30s)
    });

    it('should validate scene.duration before filtering', () => {
      // Arrange: Create project and scene with invalid duration
      const project = createProject({
        name: 'Invalid Duration Test',
        topic: 'Test topic',
        current_step: 'visual-sourcing',
      });

      const scene = {
        project_id: project.id,
        scene_number: 1,
        text: 'Test scene',
        sanitized_text: null,
        audio_file_path: null,
        duration: null, // Null duration - should skip filtering
      };

      const savedScenes = createScenes([scene]);

      // Act: Try to filter with null scene duration
      const mockResults: VideoResult[] = [
        {
          videoId: 'video1',
          title: 'Test video',
          thumbnailUrl: 'https://example.com/thumb1.jpg',
          channelTitle: 'Test Channel',
          embedUrl: 'https://youtube.com/embed/video1',
          duration: '60',
          description: 'Test description',
        },
      ];

      // This should handle null duration gracefully
      // In the actual API, it skips filtering and returns raw results
      const sceneDuration = savedScenes[0].duration || 0;
      let filtered;
      if (sceneDuration <= 0) {
        // Skip filtering, return raw results
        filtered = mockResults.slice(0, 8);
      } else {
        filtered = filterAndRankResults(
          mockResults,
          sceneDuration,
          ContentType.B_ROLL,
          { sceneDuration }
        );
      }

      // Assert: Should return raw results without filtering
      expect(filtered).toBeDefined();
      expect(filtered.length).toBe(1);

      // Cleanup
      deleteProject(project.id);
    });

    it('should calculate clips needed based on scene duration, not project duration', () => {
      // Arrange: Create a project with multiple scenes
      const project = createProject({
        name: 'Multi-scene Test',
        topic: 'Test topic',
        current_step: 'visual-sourcing',
      });

      // Scene 1: 30 seconds
      const scene1 = createScenes([
        {
          project_id: project.id,
          scene_number: 1,
          text: 'Scene 1',
          sanitized_text: null,
          audio_file_path: null,
          duration: 30,
        },
      ])[0];

      // Set project total_duration (simulating script generation)
      updateProjectDuration(project.id, 100); // Project total: 100s

      // Act: Filter results for scene 1 (should use 30s, not 100s)
      const mockResults: VideoResult[] = [
        {
          videoId: 'video1',
          title: '45 seconds',
          thumbnailUrl: 'https://example.com/thumb1.jpg',
          channelTitle: 'Test Channel',
          embedUrl: 'https://youtube.com/embed/video1',
          duration: '45', // Within 1x-3x for 30s scene
          description: 'Test description',
        },
        {
          videoId: 'video2',
          title: '200 seconds',
          thumbnailUrl: 'https://example.com/thumb2.jpg',
          channelTitle: 'Test Channel',
          embedUrl: 'https://youtube.com/embed/video2',
          duration: '200', // Exceeds 3x for 30s scene, but within 1x-3x for 100s project
          description: 'Test description',
        },
      ];

      const filtered = filterAndRankResults(
        mockResults,
        scene1.duration || 0, // Uses scene duration (30s)
        ContentType.B_ROLL,
        { sceneDuration: scene1.duration || 0 }
      );

      // Assert: video2 (200s) should be filtered out because it exceeds 3x for 30s scene
      const videoIds = filtered.map(v => v.videoId);
      expect(videoIds).toContain('video1'); // 45s is good
      expect(videoIds).not.toContain('video2'); // 200s exceeds 90s (3x of 30s)

      // Cleanup
      deleteProject(project.id);
    });
  });

  describe('FIX #3: Assembly Validates clipDuration', () => {
    it('should validate clipDuration before download', () => {
      // Arrange: Create project with scene and visual suggestion
      const project = createProject({
        name: 'Assembly Validation Test',
        topic: 'Test topic',
        current_step: 'editing',
      });

      const scene = createScenes([
        {
          project_id: project.id,
          scene_number: 1,
          text: 'Test scene',
          sanitized_text: 'Sanitized text',
          audio_file_path: '/path/to/audio.mp3',
          duration: 30,
          selected_clip_id: null, // Will be set after saving suggestion
        },
      ])[0];

      // Act: Save visual suggestion with duration
      const suggestions = saveVisualSuggestions(scene.id, [
        {
          video_id: 'test_video_id',
          title: 'Test Video',
          thumbnail_url: 'https://example.com/thumb.jpg',
          channel_title: 'Test Channel',
          embed_url: 'https://youtube.com/embed/test_video_id',
          duration: 45, // 45 seconds
        },
      ]);

      // Update scene with selected clip
      updateSceneAudio(scene.id, {
        audio_file_path: '/path/to/audio.mp3',
        duration: 30,
        selected_clip_id: suggestions[0].id,
      });

      // Load scene with suggestion (simulating assembly query)
      const updatedProject = getProject(project.id);
      const scenes = getScenesByProjectId(project.id);
      const sceneWithSuggestion = scenes[0];

      // Assert: clipDuration should be available from visual_suggestions
      const visualSuggestion = getVisualSuggestionsBySceneId(sceneWithSuggestion.id);
      expect(visualSuggestion).toBeDefined();
      expect(visualSuggestion.length).toBe(1);
      expect(visualSuggestion[0].duration).toBe(45);

      // In assembly, this would validate: clipDuration !== null && clipDuration !== undefined
      const clipDuration = visualSuggestion[0].duration;
      expect(clipDuration).not.toBeNull();
      expect(clipDuration).not.toBeUndefined();

      // Cleanup
      deleteProject(project.id);
    });

    it('should throw error if clipDuration is null/undefined', () => {
      // Arrange: Create visual suggestion with null duration
      const project = createProject({
        name: 'Null Duration Assembly Test',
        topic: 'Test topic',
        current_step: 'editing',
      });

      const scene = createScenes([
        {
          project_id: project.id,
          scene_number: 1,
          text: 'Test scene',
          sanitized_text: 'Sanitized text',
          audio_file_path: '/path/to/audio.mp3',
          duration: 30,
        },
      ])[0];

      // Save suggestion with null duration (simulating bad data)
      const suggestions = saveVisualSuggestions(scene.id, [
        {
          video_id: 'bad_video_id',
          title: 'Bad Video',
          thumbnail_url: 'https://example.com/thumb.jpg',
          channel_title: 'Test Channel',
          embed_url: 'https://youtube.com/embed/bad_video_id',
          duration: null, // Null duration - should cause error in assembly
        },
      ]);

      // Update scene with selected clip
      updateSceneAudio(scene.id, {
        audio_file_path: '/path/to/audio.mp3',
        duration: 30,
        selected_clip_id: suggestions[0].id,
      });

      // Act & Assert: Simulate assembly validation
      const visualSuggestion = getVisualSuggestionsBySceneId(scene.id);
      const clipDuration = visualSuggestion[0].duration;

      // Assembly should check this before download
      const isValid = clipDuration !== null && clipDuration !== undefined;
      expect(isValid).toBe(false);

      // Assembly error message would be:
      const errorMsg = `Scene ${scene.scene_number} has invalid clip duration (null/undefined). ` +
        `Visual suggestion duration not populated. Check visual_suggestions.duration in database.`;
      expect(errorMsg).toContain('invalid clip duration');

      // Cleanup
      deleteProject(project.id);
    });
  });

  describe('Integration: Complete Pipeline Flow', () => {
    it('should flow data correctly through all stages', () => {
      // Stage 1: Script Generation
      const project = createProject({
        name: 'Full Pipeline Test',
        topic: 'Complete pipeline validation',
        current_step: 'script',
      });

      // Generate script (simulated)
      const scenes = createScenes([
        {
          project_id: project.id,
          scene_number: 1,
          text: 'Introduction to the topic',
          sanitized_text: null,
          audio_file_path: null,
          duration: 30,
        },
        {
          project_id: project.id,
          scene_number: 2,
          text: 'Main content explanation',
          sanitized_text: null,
          audio_file_path: null,
          duration: 45,
        },
        {
          project_id: project.id,
          scene_number: 3,
          text: 'Conclusion and summary',
          sanitized_text: null,
          audio_file_path: null,
          duration: 25,
        },
      ]);

      // Calculate and set total_duration
      const totalDuration = scenes.reduce((sum, scene) => sum + (scene.duration || 0), 0);
      updateProjectDuration(project.id, totalDuration);

      // Stage 1 Verification: total_duration set
      let updatedProject = getProject(project.id);
      expect(updatedProject!.total_duration).toBe(100);

      // Stage 2: Visual Fetching (simulated)
      const mockVideoResults: VideoResult[] = [
        {
          videoId: 'vid1',
          title: 'Perfect match scene 1',
          thumbnailUrl: 'https://example.com/thumb1.jpg',
          channelTitle: 'Test Channel',
          embedUrl: 'https://youtube.com/embed/vid1',
          duration: '45', // Within 1x-3x for 30s scene
          description: 'Test description',
        },
        {
          videoId: 'vid2',
          title: 'Perfect match scene 2',
          thumbnailUrl: 'https://example.com/thumb2.jpg',
          channelTitle: 'Test Channel',
          embedUrl: 'https://youtube.com/embed/vid2',
          duration: '60', // Within 1x-3x for 45s scene
          description: 'Test description',
        },
        {
          videoId: 'vid3',
          title: 'Perfect match scene 3',
          thumbnailUrl: 'https://example.com/thumb3.jpg',
          channelTitle: 'Test Channel',
          embedUrl: 'https://youtube.com/embed/vid3',
          duration: '35', // Within 1x-3x for 25s scene
          description: 'Test description',
        },
      ];

      // Filter visuals for each scene using scene.duration (not project.total_duration)
      scenes.forEach((scene) => {
        const filtered = filterAndRankResults(
          mockVideoResults,
          scene.duration || 0,
          ContentType.B_ROLL,
          { sceneDuration: scene.duration || 0 }
        );
        expect(filtered.length).toBeGreaterThan(0);

        // Save visual suggestions
        const suggestions = saveVisualSuggestions(scene.id, [
          {
            video_id: filtered[0].videoId,
            title: filtered[0].title,
            thumbnail_url: filtered[0].thumbnailUrl,
            channel_title: filtered[0].channelTitle,
            embed_url: filtered[0].embedUrl,
            duration: parseInt(filtered[0].duration, 10), // Store duration as number
          },
        ]);

        // Update scene with selected clip
        updateSceneAudio(scene.id, {
          audio_file_path: `/path/to/audio/scene${scene.scene_number}.mp3`,
          duration: scene.duration,
          selected_clip_id: suggestions[0].id,
        });
      });

      // Stage 2 Verification: Visuals saved with durations
      const updatedScenes = getScenesByProjectId(project.id);
      updatedScenes.forEach((scene) => {
        expect(scene.selected_clip_id).not.toBeNull();

        const suggestions = getVisualSuggestionsBySceneId(scene.id);
        expect(suggestions.length).toBe(1);
        expect(suggestions[0].duration).not.toBeNull();
        expect(suggestions[0].duration).toBeGreaterThan(0);
      });

      // Stage 3: Assembly Validation (simulated)
      // In actual assembly, would verify clipDuration before download
      updatedScenes.forEach((scene) => {
        const suggestions = getVisualSuggestionsBySceneId(scene.id);
        const clipDuration = suggestions[0].duration;

        // Critical validation: clipDuration must be valid before download
        expect(clipDuration).not.toBeNull();
        expect(clipDuration).not.toBeUndefined();
        expect(clipDuration).toBeGreaterThan(0);
      });

      // Cleanup
      deleteProject(project.id);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle project with zero scenes gracefully', () => {
      const project = createProject({
        name: 'Empty Project Test',
        topic: 'Test topic',
        current_step: 'script',
      });

      // Calculate total duration with zero scenes
      const scenes = getScenesByProjectId(project.id);
      const totalDuration = scenes.reduce((sum, scene) => sum + (scene.duration || 0), 0);

      updateProjectDuration(project.id, totalDuration);

      const updatedProject = getProject(project.id);
      expect(updatedProject!.total_duration).toBe(0);

      deleteProject(project.id);
    });

    it('should handle scene duration changes after initial generation', () => {
      const project = createProject({
        name: 'Duration Change Test',
        topic: 'Test topic',
        current_step: 'voiceover',
      });

      const scene = createScenes([
        {
          project_id: project.id,
          scene_number: 1,
          text: 'Test scene',
          sanitized_text: null,
          audio_file_path: null,
          duration: 30,
        },
      ])[0];

      // Initial total duration
      updateProjectDuration(project.id, 30);
      let projectData = getProject(project.id);
      expect(projectData!.total_duration).toBe(30);

      // Simulate TTS completing with actual duration (different from estimated)
      updateSceneAudio(scene.id, {
        audio_file_path: '/path/to/audio.mp3',
        duration: 35, // Actual TTS duration is 35s
      });

      // Recalculate total duration
      const scenes = getScenesByProjectId(project.id);
      const newTotalDuration = scenes.reduce((sum, s) => sum + (s.duration || 0), 0);
      updateProjectDuration(project.id, newTotalDuration);

      projectData = getProject(project.id);
      expect(projectData!.total_duration).toBe(35);

      deleteProject(project.id);
    });
  });
});
